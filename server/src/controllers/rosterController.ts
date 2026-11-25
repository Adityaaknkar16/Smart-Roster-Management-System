import { Request, Response } from 'express';
import { z } from 'zod';
import {
  Roster,
  RosterEntry,
  Employee,
  Brand,
  Process,
  Assignment,
  Holiday,
  Leave,
  CompOffLedger,
  AuditLog,
} from '../models/index.js';
import {
  generateRoster,
  validateRoster,
  analyzeLeaveImpact,
  recommendBackups,
  getDaysInMonth,
  groupDatesByWeek,
  getWeekNumber,
} from '../engine/index.js';
import { AuthRequest } from '../middleware/auth.js';
import { IRosterEntry, BackupSuggestion } from '../types/index.js';

// Helper to load full context for engine operations
async function loadSchedulingContext(month: number, year: number) {
  const [employees, brands, processes, assignments, holidays, approvedLeaves] = await Promise.all([
    Employee.find({ active: true }),
    Brand.find({ active: true }),
    Process.find(),
    Assignment.find(),
    Holiday.find(),
    Leave.find({ status: 'approved' }),
  ]);

  const dates = getDaysInMonth(month, year);

  return {
    dates,
    employees: employees.map(e => ({
      id: (e._id as any).toString(),
      name: e.name,
      email: e.email,
      podId: e.podId ? (e.podId as any).toString() : undefined,
      role: e.role,
      active: e.active,
      preferences: e.preferences,
      maxConsecutiveWorkDays: e.maxConsecutiveWorkDays,
      weeklyOffsPerWeek: e.weeklyOffsPerWeek,
    })),
    brands: brands.map(b => ({
      id: (b._id as any).toString(),
      name: b.name,
      podId: b.podId ? (b.podId as any).toString() : undefined,
      active: b.active,
    })),
    processes: processes.map(p => ({
      id: (p._id as any).toString(),
      brandId: (p.brandId as any).toString(),
      name: p.name,
      type: p.type,
      calendarMode: p.calendarMode,
      customClosedWeekdays: p.customClosedWeekdays,
      minStaffDefault: p.minStaffDefault,
      minStaffByWeekday: p.minStaffByWeekday as any,
      dateOverrides: p.dateOverrides,
    })),
    assignments: assignments.map(a => ({
      id: (a._id as any).toString(),
      employeeId: (a.employeeId as any).toString(),
      processId: (a.processId as any).toString(),
      isPrimary: a.isPrimary,
      allocationPercent: a.allocationPercent,
    })),
    holidays: holidays.map(h => ({
      id: (h._id as any).toString(),
      date: h.date,
      name: h.name,
      region: h.region,
    })),
    approvedLeaves: approvedLeaves.map(l => ({
      id: (l._id as any).toString(),
      employeeId: (l.employeeId as any).toString(),
      startDate: l.startDate,
      endDate: l.endDate,
      type: l.type,
      status: l.status,
    })),
  };
}

// -------------------------------------------------------------
// GET ALL ROSTERS
// -------------------------------------------------------------
export async function getRosters(req: Request, res: Response) {
  const rosters = await Roster.find().sort({ year: -1, month: -1, version: -1 });
  res.json(rosters);
}

// -------------------------------------------------------------
// GENERATE ROSTER
// -------------------------------------------------------------
export async function generateRosterEndpoint(req: AuthRequest, res: Response) {
  const schema = z.object({
    month: z.number().min(1).max(12),
    year: z.number().min(2020).max(2035),
    keepManualEntries: z.boolean().default(true),
  });

  const { month, year, keepManualEntries } = schema.parse(req.body);

  const context = await loadSchedulingContext(month, year);

  // Check if a previous roster exists for this month/year
  const latestRoster = await Roster.findOne({ month, year }).sort({ version: -1 });
  const nextVersion = latestRoster ? latestRoster.version + 1 : 1;

  let lockedEntries: IRosterEntry[] = [];
  if (latestRoster && keepManualEntries) {
    const existingEntries = await RosterEntry.find({
      rosterId: latestRoster._id,
      $or: [{ locked: true }, { source: 'manual' }],
    });
    lockedEntries = existingEntries.map(e => ({
      rosterId: 'draft',
      employeeId: (e.employeeId as any).toString(),
      date: e.date,
      status: e.status,
      source: 'manual',
      locked: true,
    }));
  }

  // Create new Roster record
  const newRoster = await Roster.create({
    month,
    year,
    status: 'draft',
    version: nextVersion,
    generatedAt: new Date(),
    lockedBy: req.user?.id,
  });

  const rosterIdStr = (newRoster._id as any).toString();

  // Run pure engine
  const engineResult = generateRoster({
    month,
    year,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
    lockedEntries,
    rosterId: rosterIdStr,
  });

  // Save entries
  const entriesToInsert = engineResult.entries.map(e => ({
    ...e,
    rosterId: newRoster._id,
  }));
  await RosterEntry.insertMany(entriesToInsert);

  // Save comp-offs
  if (engineResult.compOffsEarned.length > 0) {
    await CompOffLedger.insertMany(engineResult.compOffsEarned);
  }

  // Log audit
  await AuditLog.create({
    rosterId: newRoster._id,
    userId: req.user?.id,
    userName: req.user?.name || 'User',
    action: 'ROSTER_GENERATED',
    details: {
      version: nextVersion,
      totalEntries: entriesToInsert.length,
      mandatoryIssuesCount: engineResult.issues.filter(i => i.severity === 'MANDATORY').length,
      warningsCount: engineResult.issues.filter(i => i.severity === 'WARNING').length,
    },
  });

  res.status(201).json({
    roster: newRoster,
    entries: entriesToInsert,
    issues: engineResult.issues,
    summary: {
      total: engineResult.issues.length,
      mandatory: engineResult.issues.filter(i => i.severity === 'MANDATORY').length,
      warnings: engineResult.issues.filter(i => i.severity === 'WARNING').length,
    },
  });
}

// -------------------------------------------------------------
// GET ROSTER BY ID (WITH LIVE VALIDATION)
// -------------------------------------------------------------
export async function getRosterById(req: Request, res: Response) {
  const id = req.params.id as string;
  const roster = await Roster.findById(id);
  if (!roster) return res.status(404).json({ error: 'Roster not found' });

  const entries = await RosterEntry.find({ rosterId: id });
  const context = await loadSchedulingContext(roster.month, roster.year);

  const flatEntries: IRosterEntry[] = entries.map(e => ({
    id: (e._id as any).toString(),
    rosterId: (e.rosterId as any).toString(),
    employeeId: (e.employeeId as any).toString(),
    date: e.date,
    status: e.status,
    source: e.source,
    locked: e.locked,
  }));

  const issues = validateRoster({
    dates: context.dates,
    entries: flatEntries,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
  });

  res.json({
    roster,
    entries: flatEntries,
    issues,
    summary: {
      total: issues.length,
      mandatory: issues.filter(i => i.severity === 'MANDATORY').length,
      warnings: issues.filter(i => i.severity === 'WARNING').length,
    },
  });
}

// -------------------------------------------------------------
// VALIDATE ROSTER
// -------------------------------------------------------------
export async function validateRosterEndpoint(req: Request, res: Response) {
  const id = req.params.id as string;
  const roster = await Roster.findById(id);
  if (!roster) return res.status(404).json({ error: 'Roster not found' });

  const entries = await RosterEntry.find({ rosterId: id });
  const context = await loadSchedulingContext(roster.month, roster.year);

  const flatEntries: IRosterEntry[] = entries.map(e => ({
    id: (e._id as any).toString(),
    rosterId: (e.rosterId as any).toString(),
    employeeId: (e.employeeId as any).toString(),
    date: e.date,
    status: e.status,
    source: e.source,
    locked: e.locked,
  }));

  const issues = validateRoster({
    dates: context.dates,
    entries: flatEntries,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
  });

  res.json({
    issues,
    summary: {
      total: issues.length,
      mandatory: issues.filter(i => i.severity === 'MANDATORY').length,
      warnings: issues.filter(i => i.severity === 'WARNING').length,
    },
  });
}

// -------------------------------------------------------------
// PUBLISH ROSTER (BLOCKED IF MANDATORY ISSUES EXIST WITHOUT MANAGER OVERRIDE)
// -------------------------------------------------------------
export async function publishRoster(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const schema = z.object({
    overrideReason: z.string().optional(),
  });
  const { overrideReason } = schema.parse(req.body);

  const roster = await Roster.findById(id);
  if (!roster) return res.status(404).json({ error: 'Roster not found' });

  const entries = await RosterEntry.find({ rosterId: id });
  const context = await loadSchedulingContext(roster.month, roster.year);

  const flatEntries: IRosterEntry[] = entries.map(e => ({
    id: (e._id as any).toString(),
    rosterId: (e.rosterId as any).toString(),
    employeeId: (e.employeeId as any).toString(),
    date: e.date,
    status: e.status,
    source: e.source,
    locked: e.locked,
  }));

  const issues = validateRoster({
    dates: context.dates,
    entries: flatEntries,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
  });

  const mandatoryIssues = issues.filter(i => i.severity === 'MANDATORY');

  if (mandatoryIssues.length > 0) {
    // Only a manager can override mandatory issues with a reason
    const isManager = req.user?.role === 'manager';
    if (!isManager || !overrideReason || overrideReason.trim().length === 0) {
      res.status(400).json({
        error: `Cannot publish roster: ${mandatoryIssues.length} mandatory conflict(s) exist. A Manager override with reason is required.`,
        mandatoryIssues,
        requiresOverride: true,
      });
      return;
    }
  }

  roster.status = 'published';
  if (overrideReason) {
    roster.publishOverrideReason = overrideReason;
  }
  await roster.save();

  await AuditLog.create({
    rosterId: roster._id,
    userId: req.user?.id,
    userName: req.user?.name || 'User',
    action: 'ROSTER_PUBLISHED',
    details: {
      overrideReason: overrideReason || null,
      mandatoryCount: mandatoryIssues.length,
    },
  });

  res.json({ success: true, roster });
}

// -------------------------------------------------------------
// PATCH ENTRIES (MANUAL EDIT WITH LIVE VALIDATION DELTA)
// -------------------------------------------------------------
export async function editEntries(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const schema = z.object({
    entries: z.array(
      z.object({
        employeeId: z.string(),
        date: z.string(),
        status: z.enum(['WORK', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE', 'COMP_OFF']),
        locked: z.boolean().optional(),
      })
    ),
  });

  const { entries: updates } = schema.parse(req.body);

  const roster = await Roster.findById(id);
  if (!roster) return res.status(404).json({ error: 'Roster not found' });

  const context = await loadSchedulingContext(roster.month, roster.year);

  // Fetch current entries before edit for delta computation
  const currentDbEntries = await RosterEntry.find({ rosterId: id });
  const beforeFlat: IRosterEntry[] = currentDbEntries.map(e => ({
    id: (e._id as any).toString(),
    rosterId: (e.rosterId as any).toString(),
    employeeId: (e.employeeId as any).toString(),
    date: e.date,
    status: e.status,
    source: e.source,
    locked: e.locked,
  }));

  const issuesBefore = validateRoster({
    dates: context.dates,
    entries: beforeFlat,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
  });

  // Apply updates to DB
  for (const update of updates) {
    await RosterEntry.findOneAndUpdate(
      { rosterId: id, employeeId: update.employeeId, date: update.date },
      {
        $set: {
          status: update.status,
          source: 'manual',
          locked: update.locked ?? true,
        },
      },
      { upsert: true }
    );
  }

  // Fetch updated entries
  const afterDbEntries = await RosterEntry.find({ rosterId: id });
  const afterFlat: IRosterEntry[] = afterDbEntries.map(e => ({
    id: (e._id as any).toString(),
    rosterId: (e.rosterId as any).toString(),
    employeeId: (e.employeeId as any).toString(),
    date: e.date,
    status: e.status,
    source: e.source,
    locked: e.locked,
  }));

  // Re-run validation
  const issuesAfter = validateRoster({
    dates: context.dates,
    entries: afterFlat,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
  });

  // Compute validation delta
  const beforeIds = new Set(issuesBefore.map(i => i.id));
  const afterIds = new Set(issuesAfter.map(i => i.id));

  const newIssues = issuesAfter.filter(i => !beforeIds.has(i.id));
  const resolvedIssues = issuesBefore.filter(i => !afterIds.has(i.id));

  await AuditLog.create({
    rosterId: roster._id,
    userId: req.user?.id,
    userName: req.user?.name || 'User',
    action: 'ENTRIES_EDITED',
    details: {
      updatedCount: updates.length,
      newIssuesCount: newIssues.length,
      resolvedIssuesCount: resolvedIssues.length,
    },
  });

  res.json({
    updatedCount: updates.length,
    delta: {
      newIssues,
      resolvedIssues,
    },
    issues: issuesAfter,
    entries: afterFlat,
  });
}

// -------------------------------------------------------------
// POST /rosters/:id/impact (CHANGE IMPACT ANALYSIS)
// -------------------------------------------------------------
export async function analyzeImpactEndpoint(req: Request, res: Response) {
  const id = req.params.id as string;
  const schema = z.object({
    leave: z.object({
      employeeId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      type: z.enum(['planned', 'comp_off', 'sick']).default('planned'),
    }),
  });

  const { leave } = schema.parse(req.body);

  const roster = await Roster.findById(id);
  if (!roster) return res.status(404).json({ error: 'Roster not found' });

  const context = await loadSchedulingContext(roster.month, roster.year);
  const dbEntries = await RosterEntry.find({ rosterId: id });
  const flatEntries: IRosterEntry[] = dbEntries.map(e => ({
    id: (e._id as any).toString(),
    rosterId: (e.rosterId as any).toString(),
    employeeId: (e.employeeId as any).toString(),
    date: e.date,
    status: e.status,
    source: e.source,
    locked: e.locked,
  }));

  const impact = analyzeLeaveImpact({
    dates: context.dates,
    currentEntries: flatEntries,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    existingApprovedLeaves: context.approvedLeaves,
    newLeave: leave,
  });

  // For each gap, generate recommendations
  const suggestionsByGap: Record<string, BackupSuggestion[]> = {};
  for (const gap of impact.coverageGaps) {
    const gapKey = `${gap.processId}_${gap.date}`;
    suggestionsByGap[gapKey] = recommendBackups({
      gap,
      dates: context.dates,
      entries: flatEntries,
      employees: context.employees,
      processes: context.processes,
      brands: context.brands,
      assignments: context.assignments,
      holidays: context.holidays,
      approvedLeaves: context.approvedLeaves,
    });
  }

  res.json({
    impact,
    suggestionsByGap,
  });
}

// -------------------------------------------------------------
// POST /rosters/:id/apply-suggestion (ONE-CLICK BACKUP FIX)
// -------------------------------------------------------------
export async function applySuggestionEndpoint(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const schema = z.object({
    suggestion: z.object({
      gapDate: z.string(),
      processId: z.string(),
      candidateEmployeeId: z.string(),
      actionType: z.enum(['SWAP_OFF', 'OVERTIME_COMP_OFF', 'ASSIGN_WORK']),
      suggestedOffDate: z.string().optional(),
    }),
  });

  const { suggestion } = schema.parse(req.body);

  const roster = await Roster.findById(id);
  if (!roster) return res.status(404).json({ error: 'Roster not found' });

  const candId = suggestion.candidateEmployeeId;
  const gapDate = suggestion.gapDate;

  if (suggestion.actionType === 'SWAP_OFF') {
    // 1. Candidate works on gapDate
    await RosterEntry.findOneAndUpdate(
      { rosterId: id, employeeId: candId, date: gapDate },
      { $set: { status: 'WORK', source: 'manual', locked: true } },
      { upsert: true }
    );

    // 2. Candidate takes off on suggestedOffDate
    if (suggestion.suggestedOffDate) {
      await RosterEntry.findOneAndUpdate(
        { rosterId: id, employeeId: candId, date: suggestion.suggestedOffDate },
        { $set: { status: 'WEEKLY_OFF', source: 'manual', locked: true } },
        { upsert: true }
      );
    }
  } else if (suggestion.actionType === 'OVERTIME_COMP_OFF') {
    // Candidate works on gapDate & earns a comp-off
    await RosterEntry.findOneAndUpdate(
      { rosterId: id, employeeId: candId, date: gapDate },
      { $set: { status: 'WORK', source: 'manual', locked: true } },
      { upsert: true }
    );

    await CompOffLedger.create({
      employeeId: candId,
      earnedDate: gapDate,
      reason: `Overtime coverage for process gap on ${gapDate}`,
    });
  } else if (suggestion.actionType === 'ASSIGN_WORK') {
    // Cross-assign or ensure working status
    await RosterEntry.findOneAndUpdate(
      { rosterId: id, employeeId: candId, date: gapDate },
      { $set: { status: 'WORK', source: 'manual', locked: true } },
      { upsert: true }
    );

    // Create temporary assignment if not already assigned
    await Assignment.findOneAndUpdate(
      { employeeId: candId, processId: suggestion.processId },
      { $set: { isPrimary: false, allocationPercent: 50 } },
      { upsert: true }
    );
  }

  // Fetch updated entries and re-validate
  const context = await loadSchedulingContext(roster.month, roster.year);
  const updatedDbEntries = await RosterEntry.find({ rosterId: id });
  const flatEntries: IRosterEntry[] = updatedDbEntries.map(e => ({
    id: (e._id as any).toString(),
    rosterId: (e.rosterId as any).toString(),
    employeeId: (e.employeeId as any).toString(),
    date: e.date,
    status: e.status,
    source: e.source,
    locked: e.locked,
  }));

  const issues = validateRoster({
    dates: context.dates,
    entries: flatEntries,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
  });

  await AuditLog.create({
    rosterId: roster._id,
    userId: req.user?.id,
    userName: req.user?.name || 'User',
    action: 'SUGGESTION_APPLIED',
    details: suggestion,
  });

  res.json({
    success: true,
    entries: flatEntries,
    issues,
  });
}

// -------------------------------------------------------------
// REGENERATE AFFECTED WEEKS ONLY (PRESERVING LOCKED/MANUAL ENTRIES)
// -------------------------------------------------------------
export async function regenerateWeeksEndpoint(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const schema = z.object({
    weekNumbers: z.array(z.number()),
  });

  const { weekNumbers } = schema.parse(req.body);

  const roster = await Roster.findById(id);
  if (!roster) return res.status(404).json({ error: 'Roster not found' });

  const context = await loadSchedulingContext(roster.month, roster.year);
  const weeks = groupDatesByWeek(context.dates);

  // Collect target dates for requested weeks
  const targetDates = new Set<string>();
  for (const w of weekNumbers) {
    if (weeks[w]) {
      for (const d of weeks[w]) targetDates.add(d);
    }
  }

  // Preserve locked and manual entries
  const existingEntries = await RosterEntry.find({ rosterId: id });
  const lockedEntries: IRosterEntry[] = existingEntries
    .filter(e => e.locked || e.source === 'manual' || !targetDates.has(e.date))
    .map(e => ({
      rosterId: id,
      employeeId: (e.employeeId as any).toString(),
      date: e.date,
      status: e.status,
      source: e.source,
      locked: true,
    }));

  // Re-run scheduler with locked entries
  const engineResult = generateRoster({
    month: roster.month,
    year: roster.year,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
    lockedEntries,
    rosterId: id,
  });

  // Update DB entries for affected dates
  for (const entry of engineResult.entries) {
    if (targetDates.has(entry.date) && !entry.locked) {
      await RosterEntry.findOneAndUpdate(
        { rosterId: id, employeeId: entry.employeeId, date: entry.date },
        { $set: { status: entry.status, source: 'auto', locked: false } },
        { upsert: true }
      );
    }
  }

  const finalDbEntries = await RosterEntry.find({ rosterId: id });
  const finalFlat: IRosterEntry[] = finalDbEntries.map(e => ({
    id: (e._id as any).toString(),
    rosterId: (e.rosterId as any).toString(),
    employeeId: (e.employeeId as any).toString(),
    date: e.date,
    status: e.status,
    source: e.source,
    locked: e.locked,
  }));

  const issues = validateRoster({
    dates: context.dates,
    entries: finalFlat,
    employees: context.employees,
    processes: context.processes,
    brands: context.brands,
    assignments: context.assignments,
    holidays: context.holidays,
    approvedLeaves: context.approvedLeaves,
  });

  await AuditLog.create({
    rosterId: roster._id,
    userId: req.user?.id,
    userName: req.user?.name || 'User',
    action: 'REGENERATE_WEEKS',
    details: { weekNumbers },
  });

  res.json({
    success: true,
    entries: finalFlat,
    issues,
  });
}

// -------------------------------------------------------------
// GET /rosters/:id/export?format=csv
// -------------------------------------------------------------
export async function exportRosterCsv(req: Request, res: Response) {
  const id = req.params.id as string;
  const roster = await Roster.findById(id);
  if (!roster) return res.status(404).json({ error: 'Roster not found' });

  const context = await loadSchedulingContext(roster.month, roster.year);
  const dbEntries = await RosterEntry.find({ rosterId: id });

  // Map [empId_date] -> status
  const entryMap = new Map<string, string>();
  for (const e of dbEntries) {
    entryMap.set(`${(e.employeeId as any).toString()}_${e.date}`, e.status);
  }

  const dates = context.dates;
  const header = [
    'Employee Name',
    'Email',
    'Role',
    ...dates.map(d => d.slice(5)), // MM-DD
    'Total Work Days',
    'Weekly Offs',
    'Leaves',
    'Holidays',
    'Comp Offs',
  ];

  const rows: string[][] = [header];

  for (const emp of context.employees) {
    let work = 0;
    let offs = 0;
    let leaves = 0;
    let holidays = 0;
    let compOffs = 0;

    const row = [emp.name, emp.email, emp.role];

    for (const d of dates) {
      const s = entryMap.get(`${emp.id}_${d}`) || 'WORK';
      row.push(s);
      if (s === 'WORK') work++;
      else if (s === 'WEEKLY_OFF') offs++;
      else if (s === 'LEAVE') leaves++;
      else if (s === 'HOLIDAY') holidays++;
      else if (s === 'COMP_OFF') compOffs++;
    }

    row.push(String(work), String(offs), String(leaves), String(holidays), String(compOffs));
    rows.push(row);
  }

  const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="roster_${roster.year}_${roster.month}_v${roster.version}.csv"`
  );
  res.send(csvContent);
}

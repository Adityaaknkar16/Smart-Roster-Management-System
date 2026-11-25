import {
  IEmployee,
  IProcess,
  IBrand,
  IAssignment,
  IHoliday,
  ILeave,
  IRosterEntry,
  ValidationIssue,
  ICompOffLedger,
} from '../types/index.js';
import { getDaysInMonth, groupDatesByWeek, getWeekday } from './dateUtils.js';
import { computeProcessDemand } from './demand.js';
import { computeAvailability } from './availability.js';
import { validateRoster } from './validator.js';

export interface SchedulerInput {
  month: number;
  year: number;
  employees: IEmployee[];
  processes: IProcess[];
  brands: IBrand[];
  assignments: IAssignment[];
  holidays: IHoliday[];
  approvedLeaves: ILeave[];
  lockedEntries?: IRosterEntry[];
  rosterId?: string;
  maxProcessesPerEmployee?: number;
}

export interface SchedulerOutput {
  entries: IRosterEntry[];
  issues: ValidationIssue[];
  compOffsEarned: Partial<ICompOffLedger>[];
}

export function generateRoster(input: SchedulerInput): SchedulerOutput {
  const {
    month,
    year,
    employees,
    processes,
    brands,
    assignments,
    holidays,
    approvedLeaves,
    lockedEntries = [],
    rosterId = 'draft_roster',
    maxProcessesPerEmployee = 3,
  } = input;

  const dates = getDaysInMonth(month, year);
  const weeks = groupDatesByWeek(dates);

  // 1. Demand Calculation
  const demand = computeProcessDemand(dates, processes, holidays);

  // 2. Availability Calculation
  const availability = computeAvailability(
    dates,
    employees,
    assignments,
    demand,
    approvedLeaves,
    holidays,
    lockedEntries
  );

  // Mappings
  const processToEmployees = new Map<string, string[]>();
  const employeeToProcesses = new Map<string, string[]>();

  for (const p of processes) {
    processToEmployees.set((p.id || p._id || '').toString(), []);
  }
  for (const e of employees) {
    employeeToProcesses.set((e.id || e._id || '').toString(), []);
  }
  for (const a of assignments) {
    const eId = (a.employeeId || '').toString();
    const pId = (a.processId || '').toString();
    if (processToEmployees.has(pId)) {
      processToEmployees.get(pId)!.push(eId);
    }
    if (employeeToProcesses.has(eId)) {
      employeeToProcesses.get(eId)!.push(pId);
    }
  }

  // 3. Initialize entry grid
  // [empId][dateStr] -> IRosterEntry
  const entriesGrid: Record<string, Record<string, IRosterEntry>> = {};
  for (const emp of employees) {
    const empId = (emp.id || emp._id || '').toString();
    entriesGrid[empId] = {};

    for (const date of dates) {
      const avail = availability[empId]?.[date];
      if (avail?.forcedStatus) {
        entriesGrid[empId][date] = {
          rosterId,
          employeeId: empId,
          date,
          status: avail.forcedStatus,
          source: avail.isLocked ? 'manual' : 'auto',
          locked: avail.isLocked,
        };
      } else {
        entriesGrid[empId][date] = {
          rosterId,
          employeeId: empId,
          date,
          status: 'WORK',
          source: 'auto',
          locked: false,
        };
      }
    }
  }

  // Helper to count working staff on a process on a given date
  function getWorkingStaffCount(procId: string, date: string): number {
    const assignedEmps = processToEmployees.get(procId) || [];
    let count = 0;
    for (const eId of assignedEmps) {
      if (entriesGrid[eId]?.[date]?.status === 'WORK') {
        count++;
      }
    }
    return count;
  }

  // 4. Order employees: most-constrained first
  // Sole resource on any process -> highest constraint priority.
  // Lower pool sizes -> higher constraint priority.
  const employeeConstraintScores = new Map<string, number>();

  for (const emp of employees) {
    const empId = (emp.id || emp._id || '').toString();
    const myProcs = employeeToProcesses.get(empId) || [];
    let score = 0;

    for (const pId of myProcs) {
      const pool = processToEmployees.get(pId) || [];
      if (pool.length === 1) {
        score += 10000; // Sole resource!
      } else {
        score += Math.round(100 / pool.length);
      }
    }
    employeeConstraintScores.set(empId, score);
  }

  const sortedEmployees = [...employees].sort((a, b) => {
    const idA = (a.id || a._id || '').toString();
    const idB = (b.id || b._id || '').toString();
    return (employeeConstraintScores.get(idB) || 0) - (employeeConstraintScores.get(idA) || 0);
  });

  // Track weekend offs awarded across employees for fair rotation
  const weekendOffCount = new Map<string, number>();
  for (const e of employees) {
    weekendOffCount.set((e.id || e._id || '').toString(), 0);
  }

  // 5. Weekly-off assignment (Greedy with Repair)
  for (const [weekNumStr, weekDates] of Object.entries(weeks)) {
    for (const emp of sortedEmployees) {
      const empId = (emp.id || emp._id || '').toString();
      const myProcs = employeeToProcesses.get(empId) || [];
      const requiredOffs = emp.weeklyOffsPerWeek || 1;
      const maxConsecutive = emp.maxConsecutiveWorkDays || 6;

      // Count existing offs in this week
      let currentOffsInWeek = 0;
      for (const d of weekDates) {
        const s = entriesGrid[empId][d].status;
        if (s === 'WEEKLY_OFF' || s === 'LEAVE' || s === 'COMP_OFF' || s === 'HOLIDAY') {
          currentOffsInWeek++;
        }
      }

      if (currentOffsInWeek >= requiredOffs) {
        continue;
      }

      const neededOffs = requiredOffs - currentOffsInWeek;

      for (let offIndex = 0; offIndex < neededOffs; offIndex++) {
        // Evaluate candidate days in this week
        interface CandidateDay {
          date: string;
          deficitCount: number;
          violatesConsecutive: boolean;
          score: number;
        }

        const candidateDays: CandidateDay[] = [];

        for (const date of weekDates) {
          const entry = entriesGrid[empId][date];
          // Cannot replace locked entries, leaves, holidays, or existing weekly offs
          if (entry.locked || entry.status !== 'WORK') {
            continue;
          }

          const weekday = getWeekday(date);
          let deficitCount = 0;

          // Check process deficits if this employee were OFF on date
          for (const pId of myProcs) {
            const req = demand[pId]?.[date]?.requiredStaff || 0;
            if (req > 0) {
              const currentWorking = getWorkingStaffCount(pId, date);
              if (currentWorking - 1 < req) {
                deficitCount += (req - (currentWorking - 1));
              }
            }
          }

          // Check consecutive work day impact
          // Temporarily set status to WEEKLY_OFF and check max streak in dates
          entriesGrid[empId][date].status = 'WEEKLY_OFF';
          let maxStreak = 0;
          let curStreak = 0;
          for (const d of dates) {
            if (entriesGrid[empId][d].status === 'WORK') {
              curStreak++;
              if (curStreak > maxStreak) maxStreak = curStreak;
            } else {
              curStreak = 0;
            }
          }
          // Revert temporary status
          entriesGrid[empId][date].status = 'WORK';

          const violatesConsecutive = maxStreak > maxConsecutive;

          // Calculate score
          let score = 0;
          if (deficitCount === 0) score += 1000;
          else score -= deficitCount * 500;

          if (!violatesConsecutive) score += 200;
          else score -= 300;

          // Preferred weekly offs (soft)
          if (emp.preferences?.preferredWeeklyOffs?.includes(weekday)) {
            score += 80;
          }
          // Avoid days
          if (emp.preferences?.avoidDays?.includes(weekday)) {
            score -= 100;
          }

          // Fair weekend rotation
          if (weekday === 0 || weekday === 6) {
            const offsGiven = weekendOffCount.get(empId) || 0;
            score += Math.max(0, 50 - offsGiven * 25);
          }

          candidateDays.push({
            date,
            deficitCount,
            violatesConsecutive,
            score,
          });
        }

        // Sort candidates by highest score
        candidateDays.sort((a, b) => b.score - a.score);

        const bestZeroDeficit = candidateDays.find(c => c.deficitCount === 0 && !c.violatesConsecutive);

        if (bestZeroDeficit) {
          entriesGrid[empId][bestZeroDeficit.date].status = 'WEEKLY_OFF';
          const wd = getWeekday(bestZeroDeficit.date);
          if (wd === 0 || wd === 6) {
            weekendOffCount.set(empId, (weekendOffCount.get(empId) || 0) + 1);
          }
        } else {
          // REPAIR PASS:
          // Try swapping with a peer in the same process or same pod
          let repairSuccessful = false;

          for (const cand of candidateDays) {
            if (cand.violatesConsecutive) continue;
            const targetDate = cand.date;

            // Find peers covering the same processes who are currently scheduled as WEEKLY_OFF on targetDate
            // and see if they can take an off on another day in weekDates
            for (const pId of myProcs) {
              const peers = processToEmployees.get(pId) || [];
              for (const peerId of peers) {
                if (peerId === empId) continue;
                const peerEntry = entriesGrid[peerId]?.[targetDate];
                if (peerEntry && peerEntry.status === 'WEEKLY_OFF' && !peerEntry.locked) {
                  // Can peer work on targetDate, and take an off on a different day in weekDates?
                  for (const altDate of weekDates) {
                    if (altDate === targetDate) continue;
                    const peerAltEntry = entriesGrid[peerId]?.[altDate];
                    if (peerAltEntry && peerAltEntry.status === 'WORK' && !peerAltEntry.locked) {
                      // Check if swapping resolves deficit on targetDate without causing deficit on altDate
                      const reqTarget = demand[pId]?.[targetDate]?.requiredStaff || 0;
                      const reqAlt = demand[pId]?.[altDate]?.requiredStaff || 0;

                      const peerWorkingOnTarget = getWorkingStaffCount(pId, targetDate) + 1 - 1; // emp stops, peer works -> net unchanged!
                      const peerWorkingOnAlt = getWorkingStaffCount(pId, altDate) - 1;

                      if (peerWorkingOnTarget >= reqTarget && peerWorkingOnAlt >= reqAlt) {
                        // Apply the repair swap!
                        entriesGrid[peerId][targetDate].status = 'WORK';
                        entriesGrid[peerId][altDate].status = 'WEEKLY_OFF';
                        entriesGrid[empId][targetDate].status = 'WEEKLY_OFF';
                        repairSuccessful = true;
                        break;
                      }
                    }
                  }
                  if (repairSuccessful) break;
                }
              }
              if (repairSuccessful) break;
            }
            if (repairSuccessful) break;
          }

          if (!repairSuccessful) {
            // If still unresolved, pick the best candidate (lowest deficit) so the validator can flag it explicitly
            const fallback = candidateDays[0];
            if (fallback) {
              entriesGrid[empId][fallback.date].status = 'WEEKLY_OFF';
            }
          }
        }
      }
    }
  }

  // 6. Holiday handling: accrue comp-off if employee works on a public holiday
  const compOffsEarned: Partial<ICompOffLedger>[] = [];
  const holidayDateMap = new Map<string, IHoliday>();
  for (const h of holidays) {
    holidayDateMap.set(h.date, h);
  }

  for (const emp of employees) {
    const empId = (emp.id || emp._id || '').toString();
    for (const date of dates) {
      if (holidayDateMap.has(date)) {
        const entry = entriesGrid[empId][date];
        if (entry?.status === 'WORK') {
          const h = holidayDateMap.get(date)!;
          compOffsEarned.push({
            employeeId: empId,
            earnedDate: date,
            reason: `Worked on public holiday: ${h.name}`,
          });
        }
      }
    }
  }

  // Flatten entries
  const flatEntries: IRosterEntry[] = [];
  for (const emp of employees) {
    const empId = (emp.id || emp._id || '').toString();
    for (const date of dates) {
      flatEntries.push(entriesGrid[empId][date]);
    }
  }

  // 7. Run validation
  const issues = validateRoster({
    dates,
    entries: flatEntries,
    employees,
    processes,
    brands,
    assignments,
    holidays,
    approvedLeaves,
    demandMap: demand,
    maxProcessesPerEmployee,
  });

  return {
    entries: flatEntries,
    issues,
    compOffsEarned,
  };
}

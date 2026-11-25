import {
  IEmployee,
  IProcess,
  IBrand,
  IAssignment,
  IHoliday,
  ILeave,
  IRosterEntry,
  ValidationIssue,
} from '../types/index.js';
import { DemandMap, computeProcessDemand } from './demand.js';
import { formatHumanDate, getWeekday, groupDatesByWeek, isDateInRange } from './dateUtils.js';

export interface ValidatorInput {
  dates: string[];
  entries: IRosterEntry[];
  employees: IEmployee[];
  processes: IProcess[];
  brands: IBrand[];
  assignments: IAssignment[];
  holidays: IHoliday[];
  approvedLeaves: ILeave[];
  demandMap?: DemandMap;
  maxProcessesPerEmployee?: number;
}

export function validateRoster(input: ValidatorInput): ValidationIssue[] {
  const {
    dates,
    entries,
    employees,
    processes,
    brands,
    assignments,
    holidays,
    approvedLeaves,
    maxProcessesPerEmployee = 3,
  } = input;

  const issues: ValidationIssue[] = [];

  // Indexing lookups
  const brandMap = new Map<string, IBrand>();
  for (const b of brands) {
    brandMap.set((b.id || b._id || '').toString(), b);
  }

  const employeeMap = new Map<string, IEmployee>();
  for (const e of employees) {
    employeeMap.set((e.id || e._id || '').toString(), e);
  }

  const processMap = new Map<string, IProcess>();
  for (const p of processes) {
    processMap.set((p.id || p._id || '').toString(), p);
  }

  // Demand
  const demand = input.demandMap || computeProcessDemand(dates, processes, holidays);

  // Assignments lookup:
  // processId -> list of employeeIds
  const processToEmployees = new Map<string, string[]>();
  // employeeId -> list of processIds
  const employeeToProcesses = new Map<string, string[]>();

  for (const proc of processes) {
    processToEmployees.set((proc.id || proc._id || '').toString(), []);
  }
  for (const emp of employees) {
    employeeToProcesses.set((emp.id || emp._id || '').toString(), []);
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

  // Fast entry lookup: [empId_date] -> IRosterEntry
  const entryMap = new Map<string, IRosterEntry>();
  for (const entry of entries) {
    const eId = (entry.employeeId || '').toString();
    entryMap.set(`${eId}_${entry.date}`, entry);
  }

  // -------------------------------------------------------------
  // 1. DEMAND & PROCESS COVERAGE VALIDATION (ZERO_STAFF, STAFFING_BELOW_MIN, SOLE_RESOURCE_UNAVAILABLE)
  // -------------------------------------------------------------
  for (const proc of processes) {
    const procId = (proc.id || proc._id || '').toString();
    const brand = brandMap.get((proc.brandId || '').toString());
    const brandName = brand?.name || 'Unknown Brand';
    const procName = proc.name;
    const assignedEmpIds = processToEmployees.get(procId) || [];
    const isSoleResourceProcess = assignedEmpIds.length === 1;
    const soleEmpId = isSoleResourceProcess ? assignedEmpIds[0] : null;
    const soleEmp = soleEmpId ? employeeMap.get(soleEmpId) : null;

    for (const date of dates) {
      const dailyDemand = demand[procId]?.[date];
      if (!dailyDemand || dailyDemand.requiredStaff <= 0) {
        continue; // Process is closed on this date
      }

      const required = dailyDemand.requiredStaff;

      // Count working employees for this process on this date
      const workingStaff: string[] = [];
      const unavailableReasons: Record<string, string> = {};

      for (const eId of assignedEmpIds) {
        const entry = entryMap.get(`${eId}_${date}`);
        const status = entry?.status || 'WEEKLY_OFF';
        if (status === 'WORK') {
          workingStaff.push(eId);
        } else {
          unavailableReasons[eId] = status;
        }
      }

      const workingCount = workingStaff.length;

      // Sole resource check
      if (isSoleResourceProcess && soleEmpId && workingCount === 0) {
        const empStatus = unavailableReasons[soleEmpId] || 'UNAVAILABLE';
        const statusHuman =
          empStatus === 'WEEKLY_OFF'
            ? 'weekly off'
            : empStatus === 'LEAVE'
            ? 'leave'
            : empStatus === 'COMP_OFF'
            ? 'comp off'
            : empStatus;

        issues.push({
          id: `sole_${procId}_${date}`,
          severity: 'MANDATORY',
          type: 'SOLE_RESOURCE_UNAVAILABLE',
          date,
          brandId: brand?._id?.toString() || brand?.id?.toString(),
          brandName,
          processId: procId,
          processName: procName,
          employeeId: soleEmpId,
          employeeName: soleEmp?.name || 'Assigned Employee',
          message: `Brand ${brandName}, ${procName}: 0 of ${required} required staff on ${formatHumanDate(
            date
          )} because ${soleEmp?.name || 'sole employee'} is on ${statusHuman} (they are the only assigned employee).`,
          suggestedActions: [
            `Assign a cross-trained backup employee to ${brandName} (${procName})`,
            `Swap ${soleEmp?.name}'s off to a date when the process is closed`,
            `Approve temporary coverage from their pod`,
          ],
        });
      } else if (workingCount === 0) {
        issues.push({
          id: `zero_${procId}_${date}`,
          severity: 'MANDATORY',
          type: 'ZERO_STAFF',
          date,
          brandId: brand?._id?.toString() || brand?.id?.toString(),
          brandName,
          processId: procId,
          processName: procName,
          message: `Brand ${brandName}, ${procName}: Zero staffing (0 of ${required} required) on ${formatHumanDate(
            date
          )}. Process will suffer total outage.`,
          suggestedActions: [
            `Assign at least ${required} employee(s) to work on ${formatHumanDate(date)}`,
            `Swap off days of assigned team members`,
          ],
        });
      } else if (workingCount < required) {
        issues.push({
          id: `deficit_${procId}_${date}`,
          severity: 'MANDATORY',
          type: 'STAFFING_BELOW_MIN',
          date,
          brandId: brand?._id?.toString() || brand?.id?.toString(),
          brandName,
          processId: procId,
          processName: procName,
          message: `Brand ${brandName}, ${procName}: Understaffed (${workingCount} of ${required} required) on ${formatHumanDate(
            date
          )}.`,
          suggestedActions: [
            `Add ${required - workingCount} additional team member(s) on ${formatHumanDate(date)}`,
          ],
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 2. EMPLOYEE-CENTRIC VALIDATIONS (LEAVE_CONFLICT, CONSECUTIVE DAYS, WEEKLY OFFS, OVERLOAD, PREFERENCES)
  // -------------------------------------------------------------
  const weeks = groupDatesByWeek(dates);

  for (const emp of employees) {
    const empId = (emp.id || emp._id || '').toString();
    const empName = emp.name;
    const maxConsecutive = emp.maxConsecutiveWorkDays || 6;
    const requiredOffsPerWeek = emp.weeklyOffsPerWeek || 1;

    // Check Leave Conflicts
    const empApprovedLeaves = approvedLeaves.filter(
      l => (l.employeeId || '').toString() === empId && l.status === 'approved'
    );
    for (const leave of empApprovedLeaves) {
      for (const date of dates) {
        if (isDateInRange(date, leave.startDate, leave.endDate)) {
          const entry = entryMap.get(`${empId}_${date}`);
          if (entry && entry.status === 'WORK') {
            issues.push({
              id: `leave_conflict_${empId}_${date}`,
              severity: 'MANDATORY',
              type: 'LEAVE_CONFLICT',
              date,
              employeeId: empId,
              employeeName: empName,
              message: `${empName} is scheduled to WORK on ${formatHumanDate(
                date
              )} while having an approved ${leave.type} leave.`,
              suggestedActions: [
                `Change ${empName}'s status on ${formatHumanDate(date)} to LEAVE`,
                `Assign a replacement employee for this shift`,
              ],
            });
          }
        }
      }
    }

    // Check Consecutive Work Days
    let consecutiveWorkDays = 0;
    let streakStartDate = '';

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const entry = entryMap.get(`${empId}_${date}`);
      const isWorking = entry?.status === 'WORK';

      if (isWorking) {
        if (consecutiveWorkDays === 0) {
          streakStartDate = date;
        }
        consecutiveWorkDays++;

        if (consecutiveWorkDays > maxConsecutive) {
          issues.push({
            id: `consecutive_${empId}_${date}`,
            severity: 'MANDATORY',
            type: 'MAX_CONSECUTIVE_DAYS',
            date,
            employeeId: empId,
            employeeName: empName,
            message: `${empName} is scheduled to work ${consecutiveWorkDays} consecutive days (limit is ${maxConsecutive}) up to ${formatHumanDate(
              date
            )}.`,
            suggestedActions: [
              `Grant a weekly off on ${formatHumanDate(date)} or earlier in the streak`,
              `Swap shifts with a team member`,
            ],
          });
        } else if (consecutiveWorkDays === maxConsecutive) {
          // Warning: edge of capacity
          issues.push({
            id: `edge_capacity_${empId}_${date}`,
            severity: 'WARNING',
            type: 'CAPACITY_EDGE',
            date,
            employeeId: empId,
            employeeName: empName,
            message: `${empName} is at maximum consecutive capacity (${maxConsecutive} days) on ${formatHumanDate(
              date
            )}. High fatigue risk.`,
            suggestedActions: [`Schedule a rest day immediately following ${formatHumanDate(date)}`],
          });
        }
      } else {
        consecutiveWorkDays = 0;
      }
    }

    // Check Weekly Offs per week
    for (const [wStr, weekDates] of Object.entries(weeks)) {
      const weekNum = Number(wStr);
      let offCount = 0;
      for (const d of weekDates) {
        const entry = entryMap.get(`${empId}_${d}`);
        const status = entry?.status || 'WORK';
        if (status === 'WEEKLY_OFF' || status === 'LEAVE' || status === 'COMP_OFF' || status === 'HOLIDAY') {
          offCount++;
        }
      }

      // If week has at least 5 days (full week) and offCount < requiredOffsPerWeek
      if (weekDates.length >= 5 && offCount < requiredOffsPerWeek) {
        const firstDayOfWeek = weekDates[0];
        issues.push({
          id: `offs_${empId}_w${weekNum}`,
          severity: 'MANDATORY',
          type: 'FEWER_WEEKLY_OFFS',
          date: firstDayOfWeek,
          employeeId: empId,
          employeeName: empName,
          message: `${empName} has ${offCount} off(s) in Week ${weekNum} (required minimum: ${requiredOffsPerWeek}).`,
          suggestedActions: [`Assign at least ${requiredOffsPerWeek - offCount} more weekly off in Week ${weekNum}`],
        });
      }
    }

    // Check Multi-Process Overload & Preferences
    const assignedProcesses = employeeToProcesses.get(empId) || [];
    for (const date of dates) {
      const entry = entryMap.get(`${empId}_${date}`);
      if (entry?.status === 'WORK') {
        // How many active processes are open that day for this employee?
        let activeProcessesCount = 0;
        for (const pId of assignedProcesses) {
          const pDemand = demand[pId]?.[date];
          if (pDemand && pDemand.requiredStaff > 0) {
            activeProcessesCount++;
          }
        }

        if (activeProcessesCount > maxProcessesPerEmployee) {
          issues.push({
            id: `overload_${empId}_${date}`,
            severity: 'MANDATORY',
            type: 'PROCESS_OVERLOAD',
            date,
            employeeId: empId,
            employeeName: empName,
            message: `${empName} is covering ${activeProcessesCount} active processes on ${formatHumanDate(
              date
            )} (maximum allowed: ${maxProcessesPerEmployee}).`,
            suggestedActions: [
              `Reassign one of the processes to another team member on ${formatHumanDate(date)}`,
              `Adjust multi-brand process allocation`,
            ],
          });
        }
      }

      // Preference warnings
      if (entry?.status === 'WEEKLY_OFF') {
        const weekday = getWeekday(date);
        const avoids = emp.preferences?.avoidDays || [];
        const preferred = emp.preferences?.preferredWeeklyOffs || [];

        if (avoids.includes(weekday)) {
          issues.push({
            id: `pref_avoid_${empId}_${date}`,
            severity: 'WARNING',
            type: 'PREFERENCE_VIOLATED',
            date,
            employeeId: empId,
            employeeName: empName,
            message: `${empName}'s weekly off on ${formatHumanDate(
              date
            )} falls on an avoided day (day of week: ${weekday}).`,
            suggestedActions: [`Consider swapping off to preferred day (${preferred.join(', ')})`],
          });
        }
      }
    }
  }

  return issues;
}

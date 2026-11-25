import { IEmployee, IAssignment, ILeave, IRosterEntry, IHoliday, EntryStatus } from '../types/index.js';
import { DemandMap } from './demand.js';
import { isDateInRange } from './dateUtils.js';

export interface EmployeeDayAvailability {
  employeeId: string;
  date: string;
  isAvailableForWork: boolean;
  forcedStatus?: EntryStatus;
  isLocked: boolean;
  reason?: string;
}

export type AvailabilityMap = Record<string, Record<string, EmployeeDayAvailability>>; // [empId][dateStr]

export function computeAvailability(
  dates: string[],
  employees: IEmployee[],
  assignments: IAssignment[],
  demand: DemandMap,
  approvedLeaves: ILeave[],
  holidays: IHoliday[],
  lockedEntries: IRosterEntry[] = []
): AvailabilityMap {
  const result: AvailabilityMap = {};

  // Build quick lookup for locked entries: [empId_date] -> IRosterEntry
  const lockedMap = new Map<string, IRosterEntry>();
  for (const entry of lockedEntries) {
    if (entry.locked || entry.source === 'manual') {
      const empId = (entry.employeeId || '').toString();
      lockedMap.set(`${empId}_${entry.date}`, entry);
    }
  }

  // Build employee assignments map: [empId] -> processIds[]
  const empProcessesMap = new Map<string, string[]>();
  for (const emp of employees) {
    const empId = (emp.id || emp._id || '').toString();
    empProcessesMap.set(empId, []);
  }
  for (const a of assignments) {
    const empId = (a.employeeId || '').toString();
    const procId = (a.processId || '').toString();
    if (empProcessesMap.has(empId)) {
      empProcessesMap.get(empId)!.push(procId);
    }
  }

  // Set of holiday dates
  const holidayDateSet = new Set(holidays.map(h => h.date));

  for (const emp of employees) {
    const empId = (emp.id || emp._id || '').toString();
    result[empId] = {};
    const assignedProcessIds = empProcessesMap.get(empId) || [];

    // Filter approved leaves for this employee
    const empLeaves = approvedLeaves.filter(
      l => (l.employeeId || '').toString() === empId && l.status === 'approved'
    );

    for (const date of dates) {
      // 1. Check existing locked or manual entries
      const lockedEntry = lockedMap.get(`${empId}_${date}`);
      if (lockedEntry) {
        result[empId][date] = {
          employeeId: empId,
          date,
          isAvailableForWork: lockedEntry.status === 'WORK',
          forcedStatus: lockedEntry.status,
          isLocked: true,
          reason: `Locked manual entry: ${lockedEntry.status}`,
        };
        continue;
      }

      // 2. Check approved leave
      const activeLeave = empLeaves.find(l => isDateInRange(date, l.startDate, l.endDate));
      if (activeLeave) {
        const status: EntryStatus = activeLeave.type === 'comp_off' ? 'COMP_OFF' : 'LEAVE';
        result[empId][date] = {
          employeeId: empId,
          date,
          isAvailableForWork: false,
          forcedStatus: status,
          isLocked: true, // Approved leaves cannot be overridden by auto-schedule
          reason: `Approved ${activeLeave.type} leave`,
        };
        continue;
      }

      // 3. Check public holiday availability
      // Rule: Employee gets automatic HOLIDAY off ONLY IF ALL of their assigned processes are closed that day!
      if (holidayDateSet.has(date)) {
        let allClosed = assignedProcessIds.length > 0;
        for (const procId of assignedProcessIds) {
          const procDayDemand = demand[procId]?.[date];
          if (procDayDemand && procDayDemand.requiredStaff > 0) {
            allClosed = false;
            break;
          }
        }

        if (allClosed) {
          result[empId][date] = {
            employeeId: empId,
            date,
            isAvailableForWork: false,
            forcedStatus: 'HOLIDAY',
            isLocked: false,
            reason: 'All assigned processes closed on public holiday',
          };
          continue;
        }
      }

      // 4. Default: available for work/weekly-off assignment
      result[empId][date] = {
        employeeId: empId,
        date,
        isAvailableForWork: true,
        isLocked: false,
        reason: 'Available',
      };
    }
  }

  return result;
}

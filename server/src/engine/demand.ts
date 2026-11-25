import { IProcess, IHoliday } from '../types/index.js';
import { getWeekday } from './dateUtils.js';

export interface ProcessDailyDemand {
  processId: string;
  date: string;
  isOpen: boolean;
  requiredStaff: number;
  reason?: string;
}

export type DemandMap = Record<string, Record<string, ProcessDailyDemand>>; // [processId][dateStr]

export function computeProcessDemand(
  dates: string[],
  processes: IProcess[],
  holidays: IHoliday[]
): DemandMap {
  const holidayDateMap = new Map<string, IHoliday>();
  for (const h of holidays) {
    holidayDateMap.set(h.date, h);
  }

  const result: DemandMap = {};

  for (const process of processes) {
    const processId = (process.id || process._id || '').toString();
    result[processId] = {};

    const overrideMap = new Map<string, number>();
    if (process.dateOverrides && Array.isArray(process.dateOverrides)) {
      for (const ov of process.dateOverrides) {
        overrideMap.set(ov.date, ov.minStaff);
      }
    }

    const weekdayMap: Record<number, number> = {};
    if (process.minStaffByWeekday) {
      if (process.minStaffByWeekday instanceof Map) {
        for (const [k, v] of (process.minStaffByWeekday as any).entries()) {
          weekdayMap[Number(k)] = Number(v);
        }
      } else {
        for (const [k, v] of Object.entries(process.minStaffByWeekday)) {
          weekdayMap[Number(k)] = Number(v);
        }
      }
    }

    for (const date of dates) {
      const weekday = getWeekday(date);
      const holiday = holidayDateMap.get(date);
      const isHoliday = Boolean(holiday);

      // Check explicit date override first
      if (overrideMap.has(date)) {
        const staff = overrideMap.get(date)!;
        result[processId][date] = {
          processId,
          date,
          isOpen: staff > 0,
          requiredStaff: staff,
          reason: `Date override specified: ${staff} staff`,
        };
        continue;
      }

      let isClosed = false;
      let closedReason = '';

      switch (process.calendarMode) {
        case 'ALL_365':
          isClosed = false;
          break;
        case 'EXCEPT_HOLIDAYS':
          if (isHoliday) {
            isClosed = true;
            closedReason = `Public Holiday (${holiday?.name || 'Holiday'})`;
          }
          break;
        case 'EXCEPT_SUN_AND_HOLIDAYS':
          if (weekday === 0) {
            isClosed = true;
            closedReason = 'Sunday Closed';
          } else if (isHoliday) {
            isClosed = true;
            closedReason = `Public Holiday (${holiday?.name || 'Holiday'})`;
          }
          break;
        case 'CUSTOM':
          if (process.customClosedWeekdays && process.customClosedWeekdays.includes(weekday)) {
            isClosed = true;
            closedReason = `Custom Closed Weekday (${weekday})`;
          }
          break;
        default:
          isClosed = false;
      }

      if (isClosed) {
        result[processId][date] = {
          processId,
          date,
          isOpen: false,
          requiredStaff: 0,
          reason: closedReason,
        };
        continue;
      }

      // If open, determine staff requirement
      let requiredStaff = process.minStaffDefault ?? 1;
      if (weekday in weekdayMap && weekdayMap[weekday] !== undefined) {
        requiredStaff = weekdayMap[weekday];
      }

      result[processId][date] = {
        processId,
        date,
        isOpen: requiredStaff > 0,
        requiredStaff,
        reason: 'Standard schedule',
      };
    }
  }

  return result;
}

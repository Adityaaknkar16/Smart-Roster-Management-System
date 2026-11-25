import React from 'react';
import { Process, Brand, Assignment, RosterEntry, Holiday } from '../../types/index.js';

interface ProcessViewProps {
  dates: string[];
  processes: Process[];
  brands: Brand[];
  assignments: Assignment[];
  entries: RosterEntry[];
  holidays: Holiday[];
}

export const ProcessView: React.FC<ProcessViewProps> = ({
  dates,
  processes,
  brands,
  assignments,
  entries,
  holidays,
}) => {
  const holidaySet = new Set(holidays.map(h => h.date));

  const entryStatusMap = new Map<string, string>();
  for (const e of entries) {
    entryStatusMap.set(`${e.employeeId}_${e.date}`, e.status);
  }

  const processEmpMap = new Map<string, string[]>();
  for (const p of processes) {
    processEmpMap.set(p._id, []);
  }
  for (const a of assignments) {
    const pId = typeof a.processId === 'object' && a.processId ? a.processId._id : a.processId;
    const eId = typeof a.employeeId === 'object' && a.employeeId ? a.employeeId._id : a.employeeId;
    if (processEmpMap.has(pId)) {
      processEmpMap.get(pId)!.push(eId);
    }
  }

  function getRequiredStaff(p: Process, date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    const isHoliday = holidaySet.has(date);

    if (p.dateOverrides?.length) {
      const ov = p.dateOverrides.find(o => o.date === date);
      if (ov) return ov.minStaff;
    }

    if (p.calendarMode === 'ALL_365') return p.minStaffDefault;
    if (p.calendarMode === 'EXCEPT_HOLIDAYS' && isHoliday) return 0;
    if (p.calendarMode === 'EXCEPT_SUN_AND_HOLIDAYS' && (weekday === 0 || isHoliday)) return 0;
    if (p.calendarMode === 'CUSTOM' && p.customClosedWeekdays?.includes(weekday)) return 0;

    return p.minStaffDefault;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>Operating Calendar Demand vs Actual Working Agents per Process</span>
        <span className="font-semibold text-slate-700">{processes.length} Processes</span>
      </div>

      <div className="overflow-x-auto roster-scrollbar max-h-[620px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 font-bold border-b border-slate-200 select-none">
            <tr>
              <th className="px-3 py-2.5 sticky left-0 bg-slate-100 z-30 min-w-[200px] border-r border-slate-200 shadow-xs">
                Process / Brand
              </th>
              {dates.map(date => {
                const dayNum = date.slice(8);
                const [y, m, d] = date.split('-').map(Number);
                const dayOfWeek = new Date(y, m - 1, d).getDay();
                return (
                  <th
                    key={date}
                    className={`px-1 py-2 text-center min-w-[36px] border-r border-slate-200 ${
                      dayOfWeek === 0 ? 'bg-amber-100/60' : ''
                    }`}
                  >
                    <div className="text-[11px] font-bold">{dayNum}</div>
                    <div className="text-[9px] font-normal text-slate-500">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dayOfWeek]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processes.map(proc => {
              const brand =
                typeof proc.brandId === 'object' && proc.brandId
                  ? proc.brandId
                  : brands.find(b => b._id === proc.brandId);

              const assignedEmps = processEmpMap.get(proc._id) || [];

              return (
                <tr key={proc._id} className="hover:bg-slate-50/70 transition">
                  <td className="px-3 py-2 sticky left-0 bg-white font-medium text-slate-900 z-10 border-r border-slate-200 shadow-xs truncate">
                    <div className="font-bold text-slate-800 text-[12px] truncate">{proc.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal truncate">
                      {brand?.name} · {proc.calendarMode.replace(/_/g, ' ')}
                    </div>
                  </td>

                  {dates.map(date => {
                    const req = getRequiredStaff(proc, date);
                    let actual = 0;
                    for (const eId of assignedEmps) {
                      if (entryStatusMap.get(`${eId}_${date}`) === 'WORK') {
                        actual++;
                      }
                    }

                    let badge = 'bg-slate-100 text-slate-400 border-slate-200';
                    let text = '-';

                    if (req === 0) {
                      badge = 'bg-slate-50 text-slate-300 border-slate-100';
                      text = 'Closed';
                    } else if (actual === 0) {
                      badge = 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse';
                      text = `0/${req}`;
                    } else if (actual < req) {
                      badge = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                      text = `${actual}/${req}`;
                    } else {
                      badge = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                      text = `${actual}/${req}`;
                    }

                    return (
                      <td key={date} className="p-0.5 text-center border-r border-slate-100">
                        <div
                          className={`w-full h-8 rounded flex items-center justify-center text-[10px] border ${badge}`}
                        >
                          {text}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

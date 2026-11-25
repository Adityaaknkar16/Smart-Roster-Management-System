import React from 'react';
import { Brand, Process, Assignment, RosterEntry, Holiday } from '../../types/index.js';
import { Building2 } from 'lucide-react';

interface BrandViewProps {
  dates: string[];
  brands: Brand[];
  processes: Process[];
  assignments: Assignment[];
  entries: RosterEntry[];
  holidays: Holiday[];
  onSelectBrandDate?: (brand: Brand, date: string) => void;
}

export const BrandView: React.FC<BrandViewProps> = ({
  dates,
  brands,
  processes,
  assignments,
  entries,
  holidays,
  onSelectBrandDate,
}) => {
  // Pre-index entries: [empId_date] -> status
  const entryStatusMap = new Map<string, string>();
  for (const e of entries) {
    entryStatusMap.set(`${e.employeeId}_${e.date}`, e.status);
  }

  // Pre-index process to assigned employees
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

  // Holidays set
  const holidaySet = new Set(holidays.map(h => h.date));

  // Compute required staff for a process on a date
  function getProcessRequiredStaff(p: Process, date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    const isHoliday = holidaySet.has(date);

    // Overrides
    if (p.dateOverrides && p.dateOverrides.length > 0) {
      const ov = p.dateOverrides.find(o => o.date === date);
      if (ov) return ov.minStaff;
    }

    // Operating calendar modes
    if (p.calendarMode === 'ALL_365') {
      return p.minStaffDefault;
    } else if (p.calendarMode === 'EXCEPT_HOLIDAYS') {
      if (isHoliday) return 0;
      return p.minStaffDefault;
    } else if (p.calendarMode === 'EXCEPT_SUN_AND_HOLIDAYS') {
      if (weekday === 0 || isHoliday) return 0;
      return p.minStaffDefault;
    } else if (p.calendarMode === 'CUSTOM') {
      if (p.customClosedWeekdays && p.customClosedWeekdays.includes(weekday)) return 0;
      return p.minStaffDefault;
    }

    return p.minStaffDefault;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Legend */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-600">Coverage Status:</span>
          <span className="flex items-center gap-1.5 font-medium text-emerald-800">
            <span className="w-3 h-3 rounded bg-emerald-500"></span> Adequate (100% Staffed)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-amber-800">
            <span className="w-3 h-3 rounded bg-amber-400"></span> Understaffed (&lt; Minimum)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-rose-800">
            <span className="w-3 h-3 rounded bg-rose-500 animate-pulse"></span> Zero Staff (Outage Risk)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            <span className="w-3 h-3 rounded bg-slate-200"></span> Closed
          </span>
        </div>
        <span className="text-slate-400 text-[11px]">Values represent: Actual / Required Staff</span>
      </div>

      <div className="overflow-x-auto roster-scrollbar max-h-[620px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 font-bold border-b border-slate-200 select-none">
            <tr>
              <th className="px-3 py-2.5 sticky left-0 bg-slate-100 z-30 min-w-[180px] border-r border-slate-200 shadow-xs">
                Brand
              </th>
              {dates.map(date => {
                const dayNum = date.slice(8);
                const [y, m, d] = date.split('-').map(Number);
                const dayOfWeek = new Date(y, m - 1, d).getDay();
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;

                return (
                  <th
                    key={date}
                    className={`px-1 py-2 text-center min-w-[38px] border-r border-slate-200 ${
                      isSunday ? 'bg-amber-100/60 text-amber-900' : isSaturday ? 'bg-slate-200/60' : ''
                    }`}
                  >
                    <div className="text-[11px] font-bold leading-tight">{dayNum}</div>
                    <div className="text-[9px] font-normal text-slate-500">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dayOfWeek]}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {brands.map(brand => {
              const brandProcesses = processes.filter(p => {
                const bId = typeof p.brandId === 'object' && p.brandId ? p.brandId._id : p.brandId;
                return bId === brand._id;
              });

              return (
                <tr key={brand._id} className="hover:bg-slate-50/70 transition">
                  <td className="px-3 py-2.5 sticky left-0 bg-white font-semibold text-slate-900 z-10 border-r border-slate-200 shadow-xs truncate">
                    <div className="text-[12px] truncate">{brand.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {brandProcesses.length} process(es)
                    </div>
                  </td>

                  {dates.map(date => {
                    let totalRequired = 0;
                    const workingEmployeesSet = new Set<string>();

                    for (const proc of brandProcesses) {
                      totalRequired += getProcessRequiredStaff(proc, date);
                      const assignedEmps = processEmpMap.get(proc._id) || [];
                      for (const eId of assignedEmps) {
                        if (entryStatusMap.get(`${eId}_${date}`) === 'WORK') {
                          workingEmployeesSet.add(eId);
                        }
                      }
                    }

                    const actualStaff = workingEmployeesSet.size;

                    let badgeClass = 'bg-slate-100 text-slate-400 border-slate-200';
                    let label = '-';

                    if (totalRequired === 0) {
                      badgeClass = 'bg-slate-50 text-slate-300 border-slate-100';
                      label = 'Off';
                    } else if (actualStaff === 0) {
                      badgeClass =
                        'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse';
                      label = `0/${totalRequired}`;
                    } else if (actualStaff < totalRequired) {
                      badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                      label = `${actualStaff}/${totalRequired}`;
                    } else {
                      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                      label = `${actualStaff}/${totalRequired}`;
                    }

                    return (
                      <td
                        key={date}
                        onClick={() => onSelectBrandDate?.(brand, date)}
                        className="p-0.5 text-center border-r border-slate-100 cursor-pointer select-none"
                      >
                        <div
                          className={`w-full h-8 rounded flex items-center justify-center text-[10px] border transition ${badgeClass}`}
                        >
                          {label}
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

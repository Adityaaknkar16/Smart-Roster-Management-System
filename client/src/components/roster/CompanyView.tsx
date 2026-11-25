import React from 'react';
import { RosterEntry, Employee, Pod, ValidationIssue, EntryStatus } from '../../types/index.js';
import { AlertCircle, Lock } from 'lucide-react';

interface CompanyViewProps {
  dates: string[];
  entries: RosterEntry[];
  employees: Employee[];
  pods: Pod[];
  issues: ValidationIssue[];
  onSelectCell: (employee: Employee, date: string, currentEntry?: RosterEntry) => void;
  selectedPodFilter: string;
  searchQuery: string;
  highlightedIssue?: ValidationIssue | null;
}

export const getStatusColor = (status?: EntryStatus): { bg: string; text: string; label: string } => {
  switch (status) {
    case 'WORK':
      return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'text-emerald-800', label: 'W' };
    case 'WEEKLY_OFF':
      return { bg: 'bg-slate-100 text-slate-600 border-slate-300', text: 'text-slate-600', label: 'OFF' };
    case 'HOLIDAY':
      return { bg: 'bg-amber-100 text-amber-900 border-amber-300 font-bold', text: 'text-amber-900', label: 'HOL' };
    case 'LEAVE':
      return { bg: 'bg-rose-100 text-rose-800 border-rose-300 font-bold', text: 'text-rose-800', label: 'LV' };
    case 'COMP_OFF':
      return { bg: 'bg-purple-100 text-purple-800 border-purple-300 font-bold', text: 'text-purple-800', label: 'CO' };
    default:
      return { bg: 'bg-slate-50 text-slate-400 border-slate-200', text: 'text-slate-400', label: '-' };
  }
};

export const CompanyView: React.FC<CompanyViewProps> = ({
  dates,
  entries,
  employees,
  pods,
  issues,
  onSelectCell,
  selectedPodFilter,
  searchQuery,
  highlightedIssue,
}) => {
  // Map [empId_date] -> RosterEntry
  const entryMap = new Map<string, RosterEntry>();
  for (const e of entries) {
    entryMap.set(`${e.employeeId}_${e.date}`, e);
  }

  // Map [empId_date] -> ValidationIssue[]
  const issueMap = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    if (issue.employeeId && issue.date) {
      const key = `${issue.employeeId}_${issue.date}`;
      if (!issueMap.has(key)) issueMap.set(key, []);
      issueMap.get(key)!.push(issue);
    }
  }

  const filteredEmployees = employees.filter(emp => {
    if (selectedPodFilter !== 'all') {
      const pId = typeof emp.podId === 'object' && emp.podId ? emp.podId._id : emp.podId;
      if (pId !== selectedPodFilter) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Legend */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-600">Legend:</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold flex items-center justify-center">W</span> Work
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-4 rounded bg-slate-100 border border-slate-300 text-slate-600 text-[10px] font-bold flex items-center justify-center">OFF</span> Weekly Off
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold flex items-center justify-center">HOL</span> Public Holiday
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-4 rounded bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold flex items-center justify-center">LV</span> Approved Leave
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-4 rounded bg-purple-100 border border-purple-300 text-purple-800 text-[10px] font-bold flex items-center justify-center">CO</span> Comp-Off
          </span>
          <span className="flex items-center gap-1.5 font-medium text-red-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> Conflict Marker
          </span>
        </div>
        <span className="text-slate-400 text-[11px]">Click any cell to edit status & re-validate</span>
      </div>

      <div className="overflow-x-auto roster-scrollbar max-h-[620px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 font-bold border-b border-slate-200 select-none">
            <tr>
              <th className="px-3 py-2.5 sticky left-0 bg-slate-100 z-30 min-w-[170px] border-r border-slate-200 shadow-xs">
                Employee
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
                    className={`px-1 py-2 text-center min-w-[34px] border-r border-slate-200 ${
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
            {filteredEmployees.map(emp => {
              const pod =
                typeof emp.podId === 'object' && emp.podId
                  ? emp.podId
                  : pods.find(p => p._id === emp.podId);

              return (
                <tr key={emp._id} className="hover:bg-slate-50/70 transition">
                  <td className="px-3 py-2 sticky left-0 bg-white font-medium text-slate-900 z-10 border-r border-slate-200 shadow-xs truncate">
                    <div className="font-semibold text-slate-800 text-[12px] truncate">{emp.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{pod?.name?.split(' ')[1] || 'Ops'}</div>
                  </td>

                  {dates.map(date => {
                    const entry = entryMap.get(`${emp._id}_${date}`);
                    const status = entry?.status || 'WORK';
                    const color = getStatusColor(status);
                    const cellIssues = issueMap.get(`${emp._id}_${date}`) || [];
                    const hasConflict = cellIssues.length > 0;
                    const isHighlighted =
                      highlightedIssue &&
                      highlightedIssue.employeeId === emp._id &&
                      highlightedIssue.date === date;

                    return (
                      <td
                        key={date}
                        onClick={() => onSelectCell(emp, date, entry)}
                        className={`p-0.5 text-center border-r border-slate-100 cursor-pointer select-none relative group transition ${
                          isHighlighted ? 'ring-2 ring-red-500 ring-offset-1 z-10' : ''
                        }`}
                      >
                        <div
                          className={`w-full h-8 rounded flex items-center justify-center font-bold text-[10px] border transition ${
                            color.bg
                          } ${entry?.locked ? 'ring-1 ring-slate-400' : ''}`}
                        >
                          {color.label}

                          {entry?.locked && (
                            <Lock className="w-2.5 h-2.5 absolute top-1 right-1 text-slate-400" />
                          )}

                          {hasConflict && (
                            <span className="w-2 h-2 rounded-full bg-red-600 absolute top-1 left-1 animate-pulse" />
                          )}
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

import React, { useState } from 'react';
import { Employee, RosterEntry, Assignment, Process, Brand, ValidationIssue } from '../../types/index.js';
import { getStatusColor } from './CompanyView.js';
import { Calendar, User, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface EmployeeViewProps {
  dates: string[];
  employees: Employee[];
  entries: RosterEntry[];
  assignments: Assignment[];
  processes: Process[];
  brands: Brand[];
  issues: ValidationIssue[];
  initialEmployeeId?: string;
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({
  dates,
  employees,
  entries,
  assignments,
  processes,
  brands,
  issues,
  initialEmployeeId,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialEmployeeId || employees[0]?._id || ''
  );

  const selectedEmp = employees.find(e => e._id === selectedEmpId) || employees[0];

  // Map [date] -> RosterEntry
  const empEntriesMap = new Map<string, RosterEntry>();
  for (const e of entries) {
    if (e.employeeId === selectedEmp?._id) {
      empEntriesMap.set(e.date, e);
    }
  }

  // Assigned processes for selected employee
  const assignedProcessIds = assignments
    .filter(a => {
      const eId = typeof a.employeeId === 'object' && a.employeeId ? a.employeeId._id : a.employeeId;
      return eId === selectedEmp?._id;
    })
    .map(a => (typeof a.processId === 'object' && a.processId ? a.processId._id : a.processId));

  const empProcesses = processes.filter(p => assignedProcessIds.includes(p._id));

  // Employee issues
  const empIssues = issues.filter(i => i.employeeId === selectedEmp?._id);

  // Statistics
  let workCount = 0;
  let offCount = 0;
  let leaveCount = 0;
  let holidayCount = 0;
  let compOffCount = 0;

  for (const d of dates) {
    const s = empEntriesMap.get(d)?.status || 'WORK';
    if (s === 'WORK') workCount++;
    else if (s === 'WEEKLY_OFF') offCount++;
    else if (s === 'LEAVE') leaveCount++;
    else if (s === 'HOLIDAY') holidayCount++;
    else if (s === 'COMP_OFF') compOffCount++;
  }

  // Calendar matrix calculation
  const firstDate = dates[0];
  const [firstY, firstM, firstD] = firstDate ? firstDate.split('-').map(Number) : [2026, 7, 1];
  const firstDayOfWeek = new Date(firstY, firstM - 1, firstD).getDay(); // 0 = Sun

  const calendarDays: (string | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (const d of dates) {
    calendarDays.push(d);
  }

  return (
    <div className="space-y-6">
      {/* Top Selector & Profile Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
            {selectedEmp?.name?.slice(0, 2).toUpperCase() || 'EM'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={selectedEmp?._id || ''}
                onChange={e => setSelectedEmpId(e.target.value)}
                className="text-base font-bold text-slate-900 border-none bg-transparent hover:bg-slate-50 rounded px-1 -ml-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {employees.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Role: <span className="font-semibold text-slate-700 uppercase">{selectedEmp?.role?.replace('_', ' ')}</span> ·{' '}
              Max Consecutive Days: <span className="font-semibold text-slate-700">{selectedEmp?.maxConsecutiveWorkDays || 6}</span> ·{' '}
              Weekly Offs Target: <span className="font-semibold text-slate-700">{selectedEmp?.weeklyOffsPerWeek || 1}/week</span>
            </p>
          </div>
        </div>

        {/* Shift Summary Cards */}
        <div className="flex items-center gap-2 text-center overflow-x-auto">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 min-w-[70px]">
            <span className="text-base font-bold text-emerald-800">{workCount}</span>
            <span className="block text-[10px] font-semibold text-emerald-600 uppercase">Work</span>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 min-w-[70px]">
            <span className="text-base font-bold text-slate-700">{offCount}</span>
            <span className="block text-[10px] font-semibold text-slate-500 uppercase">Off</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 min-w-[70px]">
            <span className="text-base font-bold text-rose-800">{leaveCount}</span>
            <span className="block text-[10px] font-semibold text-rose-600 uppercase">Leave</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 min-w-[70px]">
            <span className="text-base font-bold text-amber-800">{holidayCount}</span>
            <span className="block text-[10px] font-semibold text-amber-600 uppercase">Holiday</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 min-w-[70px]">
            <span className="text-base font-bold text-purple-800">{compOffCount}</span>
            <span className="block text-[10px] font-semibold text-purple-600 uppercase">Comp-Off</span>
          </div>
        </div>
      </div>

      {/* Conflicts if any */}
      {empIssues.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Active Validation Alerts for {selectedEmp?.name}</span>
          </div>
          <div className="space-y-1">
            {empIssues.map(issue => (
              <div key={issue.id} className="text-xs text-rose-800 bg-white p-2 rounded border border-rose-100">
                • {issue.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Monthly Schedule Grid (July 2026)
          </h3>
          <div className="text-xs text-slate-500">
            Assigned Processes:{' '}
            <span className="font-medium text-slate-700">
              {empProcesses.map(p => p.name).join(', ') || 'General Ops'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold text-center py-2.5">
          <div className="text-rose-600">Sunday</div>
          <div>Monday</div>
          <div>Tuesday</div>
          <div>Wednesday</div>
          <div>Thursday</div>
          <div>Friday</div>
          <div>Saturday</div>
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="h-28 bg-slate-50/40" />;
            }

            const dayNum = date.slice(8);
            const entry = empEntriesMap.get(date);
            const status = entry?.status || 'WORK';
            const color = getStatusColor(status);
            const dateIssues = empIssues.filter(i => i.date === date);

            return (
              <div
                key={date}
                className="h-28 p-2 flex flex-col justify-between hover:bg-slate-50/70 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs">{dayNum}</span>
                  {dateIssues.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={dateIssues[0].message} />
                  )}
                </div>

                <div className={`p-2 rounded-lg border text-center font-bold text-xs ${color.bg}`}>
                  <div>{color.label}</div>
                  <div className="text-[10px] font-normal opacity-90">{status.replace('_', ' ')}</div>
                </div>

                <div className="text-[9px] text-slate-400 truncate">
                  {entry?.locked ? '🔒 Locked' : entry?.source === 'manual' ? 'Manual' : 'Auto'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

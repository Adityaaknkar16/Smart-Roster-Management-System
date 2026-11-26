import React from 'react';
import { RosterEntry, Employee, Pod, ValidationIssue } from '../../types/index.js';
import { CompanyView } from './CompanyView.js';
import { Users2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PodViewProps {
  dates: string[];
  entries: RosterEntry[];
  employees: Employee[];
  pods: Pod[];
  issues: ValidationIssue[];
  onSelectCell: (employee: Employee, date: string, currentEntry?: RosterEntry) => void;
  selectedPodId?: string;
}

export const PodView: React.FC<PodViewProps> = ({
  dates,
  entries,
  employees,
  pods,
  issues,
  onSelectCell,
  selectedPodId,
}) => {
  const podsToDisplay = selectedPodId && selectedPodId !== 'all'
    ? pods.filter(p => p._id === selectedPodId)
    : pods;

  return (
    <div className="space-y-6">
      {podsToDisplay.map(pod => {
        const podEmployees = employees.filter(e => {
          const pId = typeof e.podId === 'object' && e.podId ? e.podId._id : e.podId;
          return pId === pod._id;
        });

        const podEmpIds = new Set(podEmployees.map(e => e._id));
        const podIssues = issues.filter(i => i.employeeId && podEmpIds.has(i.employeeId));
        const podLead =
          typeof pod.leadEmployeeId === 'object' && pod.leadEmployeeId
            ? pod.leadEmployeeId
            : employees.find(e => e._id === pod.leadEmployeeId);

        return (
          <div key={pod._id} className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-5 py-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{pod.name}</h3>
                  <p className="text-xs text-slate-500">
                    Lead: <span className="font-medium text-slate-700">{podLead?.name || 'Unassigned'}</span> |{' '}
                    <span>{podEmployees.length} members</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {podIssues.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {podIssues.length} Pod Conflict(s)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All shifts balanced
                  </span>
                )}
              </div>
            </div>

            <CompanyView
              dates={dates}
              entries={entries}
              employees={podEmployees}
              pods={pods}
              issues={issues}
              onSelectCell={onSelectCell}
              selectedPodFilter="all"
              searchQuery=""
            />
          </div>
        );
      })}
    </div>
  );
};

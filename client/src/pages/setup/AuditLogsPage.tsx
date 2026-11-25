import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client.js';
import { History, Clock, User, CheckCircle2 } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ['audit-logs'],
    queryFn: () => apiRequest('/audit-logs'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">System Audit Log & Roster History</h2>
        <p className="text-sm text-slate-500">
          Immutable audit trail of roster generations, manual edits, suggestion applications, and published rosters.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No audit logs recorded yet.</div>
          ) : (
            logs.map(log => (
              <div key={log._id} className="p-4 hover:bg-slate-50/70 transition flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Triggered by <span className="font-semibold text-slate-900">{log.userName || 'System'}</span>
                  </p>
                  {log.details && (
                    <pre className="text-[11px] font-mono bg-slate-50 text-slate-600 p-2 rounded border border-slate-100 overflow-x-auto max-h-24">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

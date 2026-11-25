import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { Leave, Employee } from '../../types/index.js';
import { CalendarOff, Plus, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const LeavesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canApprove = user?.role === 'manager' || user?.role === 'pod_lead';

  const { data: leaves = [], isLoading } = useQuery<Leave[]>({
    queryKey: ['leaves'],
    queryFn: () => apiRequest('/leaves'),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiRequest('/employees'),
  });

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    startDate: '2026-07-12',
    endDate: '2026-07-12',
    type: 'planned',
    status: 'approved',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/leaves', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      setIsAdding(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/leaves/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });

  // Find demo agent Riya Sharma
  const riya = employees.find(e => e.email.includes('riya'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Leave Requests & Change Handling</h2>
          <p className="text-sm text-slate-500">
            Approved leaves trigger cross-brand impact analysis and active backup recommendations.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Request / Add Leave
        </button>
      </div>

      {/* BUILT-IN DEMO SCENARIO HIGHLIGHT CARD */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Built-in Demo Scenario: Single-Resource Brand Coverage Deficit</span>
            </div>
            <p className="text-xs text-amber-800 max-w-2xl leading-relaxed">
              <strong>Riya Sharma</strong> is the sole assigned resource for <strong>Zing Support</strong> (operating 365 days).
              Her approved leave on <strong>Sun, Jul 12, 2026</strong> triggers an immediate zero-staff conflict on both NDR and CS processes.
            </p>
          </div>

          <button
            onClick={() => navigate('/roster')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs shrink-0"
          >
            <span>Analyze Impact & Resolve</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">Add / Simulate Leave</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Employee</label>
              <select
                value={formData.employeeId}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">-- Select Employee --</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Leave Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="planned">Planned Leave</option>
                <option value="comp_off">Comp-Off Leave</option>
                <option value="sick">Sick Leave</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.startDate || !formData.endDate}
              className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Submit Leave
            </button>
          </div>
        </div>
      )}

      {/* Leaves list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200 font-semibold">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              {canApprove && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaves.map(l => {
              const emp =
                typeof l.employeeId === 'object' && l.employeeId
                  ? l.employeeId
                  : employees.find(e => e._id === l.employeeId);

              const isRiyaDemo = emp?.email?.includes('riya');

              return (
                <tr
                  key={l._id}
                  className={`hover:bg-slate-50/70 ${isRiyaDemo ? 'bg-amber-50/30' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      {emp?.name || 'Unknown'}
                      {isRiyaDemo && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                          Demo Sole Resource
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{emp?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-700">
                    {l.startDate} {l.startDate !== l.endDate ? `to ${l.endDate}` : '(1 day)'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize font-medium text-slate-700">
                      {l.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        l.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3 text-right">
                      {l.status === 'requested' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              updateMutation.mutate({ id: l._id, status: 'approved' })
                            }
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              updateMutation.mutate({ id: l._id, status: 'rejected' })
                            }
                            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

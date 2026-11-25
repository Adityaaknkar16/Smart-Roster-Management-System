import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client.js';
import { Employee, Pod } from '../../types/index.js';
import { UserCheck, Plus, Edit2, Trash2, Check, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

const WEEKDAYS = [
  { val: 0, label: 'Sun' },
  { val: 1, label: 'Mon' },
  { val: 2, label: 'Tue' },
  { val: 3, label: 'Wed' },
  { val: 4, label: 'Thu' },
  { val: 5, label: 'Fri' },
  { val: 6, label: 'Sat' },
];

export const EmployeesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'manager' || user?.role === 'pod_lead';

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiRequest('/employees'),
  });

  const { data: pods = [] } = useQuery<Pod[]>({
    queryKey: ['pods'],
    queryFn: () => apiRequest('/pods'),
  });

  const [selectedPodFilter, setSelectedPodFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    podId: string;
    role: 'manager' | 'pod_lead' | 'viewer';
    active: boolean;
    preferredWeeklyOffs: number[];
    avoidDays: number[];
    maxConsecutiveWorkDays: number;
    weeklyOffsPerWeek: number;
  }>({
    name: '',
    email: '',
    podId: '',
    role: 'viewer',
    active: true,
    preferredWeeklyOffs: [0],
    avoidDays: [],
    maxConsecutiveWorkDays: 6,
    weeklyOffsPerWeek: 1,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        name: data.name,
        email: data.email,
        podId: data.podId || undefined,
        role: data.role,
        active: data.active,
        preferences: {
          preferredWeeklyOffs: data.preferredWeeklyOffs,
          avoidDays: data.avoidDays,
        },
        maxConsecutiveWorkDays: Number(data.maxConsecutiveWorkDays),
        weeklyOffsPerWeek: Number(data.weeklyOffsPerWeek),
      };

      if (data.id) {
        return apiRequest(`/employees/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      }
      return apiRequest('/employees', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const filteredEmployees = employees.filter(emp => {
    if (selectedPodFilter === 'all') return true;
    const pId = typeof emp.podId === 'object' && emp.podId ? emp.podId._id : emp.podId;
    return pId === selectedPodFilter;
  });

  const handleToggleDay = (day: number, type: 'preferred' | 'avoid') => {
    if (type === 'preferred') {
      const current = formData.preferredWeeklyOffs;
      const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
      setFormData({ ...formData, preferredWeeklyOffs: next });
    } else {
      const current = formData.avoidDays;
      const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
      setFormData({ ...formData, avoidDays: next });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Employees & Personnel</h2>
          <p className="text-sm text-slate-500">
            Manage agents, leads, preferences, max consecutive work limits, and pods.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPodFilter}
              onChange={e => setSelectedPodFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none"
            >
              <option value="all">All Pods ({employees.length})</option>
              {pods.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {canEdit && (
            <button
              onClick={() => {
                setIsEditing('new');
                setFormData({
                  name: '',
                  email: '',
                  podId: pods[0]?._id || '',
                  role: 'viewer',
                  active: true,
                  preferredWeeklyOffs: [0],
                  avoidDays: [],
                  maxConsecutiveWorkDays: 6,
                  weeklyOffsPerWeek: 1,
                });
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">
            {isEditing === 'new' ? 'Add New Employee' : 'Edit Employee'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pod</label>
              <select
                value={formData.podId}
                onChange={e => setFormData({ ...formData, podId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Pod --</option>
                {pods.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="viewer">Viewer / Agent</option>
                <option value="pod_lead">Pod Lead</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Max Consecutive Work Days
              </label>
              <input
                type="number"
                min={1}
                max={14}
                value={formData.maxConsecutiveWorkDays}
                onChange={e =>
                  setFormData({ ...formData, maxConsecutiveWorkDays: Number(e.target.value) })
                }
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Weekly Offs Per Week
              </label>
              <input
                type="number"
                min={1}
                max={3}
                value={formData.weeklyOffsPerWeek}
                onChange={e =>
                  setFormData({ ...formData, weeklyOffsPerWeek: Number(e.target.value) })
                }
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Active Status
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Preferred Weekly Offs (Soft preference):
              </label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map(d => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => handleToggleDay(d.val, 'preferred')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                      formData.preferredWeeklyOffs.includes(d.val)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Avoid Days (Negative preference):
              </label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map(d => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => handleToggleDay(d.val, 'avoid')}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                      formData.avoidDays.includes(d.val)
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsEditing(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                saveMutation.mutate({
                  id: isEditing === 'new' ? undefined : isEditing,
                  ...formData,
                })
              }
              disabled={!formData.name || !formData.email}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Save Employee
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Pod</th>
                <th className="px-4 py-3">Pref Offs</th>
                <th className="px-4 py-3">Avoid Days</th>
                <th className="px-4 py-3">Max Work Days</th>
                <th className="px-4 py-3">Status</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
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
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{emp.name}</div>
                      <div className="text-xs text-slate-500">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          emp.role === 'manager'
                            ? 'bg-amber-100 text-amber-800'
                            : emp.role === 'pod_lead'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {emp.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 font-medium">
                      {pod?.name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {emp.preferences?.preferredWeeklyOffs?.map(d => (
                          <span
                            key={d}
                            className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200"
                          >
                            {WEEKDAYS[d]?.label}
                          </span>
                        )) || <span className="text-xs text-slate-400">None</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {emp.preferences?.avoidDays?.length ? (
                          emp.preferences.avoidDays.map(d => (
                            <span
                              key={d}
                              className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-200"
                            >
                              {WEEKDAYS[d]?.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {emp.maxConsecutiveWorkDays || 6} days
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          emp.active ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      ></span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setIsEditing(emp._id);
                              setFormData({
                                name: emp.name,
                                email: emp.email,
                                podId: pod?._id || '',
                                role: emp.role,
                                active: emp.active,
                                preferredWeeklyOffs: emp.preferences?.preferredWeeklyOffs || [0],
                                avoidDays: emp.preferences?.avoidDays || [],
                                maxConsecutiveWorkDays: emp.maxConsecutiveWorkDays || 6,
                                weeklyOffsPerWeek: emp.weeklyOffsPerWeek || 1,
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {user?.role === 'manager' && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${emp.name}?`)) {
                                  deleteMutation.mutate(emp._id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

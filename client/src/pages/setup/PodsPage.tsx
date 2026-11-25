import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client.js';
import { Pod, Employee } from '../../types/index.js';
import { Users2, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const PodsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'manager' || user?.role === 'pod_lead';

  const { data: pods = [], isLoading } = useQuery<Pod[]>({
    queryKey: ['pods'],
    queryFn: () => apiRequest('/pods'),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiRequest('/employees'),
  });

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; leadEmployeeId?: string }>({
    name: '',
    leadEmployeeId: '',
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id?: string; name: string; leadEmployeeId?: string }) => {
      if (data.id) {
        return apiRequest(`/pods/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiRequest('/pods', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pods'] });
      setIsEditing(null);
      setFormData({ name: '', leadEmployeeId: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/pods/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pods'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Operational Pods</h2>
          <p className="text-sm text-slate-500">
            Pods organize brands and support personnel into focused operational teams.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setIsEditing('new');
              setFormData({ name: '', leadEmployeeId: '' });
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Pod
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">
            {isEditing === 'new' ? 'Create New Pod' : 'Edit Pod'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pod Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pod Alpha (Quick Commerce)"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pod Lead</label>
              <select
                value={formData.leadEmployeeId || ''}
                onChange={e => setFormData({ ...formData, leadEmployeeId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Lead --</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
              disabled={!formData.name}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Save Pod
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pods.map(pod => {
          const lead =
            typeof pod.leadEmployeeId === 'object' && pod.leadEmployeeId
              ? pod.leadEmployeeId
              : employees.find(e => e._id === pod.leadEmployeeId);

          return (
            <div
              key={pod._id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Users2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{pod.name}</h4>
                    <p className="text-xs text-slate-500">
                      Lead: <span className="font-medium text-slate-700">{lead?.name || 'Unassigned'}</span>
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setIsEditing(pod._id);
                        setFormData({
                          name: pod.name,
                          leadEmployeeId: lead?._id || '',
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {user?.role === 'manager' && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete pod ${pod.name}?`)) {
                            deleteMutation.mutate(pod._id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client.js';
import { Holiday } from '../../types/index.js';
import { Palmtree, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const HolidaysPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'manager' || user?.role === 'pod_lead';

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: () => apiRequest('/holidays'),
  });

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ date: '', name: '', region: 'India' });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (data.id) {
        return apiRequest(`/holidays/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiRequest('/holidays', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      setIsEditing(null);
      setFormData({ date: '', name: '', region: 'India' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/holidays/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Public Holidays (July 2026)</h2>
          <p className="text-sm text-slate-500">
            Employees working on public holidays for 365-day processes automatically accrue comp-off credits.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setIsEditing('new');
              setFormData({ date: '2026-07-15', name: '', region: 'India' });
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">
            {isEditing === 'new' ? 'Add Holiday' : 'Edit Holiday'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Holiday Name</label>
              <input
                type="text"
                placeholder="e.g. Independence Day"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
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
              disabled={!formData.date || !formData.name}
              className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Holiday
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays.map(h => (
          <div
            key={h._id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition flex items-start justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">{h.name}</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{h.date}</p>
                <span className="text-[10px] uppercase font-bold text-slate-400">{h.region}</span>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsEditing(h._id);
                    setFormData({ date: h.date, name: h.name, region: h.region });
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${h.name}?`)) deleteMutation.mutate(h._id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

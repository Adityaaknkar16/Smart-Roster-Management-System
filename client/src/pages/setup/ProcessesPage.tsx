import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client.js';
import { Process, Brand, CalendarMode, ProcessType } from '../../types/index.js';
import { Sliders, Plus, Edit2, Trash2, Check, Calendar, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ProcessesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'manager' || user?.role === 'pod_lead';

  const { data: processes = [], isLoading } = useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: () => apiRequest('/processes'),
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => apiRequest('/brands'),
  });

  const [isEditing, setIsEditing] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    brandId: string;
    name: string;
    type: ProcessType;
    calendarMode: CalendarMode;
    customClosedWeekdays: number[];
    minStaffDefault: number;
    minStaffByWeekday: Record<number, number>;
    dateOverrides: { date: string; minStaff: number }[];
  }>({
    brandId: '',
    name: '',
    type: 'CS',
    calendarMode: 'ALL_365',
    customClosedWeekdays: [],
    minStaffDefault: 1,
    minStaffByWeekday: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
    dateOverrides: [],
  });

  const [newOverride, setNewOverride] = useState({ date: '', minStaff: 1 });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (data.id) {
        return apiRequest(`/processes/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiRequest('/processes', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      setIsEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/processes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });

  const toggleCustomClosedWeekday = (w: number) => {
    const list = formData.customClosedWeekdays;
    const next = list.includes(w) ? list.filter(item => item !== w) : [...list, w];
    setFormData({ ...formData, customClosedWeekdays: next });
  };

  const addDateOverride = () => {
    if (!newOverride.date) return;
    setFormData({
      ...formData,
      dateOverrides: [
        ...formData.dateOverrides.filter(o => o.date !== newOverride.date),
        { date: newOverride.date, minStaff: Number(newOverride.minStaff) },
      ],
    });
    setNewOverride({ date: '', minStaff: 1 });
  };

  const removeDateOverride = (date: string) => {
    setFormData({
      ...formData,
      dateOverrides: formData.dateOverrides.filter(o => o.date !== date),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Process Operating Calendars</h2>
          <p className="text-sm text-slate-500">
            Define operating schedules, weekday coverage minimums, and date-specific staff overrides.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setIsEditing('new');
              setFormData({
                brandId: brands[0]?._id || '',
                name: '',
                type: 'CS',
                calendarMode: 'ALL_365',
                customClosedWeekdays: [],
                minStaffDefault: 1,
                minStaffByWeekday: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
                dateOverrides: [],
              });
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Process
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-800 text-base">
              {isEditing === 'new' ? 'Configure New Process' : 'Edit Operating Calendar Rules'}
            </h3>
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-medium">
              Live Validation Linked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
              <select
                value={formData.brandId}
                onChange={e => setFormData({ ...formData, brandId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Brand --</option>
                {brands.map(b => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Process Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. NDR Escalations"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Process Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CS">CS (Customer Support)</option>
                <option value="NDR">NDR (Non-Delivery Reports)</option>
                <option value="ACC">ACC (Accounts & Billing)</option>
                <option value="Retention">Retention</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Operating Calendar Mode */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                Process Operating Calendar Mode
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Dictates when coverage is legally required from the operational team.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    id: 'ALL_365',
                    title: 'ALL 365 Days',
                    desc: 'Operates 365 days a year without exception (requires holiday comp-off accrual).',
                  },
                  {
                    id: 'EXCEPT_HOLIDAYS',
                    title: 'Except Holidays',
                    desc: 'Closed on all official public holidays.',
                  },
                  {
                    id: 'EXCEPT_SUN_AND_HOLIDAYS',
                    title: 'Except Sun & Holidays',
                    desc: 'Closed on Sundays and all public holidays.',
                  },
                  {
                    id: 'CUSTOM',
                    title: 'Custom Schedule',
                    desc: 'Configure specific closed days of the week.',
                  },
                ].map(mode => (
                  <label
                    key={mode.id}
                    className={`flex flex-col p-3 rounded-lg border cursor-pointer transition ${
                      formData.calendarMode === mode.id
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="calendarMode"
                        value={mode.id}
                        checked={formData.calendarMode === mode.id}
                        onChange={() => setFormData({ ...formData, calendarMode: mode.id as any })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold text-xs text-slate-900">{mode.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-normal">{mode.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {formData.calendarMode === 'CUSTOM' && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Custom Closed Weekdays:
                </label>
                <div className="flex gap-2">
                  {WEEKDAYS.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleCustomClosedWeekday(idx)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                        formData.customClosedWeekdays.includes(idx)
                          ? 'bg-red-600 text-white font-bold'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {name} (Closed)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Staffing Minimums */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                Weekday Minimum Staffing (Required count per day)
              </label>

              <div className="grid grid-cols-7 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {WEEKDAYS.map((name, idx) => (
                  <div key={idx} className="text-center">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1">{name}</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={formData.minStaffByWeekday[idx] ?? formData.minStaffDefault}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          minStaffByWeekday: {
                            ...formData.minStaffByWeekday,
                            [idx]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full text-center text-xs font-bold border border-slate-300 rounded px-1 py-1 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Default fallback min staff:</span>
                <input
                  type="number"
                  min={0}
                  value={formData.minStaffDefault}
                  onChange={e => setFormData({ ...formData, minStaffDefault: Number(e.target.value) })}
                  className="w-16 text-xs text-center border border-slate-300 rounded px-2 py-1"
                />
              </div>
            </div>

            {/* Date Overrides */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                Date-Specific Staffing Overrides (e.g. Flash Sales, Peak Days)
              </label>

              <div className="flex gap-2">
                <input
                  type="date"
                  value={newOverride.date}
                  onChange={e => setNewOverride({ ...newOverride, date: e.target.value })}
                  className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 flex-1"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Min Staff"
                  value={newOverride.minStaff}
                  onChange={e => setNewOverride({ ...newOverride, minStaff: Number(e.target.value) })}
                  className="w-24 text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-center"
                />
                <button
                  type="button"
                  onClick={addDateOverride}
                  className="text-xs bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-slate-900"
                >
                  Add Override
                </button>
              </div>

              <div className="space-y-1 max-h-32 overflow-y-auto">
                {formData.dateOverrides.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No date overrides configured.</p>
                ) : (
                  formData.dateOverrides.map(ov => (
                    <div
                      key={ov.date}
                      className="flex items-center justify-between text-xs bg-indigo-50 text-indigo-900 px-3 py-1.5 rounded border border-indigo-100"
                    >
                      <span className="font-mono font-medium">{ov.date}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{ov.minStaff} staff required</span>
                        <button
                          type="button"
                          onClick={() => removeDateOverride(ov.date)}
                          className="text-rose-500 hover:text-rose-700 p-0.5 rounded hover:bg-rose-50 transition"
                          title="Remove override"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => setIsEditing(null)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
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
              disabled={!formData.name || !formData.brandId}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Save Operating Calendar Rules
            </button>
          </div>
        </div>
      )}

      {/* Process list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {processes.map(proc => {
          const brand =
            typeof proc.brandId === 'object' && proc.brandId
              ? proc.brandId
              : brands.find(b => b._id === proc.brandId);

          return (
            <div
              key={proc._id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {proc.type}
                  </span>
                  <h4 className="font-bold text-slate-900 text-base mt-1">{proc.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Brand: <span className="text-slate-800">{brand?.name || 'Unlinked'}</span>
                  </p>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setIsEditing(proc._id);
                        setFormData({
                          brandId: brand?._id || '',
                          name: proc.name,
                          type: proc.type,
                          calendarMode: proc.calendarMode,
                          customClosedWeekdays: proc.customClosedWeekdays || [],
                          minStaffDefault: proc.minStaffDefault,
                          minStaffByWeekday: (proc.minStaffByWeekday as any) || {
                            0: proc.minStaffDefault,
                            1: proc.minStaffDefault,
                            2: proc.minStaffDefault,
                            3: proc.minStaffDefault,
                            4: proc.minStaffDefault,
                            5: proc.minStaffDefault,
                            6: proc.minStaffDefault,
                          },
                          dateOverrides: proc.dateOverrides || [],
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {user?.role === 'manager' && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete process ${proc.name}?`)) {
                            deleteMutation.mutate(proc._id);
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

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Mode: </span>
                  <span className="font-semibold text-slate-700">
                    {proc.calendarMode.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Default Staff: </span>
                  <span className="font-bold text-indigo-600">{proc.minStaffDefault}</span>
                </div>
              </div>

              {proc.dateOverrides && proc.dateOverrides.length > 0 && (
                <div className="text-[11px] bg-indigo-50/70 text-indigo-700 px-2.5 py-1 rounded border border-indigo-100 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>{proc.dateOverrides.length} date override(s) active</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

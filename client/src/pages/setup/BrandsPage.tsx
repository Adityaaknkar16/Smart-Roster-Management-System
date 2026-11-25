import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client.js';
import { Brand, Pod } from '../../types/index.js';
import { Building2, Plus, Edit2, Trash2, Check, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const BrandsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'manager' || user?.role === 'pod_lead';

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => apiRequest('/brands'),
  });

  const { data: pods = [] } = useQuery<Pod[]>({
    queryKey: ['pods'],
    queryFn: () => apiRequest('/pods'),
  });

  const [selectedPodFilter, setSelectedPodFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    podId: string;
    active: boolean;
  }>({
    name: '',
    podId: '',
    active: true,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id?: string; name: string; podId?: string; active: boolean }) => {
      if (data.id) {
        return apiRequest(`/brands/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
      }
      return apiRequest('/brands', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setIsEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/brands/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  });

  const filteredBrands = brands.filter(b => {
    if (selectedPodFilter === 'all') return true;
    const pId = typeof b.podId === 'object' && b.podId ? b.podId._id : b.podId;
    return pId === selectedPodFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">D2C Brands Portfolio</h2>
          <p className="text-sm text-slate-500">
            25 brands managed across operations pods, including single-resource and multi-resource brands.
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
              <option value="all">All Pods ({brands.length})</option>
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
                  podId: pods[0]?._id || '',
                  active: true,
                });
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Brand
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">
            {isEditing === 'new' ? 'Add New Brand' : 'Edit Brand'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Brand Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Zing Support"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Pod</label>
              <select
                value={formData.podId}
                onChange={e => setFormData({ ...formData, podId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Pod --</option>
                {pods.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="brandActive"
              checked={formData.active}
              onChange={e => setFormData({ ...formData, active: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="brandActive" className="text-xs text-slate-700 font-medium">
              Brand Active in Operations
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
              <Check className="w-3.5 h-3.5" /> Save Brand
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBrands.map(brand => {
          const pod =
            typeof brand.podId === 'object' && brand.podId
              ? brand.podId
              : pods.find(p => p._id === brand.podId);

          return (
            <div
              key={brand._id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{brand.name}</h4>
                    <p className="text-xs text-slate-500">
                      Pod: <span className="font-medium text-slate-700">{pod?.name || 'Unassigned'}</span>
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setIsEditing(brand._id);
                        setFormData({
                          name: brand.name,
                          podId: pod?._id || '',
                          active: brand.active,
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {user?.role === 'manager' && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${brand.name}?`)) {
                            deleteMutation.mutate(brand._id);
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

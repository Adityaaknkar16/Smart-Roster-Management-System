import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client.js';
import { Assignment, Employee, Process, Brand } from '../../types/index.js';
import { Network, Plus, Trash2, Check, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const AssignmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'manager' || user?.role === 'pod_lead';

  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');
  const [isAdding, setIsAdding] = useState(false);

  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => apiRequest('/assignments'),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiRequest('/employees'),
  });

  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: () => apiRequest('/processes'),
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => apiRequest('/brands'),
  });

  const [formData, setFormData] = useState({
    employeeId: '',
    processId: '',
    isPrimary: true,
    allocationPercent: 100,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/assignments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      setIsAdding(false);
      setFormData({
        employeeId: '',
        processId: '',
        isPrimary: true,
        allocationPercent: 100,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });

  // Fast lookup: [empId_procId] -> Assignment
  const assignmentMap = new Map<string, Assignment>();
  for (const a of assignments) {
    const eId = typeof a.employeeId === 'object' && a.employeeId ? a.employeeId._id : a.employeeId;
    const pId = typeof a.processId === 'object' && a.processId ? a.processId._id : a.processId;
    assignmentMap.set(`${eId}_${pId}`, a);
  }

  const toggleAssignmentCell = (empId: string, procId: string) => {
    if (!canEdit) return;
    const existing = assignmentMap.get(`${empId}_${procId}`);
    if (existing) {
      deleteMutation.mutate(existing._id);
    } else {
      createMutation.mutate({
        employeeId: empId,
        processId: procId,
        isPrimary: true,
        allocationPercent: 100,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Resource Assignments (Employee ↔ Process)</h2>
          <p className="text-sm text-slate-500">
            Many-to-many allocation matrix: agents can cover multiple processes or brands, and processes can have multiple agents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'matrix' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Matrix Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'table' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table List
            </button>
          </div>

          {canEdit && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Assignment
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">Assign Employee to Process</h3>
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
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Process</label>
              <select
                value={formData.processId}
                onChange={e => setFormData({ ...formData, processId: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">-- Select Process --</option>
                {processes.map(p => {
                  const b =
                    typeof p.brandId === 'object' && p.brandId
                      ? p.brandId
                      : brands.find(brand => brand._id === p.brandId);
                  return (
                    <option key={p._id} value={p._id}>
                      {b?.name} — {p.name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Allocation %</label>
              <input
                type="number"
                min={10}
                max={100}
                value={formData.allocationPercent}
                onChange={e =>
                  setFormData({ ...formData, allocationPercent: Number(e.target.value) })
                }
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={e => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                Primary Assigned Resource
              </label>
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
              disabled={!formData.employeeId || !formData.processId}
              className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Assignment
            </button>
          </div>
        </div>
      )}

      {viewMode === 'matrix' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>💡 Click any cell to toggle assignment. Numbers represent allocation percent.</span>
            <span className="font-semibold text-slate-700">
              {employees.length} Employees × {processes.length} Processes
            </span>
          </div>
          <div className="overflow-x-auto roster-scrollbar max-h-[600px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 sticky left-0 bg-slate-100 z-20 min-w-[160px] border-r border-slate-200">
                    Employee
                  </th>
                  {processes.map(proc => {
                    const b =
                      typeof proc.brandId === 'object' && proc.brandId
                        ? proc.brandId
                        : brands.find(brand => brand._id === proc.brandId);
                    return (
                      <th
                        key={proc._id}
                        className="px-2 py-2 text-center min-w-[110px] border-r border-slate-200"
                        title={`${b?.name} - ${proc.name}`}
                      >
                        <div className="text-[10px] font-bold text-slate-900 truncate">
                          {b?.name}
                        </div>
                        <div className="text-[9px] text-slate-500 font-normal truncate">
                          {proc.name}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                  <tr key={emp._id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 sticky left-0 bg-white font-medium text-slate-900 z-10 border-r border-slate-200 truncate">
                      {emp.name}
                    </td>
                    {processes.map(proc => {
                      const asgn = assignmentMap.get(`${emp._id}_${proc._id}`);
                      const isAssigned = Boolean(asgn);

                      return (
                        <td
                          key={proc._id}
                          onClick={() => toggleAssignmentCell(emp._id, proc._id)}
                          className={`px-2 py-1.5 text-center border-r border-slate-100 cursor-pointer transition select-none ${
                            isAssigned
                              ? 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold'
                              : 'hover:bg-slate-100 text-slate-300'
                          }`}
                        >
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold shadow-xs">
                              {asgn?.allocationPercent || 100}%
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Process</th>
                <th className="px-4 py-3">Role Type</th>
                <th className="px-4 py-3">Allocation</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map(a => {
                const emp =
                  typeof a.employeeId === 'object' && a.employeeId
                    ? a.employeeId
                    : employees.find(e => e._id === a.employeeId);
                const proc =
                  typeof a.processId === 'object' && a.processId
                    ? a.processId
                    : processes.find(p => p._id === a.processId);
                const brand =
                  proc && typeof proc.brandId === 'object' && proc.brandId
                    ? proc.brandId
                    : brands.find(b => b._id === proc?.brandId);

                return (
                  <tr key={a._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">{emp?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{brand?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-slate-600">{proc?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          a.isPrimary ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.isPrimary ? 'Primary' : 'Secondary'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {a.allocationPercent || 100}%
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteMutation.mutate(a._id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

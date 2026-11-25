import React, { useState } from 'react';
import { Employee, RosterEntry, EntryStatus } from '../../types/index.js';
import { X, Check, Lock, AlertCircle } from 'lucide-react';

interface CellEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  date: string;
  currentEntry?: RosterEntry;
  onSave: (status: EntryStatus, locked: boolean) => Promise<any>;
}

export const CellEditModal: React.FC<CellEditModalProps> = ({
  isOpen,
  onClose,
  employee,
  date,
  currentEntry,
  onSave,
}) => {
  if (!isOpen || !employee) return null;

  const [selectedStatus, setSelectedStatus] = useState<EntryStatus>(
    currentEntry?.status || 'WORK'
  );
  const [isLocked, setIsLocked] = useState<boolean>(currentEntry?.locked ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [deltaResult, setDeltaResult] = useState<{
    newIssues: any[];
    resolvedIssues: any[];
  } | null>(null);

  const statuses: { id: EntryStatus; label: string; desc: string }[] = [
    { id: 'WORK', label: 'WORK (Shift)', desc: 'Employee is on duty and fulfills process demand.' },
    { id: 'WEEKLY_OFF', label: 'WEEKLY OFF', desc: 'Rest day. Counts toward required weekly offs.' },
    { id: 'HOLIDAY', label: 'PUBLIC HOLIDAY', desc: 'Closed public holiday rest.' },
    { id: 'LEAVE', label: 'PLANNED LEAVE', desc: 'Approved personal or sick leave.' },
    { id: 'COMP_OFF', label: 'COMP-OFF', desc: 'Accrued compensatory rest day.' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await onSave(selectedStatus, isLocked);
      if (res?.delta) {
        setDeltaResult(res.delta);
      } else {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Edit Shift Entry</h3>
            <p className="text-xs text-slate-500">
              {employee.name} · <span className="font-mono font-medium">{date}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
              Select Shift Status
            </label>
            <div className="space-y-1.5">
              {statuses.map(st => (
                <label
                  key={st.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedStatus === st.id
                      ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="shiftStatus"
                    value={st.id}
                    checked={selectedStatus === st.id}
                    onChange={() => setSelectedStatus(st.id)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{st.label}</span>
                    <span className="text-[11px] text-slate-500 leading-tight block">{st.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Lock Entry</span>
                <span className="text-[10px] text-slate-500 block">
                  Prevents auto-scheduler from overwriting this manual change
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isLocked}
              onChange={e => setIsLocked(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
          </div>

          {/* Validation Delta feedback if available */}
          {deltaResult && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-indigo-900 block">Validation Impact Delta:</span>
              <p className="text-emerald-700">
                ✓ {deltaResult.resolvedIssues.length} conflict(s) resolved.
              </p>
              {deltaResult.newIssues.length > 0 && (
                <p className="text-rose-700 font-semibold">
                  ⚠ {deltaResult.newIssues.length} new conflict(s) introduced!
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            {deltaResult ? 'Done' : 'Cancel'}
          </button>
          {!deltaResult && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSaving ? 'Validating...' : 'Apply & Validate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

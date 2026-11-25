import React, { useState } from 'react';
import { ValidationIssue } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  mandatoryIssues: ValidationIssue[];
  warnings: ValidationIssue[];
  onConfirmPublish: (overrideReason?: string) => Promise<void>;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  mandatoryIssues,
  warnings,
  onConfirmPublish,
}) => {
  if (!isOpen) return null;

  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const hasMandatory = mandatoryIssues.length > 0;

  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmPublish(hasMandatory ? overrideReason : undefined);
      onClose();
    } catch (err: any) {
      alert(`Publishing failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasMandatory ? (
              <ShieldAlert className="w-5 h-5 text-red-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            )}
            <h3 className="font-bold text-slate-900 text-sm">Publish Operational Roster</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {hasMandatory ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-900 text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Publishing Blocked: {mandatoryIssues.length} Mandatory Conflict(s)</span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  A roster with unresolved mandatory conflicts cannot be published silently.
                  Process demand minimums or maximum work limits are currently violated.
                </p>
              </div>

              {isManager ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Manager Override Justification (Required to override):
                  </label>
                  <textarea
                    rows={3}
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="Provide operational reason (e.g., Client requested reduced coverage; temporary vendor backup arranged off-system)..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    This override reason will be permanently archived in the compliance Audit Log.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600">
                  🔒 Only an <strong>Operations Manager</strong> can authorize publishing with an override reason.
                  Please switch to the Manager persona or resolve the conflicts first.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900 text-xs block">
                  ✓ Ready for Publishing
                </span>
                <p className="text-xs text-emerald-800">
                  Zero mandatory conflicts! All processes have required coverage and all employee rest rules are satisfied.
                </p>
              </div>

              {warnings.length > 0 && (
                <p className="text-xs text-amber-700 font-medium">
                  Note: {warnings.length} soft preference warning(s) exist (e.g. non-preferred off days), but these do not block publishing.
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
            Cancel
          </button>

          <button
            onClick={handlePublish}
            disabled={isSubmitting || (hasMandatory && (!isManager || !overrideReason.trim()))}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-lg transition shadow-xs disabled:opacity-50 ${
              hasMandatory ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting
              ? 'Publishing...'
              : hasMandatory
              ? 'Authorize Override & Publish'
              : 'Publish Official Roster'}
          </button>
        </div>
      </div>
    </div>
  );
};

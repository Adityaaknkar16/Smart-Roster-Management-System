import React, { useState } from 'react';
import { Employee, BackupSuggestion, LeaveImpactResult } from '../../types/index.js';
import { apiRequest } from '../../api/client.js';
import { X, Sparkles, Check, AlertTriangle, ArrowRight, ShieldCheck, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosterId: string;
  employees: Employee[];
  onSuggestionApplied: () => void;
}

export const ImpactModal: React.FC<ImpactModalProps> = ({
  isOpen,
  onClose,
  rosterId,
  employees,
  onSuggestionApplied,
}) => {
  if (!isOpen) return null;

  // Default to Riya Sharma (demo sole resource) or first employee
  const riya = employees.find(e => e.email.includes('riya')) || employees[0];

  const [selectedEmpId, setSelectedEmpId] = useState<string>(riya?._id || '');
  const [startDate, setStartDate] = useState('2026-07-12');
  const [endDate, setEndDate] = useState('2026-07-12');
  const [leaveType, setLeaveType] = useState<'planned' | 'comp_off' | 'sick'>('planned');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [impactData, setImpactData] = useState<{
    impact: LeaveImpactResult;
    suggestionsByGap: Record<string, BackupSuggestion[]>;
  } | null>(null);

  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setAppliedSuccess(null);
    try {
      const result = await apiRequest(`/rosters/${rosterId}/impact`, {
        method: 'POST',
        body: JSON.stringify({
          leave: {
            employeeId: selectedEmpId,
            startDate,
            endDate,
            type: leaveType,
          },
        }),
      });
      setImpactData(result);
    } catch (err: any) {
      setErrorMessage(`Impact analysis failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = async (suggestion: BackupSuggestion) => {
    setIsApplying(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/rosters/${rosterId}/apply-suggestion`, {
        method: 'POST',
        body: JSON.stringify({ suggestion }),
      });
      setAppliedSuccess(
        `Applied: ${suggestion.tradeOffSummary} Roster re-validated with zero deficits.`
      );
      onSuggestionApplied();
      // Re-run analysis to show resolved state
      await runAnalysis();
    } catch (err: any) {
      setErrorMessage(`Failed to apply backup fix: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Change Impact Analysis &amp; Backup Recommender
              </h3>
              <p className="text-xs text-slate-500">
                Simulate employee leaves, inspect multi-brand coverage deficits, and rank trade-off solutions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Leave parameters selector */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Simulate / Select Leave Scenario:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmpId(riya?._id || '');
                  setStartDate('2026-07-12');
                  setEndDate('2026-07-12');
                  setLeaveType('planned');
                }}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-amber-100/60 px-2.5 py-1 rounded-md border border-amber-300"
              >
                <Sparkles className="w-3.5 h-3.5" /> Preset: Riya Sharma (Demo Sole Resource)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Employee</label>
                <select
                  value={selectedEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 font-medium"
                >
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {isLoading ? 'Analyzing...' : 'Run Impact Analysis'}
                </button>
              </div>
            </div>
          </div>

          {appliedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-emerald-900 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{appliedSuccess}</span>
            </div>
          )}

          {/* Analysis Results */}
          {impactData && (
            <div className="space-y-6">
              {/* Impact Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Affected Brands</span>
                  <span className="text-base font-bold text-slate-900">
                    {impactData.impact.affectedBrands.map(b => b.name).join(', ') || 'None'}
                  </span>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="text-xs text-red-600 font-semibold block">Coverage Deficits</span>
                  <span className="text-base font-bold text-red-800">
                    {impactData.impact.coverageGaps.length} process gap(s)
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-xs text-indigo-600 font-semibold block">New Total Issues</span>
                  <span className="text-base font-bold text-indigo-900">
                    {impactData.impact.newIssues.length} issue(s)
                  </span>
                </div>
              </div>

              {/* Coverage Gaps & Ranked Backups */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Coverage Gaps &amp; Ranked Backup Recommender
                </h4>

                {impactData.impact.coverageGaps.length === 0 ? (
                  <div className="p-6 text-center text-slate-600 text-xs bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No coverage deficits detected for this absence. Process minimums are safely met by remaining staff.</span>
                  </div>
                ) : (
                  impactData.impact.coverageGaps.map(gap => {
                    const gapKey = `${gap.processId}_${gap.date}`;
                    const recs = impactData.suggestionsByGap[gapKey] || [];

                    return (
                      <div
                        key={gapKey}
                        className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {gap.brandName} - {gap.processName}
                              </span>
                              {gap.isSoleResource && (
                                <span className="text-[10px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded">
                                  Sole Resource Absence
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Date: <span className="font-mono font-medium text-slate-800">{gap.date}</span> | Deficit:{' '}
                              <strong className="text-red-700">{gap.deficit} staff</strong> ({gap.currentWorkingStaff} of {gap.requiredStaff} required)
                            </p>
                          </div>
                        </div>

                        {/* Ranked suggestions */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Ranked Candidate Solutions:
                          </span>

                          {recs.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No eligible backups found for this date.</p>
                          ) : (
                            recs.map((rec, rIdx) => (
                              <div
                                key={rIdx}
                                className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                                  rIdx === 0
                                    ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-500/20'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">
                                      #{rIdx + 1} {rec.candidateEmployeeName}
                                    </span>
                                    {rec.samePod && (
                                      <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                        Same Pod
                                      </span>
                                    )}
                                    <span className="text-[9px] font-bold uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                      {rec.actionType.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 font-medium">
                                    {rec.tradeOffSummary}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => applySuggestion(rec)}
                                  disabled={isApplying}
                                  className="self-end sm:self-center flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-xs disabled:opacity-50 shrink-0"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Apply Suggestion</span>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

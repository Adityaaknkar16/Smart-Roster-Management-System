import React, { useState } from 'react';
import { ValidationIssue } from '../../types/index.js';
import { AlertCircle, AlertTriangle, CheckCircle2, Filter, Sparkles, ArrowRight } from 'lucide-react';

interface IssuesPanelProps {
  issues: ValidationIssue[];
  onSelectIssue?: (issue: ValidationIssue) => void;
  onOpenImpactModal?: () => void;
}

export const IssuesPanel: React.FC<IssuesPanelProps> = ({
  issues,
  onSelectIssue,
  onOpenImpactModal,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'MANDATORY' | 'WARNING'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const mandatoryCount = issues.filter(i => i.severity === 'MANDATORY').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;

  const filteredIssues = issues.filter(issue => {
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        issue.message.toLowerCase().includes(q) ||
        issue.brandName?.toLowerCase().includes(q) ||
        issue.processName?.toLowerCase().includes(q) ||
        issue.employeeName?.toLowerCase().includes(q) ||
        issue.date.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full max-h-[700px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-600" />
            Active Conflicts & Alerts
          </h3>
          <p className="text-xs text-slate-500">Live constraint validation results</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-1 text-xs rounded-full font-bold transition ${
              severityFilter === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({issues.length})
          </button>
          <button
            onClick={() => setSeverityFilter('MANDATORY')}
            className={`px-2.5 py-1 text-xs rounded-full font-bold transition ${
              severityFilter === 'MANDATORY'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            Mandatory ({mandatoryCount})
          </button>
          <button
            onClick={() => setSeverityFilter('WARNING')}
            className={`px-2.5 py-1 text-xs rounded-full font-bold transition ${
              severityFilter === 'WARNING'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Warnings ({warningCount})
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
        <input
          type="text"
          placeholder="Filter by brand, process, employee, date..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-slate-700">No conflicts in this category</p>
            <p>All constraints and operating minimums are satisfied.</p>
          </div>
        ) : (
          filteredIssues.map(issue => {
            const isMandatory = issue.severity === 'MANDATORY';

            return (
              <div
                key={issue.id}
                onClick={() => onSelectIssue?.(issue)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition shadow-2xs hover:shadow-sm ${
                  isMandatory
                    ? 'border-red-200 bg-red-50/40 hover:bg-red-50/80 hover:border-red-300'
                    : 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/70 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        isMandatory ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">
                      {issue.date}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400">
                    {issue.type.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="font-medium text-slate-900 leading-relaxed mb-2">
                  {issue.message}
                </p>

                {issue.suggestedActions?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Suggested Fixes:
                    </span>
                    {issue.suggestedActions.map((act, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                        <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Action for Demo */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Demo: Test backup engine for sole resource leave
        </span>
        <button
          onClick={onOpenImpactModal}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          <span>Run Impact Recommender</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

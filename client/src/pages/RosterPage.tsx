import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client.js';
import {
  Roster,
  RosterEntry,
  Employee,
  Pod,
  Brand,
  Process,
  Assignment,
  Holiday,
  ValidationIssue,
  EntryStatus,
} from '../types/index.js';
import { CompanyView } from '../components/roster/CompanyView.js';
import { PodView } from '../components/roster/PodView.js';
import { BrandView } from '../components/roster/BrandView.js';
import { ProcessView } from '../components/roster/ProcessView.js';
import { EmployeeView } from '../components/roster/EmployeeView.js';
import { IssuesPanel } from '../components/roster/IssuesPanel.js';
import { CellEditModal } from '../components/roster/CellEditModal.js';
import { ImpactModal } from '../components/roster/ImpactModal.js';
import { PublishModal } from '../components/roster/PublishModal.js';
import {
  CalendarDays,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  Send,
  RotateCcw,
  Users,
  Building2,
  Sliders,
  User,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const RosterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.role === 'manager' || user?.role === 'pod_lead';

  const [selectedMonth, setSelectedMonth] = useState<number>(7);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<
    'company' | 'pod' | 'brand' | 'process' | 'employee'
  >('company');

  // Modals state
  const [editingCell, setEditingCell] = useState<{
    employee: Employee | null;
    date: string;
    entry?: RosterEntry;
  } | null>(null);

  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [highlightedIssue, setHighlightedIssue] = useState<ValidationIssue | null>(null);

  // Filters
  const [podFilter, setPodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all rosters
  const { data: rosters = [], isLoading: isRostersLoading } = useQuery<Roster[]>({
    queryKey: ['rosters'],
    queryFn: () => apiRequest('/rosters'),
  });

  // Find active roster for current month/year
  const activeRoster =
    rosters.find(r => r.month === selectedMonth && r.year === selectedYear) || rosters[0];

  const activeRosterId = activeRoster?._id;

  // Fetch roster details
  const { data: rosterDetails, isLoading: isDetailsLoading } = useQuery<{
    roster: Roster;
    entries: RosterEntry[];
    issues: ValidationIssue[];
    summary: { total: number; mandatory: number; warnings: number };
  }>({
    queryKey: ['roster', activeRosterId],
    queryFn: () => apiRequest(`/rosters/${activeRosterId}`),
    enabled: Boolean(activeRosterId),
  });

  // Supporting entities
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiRequest('/employees'),
  });

  const { data: pods = [] } = useQuery<Pod[]>({
    queryKey: ['pods'],
    queryFn: () => apiRequest('/pods'),
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => apiRequest('/brands'),
  });

  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: () => apiRequest('/processes'),
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => apiRequest('/assignments'),
  });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: () => apiRequest('/holidays'),
  });

  // Generate Roster Mutation
  const generateMutation = useMutation({
    mutationFn: () =>
      apiRequest('/rosters/generate', {
        method: 'POST',
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          keepManualEntries: true,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });

  // Regenerate Weeks Mutation
  const regenerateWeeksMutation = useMutation({
    mutationFn: (weekNumbers: number[]) =>
      apiRequest(`/rosters/${activeRosterId}/regenerate-weeks`, {
        method: 'POST',
        body: JSON.stringify({ weekNumbers }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster'] });
    },
  });

  // Edit Entry Mutation
  const handleSaveEntry = async (status: EntryStatus, locked: boolean) => {
    if (!editingCell || !activeRosterId) return;
    const res = await apiRequest(`/rosters/${activeRosterId}/entries`, {
      method: 'PATCH',
      body: JSON.stringify({
        entries: [
          {
            employeeId: editingCell.employee?._id,
            date: editingCell.date,
            status,
            locked,
          },
        ],
      }),
    });
    queryClient.invalidateQueries({ queryKey: ['roster'] });
    return res;
  };

  // Publish Mutation
  const handlePublish = async (overrideReason?: string) => {
    if (!activeRosterId) return;
    await apiRequest(`/rosters/${activeRosterId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ overrideReason }),
    });
    queryClient.invalidateQueries({ queryKey: ['rosters'] });
    queryClient.invalidateQueries({ queryKey: ['roster'] });
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!activeRosterId) return;
    window.open(`/api/rosters/${activeRosterId}/export`, '_blank');
  };

  // Generate dates array for selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(selectedMonth).padStart(2, '0');
    dates.push(`${selectedYear}-${monthStr}-${dayStr}`);
  }

  const entries = rosterDetails?.entries || [];
  const issues = rosterDetails?.issues || [];
  const mandatoryCount = issues.filter(i => i.severity === 'MANDATORY').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
            >
              {[
                { m: 1, name: 'January' },
                { m: 2, name: 'February' },
                { m: 3, name: 'March' },
                { m: 4, name: 'April' },
                { m: 5, name: 'May' },
                { m: 6, name: 'June' },
                { m: 7, name: 'July' },
                { m: 8, name: 'August' },
                { m: 9, name: 'September' },
                { m: 10, name: 'October' },
                { m: 11, name: 'November' },
                { m: 12, name: 'December' },
              ].map(item => (
                <option key={item.m} value={item.m}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Status badge */}
          {activeRoster && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span
                className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  activeRoster.status === 'published'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeRoster.status === 'published' ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                />
                {activeRoster.status} (v{activeRoster.version})
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generateMutation.isPending ? 'Generating...' : 'Generate Roster'}
            </button>
          )}

          <button
            onClick={() => setIsImpactModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Impact &amp; Backup Recommender
          </button>

          {canManage && activeRoster && (
            <button
              onClick={() => setIsPublishModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Publish
            </button>
          )}

          {activeRoster && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Staff</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {employees.length}
          </span>
          <span className="text-[11px] text-slate-400">Across 6 operational pods</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">D2C Brands Managed</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {brands.length}
          </span>
          <span className="text-[11px] text-slate-400">
            {processes.length} active process schedules
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-red-600 block">Mandatory Conflicts</span>
          <span className="text-2xl font-black text-red-600 mt-1 block">
            {mandatoryCount}
          </span>
          <span className="text-[11px] text-red-500 font-medium">
            {mandatoryCount > 0 ? 'Blocks publishing without override' : 'All mandatory rules pass'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 block">Preference Warnings</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {warningCount}
          </span>
          <span className="text-[11px] text-amber-500 font-medium">Soft preferences &amp; capacity</span>
        </div>
      </div>

      {/* Main Roster Grid and Views Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left 3 columns: Tab selector and Active View */}
        <div className="xl:col-span-3 space-y-4">
          {/* View Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'company', label: 'Company (Grid)', icon: LayoutGrid },
                { id: 'pod', label: 'Pod View', icon: Users },
                { id: 'brand', label: 'Brand Coverage', icon: Building2 },
                { id: 'process', label: 'Process Demand', icon: Sliders },
                { id: 'employee', label: 'Individual Calendar', icon: User },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Pod Filter for Company & Pod views */}
            {activeTab === 'company' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Filter Pod:</span>
                <select
                  value={podFilter}
                  onChange={e => setPodFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">All Pods</option>
                  {pods.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active View Component */}
          {activeTab === 'company' && (
            <CompanyView
              dates={dates}
              entries={entries}
              employees={employees}
              pods={pods}
              issues={issues}
              selectedPodFilter={podFilter}
              searchQuery={searchQuery}
              highlightedIssue={highlightedIssue}
              onSelectCell={(emp, date, cur) =>
                setEditingCell({ employee: emp, date, entry: cur })
              }
            />
          )}

          {activeTab === 'pod' && (
            <PodView
              dates={dates}
              entries={entries}
              employees={employees}
              pods={pods}
              issues={issues}
              selectedPodId={podFilter}
              onSelectCell={(emp, date, cur) =>
                setEditingCell({ employee: emp, date, entry: cur })
              }
            />
          )}

          {activeTab === 'brand' && (
            <BrandView
              dates={dates}
              brands={brands}
              processes={processes}
              assignments={assignments}
              entries={entries}
              holidays={holidays}
            />
          )}

          {activeTab === 'process' && (
            <ProcessView
              dates={dates}
              processes={processes}
              brands={brands}
              assignments={assignments}
              entries={entries}
              holidays={holidays}
            />
          )}

          {activeTab === 'employee' && (
            <EmployeeView
              dates={dates}
              employees={employees}
              entries={entries}
              assignments={assignments}
              processes={processes}
              brands={brands}
              issues={issues}
              initialEmployeeId={highlightedIssue?.employeeId}
            />
          )}
        </div>

        {/* Right column: Issues and Conflicts Panel */}
        <div className="xl:col-span-1">
          <IssuesPanel
            issues={issues}
            onSelectIssue={issue => {
              setHighlightedIssue(issue);
              if (issue.employeeId) {
                // If on employee view, switch to this employee
                if (activeTab === 'employee') {
                  // already highlights
                } else {
                  // jump to company view to highlight cell
                  setActiveTab('company');
                }
              }
            }}
            onOpenImpactModal={() => setIsImpactModalOpen(true)}
          />
        </div>
      </div>

      {/* Modals */}
      {editingCell && (
        <CellEditModal
          isOpen={Boolean(editingCell)}
          onClose={() => setEditingCell(null)}
          employee={editingCell.employee}
          date={editingCell.date}
          currentEntry={editingCell.entry}
          onSave={handleSaveEntry}
        />
      )}

      {isImpactModalOpen && (
        <ImpactModal
          isOpen={isImpactModalOpen}
          onClose={() => setIsImpactModalOpen(false)}
          rosterId={activeRosterId || ''}
          employees={employees}
          onSuggestionApplied={() => {
            queryClient.invalidateQueries({ queryKey: ['roster'] });
          }}
        />
      )}

      {isPublishModalOpen && (
        <PublishModal
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          mandatoryIssues={issues.filter(i => i.severity === 'MANDATORY')}
          warnings={issues.filter(i => i.severity === 'WARNING')}
          onConfirmPublish={handlePublish}
        />
      )}
    </div>
  );
};

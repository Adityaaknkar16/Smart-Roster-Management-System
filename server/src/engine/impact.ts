import {
  IEmployee,
  IProcess,
  IBrand,
  IAssignment,
  IHoliday,
  ILeave,
  IRosterEntry,
  ValidationIssue,
} from '../types/index.js';
import { DemandMap, computeProcessDemand } from './demand.js';
import { validateRoster } from './validator.js';
import { isDateInRange } from './dateUtils.js';

export interface LeaveImpactAnalysisInput {
  dates: string[];
  currentEntries: IRosterEntry[];
  employees: IEmployee[];
  processes: IProcess[];
  brands: IBrand[];
  assignments: IAssignment[];
  holidays: IHoliday[];
  existingApprovedLeaves: ILeave[];
  newLeave: {
    employeeId: string;
    startDate: string;
    endDate: string;
    type: 'planned' | 'comp_off' | 'sick';
  };
}

export interface ImpactedProcessGap {
  date: string;
  brandId: string;
  brandName: string;
  processId: string;
  processName: string;
  requiredStaff: number;
  currentWorkingStaff: number;
  deficit: number;
  absentEmployeeId: string;
  absentEmployeeName: string;
  isSoleResource: boolean;
}

export interface LeaveImpactResult {
  affectedEmployeeId: string;
  affectedEmployeeName: string;
  affectedDates: string[];
  affectedBrands: { id: string; name: string }[];
  coverageGaps: ImpactedProcessGap[];
  newIssues: ValidationIssue[];
}

export function analyzeLeaveImpact(input: LeaveImpactAnalysisInput): LeaveImpactResult {
  const {
    dates,
    currentEntries,
    employees,
    processes,
    brands,
    assignments,
    holidays,
    existingApprovedLeaves,
    newLeave,
  } = input;

  const empId = newLeave.employeeId;
  const emp = employees.find(e => (e.id || e._id || '').toString() === empId);
  const empName = emp?.name || 'Employee';

  const brandMap = new Map<string, IBrand>();
  for (const b of brands) {
    brandMap.set((b.id || b._id || '').toString(), b);
  }

  // Find all processes assigned to this employee
  const assignedProcessIds = assignments
    .filter(a => (a.employeeId || '').toString() === empId)
    .map(a => (a.processId || '').toString());

  const assignedProcesses = processes.filter(p =>
    assignedProcessIds.includes((p.id || p._id || '').toString())
  );

  // Affected brands
  const affectedBrandMap = new Map<string, string>();
  for (const p of assignedProcesses) {
    const bId = (p.brandId || '').toString();
    const brand = brandMap.get(bId);
    if (brand) {
      affectedBrandMap.set(bId, brand.name);
    }
  }

  const affectedBrands = Array.from(affectedBrandMap.entries()).map(([id, name]) => ({ id, name }));

  // Demand
  const demand = computeProcessDemand(dates, processes, holidays);

  // Determine affected dates within roster range
  const affectedDates = dates.filter(d => isDateInRange(d, newLeave.startDate, newLeave.endDate));

  // Clone entries and apply simulated leave
  const simulatedEntries: IRosterEntry[] = currentEntries.map(e => {
    if ((e.employeeId || '').toString() === empId && affectedDates.includes(e.date)) {
      return {
        ...e,
        status: newLeave.type === 'comp_off' ? 'COMP_OFF' : 'LEAVE',
        source: 'manual',
      };
    }
    return { ...e };
  });

  // Calculate process to employees map
  const procEmployees = new Map<string, string[]>();
  for (const p of processes) {
    procEmployees.set((p.id || p._id || '').toString(), []);
  }
  for (const a of assignments) {
    const e = (a.employeeId || '').toString();
    const p = (a.processId || '').toString();
    if (procEmployees.has(p)) {
      procEmployees.get(p)!.push(e);
    }
  }

  const coverageGaps: ImpactedProcessGap[] = [];

  for (const date of affectedDates) {
    for (const p of assignedProcesses) {
      const pId = (p.id || p._id || '').toString();
      const bId = (p.brandId || '').toString();
      const bName = brandMap.get(bId)?.name || 'Unknown';
      const req = demand[pId]?.[date]?.requiredStaff || 0;

      if (req > 0) {
        const pool = procEmployees.get(pId) || [];
        const isSole = pool.length === 1;

        let workingCount = 0;
        for (const poolEmpId of pool) {
          const entry = simulatedEntries.find(
            e => (e.employeeId || '').toString() === poolEmpId && e.date === date
          );
          if (entry?.status === 'WORK') {
            workingCount++;
          }
        }

        if (workingCount < req) {
          coverageGaps.push({
            date,
            brandId: bId,
            brandName: bName,
            processId: pId,
            processName: p.name,
            requiredStaff: req,
            currentWorkingStaff: workingCount,
            deficit: req - workingCount,
            absentEmployeeId: empId,
            absentEmployeeName: empName,
            isSoleResource: isSole,
          });
        }
      }
    }
  }

  // Validate simulated roster
  const simulatedLeaves: ILeave[] = [
    ...existingApprovedLeaves,
    {
      employeeId: empId,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      type: newLeave.type,
      status: 'approved',
    },
  ];

  const newIssues = validateRoster({
    dates,
    entries: simulatedEntries,
    employees,
    processes,
    brands,
    assignments,
    holidays,
    approvedLeaves: simulatedLeaves,
    demandMap: demand,
  });

  return {
    affectedEmployeeId: empId,
    affectedEmployeeName: empName,
    affectedDates,
    affectedBrands,
    coverageGaps,
    newIssues,
  };
}

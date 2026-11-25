import {
  IEmployee,
  IProcess,
  IBrand,
  IAssignment,
  IHoliday,
  ILeave,
  IRosterEntry,
  BackupSuggestion,
} from '../types/index.js';
import { ImpactedProcessGap } from './impact.js';
import { DemandMap, computeProcessDemand } from './demand.js';
import { formatHumanDate, groupDatesByWeek, getWeekNumber, isDateInRange } from './dateUtils.js';

export interface BackupRecommenderInput {
  gap: ImpactedProcessGap;
  dates: string[];
  entries: IRosterEntry[];
  employees: IEmployee[];
  processes: IProcess[];
  brands: IBrand[];
  assignments: IAssignment[];
  holidays: IHoliday[];
  approvedLeaves: ILeave[];
  demandMap?: DemandMap;
}

export function recommendBackups(input: BackupRecommenderInput): BackupSuggestion[] {
  const {
    gap,
    dates,
    entries,
    employees,
    processes,
    brands,
    assignments,
    holidays,
    approvedLeaves,
  } = input;

  const demand = input.demandMap || computeProcessDemand(dates, processes, holidays);

  const absentEmp = employees.find(e => (e.id || e._id || '').toString() === gap.absentEmployeeId);
  const absentPodId = (absentEmp?.podId || '').toString();

  // Fast entry lookup: [empId_date] -> IRosterEntry
  const entryMap = new Map<string, IRosterEntry>();
  for (const e of entries) {
    const empId = (e.employeeId || '').toString();
    entryMap.set(`${empId}_${e.date}`, e);
  }

  // Employee to processes lookup
  const empToProcesses = new Map<string, string[]>();
  for (const e of employees) {
    empToProcesses.set((e.id || e._id || '').toString(), []);
  }
  for (const a of assignments) {
    const eId = (a.employeeId || '').toString();
    const pId = (a.processId || '').toString();
    if (empToProcesses.has(eId)) {
      empToProcesses.get(eId)!.push(pId);
    }
  }

  // Helper: count working staff on a process on a date
  function getProcessWorkingCount(pId: string, date: string): number {
    const assignedEmps = assignments
      .filter(a => (a.processId || '').toString() === pId)
      .map(a => (a.employeeId || '').toString());

    let count = 0;
    for (const eId of assignedEmps) {
      if (entryMap.get(`${eId}_${date}`)?.status === 'WORK') {
        count++;
      }
    }
    return count;
  }

  const suggestions: BackupSuggestion[] = [];
  const targetWeek = getWeekNumber(gap.date);
  const weeks = groupDatesByWeek(dates);
  const targetWeekDates = weeks[targetWeek] || [];

  for (const cand of employees) {
    const candId = (cand.id || cand._id || '').toString();
    if (candId === gap.absentEmployeeId) continue;
    if (!cand.active) continue;

    // Check if candidate is on approved leave on the gap date
    const isOnLeave = approvedLeaves.some(
      l =>
        (l.employeeId || '').toString() === candId &&
        l.status === 'approved' &&
        isDateInRange(gap.date, l.startDate, l.endDate)
    );
    if (isOnLeave) continue;

    const candPodId = (cand.podId || '').toString();
    const samePod = candPodId === absentPodId;
    const candEntry = entryMap.get(`${candId}_${gap.date}`);
    const currentStatus = candEntry?.status || 'WORK';

    const candProcesses = empToProcesses.get(candId) || [];
    const isAlreadyAssigned = candProcesses.includes(gap.processId);

    // CASE 1: Candidate is currently on WEEKLY_OFF on the gap date -> Swap Opportunity!
    if (currentStatus === 'WEEKLY_OFF') {
      let foundSwap = false;

      // Look for a day in targetWeekDates where candidate is 'WORK' and can swap off without causing a deficit
      for (const altDate of targetWeekDates) {
        if (altDate === gap.date) continue;
        const altEntry = entryMap.get(`${candId}_${altDate}`);
        if (altEntry && altEntry.status === 'WORK' && !altEntry.locked) {
          // Check if candidate taking off on altDate causes deficit for candidate's own processes
          let swapCausesDeficit = false;
          for (const pId of candProcesses) {
            const req = demand[pId]?.[altDate]?.requiredStaff || 0;
            const currentWorking = getProcessWorkingCount(pId, altDate);
            if (currentWorking - 1 < req) {
              swapCausesDeficit = true;
              break;
            }
          }

          if (!swapCausesDeficit) {
            let score = 50;
            if (samePod) score += 30;
            if (isAlreadyAssigned) score += 20;

            suggestions.push({
              gapDate: gap.date,
              processId: gap.processId,
              processName: gap.processName,
              brandId: gap.brandId,
              brandName: gap.brandName,
              absentEmployeeId: gap.absentEmployeeId,
              absentEmployeeName: gap.absentEmployeeName,
              candidateEmployeeId: candId,
              candidateEmployeeName: cand.name,
              samePod,
              score,
              actionType: 'SWAP_OFF',
              suggestedOffDate: altDate,
              tradeOffSummary: `Swap ${cand.name}'s off from ${formatHumanDate(
                gap.date
              )} to ${formatHumanDate(
                altDate
              )}; this resolves the gap with zero new deficits.`,
            });
            foundSwap = true;
            break;
          }
        }
      }

      // If no clean swap found, suggest working with comp-off accrual
      if (!foundSwap) {
        let score = 30;
        if (samePod) score += 25;
        if (isAlreadyAssigned) score += 15;

        suggestions.push({
          gapDate: gap.date,
          processId: gap.processId,
          processName: gap.processName,
          brandId: gap.brandId,
          brandName: gap.brandName,
          absentEmployeeId: gap.absentEmployeeId,
          absentEmployeeName: gap.absentEmployeeName,
          candidateEmployeeId: candId,
          candidateEmployeeName: cand.name,
          samePod,
          score,
          actionType: 'OVERTIME_COMP_OFF',
          tradeOffSummary: `${cand.name} works on their weekly off on ${formatHumanDate(
            gap.date
          )} and earns an accrued Comp-Off.`,
        });
      }
    } else if (currentStatus === 'WORK' && !isAlreadyAssigned) {
      // CASE 2: Candidate is working on another process, but has spare capacity or can be cross-utilized
      let score = 20;
      if (samePod) score += 25;

      suggestions.push({
        gapDate: gap.date,
        processId: gap.processId,
        processName: gap.processName,
        brandId: gap.brandId,
        brandName: gap.brandName,
        absentEmployeeId: gap.absentEmployeeId,
        absentEmployeeName: gap.absentEmployeeName,
        candidateEmployeeId: candId,
        candidateEmployeeName: cand.name,
        samePod,
        score,
        actionType: 'ASSIGN_WORK',
        tradeOffSummary: `Cross-assign ${cand.name} (${samePod ? 'Same Pod' : 'Cross-Pod'}) to cover ${gap.processName} on ${formatHumanDate(gap.date)}.`,
      });
    }
  }

  // Sort by score descending (highest score first)
  suggestions.sort((a, b) => b.score - a.score);

  return suggestions;
}

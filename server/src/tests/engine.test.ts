import { describe, it, expect } from 'vitest';
import {
  computeProcessDemand,
  computeAvailability,
  generateRoster,
  validateRoster,
  analyzeLeaveImpact,
  recommendBackups,
  getDaysInMonth,
} from '../engine/index.js';
import {
  IEmployee,
  IProcess,
  IBrand,
  IAssignment,
  IHoliday,
  ILeave,
  IRosterEntry,
} from '../types/index.js';

describe('Pure Scheduling Engine Test Suite', () => {
  const mockBrand1: IBrand = { id: 'b1', name: 'Zing Support', active: true };
  const mockBrand2: IBrand = { id: 'b2', name: 'Apex D2C', active: true };

  const mockHolidays: IHoliday[] = [
    { id: 'h1', date: '2026-07-15', name: 'National Holiday' },
  ];

  const datesJuly2026 = getDaysInMonth(7, 2026); // 31 days in July 2026

  // -------------------------------------------------------------
  // 1. DEMAND CALCULATION TESTS
  // -------------------------------------------------------------
  describe('1. Demand Calculation', () => {
    it('correctly calculates demand for ALL_365, EXCEPT_HOLIDAYS, EXCEPT_SUN_AND_HOLIDAYS, and CUSTOM', () => {
      const processes: IProcess[] = [
        {
          id: 'p_cs',
          brandId: 'b1',
          name: 'Customer Support',
          type: 'CS',
          calendarMode: 'ALL_365',
          minStaffDefault: 2,
        },
        {
          id: 'p_acc',
          brandId: 'b1',
          name: 'Accounts',
          type: 'ACC',
          calendarMode: 'EXCEPT_HOLIDAYS',
          minStaffDefault: 1,
        },
        {
          id: 'p_ndr',
          brandId: 'b2',
          name: 'NDR Process',
          type: 'NDR',
          calendarMode: 'EXCEPT_SUN_AND_HOLIDAYS',
          minStaffDefault: 1,
        },
        {
          id: 'p_custom',
          brandId: 'b2',
          name: 'Retention Special',
          type: 'Retention',
          calendarMode: 'CUSTOM',
          customClosedWeekdays: [6], // Closed on Saturday
          minStaffDefault: 1,
        },
      ];

      const demand = computeProcessDemand(datesJuly2026, processes, mockHolidays);

      // On 2026-07-15 (Holiday, Wednesday):
      // p_cs (ALL_365) should be OPEN with 2 staff
      expect(demand['p_cs']['2026-07-15'].isOpen).toBe(true);
      expect(demand['p_cs']['2026-07-15'].requiredStaff).toBe(2);

      // p_acc (EXCEPT_HOLIDAYS) should be CLOSED (0 staff)
      expect(demand['p_acc']['2026-07-15'].isOpen).toBe(false);
      expect(demand['p_acc']['2026-07-15'].requiredStaff).toBe(0);

      // p_ndr (EXCEPT_SUN_AND_HOLIDAYS) on Sunday 2026-07-05 should be CLOSED
      expect(demand['p_ndr']['2026-07-05'].isOpen).toBe(false);
      expect(demand['p_ndr']['2026-07-05'].requiredStaff).toBe(0);

      // p_ndr on non-holiday weekday (2026-07-06 Monday) should be OPEN
      expect(demand['p_ndr']['2026-07-06'].isOpen).toBe(true);
      expect(demand['p_ndr']['2026-07-06'].requiredStaff).toBe(1);

      // p_custom on Saturday (2026-07-04) should be CLOSED
      expect(demand['p_custom']['2026-07-04'].isOpen).toBe(false);
      expect(demand['p_custom']['2026-07-04'].requiredStaff).toBe(0);
    });

    it('honours explicit dateOverrides over default weekday logic', () => {
      const process: IProcess = {
        id: 'p_override',
        brandId: 'b1',
        name: 'Flash Sale Support',
        type: 'CS',
        calendarMode: 'EXCEPT_HOLIDAYS',
        minStaffDefault: 1,
        dateOverrides: [
          { date: '2026-07-15', minStaff: 5 }, // Open on holiday with 5 staff!
        ],
      };

      const demand = computeProcessDemand(datesJuly2026, [process], mockHolidays);
      expect(demand['p_override']['2026-07-15'].requiredStaff).toBe(5);
      expect(demand['p_override']['2026-07-15'].isOpen).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 2. SOLE-RESOURCE COVERAGE TESTS
  // -------------------------------------------------------------
  describe('2. Sole-Resource Coverage & Conflict Detection', () => {
    it('detects MANDATORY SOLE_RESOURCE_UNAVAILABLE when only assigned employee is off on an open day', () => {
      const soleEmp: IEmployee = {
        id: 'emp_riya',
        name: 'Riya Sharma',
        email: 'riya@zing.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      const ndrProcess: IProcess = {
        id: 'proc_ndr',
        brandId: 'b1',
        name: 'NDR',
        type: 'NDR',
        calendarMode: 'ALL_365',
        minStaffDefault: 1,
      };

      const assignment: IAssignment = {
        id: 'asgn1',
        employeeId: 'emp_riya',
        processId: 'proc_ndr',
        isPrimary: true,
        allocationPercent: 100,
      };

      // Create entries where Riya is on WEEKLY_OFF on 2026-07-12
      const entries: IRosterEntry[] = datesJuly2026.map(d => ({
        rosterId: 'r1',
        employeeId: 'emp_riya',
        date: d,
        status: d === '2026-07-12' ? 'WEEKLY_OFF' : 'WORK',
        source: 'manual',
        locked: false,
      }));

      const issues = validateRoster({
        dates: datesJuly2026,
        entries,
        employees: [soleEmp],
        processes: [ndrProcess],
        brands: [mockBrand1],
        assignments: [assignment],
        holidays: mockHolidays,
        approvedLeaves: [],
      });

      const soleIssue = issues.find(i => i.type === 'SOLE_RESOURCE_UNAVAILABLE');
      expect(soleIssue).toBeDefined();
      expect(soleIssue?.severity).toBe('MANDATORY');
      expect(soleIssue?.date).toBe('2026-07-12');
      expect(soleIssue?.employeeId).toBe('emp_riya');
      expect(soleIssue?.message).toContain('Brand Zing Support, NDR: 0 of 1 required staff');
      expect(soleIssue?.message).toContain('Riya Sharma is on weekly off');
    });
  });

  // -------------------------------------------------------------
  // 3. WEEKLY-OFF FAIRNESS & CONSTRAINTS TESTS
  // -------------------------------------------------------------
  describe('3. Weekly-Off Assignment, Limits, and Fairness', () => {
    it('enforces maxConsecutiveWorkDays and flags MAX_CONSECUTIVE_DAYS if exceeded', () => {
      const emp: IEmployee = {
        id: 'emp_aman',
        name: 'Aman Verma',
        email: 'aman@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      // Assign 8 consecutive work days without an off
      const entries: IRosterEntry[] = datesJuly2026.map((d, index) => ({
        rosterId: 'r1',
        employeeId: 'emp_aman',
        date: d,
        status: index < 8 ? 'WORK' : 'WEEKLY_OFF',
        source: 'manual',
        locked: false,
      }));

      const issues = validateRoster({
        dates: datesJuly2026,
        entries,
        employees: [emp],
        processes: [],
        brands: [],
        assignments: [],
        holidays: [],
        approvedLeaves: [],
      });

      const consecutiveIssue = issues.find(i => i.type === 'MAX_CONSECUTIVE_DAYS');
      expect(consecutiveIssue).toBeDefined();
      expect(consecutiveIssue?.severity).toBe('MANDATORY');
      expect(consecutiveIssue?.message).toContain('Aman Verma is scheduled to work 7 consecutive days');
    });

    it('scheduler automatically distributes weekly offs without violating consecutive work days', () => {
      const emps: IEmployee[] = [
        {
          id: 'emp1',
          name: 'Agent 1',
          email: 'a1@test.com',
          role: 'viewer',
          active: true,
          preferences: { preferredWeeklyOffs: [0], avoidDays: [] },
          maxConsecutiveWorkDays: 6,
          weeklyOffsPerWeek: 1,
        },
        {
          id: 'emp2',
          name: 'Agent 2',
          email: 'a2@test.com',
          role: 'viewer',
          active: true,
          preferences: { preferredWeeklyOffs: [6], avoidDays: [] },
          maxConsecutiveWorkDays: 6,
          weeklyOffsPerWeek: 1,
        },
      ];

      const csProcess: IProcess = {
        id: 'p_shared',
        brandId: 'b1',
        name: '24/7 CS',
        type: 'CS',
        calendarMode: 'ALL_365',
        minStaffDefault: 1,
      };

      const assignments: IAssignment[] = [
        { id: 'as1', employeeId: 'emp1', processId: 'p_shared', isPrimary: true, allocationPercent: 100 },
        { id: 'as2', employeeId: 'emp2', processId: 'p_shared', isPrimary: true, allocationPercent: 100 },
      ];

      const result = generateRoster({
        month: 7,
        year: 2026,
        employees: emps,
        processes: [csProcess],
        brands: [mockBrand1],
        assignments,
        holidays: [],
        approvedLeaves: [],
      });

      // Roster must have zero mandatory issues
      const mandatoryIssues = result.issues.filter(i => i.severity === 'MANDATORY');
      expect(mandatoryIssues.length).toBe(0);

      // Both employees must have weekly offs in each full week
      const emp1Offs = result.entries.filter(
        e => e.employeeId === 'emp1' && e.status === 'WEEKLY_OFF'
      );
      const emp2Offs = result.entries.filter(
        e => e.employeeId === 'emp2' && e.status === 'WEEKLY_OFF'
      );

      expect(emp1Offs.length).toBeGreaterThanOrEqual(4);
      expect(emp2Offs.length).toBeGreaterThanOrEqual(4);

      // On any day, at least 1 agent must be working
      for (const d of datesJuly2026) {
        const working = result.entries.filter(e => e.date === d && e.status === 'WORK');
        expect(working.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // -------------------------------------------------------------
  // 4. HOLIDAY & COMP-OFF TESTS
  // -------------------------------------------------------------
  describe('4. Holiday Handling & Comp-Off Accrual', () => {
    it('accrues comp-off when an employee works on a public holiday for ALL_365 process', () => {
      const emp: IEmployee = {
        id: 'emp_holiday_worker',
        name: 'Karan Mehra',
        email: 'karan@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [1], avoidDays: [] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      const process365: IProcess = {
        id: 'p_365',
        brandId: 'b1',
        name: 'Emergency CS',
        type: 'CS',
        calendarMode: 'ALL_365',
        minStaffDefault: 1,
      };

      const assignments: IAssignment[] = [
        { id: 'as1', employeeId: 'emp_holiday_worker', processId: 'p_365', isPrimary: true, allocationPercent: 100 },
      ];

      // Lock Karan to WORK on the holiday 2026-07-15
      const lockedEntries: IRosterEntry[] = [
        {
          rosterId: 'r1',
          employeeId: 'emp_holiday_worker',
          date: '2026-07-15',
          status: 'WORK',
          source: 'manual',
          locked: true,
        },
      ];

      const result = generateRoster({
        month: 7,
        year: 2026,
        employees: [emp],
        processes: [process365],
        brands: [mockBrand1],
        assignments,
        holidays: mockHolidays,
        approvedLeaves: [],
        lockedEntries,
      });

      // Should accrue comp-off for working 2026-07-15
      const earned = result.compOffsEarned.find(c => c.earnedDate === '2026-07-15');
      expect(earned).toBeDefined();
      expect(earned?.employeeId).toBe('emp_holiday_worker');
      expect(earned?.reason).toContain('Worked on public holiday: National Holiday');
    });

    it('marks employee as HOLIDAY off when ALL assigned processes are closed on that holiday', () => {
      const emp: IEmployee = {
        id: 'emp_acc',
        name: 'Sneha Roy',
        email: 'sneha@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      const processClosedOnHoliday: IProcess = {
        id: 'p_closed',
        brandId: 'b1',
        name: 'Accounts & Billing',
        type: 'ACC',
        calendarMode: 'EXCEPT_HOLIDAYS',
        minStaffDefault: 1,
      };

      const assignments: IAssignment[] = [
        { id: 'as1', employeeId: 'emp_acc', processId: 'p_closed', isPrimary: true, allocationPercent: 100 },
      ];

      const demand = computeProcessDemand(datesJuly2026, [processClosedOnHoliday], mockHolidays);
      const avail = computeAvailability(
        datesJuly2026,
        [emp],
        assignments,
        demand,
        [],
        mockHolidays
      );

      // On 2026-07-15, Sneha should automatically get forcedStatus: 'HOLIDAY'
      expect(avail['emp_acc']['2026-07-15'].forcedStatus).toBe('HOLIDAY');
      expect(avail['emp_acc']['2026-07-15'].isAvailableForWork).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 5. LEAVE CONFLICT DETECTION
  // -------------------------------------------------------------
  describe('5. Leave Conflict Detection', () => {
    it('flags MANDATORY LEAVE_CONFLICT if employee has status WORK on approved leave date', () => {
      const emp: IEmployee = {
        id: 'emp_leave_test',
        name: 'Arjun Das',
        email: 'arjun@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      const approvedLeaves: ILeave[] = [
        {
          id: 'l1',
          employeeId: 'emp_leave_test',
          startDate: '2026-07-10',
          endDate: '2026-07-12',
          type: 'planned',
          status: 'approved',
        },
      ];

      // Mistakenly scheduled to WORK on 2026-07-11
      const entries: IRosterEntry[] = [
        {
          rosterId: 'r1',
          employeeId: 'emp_leave_test',
          date: '2026-07-11',
          status: 'WORK',
          source: 'manual',
          locked: false,
        },
      ];

      const issues = validateRoster({
        dates: ['2026-07-11'],
        entries,
        employees: [emp],
        processes: [],
        brands: [],
        assignments: [],
        holidays: [],
        approvedLeaves,
      });

      const leaveConflict = issues.find(i => i.type === 'LEAVE_CONFLICT');
      expect(leaveConflict).toBeDefined();
      expect(leaveConflict?.severity).toBe('MANDATORY');
      expect(leaveConflict?.message).toContain('Arjun Das is scheduled to WORK on Sat, Jul 11 while having an approved planned leave');
    });
  });

  // -------------------------------------------------------------
  // 6. THE REPAIR PASS TEST
  // -------------------------------------------------------------
  describe('6. The Repair Pass', () => {
    it('swaps off days between team members when initial greedy choice would cause a deficit', () => {
      // 2 employees sharing a 1-staff process that runs 7 days a week
      const empA: IEmployee = {
        id: 'empA',
        name: 'Agent Alpha',
        email: 'alpha@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [] }, // both want Sunday
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };
      const empB: IEmployee = {
        id: 'empB',
        name: 'Agent Beta',
        email: 'beta@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [] }, // both want Sunday
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      const process: IProcess = {
        id: 'p_tight',
        brandId: 'b1',
        name: 'Tight Coverage CS',
        type: 'CS',
        calendarMode: 'ALL_365',
        minStaffDefault: 1,
      };

      const assignments: IAssignment[] = [
        { id: 'asA', employeeId: 'empA', processId: 'p_tight', isPrimary: true, allocationPercent: 100 },
        { id: 'asB', employeeId: 'empB', processId: 'p_tight', isPrimary: true, allocationPercent: 100 },
      ];

      const result = generateRoster({
        month: 7,
        year: 2026,
        employees: [empA, empB],
        processes: [process],
        brands: [mockBrand1],
        assignments,
        holidays: [],
        approvedLeaves: [],
      });

      // No zero-staff or deficit issues should exist
      const deficits = result.issues.filter(
        i => i.type === 'ZERO_STAFF' || i.type === 'STAFFING_BELOW_MIN'
      );
      expect(deficits.length).toBe(0);

      // On every day, exactly 1 is working and 1 is off, or both working
      for (const d of datesJuly2026) {
        const working = result.entries.filter(e => e.date === d && e.status === 'WORK');
        expect(working.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // -------------------------------------------------------------
  // 7. MULTI-PROCESS OVERLOAD TEST
  // -------------------------------------------------------------
  describe('7. Multi-Process Overload', () => {
    it('flags MANDATORY PROCESS_OVERLOAD when an employee is assigned to more than max allowed processes on the same day', () => {
      const busyEmp: IEmployee = {
        id: 'emp_busy',
        name: 'Busy Bee',
        email: 'busy@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      // 4 active processes on same brand
      const procs: IProcess[] = [1, 2, 3, 4].map(n => ({
        id: `proc_${n}`,
        brandId: 'b1',
        name: `Process ${n}`,
        type: 'CS',
        calendarMode: 'ALL_365',
        minStaffDefault: 1,
      }));

      const assignments: IAssignment[] = [1, 2, 3, 4].map(n => ({
        id: `as_${n}`,
        employeeId: 'emp_busy',
        processId: `proc_${n}`,
        isPrimary: true,
        allocationPercent: 25,
      }));

      const entries: IRosterEntry[] = [
        {
          rosterId: 'r1',
          employeeId: 'emp_busy',
          date: '2026-07-01',
          status: 'WORK',
          source: 'manual',
          locked: false,
        },
      ];

      const issues = validateRoster({
        dates: ['2026-07-01'],
        entries,
        employees: [busyEmp],
        processes: procs,
        brands: [mockBrand1],
        assignments,
        holidays: [],
        approvedLeaves: [],
        maxProcessesPerEmployee: 3, // limit is 3
      });

      const overloadIssue = issues.find(i => i.type === 'PROCESS_OVERLOAD');
      expect(overloadIssue).toBeDefined();
      expect(overloadIssue?.severity).toBe('MANDATORY');
      expect(overloadIssue?.message).toContain('Busy Bee is covering 4 active processes on Wed, Jul 1');
    });
  });

  // -------------------------------------------------------------
  // 8. CHANGE IMPACT ANALYSIS & BACKUP RECOMMENDER
  // -------------------------------------------------------------
  describe('8. Change Impact Analysis & Backup Recommender', () => {
    it('analyzes impact of a new leave and recommends ranked backups with trade-offs', () => {
      const soleEmp: IEmployee = {
        id: 'emp_sole',
        podId: 'pod1',
        name: 'Sole Worker',
        email: 'sole@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [0], avoidDays: [] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      const peerInSamePod: IEmployee = {
        id: 'emp_peer',
        podId: 'pod1',
        name: 'Pod Peer',
        email: 'peer@test.com',
        role: 'viewer',
        active: true,
        preferences: { preferredWeeklyOffs: [2], avoidDays: [] },
        maxConsecutiveWorkDays: 6,
        weeklyOffsPerWeek: 1,
      };

      const brand: IBrand = { id: 'b_unique', name: 'Zing D2C', active: true };
      const proc: IProcess = {
        id: 'p_sole',
        brandId: 'b_unique',
        name: 'NDR Escalations',
        type: 'NDR',
        calendarMode: 'ALL_365',
        minStaffDefault: 1,
      };

      const assignments: IAssignment[] = [
        { id: 'as1', employeeId: 'emp_sole', processId: 'p_sole', isPrimary: true, allocationPercent: 100 },
      ];

      // Both employees working on 2026-07-10, Peer is on WEEKLY_OFF on 2026-07-10
      const currentEntries: IRosterEntry[] = [
        { rosterId: 'r1', employeeId: 'emp_sole', date: '2026-07-10', status: 'WORK', source: 'auto', locked: false },
        { rosterId: 'r1', employeeId: 'emp_peer', date: '2026-07-10', status: 'WEEKLY_OFF', source: 'auto', locked: false },
        { rosterId: 'r1', employeeId: 'emp_peer', date: '2026-07-11', status: 'WORK', source: 'auto', locked: false },
      ];

      // Sole worker takes leave on 2026-07-10
      const impact = analyzeLeaveImpact({
        dates: ['2026-07-10', '2026-07-11'],
        currentEntries,
        employees: [soleEmp, peerInSamePod],
        processes: [proc],
        brands: [brand],
        assignments,
        holidays: [],
        existingApprovedLeaves: [],
        newLeave: {
          employeeId: 'emp_sole',
          startDate: '2026-07-10',
          endDate: '2026-07-10',
          type: 'planned',
        },
      });

      expect(impact.coverageGaps.length).toBe(1);
      const gap = impact.coverageGaps[0];
      expect(gap.brandName).toBe('Zing D2C');
      expect(gap.processName).toBe('NDR Escalations');
      expect(gap.isSoleResource).toBe(true);

      // Recommend backups
      const recommendations = recommendBackups({
        gap,
        dates: ['2026-07-10', '2026-07-11'],
        entries: currentEntries,
        employees: [soleEmp, peerInSamePod],
        processes: [proc],
        brands: [brand],
        assignments,
        holidays: [],
        approvedLeaves: [],
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const topRec = recommendations[0];
      expect(topRec.candidateEmployeeId).toBe('emp_peer');
      expect(topRec.samePod).toBe(true);
      expect(topRec.tradeOffSummary).toContain('Pod Peer');
    });
  });
});

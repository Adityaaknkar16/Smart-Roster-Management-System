export type CalendarMode = 'ALL_365' | 'EXCEPT_HOLIDAYS' | 'EXCEPT_SUN_AND_HOLIDAYS' | 'CUSTOM';
export type ProcessType = 'CS' | 'ACC' | 'Retention' | 'NDR' | 'custom';
export type EntryStatus = 'WORK' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE' | 'COMP_OFF';
export type EntrySource = 'auto' | 'manual';
export type LeaveType = 'planned' | 'comp_off' | 'sick';
export type LeaveStatus = 'requested' | 'approved' | 'rejected';
export type RosterStatus = 'draft' | 'published';
export type UserRole = 'manager' | 'pod_lead' | 'viewer';
export type IssueSeverity = 'MANDATORY' | 'WARNING';

export interface Pod {
  _id: string;
  name: string;
  leadEmployeeId?: any;
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  podId?: any;
  active: boolean;
  preferences: {
    preferredWeeklyOffs: number[];
    avoidDays: number[];
  };
  maxConsecutiveWorkDays: number;
  weeklyOffsPerWeek: number;
}

export interface Brand {
  _id: string;
  name: string;
  podId?: any;
  active: boolean;
}

export interface ProcessDateOverride {
  date: string;
  minStaff: number;
}

export interface Process {
  _id: string;
  brandId: any;
  name: string;
  type: ProcessType;
  calendarMode: CalendarMode;
  customClosedWeekdays?: number[];
  minStaffDefault: number;
  minStaffByWeekday?: Record<number, number>;
  dateOverrides?: ProcessDateOverride[];
}

export interface Assignment {
  _id: string;
  employeeId: any;
  processId: any;
  isPrimary: boolean;
  allocationPercent: number;
}

export interface Holiday {
  _id: string;
  date: string;
  name: string;
  region: string;
}

export interface Leave {
  _id: string;
  employeeId: any;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveStatus;
}

export interface Roster {
  _id: string;
  month: number;
  year: number;
  status: RosterStatus;
  version: number;
  generatedAt: string;
  lockedBy?: any;
  publishOverrideReason?: string;
}

export interface RosterEntry {
  _id?: string;
  id?: string;
  rosterId: string;
  employeeId: string;
  date: string;
  status: EntryStatus;
  source: EntrySource;
  locked: boolean;
}

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  type: string;
  date: string;
  brandId?: string;
  brandName?: string;
  processId?: string;
  processName?: string;
  employeeId?: string;
  employeeName?: string;
  message: string;
  suggestedActions: string[];
}

export interface BackupSuggestion {
  gapDate: string;
  processId: string;
  processName: string;
  brandId: string;
  brandName: string;
  absentEmployeeId: string;
  absentEmployeeName: string;
  candidateEmployeeId: string;
  candidateEmployeeName: string;
  samePod: boolean;
  score: number;
  actionType: 'SWAP_OFF' | 'OVERTIME_COMP_OFF' | 'ASSIGN_WORK';
  suggestedOffDate?: string;
  tradeOffSummary: string;
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

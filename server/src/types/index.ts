export type CalendarMode = 'ALL_365' | 'EXCEPT_HOLIDAYS' | 'EXCEPT_SUN_AND_HOLIDAYS' | 'CUSTOM';

export type ProcessType = 'CS' | 'ACC' | 'Retention' | 'NDR' | 'custom';

export type EntryStatus = 'WORK' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE' | 'COMP_OFF';

export type EntrySource = 'auto' | 'manual';

export type LeaveType = 'planned' | 'comp_off' | 'sick';

export type LeaveStatus = 'requested' | 'approved' | 'rejected';

export type RosterStatus = 'draft' | 'published';

export type UserRole = 'manager' | 'pod_lead' | 'viewer';

export type IssueSeverity = 'MANDATORY' | 'WARNING';

export interface EmployeePreferences {
  preferredWeeklyOffs: number[]; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  avoidDays: number[];
}

export interface IPod {
  _id?: string;
  id?: string;
  name: string;
  leadEmployeeId?: string;
}

export interface IEmployee {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  password?: string;
  podId?: string;
  role: UserRole;
  active: boolean;
  preferences: EmployeePreferences;
  maxConsecutiveWorkDays: number;
  weeklyOffsPerWeek: number;
}

export interface IBrand {
  _id?: string;
  id?: string;
  name: string;
  podId?: string;
  active: boolean;
}

export interface IProcessDateOverride {
  date: string; // YYYY-MM-DD
  minStaff: number;
}

export interface IProcess {
  _id?: string;
  id?: string;
  brandId: string;
  name: string;
  type: ProcessType;
  calendarMode: CalendarMode;
  customClosedWeekdays?: number[]; // [0-6]
  minStaffDefault: number;
  minStaffByWeekday?: Record<number, number>; // 0..6
  dateOverrides?: IProcessDateOverride[];
}

export interface IAssignment {
  _id?: string;
  id?: string;
  employeeId: string;
  processId: string;
  isPrimary: boolean;
  allocationPercent: number;
}

export interface IHoliday {
  _id?: string;
  id?: string;
  date: string; // YYYY-MM-DD
  name: string;
  region?: string;
}

export interface ILeave {
  _id?: string;
  id?: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: LeaveType;
  status: LeaveStatus;
}

export interface IRoster {
  _id?: string;
  id?: string;
  month: number; // 1-12
  year: number;
  status: RosterStatus;
  version: number;
  generatedAt: Date | string;
  lockedBy?: string;
  publishOverrideReason?: string;
}

export interface IRosterEntry {
  _id?: string;
  id?: string;
  rosterId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: EntryStatus;
  source: EntrySource;
  locked: boolean;
}

export interface ICompOffLedger {
  _id?: string;
  id?: string;
  employeeId: string;
  earnedDate: string;
  usedDate?: string;
  reason?: string;
}

export interface IAuditLog {
  _id?: string;
  id?: string;
  rosterId?: string;
  userId?: string;
  userName?: string;
  action: string;
  details?: Record<string, any>;
  timestamp: Date | string;
}

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  type:
    | 'ZERO_STAFF'
    | 'STAFFING_BELOW_MIN'
    | 'SOLE_RESOURCE_UNAVAILABLE'
    | 'MAX_CONSECUTIVE_DAYS'
    | 'LEAVE_CONFLICT'
    | 'FEWER_WEEKLY_OFFS'
    | 'PROCESS_OVERLOAD'
    | 'PREFERENCE_VIOLATED'
    | 'UNFAIR_WEEKEND_DISTRIBUTION'
    | 'COMP_OFF_PENDING'
    | 'CAPACITY_EDGE';
  date: string; // YYYY-MM-DD
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
  score: number; // higher is better
  actionType: 'SWAP_OFF' | 'OVERTIME_COMP_OFF' | 'ASSIGN_WORK';
  suggestedOffDate?: string;
  tradeOffSummary: string;
}

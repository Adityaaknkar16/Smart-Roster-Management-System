import { Request, Response } from 'express';
import { z } from 'zod';
import {
  Pod,
  Employee,
  Brand,
  Process,
  Assignment,
  Holiday,
  Leave,
  CompOffLedger,
  AuditLog,
} from '../models/index.js';
import { AuthRequest } from '../middleware/auth.js';

// -------------------------------------------------------------
// PODS
// -------------------------------------------------------------
export async function getPods(req: Request, res: Response) {
  const pods = await Pod.find().populate('leadEmployeeId', 'name email').sort({ name: 1 });
  res.json(pods);
}

export async function createPod(req: Request, res: Response) {
  const schema = z.object({
    name: z.string().min(1),
    leadEmployeeId: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const pod = await Pod.create(data);
  res.status(201).json(pod);
}

export async function updatePod(req: Request, res: Response) {
  const { id } = req.params;
  const pod = await Pod.findByIdAndUpdate(id, req.body, { new: true });
  if (!pod) return res.status(404).json({ error: 'Pod not found' });
  res.json(pod);
}

export async function deletePod(req: Request, res: Response) {
  const { id } = req.params;
  await Pod.findByIdAndDelete(id);
  res.json({ success: true });
}

// -------------------------------------------------------------
// EMPLOYEES
// -------------------------------------------------------------
export async function getEmployees(req: Request, res: Response) {
  const employees = await Employee.find().populate('podId', 'name').sort({ name: 1 });
  res.json(employees);
}

export async function createEmployee(req: Request, res: Response) {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().optional(),
    podId: z.string().optional(),
    role: z.enum(['manager', 'pod_lead', 'viewer']).default('viewer'),
    active: z.boolean().default(true),
    preferences: z
      .object({
        preferredWeeklyOffs: z.array(z.number()).default([0]),
        avoidDays: z.array(z.number()).default([]),
      })
      .default({ preferredWeeklyOffs: [0], avoidDays: [] }),
    maxConsecutiveWorkDays: z.number().default(6),
    weeklyOffsPerWeek: z.number().default(1),
  });
  const data = schema.parse(req.body);
  const employee = await Employee.create(data);
  res.status(201).json(employee);
}

export async function updateEmployee(req: Request, res: Response) {
  const { id } = req.params;
  const employee = await Employee.findByIdAndUpdate(id, req.body, { new: true });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
}

export async function deleteEmployee(req: Request, res: Response) {
  const { id } = req.params;
  await Employee.findByIdAndDelete(id);
  res.json({ success: true });
}

// -------------------------------------------------------------
// BRANDS
// -------------------------------------------------------------
export async function getBrands(req: Request, res: Response) {
  const brands = await Brand.find().populate('podId', 'name').sort({ name: 1 });
  res.json(brands);
}

export async function createBrand(req: Request, res: Response) {
  const schema = z.object({
    name: z.string().min(1),
    podId: z.string().optional(),
    active: z.boolean().default(true),
  });
  const data = schema.parse(req.body);
  const brand = await Brand.create(data);
  res.status(201).json(brand);
}

export async function updateBrand(req: Request, res: Response) {
  const { id } = req.params;
  const brand = await Brand.findByIdAndUpdate(id, req.body, { new: true });
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  res.json(brand);
}

export async function deleteBrand(req: Request, res: Response) {
  const { id } = req.params;
  await Brand.findByIdAndDelete(id);
  res.json({ success: true });
}

// -------------------------------------------------------------
// PROCESSES
// -------------------------------------------------------------
export async function getProcesses(req: Request, res: Response) {
  const processes = await Process.find().populate('brandId', 'name podId').sort({ name: 1 });
  res.json(processes);
}

export async function createProcess(req: Request, res: Response) {
  const schema = z.object({
    brandId: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['CS', 'ACC', 'Retention', 'NDR', 'custom']).default('CS'),
    calendarMode: z.enum(['ALL_365', 'EXCEPT_HOLIDAYS', 'EXCEPT_SUN_AND_HOLIDAYS', 'CUSTOM']),
    customClosedWeekdays: z.array(z.number()).optional(),
    minStaffDefault: z.number().min(0).default(1),
    minStaffByWeekday: z.record(z.string(), z.number()).optional(),
    dateOverrides: z
      .array(
        z.object({
          date: z.string(),
          minStaff: z.number(),
        })
      )
      .optional(),
  });
  const data = schema.parse(req.body);
  const process = await Process.create(data);
  res.status(201).json(process);
}

export async function updateProcess(req: Request, res: Response) {
  const { id } = req.params;
  const process = await Process.findByIdAndUpdate(id, req.body, { new: true });
  if (!process) return res.status(404).json({ error: 'Process not found' });
  res.json(process);
}

export async function deleteProcess(req: Request, res: Response) {
  const { id } = req.params;
  await Process.findByIdAndDelete(id);
  res.json({ success: true });
}

// -------------------------------------------------------------
// ASSIGNMENTS
// -------------------------------------------------------------
export async function getAssignments(req: Request, res: Response) {
  const assignments = await Assignment.find()
    .populate('employeeId', 'name email podId')
    .populate({
      path: 'processId',
      select: 'name type brandId calendarMode',
      populate: { path: 'brandId', select: 'name' },
    });
  res.json(assignments);
}

export async function createAssignment(req: Request, res: Response) {
  const schema = z.object({
    employeeId: z.string().min(1),
    processId: z.string().min(1),
    isPrimary: z.boolean().default(true),
    allocationPercent: z.number().default(100),
  });
  const data = schema.parse(req.body);
  const assignment = await Assignment.create(data);
  res.status(201).json(assignment);
}

export async function updateAssignment(req: Request, res: Response) {
  const { id } = req.params;
  const assignment = await Assignment.findByIdAndUpdate(id, req.body, { new: true });
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  res.json(assignment);
}

export async function deleteAssignment(req: Request, res: Response) {
  const { id } = req.params;
  await Assignment.findByIdAndDelete(id);
  res.json({ success: true });
}

// -------------------------------------------------------------
// HOLIDAYS
// -------------------------------------------------------------
export async function getHolidays(req: Request, res: Response) {
  const holidays = await Holiday.find().sort({ date: 1 });
  res.json(holidays);
}

export async function createHoliday(req: Request, res: Response) {
  const schema = z.object({
    date: z.string().min(10), // YYYY-MM-DD
    name: z.string().min(1),
    region: z.string().default('India'),
  });
  const data = schema.parse(req.body);
  const holiday = await Holiday.create(data);
  res.status(201).json(holiday);
}

export async function updateHoliday(req: Request, res: Response) {
  const { id } = req.params;
  const holiday = await Holiday.findByIdAndUpdate(id, req.body, { new: true });
  if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
  res.json(holiday);
}

export async function deleteHoliday(req: Request, res: Response) {
  const { id } = req.params;
  await Holiday.findByIdAndDelete(id);
  res.json({ success: true });
}

// -------------------------------------------------------------
// LEAVES
// -------------------------------------------------------------
export async function getLeaves(req: Request, res: Response) {
  const leaves = await Leave.find()
    .populate('employeeId', 'name email podId')
    .sort({ startDate: -1 });
  res.json(leaves);
}

export async function createLeave(req: AuthRequest, res: Response) {
  const schema = z.object({
    employeeId: z.string().min(1),
    startDate: z.string().min(10),
    endDate: z.string().min(10),
    type: z.enum(['planned', 'comp_off', 'sick']).default('planned'),
    status: z.enum(['requested', 'approved', 'rejected']).default('requested'),
  });
  const data = schema.parse(req.body);
  const leave = await Leave.create(data);
  res.status(201).json(leave);
}

export async function updateLeave(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const leave = await Leave.findByIdAndUpdate(id, req.body, { new: true });
  if (!leave) return res.status(404).json({ error: 'Leave not found' });
  res.json(leave);
}

export async function deleteLeave(req: Request, res: Response) {
  const { id } = req.params;
  await Leave.findByIdAndDelete(id);
  res.json({ success: true });
}

// -------------------------------------------------------------
// COMP-OFFS & AUDIT LOGS
// -------------------------------------------------------------
export async function getCompOffs(req: Request, res: Response) {
  const ledgers = await CompOffLedger.find()
    .populate('employeeId', 'name email podId')
    .sort({ earnedDate: -1 });
  res.json(ledgers);
}

export async function getAuditLogs(req: Request, res: Response) {
  const { rosterId } = req.query;
  const filter: any = {};
  if (rosterId) filter.rosterId = rosterId;
  const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(100);
  res.json(logs);
}

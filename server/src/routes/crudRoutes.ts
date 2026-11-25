import { Router } from 'express';
import {
  getPods,
  createPod,
  updatePod,
  deletePod,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getProcesses,
  createProcess,
  updateProcess,
  deleteProcess,
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getLeaves,
  createLeave,
  updateLeave,
  deleteLeave,
  getCompOffs,
  getAuditLogs,
} from '../controllers/crudControllers.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Pods
router.get('/pods', getPods);
router.post('/pods', authenticate, requireRole('manager', 'pod_lead'), createPod);
router.put('/pods/:id', authenticate, requireRole('manager', 'pod_lead'), updatePod);
router.delete('/pods/:id', authenticate, requireRole('manager'), deletePod);

// Employees
router.get('/employees', getEmployees);
router.post('/employees', authenticate, requireRole('manager', 'pod_lead'), createEmployee);
router.put('/employees/:id', authenticate, requireRole('manager', 'pod_lead'), updateEmployee);
router.delete('/employees/:id', authenticate, requireRole('manager'), deleteEmployee);

// Brands
router.get('/brands', getBrands);
router.post('/brands', authenticate, requireRole('manager', 'pod_lead'), createBrand);
router.put('/brands/:id', authenticate, requireRole('manager', 'pod_lead'), updateBrand);
router.delete('/brands/:id', authenticate, requireRole('manager'), deleteBrand);

// Processes
router.get('/processes', getProcesses);
router.post('/processes', authenticate, requireRole('manager', 'pod_lead'), createProcess);
router.put('/processes/:id', authenticate, requireRole('manager', 'pod_lead'), updateProcess);
router.delete('/processes/:id', authenticate, requireRole('manager'), deleteProcess);

// Assignments
router.get('/assignments', getAssignments);
router.post('/assignments', authenticate, requireRole('manager', 'pod_lead'), createAssignment);
router.put('/assignments/:id', authenticate, requireRole('manager', 'pod_lead'), updateAssignment);
router.delete('/assignments/:id', authenticate, requireRole('manager'), deleteAssignment);

// Holidays
router.get('/holidays', getHolidays);
router.post('/holidays', authenticate, requireRole('manager', 'pod_lead'), createHoliday);
router.put('/holidays/:id', authenticate, requireRole('manager', 'pod_lead'), updateHoliday);
router.delete('/holidays/:id', authenticate, requireRole('manager'), deleteHoliday);

// Leaves
router.get('/leaves', getLeaves);
router.post('/leaves', authenticate, createLeave);
router.put('/leaves/:id', authenticate, updateLeave);
router.delete('/leaves/:id', authenticate, deleteLeave);

// Comp Offs & Audit
router.get('/comp-offs', getCompOffs);
router.get('/audit-logs', getAuditLogs);

export default router;

import { Router } from 'express';
import {
  getRosters,
  generateRosterEndpoint,
  getRosterById,
  validateRosterEndpoint,
  publishRoster,
  editEntries,
  analyzeImpactEndpoint,
  applySuggestionEndpoint,
  regenerateWeeksEndpoint,
  exportRosterCsv,
} from '../controllers/rosterController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', getRosters);
router.post('/generate', authenticate, requireRole('manager', 'pod_lead'), generateRosterEndpoint);
router.get('/:id', getRosterById);
router.get('/:id/validate', validateRosterEndpoint);
router.post('/:id/publish', authenticate, requireRole('manager', 'pod_lead'), publishRoster);
router.patch('/:id/entries', authenticate, requireRole('manager', 'pod_lead'), editEntries);
router.post('/:id/impact', analyzeImpactEndpoint);
router.post('/:id/apply-suggestion', authenticate, requireRole('manager', 'pod_lead'), applySuggestionEndpoint);
router.post('/:id/regenerate-weeks', authenticate, requireRole('manager', 'pod_lead'), regenerateWeeksEndpoint);
router.get('/:id/export', exportRosterCsv);

export default router;

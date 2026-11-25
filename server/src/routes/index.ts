import { Router } from 'express';
import authRoutes from './authRoutes.js';
import crudRoutes from './crudRoutes.js';
import rosterRoutes from './rosterRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', crudRoutes);
router.use('/rosters', rosterRoutes);

export default router;

import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/studentController';

const router = Router();

// Public — browse vendors
router.get('/vendors', ctrl.getVendors);

// Student only
router.use(protect, restrictTo('student'));
router.post('/save-by-code',          ctrl.saveByCode);
router.delete('/saved/:vendorId',     ctrl.unsaveVendor);
router.get('/saved',                  ctrl.getSaved);

export default router;

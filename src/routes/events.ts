import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/eventController';

const router = Router();

// Public
router.get('/',          ctrl.listEvents);
router.get('/:id',       ctrl.getEvent);

// Organizer only
router.use(protect, restrictTo('organizer'));
router.post('/',                          ctrl.createEvent);
router.put('/:id',                        ctrl.updateEvent);
router.post('/:id/vendors',               ctrl.addVendor);
router.delete('/:id/vendors/:vendorId',   ctrl.removeVendor);

export default router;

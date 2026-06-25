import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/eventController';

const router = Router();

// Public
router.get('/',          ctrl.listEvents);

// Organizer only — must be registered before the public '/:id' route below,
// otherwise Express matches '/mine' as { id: 'mine' } on the public route first.
router.get('/mine',      protect, restrictTo('organizer'), ctrl.listMyEvents);

router.get('/:id',       ctrl.getEvent);

// Organizer only
router.use(protect, restrictTo('organizer'));
router.post('/',                          ctrl.createEvent);
router.put('/:id',                        ctrl.updateEvent);
router.post('/:id/vendors',               ctrl.addVendor);
router.delete('/:id/vendors/:vendorId',   ctrl.removeVendor);

export default router;

import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/announcementController';

const router = Router();

// Public
router.get('/vendor/:vendorId', ctrl.listAnnouncements);

// Vendor only
router.use(protect, restrictTo('vendor'));
router.post('/',        ctrl.createAnnouncement);
router.delete('/:id',   ctrl.deleteAnnouncement);

export default router;

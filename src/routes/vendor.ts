import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import upload from '../middleware/upload';
import * as ctrl from '../controllers/vendorController';

const router = Router();

router.use(protect);

// ── Profile CRUD ──────────────────────────────────────────────────────────────
router.post('/profile',                       restrictTo('vendor'), ctrl.createProfile);
router.get('/profile',                        restrictTo('vendor'), ctrl.getMyProfile);
router.put('/profile',                        restrictTo('vendor'), ctrl.updateProfile);

// ── Media ─────────────────────────────────────────────────────────────────────
router.post('/profile/photo',                 restrictTo('vendor'), upload.single('photo'),  ctrl.uploadPhoto);
router.post('/profile/gallery',               restrictTo('vendor'), upload.single('image'),  ctrl.addGalleryImage);
router.delete('/profile/gallery/:publicId',   restrictTo('vendor'),                          ctrl.deleteGalleryImage);

// ── Contact & delivery ────────────────────────────────────────────────────────
router.put('/profile/contact',                restrictTo('vendor'), ctrl.updateContact);
router.put('/profile/delivery',               restrictTo('vendor'), ctrl.updateDelivery);

// ── Bank ──────────────────────────────────────────────────────────────────────
router.put('/profile/bank',                   restrictTo('vendor'), ctrl.updateBankDetails);

// ── Public profile (any authenticated user) ───────────────────────────────────
router.get('/:userId/profile',                                      ctrl.getPublicProfile);

// ── Save count ────────────────────────────────────────────────────────────────
router.post('/save',                          restrictTo('student'), ctrl.incrementSaveCount);

export default router;

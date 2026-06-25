import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/vendorController';

const router = Router();

// ── Public routes (no auth) ───────────────────────────────────────────────────
router.get('/by-code/:code', ctrl.getByCode);

router.use(protect);

// ── Profile CRUD ──────────────────────────────────────────────────────────────
router.post('/profile',                       restrictTo('vendor'), ctrl.createProfile);
router.get('/profile',                        restrictTo('vendor'), ctrl.getMyProfile);
router.put('/profile',                        restrictTo('vendor'), ctrl.updateProfile);

// ── Media (Flutter uploads directly to Cloudinary, backend just stores the URL) ─
router.put('/profile/photo',                  restrictTo('vendor'), ctrl.updatePhoto);
router.post('/profile/gallery',               restrictTo('vendor'), ctrl.addGalleryImage);
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

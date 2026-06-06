import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import upload from '../middleware/upload';
import * as ctrl from '../controllers/productController';

const router = Router();

// Public
router.get('/vendor/:vendorId', ctrl.listProducts);

// Vendor only
router.use(protect);
router.post('/',                        restrictTo('vendor'), ctrl.createProduct);
router.put('/:id',                      restrictTo('vendor'), ctrl.updateProduct);
router.delete('/:id',                   restrictTo('vendor'), ctrl.deleteProduct);
router.patch('/:id/availability',       restrictTo('vendor'), ctrl.toggleAvailability);
router.post('/:id/image',               restrictTo('vendor'), upload.single('image'), ctrl.uploadProductImage);

export default router;

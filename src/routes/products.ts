import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/productController';

const router = Router();

// Public
router.get('/vendor/:vendorId', ctrl.listProducts);

// Vendor only
router.use(protect);
router.post('/',                        restrictTo('vendor'), ctrl.createProduct);
router.patch('/:id',                    restrictTo('vendor'), ctrl.updateProduct);
router.delete('/:id',                   restrictTo('vendor'), ctrl.deleteProduct);
router.patch('/:id/availability',       restrictTo('vendor'), ctrl.toggleAvailability);

export default router;

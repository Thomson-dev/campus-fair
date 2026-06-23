import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/orderController';

const router = Router();

router.use(protect);

router.post('/',                restrictTo('student'), ctrl.createOrder);
router.get('/student',          restrictTo('student'), ctrl.getStudentOrders);
router.get('/vendor',           restrictTo('vendor'),  ctrl.getVendorOrders);
router.get('/:id',                                     ctrl.getOrderDetail);
router.patch('/:id/action',     restrictTo('student'), ctrl.studentOrderAction);
router.patch('/:id/status',     restrictTo('vendor'),  ctrl.updateOrderStatus);

export default router;

import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/orderController';
import * as msgCtrl from '../controllers/messageController';

const router = Router();

router.use(protect);

router.post('/',                restrictTo('student'), ctrl.createOrder);
router.get('/student',          restrictTo('student'), ctrl.getStudentOrders);
router.get('/vendor',           restrictTo('vendor'),  ctrl.getVendorOrders);
router.get('/:id',                                     ctrl.getOrderDetail);
router.patch('/:id/action',     restrictTo('student'), ctrl.studentOrderAction);
router.patch('/:id/status',     restrictTo('vendor'),  ctrl.updateOrderStatus);
router.get('/:id/messages',                            msgCtrl.getMessages);
router.post('/:id/messages',                           msgCtrl.sendMessage);

export default router;

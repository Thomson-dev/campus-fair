import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import * as ctrl from '../controllers/paymentController';

const router = Router();

// Webhook — no JWT, raw body handled in server.ts before this router
router.post('/webhook', ctrl.paystackWebhook);

// Student initiates payment
router.post('/initialize', protect, restrictTo('student'), ctrl.initializePayment);

export default router;

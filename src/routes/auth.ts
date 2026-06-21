import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth';
import * as ctrl from '../controllers/authController';

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array().map((e) => ({ field: e.type, message: e.msg })) });
    return;
  }
  next();
};

// ── Shared rules ──────────────────────────────────────────────────────────────
const nameRule     = body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 });
const emailRule    = body('email').isEmail().withMessage('Valid email required').normalizeEmail();
const passwordRule = body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters');
const phoneRule    = body('phone').isMobilePhone('any').withMessage('Valid phone number required');

// ── Registration ──────────────────────────────────────────────────────────────

router.post('/register/student',
  [nameRule, emailRule, passwordRule, body('university').optional().trim()],
  validate, ctrl.registerStudent
);

router.post('/register/vendor',
  [nameRule, emailRule, passwordRule, phoneRule],
  validate, ctrl.registerVendor
);

router.post('/register/organizer',
  [nameRule, emailRule, passwordRule, phoneRule, body('institution').trim().notEmpty().withMessage('Institution is required')],
  validate, ctrl.registerOrganizer
);

// ── Login ─────────────────────────────────────────────────────────────────────

router.post('/login',
  [emailRule, body('password').notEmpty().withMessage('Password required'), body('role').isIn(['student', 'vendor', 'organizer']).withMessage('Invalid role')],
  validate, ctrl.login
);

// ── Google ────────────────────────────────────────────────────────────────────

router.post('/google',
  [body('idToken').notEmpty().withMessage('Google ID token required'), body('role').equals('student').withMessage('Google Sign-In is only available for students')],
  validate, ctrl.googleAuth
);

// ── Current user ──────────────────────────────────────────────────────────────

router.get('/me', protect, ctrl.getMe);
router.post('/fcm-token', protect, ctrl.saveFcmToken);

// ── Password reset ────────────────────────────────────────────────────────────

router.post('/forgot-password', [emailRule], validate, ctrl.forgotPassword);
router.post('/reset-password/:token', [passwordRule], validate, ctrl.resetPassword);

export default router;

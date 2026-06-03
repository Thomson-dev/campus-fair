import crypto from 'crypto';
import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import VendorProfile from '../models/VendorProfile';
import { signToken, authResponse } from '../utils/jwt';
import { sendPasswordReset, sendWelcome } from '../utils/email';

const googleClient = new OAuth2Client(process.env['GOOGLE_CLIENT_ID']);

// ── Student registration ───────────────────────────────────────────────────────

export const registerStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, university } = req.body as Record<string, string>;
    if (await User.findOne({ email })) {
      res.status(409).json({ success: false, message: 'Email already in use' });
      return;
    }
    const user = await User.create({ name, email, password, role: 'student', university });
    sendWelcome(email, name, 'student').catch(console.error);
    res.status(201).json(authResponse(user, signToken(user)));
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Vendor registration — Step 1 ──────────────────────────────────────────────

export const registerVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body as Record<string, string>;
    if (await User.findOne({ email })) {
      res.status(409).json({ success: false, message: 'Email already in use' });
      return;
    }
    const user = await User.create({ name, email, password, phone, role: 'vendor' });
    res.status(201).json({ ...authResponse(user, signToken(user)), profileComplete: false });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Organizer registration ────────────────────────────────────────────────────

export const registerOrganizer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, institution } = req.body as Record<string, string>;
    if (await User.findOne({ email })) {
      res.status(409).json({ success: false, message: 'Email already in use' });
      return;
    }
    const user = await User.create({ name, email, password, phone, institution, role: 'organizer' });
    sendWelcome(email, name, 'organizer').catch(console.error);
    res.status(201).json(authResponse(user, signToken(user)));
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body as Record<string, string>;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password required' });
      return;
    }
    const user = await User.findOne({ email, role }).select('+password');
    if (!user?.password || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account suspended' });
      return;
    }

    let profileComplete: boolean | undefined;
    if (role === 'vendor') {
      const vp = await VendorProfile.findOne({ user: user._id }).select('isProfileComplete');
      profileComplete = vp?.isProfileComplete ?? false;
    }

    const payload = authResponse(user, signToken(user));
    res.json(profileComplete !== undefined ? { ...payload, profileComplete } : payload);
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Google Sign-In ────────────────────────────────────────────────────────────

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, role } = req.body as { idToken: string; role: string };
    if (!idToken || !role) {
      res.status(400).json({ success: false, message: 'idToken and role are required' });
      return;
    }
    if (role !== 'student') {
      res.status(400).json({ success: false, message: 'Google Sign-In is only available for students' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env['GOOGLE_CLIENT_ID'] });
    const payload = ticket.getPayload();
    if (!payload) { res.status(401).json({ success: false, message: 'Invalid Google token' }); return; }

    const { name = 'Google User', email = '', sub: googleId } = payload;
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) { user.googleId = googleId; await user.save({ validateBeforeSave: false }); }
    } else {
      user = await User.create({ name, email, googleId, role });
      sendWelcome(email, name, role).catch(console.error);
    }

    res.json(authResponse(user, signToken(user)));
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('Token used too late') || msg.includes('Invalid token')) {
      res.status(401).json({ success: false, message: 'Invalid or expired Google token' });
      return;
    }
    res.status(500).json({ success: false, message: msg });
  }
};

// ── Get current user ──────────────────────────────────────────────────────────

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let vendorProfile = null;
    if (user.role === 'vendor') vendorProfile = await VendorProfile.findOne({ user: user._id });
    res.json({ success: true, user: user.toPublic(), vendorProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Forgot password ───────────────────────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    const generic = { success: true, message: 'If an account with that email exists, a reset link has been sent.' };
    const user = await User.findOne({ email }).select('+password');
    if (!user?.password) { res.json(generic); return; }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordReset(user.email, user.name, resetToken);
    } catch {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      res.status(500).json({ success: false, message: 'Failed to send reset email. Try again.' });
      return;
    }

    res.json(generic);
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Reset password ────────────────────────────────────────────────────────────

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as { token: string };
    const { password } = req.body as { password: string };

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
    if (!user) { res.status(400).json({ success: false, message: 'Token is invalid or has expired' }); return; }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully', token: signToken(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

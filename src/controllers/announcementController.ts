import { Request, Response } from 'express';
import Announcement from '../models/Announcement';
import VendorProfile from '../models/VendorProfile';
import SavedVendor from '../models/SavedVendor';
import User from '../models/User';
import { destroy } from '../config/cloudinary';
import { sendToMany } from '../utils/notify';

const MONTHLY_LIMIT = 7;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthRange(): { startOfMonth: Date; resetsOn: Date } {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const resetsOn = new Date(startOfMonth);
  resetsOn.setMonth(resetsOn.getMonth() + 1);

  return { startOfMonth, resetsOn };
}

// ── Usage (vendor only) — "X of N posts used this month" ─────────────────────

export const getAnnouncementUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor profile not found' }); return; }

    const { startOfMonth, resetsOn } = monthRange();
    const used = await Announcement.countDocuments({ vendor: profile._id, createdAt: { $gte: startOfMonth } });

    res.json({ success: true, used, limit: MONTHLY_LIMIT, remaining: Math.max(0, MONTHLY_LIMIT - used), resetsOn });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Create announcement (vendor only) ─────────────────────────────────────────

export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor profile not found' }); return; }

    const { startOfMonth, resetsOn } = monthRange();
    const countThisMonth = await Announcement.countDocuments({ vendor: profile._id, createdAt: { $gte: startOfMonth } });
    if (countThisMonth >= MONTHLY_LIMIT) {
      const resetLabel = `${MONTHS[resetsOn.getMonth()]} ${resetsOn.getDate()}`;
      res.status(400).json({
        success: false,
        message: `You've used all ${MONTHLY_LIMIT} posts this month. Resets on ${resetLabel}.`,
      });
      return;
    }

    const { text, imageUrl, imagePublicId } = req.body as { text: string; imageUrl?: string; imagePublicId?: string };

    // Reach = students who saved this vendor and haven't muted them
    const savers = await SavedVendor.find({ vendor: profile._id, muted: false }).select('student');

    const announcement = await Announcement.create({ vendor: profile._id, text, imageUrl, imagePublicId, reach: savers.length });
    res.status(201).json({ success: true, announcement, remaining: MONTHLY_LIMIT - (countThisMonth + 1) });

    if (savers.length > 0) {
      const students = await User.find({ _id: { $in: savers.map((s) => s.student) } }).select('fcmToken');
      const tokens = students.map((s) => s.fcmToken).filter((t): t is string => !!t);
      if (tokens.length > 0) {
        const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;
        sendToMany(tokens, `${profile.businessName} posted an update`, preview, {
          type: 'announcement',
          vendorId: String(profile._id),
          vendorName: profile.businessName,
          announcementId: String(announcement._id),
          text,
          imageUrl: imageUrl ?? '',
          createdAt: announcement.createdAt.toISOString(),
        }).catch((e) => console.error('[createAnnouncement] broadcast failed:', e));
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── List announcements for a vendor (public) ──────────────────────────────────

export const listAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const announcements = await Announcement.find({ vendor: req.params['vendorId'] })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Delete announcement (vendor only) ─────────────────────────────────────────

export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor profile not found' }); return; }

    const ann = await Announcement.findOneAndDelete({ _id: req.params['id'], vendor: profile._id });
    if (!ann) { res.status(404).json({ success: false, message: 'Announcement not found' }); return; }

    if (ann.imagePublicId) await destroy(ann.imagePublicId).catch(console.error);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

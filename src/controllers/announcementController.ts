import { Request, Response } from 'express';
import Announcement from '../models/Announcement';
import VendorProfile from '../models/VendorProfile';
import { destroy } from '../config/cloudinary';

const MONTHLY_LIMIT = 4;

// ── Create announcement (vendor only) ─────────────────────────────────────────

export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor profile not found' }); return; }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const countThisMonth = await Announcement.countDocuments({ vendor: profile._id, createdAt: { $gte: startOfMonth } });
    if (countThisMonth >= MONTHLY_LIMIT) {
      res.status(400).json({ success: false, message: `Monthly post limit reached (${MONTHLY_LIMIT} per month)` });
      return;
    }

    const { text, imageUrl, imagePublicId } = req.body as { text: string; imageUrl?: string; imagePublicId?: string };

    const announcement = await Announcement.create({ vendor: profile._id, text, imageUrl, imagePublicId });
    res.status(201).json({ success: true, announcement, remaining: MONTHLY_LIMIT - (countThisMonth + 1) });
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

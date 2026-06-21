import { Request, Response } from 'express';
import VendorProfile from '../models/VendorProfile';
import SavedVendor from '../models/SavedVendor';
import Product from '../models/Product';
import User from '../models/User';
import { sendToUser } from '../utils/notify';

// ── Save vendor by code ───────────────────────────────────────────────────────

export const saveByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body as { code: string };
    if (!code) { res.status(400).json({ success: false, message: 'Vendor code is required' }); return; }

    const profile = await VendorProfile.findOne({ vendorCode: code.trim().toUpperCase() })
      .populate('user', 'name email phone')
      .select('-bankDetails');

    if (!profile) { res.status(404).json({ success: false, message: 'No vendor found with that code' }); return; }

    const alreadySaved = await SavedVendor.findOne({ student: req.user!._id, vendor: profile._id });

    if (!alreadySaved) {
      await SavedVendor.create({ student: req.user!._id, vendor: profile._id });
      await VendorProfile.findByIdAndUpdate(profile._id, { $inc: { saveCount: 1 } });

      // Notify the student only — never the vendor
      const student = await User.findById(req.user!._id).select('fcmToken');
      if (student?.fcmToken) {
        const biz = (profile as unknown as { businessName: string }).businessName;
        sendToUser(student.fcmToken, 'Vendor saved!', `${biz} has been added to your Saved tab.`).catch(() => {});
      }
    }

    const products = await Product.find({ vendor: profile._id, available: true }).sort({ position: 1 });
    res.json({ success: true, profile, products, alreadySaved: !!alreadySaved });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Unsave vendor ─────────────────────────────────────────────────────────────

export const unsaveVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await SavedVendor.findOneAndDelete({ student: req.user!._id, vendor: req.params['vendorId'] });
    if (!result) { res.status(404).json({ success: false, message: 'Vendor not in your saved list' }); return; }

    await VendorProfile.findByIdAndUpdate(req.params['vendorId'], { $inc: { saveCount: -1 } });
    res.json({ success: true, message: 'Vendor removed from saved list' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Get saved vendors ─────────────────────────────────────────────────────────

export const getSaved = async (req: Request, res: Response): Promise<void> => {
  try {
    const saved = await SavedVendor.find({ student: req.user!._id })
      .sort({ savedAt: -1 })
      .populate({
        path: 'vendor',
        select: '-bankDetails',
        populate: { path: 'user', select: 'name email phone' },
      });

    const vendors = saved.map((s) => s.vendor);
    res.json({ success: true, vendors, count: vendors.length });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Browse all vendors (public) ───────────────────────────────────────────────

export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, page = '1', limit = '20', q } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { isProfileComplete: true };
    if (category) filter['category'] = category;
    if (q) filter['$or'] = [
      { businessName: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [vendors, total] = await Promise.all([
      VendorProfile.find(filter).select('-bankDetails').populate('user', 'name').skip(skip).limit(Number(limit)),
      VendorProfile.countDocuments(filter),
    ]);

    res.json({ success: true, vendors, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

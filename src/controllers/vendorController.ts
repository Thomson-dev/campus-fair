import { Request, Response } from 'express';
import VendorProfile from '../models/VendorProfile';
import { uploadBuffer, destroy } from '../config/cloudinary';

const FOLDER = 'campus_fair/vendors';

const parseJSON = <T>(value: unknown): T | undefined => {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return undefined; }
  }
  return value as T | undefined;
};

// ── Create profile (Step 2 of vendor registration) ────────────────────────────

export const createProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (await VendorProfile.findOne({ user: req.user!._id })) {
      res.status(409).json({ success: false, message: 'Profile already exists. Use PUT /profile to update.' });
      return;
    }
    const { businessName, category, description, tagline } = req.body as Record<string, string>;
    const contact = parseJSON(req.body.contact);
    const deliveryMethods = parseJSON<unknown[]>(req.body.deliveryMethods) ?? [];

    const profile = await VendorProfile.create({
      user: req.user!._id,
      businessName, category, description, tagline, contact, deliveryMethods,
    });
    res.status(201).json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Get own profile ───────────────────────────────────────────────────────────

export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id }).populate('user', 'name email phone');
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found. Complete registration first.' }); return; }

    // Backfill vendorCode for profiles saved via findOneAndUpdate before this field existed,
    // since findOneAndUpdate bypasses the pre('save') hook that generates it.
    if (!profile.vendorCode && profile.businessName) await profile.save();

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Get public profile ────────────────────────────────────────────────────────

export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.params['userId'] })
      .populate('user', 'name email phone')
      .select('-bankDetails');
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor not found' }); return; }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Update business info ──────────────────────────────────────────────────────

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowed = ['businessName', 'category', 'description', 'tagline'] as const;
    const updates: Partial<Record<typeof allowed[number], string>> = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const profile = await VendorProfile.findOneAndUpdate({ user: req.user!._id }, { $set: updates }, { new: true, runValidators: true });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Upload / replace cover photo ──────────────────────────────────────────────

export const uploadPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No image uploaded' }); return; }
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

    if (profile.photo?.publicId) await destroy(profile.photo.publicId).catch(console.error);

    const result = await uploadBuffer(req.file.buffer, {
      folder: `${FOLDER}/${String(req.user!._id)}/photo`,
      public_id: 'cover',
      overwrite: true,
      transformation: [{ width: 1200, height: 750, crop: 'fill', quality: 'auto:good' }],
    });

    profile.photo = { url: result.secure_url, publicId: result.public_id };
    await profile.save();
    res.json({ success: true, photo: profile.photo });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Add gallery image ─────────────────────────────────────────────────────────

export const addGalleryImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No image uploaded' }); return; }
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }
    if (profile.gallery.length >= 8) { res.status(400).json({ success: false, message: 'Gallery is full (max 8 images)' }); return; }

    const result = await uploadBuffer(req.file.buffer, {
      folder: `${FOLDER}/${String(req.user!._id)}/gallery`,
      public_id: `gallery_${Date.now()}`,
      transformation: [{ width: 900, height: 900, crop: 'fill', quality: 'auto:good' }],
    });

    profile.gallery.push({ url: result.secure_url, publicId: result.public_id });
    await profile.save();
    res.status(201).json({ success: true, gallery: profile.gallery });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Delete gallery image ──────────────────────────────────────────────────────

export const deleteGalleryImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const decodedId = decodeURIComponent((req.params['publicId'] as string) ?? '');
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

    const index = profile.gallery.findIndex((g) => g.publicId === decodedId);
    if (index === -1) { res.status(404).json({ success: false, message: 'Image not found in gallery' }); return; }

    await destroy(decodedId).catch(console.error);
    profile.gallery.splice(index, 1);
    await profile.save();
    res.json({ success: true, gallery: profile.gallery });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Update contact info ───────────────────────────────────────────────────────

export const updateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { whatsapp, instagram, email } = req.body as Record<string, string>;
    const profile = await VendorProfile.findOneAndUpdate(
      { user: req.user!._id },
      { $set: { 'contact.whatsapp': whatsapp, 'contact.instagram': instagram, 'contact.email': email } },
      { new: true, runValidators: true }
    );
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }
    res.json({ success: true, contact: profile.contact });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Update delivery methods ───────────────────────────────────────────────────

export const updateDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deliveryMethods } = req.body as { deliveryMethods: unknown };
    if (!Array.isArray(deliveryMethods)) { res.status(400).json({ success: false, message: 'deliveryMethods must be an array' }); return; }

    const profile = await VendorProfile.findOneAndUpdate(
      { user: req.user!._id },
      { $set: { deliveryMethods } },
      { new: true, runValidators: true }
    );
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }
    res.json({ success: true, deliveryMethods: profile.deliveryMethods });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Update bank details ───────────────────────────────────────────────────────

export const updateBankDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bankName, accountNumber, accountName } = req.body as Record<string, string>;
    const profile = await VendorProfile.findOneAndUpdate(
      { user: req.user!._id },
      { $set: { bankDetails: { bankName, accountNumber, accountName }, hasBankDetails: true } },
      { new: true, runValidators: true }
    );
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }
    res.json({ success: true, message: 'Bank details saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Get vendor by code (public) ───────────────────────────────────────────────

export const getByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = (req.params['code'] as string).trim().toUpperCase();
    const profile = await VendorProfile.findOne({ vendorCode: code })
      .populate('user', 'name email phone')
      .select('-bankDetails');
    if (!profile) { res.status(404).json({ success: false, message: 'No vendor found with that code' }); return; }
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Save count (student saves/unsaves a vendor) ───────────────────────────────

export const incrementSaveCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorUserId, action } = req.body as { vendorUserId: string; action: 'save' | 'unsave' };
    const delta = action === 'unsave' ? -1 : 1;
    const profile = await VendorProfile.findOneAndUpdate({ user: vendorUserId }, { $inc: { saveCount: delta } }, { new: true });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor not found' }); return; }
    res.json({ success: true, saveCount: profile.saveCount });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

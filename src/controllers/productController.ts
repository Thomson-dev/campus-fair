import { Request, Response } from 'express';
import Product from '../models/Product';
import VendorProfile from '../models/VendorProfile';
import { destroy } from '../config/cloudinary';

const MAX_PRODUCTS = 50;

// ── List products for a vendor (public) ───────────────────────────────────────
// GET /api/products/vendor/:vendorId
// Returns all products for a vendor sorted by position (drag-order).

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({ vendor: req.params['vendorId'] }).sort({ position: 1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Create product (vendor only) ──────────────────────────────────────────────
// POST /api/products
// Body: { name, description, price, imageUrl? }
// imageUrl is optional — the Flutter app uploads the image directly to Cloudinary
// and passes back the resulting URL here.

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor profile not found' }); return; }

    // Enforce per-vendor product cap
    const count = await Product.countDocuments({ vendor: profile._id });
    if (count >= MAX_PRODUCTS) {
      res.status(400).json({ success: false, message: `Product limit reached (max ${MAX_PRODUCTS})` });
      return;
    }

    const { name, description, price, imageUrl, imagePublicId } = req.body as Record<string, string>;

    // position = timestamp so new products appear at the bottom by default
    const product = await Product.create({
      vendor: profile._id,
      name,
      description,
      price: Number(price),
      position: Date.now(),
      ...(imageUrl && { imageUrl, imagePublicId }),
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Update product ────────────────────────────────────────────────────────────
// PUT /api/products/:id
// Body: any subset of { name, description, price, position, imageUrl }
// Only the vendor who owns the product can update it.

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

    // Whitelist updatable fields to prevent mass-assignment
    const allowed = ['name', 'description', 'price', 'position', 'imageUrl', 'imagePublicId'] as const;
    const updates: Record<string, unknown> = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = k === 'price' || k === 'position' ? Number(req.body[k]) : req.body[k]; });

    const existing = await Product.findOne({ _id: req.params['id'], vendor: profile._id });
    if (!existing) { res.status(404).json({ success: false, message: 'Product not found' }); return; }

    if (updates['imageUrl'] && existing.imagePublicId && updates['imagePublicId'] !== existing.imagePublicId) {
      await destroy(existing.imagePublicId).catch(console.error);
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params['id'], vendor: profile._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Delete product ────────────────────────────────────────────────────────────
// DELETE /api/products/:id
// Also removes the image from Cloudinary if one exists.

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

    const product = await Product.findOneAndDelete({ _id: req.params['id'], vendor: profile._id });
    if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }

    // Clean up Cloudinary asset — non-fatal if it fails
    if (product.imagePublicId) await destroy(product.imagePublicId).catch(console.error);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Toggle availability ───────────────────────────────────────────────────────
// PATCH /api/products/:id/availability
// Flips the available flag — hides/shows the product from students.

export const toggleAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

    const product = await Product.findOne({ _id: req.params['id'], vendor: profile._id });
    if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }

    product.available = !product.available;
    await product.save();
    res.json({ success: true, available: product.available });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

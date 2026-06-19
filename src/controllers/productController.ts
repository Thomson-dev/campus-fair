import { Request, Response } from 'express';
import Product from '../models/Product';
import VendorProfile from '../models/VendorProfile';
import { uploadBuffer, destroy } from '../config/cloudinary';

const FOLDER = 'campus_fair/products';
const MAX_PRODUCTS = 50;

// ── List products for a vendor (public) ───────────────────────────────────────

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({ vendor: req.params['vendorId'] }).sort({ position: 1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Create product (vendor only) ──────────────────────────────────────────────

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor profile not found' }); return; }

    const count = await Product.countDocuments({ vendor: profile._id });
    if (count >= MAX_PRODUCTS) {
      res.status(400).json({ success: false, message: `Product limit reached (max ${MAX_PRODUCTS})` });
      return;
    }

    const { name, description, price, imageUrl } = req.body as Record<string, string>;

    const product = await Product.create({
      vendor: profile._id,
      name,
      description,
      price: Number(price),
      position: Date.now(),
      ...(imageUrl && { imageUrl }),
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Update product ────────────────────────────────────────────────────────────

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

    const allowed = ['name', 'description', 'price', 'position', 'imageUrl'] as const;
    const updates: Record<string, unknown> = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = k === 'price' || k === 'position' ? Number(req.body[k]) : req.body[k]; });

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

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

    const product = await Product.findOneAndDelete({ _id: req.params['id'], vendor: profile._id });
    if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }

    if (product.imagePublicId) await destroy(product.imagePublicId).catch(console.error);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Toggle availability ───────────────────────────────────────────────────────

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

// ── Upload product image ──────────────────────────────────────────────────────

export const uploadProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No image uploaded' }); return; }

    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Profile not found' }); return; }

    const product = await Product.findOne({ _id: req.params['id'], vendor: profile._id });
    if (!product) { res.status(404).json({ success: false, message: 'Product not found' }); return; }

    if (product.imagePublicId) await destroy(product.imagePublicId).catch(console.error);

    const result = await uploadBuffer(req.file.buffer, {
      folder: `${FOLDER}/${String(profile._id)}`,
      public_id: `product_${String(product._id)}`,
      overwrite: true,
      transformation: [{ width: 800, height: 800, crop: 'fill', quality: 'auto:good' }],
    });

    product.imageUrl = result.secure_url;
    product.imagePublicId = result.public_id;
    await product.save();
    res.json({ success: true, imageUrl: product.imageUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

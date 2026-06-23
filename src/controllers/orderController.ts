import { Request, Response } from 'express';
import Order from '../models/Order';
import VendorProfile from '../models/VendorProfile';
import Product from '../models/Product';

const COMMISSION = 0.08;

// ── Create order (student, after payment confirmed) ───────────────────────────

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId, items, deliveryMethod, deliveryFee, deliveryAddress, studentNote, paystackReference } =
      req.body as {
        vendorId: string;
        items: { productId: string; quantity: number }[];
        deliveryMethod: string;
        deliveryFee: number;
        deliveryAddress?: string;
        studentNote?: string;
        paystackReference: string;
      };

    if (!paystackReference) {
      res.status(400).json({ success: false, message: 'Paystack reference is required' });
      return;
    }

    const existing = await Order.findOne({ paystackReference });
    if (existing) {
      res.status(409).json({ success: false, message: 'Order with this reference already exists' });
      return;
    }

    const vendorProfile = await VendorProfile.findById(vendorId).populate('user', '_id');
    if (!vendorProfile) { res.status(404).json({ success: false, message: 'Vendor not found' }); return; }

    // Resolve products and build line items
    const productDocs = await Product.find({ _id: { $in: items.map((i) => i.productId) }, vendor: vendorId, available: true });
    if (productDocs.length !== items.length) {
      res.status(400).json({ success: false, message: 'One or more products are unavailable or not found' });
      return;
    }

    const lineItems = items.map((item) => {
      const p = productDocs.find((d) => String(d._id) === item.productId)!;
      return { productId: p._id, productName: p.name, price: p.price, quantity: item.quantity, subtotal: p.price * item.quantity };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);
    const totalAmount = subtotal + Number(deliveryFee);
    const platformFee = Math.round(totalAmount * COMMISSION);
    const vendorReceives = totalAmount - platformFee;

    const order = await Order.create({
      student: req.user!._id,
      studentName: req.user!.name,
      studentPhone: req.user!.phone,
      vendor: vendorProfile._id,
      vendorUser: (vendorProfile.user as unknown as { _id: unknown })._id,
      items: lineItems,
      subtotal,
      deliveryMethod,
      deliveryFee: Number(deliveryFee),
      deliveryAddress,
      totalAmount,
      platformFee,
      vendorReceives,
      studentNote,
      paystackReference,
      paidAt: new Date(),
      statusHistory: [{ status: 'pending', timestamp: new Date() }],
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Get student's orders ──────────────────────────────────────────────────────

export const getStudentOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ student: req.user!._id })
      .sort({ createdAt: -1 })
      .populate('vendor', 'businessName photo vendorCode');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Get vendor's orders ───────────────────────────────────────────────────────

export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor profile not found' }); return; }

    const { status } = req.query as { status?: string };
    const filter: Record<string, unknown> = { vendor: profile._id };
    if (status) filter['status'] = status;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Get order detail ──────────────────────────────────────────────────────────

export const getOrderDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = req.user!.role === 'vendor' ? await VendorProfile.findOne({ user: req.user!._id }) : null;

    const filter: Record<string, unknown> = { _id: req.params['id'] };
    if (req.user!.role === 'student') filter['student'] = req.user!._id;
    if (req.user!.role === 'vendor' && profile) filter['vendor'] = profile._id;

    const order = await Order.findOne(filter)
      .populate('vendor', 'businessName photo vendorCode contact')
      .populate('student', 'name email phone');
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Cancel or dispute order (student only) ───────────────────────────────────

export const studentOrderAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, reason } = req.body as { action: 'cancel' | 'dispute'; reason?: string };
    const order = await Order.findOne({ _id: req.params['id'], student: req.user!._id });
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }

    if (action === 'cancel') {
      if (order.status !== 'pending') {
        res.status(400).json({ success: false, message: 'Only pending orders can be cancelled' });
        return;
      }
      order.status = 'cancelled';
    } else if (action === 'dispute') {
      if (order.status !== 'delivered') {
        res.status(400).json({ success: false, message: 'Only delivered orders can be disputed' });
        return;
      }
      order.status = 'disputed';
      if (reason) order.disputeReason = reason;
    } else {
      res.status(400).json({ success: false, message: 'Invalid action. Use cancel or dispute.' });
      return;
    }

    order.statusHistory.push({ status: order.status, timestamp: new Date() });
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Update order status (vendor only) ────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'rejected'],
  confirmed: ['ready'],
  ready:     ['delivered'],
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, rejectionReason } = req.body as { status: string; rejectionReason?: string };
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) { res.status(404).json({ success: false, message: 'Vendor profile not found' }); return; }

    const order = await Order.findOne({ _id: req.params['id'], vendor: profile._id });
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(400).json({ success: false, message: `Cannot transition from '${order.status}' to '${status}'` });
      return;
    }

    order.status = status as typeof order.status;
    order.statusHistory.push({ status, timestamp: new Date() });
    if (status === 'rejected' && rejectionReason) order.rejectionReason = rejectionReason;
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

import { Request, Response } from 'express';
import Order from '../models/Order';
import VendorProfile from '../models/VendorProfile';
import Message from '../models/Message';
import User from '../models/User';
import { sendToUser } from '../utils/notify';

async function findAccessibleOrder(req: Request) {
  const filter: Record<string, unknown> = { _id: req.params['id'] };
  if (req.user!.role === 'student') {
    filter['student'] = req.user!._id;
  } else if (req.user!.role === 'vendor') {
    const profile = await VendorProfile.findOne({ user: req.user!._id });
    if (!profile) return null;
    filter['vendor'] = profile._id;
  }
  return Order.findOne(filter);
}

// ── Get messages for an order ─────────────────────────────────────────────────

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await findAccessibleOrder(req);
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }

    const messages = await Message.find({ order: order._id }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Send a message ────────────────────────────────────────────────────────────

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body as { text: string };
    if (!text || !text.trim()) { res.status(400).json({ success: false, message: 'Message text is required' }); return; }

    const order = await findAccessibleOrder(req);
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }

    const senderRole = req.user!.role as 'student' | 'vendor';
    const message = await Message.create({
      order: order._id,
      sender: req.user!._id,
      senderRole,
      text: text.trim(),
    });

    const recipientId = senderRole === 'student' ? order.vendorUser : order.student;
    const recipient = await User.findById(recipientId).select('fcmToken');
    if (recipient?.fcmToken) {
      sendToUser(
        recipient.fcmToken,
        `New message · ${order.orderId}`,
        text.trim(),
        { orderId: String(order._id), type: 'order_message' }
      ).catch((e) => console.error('[sendMessage] notification failed:', e));
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

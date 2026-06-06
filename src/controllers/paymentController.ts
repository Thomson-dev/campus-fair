import crypto from 'crypto';
import { Request, Response } from 'express';
import Order from '../models/Order';

const PAYSTACK_BASE = 'https://api.paystack.co';

// ── Initialize payment (student calls this before Paystack SDK) ───────────────

export const initializePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, email, metadata } = req.body as { amount: number; email: string; metadata?: Record<string, unknown> };
    const reference = `CF-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const paystackRes = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env['PAYSTACK_SECRET_KEY']}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: Math.round(amount * 100), email, reference, metadata }),
    });

    const data = await paystackRes.json() as { status: boolean; data?: { authorization_url: string; reference: string } };
    if (!data.status || !data.data) {
      res.status(502).json({ success: false, message: 'Paystack initialization failed' });
      return;
    }

    res.json({ success: true, reference: data.data.reference, authorization_url: data.data.authorization_url });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Webhook (Paystack calls this server-side) ─────────────────────────────────

export const paystackWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const secret = process.env['PAYSTACK_SECRET_KEY'] as string;
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = req.body as Buffer;

    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      res.status(401).json({ success: false, message: 'Invalid signature' });
      return;
    }

    const event = JSON.parse(rawBody.toString()) as { event: string; data: { reference: string; amount: number } };

    if (event.event === 'charge.success') {
      const { reference } = event.data;
      await Order.findOneAndUpdate(
        { paystackReference: reference, paidAt: { $exists: false } },
        { $set: { paidAt: new Date(), status: 'pending' } }
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', (err as Error).message);
    res.sendStatus(200); // Always 200 to Paystack
  }
};

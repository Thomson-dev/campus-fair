import Order from '../models/Order';
import User from '../models/User';
import { sendToUser } from '../utils/notify';

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export async function expirePendingOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - PENDING_TTL_MS);
  const stale = await Order.find({ status: 'pending', createdAt: { $lt: cutoff } });
  if (stale.length === 0) return;

  for (const order of stale) {
    order.status = 'expired';
    order.statusHistory.push({ status: 'expired', timestamp: new Date() });
    await order.save();

    const student = await User.findById(order.student).select('fcmToken');
    if (student?.fcmToken) {
      sendToUser(
        student.fcmToken,
        'Order expired',
        `Your order ${order.orderId} wasn't confirmed in time and has expired.`,
        { orderId: String(order._id), type: 'order_status', status: 'expired' }
      ).catch((e) => console.error('[expirePendingOrders] notification failed:', e));
    }
  }

  console.log(`[expirePendingOrders] expired ${stale.length} order(s)`);
}

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

export function startExpireOrdersJob(): void {
  expirePendingOrders().catch((e) => console.error('[expirePendingOrders] initial run failed:', e));
  setInterval(() => {
    expirePendingOrders().catch((e) => console.error('[expirePendingOrders] sweep failed:', e));
  }, SWEEP_INTERVAL_MS);
}

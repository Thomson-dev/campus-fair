import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  const serviceAccount = process.env['FIREBASE_SERVICE_ACCOUNT'];
  if (serviceAccount) {
    initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
    console.log('[notify] Firebase Admin initialised');
  } else {
    console.warn('[notify] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
  }
}

export async function sendToUser(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (!fcmToken || !getApps().length) return;
  try {
    await getMessaging().send({
      token: fcmToken,
      notification: { title, body },
      android: {
        priority: 'high',
        notification: { channelId: 'campus_fair_alerts', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default' } },
      },
      data,
    });
  } catch (err) {
    console.error('[notify] FCM send failed:', (err as Error).message);
  }
}

export async function sendToMany(
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await Promise.all(fcmTokens.map((token) => sendToUser(token, title, body, data)));
}

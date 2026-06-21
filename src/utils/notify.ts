import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  const serviceAccount = process.env['FIREBASE_SERVICE_ACCOUNT'];
  if (serviceAccount) {
    initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
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
    await getMessaging().send({ token: fcmToken, notification: { title, body }, data });
  } catch (err) {
    console.error('[notify] FCM send failed:', (err as Error).message);
  }
}

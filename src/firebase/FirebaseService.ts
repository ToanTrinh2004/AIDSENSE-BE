import { Injectable } from '@nestjs/common';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseService {
  private app: App;

  constructor() {
    const apps = getApps();
    if (!apps.length) {
      this.app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.app = apps[0];
    }
  }

  async sendPush(fcmToken: string, title: string, body: string) {
    try {
      await getMessaging(this.app).send({
        token: fcmToken,
        notification: { title, body },
      });
      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error.message);
      throw new Error('Failed to send push notification');
    }
  }
}
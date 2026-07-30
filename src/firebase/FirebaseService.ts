import { Inject, Injectable } from '@nestjs/common';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FirebaseService {
  private app: App;

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {
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
    }
  }

  async sendPushToUser(userId: string, title: string, body: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('fcm_token_android, fcm_token_ios')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Failed to look up user for push notification:', error?.message);
      return;
    }

    if (user.fcm_token_android) {
      await this.sendPush(user.fcm_token_android, title, body);
    }
    if (user.fcm_token_ios) {
      await this.sendPush(user.fcm_token_ios, title, body);
    }
  }
}
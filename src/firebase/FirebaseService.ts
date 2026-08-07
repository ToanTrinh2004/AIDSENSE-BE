import { Inject, Injectable, Logger } from '@nestjs/common';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FirebaseService {
  private app: App;
  private readonly logger = new Logger(FirebaseService.name);

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

  async sendPush(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      await getMessaging(this.app).send({
        token: fcmToken,
        notification: { title, body },
        data: data ?? {},
      });
      this.logger.debug(`Push gửi thành công tới token=${fcmToken.slice(0, 12)}...`);
    } catch (error) {
      this.logger.error(
        `Lỗi gửi push tới token=${fcmToken.slice(0, 12)}...: ${error.message}`,
      );
    }
  }

  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('fcm_token_android, fcm_token_ios')
      .eq('id', userId)
      .single();

    if (error || !user) {
      this.logger.error(
        `Không tìm thấy user=${userId} để gửi push: ${error?.message}`,
      );
      return;
    }

    if (!user.fcm_token_android && !user.fcm_token_ios) {
      this.logger.warn(`User=${userId} không có FCM token nào -> bỏ qua push`);
      return;
    }

    if (user.fcm_token_android) {
      await this.sendPush(user.fcm_token_android, title, body, data);
    }
    if (user.fcm_token_ios) {
      await this.sendPush(user.fcm_token_ios, title, body, data);
    }
  }
}
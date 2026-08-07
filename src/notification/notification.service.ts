import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { Messages } from '../utils/messages';
import { QueryNotificationDto } from './dto/notification.dto';
import { FirebaseService } from 'src/firebase/FirebaseService';
import { BroadcastNotificationDto, NotificationType } from 'src/firebase/NotificationPayloadDto';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  content: string;
  imageUrl?: string;
  type: NotificationType | string;
  action?: string;
  requestId?: string;
  data?: Record<string, any>;
  extraPayload?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly firebaseService: FirebaseService,
  ) {}

  async createAndSend(params: CreateNotificationParams) {
    const { userId, title, content, imageUrl, type, action, requestId, data, extraPayload } = params;

    const { data: notification, error } = await this.supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        content,
        image_url: imageUrl,
        type,
        action,
        request_id: requestId,
        data,
      }])
      .select()
      .single();

    if (error) {
      // Log đầy đủ chi tiết lỗi (code, message, hint) thay vì nuốt âm thầm.
      // Lỗi phổ biến nhất ở đây là: type value không nằm trong enum/CHECK constraint
      // của cột `type` trong bảng notifications -> cần ALTER TYPE thêm value mới.
      this.logger.error(
        `Insert notification THẤT BẠI cho user=${userId}, type=${type}: ` +
        `code=${error.code}, message=${error.message}, details=${error.details}, hint=${error.hint}`,
      );
      throw new BadRequestException(
        `Không thể tạo notification (type=${type}): ${error.message}`,
      );
    }

    this.logger.log(
      `Đã tạo notification id=${notification.id} cho user=${userId}, type=${type}`,
    );

    const fcmData: Record<string, string> = {
      notification_id: notification.id,
      type,
      title,
      content,
      time: notification.created_at,
    };
    if (action) fcmData.action = action;
    if (requestId) fcmData.request_id = requestId;
    if (extraPayload) fcmData.payload = JSON.stringify(extraPayload);

    try {
      await this.firebaseService.sendPushToUser(userId, title, content, fcmData);
      this.logger.debug(`Đã gửi FCM cho user=${userId} (notification=${notification.id})`);
    } catch (pushErr) {
      // Notification đã lưu DB thành công, chỉ push FCM lỗi -> không throw,
      // chỉ log để không làm hỏng flow của caller (vd: notifyNearbyTeams).
      this.logger.error(
        `Gửi FCM lỗi cho user=${userId} (notification=${notification.id}): ${pushErr?.message ?? pushErr}`,
      );
    }

    return notification;
  }

  async broadcastNotification(dto: BroadcastNotificationDto) {
    const { title, content, image_url } = dto;

    const { data: users, error } = await this.supabase
      .from('users')
      .select('id, fcm_token_android, fcm_token_ios');

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!users || users.length === 0) {
      return { success: true, message: Messages.broadcastSent, total_users: 0, sent: 0, failed: 0 };
    }

    const notificationRows = users.map((u) => ({
      user_id: u.id,
      title,
      content,
      image_url,
      type: NotificationType.ANNOUNCEMENT,
      action: 'broadcast',
    }));

    const { data: insertedNotifications, error: insertError } = await this.supabase
      .from('notifications')
      .insert(notificationRows)
      .select('id, user_id, created_at');

    if (insertError) {
      this.logger.error(`Broadcast insert lỗi: ${insertError.message}`);
      throw new BadRequestException(insertError.message);
    }

    const notificationByUser = new Map(
      (insertedNotifications ?? []).map((n) => [n.user_id, n]),
    );

    let sent = 0;
    let failed = 0;

    for (const u of users) {
      const notification = notificationByUser.get(u.id);
      if (!notification) {
        failed++;
        continue;
      }

      const fcmData = {
        notification_id: notification.id,
        type: NotificationType.ANNOUNCEMENT,
        action: 'broadcast',
        title,
        content,
        time: notification.created_at,
      };

      try {
        if (u.fcm_token_android) {
          await this.firebaseService.sendPush(u.fcm_token_android, title, content, fcmData);
        }
        if (u.fcm_token_ios) {
          await this.firebaseService.sendPush(u.fcm_token_ios, title, content, fcmData);
        }
        sent++;
      } catch (err) {
        this.logger.error(`Broadcast push lỗi cho user=${u.id}: ${err?.message ?? err}`);
        failed++;
      }
    }

    return {
      success: true,
      message: Messages.broadcastSent,
      total_users: users.length,
      sent,
      failed,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new BadRequestException(Messages.notificationNotFound);
    }

    return { success: true, message: Messages.notificationMarkedRead, data };
  }

  async markAllAsRead(userId: string) {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { success: true, message: Messages.allNotificationsMarkedRead };
  }

  async getNotifications(userId: string, query: QueryNotificationDto) {
    const {
      page = 1,
      limit = 10,
      unread_only,
      type,
      exclude_type,
    } = query;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let request = this.supabase
      .from('notifications')
      .select(
        'id, title, content, image_url, type, action, request_id, is_read, created_at',
        { count: 'exact' },
      )
      .eq('user_id', userId);

    if (unread_only) {
      request = request.eq('is_read', false);
    }

    if (type) {
      request = request.eq('type', type);
    }

    if (exclude_type) {
      request = request.neq('type', exclude_type);
    }

    const { data, error, count } = await request
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new BadRequestException(error.message);
    }

    let unreadRequest = this.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (type) {
      unreadRequest = unreadRequest.eq('type', type);
    }

    if (exclude_type) {
      unreadRequest = unreadRequest.neq('type', exclude_type);
    }

    const {
      count: unreadCount,
      error: unreadError,
    } = await unreadRequest;

    if (unreadError) {
      throw new BadRequestException(unreadError.message);
    }

    return {
      data,
      unread_count: unreadCount ?? 0,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }

  async getNotificationDetail(notificationId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new BadRequestException(Messages.notificationNotFound);
    }

    if (!data.is_read) {
      await this.supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    }

    return data;
  }
}
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { Messages } from '../utils/messages';
import { QueryNotificationDto } from './dto/notification.dto';
import { FirebaseService } from 'src/firebase/FirebaseService';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  content: string;
  imageUrl?: string;
  type: string;
  action?: string;
  requestId?: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly firebaseService: FirebaseService,
  ) {}

  async createAndSend(params: CreateNotificationParams) {
    const { userId, title, content, imageUrl, type, action, requestId, data } = params;

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
      console.error('Failed to create notification:', error.message);
      return null;
    }

   
    const fcmData: Record<string, string> = {
      notification_id: notification.id,
      type,
    };
    if (action) fcmData.action = action;
    if (requestId) fcmData.request_id = requestId;

    await this.firebaseService.sendPushToUser(userId, title, content, fcmData);

    return notification;
  }

  async getNotifications(userId: string, query: QueryNotificationDto) {
    const { page = 1, limit = 10, unread_only } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let request = this.supabase
      .from('notifications')
      .select('id, title, content, image_url, type, action, request_id, is_read, created_at', { count: 'exact' })
      .eq('user_id', userId);

    if (unread_only) {
      request = request.eq('is_read', false);
    }

    const { data, error, count } = await request
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      data,
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
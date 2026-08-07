import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Inject, Injectable } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationService } from 'src/notification/notification.service';
  
  @Injectable()
  @WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
  export class ChatGateway {
    @WebSocketServer()
    server: Server;
  
    constructor(
      private readonly jwtService: JwtService,
      @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
      private readonly notificationService: NotificationService,
    ) {}
  
    private async getUserFromSocket(client: Socket): Promise<any | null> {
      const token = client.handshake.auth?.token;
      if (!token) return null;
      try {
        return await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET });
      } catch {
        return null;
      }
    }
  
    private roomName(sosId: string): string {
      return `chat:${sosId}`;
    }
  
    // Leader hoặc user tạo SOS join room chat sau khi đã accept
    @SubscribeMessage('chat:join')
    async handleJoinChat(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { sos_id: string },
    ) {
      const user = await this.getUserFromSocket(client);
      if (!user) return;
  
      // Xác thực: chỉ leader của team đang xử lý SOS này, hoặc user tạo SOS này mới được join
      const { data: sos } = await this.supabase
        .from('sos_request')
        .select('userid, teamId')
        .eq('id', data.sos_id)
        .single();
  
      if (!sos) return;
  
      let isAuthorized = sos.userid === user.id;
  
      if (!isAuthorized && sos.teamId) {
        const { data: team } = await this.supabase
          .from('team_rescue')
          .select('leader_id')
          .eq('id', sos.teamId)
          .single();
        isAuthorized = team?.leader_id === user.id;
      }
  
      if (!isAuthorized) return;
  
      client.join(this.roomName(data.sos_id));
    }
  
    @SubscribeMessage('chat:send_message')
async handleSendMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { sos_id: string; content: string },
) {
  const user = await this.getUserFromSocket(client);
  if (!user) return;

  const { data: message, error } = await this.supabase
    .from('chat_messages')
    .insert([{ sos_id: data.sos_id, sender_id: user.id, content: data.content }])
    .select()
    .single();

  if (error) return;

  this.server.to(this.roomName(data.sos_id)).emit('chat:new_message', message);

  // Xác định người nhận (không phải người vừa gửi) để bắn FCM
  const { data: sos } = await this.supabase
    .from('sos_request')
    .select('userid, teamId')
    .eq('id', data.sos_id)
    .single();

  if (!sos) return;

  let recipientId: string | null = null;

  if (sos.userid === user.id) {
    // Người gửi là user (nạn nhân) -> người nhận là leader của team
    if (sos.teamId) {
      const { data: team } = await this.supabase
        .from('team_rescue')
        .select('leader_id')
        .eq('id', sos.teamId)
        .single();
      recipientId = team?.leader_id ?? null;
    }
  } else {
    // Người gửi là leader -> người nhận là user (nạn nhân)
    recipientId = sos.userid;
  }

  if (!recipientId) return;

  const { data: senderInfo } = await this.supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  await this.notificationService.createAndSend({
    userId: recipientId,
    title: senderInfo?.username || 'Tin nhắn mới',
    content: data.content,
    type: 'chat',
    action: 'new_message',
    requestId: data.sos_id,
    data: { sos_id: data.sos_id, sender_id: user.id, message_id: message.id },
    extraPayload: { sos_id: data.sos_id, sender_id: user.id, sender_name: senderInfo?.username },
  });
}
  
    // Gọi từ TeamService khi leader accept SOS, báo cho cả 2 phía biết room đã sẵn sàng
    notifyRoomReady(sosId: string, leaderId: string, userId: string) {
      this.server.emit('chat:room_ready', { sos_id: sosId, leader_id: leaderId, user_id: userId });
    }
  }
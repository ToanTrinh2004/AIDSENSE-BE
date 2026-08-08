import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { FirebaseService } from 'src/firebase/FirebaseService';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly firebaseService: FirebaseService,
  ) {}

  private async getUserFromSocket(client: Socket): Promise<any | null> {
    const token = client.handshake.auth?.token;
    if (!token) {
      this.logger.warn(`Client ${client.id} has no token`);
      return null;
    }
    try {
      return await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET });
    } catch (err) {
      this.logger.warn(`Client ${client.id} invalid token: ${err.message}`);
      return null;
    }
  }

  private roomName(sosId: string): string {
    return `chat:${sosId}`;
  }

  async handleConnection(client: Socket) {
    const user = await this.getUserFromSocket(client);
    if (!user) {
      this.logger.warn(`Rejecting connection ${client.id} — invalid/missing token`);
      client.disconnect();
      return;
    }
    this.logger.log(`Client connected: ${client.id}, user: ${user.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sos_id: string },
  ) {
    const user = await this.getUserFromSocket(client);
    if (!user) return;

    this.logger.log(`User ${user.id} attempting to join chat for sos_id=${data.sos_id}`);

    const { data: sos, error: sosError } = await this.supabase
      .from('sos_request')
      .select('userid, teamId')
      .eq('id', data.sos_id)
      .single();

    if (sosError || !sos) {
      this.logger.warn(`join failed — sos_id ${data.sos_id} not found: ${sosError?.message}`);
      return;
    }

    let isAuthorized = sos.userid === user.id;

    if (!isAuthorized && sos.teamId) {
      const { data: team } = await this.supabase
        .from('team_rescue')
        .select('leader_id')
        .eq('id', sos.teamId)
        .single();
      isAuthorized = team?.leader_id === user.id;
    }

    if (!isAuthorized) {
      this.logger.warn(`User ${user.id} UNAUTHORIZED to join chat for sos_id=${data.sos_id}`);
      return;
    }

    client.join(this.roomName(data.sos_id));
    this.logger.log(`User ${user.id} joined room ${this.roomName(data.sos_id)}`);
  }

  @SubscribeMessage('chat:send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sos_id: string; content: string },
  ) {
    const user = await this.getUserFromSocket(client);
    if (!user) return;

    this.logger.log(`User ${user.id} sending message to sos_id=${data.sos_id}: "${data.content}"`);

    const { data: message, error } = await this.supabase
      .from('chat_messages')
      .insert([{ sos_id: data.sos_id, sender_id: user.id, content: data.content }])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to insert chat message: ${error.message}`);
      return;
    }

    this.server.to(this.roomName(data.sos_id)).emit('chat:new_message', message);
    this.logger.log(`Message ${message.id} emitted to room ${this.roomName(data.sos_id)}`);

    const { data: sos } = await this.supabase
      .from('sos_request')
      .select('userid, teamId')
      .eq('id', data.sos_id)
      .single();

    if (!sos) {
      this.logger.warn(`Cannot resolve recipient — sos_id ${data.sos_id} not found`);
      return;
    }

    let recipientId: string | null = null;

    if (sos.userid === user.id) {
      if (sos.teamId) {
        const { data: team } = await this.supabase
          .from('team_rescue')
          .select('leader_id')
          .eq('id', sos.teamId)
          .single();
        recipientId = team?.leader_id ?? null;
      }
    } else {
      recipientId = sos.userid;
    }

    if (!recipientId) {
      this.logger.warn(`No recipient resolved for sos_id=${data.sos_id}, sender=${user.id}`);
      return;
    }

    const { data: senderInfo } = await this.supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    this.logger.log(`Sending FCM (no DB record) to recipient=${recipientId}`);

    // Chỉ gửi FCM, không lưu vào bảng notifications
    await this.firebaseService.sendPushToUser(
      recipientId,
      senderInfo?.username || 'Tin nhắn mới',
      data.content,
      {
        type: 'chat',
        action: 'new_message',
        sos_id: data.sos_id,
        sender_id: user.id,
        message_id: message.id,
      },
    );
  }

  notifyRoomReady(sosId: string, leaderId: string, userId: string) {
    this.logger.log(`Room ready for sos_id=${sosId}, leader=${leaderId}, user=${userId}`);
    this.server.emit('chat:room_ready', { sos_id: sosId, leader_id: leaderId, user_id: userId });
  }
}
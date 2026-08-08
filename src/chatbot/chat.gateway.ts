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
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly firebaseService: FirebaseService,
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

  private async getUserInfo(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, username, avatar')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      userId: data.id,
      name: data.username,
      avatar: data.avatar,
    };
  }

  async handleConnection(client: Socket) {
    const user = await this.getUserFromSocket(client);
    if (!user) {
      this.logger.warn(`Rejecting connection ${client.id} — invalid/missing token`);
      client.disconnect();
      return;
    }

    client.data.user = user;

    if (!this.onlineUsers.has(user.id)) {
      this.onlineUsers.set(user.id, new Set());
    }
    this.onlineUsers.get(user.id)!.add(client.id);

    this.logger.log(`Client connected: ${client.id}, user: ${user.id}`);
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user) {
      const sockets = this.onlineUsers.get(user.id);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(user.id);
        }
      }
      this.logger.log(`Client disconnected: ${client.id}, user: ${user.id}`);
    }
  }

  private isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0;
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

    let leaderId: string | null = null;
    if (sos.teamId) {
      const { data: team } = await this.supabase
        .from('team_rescue')
        .select('leader_id')
        .eq('id', sos.teamId)
        .single();
      leaderId = team?.leader_id ?? null;
    }

    const isAuthorized = sos.userid === user.id || leaderId === user.id;

    if (!isAuthorized) {
      this.logger.warn(`User ${user.id} UNAUTHORIZED to join chat for sos_id=${data.sos_id}`);
      return;
    }

    client.join(this.roomName(data.sos_id));
    this.logger.log(`User ${user.id} joined room ${this.roomName(data.sos_id)}`);

    // Xác định thông tin của "đối phương" để gửi ngược lại cho người vừa join
    const otherPartyId = sos.userid === user.id ? leaderId : sos.userid;
    const otherPartyInfo = otherPartyId ? await this.getUserInfo(otherPartyId) : null;

    client.emit('chat:joined', {
      sos_id: data.sos_id,
      other_party: otherPartyInfo,
    });
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

    if (this.isUserOnline(recipientId)) {
      this.logger.log(`Recipient ${recipientId} is online — skip FCM`);
      return;
    }

    const { data: senderInfo } = await this.supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    this.logger.log(`Recipient ${recipientId} is OFFLINE — sending FCM`);

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

  // Gọi từ TeamService khi leader accept SOS — báo cả 2 bên, kèm đầy đủ thông tin của nhau
  async notifyRoomReady(sosId: string, leaderId: string, userId: string) {
    this.logger.log(`Room ready for sos_id=${sosId}, leader=${leaderId}, user=${userId}`);

    const [leaderInfo, userInfo] = await Promise.all([
      this.getUserInfo(leaderId),
      this.getUserInfo(userId),
    ]);

    this.server.emit('chat:room_ready', {
      sos_id: sosId,
      leader: leaderInfo,
      user: userInfo,
    });
  }
}
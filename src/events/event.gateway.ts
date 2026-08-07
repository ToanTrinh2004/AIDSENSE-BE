import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Injectable } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  
  @Injectable()
  @WebSocketGateway({ cors: { origin: '*' } })
  export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    constructor(private readonly jwtService: JwtService) {}
  
    async handleConnection(client: Socket) {
      const token = client.handshake.auth?.token;
  
      if (!token) {
        console.log('Client rejected (no token):', client.id);
        client.disconnect();
        return;
      }
  
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
        client.data.user = payload;
        console.log('Client connected:', client.id, 'user:', payload.id);
      } catch {
        console.log('Client rejected (invalid token):', client.id);
        client.disconnect();
      }
    }
  
    handleDisconnect(client: Socket) {
      console.log('Client disconnected:', client.id);
    }
  
    @SubscribeMessage('subscribe')
    handleSubscribe(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { channel: string },
    ) {
      client.join(data.channel);
      console.log(`Client ${client.id} joined channel: ${data.channel}`);
    }
  
    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { channel: string },
    ) {
      client.leave(data.channel);
      console.log(`Client ${client.id} left channel: ${data.channel}`);
    }
  
    // Gọi từ AdminService khi admin duyệt SOS (REQUESTED -> PENDING)
    emitNewSos(sosData: any) {
      this.server.to('sos-feed').emit('sos:new_request', sosData);
    }
  
    // Gọi cùng lúc với emitNewSos, để client đang xem bản đồ biết cần fetch lại viewport
    emitMapUpdated(lat: number, lon: number) {
      this.server.to('sos-map').emit('sos:map_updated', { lat, lon });
    }
  }
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Inject, Injectable, Logger } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import Redis from 'ioredis';
  import { SupabaseClient } from '@supabase/supabase-js';
  import { NotificationService } from 'src/notification/notification.service';
  
  const LOCATION_TTL_SECONDS = 90;
  const LOCATION_KEY_PREFIX = 'live_location:';
  
  @Injectable()
  @WebSocketGateway({
    namespace: '/team/live_mode',
    cors: {
      origin: '*',
    },
  })
  export class TeamGateway {
    @WebSocketServer()
    server: Server;
  
    private readonly logger = new Logger(TeamGateway.name);
  
    constructor(
      private readonly jwtService: JwtService,
  
      @Inject('REDIS_CLIENT')
      private readonly redis: Redis,
  
      @Inject('SUPABASE_CLIENT')
      private readonly supabase: SupabaseClient,
  
      private readonly notificationService: NotificationService,
    ) {}
  
    private async getUserFromSocket(client: Socket): Promise<any | null> {
      const token = client.handshake.auth?.token;
  
      if (!token) {
        this.logger.warn(`Socket ${client.id} thiếu token, disconnecting`);
        return null;
      }
  
      try {
        const user = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET,
        });
        this.logger.debug(`Socket ${client.id} xác thực thành công: user=${user?.id}`);
        return user;
      } catch (err) {
        this.logger.warn(`Socket ${client.id} verify token thất bại: ${err?.message}`);
        return null;
      }
    }
  
    /**
     * Leader bật/tắt live mode + thiết lập bán kính nhận SOS (mét)
     */
    @SubscribeMessage('team:toggle_live_mode')
    async handleToggleLiveMode(
      @ConnectedSocket() client: Socket,
      @MessageBody()
      data: {
        active: boolean;
        radius_meters: number;
      },
    ) {
      const user = await this.getUserFromSocket(client);
  
      if (!user) return;
  
      const { data: team } = await this.supabase
        .from('team_rescue')
        .select('id')
        .eq('leader_id', user.id)
        .single();
  
      if (!team) {
        this.logger.warn(`User ${user.id} không phải leader của team nào`);
        return;
      }
  
      const key = `${LOCATION_KEY_PREFIX}${team.id}`;
  
      // Turn off live mode
      if (!data.active) {
        await this.redis.del(key);
        this.logger.log(`Team ${team.id} đã TẮT live mode`);
        return;
      }
  
      // Clamp radius to 1km -> 500km
      const radiusMeters = Math.min(
        Math.max(data.radius_meters, 1000),
        500000,
      );
  
      client.data.pendingRadius = radiusMeters;
      client.data.teamId = team.id;
  
      this.logger.log(
        `Team ${team.id} đã BẬT live mode, radius=${radiusMeters}m`,
      );
    }
  
    /**
     * Leader cập nhật vị trí định kỳ
     */
    @SubscribeMessage('team:update_location')
    async handleUpdateLocation(
      @ConnectedSocket() client: Socket,
      @MessageBody()
      data: {
        lat: number;
        lon: number;
      },
    ) {
      const user = await this.getUserFromSocket(client);
  
      if (!user) return;
  
      const { data: team } = await this.supabase
        .from('team_rescue')
        .select('id')
        .eq('leader_id', user.id)
        .single();
  
      if (!team) return;
  
      // Default 1000m if leader hasn't chosen a radius yet
      const radiusMeters = client.data.pendingRadius ?? 1000;
  
      const key = `${LOCATION_KEY_PREFIX}${team.id}`;
  
      await this.redis.set(
        key,
        JSON.stringify({
          lat: data.lat,
          lon: data.lon,
          radius_meters: radiusMeters,
          updated_at: new Date().toISOString(),
        }),
        'EX',
        LOCATION_TTL_SECONDS,
      );
  
      this.logger.debug(
        `Team ${team.id} cập nhật vị trí lat=${data.lat}, lon=${data.lon}`,
      );
    }
  
    /**
     * Haversine distance (meters)
     */
    private haversineDistance(
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ): number {
      const R = 6371000;
  
      const toRad = (deg: number) => (deg * Math.PI) / 180;
  
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
  
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) ** 2;
  
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
      return R * c;
    }
  
    /**
     * Called by AdminService after SOS approval.
     * Notify every team whose live location is inside its configured radius.
     */
    async notifyNearbyTeams(sos: {
      id: string;
      lat: number;
      lon: number;
      description?: string;
      type?: string;
    }) {
      this.logger.log(`Bắt đầu quét team gần SOS ${sos.id}`);
  
      const matchedTeamIds: string[] = [];
  
      let cursor = '0';
  
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `${LOCATION_KEY_PREFIX}*`,
          'COUNT',
          100,
        );
  
        cursor = nextCursor;
  
        for (const key of keys) {
          const raw = await this.redis.get(key);
  
          if (!raw) continue;
  
          const {
            lat,
            lon,
            radius_meters,
          }: {
            lat: number;
            lon: number;
            radius_meters: number;
          } = JSON.parse(raw);
  
          const distance = this.haversineDistance(
            sos.lat,
            sos.lon,
            lat,
            lon,
          );
  
          const teamId = key.replace(LOCATION_KEY_PREFIX, '');
          this.logger.debug(
            `SOS ${sos.id} vs team ${teamId}: distance=${Math.round(distance)}m, radius=${radius_meters}m`,
          );
  
          if (distance <= radius_meters) {
            matchedTeamIds.push(teamId);
          }
        }
      } while (cursor !== '0');
  
      this.logger.log(
        `SOS ${sos.id}: tìm thấy ${matchedTeamIds.length} team trong bán kính -> [${matchedTeamIds.join(', ')}]`,
      );
  
      if (matchedTeamIds.length === 0) {
        return;
      }
  
      const { data: members, error } = await this.supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', matchedTeamIds)
        .eq('status', 'ACTIVE');
  
      this.logger.log(
        `SOS ${sos.id}: query team_members -> ${members?.length ?? 0} member(s), error=${error?.message ?? 'none'}`,
      );
  
      if (error || !members) {
        this.logger.error(
          `Lỗi lấy team_members cho SOS ${sos.id}: ${error?.message}`,
        );
        return;
      }
  
      const payload = {
        sos_id: sos.id,
        type: sos.type,
        description: sos.description,
        lat: sos.lat,
        lon: sos.lon,
      };
  
      const results = await Promise.allSettled(
        members.map((member) =>
          this.notificationService.createAndSend({
            userId: member.user_id,
            title: 'Có SOS mới gần khu vực đội bạn',
            content:
              sos.description ??
              'Yêu cầu cứu hộ mới gần vị trí đội bạn',
            type: 'sos_request',
            action: 'nearby',
            requestId: sos.id,
            data: payload,
            extraPayload: payload,
          }),
        ),
      );
  
      results.forEach((result, i) => {
        const userId = members[i].user_id;
        if (result.status === 'fulfilled') {
          this.logger.debug(`Noti gửi OK cho user ${userId} (SOS ${sos.id})`);
        } else {
          this.logger.error(
            `Noti gửi LỖI cho user ${userId} (SOS ${sos.id}): ${result.reason?.message ?? result.reason}`,
          );
        }
      });
  
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      this.logger.log(
        `Đã gửi notification cho ${successCount}/${members.length} thành viên (SOS ${sos.id})`,
      );
  
      this.server.to('sos-feed').emit('sos:nearby_alert', payload);
    }
  }
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SosModule } from './sos/sos.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './auth/constant';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { UserModule } from './user/user.module';
import { TeamModule } from './team/team.module';
import { EventsModule } from './events/events.module';
import { AdminModule } from './admin/admin.module';
import { RedisProvider } from './RedisService';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    SosModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '1d' },
    }),
    UserModule,
    TeamModule,
    EventsModule,
    AdminModule,
    ChatbotModule,

    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 10000,   // 10 seconds
        limit: 10,    // default: 10 req / 10s per IP
      },
      {
        name: 'medium',
        ttl: 60000,   // 1 minute
        limit: 60,    // default: 60 req / min per IP
      },
    ]),
  ],

  controllers: [AppController],
  providers: [
    AppService,
    CloudinaryService,
    RedisProvider,
    // Apply throttler globally to every route
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
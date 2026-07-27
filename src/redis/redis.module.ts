import { Global, Module } from '@nestjs/common';
import { RedisProvider } from './redis.service';


@Global()
@Module({
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class RedisModule {}
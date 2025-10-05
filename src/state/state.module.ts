import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { createRedisClient } from 'src/lib/redis-client';
import { StateService } from './state.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: Redis, // inject this as the Redis instance
      useFactory: (configService: ConfigService): Redis => {
        const restUrl = configService.get<string>('UPSTASH_REDIS_REST_URL');
        const restToken = configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

        if (!restUrl || !restToken) {
          throw new Error('Missing Upstash Redis configuration values');
        }

        return createRedisClient(restUrl, restToken);
      },
      inject: [ConfigService],
    },
    StateService,
  ],
  exports: [StateService],
})
export class StateModule {}

import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  constructor(private readonly redis: Redis) {}


  async cacheSet<T>(key: string, value: T, ttlSeconds?: number) {
    await this.redis.set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined);
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(key);
  }

  async incrementRequestCount(ip: string, ttlSeconds = 60): Promise<number> {
    const key = `rate:${ip}`;
    const count = (await this.redis.incr(key)) || 0;
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }

  async isRateLimited(ip: string, maxRequests: number): Promise<boolean> {
    const key = `rate:${ip}`;
    const count = (await this.redis.get<number>(key)) || 0;
    return count > maxRequests;
  }


//   async publishNotice(channel: string, message: any) {
//     await this.redis.publish(channel, JSON.stringify(message));
//   }

 
//   onNotice(channel: string, callback: (msg: any) => void) {
//     // Upstash Redis supports Pub/Sub via WebSocket
//     this.logger.log(`Subscribed to ${channel}`);
//     // you'd hook this with @upstash/redis pub/sub client
//   }
}

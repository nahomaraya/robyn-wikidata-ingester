import { registerAs } from '@nestjs/config';

export default registerAs('upstash', () => ({
    redisUrl: process.env.UPSTASH_REDIS_REST_URL,
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    redisReadOnly: process.env.KV_REST_API_READ_ONLY_TOKEN,
    redisDefaultUrl: process.env.REDIS_URL,
    redisDb: "upstash-kv-red-yacht"
    
}));

import { Redis } from "@upstash/redis";
 
export const createRedisClient = (restUrl: string, restToken: string) => {
  
  const redis = new Redis({
    url: 'https://expert-akita-7149.upstash.io',
    token: 'ARvtAAImcDIwOTBkZTVkY2NkZTM0MTk0YWMzZjBlYTE5YjUwYzhjNnAyNzE0OQ',
  })
  return redis;
};


import { Redis } from 'ioredis';
// @ts-ignore
import Redlock from 'redlock';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);
export const publisher = new Redis(redisUrl);
export const subscriber = new Redis(redisUrl);

redis.on('error', (err: Error | any) => console.error('Redis error:', err));

export const redlock = new Redlock(
    [redis],
    {
        driftFactor: 0.01,
        retryCount: 10,
        retryDelay: 200, // time in ms
        retryJitter: 200,
    }
);

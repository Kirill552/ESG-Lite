import Redis from 'ioredis';

// Создаем единственный экземпляр Redis для всего приложения
let redisInstance: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisInstance.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    redisInstance.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  return redisInstance;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
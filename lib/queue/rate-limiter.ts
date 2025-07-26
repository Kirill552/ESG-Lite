import { getRedisConnection } from './redis';

interface RateLimitConfig {
  key: string;
  limit: number;
  window: number; // в секундах
}

export class RateLimiter {
  private redis = getRedisConnection();

  async checkLimit(config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const { key, limit, window } = config;
    const now = Date.now();
    const windowStart = now - window * 1000;

    // Используем sorted set для хранения временных меток
    const redisKey = `rate_limit:${key}`;

    // Удаляем старые записи
    await this.redis.zremrangebyscore(redisKey, '-inf', windowStart);

    // Получаем текущее количество
    const count = await this.redis.zcard(redisKey);

    if (count >= limit) {
      // Получаем время сброса (самая старая запись + window)
      const oldestTimestamp = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
      const resetAt = oldestTimestamp.length > 1 ? parseInt(oldestTimestamp[1]) + window * 1000 : now + window * 1000;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Добавляем новую запись
    await this.redis.zadd(redisKey, now, `${now}-${Math.random()}`);
    
    // Устанавливаем TTL на ключ
    await this.redis.expire(redisKey, window);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + window * 1000,
    };
  }

  async getRemainingLimit(config: RateLimitConfig): Promise<{ count: number; remaining: number; resetAt: number }> {
    const { key, limit, window } = config;
    const now = Date.now();
    const windowStart = now - window * 1000;

    const redisKey = `rate_limit:${key}`;

    // Удаляем старые записи
    await this.redis.zremrangebyscore(redisKey, '-inf', windowStart);

    // Получаем текущее количество
    const count = await this.redis.zcard(redisKey);

    // Получаем время сброса
    const oldestTimestamp = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
    const resetAt = oldestTimestamp.length > 1 ? parseInt(oldestTimestamp[1]) + window * 1000 : now + window * 1000;

    return {
      count,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  }
}

export const rateLimiter = new RateLimiter();

// Конфигурации для различных типов лимитов
export const RATE_LIMITS = {
  OCR_PER_ORG: {
    limit: 10,
    window: 90, // 90 секунд
    keyPrefix: 'ocr:org:',
  },
  EMAIL_PER_USER: {
    limit: 50,
    window: 3600, // 1 час
    keyPrefix: 'email:user:',
  },
  EXPORT_PER_ORG: {
    limit: 20,
    window: 3600, // 1 час
    keyPrefix: 'export:org:',
  },
} as const;
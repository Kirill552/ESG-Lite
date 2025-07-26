import { queueManager } from '../lib/queue/queue-manager';
import { QUEUE_NAMES } from '../lib/queue/types';
import { getRedisConnection } from '../lib/queue/redis';

async function checkQueueHealth() {
  console.log('🏥 Checking queue health...\n');

  try {
    // Проверяем подключение к Redis
    const redis = getRedisConnection();
    const pingResult = await redis.ping();
    console.log(`✅ Redis connection: ${pingResult}`);

    // Создаем очереди
    Object.values(QUEUE_NAMES).forEach((queueName) => {
      queueManager.createQueue({ name: queueName });
    });

    console.log('\n📊 Queue Statistics:\n');
    console.log('Queue Name                    | Waiting | Active | Completed | Failed | Delayed | Total');
    console.log('-----------------------------|---------|--------|-----------|--------|---------|-------');

    for (const queueName of Object.values(QUEUE_NAMES)) {
      try {
        const stats = await queueManager.getQueueStats(queueName);
        const paddedName = queueName.padEnd(28);
        const waiting = stats.waiting.toString().padStart(7);
        const active = stats.active.toString().padStart(6);
        const completed = stats.completed.toString().padStart(9);
        const failed = stats.failed.toString().padStart(6);
        const delayed = stats.delayed.toString().padStart(7);
        const total = stats.total.toString().padStart(5);

        console.log(`${paddedName} | ${waiting} | ${active} | ${completed} | ${failed} | ${delayed} | ${total}`);
      } catch (error) {
        console.error(`❌ Error getting stats for ${queueName}:`, error);
      }
    }

    // Проверяем воркеры
    console.log('\n👷 Worker Status:\n');
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const worker = queueManager.getWorker(queueName);
      if (worker) {
        console.log(`✅ ${queueName}: Worker is registered`);
      } else {
        console.log(`⚠️  ${queueName}: No worker registered`);
      }
    }

    console.log('\n✅ Queue health check completed!');
  } catch (error) {
    console.error('❌ Queue health check failed:', error);
    process.exit(1);
  } finally {
    await queueManager.closeAll();
    process.exit(0);
  }
}

// Запускаем проверку
checkQueueHealth();
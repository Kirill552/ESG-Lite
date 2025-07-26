import { queueManager } from '../lib/queue/queue-manager';
import { QUEUE_NAMES } from '../lib/queue/types';
import './jobs/ocr.worker';
import './jobs/pdf-generation.worker';
import './jobs/carbon-score.worker';
// Импортируем другие воркеры по мере добавления

console.log('Starting workers...');

// Создаем очереди
const queues = [
  { name: QUEUE_NAMES.OCR, removeOnComplete: 100, removeOnFail: 500 },
  { name: QUEUE_NAMES.PDF_GENERATION, removeOnComplete: 100, removeOnFail: 500 },
  { name: QUEUE_NAMES.EMAIL, removeOnComplete: 1000, removeOnFail: 100 },
  { name: QUEUE_NAMES.DATA_EXPORT, removeOnComplete: 50, removeOnFail: 100 },
  { name: QUEUE_NAMES.CARBON_SCORE, removeOnComplete: 50, removeOnFail: 100 },
];

queues.forEach((config) => {
  queueManager.createQueue({
    name: config.name,
    defaultJobOptions: {
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
    },
  });
  console.log(`Queue ${config.name} created`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await queueManager.closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await queueManager.closeAll();
  process.exit(0);
});

// Периодически выводим статистику очередей
setInterval(async () => {
  console.log('\n=== Queue Statistics ===');
  for (const queueName of Object.values(QUEUE_NAMES)) {
    try {
      const stats = await queueManager.getQueueStats(queueName);
      console.log(`${queueName}: ${JSON.stringify(stats)}`);
    } catch (error) {
      console.error(`Error getting stats for ${queueName}:`, error);
    }
  }
  console.log('=======================\n');
}, 30000); // Каждые 30 секунд

console.log('Workers started successfully!');
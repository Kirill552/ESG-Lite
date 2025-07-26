import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedisConnection } from './redis';

export interface QueueConfig {
  name: string;
  defaultJobOptions?: {
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
  };
}

class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  createQueue(config: QueueConfig): Queue {
    const { name, defaultJobOptions } = config;
    
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const connection = getRedisConnection();
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100, // Хранить последние 100 выполненных задач
        removeOnFail: 500,     // Хранить последние 500 неудачных задач
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        ...defaultJobOptions,
      },
    });

    this.queues.set(name, queue);
    
    // Создаем QueueEvents для мониторинга
    const queueEvents = new QueueEvents(name, { connection });
    this.queueEvents.set(name, queueEvents);

    return queue;
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  registerWorker(name: string, worker: Worker): void {
    this.workers.set(name, worker);
  }

  getWorker(name: string): Worker | undefined {
    return this.workers.get(name);
  }

  getQueueEvents(name: string): QueueEvents | undefined {
    return this.queueEvents.get(name);
  }

  async closeAll(): Promise<void> {
    // Закрываем все воркеры
    await Promise.all(
      Array.from(this.workers.values()).map(worker => worker.close())
    );

    // Закрываем все очереди
    await Promise.all(
      Array.from(this.queues.values()).map(queue => queue.close())
    );

    // Закрываем все QueueEvents
    await Promise.all(
      Array.from(this.queueEvents.values()).map(events => events.close())
    );

    this.workers.clear();
    this.queues.clear();
    this.queueEvents.clear();
  }

  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + completed + failed + delayed + paused,
    };
  }
}

export const queueManager = QueueManager.getInstance();
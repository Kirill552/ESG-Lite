import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../lib/queue/redis';
import { OcrJobData, QUEUE_NAMES } from '../../lib/queue/types';
import { queueManager } from '../../lib/queue/queue-manager';
import { prisma } from '../../lib/prisma';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Tesseract from 'tesseract.js';
import { Readable } from 'stream';

// Инициализация S3 клиента
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'ru-central1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

async function processOcrJob(job: Job<OcrJobData>) {
  const { fileKey, userId, orgId, documentType } = job.data;

  try {
    // Обновляем прогресс
    await job.updateProgress(10);

    // Получаем файл из S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileKey,
    });

    const s3Response = await s3Client.send(getObjectCommand);
    const fileBuffer = await streamToBuffer(s3Response.Body as Readable);

    await job.updateProgress(30);

    // Выполняем OCR
    const ocrResult = await Tesseract.recognize(fileBuffer, 'rus+eng', {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          const progress = 30 + Math.floor(info.progress * 50);
          job.updateProgress(progress);
        }
      },
    });

    await job.updateProgress(80);

    // Сохраняем результат в базу данных
    const document = await prisma.document.create({
      data: {
        userId,
        orgId,
        type: documentType,
        fileKey,
        extractedText: ocrResult.data.text,
        confidence: ocrResult.data.confidence,
        status: 'completed',
        processedAt: new Date(),
      },
    });

    await job.updateProgress(100);

    // Возвращаем результат
    return {
      documentId: document.id,
      text: ocrResult.data.text,
      confidence: ocrResult.data.confidence,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Сохраняем ошибку в базу данных
    await prisma.document.create({
      data: {
        userId,
        orgId,
        type: documentType,
        fileKey,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

// Вспомогательная функция для преобразования потока в буфер
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Создаем и экспортируем воркер
export const ocrWorker = new Worker<OcrJobData>(
  QUEUE_NAMES.OCR,
  processOcrJob,
  {
    connection: getRedisConnection(),
    concurrency: 2, // Обрабатываем максимум 2 OCR задачи одновременно
    limiter: {
      max: 10,
      duration: 90000, // 90 секунд
    },
  }
);

// Обработка событий воркера
ocrWorker.on('completed', (job) => {
  console.log(`OCR job ${job.id} completed successfully`);
});

ocrWorker.on('failed', (job, error) => {
  console.error(`OCR job ${job?.id} failed:`, error);
});

ocrWorker.on('active', (job) => {
  console.log(`OCR job ${job.id} started processing`);
});

// Регистрируем воркер в менеджере
queueManager.registerWorker(QUEUE_NAMES.OCR, ocrWorker);
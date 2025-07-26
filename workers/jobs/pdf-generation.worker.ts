import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../lib/queue/redis';
import { PdfGenerationJobData, QUEUE_NAMES } from '../../lib/queue/types';
import { queueManager } from '../../lib/queue/queue-manager';
import { prisma } from '../../lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generatePDF296FZ } from '../../lib/pdf/generate-296fz';
import { generatePDFCBAM } from '../../lib/pdf/generate-cbam';

// Инициализация S3 клиента
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'ru-central1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

async function processPdfGenerationJob(job: Job<PdfGenerationJobData>) {
  const { reportType, reportId, userId, orgId, data } = job.data;

  try {
    await job.updateProgress(10);

    // Генерируем PDF в зависимости от типа отчета
    let pdfBuffer: Buffer;
    let fileName: string;

    if (reportType === '296fz') {
      pdfBuffer = await generatePDF296FZ(data);
      fileName = `reports/296fz/${orgId}/${reportId}.pdf`;
    } else if (reportType === 'cbam') {
      pdfBuffer = await generatePDFCBAM(data);
      fileName = `reports/cbam/${orgId}/${reportId}.pdf`;
    } else {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    await job.updateProgress(60);

    // Загружаем PDF в S3
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        userId,
        orgId,
        reportType,
        reportId,
      },
    });

    await s3Client.send(putObjectCommand);

    await job.updateProgress(80);

    // Сохраняем информацию о сгенерированном отчете в БД
    const report = await prisma.report.create({
      data: {
        id: reportId,
        userId,
        orgId,
        type: reportType,
        fileKey: fileName,
        status: 'completed',
        generatedAt: new Date(),
        metadata: data,
      },
    });

    await job.updateProgress(100);

    return {
      reportId: report.id,
      fileKey: fileName,
      url: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${fileName}`,
    };
  } catch (error) {
    console.error('PDF generation error:', error);

    // Обновляем статус отчета в БД
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

// Создаем и экспортируем воркер
export const pdfGenerationWorker = new Worker<PdfGenerationJobData>(
  QUEUE_NAMES.PDF_GENERATION,
  processPdfGenerationJob,
  {
    connection: getRedisConnection(),
    concurrency: 3, // Обрабатываем максимум 3 PDF одновременно
  }
);

// Обработка событий воркера
pdfGenerationWorker.on('completed', (job) => {
  console.log(`PDF generation job ${job.id} completed successfully`);
});

pdfGenerationWorker.on('failed', (job, error) => {
  console.error(`PDF generation job ${job?.id} failed:`, error);
});

pdfGenerationWorker.on('active', (job) => {
  console.log(`PDF generation job ${job.id} started processing`);
});

// Регистрируем воркер в менеджере
queueManager.registerWorker(QUEUE_NAMES.PDF_GENERATION, pdfGenerationWorker);
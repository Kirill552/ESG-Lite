import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../lib/queue/redis';
import { CarbonScoreJobData, QUEUE_NAMES } from '../../lib/queue/types';
import { queueManager } from '../../lib/queue/queue-manager';
import { prisma } from '../../lib/prisma';

async function processCarbonScoreJob(job: Job<CarbonScoreJobData>) {
  const { orgId, month, year, calculateEmissions } = job.data;

  try {
    await job.updateProgress(10);

    // Получаем все отчеты организации за указанный период
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const reports = await prisma.report.findMany({
      where: {
        orgId,
        type: '296fz',
        status: 'completed',
        generatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    await job.updateProgress(30);

    // Рассчитываем выбросы
    let totalEmissions = 0;
    let scope1Emissions = 0;
    let scope2Emissions = 0;
    let scope3Emissions = 0;

    if (calculateEmissions && reports.length > 0) {
      // Здесь должна быть логика расчета выбросов на основе данных из отчетов
      // Это упрощенный пример
      reports.forEach((report) => {
        const metadata = report.metadata as any;
        if (metadata?.emissions) {
          scope1Emissions += metadata.emissions.scope1 || 0;
          scope2Emissions += metadata.emissions.scope2 || 0;
          scope3Emissions += metadata.emissions.scope3 || 0;
        }
      });

      totalEmissions = scope1Emissions + scope2Emissions + scope3Emissions;
    }

    await job.updateProgress(60);

    // Получаем данные за предыдущий период для расчета изменений
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const previousScore = await prisma.carbonScore.findUnique({
      where: {
        orgId_month_year: {
          orgId,
          month: prevMonth,
          year: prevYear,
        },
      },
    });

    let reductionPercent = null;
    if (previousScore && previousScore.totalEmissions > 0) {
      reductionPercent = ((previousScore.totalEmissions - totalEmissions) / previousScore.totalEmissions) * 100;
    }

    await job.updateProgress(80);

    // Сохраняем или обновляем Carbon Score
    const carbonScore = await prisma.carbonScore.upsert({
      where: {
        orgId_month_year: {
          orgId,
          month,
          year,
        },
      },
      update: {
        totalEmissions,
        scope1Emissions,
        scope2Emissions,
        scope3Emissions,
        reductionPercent,
        metadata: {
          reportsCount: reports.length,
          calculatedAt: new Date().toISOString(),
        },
      },
      create: {
        orgId,
        month,
        year,
        totalEmissions,
        scope1Emissions,
        scope2Emissions,
        scope3Emissions,
        reductionPercent,
        metadata: {
          reportsCount: reports.length,
          calculatedAt: new Date().toISOString(),
        },
      },
    });

    await job.updateProgress(100);

    return {
      carbonScoreId: carbonScore.id,
      totalEmissions,
      reductionPercent,
      period: { month, year },
    };
  } catch (error) {
    console.error('Carbon Score calculation error:', error);
    throw error;
  }
}

// Создаем и экспортируем воркер
export const carbonScoreWorker = new Worker<CarbonScoreJobData>(
  QUEUE_NAMES.CARBON_SCORE,
  processCarbonScoreJob,
  {
    connection: getRedisConnection(),
    concurrency: 1, // Обрабатываем по одному расчету за раз
  }
);

// Обработка событий воркера
carbonScoreWorker.on('completed', (job) => {
  console.log(`Carbon Score job ${job.id} completed successfully`);
});

carbonScoreWorker.on('failed', (job, error) => {
  console.error(`Carbon Score job ${job?.id} failed:`, error);
});

carbonScoreWorker.on('active', (job) => {
  console.log(`Carbon Score job ${job.id} started processing`);
});

// Регистрируем воркер в менеджере
queueManager.registerWorker(QUEUE_NAMES.CARBON_SCORE, carbonScoreWorker);
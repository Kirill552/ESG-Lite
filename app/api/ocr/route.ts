import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { queueManager } from '@/lib/queue/queue-manager';
import { QUEUE_NAMES, JobPriority } from '@/lib/queue/types';
import { rateLimiter, RATE_LIMITS } from '@/lib/queue/rate-limiter';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileKey, documentType } = body;

    if (!fileKey || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileKey, documentType' },
        { status: 400 }
      );
    }

    // Проверяем rate limit для организации
    const rateLimitResult = await rateLimiter.checkLimit({
      key: `${RATE_LIMITS.OCR_PER_ORG.keyPrefix}${orgId}`,
      limit: RATE_LIMITS.OCR_PER_ORG.limit,
      window: RATE_LIMITS.OCR_PER_ORG.window,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Превышен лимит: ${RATE_LIMITS.OCR_PER_ORG.limit} OCR задач за ${RATE_LIMITS.OCR_PER_ORG.window} секунд`,
          remaining: rateLimitResult.remaining,
          resetAt: new Date(rateLimitResult.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    // Получаем очередь OCR
    const ocrQueue = queueManager.getQueue(QUEUE_NAMES.OCR);
    if (!ocrQueue) {
      return NextResponse.json(
        { error: 'OCR queue not available' },
        { status: 503 }
      );
    }

    // Добавляем задачу в очередь
    const job = await ocrQueue.add(
      'ocr-process',
      {
        fileKey,
        userId,
        orgId,
        documentType,
      },
      {
        priority: JobPriority.NORMAL,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'queued',
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error adding OCR job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Находим документ в БД
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        user: { clerkId: userId }
      }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log('🔍 OCR GET request for documentId:', documentId);
    console.log('📄 Document OCR status:', document.ocrProcessed);

    if (!document.ocrProcessed || !document.ocrData) {
      return NextResponse.json({
        success: true,
        data: {
          documentId,
          status: 'not_started',
        }
      });
    }

    const ocrData = document.ocrData as any;
    
    return NextResponse.json({
      success: true,
      data: {
        documentId,
        status: document.status === 'PROCESSED' ? 'completed' : 'failed',
        textPreview: ocrData.textPreview,
        textLength: ocrData.textLength,
        error: ocrData.error,
        processedAt: ocrData.processedAt
      }
    });

  } catch (error: any) {
    console.error('❌ API Error in OCR GET route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 
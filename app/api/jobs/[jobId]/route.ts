import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { queueManager } from '@/lib/queue/queue-manager';
import { QUEUE_NAMES } from '@/lib/queue/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId } = params;
    const queueName = request.nextUrl.searchParams.get('queue');

    if (!queueName || !Object.values(QUEUE_NAMES).includes(queueName as any)) {
      return NextResponse.json(
        { error: 'Invalid or missing queue name' },
        { status: 400 }
      );
    }

    const queue = queueManager.getQueue(queueName);
    if (!queue) {
      return NextResponse.json(
        { error: 'Queue not found' },
        { status: 404 }
      );
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Проверяем, что задача принадлежит пользователю
    if (job.data.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return NextResponse.json({
      jobId: job.id,
      state,
      progress,
      data: job.data,
      result,
      failedReason,
      createdAt: new Date(job.timestamp).toISOString(),
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
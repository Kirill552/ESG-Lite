// Типы данных для различных задач в очередях

export interface OcrJobData {
  fileKey: string;
  userId: string;
  orgId: string;
  documentType: 'invoice' | 'scan' | 'pdf';
}

export interface PdfGenerationJobData {
  reportType: '296fz' | 'cbam';
  reportId: string;
  userId: string;
  orgId: string;
  data: any;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: 'report-ready' | 'welcome' | 'error-notification';
  data: Record<string, any>;
}

export interface DataExportJobData {
  exportType: 'excel' | 'csv' | 'json';
  userId: string;
  orgId: string;
  dateFrom: Date;
  dateTo: Date;
}

export interface CarbonScoreJobData {
  orgId: string;
  month: number;
  year: number;
  calculateEmissions: boolean;
}

// Названия очередей
export const QUEUE_NAMES = {
  OCR: 'ocr-processing',
  PDF_GENERATION: 'pdf-generation',
  EMAIL: 'email-notifications',
  DATA_EXPORT: 'data-export',
  CARBON_SCORE: 'carbon-score-calculation',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Приоритеты задач
export enum JobPriority {
  LOW = 10,
  NORMAL = 5,
  HIGH = 3,
  CRITICAL = 1,
}

// Статусы задач для отображения пользователю
export interface JobStatus {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
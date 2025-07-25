/**
 * Интегрированный сервис генерации отчетов
 * Объединяет template-engine и pdf-generator
 */

import fs from 'fs/promises';
import path from 'path';
import { processTemplate, TemplateData, ReportType } from './template-engine';
import { generateReportPDF, PDFGenerationResult } from './pdf-generator';

export interface ReportGenerationData {
  // Общие поля
  org_name: string;
  org_address: string;
  signer_name: string;
  signer_position?: string; // для 296-FZ
  signer_pos?: string; // для CBAM
  sign_date: string;
  generation_date: string;
  generation_time: string;
  document_id: string;
  
  // Поля для 296-FZ
  org_inn?: string;
  org_okpo?: string;
  org_oktmo?: string;
  org_phone?: string;
  org_email?: string;
  report_year?: string;
  
  // Поля для CBAM
  eori?: string;
  cbam_id?: string;
  org_country?: string;
  report_year_q?: string;
  
  // Данные о товарах/выбросах (динамические)
  [key: string]: string | number | boolean | undefined;
}

export interface ReportGenerationOptions {
  outputDir?: string;
  templateDir?: string;
  includeMetadata?: boolean;
}

export interface ReportGenerationResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  templateErrors?: string[];
  unreplacedTokens?: string[];
  error?: string;
}

/**
 * Загрузка HTML шаблона
 */
async function loadTemplate(reportType: ReportType, templateDir: string = 'templates'): Promise<string> {
  const templateFileName = reportType === '296-FZ' 
    ? 'ru-296fz-report-2025.html'
    : 'eu-cbam-quarterly-2025.html';
    
  const templatePath = path.join(templateDir, templateFileName);
  
  try {
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    throw new Error(`Не удалось загрузить шаблон ${templateFileName}: ${error}`);
  }
}

/**
 * Подготовка данных с метаданными
 */
function prepareTemplateData(
  data: ReportGenerationData, 
  reportType: ReportType,
  includeMetadata: boolean = true
): TemplateData {
  const now = new Date();
  
  const baseData: TemplateData = { ...data };
  
  if (includeMetadata) {
    // Добавляем метаданные если не указаны
    baseData.generation_date = data.generation_date || now.toLocaleDateString('ru-RU');
    baseData.generation_time = data.generation_time || now.toLocaleTimeString('ru-RU');
    baseData.document_id = data.document_id || `${reportType}_${Date.now()}`;
    baseData.sign_date = data.sign_date || now.toLocaleDateString('ru-RU');
  }
  
  // Унификация полей подписанта
  if (reportType === '296-FZ' && data.signer_pos && !data.signer_position) {
    baseData.signer_position = data.signer_pos;
  }
  if (reportType === 'CBAM' && data.signer_position && !data.signer_pos) {
    baseData.signer_pos = data.signer_position;
  }
  
  return baseData;
}

/**
 * Основная функция генерации отчета
 */
export async function generateReport(
  reportType: ReportType,
  data: ReportGenerationData,
  options: ReportGenerationOptions = {}
): Promise<ReportGenerationResult> {
  try {
    const {
      outputDir = 'public/reports',
      templateDir = 'templates',
      includeMetadata = true
    } = options;
    
    console.log(`📋 Генерация отчета ${reportType} для ${data.org_name}`);
    
    // 1. Загружаем шаблон
    const template = await loadTemplate(reportType, templateDir);
    console.log(`✅ Шаблон ${reportType} загружен`);
    
    // 2. Подготавливаем данные
    const templateData = prepareTemplateData(data, reportType, includeMetadata);
    
    // 3. Обрабатываем шаблон
    const templateResult = processTemplate(template, templateData, reportType);
    
    if (templateResult.errors.length > 0) {
      return {
        success: false,
        templateErrors: templateResult.errors,
        error: 'Ошибки валидации данных шаблона'
      };
    }
    
    if (templateResult.unreplacedTokens.length > 0) {
      console.warn('⚠️ Незамененные токены:', templateResult.unreplacedTokens);
    }
    
    console.log('✅ Шаблон обработан, токены заменены');
    
    // 4. Генерируем PDF
    const reportPeriod = reportType === '296-FZ' 
      ? (data.report_year || '2025')
      : (data.report_year_q || '2025-2');
      
    const pdfResult = await generateReportPDF(
      templateResult.processedHtml,
      reportType,
      data.org_name,
      reportPeriod,
      outputDir
    );
    
    if (!pdfResult.success) {
      return {
        success: false,
        error: `Ошибка генерации PDF: ${pdfResult.error}`
      };
    }
    
    console.log(`🎉 Отчет ${reportType} успешно создан`);
    
    return {
      success: true,
      filePath: pdfResult.filePath,
      fileName: pdfResult.filePath ? path.basename(pdfResult.filePath) : undefined,
      fileSize: pdfResult.fileSize,
      unreplacedTokens: templateResult.unreplacedTokens
    };
    
  } catch (error) {
    console.error(`❌ Ошибка генерации отчета ${reportType}:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Генерация отчета 296-FZ
 */
export async function generate296FZReport(
  data: ReportGenerationData,
  options?: ReportGenerationOptions
): Promise<ReportGenerationResult> {
  return generateReport('296-FZ', data, options);
}

/**
 * Генерация отчета CBAM
 */
export async function generateCBAMReport(
  data: ReportGenerationData,
  options?: ReportGenerationOptions
): Promise<ReportGenerationResult> {
  return generateReport('CBAM', data, options);
}

/**
 * Пакетная генерация отчетов
 */
export async function generateBatchReports(
  reports: Array<{
    type: ReportType;
    data: ReportGenerationData;
    options?: ReportGenerationOptions;
  }>
): Promise<ReportGenerationResult[]> {
  const results: ReportGenerationResult[] = [];
  
  for (const report of reports) {
    const result = await generateReport(report.type, report.data, report.options);
    results.push(result);
    
    // Небольшая пауза между генерациями для стабильности
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
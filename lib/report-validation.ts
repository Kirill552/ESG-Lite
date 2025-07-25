import { ReportType } from '@prisma/client';

export interface ReportValidationError {
  field: string;
  message: string;
}

export interface ReportData {
  reportType: ReportType;
  format?: string;
  fileName?: string;
  emissionData?: any;
  methodology?: string;
}

/**
 * Валидирует данные отчета перед созданием
 * @param data - Данные отчета для валидации
 * @returns Массив ошибок валидации (пустой если валидация прошла успешно)
 */
export function validateReportData(data: any): ReportValidationError[] {
  const errors: ReportValidationError[] = [];

  // Проверка обязательных полей
  if (!data.reportType) {
    errors.push({
      field: 'reportType',
      message: 'Тип отчета обязателен'
    });
  }

  // Проверка валидности типа отчета
  const validReportTypes = Object.values(ReportType);
  if (data.reportType && !validReportTypes.includes(data.reportType)) {
    errors.push({
      field: 'reportType',
      message: `Недопустимый тип отчета. Допустимые типы: ${validReportTypes.join(', ')}`
    });
  }

  // Проверка формата файла
  if (data.format && !['PDF', 'XML', 'CSV'].includes(data.format)) {
    errors.push({
      field: 'format',
      message: 'Недопустимый формат файла. Допустимые форматы: PDF, XML, CSV'
    });
  }

  // Проверка имени файла
  if (data.fileName && typeof data.fileName !== 'string') {
    errors.push({
      field: 'fileName',
      message: 'Имя файла должно быть строкой'
    });
  }

  // Специфичная валидация для разных типов отчетов
  switch (data.reportType) {
    case ReportType.REPORT_296FZ:
    case 'EMISSION_296FZ': // Совместимость с новым API
      errors.push(...validate296FZReport(data.emissionData || data.companyData));
      break;
    case ReportType.CBAM_XML:
    case ReportType.CBAM_CSV:
    case 'CBAM_QUARTERLY': // Совместимость с новым API
      errors.push(...validateCBAMReport(data.emissionData || data.goodsData));
      break;
  }

  return errors;
}

/**
 * Валидирует данные для отчета 296-ФЗ
 */
function validate296FZReport(emissionData: any): ReportValidationError[] {
  const errors: ReportValidationError[] = [];

  if (!emissionData) {
    errors.push({
      field: 'emissionData',
      message: 'Данные о выбросах обязательны для отчета 296-ФЗ'
    });
    return errors;
  }

  // Проверка обязательных полей для 296-ФЗ (новый формат)
  const requiredFields = [
    { field: 'companyName', token: 'org_name' },
    { field: 'inn', token: 'inn' },
    { field: 'reportingPeriod', token: 'reporting_period' },
    { field: 'ogrn', token: 'ogrn' },
    { field: 'address', token: 'address' }
  ];
  
  for (const { field, token } of requiredFields) {
    if (!emissionData[field]) {
      errors.push({
        field: `emissionData.${field}`,
        message: `Поле ${field} (токен [[${token}]]) обязательно для отчета 296-ФЗ`
      });
    }
  }

  // Валидация ИНН
  if (emissionData.inn && !isValidINN(emissionData.inn)) {
    errors.push({
      field: 'emissionData.inn',
      message: 'Некорректный формат ИНН'
    });
  }

  // Валидация ОГРН
  if (emissionData.ogrn && !isValidOGRN(emissionData.ogrn)) {
    errors.push({
      field: 'emissionData.ogrn',
      message: 'Некорректный формат ОГРН'
    });
  }

  // Валидация отчетного периода
  if (emissionData.reportingPeriod) {
    const year = parseInt(emissionData.reportingPeriod);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 2021 || year > currentYear) {
      errors.push({
        field: 'emissionData.reportingPeriod',
        message: `Отчетный период должен быть между 2021 и ${currentYear}`
      });
    }
  }

  // Валидация данных о выбросах
  if (emissionData.totalEmissions) {
    const total = parseFloat(emissionData.totalEmissions);
    if (isNaN(total) || total < 0) {
      errors.push({
        field: 'emissionData.totalEmissions',
        message: 'Общий объем выбросов должен быть положительным числом'
      });
    }
  }

  return errors;
}

/**
 * Валидирует данные для отчета CBAM
 */
function validateCBAMReport(emissionData: any): ReportValidationError[] {
  const errors: ReportValidationError[] = [];

  if (!emissionData) {
    errors.push({
      field: 'emissionData',
      message: 'Данные о выбросах обязательны для отчета CBAM'
    });
    return errors;
  }

  // Проверка обязательных полей для CBAM
  const requiredFields = ['companyName', 'eori', 'quarter'];
  
  for (const field of requiredFields) {
    if (!emissionData[field]) {
      errors.push({
        field: `emissionData.${field}`,
        message: `Поле ${field} обязательно для отчета CBAM`
      });
    }
  }

  // Валидация EORI номера
  if (emissionData.eori && !isValidEORI(emissionData.eori)) {
    errors.push({
      field: 'emissionData.eori',
      message: 'Некорректный формат EORI номера'
    });
  }

  // Валидация квартала
  if (emissionData.quarter && !isValidQuarter(emissionData.quarter)) {
    errors.push({
      field: 'emissionData.quarter',
      message: 'Некорректный формат квартала (ожидается формат Q1 2025)'
    });
  }

  return errors;
}

/**
 * Проверяет валидность ИНН
 */
function isValidINN(inn: string): boolean {
  if (typeof inn !== 'string') return false;
  
  const cleanINN = inn.replace(/\D/g, '');
  return cleanINN.length === 10 || cleanINN.length === 12;
}

/**
 * Проверяет валидность ОГРН
 */
function isValidOGRN(ogrn: string): boolean {
  if (typeof ogrn !== 'string') return false;
  
  const cleanOGRN = ogrn.replace(/\D/g, '');
  return cleanOGRN.length === 13 || cleanOGRN.length === 15;
}

/**
 * Проверяет валидность EORI номера
 */
function isValidEORI(eori: string): boolean {
  if (typeof eori !== 'string') return false;
  
  // EORI номер должен начинаться с кода страны (2 буквы) и содержать до 15 символов
  const eoriPattern = /^[A-Z]{2}[A-Z0-9]{1,15}$/;
  return eoriPattern.test(eori.toUpperCase());
}

/**
 * Проверяет валидность квартала
 */
function isValidQuarter(quarter: string): boolean {
  if (typeof quarter !== 'string') return false;
  
  // Формат: Q1 2025, Q2 2025, etc.
  const quarterPattern = /^Q[1-4]\s\d{4}$/;
  return quarterPattern.test(quarter);
}
/**
 * Движок замены токенов для HTML шаблонов отчетов
 * Поддерживает токены в формате [[snake_case]]
 */

import { calculateEmissions, generateEmissionData } from './emission-calculator';

export interface TemplateData {
  // Реквизиты организации
  org_name?: string;
  legal_form?: string;
  ogrn?: string;
  inn?: string;
  okpo?: string;
  oktmo?: string;
  okved?: string;
  address?: string;
  email?: string;
  phone?: string;
  submission_basis?: string;

  // Процессы и объекты
  proc_1_code?: string;
  proc_1_desc?: string;
  proc_1_nvos?: string;
  proc_1_capacity?: string;
  proc_1_unit?: string;
  proc_1_method?: string;
  proc_1_coef_src?: string;
  proc_1_justif?: string;

  proc_2_code?: string;
  proc_2_desc?: string;
  proc_2_nvos?: string;
  proc_2_capacity?: string;
  proc_2_unit?: string;
  proc_2_method?: string;
  proc_2_coef_src?: string;
  proc_2_justif?: string;

  proc_3_code?: string;
  proc_3_desc?: string;
  proc_3_nvos?: string;
  proc_3_capacity?: string;
  proc_3_unit?: string;
  proc_3_method?: string;
  proc_3_coef_src?: string;
  proc_3_justif?: string;

  // Выбросы по газам
  co2_mass?: string;
  co2e_co2?: string;
  co2_percent?: string;
  
  ch4_mass?: string;
  co2e_ch4?: string;
  ch4_percent?: string;
  
  n2o_mass?: string;
  co2e_n2o?: string;
  n2o_percent?: string;
  
  hfc_mass?: string;
  hfc_gwp?: string;
  co2e_hfc?: string;
  hfc_percent?: string;
  
  pfc_mass?: string;
  pfc_gwp?: string;
  co2e_pfc?: string;
  pfc_percent?: string;
  
  sf6_mass?: string;
  co2e_sf6?: string;
  sf6_percent?: string;
  
  total_co2e?: string;

  // Климатические проекты
  climproj_1_name?: string;
  climproj_1_from?: string;
  climproj_1_to?: string;
  climproj_1_reduced?: string;
  climproj_1_status?: string;

  climproj_2_name?: string;
  climproj_2_from?: string;
  climproj_2_to?: string;
  climproj_2_reduced?: string;
  climproj_2_status?: string;

  has_climate_projects?: boolean; // true если есть проекты

  // Подпись
  signer_fio?: string;
  signer_pos?: string;
  signer_sigtype?: string;
  sign_date?: string;

  // Исполнитель
  executor_fio?: string;
  executor_phone?: string;

  // Метаданные
  reporting_period?: string;
  emission_factors_source?: string;
  generation_date?: string;
  generation_time?: string;
  document_id?: string;
}

export interface TemplateValidationError {
  token: string;
  message: string;
}

/**
 * Заменяет токены [[snake_case]] в HTML шаблоне на фактические значения
 * @param template - HTML шаблон с токенами
 * @param data - Данные для замены токенов
 * @returns Обработанный HTML
 */
export function replaceTokens(template: string, data: TemplateData): string {
  let processedTemplate = template;

  // Регулярное выражение для поиска токенов [[token_name]]
  const tokenRegex = /\[\[([a-z_]+)\]\]/g;

  processedTemplate = processedTemplate.replace(tokenRegex, (match, tokenName) => {
    const value = data[tokenName as keyof TemplateData];
    
    if (value !== undefined && value !== null) {
      return escapeHtml(String(value));
    }
    
    // Возвращаем пустую строку для отсутствующих токенов
    return '';
  });

  // Обработка условного отображения климатических проектов
  processedTemplate = processClimateProjectsVisibility(processedTemplate, data);

  return processedTemplate;
}

/**
 * Обрабатывает условное отображение секции климатических проектов
 */
function processClimateProjectsVisibility(template: string, data: TemplateData): string {
  const hasProjects = data.climproj_1_name || data.climproj_2_name;
  
  if (hasProjects) {
    // Скрываем блок "нет проектов"
    return template.replace('id="no-climate-projects"', 'id="no-climate-projects" class="hidden"');
  } else {
    // Показываем блок "нет проектов", скрываем строки таблицы с пустыми проектами
    let processedTemplate = template;
    
    // Скрываем пустые строки проектов
    if (!data.climproj_1_name) {
      processedTemplate = processedTemplate.replace(
        /<tr>\s*<td class="text-left">\[\[climproj_1_name\]\]<\/td>[\s\S]*?<\/tr>/,
        ''
      );
    }
    
    if (!data.climproj_2_name) {
      processedTemplate = processedTemplate.replace(
        /<tr>\s*<td class="text-left">\[\[climproj_2_name\]\]<\/td>[\s\S]*?<\/tr>/,
        ''
      );
    }
    
    return processedTemplate;
  }
}

/**
 * Валидирует, что все обязательные токены заменены
 * @param template - Обработанный HTML шаблон
 * @param requiredTokens - Список обязательных токенов
 * @returns Массив ошибок валидации
 */
export function validateTemplate(template: string, requiredTokens: string[]): TemplateValidationError[] {
  const errors: TemplateValidationError[] = [];
  const tokenRegex = /\[\[([a-z_]+)\]\]/g;
  
  // Находим все незамененные токены
  let match;
  const unreplacedTokens = new Set<string>();
  
  while ((match = tokenRegex.exec(template)) !== null) {
    unreplacedTokens.add(match[1]);
  }

  // Проверяем обязательные токены
  for (const token of requiredTokens) {
    if (unreplacedTokens.has(token)) {
      errors.push({
        token,
        message: `Обязательный токен [[${token}]] не был заменен`
      });
    }
  }

  return errors;
}

/**
 * Экранирует HTML символы для безопасности
 * @param text - Текст для экранирования
 * @returns Экранированный текст
 */
function escapeHtml(text: string): string {
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
}

/**
 * Получает список всех токенов в шаблоне
 * @param template - HTML шаблон
 * @returns Массив найденных токенов
 */
export function extractTokens(template: string): string[] {
  const tokenRegex = /\[\[([a-z_]+)\]\]/g;
  const tokens: string[] = [];
  let match;

  while ((match = tokenRegex.exec(template)) !== null) {
    if (!tokens.includes(match[1])) {
      tokens.push(match[1]);
    }
  }

  return tokens.sort();
}

/**
 * Обязательные токены для отчета 296-ФЗ
 */
export const REQUIRED_296FZ_TOKENS = [
  'org_name',
  'inn',
  'ogrn',
  'address',
  'submission_basis',
  'total_co2e',
  'signer_fio',
  'signer_pos',
  'sign_date',
  'reporting_period',
  'generation_date',
  'document_id'
];

/**
 * Создает данные по умолчанию для отчета 296-ФЗ
 * @param baseData - Базовые данные от пользователя
 * @returns Полный набор данных для шаблона
 */
export function create296FZTemplateData(baseData: any): TemplateData {
  const now = new Date();
  
  return {
    // Реквизиты организации (улучшенное сопоставление с CHECKO API)
    org_name: baseData.fullCompanyName || baseData.companyName || baseData.name || 'Не указано',
    legal_form: extractLegalForm(baseData.legalForm || baseData.fullCompanyName || ''),
    ogrn: baseData.ogrn || '0000000000000',
    inn: baseData.inn || '0000000000',
    okpo: baseData.okpo || extractFromAddress(baseData, 'okpo') || '00000000',
    oktmo: baseData.oktmo || extractFromAddress(baseData, 'oktmo') || '00000000',
    okved: formatOkved(baseData.okved || baseData.okvedName) || '00.00',
    address: formatAddress(baseData.address) || 'Не указан',
    email: baseData.email || extractContactInfo(baseData, 'email') || 'info@example.ru',
    phone: baseData.phone || extractContactInfo(baseData, 'phone') || '+7-000-000-00-00',
    submission_basis: '296-ФЗ от 02.07.2021',

    // Процессы (генерируются на основе типа деятельности)
    ...generateProcessTokens(baseData),

    // Выбросы по газам (автоматический расчет)
    ...calculateEmissionTokens(baseData),

    // Климатические проекты
    climproj_1_name: '',
    climproj_1_from: '',
    climproj_1_to: '',
    climproj_1_reduced: '',
    climproj_1_status: '',
    climproj_2_name: '',
    climproj_2_from: '',
    climproj_2_to: '',
    climproj_2_reduced: '',
    climproj_2_status: '',
    has_climate_projects: false, // нет проектов по умолчанию

    // Подпись
    signer_fio: baseData.signerName || 'Иванов Иван Иванович',
    signer_pos: baseData.signerPosition || 'Генеральный директор',
    signer_sigtype: 'NQES',
    sign_date: now.toLocaleDateString('ru-RU'),

    // Исполнитель
    executor_fio: baseData.executorName || 'Сидоров Сидор Сидорович',
    executor_phone: baseData.executorPhone || '+7-495-000-00-01',

    // Метаданные
    reporting_period: baseData.reportingPeriod || now.getFullYear().toString(),
    emission_factors_source: 'Приказ Минприроды России от 15.06.2017 № 371',
    generation_date: now.toLocaleDateString('ru-RU'),
    generation_time: now.toLocaleTimeString('ru-RU'),
    document_id: baseData.documentId || `DOC_${Date.now()}`
  };
}
/**
 * Изв
лекает организационно-правовую форму из полного названия
 */
function extractLegalForm(fullName: string): string {
  if (!fullName) return 'ООО';
  
  const legalForms = ['ООО', 'ОАО', 'ЗАО', 'ПАО', 'АО', 'ИП', 'НАО'];
  
  for (const form of legalForms) {
    if (fullName.includes(form)) {
      return form;
    }
  }
  
  return 'ООО';
}

/**
 * Форматирует ОКВЭД код
 */
function formatOkved(okved: string | undefined): string {
  if (!okved) return '00.00';
  
  // Если это название деятельности, возвращаем код по умолчанию
  if (okved.length > 10) return '00.00';
  
  // Форматируем код ОКВЭД
  const cleanCode = okved.replace(/[^\d.]/g, '');
  if (cleanCode.includes('.')) return cleanCode;
  
  // Добавляем точку если её нет
  if (cleanCode.length >= 4) {
    return `${cleanCode.substring(0, 2)}.${cleanCode.substring(2)}`;
  }
  
  return cleanCode || '00.00';
}

/**
 * Форматирует адрес
 */
function formatAddress(address: string | undefined): string {
  if (!address) return 'Не указан';
  
  // Убираем лишние пробелы и форматируем
  return address.trim().replace(/\s+/g, ' ');
}

/**
 * Извлекает дополнительную информацию из адреса или других полей
 */
function extractFromAddress(data: any, field: string): string {
  // Заглушка для извлечения ОКПО/ОКТМО из дополнительных данных
  // В реальной реализации здесь может быть логика парсинга
  return '';
}

/**
 * Извлекает контактную информацию
 */
function extractContactInfo(data: any, type: 'email' | 'phone'): string {
  // Заглушка для извлечения контактов из дополнительных полей
  // В реальной реализации здесь может быть логика парсинга контактов
  return '';
}

/**
 * Создает данные процессов на основе типа деятельности организации
 */
export function generateProcessData(baseData: any): any {
  const okved = baseData.okved || baseData.okvedName || '';
  const processes = [];
  
  // Базовые процессы для большинства организаций
  processes.push({
    code: 'P001',
    desc: 'Потребление электроэнергии',
    nvos: '0201',
    capacity: '1000',
    unit: 'кВт·ч',
    method: 'Инструментальный',
    coef_src: 'Приказ Минэнерго России',
    justif: 'Косвенные выбросы от потребления электроэнергии'
  });
  
  // Добавляем специфичные процессы в зависимости от ОКВЭД
  if (okved.includes('23.') || okved.includes('производство')) {
    processes.push({
      code: 'P002',
      desc: 'Сжигание природного газа в производственных целях',
      nvos: '0101',
      capacity: '50,0',
      unit: 'тыс.м³/год',
      method: 'Расчетный',
      coef_src: 'Приказ Минприроды № 330',
      justif: 'Прямые выбросы от сжигания топлива'
    });
  }
  
  if (okved.includes('49.') || okved.includes('транспорт')) {
    processes.push({
      code: 'P003',
      desc: 'Автомобильный транспорт',
      nvos: '0301',
      capacity: '10000',
      unit: 'км/год',
      method: 'Расчетный',
      coef_src: 'Приказ Минприроды № 330',
      justif: 'Мобильные источники выбросов'
    });
  }
  
  // Заполняем до 3 процессов пустыми значениями
  while (processes.length < 3) {
    processes.push({
      code: '',
      desc: '',
      nvos: '',
      capacity: '',
      unit: '',
      method: '',
      coef_src: '',
      justif: ''
    });
  }
  
  return processes;
}

/**
 * Генерирует токены процессов для шаблона
 */
function generateProcessTokens(baseData: any): any {
  const processes = generateProcessData(baseData);
  const tokens: any = {};
  
  processes.forEach((process: any, index: number) => {
    const num = index + 1;
    tokens[`proc_${num}_code`] = process.code;
    tokens[`proc_${num}_desc`] = process.desc;
    tokens[`proc_${num}_nvos`] = process.nvos;
    tokens[`proc_${num}_capacity`] = process.capacity;
    tokens[`proc_${num}_unit`] = process.unit;
    tokens[`proc_${num}_method`] = process.method;
    tokens[`proc_${num}_coef_src`] = process.coef_src;
    tokens[`proc_${num}_justif`] = process.justif;
  });
  
  return tokens;
}/**

 * Генерирует токены выбросов для шаблона
 */
function calculateEmissionTokens(baseData: any): any {
  // Используем предоставленные данные или генерируем автоматически
  const emissionData = baseData.emissionData ? {
    co2_mass: parseFloat(baseData.emissionData.co2_mass) || 0,
    ch4_mass: parseFloat(baseData.emissionData.ch4_mass) || 0,
    n2o_mass: parseFloat(baseData.emissionData.n2o_mass) || 0,
    hfc_mass: parseFloat(baseData.emissionData.hfc_mass) || 0,
    pfc_mass: parseFloat(baseData.emissionData.pfc_mass) || 0,
    sf6_mass: parseFloat(baseData.emissionData.sf6_mass) || 0
  } : generateEmissionData(baseData);
  
  return calculateEmissions(emissionData);
}
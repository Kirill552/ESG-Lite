/**
 * Калькулятор выбросов парниковых газов для отчета 296-ФЗ
 */

// Потенциалы глобального потепления (GWP) по IPCC AR4
export const GWP_VALUES = {
  CO2: 1,
  CH4: 25,
  N2O: 298,
  HFC: 1430, // средний для HFC
  PFC: 7390, // средний для PFC
  SF6: 22800
};

export interface EmissionData {
  co2_mass: number;
  ch4_mass: number;
  n2o_mass: number;
  hfc_mass: number;
  pfc_mass: number;
  sf6_mass: number;
}

export interface EmissionResult {
  co2_mass: string;
  co2e_co2: string;
  co2_percent: string;
  
  ch4_mass: string;
  co2e_ch4: string;
  ch4_percent: string;
  
  n2o_mass: string;
  co2e_n2o: string;
  n2o_percent: string;
  
  hfc_mass: string;
  hfc_gwp: string;
  co2e_hfc: string;
  hfc_percent: string;
  
  pfc_mass: string;
  pfc_gwp: string;
  co2e_pfc: string;
  pfc_percent: string;
  
  sf6_mass: string;
  co2e_sf6: string;
  sf6_percent: string;
  
  total_co2e: string;
}

/**
 * Рассчитывает выбросы CO₂-эквивалента и проценты
 */
export function calculateEmissions(data: EmissionData): EmissionResult {
  // Расчет CO₂-эквивалента для каждого газа
  const co2e_co2 = data.co2_mass * GWP_VALUES.CO2;
  const co2e_ch4 = data.ch4_mass * GWP_VALUES.CH4;
  const co2e_n2o = data.n2o_mass * GWP_VALUES.N2O;
  const co2e_hfc = data.hfc_mass * GWP_VALUES.HFC;
  const co2e_pfc = data.pfc_mass * GWP_VALUES.PFC;
  const co2e_sf6 = data.sf6_mass * GWP_VALUES.SF6;
  
  // Общий объем выбросов
  const total = co2e_co2 + co2e_ch4 + co2e_n2o + co2e_hfc + co2e_pfc + co2e_sf6;
  
  // Расчет процентов
  const co2_percent = total > 0 ? (co2e_co2 / total) * 100 : 0;
  const ch4_percent = total > 0 ? (co2e_ch4 / total) * 100 : 0;
  const n2o_percent = total > 0 ? (co2e_n2o / total) * 100 : 0;
  const hfc_percent = total > 0 ? (co2e_hfc / total) * 100 : 0;
  const pfc_percent = total > 0 ? (co2e_pfc / total) * 100 : 0;
  const sf6_percent = total > 0 ? (co2e_sf6 / total) * 100 : 0;
  
  return {
    co2_mass: formatNumber(data.co2_mass),
    co2e_co2: formatNumber(co2e_co2),
    co2_percent: formatPercent(co2_percent),
    
    ch4_mass: formatNumber(data.ch4_mass),
    co2e_ch4: formatNumber(co2e_ch4),
    ch4_percent: formatPercent(ch4_percent),
    
    n2o_mass: formatNumber(data.n2o_mass),
    co2e_n2o: formatNumber(co2e_n2o),
    n2o_percent: formatPercent(n2o_percent),
    
    hfc_mass: formatNumber(data.hfc_mass),
    hfc_gwp: GWP_VALUES.HFC.toString(),
    co2e_hfc: formatNumber(co2e_hfc),
    hfc_percent: formatPercent(hfc_percent),
    
    pfc_mass: formatNumber(data.pfc_mass),
    pfc_gwp: GWP_VALUES.PFC.toString(),
    co2e_pfc: formatNumber(co2e_pfc),
    pfc_percent: formatPercent(pfc_percent),
    
    sf6_mass: formatNumber(data.sf6_mass),
    co2e_sf6: formatNumber(co2e_sf6),
    sf6_percent: formatPercent(sf6_percent),
    
    total_co2e: formatNumber(total)
  };
}

/**
 * Форматирует число для отображения в отчете (русский формат)
 */
function formatNumber(value: number): string {
  if (value === 0) return '0,0';
  if (value < 0.001) return '< 0,001';
  
  return value.toFixed(1).replace('.', ',');
}

/**
 * Форматирует процент для отображения в отчете
 */
function formatPercent(value: number): string {
  if (value === 0) return '0,0';
  if (value < 0.1) return '< 0,1';
  
  return value.toFixed(1).replace('.', ',');
}

/**
 * Создает тестовые данные выбросов на основе типа деятельности
 */
export function generateEmissionData(baseData: any): EmissionData {
  const okved = baseData.okved || baseData.okvedName || '';
  
  // Базовые выбросы для офисной деятельности
  let co2_base = 800; // тонн CO2 в год
  let ch4_base = 0.5;
  let n2o_base = 0.3;
  
  // Корректировка в зависимости от типа деятельности
  if (okved.includes('23.') || okved.includes('производство')) {
    co2_base *= 2.5; // Производство - больше выбросов
    ch4_base *= 3;
    n2o_base *= 2;
  } else if (okved.includes('49.') || okved.includes('транспорт')) {
    co2_base *= 1.8; // Транспорт - средние выбросы
    ch4_base *= 2;
    n2o_base *= 4; // N2O от транспорта
  }
  
  return {
    co2_mass: co2_base,
    ch4_mass: ch4_base,
    n2o_mass: n2o_base,
    hfc_mass: 0, // Обычно 0 для большинства организаций
    pfc_mass: 0,
    sf6_mass: 0.001 // Минимальные выбросы SF6
  };
}/**

 * Валидирует корректность расчета общего объема выбросов
 */
export function validateEmissionCalculation(result: EmissionResult): {
  isValid: boolean;
  calculatedTotal: number;
  reportedTotal: number;
  difference: number;
} {
  // Парсим значения из строк (русский формат с запятой)
  const co2e_co2 = parseFloat(result.co2e_co2.replace(',', '.'));
  const co2e_ch4 = parseFloat(result.co2e_ch4.replace(',', '.'));
  const co2e_n2o = parseFloat(result.co2e_n2o.replace(',', '.'));
  const co2e_hfc = parseFloat(result.co2e_hfc.replace(',', '.'));
  const co2e_pfc = parseFloat(result.co2e_pfc.replace(',', '.'));
  const co2e_sf6 = parseFloat(result.co2e_sf6.replace(',', '.'));
  const total_reported = parseFloat(result.total_co2e.replace(',', '.'));
  
  // Рассчитываем сумму
  const calculatedTotal = co2e_co2 + co2e_ch4 + co2e_n2o + co2e_hfc + co2e_pfc + co2e_sf6;
  const difference = Math.abs(calculatedTotal - total_reported);
  
  // Допускаем погрешность в 0.1 тонны CO2-экв
  const isValid = difference < 0.1;
  
  return {
    isValid,
    calculatedTotal,
    reportedTotal: total_reported,
    difference
  };
}

/**
 * Валидирует корректность процентов (должны в сумме давать 100%)
 */
export function validatePercentages(result: EmissionResult): {
  isValid: boolean;
  totalPercent: number;
  difference: number;
} {
  const co2_percent = parseFloat(result.co2_percent.replace(',', '.'));
  const ch4_percent = parseFloat(result.ch4_percent.replace(',', '.'));
  const n2o_percent = parseFloat(result.n2o_percent.replace(',', '.'));
  const hfc_percent = parseFloat(result.hfc_percent.replace(',', '.'));
  const pfc_percent = parseFloat(result.pfc_percent.replace(',', '.'));
  const sf6_percent = parseFloat(result.sf6_percent.replace(',', '.'));
  
  const totalPercent = co2_percent + ch4_percent + n2o_percent + hfc_percent + pfc_percent + sf6_percent;
  const difference = Math.abs(totalPercent - 100);
  
  // Допускаем погрешность в 0.1%
  const isValid = difference < 0.1;
  
  return {
    isValid,
    totalPercent,
    difference
  };
}
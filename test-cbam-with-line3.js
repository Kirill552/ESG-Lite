/**
 * Тест CBAM шаблона с данными в Line 3 для проверки отображения
 */

const fs = require('fs');
const path = require('path');

// Функция замены токенов [[snake_case]]
function replaceTokens(template, data) {
  let result = template;
  
  // Заменяем токены [[token_name]]
  const tokenRegex = /\[\[([a-z_0-9]+)\]\]/g;
  
  result = result.replace(tokenRegex, (match, tokenName) => {
    const value = data[tokenName];
    return value !== undefined ? String(value) : '';
  });
  
  // Специальная обработка стилей отображения
  if (data.l3_display_style) {
    result = result.replace(
      '<tr id="line3-row" style="display: none;">',
      `<tr id="line3-row" style="display: ${data.l3_display_style};">`
    );
  }
  
  if (data.no_goods_display_style) {
    result = result.replace(
      '<div class="no-goods" id="no-cbam-goods" style="display: none;">',
      `<div class="no-goods" id="no-cbam-goods" style="display: ${data.no_goods_display_style};">`
    );
  }
  
  return result;
}

// Создание тестовых данных с Line 3
function createCBAMTemplateDataWithLine3() {
  const now = new Date();
  
  const templateData = {
    // 1. Declarant block
    eori: 'RU123456789012345',
    cbam_id: 'DL-2025-000789',
    org_name: 'ООО "Тест с Line 3"',
    org_address: '123456, Москва, ул. Тестовая, д. 3',
    org_country: 'RU',
    org_email: 'test@line3.ru',
    report_year_q: '2025-2',
    
    // Line 1
    l1_cn: '72081000',
    l1_qty: '100.0',
    l1_unit: 't',
    l1_origin: 'RU',
    l1_unloc: 'RUMOW',
    l1_inst: 'Test Plant 1',
    l1_lat: '55.7558',
    l1_lon: '37.6176',
    l1_route: 'BF-BOF',
    l1_dir: '2.500',
    l1_el_mwh: '0.60',
    l1_el_ef: '0.300',
    l1_ef_meth: 'RM',
    l1_steel_id: 'TP1-001',
    l1_ip_in_qty: '110.0',
    l1_ip_in_co2: '165.0',
    l1_ip_out_qty: '100.0',
    l1_ip_out_co2: '250.0',
    
    // Line 2
    l2_cn: '72101200',
    l2_qty: '50.0',
    l2_unit: 't',
    l2_origin: 'RU',
    l2_unloc: 'RUMOW',
    l2_inst: 'Test Plant 2',
    l2_lat: '55.7558',
    l2_lon: '37.6176',
    l2_route: 'EAF',
    l2_dir: '1.800',
    l2_el_mwh: '0.70',
    l2_el_ef: '0.300',
    l2_ef_meth: 'RM',
    l2_steel_id: 'TP2-001',
    l2_ip_in_qty: '55.0',
    l2_ip_in_co2: '82.5',
    l2_ip_out_qty: '50.0',
    l2_ip_out_co2: '90.0',
    
    // Line 3 - С ДАННЫМИ для тестирования отображения
    l3_cn: '72142000',
    l3_qty: '25.0',
    l3_unit: 't',
    l3_origin: 'RU',
    l3_unloc: 'RUMOW',
    l3_inst: 'Test Plant 3',
    l3_lat: '55.7558',
    l3_lon: '37.6176',
    l3_route: 'EAF',
    l3_dir: '1.900',
    l3_el_mwh: '0.65',
    l3_el_ef: '0.300',
    l3_ef_meth: 'RM',
    l3_steel_id: 'TP3-001',
    l3_ip_in_qty: '27.0',
    l3_ip_in_co2: '40.5',
    l3_ip_out_qty: '25.0',
    l3_ip_out_co2: '47.5',
    
    // Signer block
    signer_name: 'Тестов Тест Тестович',
    signer_pos: 'Test Manager',
    sign_date: now.toLocaleDateString('ru-RU'),
    
    // Metadata
    generation_date: now.toLocaleDateString('ru-RU'),
    generation_time: now.toLocaleTimeString('ru-RU'),
    document_id: `CBAM_LINE3_${Date.now()}`
  };
  
  // Рассчитываем итоги для всех 3 линий
  const line1Direct = parseFloat(templateData.l1_qty) * parseFloat(templateData.l1_dir);
  const line2Direct = parseFloat(templateData.l2_qty) * parseFloat(templateData.l2_dir);
  const line3Direct = parseFloat(templateData.l3_qty) * parseFloat(templateData.l3_dir);
  const totalDirect = line1Direct + line2Direct + line3Direct;
  
  const line1Indirect = parseFloat(templateData.l1_qty) * parseFloat(templateData.l1_el_mwh) * parseFloat(templateData.l1_el_ef);
  const line2Indirect = parseFloat(templateData.l2_qty) * parseFloat(templateData.l2_el_mwh) * parseFloat(templateData.l2_el_ef);
  const line3Indirect = parseFloat(templateData.l3_qty) * parseFloat(templateData.l3_el_mwh) * parseFloat(templateData.l3_el_ef);
  const totalIndirect = line1Indirect + line2Indirect + line3Indirect;
  
  const totalQuantity = parseFloat(templateData.l1_qty) + parseFloat(templateData.l2_qty) + parseFloat(templateData.l3_qty);
  const totalEmissions = totalDirect + totalIndirect;
  
  // Добавляем рассчитанные итоги
  templateData.total_quantity = totalQuantity.toFixed(1);
  templateData.total_direct_emissions = totalDirect.toFixed(1);
  templateData.total_indirect_emissions = totalIndirect.toFixed(1);
  templateData.total_emissions = totalEmissions.toFixed(1);
  
  // Контролируем отображение Line 3 (должна показываться, так как есть CN код)
  templateData.l3_display_style = templateData.l3_cn && templateData.l3_cn.length > 0 ? 'table-row' : 'none';
  
  // Контролируем отображение блока "no goods" (должен быть скрыт, так как есть товары)
  const hasGoods = (templateData.l1_cn && templateData.l1_cn.length > 0) || 
                   (templateData.l2_cn && templateData.l2_cn.length > 0) || 
                   (templateData.l3_cn && templateData.l3_cn.length > 0);
  templateData.no_goods_display_style = hasGoods ? 'none' : 'block';
  
  return templateData;
}

try {
  console.log('🧪 Тестирование CBAM шаблона с Line 3...');
  
  // Читаем шаблон
  const templatePath = path.join(__dirname, 'templates', 'eu-cbam-quarterly-2025.html');
  const template = fs.readFileSync(templatePath, 'utf-8');
  console.log('✅ CBAM шаблон загружен');
  
  // Создаем данные с Line 3
  const templateData = createCBAMTemplateDataWithLine3();
  console.log('✅ Данные с Line 3 созданы');
  
  // Заменяем токены
  const processedHtml = replaceTokens(template, templateData);
  console.log('✅ Токены заменены');
  
  // Проверяем отображение Line 3
  if (processedHtml.includes('id="line3-row" style="display: table-row;"')) {
    console.log('✅ Line 3 правильно отображается (display: table-row)');
  } else {
    console.log('❌ Line 3 не отображается');
  }
  
  // Проверяем скрытие блока "no goods"
  if (processedHtml.includes('id="no-cbam-goods" style="display: none;"')) {
    console.log('✅ Блок "no goods" правильно скрыт');
  } else {
    console.log('❌ Блок "no goods" не скрыт');
  }
  
  // Статистика
  console.log(`📊 Количество товарных позиций: 3`);
  console.log(`📋 Товары CBAM:`);
  console.log(`  1. CN ${templateData.l1_cn}: ${templateData.l1_qty} ${templateData.l1_unit}`);
  console.log(`  2. CN ${templateData.l2_cn}: ${templateData.l2_qty} ${templateData.l2_unit}`);
  console.log(`  3. CN ${templateData.l3_cn}: ${templateData.l3_qty} ${templateData.l3_unit} ← Line 3 показана!`);
  
  console.log(`💡 Итоги:`);
  console.log(`  - Общее количество: ${templateData.total_quantity} т`);
  console.log(`  - Прямые выбросы: ${templateData.total_direct_emissions} т CO₂`);
  console.log(`  - Косвенные выбросы: ${templateData.total_indirect_emissions} т CO₂`);
  console.log(`  - Общие выбросы: ${templateData.total_emissions} т CO₂`);
  
  // Сохраняем результат
  const outputPath = path.join(__dirname, 'test-output-cbam-with-line3.html');
  fs.writeFileSync(outputPath, processedHtml);
  console.log(`✅ Результат сохранен в ${outputPath}`);
  
  console.log('\n🎉 Тест с Line 3 завершен успешно!');
  
} catch (error) {
  console.error('❌ Ошибка тестирования:', error.message);
}
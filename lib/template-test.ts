/**
 * Утилита для тестирования шаблонов отчетов
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { replaceTokens, create296FZTemplateData, validateTemplate, REQUIRED_296FZ_TOKENS } from './template-engine';

/**
 * Тестирует шаблон 296-ФЗ с тестовыми данными
 */
export function test296FZTemplate() {
  try {
    console.log('🧪 Тестирование шаблона 296-ФЗ...');

    // Читаем шаблон
    const templatePath = join(process.cwd(), 'templates', 'ru-296fz-report-2025.html');
    const template = readFileSync(templatePath, 'utf-8');
    console.log('✅ Шаблон загружен');

    // Создаем тестовые данные
    const testData = {
      companyName: 'ООО "Тестовая Компания"',
      fullCompanyName: 'Общество с ограниченной ответственностью "Тестовая Компания"',
      inn: '7701234567',
      ogrn: '1234567890123',
      address: '115114, г. Москва, ул. Тестовая, д. 1',
      email: 'test@example.ru',
      phone: '+7-495-123-45-67',
      reportingPeriod: '2024',
      totalEmissions: '1496.5',
      signerName: 'Петров Петр Петрович',
      signerPosition: 'Генеральный директор'
    };

    // Создаем данные для шаблона
    const templateData = create296FZTemplateData(testData);
    console.log('✅ Данные для шаблона созданы');

    // Заменяем токены
    const processedHtml = replaceTokens(template, templateData);
    console.log('✅ Токены заменены');

    // Валидируем шаблон
    const validationErrors = validateTemplate(processedHtml, REQUIRED_296FZ_TOKENS);
    
    if (validationErrors.length > 0) {
      console.log('❌ Ошибки валидации:');
      validationErrors.forEach(error => {
        console.log(`  - ${error.token}: ${error.message}`);
      });
    } else {
      console.log('✅ Валидация прошла успешно');
    }

    // Проверяем, что нет незамененных токенов
    const unreplacedTokens = processedHtml.match(/\[\[[a-z_]+\]\]/g);
    if (unreplacedTokens) {
      console.log('⚠️  Незамененные токены:');
      unreplacedTokens.forEach(token => console.log(`  - ${token}`));
    } else {
      console.log('✅ Все токены заменены');
    }

    // Сохраняем результат для проверки
    const outputPath = join(process.cwd(), 'test-output-296fz.html');
    require('fs').writeFileSync(outputPath, processedHtml);
    console.log(`✅ Результат сохранен в ${outputPath}`);

    return {
      success: true,
      validationErrors,
      unreplacedTokens: unreplacedTokens || [],
      outputPath
    };

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Запускает тест если файл выполняется напрямую
 */
if (require.main === module) {
  test296FZTemplate();
}
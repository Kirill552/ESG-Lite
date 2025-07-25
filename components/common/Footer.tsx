import React from 'react';
import Link from 'next/link';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Github, 
  Twitter, 
  Linkedin,
  Shield,
  FileText,
  Zap
} from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mr-3">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">ESG-Lite MVP</h3>
              </div>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Автоматизация ESG отчётности для российского бизнеса. 
                Соответствие 296-ФЗ и подготовка к CBAM ЕС за минуты, а не дни.
              </p>
              <div className="flex space-x-4">
                <a 
                  href="#" 
                  className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Продукт</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
                    Дашборд
                  </Link>
                </li>
                <li>
                  <Link href="/upload" className="text-slate-300 hover:text-white transition-colors">
                    Загрузить файл
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className="text-slate-300 hover:text-white transition-colors">
                    Мои отчёты
                  </Link>
                </li>
                <li>
                  <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">
                    Тарифы
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-300 hover:text-white transition-colors">
                    API документация
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Ресурсы</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-slate-300 hover:text-white transition-colors">
                    База знаний
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-300 hover:text-white transition-colors">
                    296-ФЗ гид
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-300 hover:text-white transition-colors">
                    CBAM руководство
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-300 hover:text-white transition-colors">
                    Блог
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-300 hover:text-white transition-colors">
                    Вебинары
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Контакты</h4>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <Mail className="w-5 h-5 text-emerald-500 mr-3" />
                  <a href="mailto:support@esg-lite.ru" className="text-slate-300 hover:text-white transition-colors">
                    support@esg-lite.ru
                  </a>
                </li>
                <li className="flex items-center">
                  <Phone className="w-5 h-5 text-emerald-500 mr-3" />
                  <a href="tel:+78001234567" className="text-slate-300 hover:text-white transition-colors">
                    8 (800) 123-45-67
                  </a>
                </li>
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 text-emerald-500 mr-3 mt-0.5" />
                  <div className="text-slate-300">
                    <p>Москва, Россия</p>
                    <p className="text-sm">ул. Инновационная, 42</p>
                  </div>
                </li>
              </ul>

              {/* Support Hours */}
              <div className="mt-6 p-4 bg-slate-800 rounded-lg">
                <h5 className="font-semibold mb-2">Поддержка</h5>
                <p className="text-sm text-slate-300">
                  Пн-Пт: 9:00 - 18:00 MSK<br />
                  Сб-Вс: По заявкам
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Section */}
        <div className="border-t border-slate-800 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-slate-300">152-ФЗ соответствие</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-slate-300">296-ФЗ сертификация</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-400">
                 #R2024/ESG/001
              </p>
            </div>

            <div className="flex justify-center lg:justify-end space-x-6">
              <div className="text-sm text-slate-400">Партнёры: Сколково, Российское ПО</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-slate-400">
              © {currentYear} ESG-Lite MVP. Все права защищены.
            </div>
            
            <div className="flex space-x-6 text-sm">
              <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
                Политика конфиденциальности
              </Link>
              <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
                Условия использования
              </Link>
              <Link href="/cookies" className="text-slate-400 hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 
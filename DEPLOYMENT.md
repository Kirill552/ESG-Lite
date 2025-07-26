# ESG Lite MVP - Руководство по развертыванию

## Обзор архитектуры

Проект состоит из следующих компонентов:

1. **Next.js приложение** - основное веб-приложение
2. **Worker процессы** - обработчики фоновых задач (OCR, генерация PDF, расчет Carbon Score)
3. **Redis** - очереди задач и кеширование
4. **PostgreSQL** - основная база данных (SberCloud)
5. **S3** - хранилище файлов (Yandex Object Storage)

## Локальная разработка

### Требования

- Node.js 20+
- Docker и Docker Compose
- Redis (или через Docker)
- PostgreSQL доступ

### Установка

1. Клонируйте репозиторий
2. Установите зависимости:
```bash
npm install
```

3. Создайте `.env.local` на основе `env.example`

4. Запустите миграции Prisma:
```bash
npx prisma migrate dev
npx prisma generate
```

5. Запустите Redis через Docker:
```bash
docker-compose up -d redis
```

6. Запустите приложение и воркеры:
```bash
# В разных терминалах
npm run dev        # Next.js приложение
npm run worker     # Worker процессы
```

## Продакшн деплой

### Docker образы

Проект использует два Docker образа:

1. **esg-lite-app** - основное приложение (Dockerfile)
2. **esg-lite-worker** - воркер процессы (Dockerfile.worker)

### Сборка образов

```bash
# Сборка приложения
docker build -t esg-lite-app:latest .

# Сборка воркеров
docker build -f Dockerfile.worker -t esg-lite-worker:latest .
```

### Деплой на YandexCloud

#### 1. Настройка Redis (YC Managed Service for Redis)

```bash
# Создание кластера Redis
yc managed-redis cluster create \
  --name esg-lite-redis \
  --environment production \
  --network-name default \
  --resource-preset hm1.nano \
  --disk-size 16 \
  --host zone-id=ru-central1-a,subnet-id=<SUBNET_ID> \
  --redis-version 7.0
```

#### 2. Container Registry

```bash
# Создание реестра
yc container registry create --name esg-lite-registry

# Получение ID реестра
yc container registry list

# Аутентификация в реестре
yc container registry configure-docker

# Тегирование и пуш образов
docker tag esg-lite-app:latest cr.yandex/<REGISTRY_ID>/esg-lite-app:latest
docker push cr.yandex/<REGISTRY_ID>/esg-lite-app:latest

docker tag esg-lite-worker:latest cr.yandex/<REGISTRY_ID>/esg-lite-worker:latest
docker push cr.yandex/<REGISTRY_ID>/esg-lite-worker:latest
```

#### 3. Serverless Containers для воркеров

```bash
# Создание контейнера для воркеров
yc serverless container create \
  --name esg-lite-workers \
  --description "Background job workers"

# Создание ревизии
yc serverless container revision deploy \
  --container-name esg-lite-workers \
  --image cr.yandex/<REGISTRY_ID>/esg-lite-worker:latest \
  --cores 1 \
  --memory 1GB \
  --concurrency 1 \
  --execution-timeout 30m \
  --environment DATABASE_URL=$DATABASE_URL \
  --environment REDIS_URL=$REDIS_URL \
  --environment S3_ACCESS_KEY=$S3_ACCESS_KEY \
  --environment S3_SECRET_KEY=$S3_SECRET_KEY \
  --environment S3_BUCKET_NAME=$S3_BUCKET_NAME \
  --environment S3_ENDPOINT=$S3_ENDPOINT \
  --environment S3_REGION=$S3_REGION
```

#### 4. Compute Cloud для основного приложения

Создайте виртуальную машину и установите Docker:

```bash
# На VM
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Создайте docker-compose.yml для продакшна
```

### Переменные окружения

Необходимые переменные окружения:

```env
# База данных
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://host:port

# S3 (Yandex Object Storage)
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET_NAME=esg-lite-reports-2025
S3_ENDPOINT=https://storage.yandexcloud.net
S3_REGION=ru-central1

# Clerk Auth
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_public_key

# Приложение
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.ru
```

## Мониторинг

### Проверка здоровья очередей

```bash
npm run queue:health
```

### Логи

- **Приложение**: `docker logs esg-lite-app`
- **Воркеры**: `docker logs esg-lite-worker`
- **Redis**: через YC Console

### Метрики

Используйте YC Monitoring для отслеживания:
- CPU и память контейнеров
- Количество задач в очередях
- Время обработки задач
- Ошибки и таймауты

## Масштабирование

### Горизонтальное масштабирование воркеров

```bash
# Увеличение количества воркеров
docker-compose up -d --scale worker=5
```

### Автомасштабирование в YC

Настройте автомасштабирование для Serverless Containers:

```bash
yc serverless container revision deploy \
  --container-name esg-lite-workers \
  --min-instances 0 \
  --max-instances 30 \
  --scale-policy request-utilization-target=70
```

## Бэкапы

### База данных

SberCloud PostgreSQL автоматически создает бэкапы. Дополнительно:

```bash
# Ручной бэкап
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Redis

```bash
# Создание снапшота
yc managed-redis cluster backup --name esg-lite-redis
```

## Troubleshooting

### Проблемы с очередями

1. Проверьте подключение к Redis:
```bash
redis-cli -h <REDIS_HOST> ping
```

2. Очистите зависшие задачи:
```bash
npm run queue:clean
```

### Проблемы с памятью

1. Увеличьте лимиты памяти для воркеров
2. Настройте `maxmemory-policy` в Redis
3. Уменьшите количество параллельных задач

### Проблемы с производительностью

1. Проверьте индексы в БД
2. Оптимизируйте размер загружаемых файлов
3. Используйте CDN для статики

## Контрольный чек-лист перед продакшн

- [ ] Node.js 20 в Docker образах
- [ ] Redis 7 настроен и доступен
- [ ] Все переменные окружения установлены
- [ ] SSL сертификаты настроены
- [ ] Бэкапы настроены
- [ ] Мониторинг настроен
- [ ] Rate limiting работает
- [ ] Автомасштабирование настроено
- [ ] Логи централизованы
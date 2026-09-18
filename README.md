# VDS Logistic Website

Корпоративный сайт логистической компании VDS-Восточный с интеграцией Telegram для приёма заявок.

## Особенности

- ✅ Статический HTML/CSS/JS сайт
- ✅ Node.js сервер для обработки заявок
- ✅ Интеграция с Telegram Bot API через SOCKS5 прокси (для РФ)
- ✅ Webhook для CRM систем
- ✅ Яндекс Метрика с автоматическим внедрением счётчика
- ✅ Калькулятор стоимости с актуальными курсами ЦБ РФ
- ✅ Готовые конфигурации для PM2 и Nginx
- ✅ Автоматический деплой на VPS

## Деплой

Полная и единственная инструкция: **[DEPLOY.md](DEPLOY.md)**.

## Файлы конфигурации

- `server.mjs` - Node.js сервер
- `ecosystem.config.cjs` - PM2 конфигурация
- `nginx.conf` - начальная Nginx-конфигурация; HTTPS добавляет Certbot
- `.env.example` - Пример переменных окружения
- `deploy.sh` - Автоматический скрипт деплоя
- `setup-ssh-tunnel.sh` - Настройка SSH туннеля для SOCKS5
- `test-telegram.mjs` - Тестирование Telegram интеграции

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/rates` - Курсы валют ЦБ РФ (USD, CNY)
- `POST /api/lead` - Приём заявок с сайта

## Переменные окружения

```env
PORT=8080                          # Порт сервера
YANDEX_METRIKA_ID=12345678         # ID счётчика Яндекс Метрики
SOCKS5_PROXY=socks5h://host:port   # SOCKS5 прокси для Telegram (обязательно для РФ)
TELEGRAM_BOT_TOKEN=123:ABC         # Токен Telegram бота
TELEGRAM_CHAT_ID=123456789         # ID чата для уведомлений
LEAD_WEBHOOK_URL=https://...       # Webhook для CRM (опционально)
```

## Требования

- Node.js 20+
- Ubuntu 20.04+ или Debian 11+
- Nginx (для production)
- SOCKS5 прокси (если Telegram API недоступен с VPS)

## Локальная разработка

```bash
# Установите зависимости
npm install

# Создайте .env
cp .env.example .env
# Отредактируйте .env

# Запустите сервер
npm start

# Откройте в браузере
http://localhost:8080
```

## Поддержка

При возникновении проблем:
1. Откройте раздел «Диагностика» в [DEPLOY.md](DEPLOY.md)
2. Проверьте логи: `sudo -u deploy pm2 logs vds-logistic`
3. Проверьте приложение: `curl http://127.0.0.1:8080/api/health`

## Лицензия

Proprietary - VDS Logistic Company

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

## Быстрый старт

```bash
# Клонируйте репозиторий
git clone <repo-url>
cd vds-logistic-site

# Запустите автоматический деплой
chmod +x deploy.sh
sudo ./deploy.sh

# Настройте SOCKS5 прокси для Telegram (для РФ)
chmod +x setup-ssh-tunnel.sh
sudo ./setup-ssh-tunnel.sh

# Настройте .env файл
nano .env

# Протестируйте Telegram
node test-telegram.mjs

# Готово!
```

## Документация

- **[QUICK_START.md](QUICK_START.md)** - Быстрый старт за 30 минут
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Полное руководство по деплою
- **[SOCKS5_PROXY_SETUP.md](SOCKS5_PROXY_SETUP.md)** - Настройка прокси для Telegram в РФ
- **[DEPLOY.md](DEPLOY.md)** - Оригинальная документация проекта

## Файлы конфигурации

- `server.mjs` - Node.js сервер
- `ecosystem.config.cjs` - PM2 конфигурация
- `nginx.conf` - Nginx конфигурация с SSL
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
- SOCKS5 прокси (для работы с Telegram в РФ)

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

## Production деплой

См. [QUICK_START.md](QUICK_START.md) для пошаговой инструкции.

## Поддержка

При возникновении проблем:
1. Проверьте логи: `pm2 logs vds-logistic`
2. Проверьте статус прокси: `systemctl status telegram-tunnel`
3. Протестируйте Telegram: `node test-telegram.mjs`
4. См. раздел Troubleshooting в документации

## Лицензия

Proprietary - VDS Logistic Company

# Структура проекта VDS Logistic

## 📁 Основные файлы

### Документация (обязательно к прочтению)

| Файл | Описание | Когда использовать |
|------|----------|-------------------|
| **README.md** | Главная документация проекта | Первое, что нужно прочитать |
| **QUICK_START.md** | Быстрый старт за 30 минут | Когда нужно быстро задеплоить |
| **DEPLOYMENT_GUIDE.md** | Полное руководство по деплою | Для детального понимания процесса |
| **DEPLOYMENT_CHECKLIST.md** | Чеклист деплоя шаг за шагом | Во время деплоя как контрольный список |
| **SOCKS5_PROXY_SETUP.md** | Настройка SOCKS5 прокси | Для работы с Telegram в РФ |
| **DEPLOY.md** | Оригинальная документация | Техническая информация о проекте |

### Скрипты деплоя

| Файл | Описание | Использование |
|------|----------|---------------|
| **deploy.sh** | Автоматический деплой | `chmod +x deploy.sh && sudo ./deploy.sh` |
| **setup-ssh-tunnel.sh** | Настройка SSH туннеля для SOCKS5 | `chmod +x setup-ssh-tunnel.sh && sudo ./setup-ssh-tunnel.sh` |
| **test-telegram.mjs** | Тест Telegram интеграции | `node test-telegram.mjs` |

### Конфигурационные файлы

| Файл | Описание |
|------|----------|
| **ecosystem.config.cjs** | Конфигурация PM2 для управления процессом |
| **nginx.conf** | Конфигурация Nginx с SSL |
| **.env.example** | Пример переменных окружения |
| **.gitignore** | Git ignore правила |
| **package.json** | NPM зависимости и скрипты |

### Серверные файлы

| Файл | Описание |
|------|----------|
| **server.mjs** | Node.js сервер с поддержкой SOCKS5 |
| **404.html** | Кастомная страница 404 |
| **robots.txt** | Правила для поисковых роботов |
| **sitemap.xml** | Карта сайта для SEO |
| **site.webmanifest** | PWA манифест |

---

## 📂 Директории

```
vds-logistic-site/
│
├── assets/                  # Статические ресурсы
│   ├── css/                 # Стили
│   ├── js/                  # JavaScript
│   └── images/              # Изображения
│
├── logs/                    # Логи приложения (создаётся автоматически)
│   ├── out.log             # Стандартный вывод
│   └── err.log             # Ошибки
│
├── *.html                   # HTML страницы
│   ├── index.html          # Главная
│   ├── dostavka-iz-kitaya.html
│   ├── morskie-perevozki.html
│   ├── zheleznodorozhnye-perevozki.html
│   ├── avtoperevozki.html
│   ├── tamozhennoe-oformlenie.html
│   ├── poisk-postavshchikov.html
│   ├── popolnenie-alipay-wechat.html
│   ├── privacy.html
│   └── consent.html
│
└── ... (конфигурационные файлы описаны выше)
```

---

## 🔧 Технологический стек

### Frontend
- **HTML5** - Семантическая вёрстка
- **CSS3** - Стили с черно-золотой темой
- **Vanilla JavaScript** - Без фреймворков
- **Yandex Metrika** - Аналитика и цели

### Backend
- **Node.js 20+** - Серверная платформа
- **ES Modules** - Современный JavaScript
- **Built-in HTTP** - Без Express
- **socks-proxy-agent** - Единственная зависимость для SOCKS5

### Инфраструктура
- **PM2** - Process manager для Node.js
- **Nginx** - Reverse proxy и статика
- **Let's Encrypt** - SSL сертификаты
- **Systemd** - Автозапуск сервисов
- **UFW** - Файрвол

---

## 🔌 API Endpoints

### `GET /api/health`
Health check для мониторинга.

**Ответ:**
```json
{"ok": true, "service": "vds-logistic"}
```

### `GET /api/rates`
Актуальные курсы валют от ЦБ РФ с кешированием.

**Ответ:**
```json
{
  "RUB": 1,
  "CNY": 12.5457,
  "USD": 84.1732,
  "updated": "17.09.2026",
  "source": "Банк России"
}
```

**Кеширование:** 4 часа

### `POST /api/lead`
Приём заявок с сайта.

**Тело запроса:**
```json
{
  "name": "Иван Иванов",
  "contact": "+79001234567",
  "from": "Китай",
  "to": "Владивосток",
  "cargo": "Электроника, 500 кг",
  "page": "https://vds-logistic.cc/dostavka-iz-kitaya",
  "utm_source": "yandex",
  "utm_campaign": "china_delivery"
}
```

**Honeypot защита:**
Поле `website` - если заполнено, заявка игнорируется (защита от ботов).

**Ответ (успех):**
```json
{"ok": true}
```

**Ответ (ошибка):**
```json
{
  "ok": false,
  "error": "name_and_contact_required"
}
```

**Что происходит при успешной отправке:**
1. Заявка отправляется в Telegram (если настроен)
2. Заявка отправляется на webhook (если настроен)
3. Фиксируется событие `lead_success` в Яндекс Метрике

---

## 🔐 Переменные окружения (.env)

```env
# Порт сервера
PORT=8080

# Яндекс Метрика (опционально)
YANDEX_METRIKA_ID=12345678

# SOCKS5 прокси для Telegram (обязательно для РФ!)
# Формат: socks5h://host:port
# С авторизацией: socks5h://user:pass@host:port
SOCKS5_PROXY=socks5h://127.0.0.1:1080

# Telegram бот (рекомендуется)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789

# Webhook для CRM (опционально)
LEAD_WEBHOOK_URL=https://your-crm.com/webhook
```

### Приоритеты доставки заявок

1. **Telegram + Webhook** - оба работают параллельно
2. **Только Telegram** - если webhook не настроен
3. **Только Webhook** - если Telegram не настроен
4. **Ошибка** - если ничего не настроено

---

## 🚀 Рабочие процессы (Workflows)

### Локальная разработка

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd vds-logistic-site

# 2. Установить зависимости
npm install

# 3. Создать .env
cp .env.example .env
nano .env

# 4. Запустить сервер
npm start

# 5. Открыть в браузере
# http://localhost:8080
```

### Деплой на production

```bash
# На VPS
cd /var/www/vds-logistic

# Обновить код
git pull origin main

# Установить зависимости (если изменились)
npm install

# Перезапустить приложение
pm2 restart vds-logistic

# Проверить статус
pm2 status
pm2 logs vds-logistic --lines 50
```

### Обновление конфигурации Nginx

```bash
# Отредактировать конфиг
sudo nano /etc/nginx/sites-available/vds-logistic

# Проверить синтаксис
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl reload nginx
```

---

## 📊 Яндекс Метрика - События

Все события настроены и готовы к работе:

| Событие | Описание | Когда срабатывает |
|---------|----------|-------------------|
| `lead_open` | Открытие формы заявки | Клик на кнопку "Получить расчёт" |
| `lead_start` | Начало заполнения формы | Ввод в первое поле |
| `lead_submit` | Отправка формы | Клик "Отправить заявку" |
| `lead_success` | Успешная доставка заявки | После подтверждения от сервера |
| `service_click` | Клик на карточку услуги | Переход на страницу услуги |
| `payment_calc_use` | Использование калькулятора | Ввод суммы в калькуляторе |
| `payment_calc_swap` | Смена направления | Клик на кнопку "⇄" |
| `payment_service_select` | Выбор платёжного сервиса | Выбор Alipay/WeChat/etc |
| `payment_calc_submit` | Отправка из калькулятора | Клик "Отправить заявку" |

**Рекомендуемая цель для оптимизации:** `lead_success`

---

## 🔒 Безопасность

### Что уже реализовано

- ✅ HTTPS через Let's Encrypt
- ✅ Security headers в Nginx
- ✅ Honeypot защита от ботов
- ✅ Ограничение размера тела запроса (32KB)
- ✅ Timeout для внешних запросов (8 секунд)
- ✅ Валидация входящих данных
- ✅ Escape HTML в Telegram сообщениях
- ✅ SOCKS5 прокси только для Telegram
- ✅ No-cache для HTML, кеширование для статики

### Рекомендации

1. **Регулярно обновляйте систему:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Смените SSH порт:**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Port 2222
   sudo systemctl restart sshd
   ```

3. **Установите Fail2Ban:**
   ```bash
   sudo apt install fail2ban
   ```

4. **Мониторьте логи на подозрительную активность:**
   ```bash
   pm2 logs vds-logistic | grep ERROR
   ```

---

## 🧪 Тестирование

### Тест Telegram интеграции
```bash
node test-telegram.mjs
```

Проверяет:
- ✅ Инициализацию SOCKS5 прокси
- ✅ Доступность Telegram Bot API
- ✅ Отправку тестового сообщения

### Тест API endpoints
```bash
# Health check
curl http://localhost:8080/api/health

# Курсы валют
curl http://localhost:8080/api/rates

# Отправка заявки (замените данные)
curl -X POST http://localhost:8080/api/lead \
  -H "Content-Type: application/json" \
  -d '{"name":"Тест","contact":"test@test.com"}'
```

### Тест SOCKS5 прокси
```bash
# Прямое подключение (должно упасть в РФ)
curl https://api.telegram.org/bot<TOKEN>/getMe

# Через прокси (должно работать)
curl -x socks5h://127.0.0.1:1080 \
  https://api.telegram.org/bot<TOKEN>/getMe
```

---

## 📈 Мониторинг

### PM2 Monitoring
```bash
pm2 status              # Статус всех процессов
pm2 monit               # Real-time мониторинг
pm2 logs vds-logistic   # Логи в реальном времени
pm2 describe vds-logistic  # Детальная информация
```

### System Monitoring
```bash
# Использование CPU и RAM
htop

# Свободное место на диске
df -h

# Сетевые подключения
netstat -tlnp

# Статус сервисов
systemctl status nginx
systemctl status telegram-tunnel
```

### Логи
```bash
# Логи приложения
tail -f /var/www/vds-logistic/logs/out.log
tail -f /var/www/vds-logistic/logs/err.log

# Логи PM2
pm2 logs vds-logistic --lines 100

# Логи Nginx
sudo tail -f /var/log/nginx/vds-logistic-access.log
sudo tail -f /var/log/nginx/vds-logistic-error.log

# Логи SSH туннеля
journalctl -u telegram-tunnel -f
```

---

## 🆘 Поддержка

При возникновении проблем:

1. **Проверьте чеклист:** `DEPLOYMENT_CHECKLIST.md`
2. **Посмотрите troubleshooting:** `DEPLOYMENT_GUIDE.md` (раздел Troubleshooting)
3. **Изучите настройку прокси:** `SOCKS5_PROXY_SETUP.md`
4. **Проверьте логи:**
   ```bash
   pm2 logs vds-logistic --err --lines 100
   journalctl -u telegram-tunnel -n 50
   ```

---

## 📝 Лицензия

Proprietary - VDS Logistic Company

---

**Версия:** 1.0.0  
**Последнее обновление:** 18.09.2026

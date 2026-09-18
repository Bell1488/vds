# Деплой VDS Logistic на VPS

Единственная рабочая схема для Ubuntu 22.04/24.04 или Debian 12: Node.js 20, PM2, Nginx и Let's Encrypt. Команды выполняются на сервере приложения под `root`.

## Что нужно заранее

- VPS с публичным IPv4 и доступом `ssh root@SERVER_IP`.
- Git-репозиторий проекта и URL домена.
- DNS: A-записи домена и `www` должны указывать на IP этого VPS **до запуска Certbot**.
- Для заявок: либо `LEAD_WEBHOOK_URL`, либо Telegram (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`).
- Если сервер в РФ и используется Telegram, нужен рабочий SOCKS5-прокси.

## 1. Загрузить проект

Подключитесь к VPS и замените `<REPO_URL>` на настоящий URL репозитория:

```bash
ssh root@SERVER_IP
apt update && apt install -y git
mkdir -p /var/www
git clone <REPO_URL> /var/www/vds-logistic
cd /var/www/vds-logistic
```

Если проект уже загружен, используйте только `cd /var/www/vds-logistic`.

## 2. Установить приложение и Nginx

Запустите готовый скрипт из корня проекта:

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

Скрипт ставит Node.js 20+, PM2, Nginx, Certbot, создаёт пользователя `deploy`, устанавливает зависимости и запускает приложение на `127.0.0.1:8080`. Он намеренно **не получает SSL-сертификат**: сначала нужно настроить `.env` и DNS.

## 3. Заполнить `.env`

Откройте файл:

```bash
nano /var/www/vds-logistic/.env
```

Минимальная конфигурация Telegram:

```env
PORT=8080
TELEGRAM_BOT_TOKEN=123456789:your_bot_token
TELEGRAM_CHAT_ID=123456789
SOCKS5_PROXY=socks5h://127.0.0.1:1080
YANDEX_METRIKA_ID=
LEAD_WEBHOOK_URL=
```

Можно использовать только CRM/webhook:

```env
LEAD_WEBHOOK_URL=https://example.com/lead-webhook
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SOCKS5_PROXY=
```

После изменения `.env` перезапустите приложение от имени `deploy`:

```bash
cd /var/www/vds-logistic
sudo -u deploy pm2 restart vds-logistic --update-env
sudo -u deploy pm2 save
```

## 4. Если нужен SOCKS5 через иностранный VPS

На сервере приложения должен работать SSH-доступ по ключу к иностранному VPS. Запустите:

```bash
cd /var/www/vds-logistic
chmod +x setup-ssh-tunnel.sh
./setup-ssh-tunnel.sh
```

Скрипт создаст systemd-сервис `telegram-tunnel` и локальный SOCKS5 на `127.0.0.1:1080`. Проверьте его до запуска теста:

```bash
systemctl status telegram-tunnel --no-pager
curl --proxy socks5h://127.0.0.1:1080 --max-time 10 https://api.telegram.org
```

В `.env` должен быть ровно такой адрес:

```env
SOCKS5_PROXY=socks5h://127.0.0.1:1080
```

## 5. Проверить Telegram и приложение

```bash
cd /var/www/vds-logistic
node test-telegram.mjs
curl http://127.0.0.1:8080/api/health
```

Ожидаемый health-ответ: `{"ok":true,"service":"vds-logistic"}`. Тест Telegram отправляет одно тестовое сообщение, если указан `TELEGRAM_CHAT_ID`.

## 6. Включить автозапуск PM2

Выполните команду и запустите команду, которую PM2 напечатает в ответе:

```bash
pm2 startup systemd -u deploy --hp /home/deploy
sudo -u deploy pm2 save
```

Проверка:

```bash
sudo -u deploy pm2 status
systemctl status pm2-deploy --no-pager
```

## 7. Включить HTTPS

Сначала проверьте DNS и доступность HTTP:

```bash
getent hosts vds-logistic.cc www.vds-logistic.cc
curl -I http://vds-logistic.cc
```

Затем получите сертификат:

```bash
certbot --nginx -d vds-logistic.cc -d www.vds-logistic.cc
nginx -t
systemctl reload nginx
```

После этого сайт должен открываться по `https://vds-logistic.cc`.

## 8. Финальная проверка

```bash
curl https://vds-logistic.cc/api/health
curl https://vds-logistic.cc/api/rates
sudo -u deploy pm2 logs vds-logistic --lines 50
```

Отправьте тестовую заявку с сайта и убедитесь, что она пришла в Telegram или CRM.

## Обновление проекта

```bash
cd /var/www/vds-logistic
sudo -u deploy git -C /var/www/vds-logistic pull --ff-only
sudo -u deploy npm ci --omit=dev
sudo -u deploy pm2 restart vds-logistic --update-env
sudo -u deploy pm2 save
```

## Диагностика

**Сайт отдаёт 502:**

```bash
sudo -u deploy pm2 status
curl http://127.0.0.1:8080/api/health
tail -n 100 /var/log/nginx/vds-logistic-error.log
```

**Заявка не отправляется:**

```bash
sudo -u deploy pm2 logs vds-logistic --err --lines 100
systemctl status telegram-tunnel --no-pager
node /var/www/vds-logistic/test-telegram.mjs
```

Если тест возвращает `Telegram HTTP 400: ... chat not found`, токен и прокси уже работают, но в `TELEGRAM_CHAT_ID` указан не тот чат. Получите ID заново:

1. Для личного чата откройте диалог с ботом и отправьте ему `/start`.
2. Для группы добавьте бота в группу и отправьте в ней сообщение (бот должен иметь право видеть сообщения).
3. Для канала добавьте бота администратором и опубликуйте сообщение.
4. Выполните на сервере, подставив токен из `.env`:

```bash
TOKEN="$(sed -n 's/^TELEGRAM_BOT_TOKEN=//p' /var/www/vds-logistic/.env)"
PROXY="$(sed -n 's/^SOCKS5_PROXY=//p' /var/www/vds-logistic/.env)"
curl --proxy "$PROXY" \
  "https://api.telegram.org/bot${TOKEN}/getUpdates"
```

В JSON найдите `message.chat.id` или `channel_post.chat.id`. Для группы/канала ID обычно отрицательный и начинается с `-100`. Запишите это число в `.env`:

```env
TELEGRAM_CHAT_ID=-1001234567890
```

Если `result` пустой, у бота может быть установлен webhook. Удалите его и повторите отправку сообщения:

```bash
curl --proxy "$PROXY" \
  "https://api.telegram.org/bot${TOKEN}/deleteWebhook?drop_pending_updates=false"
```

После изменения ID перезапустите приложение и повторите тест:

```bash
sudo -u deploy pm2 restart vds-logistic --update-env
node /var/www/vds-logistic/test-telegram.mjs
```

**Nginx/SSL не запускается:**

```bash
nginx -t
certbot certificates
systemctl status nginx --no-pager
```

Не запускайте `certbot` до того, как DNS указывает на этот VPS. Не открывайте порт `8080` наружу: приложение должно быть доступно только через Nginx.

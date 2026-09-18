# Руководство по деплою VDS Logistic на VPS

## Требования к серверу

- Ubuntu 20.04/22.04 или Debian 11/12
- Минимум 1GB RAM
- 10GB свободного места на диске
- Доступ по SSH с правами root

## Быстрый старт

### 1. Подготовка локально

```bash
# Убедитесь, что все файлы на месте
ls -la

# Создайте Git репозиторий (если ещё не создан)
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Подключение к VPS

```bash
ssh root@your-vps-ip
```

### 3. Загрузка проекта на VPS

**Вариант A: Через Git (рекомендуется)**

```bash
cd /var/www
git clone <your-repo-url> vds-logistic
cd vds-logistic
```

**Вариант B: Через SCP/SFTP**

```bash
# На локальной машине
scp -r ./* root@your-vps-ip:/var/www/vds-logistic/
```

### 4. Автоматический деплой

```bash
cd /var/www/vds-logistic
chmod +x deploy.sh
sudo ./deploy.sh
```

Скрипт автоматически:
- Установит Node.js 20
- Установит PM2
- Установит и настроит Nginx
- Установит Certbot для SSL
- Создаст пользователя для деплоя
- Настроит автозапуск приложения

### 5. Настройка переменных окружения

```bash
nano /var/www/vds-logistic/.env
```

Заполните:
```env
PORT=8080

# Яндекс Метрика
YANDEX_METRIKA_ID=your_metrika_id

# SOCKS5 прокси для Telegram (обязательно для РФ)
SOCKS5_PROXY=socks5h://127.0.0.1:1080

# Telegram уведомления
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Webhook (опционально)
LEAD_WEBHOOK_URL=https://your-webhook-url
```

### 5a. Настройка SOCKS5 прокси (для РФ)

**Быстрый способ через SSH туннель:**

```bash
cd /var/www/vds-logistic
chmod +x setup-ssh-tunnel.sh
./setup-ssh-tunnel.sh
```

Скрипт настроит SSH туннель к вашему иностранному VPS.

**Подробная инструкция:** см. файл `SOCKS5_PROXY_SETUP.md`

### 6. Получение SSL сертификата

Убедитесь, что DNS записи настроены:
- A запись: vds-logistic.cc → IP вашего VPS
- A запись: www.vds-logistic.cc → IP вашего VPS

```bash
certbot --nginx -d vds-logistic.cc -d www.vds-logistic.cc
```

### 7. Перезапуск приложения

```bash
pm2 restart vds-logistic
```

---

## Ручной деплой (пошагово)

Если автоматический скрипт не подходит, выполните шаги вручную:

### Шаг 1: Установка Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
node -v  # Должно быть >= 20
```

### Шаг 2: Установка PM2

```bash
sudo npm install -g pm2
```

### Шаг 3: Настройка приложения

```bash
mkdir -p /var/www/vds-logistic
cd /var/www/vds-logistic

# Скопируйте файлы проекта сюда

# Создайте директорию для логов
mkdir -p logs

# Установите зависимости
npm install --production

# Настройте .env
cp .env.example .env
nano .env
```

**Важно:** Для работы в РФ обязательно настройте SOCKS5_PROXY (см. раздел "Настройка SOCKS5 прокси")

### Шаг 4: Запуск через PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Шаг 5: Установка Nginx

```bash
sudo apt install -y nginx
```

### Шаг 6: Настройка Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/vds-logistic
sudo ln -s /etc/nginx/sites-available/vds-logistic /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезагрузка
sudo systemctl reload nginx
sudo systemctl enable nginx
```

### Шаг 7: SSL сертификат

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vds-logistic.cc -d www.vds-logistic.cc
```

### Шаг 8: Настройка файрвола

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Полезные команды

### PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs vds-logistic

# Просмотр логов в реальном времени
pm2 logs vds-logistic --lines 100

# Перезапуск
pm2 restart vds-logistic

# Остановка
pm2 stop vds-logistic

# Удаление из PM2
pm2 delete vds-logistic

# Мониторинг
pm2 monit
```

### Nginx

```bash
# Проверка конфигурации
sudo nginx -t

# Перезагрузка
sudo systemctl reload nginx

# Перезапуск
sudo systemctl restart nginx

# Статус
sudo systemctl status nginx

# Просмотр логов
sudo tail -f /var/log/nginx/vds-logistic-access.log
sudo tail -f /var/log/nginx/vds-logistic-error.log
```

### SSL сертификаты

```bash
# Обновление сертификата
sudo certbot renew

# Проверка автоматического обновления
sudo certbot renew --dry-run

# Просмотр сертификатов
sudo certbot certificates
```

---

## Обновление приложения

### Через Git

```bash
cd /var/www/vds-logistic
git pull origin main
pm2 restart vds-logistic
```

### Через SCP

```bash
# На локальной машине
scp -r ./* root@your-vps-ip:/var/www/vds-logistic/

# На VPS
pm2 restart vds-logistic
```

---

## Настройка Telegram бота

1. Создайте бота через @BotFather в Telegram
2. Получите токен бота
3. Узнайте ID чата:
   - Напишите боту любое сообщение
   - Откройте в браузере: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Найдите `"chat":{"id":123456789}`
4. Добавьте в `.env`:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

---

## Настройка Яндекс Метрики

1. Создайте счётчик на metrika.yandex.ru
2. Получите ID счётчика (число)
3. Добавьте в `.env`:

```env
YANDEX_METRIKA_ID=12345678
```

Метрика автоматически внедряется во все HTML страницы при запуске сервера.

---

## Мониторинг и логи

### Просмотр логов приложения

```bash
# PM2 логи
pm2 logs vds-logistic --lines 200

# Файлы логов
tail -f /var/www/vds-logistic/logs/out.log
tail -f /var/www/vds-logistic/logs/err.log
```

### Мониторинг ресурсов

```bash
# Использование CPU/RAM
pm2 monit

# Системные ресурсы
htop
```

### Health Check

```bash
curl http://localhost:8080/api/health
# Должно вернуть: {"ok":true,"service":"vds-logistic"}
```

---

## Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
pm2 logs vds-logistic --err

# Проверьте .env файл
cat /var/www/vds-logistic/.env

# Проверьте права доступа
ls -la /var/www/vds-logistic
```

### Nginx показывает 502 Bad Gateway

```bash
# Убедитесь, что приложение запущено
pm2 status

# Проверьте, что порт 8080 слушается
netstat -tlnp | grep 8080

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/vds-logistic-error.log
```

### SSL не работает

```bash
# Проверьте сертификаты
sudo certbot certificates

# Обновите сертификат
sudo certbot renew

# Проверьте конфигурацию Nginx
sudo nginx -t
```

### Не приходят заявки в Telegram

```bash
# Проверьте токен и chat_id в .env
cat /var/www/vds-logistic/.env

# Проверьте логи на ошибки API Telegram
pm2 logs vds-logistic | grep telegram

# Проверьте подключение к Telegram API
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

---

## Бэкап и восстановление

### Создание бэкапа

```bash
# Бэкап файлов
tar -czf vds-logistic-backup-$(date +%Y%m%d).tar.gz /var/www/vds-logistic

# Копирование .env (ВАЖНО!)
cp /var/www/vds-logistic/.env ~/vds-logistic-env-backup
```

### Восстановление

```bash
# Распаковка бэкапа
tar -xzf vds-logistic-backup-*.tar.gz -C /

# Восстановление .env
cp ~/vds-logistic-env-backup /var/www/vds-logistic/.env

# Перезапуск
pm2 restart vds-logistic
```

---

## Безопасность

1. **Смените SSH порт**:
```bash
sudo nano /etc/ssh/sshd_config
# Измените Port 22 на другой порт
sudo systemctl restart sshd
```

2. **Настройте Fail2Ban**:
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

3. **Регулярно обновляйте систему**:
```bash
sudo apt update && sudo apt upgrade -y
```

4. **Используйте SSH ключи вместо паролей**

---

## Контакты и поддержка

При возникновении проблем:
1. Проверьте логи приложения и Nginx
2. Убедитесь, что все переменные окружения настроены
3. Проверьте файрвол и DNS записи

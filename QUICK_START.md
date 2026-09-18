# Быстрый старт (для РФ с SOCKS5)

## 1. Подготовка (5 минут)

На вашей локальной машине:

```bash
# Убедитесь, что у вас есть:
# - VPS в России (где будет сайт)
# - VPS за рубежом (для прокси) ИЛИ платный SOCKS5 прокси

# Проверьте, что можете подключиться по SSH к обоим серверам
ssh root@ru-vps-ip
ssh root@foreign-vps-ip
```

## 2. Деплой на RU VPS (10 минут)

```bash
# Подключитесь к RU серверу
ssh root@ru-vps-ip

# Загрузите проект
cd /var/www
git clone <your-repo> vds-logistic
cd vds-logistic

# Запустите автоматический деплой
chmod +x deploy.sh
./deploy.sh

# Дождитесь завершения установки
```

## 3. Настройка SOCKS5 прокси (5 минут)

### Вариант A: Автоматическая настройка SSH туннеля

```bash
cd /var/www/vds-logistic
chmod +x setup-ssh-tunnel.sh
./setup-ssh-tunnel.sh

# Скрипт спросит:
# - IP иностранного VPS
# - SSH пользователя (обычно root)
# - SSH порт (обычно 22)
```

### Вариант B: Платный SOCKS5 прокси

Если используете коммерческий прокси, сразу переходите к шагу 4.

## 4. Настройка Telegram бота (5 минут)

### Создайте бота

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте команду: `/newbot`
3. Укажите имя бота: `VDS Logistic Bot`
4. Укажите username: `vds_logistic_bot` (или другой доступный)
5. Скопируйте токен: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### Получите Chat ID

```bash
# Напишите боту любое сообщение, затем выполните на сервере:
curl https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates

# Найдите в ответе: "chat":{"id":123456789}
```

## 5. Настройка переменных окружения (3 минуты)

```bash
nano /var/www/vds-logistic/.env
```

Заполните:

```env
PORT=8080

# SOCKS5 прокси (если настроили через setup-ssh-tunnel.sh)
SOCKS5_PROXY=socks5h://127.0.0.1:1080

# Или если используете платный прокси:
# SOCKS5_PROXY=socks5h://user:pass@proxy-host:port

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789

# Яндекс Метрика (необязательно на первом этапе)
YANDEX_METRIKA_ID=
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

## 6. Запуск и проверка (2 минуты)

```bash
cd /var/www/vds-logistic

# Установите зависимости
npm install

# Протестируйте подключение к Telegram
chmod +x test-telegram.mjs
node test-telegram.mjs

# Если тест прошёл успешно, запустите приложение
pm2 restart vds-logistic

# Проверьте статус
pm2 status
pm2 logs vds-logistic --lines 50
```

Вы должны увидеть:
```
Using SOCKS5 proxy for Telegram: socks5h://127.0.0.1:1080
VDS Logistic: http://localhost:8080
```

## 7. Настройка SSL (5 минут)

Убедитесь, что DNS записи настроены (A-запись на IP сервера), затем:

```bash
# Получите SSL сертификат
certbot --nginx -d vds-logistic.cc -d www.vds-logistic.cc

# Перезагрузите Nginx
systemctl reload nginx
```

## 8. Финальная проверка

1. Откройте сайт: `https://vds-logistic.cc`
2. Заполните форму заявки на любой странице
3. Проверьте, что сообщение пришло в Telegram

---

## Готово! 🎉

Ваш сайт работает и принимает заявки.

## Полезные команды

```bash
# Просмотр логов
pm2 logs vds-logistic

# Перезапуск
pm2 restart vds-logistic

# Проверка прокси
systemctl status telegram-tunnel

# Проверка Nginx
systemctl status nginx

# Тест Telegram
cd /var/www/vds-logistic && node test-telegram.mjs
```

## Если что-то не работает

### Заявки не приходят в Telegram

```bash
# 1. Проверьте логи приложения
pm2 logs vds-logistic --err

# 2. Проверьте прокси
systemctl status telegram-tunnel
journalctl -u telegram-tunnel -n 50

# 3. Протестируйте Telegram
cd /var/www/vds-logistic
node test-telegram.mjs

# 4. Проверьте .env
cat .env | grep TELEGRAM
cat .env | grep SOCKS
```

### Прокси не работает

```bash
# Перезапустите туннель
systemctl restart telegram-tunnel

# Проверьте, что порт открыт
netstat -tlnp | grep 1080

# Проверьте доступ к иностранному VPS
ssh root@foreign-vps-ip "echo OK"

# Тест прокси вручную
curl -x socks5h://127.0.0.1:1080 https://api.telegram.org
```

### Сайт недоступен

```bash
# Проверьте Nginx
systemctl status nginx
nginx -t

# Проверьте приложение
pm2 status

# Проверьте порт
netstat -tlnp | grep 8080

# Проверьте файрвол
ufw status
```

---

## Дополнительная информация

- **Полная документация:** `DEPLOYMENT_GUIDE.md`
- **Настройка SOCKS5:** `SOCKS5_PROXY_SETUP.md`
- **Исходная инструкция по деплою:** `DEPLOY.md`

# Чеклист деплоя VDS Logistic

## Перед началом

- [ ] Есть доступ к RU VPS по SSH (root)
- [ ] Есть доступ к иностранному VPS по SSH (для SOCKS5)
- [ ] Домен настроен и DNS записи указывают на RU VPS
- [ ] Есть токен Telegram бота от @BotFather
- [ ] Известен Chat ID для получения заявок

---

## 1. Деплой сервера (10 мин)

```bash
ssh root@ru-vps-ip
cd /var/www
git clone <repo-url> vds-logistic
cd vds-logistic
chmod +x deploy.sh
./deploy.sh
```

**Проверка:**
- [ ] Node.js установлен: `node -v` (должно быть >= 20)
- [ ] PM2 установлен: `pm2 -v`
- [ ] Nginx установлен: `nginx -v`
- [ ] Приложение запущено: `pm2 status`

---

## 2. Настройка SOCKS5 прокси (5 мин)

```bash
cd /var/www/vds-logistic
chmod +x setup-ssh-tunnel.sh
./setup-ssh-tunnel.sh
```

Укажите:
- [ ] IP иностранного VPS
- [ ] SSH пользователя (обычно root)
- [ ] SSH порт (обычно 22)

**Проверка:**
```bash
systemctl status telegram-tunnel  # должно быть active (running)
curl -x socks5h://127.0.0.1:1080 https://api.telegram.org  # должно вернуть HTML
```

---

## 3. Настройка .env (3 мин)

```bash
nano /var/www/vds-logistic/.env
```

Заполните:
- [ ] `SOCKS5_PROXY=socks5h://127.0.0.1:1080`
- [ ] `TELEGRAM_BOT_TOKEN=<ваш токен>`
- [ ] `TELEGRAM_CHAT_ID=<ваш chat_id>`
- [ ] `YANDEX_METRIKA_ID=<ID счётчика>` (опционально)

**Проверка:**
```bash
cat .env | grep -E "(SOCKS5|TELEGRAM)"
```

---

## 4. Установка зависимостей (1 мин)

```bash
cd /var/www/vds-logistic
npm install
```

**Проверка:**
- [ ] Директория `node_modules` создана
- [ ] Файл `package-lock.json` создан

---

## 5. Тест Telegram интеграции (2 мин)

```bash
cd /var/www/vds-logistic
chmod +x test-telegram.mjs
node test-telegram.mjs
```

**Ожидаемый результат:**
- [ ] `✅ Bot is accessible!`
- [ ] `✅ Test message sent successfully!`
- [ ] Тестовое сообщение пришло в Telegram

---

## 6. Запуск приложения (1 мин)

```bash
pm2 restart vds-logistic
pm2 logs vds-logistic --lines 50
```

**Проверка логов - должны быть строки:**
- [ ] `Using SOCKS5 proxy for Telegram: socks5h://127.0.0.1:1080`
- [ ] `VDS Logistic: http://localhost:8080`
- [ ] Нет ошибок (ERROR)

---

## 7. Настройка SSL (5 мин)

**Убедитесь, что DNS настроен:**
```bash
ping vds-logistic.cc
# Должен вернуть IP вашего RU VPS
```

**Получите сертификат:**
```bash
certbot --nginx -d vds-logistic.cc -d www.vds-logistic.cc
systemctl reload nginx
```

**Проверка:**
- [ ] Certbot успешно получил сертификат
- [ ] Nginx перезагружен без ошибок
- [ ] `https://vds-logistic.cc` открывается в браузере

---

## 8. Финальное тестирование (5 мин)

### Проверка сайта

- [ ] Сайт открывается по HTTPS
- [ ] Нет SSL ошибок в браузере
- [ ] Все страницы доступны
- [ ] Формы заявок отображаются

### Проверка формы заявки

1. Откройте любую страницу с формой
2. Заполните форму:
   - [ ] Имя
   - [ ] Контакт (телефон/email)
   - [ ] Остальные поля (опционально)
3. Отправьте форму
4. Проверьте:
   - [ ] Появилось сообщение об успешной отправке
   - [ ] Заявка пришла в Telegram
   - [ ] В заявке правильные данные

### Проверка API

```bash
# Health check
curl https://vds-logistic.cc/api/health
# Ожидается: {"ok":true,"service":"vds-logistic"}

# Курсы валют
curl https://vds-logistic.cc/api/rates
# Ожидается: JSON с курсами USD и CNY
```

---

## 9. Яндекс Метрика (опционально)

Если настроили `YANDEX_METRIKA_ID`:

- [ ] Откройте сайт в браузере
- [ ] Откройте Developer Tools → Network
- [ ] Проверьте, что загружается скрипт `mc.yandex.ru`
- [ ] Зайдите в личный кабинет Метрики
- [ ] Проверьте, что визит зафиксирован

---

## 10. Настройка мониторинга (опционально)

### Автоматическая перезагрузка прокси при падении

```bash
crontab -e
```

Добавьте:
```
*/5 * * * * systemctl is-active --quiet telegram-tunnel || systemctl restart telegram-tunnel
```

### Email уведомления при падении приложения

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## После деплоя

### Регулярные проверки

**Ежедневно:**
- [ ] Проверяйте логи на ошибки: `pm2 logs vds-logistic --err --lines 50`
- [ ] Проверяйте, что заявки приходят

**Еженедельно:**
- [ ] Обновление системы: `apt update && apt upgrade -y`
- [ ] Проверка свободного места: `df -h`
- [ ] Проверка использования RAM: `free -h`

**Ежемесячно:**
- [ ] Ротация логов: `pm2 flush`
- [ ] Проверка SSL сертификата: `certbot certificates`

### Backup

Создайте резервную копию:
```bash
tar -czf vds-logistic-backup-$(date +%Y%m%d).tar.gz \
  /var/www/vds-logistic \
  /etc/nginx/sites-available/vds-logistic \
  /etc/systemd/system/telegram-tunnel.service
```

---

## Полезные команды

```bash
# PM2
pm2 status                          # Статус приложений
pm2 logs vds-logistic               # Логи в реальном времени
pm2 restart vds-logistic            # Перезапуск
pm2 monit                           # Мониторинг ресурсов

# Прокси туннель
systemctl status telegram-tunnel    # Статус
systemctl restart telegram-tunnel   # Перезапуск
journalctl -u telegram-tunnel -f    # Логи

# Nginx
systemctl status nginx              # Статус
nginx -t                            # Проверка конфигурации
systemctl reload nginx              # Перезагрузка без downtime

# Тесты
node /var/www/vds-logistic/test-telegram.mjs  # Тест Telegram
curl http://localhost:8080/api/health         # Health check
```

---

## Troubleshooting

### Заявки не приходят

1. Проверьте логи: `pm2 logs vds-logistic --err`
2. Проверьте прокси: `systemctl status telegram-tunnel`
3. Тест Telegram: `node test-telegram.mjs`

### Прокси не работает

1. Перезапустите: `systemctl restart telegram-tunnel`
2. Проверьте SSH: `ssh root@foreign-vps-ip "echo OK"`
3. Проверьте порт: `netstat -tlnp | grep 1080`

### Сайт недоступен

1. Проверьте Nginx: `systemctl status nginx`
2. Проверьте PM2: `pm2 status`
3. Проверьте DNS: `ping vds-logistic.cc`
4. Проверьте файрвол: `ufw status`

---

## Готово! ✅

Ваш сайт работает и готов принимать заявки.

**Следующие шаги:**
- Добавьте настоящие контакты компании в футер
- Настройте рекламные кампании в Яндекс Директ
- Настройте цели в Яндекс Метрике
- Добавьте сайт в Яндекс Вебмастер

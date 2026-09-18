# Настройка SOCKS5 прокси для Telegram в РФ

## Проблема
Telegram API заблокирован на территории РФ. Для отправки сообщений через бота необходим SOCKS5 прокси.

## Решения

### Вариант 1: Локальный SSH туннель (самый простой)

Если у вас есть VPS за пределами РФ:

```bash
# На вашем RU сервере создайте SSH туннель
ssh -D 1080 -f -C -q -N user@your-foreign-vps

# Проверьте, что туннель работает
netstat -tlnp | grep 1080
```

Добавьте в `.env`:
```env
SOCKS5_PROXY=socks5h://127.0.0.1:1080
```

**Автозапуск при перезагрузке:**

```bash
# Создайте systemd сервис
sudo nano /etc/systemd/system/telegram-tunnel.service
```

```ini
[Unit]
Description=SSH Tunnel for Telegram API
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/ssh -D 1080 -N -o ServerAliveInterval=60 -o ServerAliveCountMax=3 user@your-foreign-vps
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Включите и запустите
sudo systemctl enable telegram-tunnel
sudo systemctl start telegram-tunnel
sudo systemctl status telegram-tunnel
```

---

### Вариант 2: Dante SOCKS5 сервер на другом VPS

Если у вас есть отдельный VPS за пределами РФ, установите на нём Dante.

**На иностранном VPS:**

```bash
# Установка
sudo apt update
sudo apt install -y dante-server

# Настройка
sudo nano /etc/danted.conf
```

Базовая конфигурация:
```
logoutput: syslog /var/log/danted.log

internal: 0.0.0.0 port = 1080
external: eth0

clientmethod: none
socksmethod: none

client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
}

socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    protocol: tcp udp
}
```

```bash
# Запуск
sudo systemctl restart danted
sudo systemctl enable danted

# Откройте порт в файрволе
sudo ufw allow 1080/tcp
```

**На RU сервере** добавьте в `.env`:
```env
SOCKS5_PROXY=socks5h://your-foreign-vps-ip:1080
```

---

### Вариант 3: С авторизацией (безопаснее)

**Dante с аутентификацией:**

```bash
sudo apt install -y dante-server sasl2-bin
```

`/etc/danted.conf`:
```
logoutput: syslog /var/log/danted.log

internal: 0.0.0.0 port = 1080
external: eth0

clientmethod: none
socksmethod: username

client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
}

socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    protocol: tcp udp
    socksmethod: username
}
```

Создайте пользователя:
```bash
sudo useradd -r -s /bin/false proxyuser
echo "proxyuser:yourStrongPassword" | sudo chpasswd
```

На RU сервере:
```env
SOCKS5_PROXY=socks5h://proxyuser:yourStrongPassword@your-vps-ip:1080
```

---

### Вариант 4: 3proxy (лёгкий и быстрый)

**На иностранном VPS:**

```bash
# Установка
sudo apt update
sudo apt install -y build-essential
wget https://github.com/3proxy/3proxy/archive/refs/tags/0.9.4.tar.gz
tar xzf 0.9.4.tar.gz
cd 3proxy-0.9.4
make -f Makefile.Linux
sudo make -f Makefile.Linux install

# Создайте конфиг
sudo nano /etc/3proxy/3proxy.cfg
```

```
# Базовая конфигурация без авторизации
daemon
log /var/log/3proxy/3proxy.log D
logformat "- +_L%t.%. %N.%p %E %U %C:%c %R:%r %O %I %h %T"
rotate 30

socks -p1080
```

Или с авторизацией:
```
daemon
log /var/log/3proxy/3proxy.log D
logformat "- +_L%t.%. %N.%p %E %U %C:%c %R:%r %O %I %h %T"
rotate 30

users proxyuser:CL:yourpassword

auth strong
socks -p1080
```

```bash
# Создайте директорию для логов
sudo mkdir -p /var/log/3proxy
sudo chown nobody:nogroup /var/log/3proxy

# Создайте systemd сервис
sudo nano /etc/systemd/system/3proxy.service
```

```ini
[Unit]
Description=3proxy Proxy Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/3proxy /etc/3proxy/3proxy.cfg
Restart=always
User=nobody

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable 3proxy
sudo systemctl start 3proxy
sudo ufw allow 1080/tcp
```

---

### Вариант 5: Коммерческие прокси-сервисы

Можно использовать платные SOCKS5 прокси:
- **ProxySeller** (proxyseller.com)
- **ProxyLine** (proxyline.net)
- **Proxy6** (proxy6.net)

Формат подключения:
```env
SOCKS5_PROXY=socks5h://user:pass@proxy-host:port
```

---

## Проверка работы прокси

### Проверка доступности Telegram API

```bash
# Без прокси (должно не работать в РФ)
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

# Через прокси
curl -x socks5h://127.0.0.1:1080 https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

Должно вернуть JSON с данными бота.

### Проверка из Node.js

Создайте тестовый файл `test-proxy.mjs`:

```javascript
import {SocksProxyAgent} from 'socks-proxy-agent';

const SOCKS_PROXY = 'socks5h://127.0.0.1:1080';
const BOT_TOKEN = 'YOUR_BOT_TOKEN';

const agent = new SocksProxyAgent(SOCKS_PROXY);

try {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
    {agent}
  );
  const data = await response.json();
  console.log('✅ Proxy works!');
  console.log(data);
} catch (error) {
  console.error('❌ Proxy failed:', error.message);
}
```

Запустите:
```bash
node test-proxy.mjs
```

---

## Настройка приложения

1. Установите зависимость:
```bash
npm install
```

2. Настройте `.env`:
```env
PORT=8080
YANDEX_METRIKA_ID=12345678

# SOCKS5 прокси для Telegram
SOCKS5_PROXY=socks5h://127.0.0.1:1080

# Telegram настройки
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

3. Запустите приложение:
```bash
pm2 restart vds-logistic
```

4. Проверьте логи:
```bash
pm2 logs vds-logistic
```

Должна появиться строка:
```
Using SOCKS5 proxy for Telegram: socks5h://127.0.0.1:1080
```

---

## Troubleshooting

### Ошибка "connect ECONNREFUSED"

Прокси-сервер не запущен или недоступен.

```bash
# Проверьте, что прокси слушает порт
netstat -tlnp | grep 1080

# Проверьте логи SSH туннеля
journalctl -u telegram-tunnel -n 50

# Проверьте Dante
sudo systemctl status danted
sudo tail -f /var/log/danted.log
```

### Ошибка "SOCKS: Connection refused"

Прокси работает, но не может подключиться к Telegram API.

```bash
# Проверьте, что на прокси-сервере разрешён исходящий трафик
# На иностранном VPS:
curl https://api.telegram.org
```

### Ошибка "telegram_403"

Неверный токен бота или бот заблокирован.

```bash
# Проверьте токен
curl -x socks5h://127.0.0.1:1080 \
  https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

### Приложение не использует прокси

Убедитесь, что:
1. Переменная `SOCKS5_PROXY` установлена в `.env`
2. Зависимость `socks-proxy-agent` установлена
3. Приложение перезапущено после изменения `.env`

```bash
# Проверьте переменные окружения
pm2 env 0

# Переустановите зависимости
cd /var/www/vds-logistic
npm install

# Перезапустите
pm2 restart vds-logistic
```

---

## Мониторинг

### Проверка работоспособности прокси

Создайте cron-задачу для мониторинга:

```bash
crontab -e
```

Добавьте:
```
*/5 * * * * curl -s -x socks5h://127.0.0.1:1080 https://api.telegram.org > /dev/null || systemctl restart telegram-tunnel
```

### Логирование

```bash
# Логи приложения
pm2 logs vds-logistic --lines 100

# Логи SSH туннеля
journalctl -u telegram-tunnel -f

# Логи Dante
sudo tail -f /var/log/danted.log
```

---

## Рекомендации по безопасности

1. **Используйте авторизацию** для SOCKS5 прокси, если он доступен извне
2. **Ограничьте доступ** к прокси через файрвол (только ваш RU сервер)
3. **Используйте SSH ключи** вместо паролей для SSH туннелей
4. **Регулярно обновляйте** прокси-сервер
5. **Мониторьте логи** на предмет подозрительной активности

---

## Альтернатива: Telegram Bot API Server

Можно развернуть свой Telegram Bot API Server на иностранном VPS, который не требует прокси.

Документация: https://core.telegram.org/bots/api#using-a-local-bot-api-server

Это более сложное решение, но даёт полный контроль.

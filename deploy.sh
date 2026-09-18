#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DOMAIN="${DOMAIN:-vds-logistic.cc}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo ./deploy.sh"
  exit 1
fi

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "package.json not found in ${APP_DIR}"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git sudo nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
fi

npm install --global pm2
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_DIR}/logs"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

if [[ ! -f "${APP_DIR}/.env" ]]; then
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/.env"
  echo "Created ${APP_DIR}/.env. Fill it in before testing leads."
fi

cd "${APP_DIR}"
if [[ -f package-lock.json ]]; then
  sudo -u "${DEPLOY_USER}" npm ci --omit=dev
else
  sudo -u "${DEPLOY_USER}" npm install --omit=dev
fi
sudo -u "${DEPLOY_USER}" pm2 delete vds-logistic >/dev/null 2>&1 || true
sudo -u "${DEPLOY_USER}" pm2 start ecosystem.config.cjs --update-env
sudo -u "${DEPLOY_USER}" pm2 save

sed "s/vds-logistic\.cc/${DOMAIN}/g" "${APP_DIR}/nginx.conf" > /etc/nginx/sites-available/vds-logistic
ln -sfn /etc/nginx/sites-available/vds-logistic /etc/nginx/sites-enabled/vds-logistic
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo
echo "Application is running on http://${DOMAIN} (or the server IP)."
echo "Next: edit ${APP_DIR}/.env, point DNS to this server, then run:"
echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "  sudo -u ${DEPLOY_USER} pm2 status"
echo "  sudo -u ${DEPLOY_USER} pm2 logs vds-logistic"

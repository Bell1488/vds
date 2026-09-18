#!/bin/bash
set -e

echo "=== VDS Logistic Deployment Script ==="

# Configuration
REPO_URL="your-git-repo-url"  # Замените на URL вашего репозитория
DEPLOY_USER="deploy"
DEPLOY_DIR="/var/www/vds-logistic"
DOMAIN="vds-logistic.cc"
NODE_VERSION="20"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Checking system...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Node.js
echo -e "${YELLOW}Installing Node.js ${NODE_VERSION}...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install PM2
echo -e "${YELLOW}Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Install Nginx
echo -e "${YELLOW}Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
fi

# Install Certbot for Let's Encrypt
echo -e "${YELLOW}Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
fi

# Create deploy user
echo -e "${YELLOW}Creating deploy user...${NC}"
if ! id -u $DEPLOY_USER > /dev/null 2>&1; then
    useradd -m -s /bin/bash $DEPLOY_USER
    echo -e "${GREEN}User $DEPLOY_USER created${NC}"
else
    echo -e "${YELLOW}User $DEPLOY_USER already exists${NC}"
fi

# Create deployment directory
echo -e "${YELLOW}Setting up deployment directory...${NC}"
mkdir -p $DEPLOY_DIR
mkdir -p $DEPLOY_DIR/logs
chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_DIR

# Deploy application
echo -e "${YELLOW}Deploying application...${NC}"
cd $DEPLOY_DIR

# If using Git
if [ ! -z "$REPO_URL" ] && [ "$REPO_URL" != "your-git-repo-url" ]; then
    echo -e "${YELLOW}Cloning from Git...${NC}"
    if [ -d ".git" ]; then
        sudo -u $DEPLOY_USER git pull
    else
        sudo -u $DEPLOY_USER git clone $REPO_URL .
    fi
fi

# Create .env file if doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${RED}IMPORTANT: Edit .env file with your settings!${NC}"
    echo "  nano $DEPLOY_DIR/.env"
fi

# Install npm dependencies
echo -e "${YELLOW}Installing npm dependencies...${NC}"
sudo -u $DEPLOY_USER npm install --production

# Configure Nginx
echo -e "${YELLOW}Configuring Nginx...${NC}"
cp nginx.conf /etc/nginx/sites-available/vds-logistic
ln -sf /etc/nginx/sites-available/vds-logistic /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Get SSL certificate
echo -e "${YELLOW}Setting up SSL certificate...${NC}"
echo -e "${YELLOW}NOTE: Make sure DNS records point to this server!${NC}"
read -p "Do you want to obtain SSL certificate now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || echo -e "${YELLOW}SSL setup skipped. Run manually: certbot --nginx -d $DOMAIN${NC}"
fi

# Reload Nginx
systemctl reload nginx
systemctl enable nginx

# Start application with PM2
echo -e "${YELLOW}Starting application...${NC}"
cd $DEPLOY_DIR
sudo -u $DEPLOY_USER pm2 delete vds-logistic 2>/dev/null || true
sudo -u $DEPLOY_USER pm2 start ecosystem.config.cjs
sudo -u $DEPLOY_USER pm2 save

# Setup PM2 startup
pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER
systemctl enable pm2-$DEPLOY_USER

# Setup UFW firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
fi

echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Application URL: https://$DOMAIN"
echo "PM2 status: pm2 status"
echo "PM2 logs: pm2 logs vds-logistic"
echo "PM2 restart: pm2 restart vds-logistic"
echo ""
echo -e "${RED}Don't forget to:${NC}"
echo "1. Edit .env file: nano $DEPLOY_DIR/.env"
echo "2. Add SOCKS5_PROXY (e.g., socks5h://127.0.0.1:1080)"
echo "3. Add Telegram bot token and chat ID"
echo "4. Add Yandex Metrika ID"
echo "5. Setup SOCKS5 proxy (see SOCKS5_PROXY_SETUP.md)"
echo "6. Restart app: pm2 restart vds-logistic"
echo ""
echo -e "${YELLOW}For Telegram in Russia, read: $DEPLOY_DIR/SOCKS5_PROXY_SETUP.md${NC}"

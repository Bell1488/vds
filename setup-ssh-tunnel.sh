#!/bin/bash
# Quick SSH tunnel setup for Telegram API in Russia

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== SSH Tunnel Setup for Telegram ===${NC}"
echo ""

# Get foreign VPS details
read -p "Enter foreign VPS IP or hostname: " FOREIGN_HOST
read -p "Enter SSH user (default: root): " SSH_USER
SSH_USER=${SSH_USER:-root}
read -p "Enter SSH port (default: 22): " SSH_PORT
SSH_PORT=${SSH_PORT:-22}

echo ""
echo -e "${YELLOW}Testing SSH connection...${NC}"

# Test SSH connection
if ssh -p $SSH_PORT -o ConnectTimeout=5 -o BatchMode=yes $SSH_USER@$FOREIGN_HOST exit 2>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful!${NC}"
else
    echo -e "${RED}✗ Cannot connect to $SSH_USER@$FOREIGN_HOST:$SSH_PORT${NC}"
    echo ""
    echo "Please make sure:"
    echo "1. SSH key is added to the foreign server"
    echo "2. Host is reachable"
    echo "3. Port and credentials are correct"
    echo ""
    echo "To add your SSH key to the foreign server:"
    echo "  ssh-copy-id -p $SSH_PORT $SSH_USER@$FOREIGN_HOST"
    exit 1
fi

# Create systemd service
echo ""
echo -e "${YELLOW}Creating systemd service...${NC}"

SERVICE_FILE="/etc/systemd/system/telegram-tunnel.service"

cat > /tmp/telegram-tunnel.service <<EOF
[Unit]
Description=SSH Tunnel for Telegram API
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/ssh -D 1080 -N -p $SSH_PORT -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=no $SSH_USER@$FOREIGN_HOST
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/telegram-tunnel.service $SERVICE_FILE
sudo chmod 644 $SERVICE_FILE

# Enable and start service
echo -e "${YELLOW}Starting tunnel service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable telegram-tunnel
sudo systemctl start telegram-tunnel

# Wait a bit for tunnel to establish
sleep 2

# Check service status
if systemctl is-active --quiet telegram-tunnel; then
    echo -e "${GREEN}✓ Tunnel service is running!${NC}"

    # Test tunnel
    echo ""
    echo -e "${YELLOW}Testing tunnel...${NC}"
    if curl -s -x socks5h://127.0.0.1:1080 --max-time 5 https://api.telegram.org > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Tunnel is working! Telegram API is reachable.${NC}"
    else
        echo -e "${YELLOW}⚠ Tunnel started but Telegram API test failed.${NC}"
        echo "This might be temporary. Check logs: journalctl -u telegram-tunnel -f"
    fi
else
    echo -e "${RED}✗ Tunnel service failed to start${NC}"
    echo ""
    echo "Check logs for details:"
    echo "  journalctl -u telegram-tunnel -n 50"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "Tunnel is running on: 127.0.0.1:1080"
echo ""
echo "Add this to your .env file:"
echo -e "${YELLOW}SOCKS5_PROXY=socks5h://127.0.0.1:1080${NC}"
echo ""
echo "Useful commands:"
echo "  Status:  systemctl status telegram-tunnel"
echo "  Logs:    journalctl -u telegram-tunnel -f"
echo "  Restart: systemctl restart telegram-tunnel"
echo "  Stop:    systemctl stop telegram-tunnel"

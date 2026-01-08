#!/bin/bash
# EC2 Setup Script for SplitCash
# Run this script on your EC2 instance after SSH connection

set -e

echo "🚀 Starting SplitCash EC2 Setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Python and dependencies
echo "🐍 Installing Python..."
sudo apt install -y python3 python3-pip python3-venv python3-dev build-essential

# Install nginx
echo "🌐 Installing nginx..."
sudo apt install -y nginx

# Install git
echo "📂 Installing git..."
sudo apt install -y git curl

# Install Docker (optional, uncomment if using Docker)
# echo "🐳 Installing Docker..."
# curl -fsSL https://get.docker.com -o get-docker.sh
# sudo sh get-docker.sh
# sudo usermod -aG docker ubuntu
# sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
# sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /home/ubuntu/splitcash
cd /home/ubuntu/splitcash

# Clone repository (or copy files manually)
echo "📥 Cloning repository..."
if [ -d ".git" ]; then
    echo "Repository already exists, pulling latest..."
    git pull origin main
else
    git clone https://github.com/NielParekh/SplitCash.git .
fi

# Create virtual environment
echo "🔧 Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
echo "📂 Creating data and logs directories..."
mkdir -p data logs
if [ ! -f "data/transactions.json" ]; then
    echo '[]' > data/transactions.json
fi

# Set up systemd service
echo "⚙️ Setting up systemd service..."
sudo tee /etc/systemd/system/splitcash.service > /dev/null <<EOF
[Unit]
Description=SplitCash Flask Application
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/splitcash
Environment="PATH=/home/ubuntu/splitcash/venv/bin"
ExecStart=/home/ubuntu/splitcash/venv/bin/gunicorn --bind 127.0.0.1:8000 --workers 2 --timeout 120 app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable splitcash
sudo systemctl start splitcash

# Configure nginx
echo "🌐 Configuring nginx..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "_")

# If PUBLIC_IP is empty, use default server
if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "" ]; then
    PUBLIC_IP="_"
fi

sudo tee /etc/nginx/sites-available/splitcash > /dev/null <<EOF
server {
    listen 80;
    server_name $PUBLIC_IP;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/splitcash /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

# Check status
echo "✅ Checking service status..."
sleep 2
sudo systemctl status splitcash --no-pager -l

echo ""
echo "✅ Setup complete!"
echo "🌐 Your application should be available at: http://$PUBLIC_IP"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: sudo journalctl -u splitcash -f"
echo "  - Restart app: sudo systemctl restart splitcash"
echo "  - Check status: sudo systemctl status splitcash"
echo "  - Update app: cd /home/ubuntu/splitcash && git pull && sudo systemctl restart splitcash"

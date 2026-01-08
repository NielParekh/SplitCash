# AWS EC2 Deployment Guide for SplitCash

This guide will help you deploy SplitCash directly to an AWS EC2 instance.

## Prerequisites

1. **AWS Account** with EC2 access
2. **AWS CLI** installed (optional but helpful)
3. **SSH client** (built into macOS/Linux, use PuTTY on Windows)

## Step 1: Launch an EC2 Instance

### Option A: Using AWS Console

1. **Log into AWS Console**
   - Go to https://console.aws.amazon.com/
   - Navigate to EC2 service

2. **Launch Instance**
   - Click "Launch Instance"
   - **Name**: `splitcash-prod` or similar

3. **Choose Amazon Machine Image (AMI)**
   - Select **Ubuntu Server 22.04 LTS** (free tier eligible)
   - Or **Amazon Linux 2023** if you prefer

4. **Choose Instance Type**
   - **Free Tier**: `t2.micro` or `t3.micro` (enough for testing)
   - **Production**: `t2.small` or `t3.small` (for better performance)

5. **Create/Select Key Pair**
   - Create new key pair or use existing
   - Download the `.pem` file (you'll need it to SSH)
   - **Important**: Save this file securely!

6. **Network Settings**
   - Allow HTTP (port 80) and HTTPS (port 443) from anywhere (0.0.0.0/0)
   - Or restrict to your IP for security
   - Add SSH (port 22) from your IP

7. **Configure Storage**
   - Default 8GB is usually enough (free tier)
   - Increase if you expect large data

8. **Launch Instance**
   - Review and click "Launch Instance"

9. **Note Your Instance Details**
   - Public IP address (e.g., `54.123.45.67`)
   - Security Group ID
   - Instance ID

### Option B: Using AWS CLI

```bash
# Create key pair
aws ec2 create-key-pair --key-name splitcash-key --query 'KeyMaterial' --output text > splitcash-key.pem
chmod 400 splitcash-key.pem

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t2.micro \
  --key-name splitcash-key \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx \
  --user-data file://ec2-user-data.sh
```

## Step 2: Configure Security Group

After instance launch, configure security group:

1. **Go to EC2 → Security Groups**
2. **Select your instance's security group**
3. **Add Inbound Rules**:
   - Type: **HTTP**, Port: **80**, Source: **0.0.0.0/0**
   - Type: **HTTPS**, Port: **443**, Source: **0.0.0.0/0**
   - Type: **SSH**, Port: **22**, Source: **Your IP** (for security)
   - Type: **Custom TCP**, Port: **8000**, Source: **127.0.0.1/32** (for local testing)

## Step 3: Connect to Your EC2 Instance

### For Ubuntu/Linux (macOS/Linux)

```bash
# Make key file executable (only once)
chmod 400 /path/to/your-key.pem

# Connect to instance
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP

# Example:
# ssh -i ~/Downloads/splitcash-key.pem ubuntu@54.123.45.67
```

### For Amazon Linux

```bash
ssh -i /path/to/your-key.pem ec2-user@YOUR_PUBLIC_IP
```

### For Windows (PuTTY)

1. Convert `.pem` to `.ppk` using PuTTYgen
2. Use PuTTY to connect with the `.ppk` file
3. Host: `ubuntu@YOUR_PUBLIC_IP` (or `ec2-user@YOUR_PUBLIC_IP` for Amazon Linux)

## Step 4: Set Up the Server

### Update System (Ubuntu)

```bash
sudo apt update
sudo apt upgrade -y
```

### Install Required Software

#### Option A: Direct Python Deployment

```bash
# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install nginx (web server/reverse proxy)
sudo apt install nginx -y

# Install git
sudo apt install git -y

# Install other utilities
sudo apt install curl -y
```

#### Option B: Docker Deployment (Recommended)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (replace 'ubuntu' with your username)
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for docker group to take effect
exit
# Then SSH back in
```

## Step 5: Deploy Your Application

**IMPORTANT**: Always clone the repository first - don't use curl to download individual files as they may not be accessible.

### Option A: Deploy with Docker (Easiest)

```bash
# Create application directory
mkdir -p /home/ubuntu/splitcash
cd /home/ubuntu/splitcash

# Clone your repository
git clone https://github.com/NielParekh/SplitCash.git .

# Make setup scripts executable
chmod +x ec2-setup.sh ec2-deploy.sh

# Option 1: Use the automated setup script (recommended)
./ec2-setup.sh

# Option 2: Manual Docker setup
docker-compose up -d

# Check if it's running
docker ps
docker-compose logs -f
```

### Alternative: Copy Files via SCP from Your Local Machine

If you prefer to copy files directly:

```bash
# From your local machine (not on EC2):
# Make sure you're in the SplitCash directory
cd /Users/nielparekh/Desktop/SplitCash

# Copy all files to EC2
scp -i /path/to/key.pem -r . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/

# Then SSH into EC2
ssh -i /path/to/key.pem ubuntu@YOUR_PUBLIC_IP
cd /home/ubuntu/splitcash
chmod +x ec2-setup.sh ec2-deploy.sh
./ec2-setup.sh
```

### Option B: Deploy with Python (Direct)

```bash
# Create application directory
mkdir -p /home/ubuntu/splitcash
cd /home/ubuntu/splitcash

# Clone your repository
git clone https://github.com/NielParekh/SplitCash.git .

# Option 1: Use the automated setup script (recommended - it does everything below)
chmod +x ec2-setup.sh
./ec2-setup.sh

# Option 2: Manual setup (if you prefer step-by-step)
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p data logs
echo '[]' > data/transactions.json

# Test run (in screen/tmux session for now)
gunicorn --bind 0.0.0.0:8000 --workers 2 app:app

# Press Ctrl+C to stop, then set up as service below
```

## Step 6: Set Up as a System Service (for Direct Python Deployment)

Create a systemd service for auto-restart:

```bash
sudo nano /etc/systemd/system/splitcash.service
```

Add this content:

```ini
[Unit]
Description=SplitCash Flask Application
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/splitcash
Environment="PATH=/home/ubuntu/splitcash/venv/bin"
ExecStart=/home/ubuntu/splitcash/venv/bin/gunicorn --bind 0.0.0.0:8000 --workers 2 --timeout 120 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable splitcash
sudo systemctl start splitcash
sudo systemctl status splitcash
```

## Step 7: Configure Nginx as Reverse Proxy

### Install Nginx (if not already installed)

```bash
sudo apt install nginx -y
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/splitcash
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_PUBLIC_IP;  # Replace with your EC2 public IP or domain

    # Increase body size limit for large requests
    client_max_body_size 10M;

    # Proxy to Flask app
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed later)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve static files directly (optional optimization)
    location /static {
        alias /home/ubuntu/splitcash;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/splitcash /etc/nginx/sites-enabled/

# Remove default nginx site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 8: Set Up SSL with Let's Encrypt (Optional but Recommended)

For HTTPS:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain or use EC2 public IP)
sudo certbot --nginx -d your-domain.com

# Or if using EC2 public IP, you'll need to set up a domain first

# Auto-renewal is set up automatically
sudo certbot renew --dry-run
```

## Step 9: Access Your Application

Your application should now be accessible at:

- **HTTP**: `http://YOUR_PUBLIC_IP`
- **HTTPS**: `https://YOUR_PUBLIC_IP` (if SSL is configured)

## Step 10: Set Up Automatic Deployments (Optional)

### Simple Deployment Script

Create a deployment script:

```bash
nano /home/ubuntu/splitcash/deploy.sh
```

Add:

```bash
#!/bin/bash
cd /home/ubuntu/splitcash

# Pull latest changes
git pull origin main

# For Docker deployment
docker-compose down
docker-compose build
docker-compose up -d

# For Python deployment
# source venv/bin/activate
# pip install -r requirements.txt
# sudo systemctl restart splitcash

echo "Deployment complete!"
```

Make it executable:

```bash
chmod +x /home/ubuntu/splitcash/deploy.sh
```

## Useful Commands

### Check Application Status

```bash
# Docker
docker ps
docker-compose logs -f splitcash

# Python service
sudo systemctl status splitcash
sudo journalctl -u splitcash -f
```

### Restart Application

```bash
# Docker
docker-compose restart

# Python service
sudo systemctl restart splitcash
```

### View Logs

```bash
# Docker
docker-compose logs -f

# Python
sudo journalctl -u splitcash -n 100 -f

# Application logs
tail -f /home/ubuntu/splitcash/logs/splitcash.log
```

### Update Application

```bash
cd /home/ubuntu/splitcash
git pull origin main

# Docker
docker-compose up -d --build

# Python
sudo systemctl restart splitcash
```

## Security Considerations

### 1. Firewall (UFW)

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 2. Keep System Updated

```bash
# Set up automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Use Strong SSH Keys

- Use key pairs (not passwords)
- Disable password authentication in `/etc/ssh/sshd_config`
- Use a passphrase on your private key

### 4. Regular Backups

```bash
# Create backup script
nano /home/ubuntu/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /home/ubuntu/backups/splitcash_$DATE.tar.gz /home/ubuntu/splitcash/data
aws s3 cp /home/ubuntu/backups/splitcash_$DATE.tar.gz s3://your-backup-bucket/
```

## Troubleshooting

### Application Not Loading

1. **Check if app is running:**
   ```bash
   docker ps  # or
   sudo systemctl status splitcash
   ```

2. **Check nginx:**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **Check logs:**
   ```bash
   docker-compose logs  # or
   sudo journalctl -u splitcash -n 50
   ```

4. **Check security group:**
   - Ensure HTTP (80) and HTTPS (443) are open in AWS Console

5. **Check firewall:**
   ```bash
   sudo ufw status
   ```

### Connection Refused

- Verify security group allows traffic on port 80/443
- Check if application is bound to 0.0.0.0, not 127.0.0.1
- Verify nginx is running and configured correctly

### Permission Errors

```bash
# Fix file permissions
sudo chown -R ubuntu:ubuntu /home/ubuntu/splitcash
chmod +x /home/ubuntu/splitcash/*.sh
```

## Cost Estimation

- **t2.micro** (Free Tier): Free for first 12 months (750 hours/month)
- **t2.small**: ~$15-20/month
- **EBS Storage**: ~$0.10/GB/month
- **Data Transfer**: First 1GB/month free, then ~$0.09/GB

**Total (Free Tier)**: $0 for first 12 months
**Total (after Free Tier)**: ~$15-25/month

## Next Steps

1. **Set up a domain name** (Route 53 or other DNS provider)
2. **Configure SSL certificate** with Let's Encrypt
3. **Set up monitoring** (CloudWatch, DataDog, etc.)
4. **Set up automated backups**
5. **Configure auto-scaling** if traffic grows
6. **Set up CI/CD** for automatic deployments

## Quick Reference

| Task | Command |
|------|---------|
| Connect to EC2 | `ssh -i key.pem ubuntu@IP` |
| Start app (Docker) | `docker-compose up -d` |
| Start app (Python) | `sudo systemctl start splitcash` |
| View logs | `docker-compose logs -f` or `sudo journalctl -u splitcash -f` |
| Restart app | `docker-compose restart` or `sudo systemctl restart splitcash` |
| Update app | `git pull && docker-compose up -d --build` |
| Check status | `docker ps` or `sudo systemctl status splitcash` |

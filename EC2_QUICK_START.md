# EC2 Quick Start Guide

This is a simplified guide for deploying SplitCash to EC2. If you encounter any issues, see the full [EC2_DEPLOYMENT.md](EC2_DEPLOYMENT.md) guide.

## Prerequisites

1. AWS Account
2. EC2 Instance running Ubuntu 22.04 LTS
3. SSH access to your EC2 instance

## Quick Deployment (5 Steps)

### Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2
2. Launch Instance → Ubuntu Server 22.04 LTS
3. Choose **t2.micro** (free tier)
4. Create/select key pair (download `.pem` file)
5. Configure Security Group:
   - **HTTP** (port 80) from anywhere
   - **HTTPS** (port 443) from anywhere  
   - **SSH** (port 22) from your IP
6. Launch instance

### Step 2: Connect to EC2

```bash
# From your local machine
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP
```

### Step 3: Clone Repository

```bash
# Clone your repository
git clone https://github.com/NielParekh/SplitCash.git
cd SplitCash

# Make scripts executable
chmod +x ec2-setup.sh ec2-deploy.sh
```

**Note**: If the repository is private, you may need to set up SSH keys or use HTTPS with credentials.

### Step 4: Run Setup Script

```bash
# This will install everything and set up the application
./ec2-setup.sh
```

The script will:
- Install Python, nginx, and dependencies
- Set up virtual environment
- Configure systemd service
- Configure nginx as reverse proxy
- Set up firewall
- Start the application

**Time**: About 5-10 minutes

### Step 5: Access Your Application

Once setup completes, your application will be available at:

```
http://YOUR_PUBLIC_IP
```

Replace `YOUR_PUBLIC_IP` with your EC2 instance's public IP address.

## Troubleshooting

### Repository Clone Fails (404 or Authentication)

**Option 1: Use HTTPS with Personal Access Token**
```bash
# Generate a token at: https://github.com/settings/tokens
git clone https://YOUR_TOKEN@github.com/NielParekh/SplitCash.git
```

**Option 2: Copy Files via SCP**
```bash
# From your local machine
cd /Users/nielparekh/Desktop/SplitCash
scp -i /path/to/key.pem -r . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/

# Then SSH and continue
ssh -i /path/to/key.pem ubuntu@YOUR_PUBLIC_IP
cd /home/ubuntu/splitcash
chmod +x ec2-setup.sh
./ec2-setup.sh
```

**Option 3: Set Up SSH Keys for GitHub**
```bash
# On EC2, generate SSH key
ssh-keygen -t ed25519 -C "ec2@splitcash"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH and GPG keys → New SSH key

# Clone using SSH
git clone git@github.com:NielParekh/SplitCash.git
```

### Application Not Loading

1. **Check if service is running:**
   ```bash
   sudo systemctl status splitcash
   ```

2. **Check nginx:**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **View logs:**
   ```bash
   sudo journalctl -u splitcash -f
   tail -f /home/ubuntu/splitcash/logs/splitcash.log
   ```

4. **Check security group:**
   - Ensure HTTP (80) is open in AWS Console

### Setup Script Fails

If the automated script fails, you can manually follow the steps in [EC2_DEPLOYMENT.md](EC2_DEPLOYMENT.md), starting from "Step 4: Set Up the Server".

## Updating Your Application

After making changes and pushing to GitHub:

```bash
cd /home/ubuntu/splitcash
./ec2-deploy.sh
```

Or manually:
```bash
cd /home/ubuntu/splitcash
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart splitcash
```

## Useful Commands

```bash
# View application status
sudo systemctl status splitcash

# View logs
sudo journalctl -u splitcash -f

# Restart application
sudo systemctl restart splitcash

# Check nginx
sudo nginx -t
sudo systemctl status nginx

# View your public IP
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

## Next Steps

- Set up a custom domain
- Configure SSL/HTTPS with Let's Encrypt
- Set up automatic backups
- Configure monitoring

See [EC2_DEPLOYMENT.md](EC2_DEPLOYMENT.md) for detailed instructions.

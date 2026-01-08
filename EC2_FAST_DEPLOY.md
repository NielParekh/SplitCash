# EC2 Fastest Deployment (No Git Authentication Issues)

If you're having trouble with GitHub authentication, use this method to deploy directly from your local machine to EC2.

## Prerequisites

- EC2 instance running and accessible
- SSH key file (`.pem`) for EC2
- Local machine has all the SplitCash files

## Quick Deploy (3 Steps)

### Step 1: Connect and Prepare EC2

```bash
# SSH into your EC2 instance
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP

# Create directory
mkdir -p /home/ubuntu/splitcash
exit  # Exit EC2, back to your local machine
```

### Step 2: Copy Files from Your Local Machine

```bash
# From your LOCAL machine (not on EC2)
cd /Users/nielparekh/Desktop/SplitCash

# Copy all files to EC2 (excluding .git and unnecessary files)
rsync -avz -e "ssh -i /path/to/your-key.pem" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.DS_Store' \
  --exclude 'logs/*.log' \
  --exclude 'data/transactions.json' \
  . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/

# OR use scp (simpler but slower):
scp -i /path/to/your-key.pem -r \
  . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/
```

### Step 3: SSH Back and Run Setup

```bash
# SSH back into EC2
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP

# Navigate to directory
cd /home/ubuntu/splitcash

# Make scripts executable
chmod +x ec2-setup.sh ec2-deploy.sh

# Run automated setup
./ec2-setup.sh
```

**Done!** Your app should be available at `http://YOUR_PUBLIC_IP`

## What This Does

The `ec2-setup.sh` script will:
- Install Python, nginx, and all dependencies
- Set up virtual environment
- Install Python packages
- Configure systemd service
- Configure nginx as reverse proxy
- Set up firewall
- Start the application automatically

## Updating Your App Later

When you make changes and want to update:

```bash
# From your local machine
cd /Users/nielparekh/Desktop/SplitCash

# Copy updated files
rsync -avz -e "ssh -i /path/to/your-key.pem" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.DS_Store' \
  --exclude 'logs' \
  --exclude 'data' \
  . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/

# SSH into EC2
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP

# Run deployment script
cd /home/ubuntu/splitcash
./ec2-deploy.sh
```

Or manually:
```bash
# On EC2
cd /home/ubuntu/splitcash
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart splitcash
```

## Advantages of This Method

✅ **No Git authentication needed**  
✅ **No token management**  
✅ **Works with private repositories**  
✅ **Fast and reliable**  
✅ **Full control over what files are copied**

## Troubleshooting

### rsync Not Found
```bash
# Install rsync on your local machine
# macOS:
brew install rsync

# Or just use scp instead
```

### Permission Denied
```bash
# Check SSH key permissions
chmod 400 /path/to/your-key.pem
```

### Files Not Copying
```bash
# Use verbose mode to see what's happening
rsync -avz -e "ssh -i /path/to/your-key.pem" --progress \
  --exclude '.git' . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/
```

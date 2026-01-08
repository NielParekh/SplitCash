#!/bin/bash
# Quick deployment script to update SplitCash on EC2
# Run this script on your EC2 instance to update the application

set -e

echo "🚀 Deploying SplitCash update..."

cd /home/ubuntu/splitcash

# Pull latest changes
echo "📥 Pulling latest changes from repository..."
git pull origin main

# Activate virtual environment
source venv/bin/activate

# Update dependencies (if requirements.txt changed)
echo "📦 Updating dependencies..."
pip install -r requirements.txt

# Restart the service
echo "🔄 Restarting application..."
sudo systemctl restart splitcash

# Check status
sleep 2
echo "✅ Checking status..."
sudo systemctl status splitcash --no-pager -l

echo ""
echo "✅ Deployment complete!"
echo "🌐 Application should be updated and running."

# Automatic Deployment Setup for EC2

This guide explains how to set up automatic deployment using GitHub Actions.

## What This Does

When you push code to the `main` branch, GitHub Actions will:
1. SSH into your EC2 instance
2. Pull the latest code
3. Update dependencies
4. Restart the application

**Result**: Your changes are automatically deployed without manually SSH'ing into EC2!

## Prerequisites

- GitHub repository (already have)
- EC2 instance with SplitCash deployed
- SSH access to EC2 instance

## Setup Steps

### Step 1: Generate SSH Key for GitHub Actions

On your **local machine**, generate a new SSH key pair:

```bash
# Generate deploy key (no passphrase for GitHub Actions)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# Display the private key (you'll add this to GitHub Secrets)
cat ~/.ssh/github_actions_deploy

# Display the public key (add this to EC2)
cat ~/.ssh/github_actions_deploy.pub
```

**Important**: Save both keys!

### Step 2: Add Public Key to EC2

SSH into your EC2 instance:

```bash
ssh -i /path/to/your-ec2-key.pem ubuntu@YOUR_PUBLIC_IP
```

Add the public key to authorized_keys:

```bash
# On EC2
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Replace `YOUR_PUBLIC_KEY_HERE` with the content from `~/.ssh/github_actions_deploy.pub`.

### Step 3: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these secrets:

#### Secret 1: `EC2_HOST`
- Name: `EC2_HOST`
- Value: Your EC2 public IP address (e.g., `54.123.45.67`)
- Click **Add secret**

#### Secret 2: `EC2_USER`
- Name: `EC2_USER`
- Value: `ubuntu` (or `ec2-user` for Amazon Linux)
- Click **Add secret**

#### Secret 3: `EC2_SSH_KEY`
- Name: `EC2_SSH_KEY`
- Value: The **private key** content from `~/.ssh/github_actions_deploy`
  - Copy the entire content including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`
- Click **Add secret**

### Step 4: Test Deployment

1. **Make a small change** to any file (like adding a comment)
2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Test automatic deployment"
   git push origin main
   ```
3. **Check GitHub Actions:**
   - Go to your repository on GitHub
   - Click **Actions** tab
   - You should see "Deploy to EC2" workflow running
   - Wait for it to complete (should take 1-2 minutes)

### Step 5: Verify Deployment

Check your application at `http://YOUR_PUBLIC_IP` to see if changes are live!

## How It Works

1. You push code to `main` branch
2. GitHub Actions workflow triggers
3. Workflow SSH's into EC2
4. Runs deployment commands automatically
5. Application restarts with new code

## Manual Trigger

You can also manually trigger deployment from GitHub:
- Go to **Actions** tab
- Select **Deploy to EC2** workflow
- Click **Run workflow** → **Run workflow**

## Troubleshooting

### Workflow Fails with "Permission denied"

- Check that public key is in `~/.ssh/authorized_keys` on EC2
- Verify private key secret is correct (includes headers)
- Check EC2_USER secret matches your EC2 username

### Workflow Runs but Changes Not Deployed

- SSH into EC2 manually and check logs:
  ```bash
  sudo journalctl -u splitcash -n 50
  ```
- Check if git pull worked:
  ```bash
  cd /home/ubuntu/splitcash
  git log -1
  ```

### Can't Connect to EC2

- Verify EC2_HOST secret has correct IP
- Check EC2 security group allows SSH (port 22) from anywhere (temporarily for testing)
- Verify EC2 instance is running

## Security Notes

1. **Private Key**: Never commit the private key to your repository
2. **SSH Key**: This deploy key should only have access to EC2, not other systems
3. **Secrets**: GitHub Secrets are encrypted and only accessible during workflow runs
4. **IP Whitelisting**: Consider restricting SSH access to GitHub Actions IP ranges (optional)

## Alternative: Branch-Based Deployment

To deploy only from specific branches or tags, modify `.github/workflows/deploy-ec2.yml`:

```yaml
on:
  push:
    branches:
      - main
      - production
    tags:
      - 'v*'
```

## Advanced: Add Notifications

Add Slack or email notifications on deployment success/failure. See GitHub Actions documentation.

## Disable Auto-Deploy

To temporarily disable automatic deployment:
1. Go to **Actions** tab
2. Click **Deploy to EC2** workflow
3. Click **...** → **Disable workflow**

Or remove the workflow file from `.github/workflows/`.

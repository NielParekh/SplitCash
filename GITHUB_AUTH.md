# GitHub Authentication for EC2 Deployment

GitHub no longer supports password authentication for Git operations. You need to use one of these methods:

## Quick Reference

| Method | Best For | Setup Time | Security |
|--------|----------|------------|----------|
| Personal Access Token | Quick setup | 2 minutes | Medium |
| SSH Keys | Long-term use | 5 minutes | High |
| SCP File Transfer | No Git needed | 1 minute | Medium |

## Method 1: Personal Access Token (Easiest)

### Step 1: Create Token on GitHub

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a descriptive name: `EC2 Deployment - SplitCash`
4. Set expiration (90 days, 1 year, or no expiration)
5. Select scopes:
   - ✅ **repo** (Full control of private repositories)
     - This includes: repo:status, repo_deployment, public_repo, repo:invite, security_events
6. Click **"Generate token"** at the bottom
7. **IMPORTANT**: Copy the token immediately - you won't see it again!
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Use Token on EC2

**Option A: Include Token in URL** (Less secure but convenient)
```bash
git clone https://YOUR_TOKEN@github.com/NielParekh/SplitCash.git
```

**Option B: Enter Token When Prompted** (More secure)
```bash
git clone https://github.com/NielParekh/SplitCash.git
# Username: NielParekh
# Password: YOUR_TOKEN (paste the token, NOT your GitHub password)
```

**Option C: Store in Git Credentials** (Most secure)
```bash
# Store credentials so you don't need to enter them each time
git config --global credential.helper store

# Then clone normally
git clone https://github.com/NielParekh/SplitCash.git
# Enter username and token (stored for future use)

# Or store manually
echo "https://YOUR_USERNAME:YOUR_TOKEN@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
```

### Security Notes

- **Never commit tokens to code**
- Tokens have the same permissions as your password
- Revoke tokens immediately if compromised
- Use environment variables for CI/CD

## Method 2: SSH Keys (Recommended for Production)

### Step 1: Generate SSH Key on EC2

```bash
# SSH into your EC2 instance
ssh -i /path/to/key.pem ubuntu@YOUR_PUBLIC_IP

# Generate SSH key pair
ssh-keygen -t ed25519 -C "ec2-splitcash-deployment"

# Press Enter for default location (~/.ssh/id_ed25519)
# Press Enter for no passphrase (or enter one for extra security)

# Display the public key
cat ~/.ssh/id_ed25519.pub
```

**Copy the entire output** - it looks like:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxxxxxxxxxxxxxxxxxxxxx ec2-splitcash-deployment
```

### Step 2: Add Key to GitHub

1. Go to: https://github.com/settings/ssh/new
2. **Title**: `EC2 Server - SplitCash` (or any descriptive name)
3. **Key type**: Authentication Key
4. **Key**: Paste the public key you copied
5. Click **"Add SSH key"**

### Step 3: Test SSH Connection

```bash
# Test connection
ssh -T git@github.com

# You should see:
# Hi NielParekh! You've successfully authenticated, but GitHub does not provide shell access.
```

### Step 4: Clone Using SSH

```bash
# Clone using SSH URL
git clone git@github.com:NielParekh/SplitCash.git

# Future git operations will use SSH automatically
cd SplitCash
git pull  # No authentication needed
```

### Security Notes

- Keep your private key (`~/.ssh/id_ed25519`) secure
- Never share your private key
- Use passphrase for extra security
- You can use the same key for multiple repositories

## Method 3: SCP File Transfer (No Git Required)

If you don't want to set up Git authentication on EC2, copy files directly:

### From Your Local Machine

```bash
# Make sure you're in the SplitCash directory
cd /Users/nielparekh/Desktop/SplitCash

# Copy all files to EC2 (exclude .git if you want)
scp -i /path/to/your-ec2-key.pem -r \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/

# Or copy everything including .git
scp -i /path/to/your-ec2-key.pem -r . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/
```

### Then on EC2

```bash
# SSH into EC2
ssh -i /path/to/your-ec2-key.pem ubuntu@YOUR_PUBLIC_IP

# Navigate to directory
cd /home/ubuntu/splitcash

# Make scripts executable
chmod +x ec2-setup.sh ec2-deploy.sh

# Run setup
./ec2-setup.sh
```

### Updating Files Later

```bash
# From your local machine, copy updated files
scp -i /path/to/key.pem -r . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/

# Or selectively copy only changed files
rsync -avz -e "ssh -i /path/to/key.pem" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  . ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/splitcash/
```

## Troubleshooting

### ⚠️ SECURITY WARNING: Token Exposed in Terminal

If you see your token in terminal history or logs:

1. **Immediately revoke the token:**
   - Go to: https://github.com/settings/tokens
   - Find the exposed token
   - Click "Revoke"
   
2. **Create a new token** with the same permissions

3. **Clear terminal history** (if sensitive):
   ```bash
   history -c  # Clear current session
   # Or edit ~/.bash_history to remove the line
   ```

4. **Never commit tokens to code** or share them publicly

### "Invalid username or token" Error

This means you're using a password instead of a token, or the token is incorrect.

**Solution:**
1. Make sure you're using a **Personal Access Token**, not your GitHub password
2. Regenerate the token if needed
3. Check that the token has `repo` scope enabled

### "Write access to repository not granted" (403 Error)

This means the token doesn't have the correct permissions.

**Solutions:**

1. **Check Token Scopes:**
   - Go to: https://github.com/settings/tokens
   - Click on your token
   - Ensure `repo` scope is checked (this gives full repository access)
   - If not, you need to create a new token with `repo` scope

2. **Try Different URL Format:**
   ```bash
   # Instead of this:
   git clone https://TOKEN@github.com/username/repo.git
   
   # Try this format:
   git clone https://username:TOKEN@github.com/username/repo.git
   ```
   
   Or clone first, then authenticate:
   ```bash
   git clone https://github.com/NielParekh/SplitCash.git
   # When prompted:
   # Username: NielParekh
   # Password: YOUR_TOKEN
   ```

3. **Use Fine-Grained Token (If Available):**
   - Go to: https://github.com/settings/tokens?type=beta
   - Create a fine-grained token
   - Give it "Repository access" → "Only select repositories" → Select "SplitCash"
   - Permissions → Contents: Read and write
   - Permissions → Metadata: Read-only

4. **Alternative: Use SSH Keys Instead** (Recommended)
   - SSH keys are more secure and don't have permission issues
   - See "Method 2: SSH Keys" above
   
5. **Last Resort: Use SCP File Transfer**
   - No Git authentication needed
   - See "Method 3: SCP File Transfer" above

### "Permission denied (publickey)" Error

This means SSH key authentication failed.

**Solution:**
1. Verify the public key was added to GitHub correctly
2. Check key permissions: `chmod 600 ~/.ssh/id_ed25519`
3. Test connection: `ssh -T git@github.com`
4. Make sure you're using SSH URL: `git@github.com:...`, not HTTPS

### "Host key verification failed"

**Solution:**
```bash
# Remove old GitHub host key
ssh-keygen -R github.com

# Try again
ssh -T git@github.com
# Type "yes" when prompted to add new host key
```

### Token Not Working After Some Time

Tokens can expire. Check expiration date and generate a new one if needed.

**Solution:**
1. Go to: https://github.com/settings/tokens
2. Check expiration date
3. Generate new token if expired
4. Update credentials on EC2

## Recommended Setup for EC2

For production EC2 instances, I recommend:

1. **Use SSH Keys** for authentication (most secure, no expiration)
2. **Store the private key securely** on EC2 (`~/.ssh/` with 600 permissions)
3. **Use a passphrase** on the SSH key for extra security
4. **Set up Git config** for automatic operations:

```bash
git config --global user.name "EC2 Server"
git config --global user.email "ec2@splitcash.com"
git config --global credential.helper store  # For HTTPS
```

## Quick Commands Reference

```bash
# Test GitHub connection (SSH)
ssh -T git@github.com

# Test GitHub connection (HTTPS - will prompt for token)
git ls-remote https://github.com/NielParekh/SplitCash.git

# View stored credentials
cat ~/.git-credentials  # HTTPS
cat ~/.ssh/id_ed25519.pub  # SSH public key

# Remove stored credentials (HTTPS)
rm ~/.git-credentials

# Clone with token
git clone https://YOUR_TOKEN@github.com/NielParekh/SplitCash.git

# Clone with SSH
git clone git@github.com:NielParekh/SplitCash.git
```

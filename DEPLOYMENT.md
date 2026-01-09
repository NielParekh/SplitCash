
# AWS Deployment Guide for SplitCash

This guide covers multiple deployment options:
1. **AWS Elastic Beanstalk** (Traditional - easiest for beginners)
2. **AWS ECS/Fargate** (Containerized - see DOCKER.md)
3. **AWS App Runner** (Simplest container deployment - see DOCKER.md)

## Option 1: AWS Elastic Beanstalk (Traditional Deployment)

This is the easiest way to deploy a Flask application on AWS.

## Prerequisites

1. **AWS Account**: Sign up at https://aws.amazon.com/
2. **AWS CLI**: Install from https://aws.amazon.com/cli/
3. **EB CLI**: Install Elastic Beanstalk CLI:
   ```bash
   pip install awsebcli
   ```
4. **Git**: Ensure your code is in a git repository

## Step 1: Prepare Your Application

The following files have been created/updated:
- `Procfile` - Tells Elastic Beanstalk how to run your app
- `.ebextensions/` - Configuration files for AWS
- `requirements.txt` - Updated with gunicorn (production server)
- `app.py` - Updated for production deployment

## Step 2: Initialize Elastic Beanstalk

1. Navigate to your project directory:
   ```bash
   cd /Users/nielparekh/Desktop/SplitCash
   ```

2. Initialize Elastic Beanstalk:
   ```bash
   eb init -p python-3.10 splitcash
   ```
   - Choose your AWS region (e.g., us-east-1, us-west-2)
   - Choose "y" to set up SSH access (optional but recommended)
   - If prompted, select or create an SSH key pair

## Step 3: Create an Environment

Create a new environment:
```bash
eb create splitcash-prod
```

This will:
- Create an EC2 instance
- Set up load balancer
- Configure security groups
- Deploy your application

**Note**: This process takes about 5-10 minutes. You'll see logs as it creates resources.

## Step 4: Deploy Updates

After initial deployment, to update your application:
```bash
eb deploy
```

## Step 5: Open Your Application

Once deployment is complete:
```bash
eb open
```

This will open your application URL in your browser. The URL will look like:
`http://splitcash-prod.us-east-1.elasticbeanstalk.com`

## Step 6: Check Status

Check your application status:
```bash
eb status
```

View logs:
```bash
eb logs
```

## Common Commands

- `eb list` - List all environments
- `eb health` - Check application health
- `eb ssh` - SSH into the EC2 instance
- `eb terminate` - Delete the environment (careful!)

## Environment Variables

To set environment variables (if needed later):
```bash
eb setenv VARIABLE_NAME=value
```

## Important Notes

### Data Persistence
- The `data/transactions.json` file is stored on the EC2 instance
- **Important**: Data will be lost if you terminate the environment or if the instance is replaced
- For production, consider using:
  - **AWS RDS** (Relational Database Service) for PostgreSQL/MySQL
  - **AWS DynamoDB** for NoSQL
  - **S3** for file storage

### Logs
- Application logs are stored in `logs/splitcash.log` on the instance
- Access via: `eb logs` or SSH into the instance

### Scaling
- By default, Elastic Beanstalk uses a single instance
- To enable auto-scaling, configure in the AWS Console:
  - Go to Elastic Beanstalk → Your Environment → Configuration
  - Modify "Capacity" settings

### Custom Domain
To use a custom domain:
1. Purchase a domain or use Route 53
2. In Elastic Beanstalk console, configure the domain
3. Update DNS records as instructed

## Cost Estimation

- **Free Tier**: First 12 months includes:
  - 750 hours/month of t2.micro instances
  - This is usually enough for a single small application
  
- **After Free Tier**: ~$15-25/month for:
  - t2.small EC2 instance
  - Elastic Beanstalk service (free)
  - Data transfer (minimal for small apps)

## Troubleshooting

### Deployment Fails
1. Check logs: `eb logs`
2. Verify `requirements.txt` is correct
3. Ensure `Procfile` exists and is correct
4. Check `.ebextensions/` configurations

### Application Not Responding
1. Check health: `eb health`
2. View logs: `eb logs`
3. SSH into instance: `eb ssh`
4. Check if gunicorn is running: `ps aux | grep gunicorn`

### Static Files Not Loading
- Ensure `ALLOWED_STATIC_FILES` in `app.py` includes your files
- Check file paths are correct

## Alternative: Deploy to EC2 Directly

If you prefer more control, you can deploy directly to EC2:
1. Launch an EC2 instance (Ubuntu recommended)
2. SSH into the instance
3. Install Python, nginx, gunicorn
4. Clone your repository
5. Set up as a systemd service
6. Configure nginx as reverse proxy

This gives more control but requires more setup.

## Option 2: AWS ECS/Fargate (Docker Deployment)

For containerized deployment using Docker:

1. **Follow the Docker setup** in `DOCKER.md` to build your image locally
2. **Push to Amazon ECR:**
   ```bash
   # Authenticate
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   
   # Create repository
   aws ecr create-repository --repository-name splitcash --region us-east-1
   
   # Tag and push
   docker tag splitcash:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/splitcash:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/splitcash:latest
   ```

3. **Create ECS Task Definition** and **ECS Service** via AWS Console
   - Use Fargate launch type for serverless containers
   - Configure networking, load balancer, and auto-scaling

4. **Or use AWS App Runner** (Simpler alternative):
   - Go to AWS App Runner in Console
   - Create service from ECR
   - Select your pushed image
   - Configure and deploy

See `DOCKER.md` for detailed Docker deployment instructions.

## Support

For AWS-specific issues, check:
- AWS Elastic Beanstalk Documentation
- AWS Support (if you have a support plan)

For application issues, check the logs in your environment.

# Docker Deployment Guide for SplitCash

This guide explains how to build, run, and deploy SplitCash using Docker.

## Prerequisites

- **Docker**: Install from https://www.docker.com/get-started
- **Docker Compose**: Usually included with Docker Desktop

## Quick Start

### Build and Run Locally

1. **Build the Docker image:**
   ```bash
   docker build -t splitcash:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -d -p 8000:8000 \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/logs:/app/logs \
     --name splitcash-app \
     splitcash:latest
   ```

3. **Access the application:**
   Open your browser at `http://localhost:8000`

### Using Docker Compose (Recommended)

1. **Start the application:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

4. **Rebuild after changes:**
   ```bash
   docker-compose up -d --build
   ```

## Docker Commands Reference

### Build Image
```bash
docker build -t splitcash:latest .
```

### Run Container
```bash
docker run -d -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --name splitcash-app \
  splitcash:latest
```

### View Running Containers
```bash
docker ps
```

### View Logs
```bash
docker logs -f splitcash-app
```

### Stop Container
```bash
docker stop splitcash-app
```

### Remove Container
```bash
docker rm splitcash-app
```

### Execute Commands in Container
```bash
docker exec -it splitcash-app /bin/bash
```

### Remove Image
```bash
docker rmi splitcash:latest
```

## Volume Mounts

The Docker setup mounts two volumes:
- `./data:/app/data` - Persists transaction data on your host
- `./logs:/app/logs` - Persists application logs on your host

This ensures data survives container restarts and deletions.

## Environment Variables

You can override environment variables:

```bash
docker run -d -p 8000:8000 \
  -e FLASK_ENV=production \
  -e PORT=8000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  splitcash:latest
```

## Deployment Options

### 1. AWS Elastic Container Service (ECS)

**Push to Amazon ECR:**

1. **Install AWS CLI** (if not already installed)
   ```bash
   pip install awscli
   ```

2. **Authenticate Docker to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   ```

3. **Create ECR repository:**
   ```bash
   aws ecr create-repository --repository-name splitcash --region us-east-1
   ```

4. **Tag and push image:**
   ```bash
   docker tag splitcash:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/splitcash:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/splitcash:latest
   ```

5. **Create ECS Task Definition** and **ECS Service** via AWS Console or CLI

**Or use AWS App Runner** (Simpler):
- Go to AWS App Runner in Console
- Create service from ECR
- Select your image and configure

### 2. Google Cloud Run

1. **Install Google Cloud SDK**
2. **Build and push:**
   ```bash
   gcloud builds submit --tag gcr.io/<project-id>/splitcash
   ```
3. **Deploy:**
   ```bash
   gcloud run deploy splitcash \
     --image gcr.io/<project-id>/splitcash \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### 3. Azure Container Instances

1. **Build and push to Azure Container Registry:**
   ```bash
   az acr build --registry <registry-name> --image splitcash:latest .
   ```

2. **Create container instance:**
   ```bash
   az container create \
     --resource-group <resource-group> \
     --name splitcash \
     --image <registry-name>.azurecr.io/splitcash:latest \
     --dns-name-label <unique-name> \
     --ports 8000
   ```

### 4. DigitalOcean App Platform

1. **Install doctl**
2. **Create app spec** (`app.yaml`):
   ```yaml
   name: splitcash
   services:
   - name: web
     image:
       registry_type: DOCR
       repository: splitcash
       tag: latest
     http_port: 8000
     instance_count: 1
     instance_size_slug: basic-xxs
     routes:
     - path: /
   ```

3. **Deploy:**
   ```bash
   doctl apps create --spec app.yaml
   ```

### 5. Heroku (with Docker)

1. **Install Heroku CLI**
2. **Login:**
   ```bash
   heroku login
   ```
3. **Create app:**
   ```bash
   heroku create splitcash-app
   ```
4. **Deploy:**
   ```bash
   heroku container:push web
   heroku container:release web
   ```

## Production Considerations

### 1. Database Instead of JSON File

For production, replace the JSON file storage with a real database:

**Using PostgreSQL:**
```python
# requirements.txt
Flask==3.0.0
Flask-CORS==4.0.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
SQLAlchemy==2.0.23
```

**docker-compose.yml with PostgreSQL:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: splitcash
      POSTGRES_USER: splitcash
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  splitcash:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql://splitcash:your_password@db:5432/splitcash

volumes:
  postgres_data:
```

### 2. Environment Variables for Secrets

Never hardcode secrets. Use environment variables:

```bash
docker run -d -p 8000:8000 \
  -e SECRET_KEY=your-secret-key \
  -e DATABASE_URL=postgresql://... \
  splitcash:latest
```

Or use Docker secrets or external secret management (AWS Secrets Manager, etc.)

### 3. Reverse Proxy (Nginx)

For production, use Nginx as a reverse proxy:

```dockerfile
# Add to docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - splitcash
```

### 4. Multi-Stage Build (Optimize Image Size)

For smaller images, use multi-stage builds:

```dockerfile
# Stage 1: Build
FROM python:3.10-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.10-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

## Troubleshooting

### Container won't start
```bash
docker logs splitcash-app
```

### Check if container is running
```bash
docker ps -a
```

### Access container shell
```bash
docker exec -it splitcash-app /bin/bash
```

### Check port conflicts
```bash
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows
```

### Rebuild from scratch
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Health Checks

The Dockerfile includes a health check. View health status:

```bash
docker ps  # Check STATUS column
```

Or inspect:
```bash
docker inspect --format='{{.State.Health.Status}}' splitcash-app
```

## Next Steps

1. **Test locally** using Docker Compose
2. **Choose a cloud platform** (AWS ECS, Google Cloud Run, etc.)
3. **Set up CI/CD** (GitHub Actions, GitLab CI, etc.) to automatically build and deploy
4. **Add monitoring** (CloudWatch, Datadog, etc.)
5. **Set up SSL/TLS** certificates for HTTPS

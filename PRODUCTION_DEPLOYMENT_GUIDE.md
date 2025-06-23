# Production Deployment Guide

This guide covers deploying the AirAsia Currency Converter application to production using Docker across various platforms and deployment strategies.

## 🚀 Quick Start - Local Production Test

Before deploying to production, test the production build locally:

```bash
# Build production image
docker build -t currency-converter:latest .

# Run production container
docker run -d \
  --name currency-converter-prod \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  currency-converter:latest

# Test the deployment
curl http://localhost:3000/api/rates
curl "http://localhost:3000/api/convert?from=USD&to=EUR&amount=100"

# Check logs
docker logs currency-converter-prod

# Stop and cleanup
docker stop currency-converter-prod
docker rm currency-converter-prod
```

## 🌐 Production Deployment Options

### Option 1: Docker Hub + Cloud Deployment

#### Step 1: Push to Docker Hub

```bash
# Tag your image for Docker Hub
docker tag currency-converter:latest yourusername/currency-converter:latest
docker tag currency-converter:latest yourusername/currency-converter:v1.0.0

# Login to Docker Hub
docker login

# Push images
docker push yourusername/currency-converter:latest
docker push yourusername/currency-converter:v1.0.0
```

#### Step 2: Deploy to Cloud Platforms

**AWS ECS (Elastic Container Service)**

Create `ecs-task-definition.json`:
```json
{
  "family": "currency-converter",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "currency-converter",
      "image": "yourusername/currency-converter:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "OPEN_EXCHANGE_RATES_API_KEY",
          "value": "your-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/currency-converter",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node healthcheck.js || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Deploy commands:
```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster your-cluster \
  --service-name currency-converter \
  --task-definition currency-converter:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

**Google Cloud Run**

```bash
# Deploy to Cloud Run
gcloud run deploy currency-converter \
  --image yourusername/currency-converter:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,OPEN_EXCHANGE_RATES_API_KEY=your-api-key
```

**Azure Container Instances**

```bash
# Create resource group
az group create --name currency-converter-rg --location eastus

# Deploy container
az container create \
  --resource-group currency-converter-rg \
  --name currency-converter \
  --image yourusername/currency-converter:latest \
  --dns-name-label currency-converter-unique \
  --ports 3000 \
  --environment-variables NODE_ENV=production OPEN_EXCHANGE_RATES_API_KEY=your-api-key \
  --cpu 1 \
  --memory 1
```

### Option 2: VPS/Server Deployment

#### Single Server Deployment

**Ubuntu/Debian Server Setup:**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create production directory
mkdir -p /opt/currency-converter
cd /opt/currency-converter
```

Create production `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  currency-converter:
    image: yourusername/currency-converter:latest
    container_name: currency-converter-prod
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OPEN_EXCHANGE_RATES_API_KEY=${OPEN_EXCHANGE_RATES_API_KEY}
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - currency-network

  # Optional: Add reverse proxy
  nginx:
    image: nginx:alpine
    container_name: currency-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - currency-converter
    networks:
      - currency-network

networks:
  currency-network:
    driver: bridge

volumes:
  ssl_certs:
```

Create `.env.prod`:
```bash
OPEN_EXCHANGE_RATES_API_KEY=your-actual-api-key
OER_BASE_URL=https://openexchangerates.org/api
NODE_ENV=production
```

Deploy:
```bash
# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

#### Nginx Reverse Proxy Configuration

Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream currency_converter {
        server currency-converter:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

        location / {
            proxy_pass http://currency_converter;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://currency_converter;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint (no rate limiting)
        location /api/health {
            proxy_pass http://currency_converter;
            access_log off;
        }
    }
}
```

### Option 3: Kubernetes Deployment

#### Kubernetes Manifests

Create `k8s/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: currency-converter
```

Create `k8s/configmap.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: currency-converter-config
  namespace: currency-converter
data:
  NODE_ENV: "production"
  OER_BASE_URL: "https://openexchangerates.org/api"
```

Create `k8s/secret.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: currency-converter-secret
  namespace: currency-converter
type: Opaque
stringData:
  OPEN_EXCHANGE_RATES_API_KEY: "your-api-key"
```

Create `k8s/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: currency-converter
  namespace: currency-converter
  labels:
    app: currency-converter
spec:
  replicas: 3
  selector:
    matchLabels:
      app: currency-converter
  template:
    metadata:
      labels:
        app: currency-converter
    spec:
      containers:
      - name: currency-converter
        image: yourusername/currency-converter:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: currency-converter-config
              key: NODE_ENV
        - name: OER_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: currency-converter-config
              key: OER_BASE_URL
        - name: OPEN_EXCHANGE_RATES_API_KEY
          valueFrom:
            secretKeyRef:
              name: currency-converter-secret
              key: OPEN_EXCHANGE_RATES_API_KEY
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - node
            - healthcheck.js
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/rates
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

Create `k8s/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: currency-converter-service
  namespace: currency-converter
spec:
  selector:
    app: currency-converter
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

Create `k8s/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: currency-converter-ingress
  namespace: currency-converter
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "10"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: currency-converter-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: currency-converter-service
            port:
              number: 80
```

Deploy to Kubernetes:
```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n currency-converter
kubectl get services -n currency-converter
kubectl get ingress -n currency-converter

# View logs
kubectl logs -f deployment/currency-converter -n currency-converter

# Scale deployment
kubectl scale deployment currency-converter --replicas=5 -n currency-converter
```

## 🔄 CI/CD Pipeline Setup

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: docker.io
  IMAGE_NAME: yourusername/currency-converter

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: |
        chmod +x scripts/test-runner.sh
        ./scripts/test-runner.sh ci

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.PRODUCTION_SSH_KEY }}
        script: |
          cd /opt/currency-converter
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
          docker system prune -f
```

## 📊 Monitoring & Maintenance

### Health Monitoring Script

Create `scripts/health-monitor.sh`:
```bash
#!/bin/bash

# Health monitoring script for production deployment
CONTAINER_NAME="currency-converter-prod"
HEALTH_URL="http://localhost:3000/api/rates"
LOG_FILE="/var/log/currency-converter-health.log"

check_health() {
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check container status
    if ! docker ps | grep -q $CONTAINER_NAME; then
        echo "[$timestamp] ERROR: Container $CONTAINER_NAME is not running" >> $LOG_FILE
        return 1
    fi
    
    # Check HTTP health
    if ! curl -f -s $HEALTH_URL > /dev/null; then
        echo "[$timestamp] ERROR: Health check failed for $HEALTH_URL" >> $LOG_FILE
        return 1
    fi
    
    echo "[$timestamp] SUCCESS: Health check passed" >> $LOG_FILE
    return 0
}

# Run health check
if ! check_health; then
    # Restart container if unhealthy
    echo "Restarting unhealthy container..."
    docker restart $CONTAINER_NAME
    sleep 30
    
    # Check again after restart
    if ! check_health; then
        echo "Container still unhealthy after restart. Manual intervention required."
        # Send alert (email, Slack, etc.)
    fi
fi
```

### Log Rotation Setup

Create `/etc/logrotate.d/currency-converter`:
```
/var/log/currency-converter*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### Backup Script

Create `scripts/backup.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/currency-converter"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration files
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    /opt/currency-converter/docker-compose.prod.yml \
    /opt/currency-converter/.env.prod \
    /opt/currency-converter/nginx.conf

# Export Docker image
docker save yourusername/currency-converter:latest | gzip > $BACKUP_DIR/image_$DATE.tar.gz

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
```

## 🔒 Security Checklist

- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Implement rate limiting
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Use non-root container user
- [ ] Implement proper backup strategy
- [ ] Set up monitoring and alerting

## 🚀 Quick Deployment Commands

```bash
# Local production test
make deploy-local

# Deploy to staging
make deploy-staging

# Deploy to production
make deploy-production

# Rollback deployment
make rollback

# View logs
make logs

# Health check
make health-check
```

Create `Makefile`:
```makefile
.PHONY: deploy-local deploy-staging deploy-production rollback logs health-check

deploy-local:
	docker build -t currency-converter:latest .
	docker run -d --name currency-converter-local -p 3000:3000 --env-file .env.local currency-converter:latest

deploy-staging:
	docker-compose -f docker-compose.staging.yml up -d

deploy-production:
	docker-compose -f docker-compose.prod.yml pull
	docker-compose -f docker-compose.prod.yml up -d

rollback:
	docker-compose -f docker-compose.prod.yml down
	docker-compose -f docker-compose.prod.yml up -d yourusername/currency-converter:previous

logs:
	docker-compose -f docker-compose.prod.yml logs -f

health-check:
	curl -f http://localhost:3000/api/rates || echo "Health check failed"
```

This guide provides multiple deployment strategies from simple VPS deployment to enterprise Kubernetes clusters. Choose the option that best fits your infrastructure and requirements. 
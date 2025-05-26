# Voice Notes Transcriber Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Domain name with DNS access
- SSL certificate (Let's Encrypt recommended)
- Server with at least 2GB RAM
- Postmark account configured
- OpenAI API key

## Quick Deploy with Docker

### 1. Clone and Setup
```bash
git clone https://github.com/yourusername/voice-notes-transcriber.git
cd voice-notes-transcriber
chmod +x scripts/*.sh
```

### 2. Configure Environment
```bash
cp .env.example .env.production
nano .env.production
```

Required environment variables:
```env
NODE_ENV=production
DOMAIN=yourdomain.com

# Security
JWT_SECRET=generate-a-long-random-string-here

# Database
DB_PASSWORD=strong-password-here

# Postmark
POSTMARK_SERVER_TOKEN=your-token
POSTMARK_INBOUND_ADDRESS=your-address@inbound.postmarkapp.com

# OpenAI
OPENAI_API_KEY=your-api-key

# Optional: AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=your-bucket
```

### 3. Deploy
```bash
./scripts/deploy.sh production yourdomain.com
```

## Manual Deployment Steps

### 1. Prepare Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Setup Application
```bash
# Create app directory
sudo mkdir -p /opt/voice-notes
cd /opt/voice-notes

# Clone repository
git clone https://github.com/yourusername/voice-notes-transcriber.git .

# Set permissions
sudo chown -R $USER:$USER /opt/voice-notes
```

### 3. Configure Production Environment
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    restart: always
    environment:
      NODE_ENV: production
    command: npm start

  frontend:
    restart: always

  nginx:
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/ssl:/etc/nginx/ssl:ro
      - ./docker/nginx.prod.conf:/etc/nginx/nginx.conf:ro

  postgres:
    restart: always
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    restart: always
```

### 4. SSL Setup with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/

# Set up auto-renewal
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab > /dev/null
```

### 5. Configure Nginx for Production
Create `docker/nginx.prod.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=30r/s;

    upstream backend {
        server backend:3000;
    }

    upstream frontend {
        server frontend:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Webhook route (higher rate limit)
        location /api/webhook/ {
            limit_req zone=webhook burst=50 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### 6. Start Services
```bash
# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Cloud Platform Deployments

### AWS EC2

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - 30GB EBS volume
   - Security group: 22, 80, 443

2. **Deploy**
```bash
# SSH to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Follow manual deployment steps above
```

### Google Cloud Platform

1. **Create VM Instance**
```bash
gcloud compute instances create voice-notes \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB
```

2. **Deploy using Cloud Build**
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/voice-notes', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/voice-notes']
```

### Heroku (Container Deploy)

1. **Setup Heroku**
```bash
heroku create your-app-name
heroku stack:set container
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
```

2. **Configure**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# Set all required env vars
```

3. **Deploy**
```bash
git push heroku main
```

### DigitalOcean App Platform

1. **Create App**
   - Source: GitHub repo
   - Type: Docker Compose
   - Region: Choose nearest
   - Size: Basic ($10/mo)

2. **Configure Environment**
   - Add all environment variables
   - Set up managed database
   - Configure domain

## Monitoring & Maintenance

### Health Checks
```bash
# API health
curl https://yourdomain.com/api/health

# Service status
docker-compose ps

# Resource usage
docker stats
```

### Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Save logs
docker-compose logs > logs_$(date +%Y%m%d).txt
```

### Backups
```bash
# Database backup
docker-compose exec postgres pg_dump -U voicenotes voicenotes > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T postgres psql -U voicenotes voicenotes < backup.sql

# Backup uploads (if using local storage)
tar -czf uploads_$(date +%Y%m%d).tar.gz backend/uploads/
```

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migrate
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
```bash
# Find process using port
sudo lsof -i :80
# Kill process
sudo kill -9 <PID>
```

2. **Database connection issues**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

3. **SSL certificate issues**
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate
openssl s_client -connect yourdomain.com:443
```

4. **Memory issues**
```bash
# Check memory usage
free -h

# Add swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Performance Tuning

1. **PostgreSQL**
```sql
-- Increase connections
ALTER SYSTEM SET max_connections = 200;

-- Optimize for SSD
ALTER SYSTEM SET random_page_cost = 1.1;
```

2. **Node.js**
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=2048"
```

3. **Nginx**
```nginx
# Increase upload size
client_max_body_size 50M;

# Enable gzip
gzip on;
gzip_types text/plain application/json;
```

## Security Checklist

- [ ] Strong passwords for all services
- [ ] SSL certificate installed and auto-renewing
- [ ] Environment variables properly secured
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Regular security updates
- [ ] Monitoring alerts set up

## Cost Optimization

### Estimated Monthly Costs
- **Small (< 100 users)**: $10-20/month
  - Basic VPS or App Platform
  - Shared database
  
- **Medium (100-1000 users)**: $50-100/month
  - Dedicated VPS
  - Managed database
  - S3 storage
  
- **Large (1000+ users)**: $200+/month
  - Multiple servers
  - Load balancer
  - CDN for assets
# Deployment Guide

Guide for deploying Reservely to various platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Vercel Deployment](#vercel-deployment)
- [Docker Deployment](#docker-deployment)
- [AWS Deployment](#aws-deployment)
- [Database Setup](#database-setup)

## Prerequisites

Before deploying, ensure you have:

- Production PostgreSQL database
- All required environment variables
- Built and tested the application locally

## Environment Variables

Required environment variables for production:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Application
NODE_ENV="production"
PORT=3000

# Next.js
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Vercel Deployment

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

### Manual Deployment

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **Set Environment Variables**

Go to your project settings in Vercel dashboard and add:
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

5. **Run Database Migrations**

After deployment, run migrations:
```bash
npx prisma migrate deploy
```

### Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t reservely:latest .
```

### Run with Docker Compose

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Reservely application

### Environment Variables

Create `.env.production`:

```env
DATABASE_URL="postgresql://reservely:reservely@postgres:5432/reservely?schema=public"
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Run Migrations

```bash
docker-compose exec app npx prisma migrate deploy
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/reservely
      - NODE_ENV=production
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: reservely
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## AWS Deployment

### Using AWS Elastic Beanstalk

1. **Install EB CLI**
```bash
pip install awsebcli
```

2. **Initialize EB**
```bash
eb init -p node.js reservely
```

3. **Create Environment**
```bash
eb create reservely-prod
```

4. **Set Environment Variables**
```bash
eb setenv DATABASE_URL="your-database-url" \
  NODE_ENV="production" \
  NEXT_PUBLIC_APP_URL="https://your-app.elasticbeanstalk.com"
```

5. **Deploy**
```bash
eb deploy
```

### Using AWS ECS (Fargate)

1. **Push Docker Image to ECR**
```bash
aws ecr create-repository --repository-name reservely
docker tag reservely:latest <account-id>.dkr.ecr.<region>.amazonaws.com/reservely:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/reservely:latest
```

2. **Create ECS Task Definition**

Create `task-definition.json`:

```json
{
  "family": "reservely",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "reservely",
      "image": "<account-id>.dkr.ecr.<region>.amazonaws.com/reservely:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "your-database-url"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ]
    }
  ]
}
```

3. **Create ECS Service**
```bash
aws ecs create-service \
  --cluster reservely-cluster \
  --service-name reservely-service \
  --task-definition reservely \
  --desired-count 2 \
  --launch-type FARGATE
```

## Database Setup

### Managed PostgreSQL Options

#### Vercel Postgres
```bash
vercel postgres create
```

#### AWS RDS
1. Create PostgreSQL RDS instance
2. Configure security groups
3. Get connection string
4. Set DATABASE_URL environment variable

#### Digital Ocean
1. Create managed PostgreSQL database
2. Get connection string
3. Configure trusted sources
4. Set DATABASE_URL environment variable

### Database Migrations

After deployment, run migrations:

```bash
# Using npm script
npm run prisma:migrate:deploy

# Or directly
npx prisma migrate deploy
```

### Database Backup

Set up automatic backups:

```bash
# Create backup script
#!/bin/bash
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
pg_dump $DATABASE_URL > $BACKUP_FILE
# Upload to S3 or other storage
```

## SSL/TLS Configuration

### Certbot (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Logging

### Application Monitoring

Consider integrating:
- **Sentry** for error tracking
- **DataDog** for APM
- **New Relic** for performance monitoring

### Logging

Configure structured logging:

```typescript
// src/infrastructure/logging/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  error: (message: string, error?: Error, meta?: object) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message, 
      error: error?.message,
      stack: error?.stack,
      ...meta 
    }));
  }
};
```

## Health Checks

Configure health check endpoint for load balancers:

```
GET /api/health
```

Should return 200 status when healthy.

## Scaling

### Horizontal Scaling

- Deploy multiple instances
- Use load balancer
- Configure database connection pooling

### Database Connection Pooling

Update Prisma configuration:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=20"
```

## Rollback Procedure

If deployment fails:

### Vercel
```bash
vercel rollback
```

### Docker
```bash
docker-compose down
docker-compose up -d --force-recreate
```

### Database Migration Rollback
```bash
# Revert last migration
npx prisma migrate resolve --rolled-back <migration-name>
```

## Post-Deployment Checklist

- [ ] Database migrations completed successfully
- [ ] Environment variables configured correctly
- [ ] Health check endpoint returns healthy status
- [ ] API endpoints accessible and responding
- [ ] SSL/TLS certificates valid
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Load testing completed

## Troubleshooting

### Common Issues

**Database Connection Fails**
- Check DATABASE_URL format
- Verify database is accessible from deployment environment
- Check firewall rules

**Build Fails**
- Ensure all dependencies in package.json
- Check Node.js version compatibility
- Verify Prisma schema is valid

**Migration Fails**
- Check database permissions
- Verify migration files are present
- Review migration logs

## Support

For deployment issues:
1. Check logs: `vercel logs` or `docker logs`
2. Review error messages
3. Check environment variables
4. Verify database connectivity
5. Create GitHub issue with details

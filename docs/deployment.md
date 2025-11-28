# Deployment Guide

## Overview

This document describes the deployment procedures for the GTD Todo App, including staging and production deployments, health checks, and rollback procedures.

## Environments

### Staging
- **URL**: https://staging.gtd-app.example.com
- **Purpose**: Pre-production testing and validation
- **Deployment**: Automatic on push to `main` branch
- **Database**: Separate staging database

### Production
- **URL**: https://gtd-app.example.com
- **Purpose**: Live production environment
- **Deployment**: Manual approval required (via GitHub tags or workflow dispatch)
- **Database**: Production database with automated backups

## Deployment Process

### Automatic Deployment (Staging)

1. Push to `main` branch
2. CI pipeline runs (linting, tests, security scans)
3. If CI passes, Docker images are built and pushed to registry
4. Images are deployed to staging environment
5. Database migrations run automatically
6. Health checks verify deployment
7. Team is notified of deployment status

### Manual Deployment (Production)

#### Via Git Tag
```bash
# Create a release tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

#### Via GitHub UI
1. Navigate to Actions → CD Pipeline
2. Click "Run workflow"
3. Select "production" environment
4. Approve deployment in GitHub Environments

### Deployment Steps

1. **Pre-deployment**
   - Database backup created automatically
   - Health check of current production
   - Review of pending migrations

2. **Deployment**
   - New Docker images deployed
   - Database migrations executed
   - Application containers restarted

3. **Post-deployment**
   - Health check verification
   - Smoke tests execution
   - Performance monitoring check
   - Team notification

## Health Checks

### API Health Endpoint
```bash
curl -f https://gtd-app.example.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-28T12:00:00+00:00",
  "environment": "production",
  "database": "connected",
  "version": "1.0.0"
}
```

### Web Application Check
```bash
curl -I https://gtd-app.example.com
```

Expected: HTTP 200 OK

## Rollback Procedures

### Automatic Rollback
If health checks fail after deployment, the CD pipeline automatically triggers a rollback.

### Manual Rollback

#### Option 1: Kubernetes Rollback (if using Kubernetes)
```bash
# Rollback API deployment
kubectl rollout undo deployment/api -n production

# Rollback Web deployment
kubectl rollout undo deployment/web -n production

# Check rollout status
kubectl rollout status deployment/api -n production
kubectl rollout status deployment/web -n production
```

#### Option 2: Docker Compose Rollback (if using Docker Compose)
```bash
# Pull previous image version
docker pull ghcr.io/username/gtd-app/api:previous-tag
docker pull ghcr.io/username/gtd-app/web:previous-tag

# Restart with previous version
docker-compose down
docker-compose up -d
```

#### Option 3: Redeploy Previous Tag
```bash
# Redeploy a specific version
gh workflow run cd.yml -f environment=production -f version=v1.0.0
```

### Database Rollback

If a migration needs to be rolled back:

```bash
# SSH into API container
kubectl exec -it deployment/api -- bash

# Rollback one migration
php bin/console doctrine:migrations:migrate prev --no-interaction

# Or rollback to specific version
php bin/console doctrine:migrations:migrate Version001 --no-interaction
```

**⚠️ WARNING**: Database rollbacks should be done with extreme caution. Always:
1. Create a backup first
2. Test rollback in staging
3. Coordinate with the team
4. Document the rollback reason

## Monitoring and Alerts

### Key Metrics to Monitor
- API response time (p95 < 200ms, p99 < 500ms)
- Error rate (< 1%)
- Database connection pool
- Memory usage
- CPU usage
- Disk space

### Health Check Failures
If health checks fail:
1. Check application logs
2. Check database connectivity
3. Verify environment variables
4. Check resource limits (CPU, memory)
5. Review recent migrations

## Troubleshooting

### Deployment Stuck
```bash
# Check deployment status
kubectl get deployments -n production

# Check pod status
kubectl get pods -n production

# Check pod logs
kubectl logs -f deployment/api -n production
```

### Migration Failures
```bash
# Check migration status
php bin/console doctrine:migrations:status

# Check migration logs
kubectl logs deployment/api -n production | grep migration
```

### Container Won't Start
```bash
# Check container logs
docker-compose logs api

# Check for port conflicts
netstat -tulpn | grep :8000

# Verify environment variables
docker-compose config
```

## Emergency Procedures

### Critical Bug in Production
1. Immediately rollback to previous version
2. Create hotfix branch from last stable tag
3. Fix bug and test thoroughly
4. Deploy hotfix via production workflow
5. Post-mortem analysis after resolution

### Database Corruption
1. Stop accepting new requests (maintenance mode)
2. Restore from latest backup
3. Replay transactions from backup point
4. Verify data integrity
5. Resume service

### Complete Outage
1. Check cloud provider status
2. Verify DNS configuration
3. Check SSL certificates
4. Review firewall rules
5. Check database connectivity
6. Escalate to DevOps team if needed

## Contact Information

### On-Call Rotation
- See PagerDuty schedule for current on-call engineer

### Escalation Path
1. Development Team Lead
2. DevOps Team
3. CTO

## Deployment Checklist

Before each production deployment:

- [ ] All CI checks passing
- [ ] Code review approved
- [ ] QA testing completed in staging
- [ ] Database backup verified
- [ ] Migration plan reviewed
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Monitoring dashboards ready
- [ ] On-call engineer available

## Post-Deployment

After each production deployment:

- [ ] Health checks passing
- [ ] Smoke tests completed
- [ ] Error rates within normal range
- [ ] Performance metrics acceptable
- [ ] Database migrations successful
- [ ] User-facing features verified
- [ ] Team notified of completion
- [ ] Deployment documented in changelog

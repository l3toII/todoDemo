# Deployment & Rollback Procedures

## Overview

This document describes deployment and rollback procedures for the GTD Todo App.

## Deployment Flow

### Automatic Deployments

- **Staging**: Automatic deployment on merge to `develop` branch
- **Production**: Manual trigger via GitHub Actions workflow dispatch on `main` branch

### Deployment Steps

1. **Build Phase**
   - Build Docker images for API and Web
   - Tag images with commit SHA and environment
   - Push to Docker registry

2. **Deploy Phase**
   - Pull latest images on target servers
   - Run database migrations
   - Update running containers
   - Perform health checks

3. **Verification Phase**
   - Health check endpoints return 200 OK
   - E2E tests pass (staging only)
   - Smoke tests verify critical paths

## Rollback Procedures

### Automatic Rollback

The CD pipeline automatically triggers rollback if:
- Health checks fail after deployment
- E2E tests fail on staging
- Critical errors detected in logs

### Manual Rollback

#### Option 1: Redeploy Previous Version

```bash
# Get the previous successful deployment SHA
git log --oneline -10

# Trigger deployment with specific commit
gh workflow run cd.yml -f environment=production -f commit_sha=<PREVIOUS_SHA>
```

#### Option 2: Docker Image Rollback

```bash
# List recent images
docker images | grep gtd-api

# Redeploy previous image tag
docker pull username/gtd-api:<previous-tag>
docker-compose up -d api
```

#### Option 3: Database Migration Rollback

```bash
# Enter API container
docker-compose exec api bash

# List migrations
php bin/console doctrine:migrations:list

# Rollback to specific version
php bin/console doctrine:migrations:migrate <VERSION> --no-interaction
```

### Rollback Decision Tree

```
Deployment Failed?
├─ Health check failed?
│  └─ Yes → Automatic rollback to previous image
├─ E2E tests failed?
│  └─ Yes → Block promotion, rollback staging
├─ Database migration failed?
│  └─ Yes → Manual migration rollback required
└─ Application errors?
   └─ Yes → Manual investigation + rollback decision
```

## Health Check Endpoints

### API Health Check
```
GET /api/health
Expected: 200 OK
Response: {"status": "healthy", "timestamp": "..."}
```

### Database Health Check
```
GET /api/health/db
Expected: 200 OK
Response: {"status": "healthy", "database": "connected"}
```

### Web Health Check
```
GET /
Expected: 200 OK
Response: HTML page loads successfully
```

## Monitoring & Alerts

### Key Metrics to Monitor

- API response times (p95 < 200ms)
- Error rates (< 1% of requests)
- Database connection pool usage
- Memory and CPU utilization

### Alert Thresholds

- **Critical**: Error rate > 5%, API p99 > 1000ms
- **Warning**: Error rate > 1%, API p95 > 300ms

## Emergency Contacts

- **DevOps Lead**: [Contact Info]
- **Backend Lead**: [Contact Info]
- **Frontend Lead**: [Contact Info]

## Post-Incident Checklist

After a rollback:

1. [ ] Document what went wrong
2. [ ] Identify root cause
3. [ ] Create issue for fix
4. [ ] Update tests to catch similar issues
5. [ ] Schedule retrospective if major incident

## Rollback Testing

Test rollback procedures quarterly:

```bash
# Deploy test commit
gh workflow run cd.yml -f environment=staging

# Trigger rollback
# Verify rollback completes successfully
# Document any issues encountered
```

## References

- CI/CD Pipeline: `.github/workflows/cd.yml`
- Docker Compose: `infra/docker-compose.yml`
- Infrastructure: `infra/docker/`

# Render Deployment Setup

This guide explains how to deploy the GTD Todo App to Render using GitHub App integration and the Blueprint (`render.yaml`).

## Prerequisites

- GitHub account with access to `l3toII/todoDemo` repository
- Render account (free tier available)

## Overview

The application uses Render's **Blueprint** (Infrastructure as Code) to define all services in a single `render.yaml` file. This includes:
- 2 API services (production + staging)
- 2 Web services (production + staging)
- 2 Databases (production + staging)

## Step 1: Connect GitHub to Render

### 1.1 Create Render Account

1. Go to https://render.com
2. Click **"Get Started"** or **"Sign Up"**
3. **Choose "Sign up with GitHub"** (recommended for seamless integration)
4. Authorize Render to access your GitHub account

### 1.2 Install Render GitHub App

After signing up, Render will request access to your repositories:

1. Choose **"Only select repositories"**
2. Select `l3toII/todoDemo`
3. Click **"Install & Authorize"**

**Verify Installation**:
- Visit: https://github.com/apps/render/installations/new
- In "Repository access", confirm `l3toII/todoDemo` is listed
- If missing, click **"Configure"** and add it

## Step 2: Create Blueprint from render.yaml

### 2.1 Create New Blueprint

1. **In Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**

### 2.2 Configure Blueprint

Fill in the Blueprint creation form:

| Field | Value |
|-------|-------|
| **Repository** | `l3toII/todoDemo` |
| **Branch** | `001-gtd-todo-app` (for staging) or `main` (for production) |
| **Blueprint Name** | `GTD Todo App - Staging` or `GTD Todo App - Production` |
| **render.yaml path** | `./render.yaml` (default) |

**Important**: Create **two separate Blueprints**:
- One for staging (branch: `001-gtd-todo-app`)
- One for production (branch: `main`)

### 2.3 Review Services

Render will detect your `render.yaml` and show 6 services to be created:

**Production (main branch)**:
- `gtd-api-prod` - API Backend (Web Service)
- `gtd-web-prod` - React Frontend (Static Site)
- `gtd-db-prod` - MariaDB Database

**Staging (001-gtd-todo-app branch)**:
- `gtd-api-staging` - API Backend (Web Service)
- `gtd-web-staging` - React Frontend (Static Site)
- `gtd-db-staging` - MariaDB Database

### 2.4 Apply Blueprint

1. Review all services and their configurations
2. Click **"Apply"**
3. Render will start creating and deploying all services

**Initial deployment takes 5-10 minutes** as Render builds Docker images and provisions databases.

## Step 3: Verify Environment Variables

After services are created, verify auto-generated environment variables:

### API Services (gtd-api-prod, gtd-api-staging)

Navigate to each API service → **"Environment"** tab:

| Variable | Status | Notes |
|----------|--------|-------|
| `APP_ENV` | ✓ Set | `prod` or `staging` |
| `APP_SECRET` | ✓ Auto-generated | 32-byte random string |
| `DATABASE_URL` | ✓ Auto-linked | From corresponding database |
| `JWT_PASSPHRASE` | ✓ Auto-generated | For JWT token signing |
| `CORS_ALLOW_ORIGIN` | ✓ Set | Points to corresponding Web URL |

All sensitive values are automatically generated and encrypted by Render.

### Web Services (gtd-web-prod, gtd-web-staging)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Points to corresponding API URL |
| `VITE_APPLE_CLIENT_ID` | `com.gtd.app` (prod) or `com.gtd.app.staging` |

## Step 4: Get Service IDs for GitHub Actions

To enable GitHub Actions to trigger deployments, you need each service's ID.

### 4.1 Find Service IDs

1. Go to https://dashboard.render.com
2. Click on each service
3. In the browser URL, copy the Service ID:
   ```
   https://dashboard.render.com/web/srv-xxxxxxxxxxxxx
                                    ^^^^^^^^^^^^^^^^
                                    This is the Service ID
   ```

### 4.2 Record Service IDs

Create a note with all IDs:

```
Production:
- gtd-api-prod:    srv-xxxxxxxxx → RENDER_SERVICE_ID_API_PROD
- gtd-web-prod:    srv-xxxxxxxxx → RENDER_SERVICE_ID_WEB_PROD

Staging:
- gtd-api-staging: srv-xxxxxxxxx → RENDER_SERVICE_ID_API_STAGING
- gtd-web-staging: srv-xxxxxxxxx → RENDER_SERVICE_ID_WEB_STAGING
```

### 4.3 Get Render API Key

1. Go to **Account Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name: `GitHub Actions Deploy`
4. Copy the generated key (starts with `rnd_...`)

## Step 5: Configure GitHub Secrets

Add secrets to your GitHub repository for CI/CD integration:

1. Go to: https://github.com/l3toII/todoDemo/settings/secrets/actions
2. Click **"New repository secret"**
3. Add each secret:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `RENDER_API_KEY` | `rnd_...` | Your Render API key |
| `RENDER_SERVICE_ID_API_PROD` | `srv-...` | Production API service ID |
| `RENDER_SERVICE_ID_API_STAGING` | `srv-...` | Staging API service ID |
| `RENDER_SERVICE_ID_WEB_PROD` | `srv-...` | Production Web service ID |
| `RENDER_SERVICE_ID_WEB_STAGING` | `srv-...` | Staging Web service ID |

## Step 6: Verify Deployment

### 6.1 Check Service Status

In Render Dashboard, verify all services show **"Live"** status (green):
- ✓ gtd-api-prod
- ✓ gtd-api-staging
- ✓ gtd-web-prod
- ✓ gtd-web-staging
- ✓ gtd-db-prod
- ✓ gtd-db-staging

### 6.2 Test Health Endpoints

**Production**:
```bash
curl https://gtd-api-prod.onrender.com/api/health
# Expected: {"status":"healthy","timestamp":"...","environment":"prod"}
```

**Staging**:
```bash
curl https://gtd-api-staging.onrender.com/api/health
# Expected: {"status":"healthy","timestamp":"...","environment":"staging"}
```

### 6.3 Test Web Applications

Open in browser:
- **Production**: https://gtd-web-prod.onrender.com
- **Staging**: https://gtd-web-staging.onrender.com

You should see the GTD Todo App login page.

## Step 7: Automatic Deployments

### How Auto-Deploy Works

Render automatically redeploys when you push to the linked branch:

- **Staging** (`001-gtd-todo-app` branch):
  - Push commits → Render detects change → Auto-deploys staging

- **Production** (`main` branch):
  - Merge PR to main → Render detects change → Auto-deploys production

### Manual Deploy

If auto-deploy is disabled or you need to force a deploy:

1. Go to service in Render Dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Or use GitHub Actions workflow dispatch

### Monitoring Deployments

- **Render Dashboard**: Shows deployment status and logs in real-time
- **GitHub Actions**: CD pipeline triggers Render deployments and verifies health checks
- **Logs**: View in Render Dashboard → Service → "Logs" tab

## Troubleshooting

### Services won't start

**Check logs**:
1. Go to service in Render Dashboard
2. Click **"Logs"** tab
3. Look for error messages

**Common issues**:
- Missing environment variables
- Database connection errors (wait for DB to be fully provisioned)
- Build errors (check Dockerfile paths)

### Database connection fails

**Verify DATABASE_URL**:
1. Go to API service → "Environment"
2. Confirm `DATABASE_URL` is linked to correct database
3. Check database is "Live" (not "Suspended")

**Free tier limitation**: Databases may spin down after 15 minutes of inactivity. First request will take ~30s to wake up.

### Health checks failing

**Wait for initial deployment**: First deploy can take 5-10 minutes.

**Check API logs**:
```bash
# In Render Dashboard → gtd-api-staging → Logs
# Look for:
[INFO] Server started on port 10000
```

**Verify health endpoint locally**:
```bash
docker compose -f infra/docker-compose.yml up -d
curl http://localhost:8000/api/health
```

### Auto-deploy not working

**Verify GitHub App permissions**:
1. Go to: https://github.com/apps/render/installations/new
2. Ensure `l3toII/todoDemo` has access
3. Check webhook deliveries in GitHub repo settings

**Check render.yaml syntax**:
```bash
# In Blueprint settings, verify:
- Branch is correct (001-gtd-todo-app or main)
- render.yaml path is ./render.yaml
- autoDeploy: true (default)
```

## Cost Considerations

### Free Tier Limits

Render offers a generous free tier:
- **Web Services**: 750 hours/month
- **Databases**: Free PostgreSQL (limited storage)
- **Static Sites**: Free unlimited

**Important**: Free services spin down after 15 minutes of inactivity. First request takes ~30s to wake up.

### Production Recommendations

For production with guaranteed uptime:
- Upgrade to **Starter** plan ($7/month per service)
- Keeps services always running (no spin-down)
- Better performance and resources

## References

- [Render Infrastructure as Code (Blueprint)](https://render.com/docs/infrastructure-as-code)
- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
- [Connect GitHub to Render](https://render.com/docs/github)
- [Deploying on Render](https://render.com/docs/deploys)

# SonarCloud Setup

This guide explains how to integrate SonarCloud code quality and security analysis with the GTD Todo App CI pipeline.

## Prerequisites

- GitHub account with access to `l3toII/todoDemo` repository
- SonarCloud account (free for open source projects)

## Overview

SonarCloud provides:
- **Code Quality Analysis**: Detect bugs, code smells, and maintainability issues
- **Security Analysis**: Identify vulnerabilities and security hotspots
- **Code Coverage**: Track test coverage across the codebase
- **Technical Debt**: Measure and track code complexity

The CI pipeline (`.github/workflows/ci.yml`) includes a dedicated `sonarcloud` job that runs after all tests complete.

## Step 1: Create SonarCloud Account

### 1.1 Sign Up with GitHub

1. Go to https://sonarcloud.io
2. Click **"Log in"** or **"Try Now"**
3. **Choose "With GitHub"** (recommended)
4. Authorize SonarCloud to access your GitHub account

### 1.2 Import Organization

After signing in:

1. Click **"+"** → **"Analyze new project"**
2. Select your GitHub organization: `l3toII`
3. Click **"Install"** to add SonarCloud GitHub App
4. Choose **"Only select repositories"**
5. Select `l3toII/todoDemo`
6. Click **"Install & Authorize"**

## Step 2: Create SonarCloud Project

### 2.1 Set Up New Project

1. In SonarCloud, you'll see a list of repositories
2. Find and click **"Set Up"** next to `l3toII/todoDemo`
3. Choose analysis method: **"With GitHub Actions"** (recommended)
4. SonarCloud will generate configuration for you

### 2.2 Project Configuration

Configure project settings:

| Field | Value |
|-------|-------|
| **Organization** | `l3toii` (your GitHub username/org) |
| **Project Key** | `l3toII_todoDemo` |
| **Display Name** | `GTD Todo App` |

Click **"Create Project"**.

### 2.3 Configure Analysis

SonarCloud will show you the configuration. Note these values:

```
Organization: l3toii
Project Key: l3toII_todoDemo
```

You'll need these for the GitHub Actions workflow (already configured in `.github/workflows/ci.yml`).

## Step 3: Generate SonarCloud Token

### 3.1 Create Personal Access Token

1. In SonarCloud, click your avatar (top right)
2. Go to **"My Account"** → **"Security"**
3. Or directly: https://sonarcloud.io/account/security

### 3.2 Generate Token

1. Scroll to **"Generate Tokens"** section
2. **Token Name**: `GitHub Actions CI`
3. **Type**: Choose:
   - **User Token** (for personal projects)
   - **Organization Token** (if you have Team plan)
4. Click **"Generate"**
5. **Copy the token immediately** (starts with `squ_...`)
   - ⚠️ You cannot retrieve it again after closing this page

### 3.3 Token Security

**Important**:
- Never commit tokens to Git
- Never share tokens publicly
- Tokens have full access to your SonarCloud account
- Rotate tokens regularly (every 6 months)

## Step 4: Configure GitHub Secret

Add the SonarCloud token to your GitHub repository:

### 4.1 Add Secret

1. Go to: https://github.com/l3toII/todoDemo/settings/secrets/actions
2. Click **"New repository secret"**
3. Configure:
   - **Name**: `SONAR_TOKEN`
   - **Value**: Paste your SonarCloud token (starts with `squ_...`)
4. Click **"Add secret"**

### 4.2 Verify Secret

The secret should now appear in the list:
```
SONAR_TOKEN
Updated X minutes ago
```

## Step 5: Verify CI Configuration

The SonarCloud job is already configured in `.github/workflows/ci.yml`. Let's verify it:

### 5.1 Check SonarCloud Job

```yaml
sonarcloud:
  name: SonarCloud Analysis
  runs-on: ubuntu-latest
  needs: [api-tests, web-tests]
  if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main' || github.ref == 'refs/heads/001-gtd-todo-app'
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Shallow clones disabled for better analysis

    # ... dependency installation ...

    - name: SonarCloud Scan
      uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      with:
        args: >
          -Dsonar.projectKey=l3toII_todoDemo
          -Dsonar.organization=l3toii
          -Dsonar.sources=api/src,web/src
          -Dsonar.tests=api/tests,web/src
          -Dsonar.test.inclusions=**/*Test.php,**/*.test.ts,**/*.test.tsx,**/*.spec.ts
          -Dsonar.php.coverage.reportPaths=api/coverage.xml
          -Dsonar.javascript.lcov.reportPaths=web/coverage/lcov.info
          -Dsonar.exclusions=**/vendor/**,**/node_modules/**,**/dist/**,**/build/**
```

### 5.2 Verify Configuration Values

Ensure these match your SonarCloud project:
- ✓ `sonar.projectKey`: `l3toII_todoDemo`
- ✓ `sonar.organization`: `l3toii`

**If values differ**, update them in `.github/workflows/ci.yml`.

## Step 6: Test SonarCloud Integration

### 6.1 Trigger a CI Run

Push a commit or create a Pull Request:

```bash
# Make a small change
echo "# SonarCloud configured" >> docs/sonarcloud-setup.md

# Commit and push
git add docs/sonarcloud-setup.md
git commit -m "docs: add SonarCloud setup guide"
git push
```

### 6.2 Monitor CI Pipeline

1. Go to: https://github.com/l3toII/todoDemo/actions
2. Find your workflow run
3. Expand **"SonarCloud Analysis"** job
4. Wait for analysis to complete (~2-5 minutes)

### 6.3 View Results

After the job completes:

1. Go to: https://sonarcloud.io/project/overview?id=l3toII_todoDemo
2. Or click the **"SonarCloud"** link in the GitHub check

You should see:
- **Quality Gate**: Pass/Fail status
- **Bugs**: Number of detected bugs
- **Vulnerabilities**: Security issues found
- **Code Smells**: Maintainability issues
- **Coverage**: Test coverage percentage
- **Duplications**: Duplicate code blocks

## Step 7: Configure Quality Gates

### 7.1 Default Quality Gate

SonarCloud applies a default "Sonar way" quality gate:
- No new bugs
- No new vulnerabilities
- Security hotspots reviewed
- Coverage on new code ≥ 80%
- Duplicated lines on new code ≤ 3%
- Maintainability rating ≥ A

### 7.2 Customize Quality Gate (Optional)

To create a custom quality gate:

1. Go to: https://sonarcloud.io/organizations/l3toii/quality_gates
2. Click **"Create"**
3. Name: `GTD Todo App Standards`
4. Add conditions:
   - Coverage on New Code ≥ 80%
   - Duplicated Lines (%) ≤ 3%
   - Maintainability Rating ≥ A
   - Reliability Rating ≥ A
   - Security Rating ≥ A
5. **Save**

### 7.3 Apply to Project

1. Go to project settings: https://sonarcloud.io/project/quality_gate?id=l3toII_todoDemo
2. Select your custom quality gate
3. Click **"Save"**

## Step 8: Branch Protection Integration

### 8.1 Require SonarCloud Checks

Prevent merging PRs that fail quality gate:

1. Go to: https://github.com/l3toII/todoDemo/settings/branches
2. Edit branch protection for `main` and `001-gtd-todo-app`
3. Under **"Require status checks to pass before merging"**:
   - ✓ Enable "Require status checks to pass"
   - Search and add: **"SonarCloud Code Analysis"**
4. Click **"Save changes"**

Now PRs cannot be merged if SonarCloud analysis fails.

## Step 9: Badge Integration (Optional)

### 9.1 Get Quality Gate Badge

1. Go to: https://sonarcloud.io/project/overview?id=l3toII_todoDemo
2. Click **"Get project badges"** (bottom right)
3. Copy the **Quality Gate** badge markdown

### 9.2 Add to README

Add badge to `README.md`:

```markdown
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=l3toII_todoDemo&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=l3toII_todoDemo)
```

### 9.3 Additional Badges

You can also add badges for:
- **Coverage**: `metric=coverage`
- **Bugs**: `metric=bugs`
- **Vulnerabilities**: `metric=vulnerabilities`
- **Code Smells**: `metric=code_smells`

## Troubleshooting

### SonarCloud scan fails with "Shallow clone detected"

**Cause**: Insufficient Git history for accurate analysis.

**Solution**: Ensure `fetch-depth: 0` in checkout step (already configured):
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

### "SONAR_TOKEN not found" error

**Check**:
1. Secret is named exactly `SONAR_TOKEN` (case-sensitive)
2. Secret is set at repository level (not organization)
3. Token hasn't expired

**Regenerate** if needed:
1. Go to: https://sonarcloud.io/account/security
2. Revoke old token
3. Generate new token
4. Update GitHub secret

### No coverage data appearing

**Cause**: Coverage reports not generated or wrong path.

**Verify**:
1. Check `api-tests` job generates `api/coverage.xml`
2. Check `web-tests` job generates `web/coverage/lcov.info`
3. Verify paths in SonarCloud configuration match

**Fix** by ensuring test commands include coverage:
```bash
# API
vendor/bin/phpunit --coverage-clover=coverage.xml

# Web
npm run test -- --coverage
```

### Quality gate fails unexpectedly

**Check the dashboard**:
1. Go to: https://sonarcloud.io/project/overview?id=l3toII_todoDemo
2. Click **"Why did the Quality Gate fail?"**
3. Review specific conditions that failed

**Common failures**:
- Coverage dropped below threshold
- New bugs or vulnerabilities introduced
- Code smells increased
- Duplicated code added

**Fix** by addressing the specific issues before merging.

### SonarCloud not analyzing PRs from forks

**Cause**: Security restriction - forks don't have access to secrets.

**Solution**: This is expected behavior for security. Fork contributors must:
1. Wait for maintainer to push their changes to a branch
2. Or maintainer manually triggers SonarCloud analysis

## Monitoring and Maintenance

### Regular Checks

**Weekly**:
- Review Quality Gate trends
- Check for new security hotspots
- Monitor code coverage trends

**Monthly**:
- Review technical debt
- Plan refactoring based on code smells
- Rotate SonarCloud tokens

### Dashboard Links

- **Project Overview**: https://sonarcloud.io/project/overview?id=l3toII_todoDemo
- **Issues**: https://sonarcloud.io/project/issues?id=l3toII_todoDemo
- **Security**: https://sonarcloud.io/project/security_hotspots?id=l3toII_todoDemo
- **Measures**: https://sonarcloud.io/component_measures?id=l3toII_todoDemo

## References

- [SonarCloud GitHub Actions Integration](https://docs.sonarcloud.io/advanced-setup/ci-based-analysis/github-actions-for-sonarcloud/)
- [SonarCloud GitHub Action](https://github.com/SonarSource/sonarcloud-github-action)
- [Managing Personal Access Tokens](https://docs.sonarsource.com/sonarqube-cloud/managing-your-account/user-authentication/)
- [Quality Gates Documentation](https://docs.sonarsource.com/sonarqube-cloud/concepts/quality-gates/)
- [Integrating SonarCloud with GitHub Actions](https://medium.com/@rahulsharan512/integrating-sonarcloud-with-github-actions-for-secure-code-analysis-26a7fa206d40)

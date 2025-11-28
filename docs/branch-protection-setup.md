# Branch Protection Configuration Guide

## Overview

This guide explains how to configure branch protection rules for the GTD Todo App repository to comply with Constitution V (Git Flow Discipline) and ensure code quality through automated checks.

## Required Branch Protection Rules

We need to protect two branches:
1. **`main`** - Production-ready code
2. **`develop`** - Integration branch for features (if using Git Flow)

## Step-by-Step Configuration

### Method 1: Via GitHub Web UI

#### 1. Navigate to Repository Settings

1. Go to your repository: https://github.com/l3toII/todoDemo
2. Click on **Settings** (top menu)
3. In the left sidebar, click **Branches** under "Code and automation"

#### 2. Add Branch Protection Rule for `main`

1. Click **Add rule** or **Add branch protection rule**
2. In **Branch name pattern**, enter: `main`

#### 3. Configure Protection Settings for `main`

**Required Settings (Constitution Compliance):**

✅ **Require a pull request before merging**
   - Check this box
   - **Required approvals**: Set to `1`
   - ✅ Check **Dismiss stale pull request approvals when new commits are pushed**
   - ✅ Check **Require review from Code Owners** (if you have CODEOWNERS file)

✅ **Require status checks to pass before merging**
   - Check this box
   - ✅ Check **Require branches to be up to date before merging**
   - Select required status checks (will appear after first CI run):
     - `CI Pipeline / api-lint`
     - `CI Pipeline / api-tests`
     - `CI Pipeline / api-security`
     - `CI Pipeline / web-lint`
     - `CI Pipeline / web-tests`
     - `CI Pipeline / web-build`
     - `CI Pipeline / web-security`
     - `CI Pipeline / ci-summary`

✅ **Require conversation resolution before merging**
   - Check this box (ensures all PR comments are resolved)

✅ **Require signed commits** (Optional but recommended)
   - Check this box for additional security

✅ **Require linear history** (Recommended)
   - Check this box to prevent merge commits
   - Forces rebase or squash merging

✅ **Do not allow bypassing the above settings**
   - Check this box to enforce rules for everyone

**Additional Recommended Settings:**

⚠️ **Include administrators** (Recommended for consistency)
   - Check this box to apply rules to admins too
   - Can be unchecked if you need emergency access

🔒 **Restrict who can push to matching branches** (Optional)
   - Only select users/teams can push directly
   - Good for production branch

🔒 **Allow force pushes** (Leave UNCHECKED)
   - Never allow force pushes to `main`

🔒 **Allow deletions** (Leave UNCHECKED)
   - Prevent accidental branch deletion

#### 4. Save the Rule

Click **Create** or **Save changes** at the bottom

#### 5. Repeat for `develop` Branch (if using Git Flow)

Same steps as above, but:
- Branch name pattern: `develop`
- Slightly relaxed rules acceptable:
  - Required approvals can be `1`
  - Can allow squash merging

### Method 2: Via GitHub CLI (Faster)

If you have GitHub CLI installed:

```bash
# Protect main branch
gh api repos/l3toII/todoDemo/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=CI\ Pipeline\ /\ api-lint \
  --field required_status_checks[contexts][]=CI\ Pipeline\ /\ api-tests \
  --field required_status_checks[contexts][]=CI\ Pipeline\ /\ web-build \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field enforce_admins=true \
  --field required_conversation_resolution=true \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Protect develop branch (if needed)
gh api repos/l3toII/todoDemo/branches/develop/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=CI\ Pipeline\ /\ api-lint \
  --field required_status_checks[contexts][]=CI\ Pipeline\ /\ web-build \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field enforce_admins=false \
  --field allow_force_pushes=false
```

### Method 3: Via Terraform (Infrastructure as Code)

Create `infra/terraform/github.tf`:

```hcl
resource "github_branch_protection" "main" {
  repository_id = "todoDemo"
  pattern       = "main"

  required_status_checks {
    strict   = true
    contexts = [
      "CI Pipeline / api-lint",
      "CI Pipeline / api-tests",
      "CI Pipeline / api-security",
      "CI Pipeline / web-lint",
      "CI Pipeline / web-tests",
      "CI Pipeline / web-build",
      "CI Pipeline / web-security",
      "CI Pipeline / ci-summary"
    ]
  }

  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
  }

  enforce_admins              = true
  require_conversation_resolution = true
  require_signed_commits      = false
  required_linear_history     = true

  allows_deletions    = false
  allows_force_pushes = false
}
```

## Verification Steps

After configuring branch protection:

### 1. Test Branch Protection

```bash
# Try to push directly to main (should fail)
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test: direct push"
git push origin main
# Expected: ❌ Error - branch is protected
```

### 2. Test PR Workflow

```bash
# Create a feature branch
git checkout -b test/branch-protection
echo "# Test" >> test.md
git add test.md
git commit -m "test: branch protection"
git push origin test/branch-protection

# Create PR via GitHub CLI
gh pr create \
  --title "Test: Branch Protection" \
  --body "Testing branch protection rules" \
  --base main
```

Expected behavior:
- ✅ CI pipeline runs automatically
- ⏳ Merge button disabled until CI passes
- ⏳ Merge button disabled until 1 approval
- ✅ Can merge only after all checks pass

### 3. Verify Status Checks

1. Go to the PR on GitHub
2. Check that all CI jobs appear in the "Checks" tab
3. Verify merge button shows "Merge blocked" until checks pass

## Troubleshooting

### Status Checks Not Appearing

**Problem**: Required status checks list is empty

**Solution**:
1. Status checks only appear after running at least once
2. Push a commit to trigger CI first
3. Wait for workflow to complete
4. Return to branch protection settings
5. Required checks will now appear in the dropdown

### Can't Find Branch Protection Settings

**Problem**: "Branches" option not visible in Settings

**Solution**:
- Ensure you have admin access to the repository
- Branch protection requires repository admin permissions

### CI Jobs Have Different Names

**Problem**: Status check names don't match

**Solution**:
Check actual job names in `.github/workflows/ci.yml`:
```yaml
jobs:
  api-lint:  # This becomes "CI Pipeline / api-lint"
    name: API - PHP Lint & Static Analysis
```

The status check name format is: `{workflow-name} / {job-id}`

## Current Status Checks (from ci.yml)

Based on our CI pipeline, these are the required status checks:

```
CI Pipeline / api-lint
CI Pipeline / api-tests
CI Pipeline / api-security
CI Pipeline / web-lint
CI Pipeline / web-tests
CI Pipeline / web-build
CI Pipeline / web-security
CI Pipeline / ci-summary
```

## Git Flow Workflow (Post-Configuration)

Once branch protection is active:

### Feature Development
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/2-user-account-management

# Make changes
git add .
git commit -m "feat(auth): implement user registration"
git push origin feat/2-user-account-management

# Create PR
gh pr create --base main --title "feat: User Account Management" --body "Implements issue #2"
```

### Review and Merge
1. CI runs automatically
2. Request review from team member
3. Address review comments
4. Wait for approval
5. Merge via GitHub UI (squash or rebase)

### Hotfix to Production
```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Fix bug
git add .
git commit -m "fix: critical security vulnerability"
git push origin hotfix/critical-bug

# Create PR with priority label
gh pr create --base main --label "priority:critical" --title "hotfix: Critical Security Fix"
```

## Additional Recommendations

### 1. Create CODEOWNERS File

Create `.github/CODEOWNERS`:
```
# Default owners for everything
* @l3toII

# API code requires backend team review
/api/ @l3toII @backend-team

# Infrastructure requires DevOps review
/infra/ @l3toII @devops-team
/.github/ @l3toII @devops-team

# Database migrations require careful review
/api/migrations/ @l3toII @backend-lead
```

### 2. Set Up Auto-merge for Dependabot

Allow Dependabot PRs to auto-merge after CI passes:

```bash
gh pr merge --auto --squash <pr-number>
```

### 3. Configure Commit Message Linting

Add to CI pipeline:
```yaml
- name: Validate Commit Messages
  run: |
    npx commitlint --from HEAD~1 --to HEAD --verbose
```

## Quick Reference Card

| Action | Allowed? | Reason |
|--------|----------|--------|
| Push directly to `main` | ❌ NO | Protected branch |
| Create PR to `main` | ✅ YES | Standard workflow |
| Merge PR without approval | ❌ NO | Requires 1+ approval |
| Merge PR with failing CI | ❌ NO | All checks must pass |
| Force push to `main` | ❌ NO | Never allowed |
| Delete `main` branch | ❌ NO | Permanently protected |
| Bypass as admin | ⚠️ MAYBE | Only if "Include admins" unchecked |

## Completion Checklist

After configuration, verify:

- [ ] Branch protection active for `main`
- [ ] Branch protection active for `develop` (if using)
- [ ] Required status checks configured (8 checks)
- [ ] Pull request reviews required (1+ approvals)
- [ ] Force pushes disabled
- [ ] Branch deletion disabled
- [ ] Linear history enforced
- [ ] Conversation resolution required
- [ ] Test PR created and verified
- [ ] All CI checks appear in PR
- [ ] Merge blocked until checks pass
- [ ] Task S0-010 marked complete in tasks.md

## Related Documentation

- [Constitution V: Git Flow Discipline](../specs/.specify/templates/constitution.md)
- [CI Pipeline Documentation](.github/workflows/ci.yml)
- [Deployment Guide](./deployment.md)

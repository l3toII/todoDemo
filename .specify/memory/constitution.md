<!--
  ============================================================================
  SYNC IMPACT REPORT
  ============================================================================
  Version change: 1.3.0 → 1.4.0 (MINOR: principles clarified for flexibility)

  Modified principles:
    - V. Git Flow Discipline: Added feature-branch model support
    - VI. CI/CD Pipeline: Clarified integration branch flexibility
    - XV. Infrastructure-First: Updated for integration branch deployment
    - XVI. GitHub Issues Tracking: Clarified closure on integration branch merge
    - Development Workflow: Updated PR process and pre-merge checklist

  Added sections: None

  Removed sections: None

  Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ Compatible
    - .specify/templates/spec-template.md: ✅ Compatible
    - .specify/templates/tasks-template.md: ✅ Compatible
    - .specify/templates/checklist-template.md: ✅ Compatible
    - .specify/templates/agent-file-template.md: ✅ Compatible

  Follow-up TODOs:
    - Update all project documentation to reference integration branch
    - Configure CD pipeline for feature-branch deployment to staging
  ============================================================================
-->

# Project Constitution

## Core Principles

### I. Code Quality

Code MUST meet the following quality standards:

- **Readability**: Code MUST be self-documenting with explicit variable, function, and class names
- **Consistency**: Code style MUST be uniform across the project (linters and formatters mandatory)
- **DRY (Don't Repeat Yourself)**: Code duplication MUST be avoided through appropriate abstractions
- **SOLID**: SOLID principles MUST guide code architecture
- **Cyclomatic complexity**: Functions MUST have cyclomatic complexity below 10
- **Code coverage**: Project MUST maintain minimum 80% test coverage

**Rationale**: Quality code reduces technical debt, eases maintenance, and accelerates new developer onboarding.

### II. Testing Standards

The project MUST follow a test pyramid strategy:

- **Unit tests**: Each TASK MUST be covered by unit tests
  - Complete isolation of dependencies via mocks/stubs
  - Execution time < 100ms per test
  - Naming: `test_<function>_<scenario>_<expected_result>`
- **Integration tests**: Each component MUST have integration tests
  - Contract validation between modules
  - Database tests with transaction rollback
- **E2E (End-to-End) tests**: Each FEATURE MUST be end-to-end testable
  - Complete user scenarios
  - Tests on production-like environment
  - Validation of user stories defined in spec.md
- **TDD recommended**: Tests SHOULD be written before implementation (Red-Green-Refactor)

**Rationale**: Tests guarantee code reliability and enable confident refactoring.

### III. User Experience

User experience MUST guide design decisions:

- **Accessibility**: Project MUST meet WCAG 2.1 Level AA minimum standards
- **Perceived performance**: Perceived response time MUST be < 100ms for interactions
- **User feedback**: Every user action MUST provide immediate visual feedback
- **Error handling**: Error messages MUST be clear, actionable, and in user language
- **Progressive Enhancement**: Features MUST work without JavaScript when possible
- **Mobile First**: Design MUST prioritize mobile experience

**Rationale**: Excellent UX increases adoption, reduces support burden, and improves user satisfaction.

### IV. Performance

Performance objectives MUST be measured and met:

- **API response time**: p95 < 200ms, p99 < 500ms
- **Time to First Byte (TTFB)**: < 200ms
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Bundle size**: Initial JavaScript MUST be < 200KB gzipped
- **Memory**: No detectable memory leaks over 24h of usage

**Rationale**: Performance directly impacts UX, SEO, and infrastructure costs.

### V. Git Flow Discipline

The project MUST follow Git Flow with these conventions:

**Main branches**:
- `main`: Production code, always deployable
- **Integration branch**: Either `develop` (persistent) OR `<feature-id>-<name>` (feature-specific)
  - `develop`: Persistent integration branch for traditional Git Flow
  - `001-feature-name`: Feature-specific integration branch (merges to `main` when complete)

**Branch Model Flexibility**: Projects MAY choose between:
1. **Classic Git Flow**: Persistent `main` + `develop` branches
2. **Feature-Branch Model**: `main` + long-lived feature branch (e.g., `001-gtd-todo-app`)

**Working branches** (naming mandatory):
- `feat/<issue-id>-<description>`: New features (branch from integration branch)
- `fix/<issue-id>-<description>`: Bug fixes
- `hotfix/<issue-id>-<description>`: Urgent production fixes (branch from `main`)
- `release/<version>`: Release preparation
- `spec/<issue-id>-<description>`: Specification document changes (.specify/*)
- `refactor/<issue-id>-<description>`: Refactoring without functional changes
- `docs/<issue-id>-<description>`: Documentation only
- `test/<issue-id>-<description>`: Test additions or modifications only
- `chore/<issue-id>-<description>`: Maintenance, dependencies, configuration

**Prohibited practices**:
- NEVER push directly to `main` or integration branch without PR
- NEVER force push on shared branches
- NEVER merge without approved code review
- NEVER commit on a branch not conforming to naming conventions

**Rationale**: Git Flow structures development, facilitates releases, and maintains clean history. Feature-branch model allows focused development on major features before main integration.

### VI. CI/CD Pipeline

The project MUST have a complete CI/CD pipeline:

**Continuous Integration (CI)** - Mandatory on each push:
- Project compilation/build
- Linter execution (ESLint, Prettier, etc.)
- Unit test execution
- Code coverage analysis
- Security analysis (SAST)
- Vulnerable dependency checking

**Continuous Deployment (CD)** - Mandatory for merges:
- Integration tests on staging environment
- Automated E2E tests
- Automatic deployment to staging (integration branch: `develop` or feature branch)
- Manual or semi-automatic deployment to production (`main`)
- Automated rollback on health check failures

**Quality Gates** (blocking):
- Build MUST pass
- All tests MUST pass
- Code coverage >= 80%
- No critical vulnerabilities
- Code review approved

**Technology**: CI/CD tool choice is free (GitHub Actions, GitLab CI, Jenkins, etc.) but pipeline MUST be complete and documented.

**Rationale**: CI/CD guarantees quality, accelerates deployments, and reduces human errors.

### VII. Atomic Commits

Each commit MUST be atomic and follow these rules:

- **One commit = One logical change**: Each commit MUST represent a coherent and complete change
- **Compilable**: Code MUST compile after each commit
- **Testable**: Tests MUST pass after each commit
- **Reversible**: Each commit MUST be independently revertible

**Commit message format** (Conventional Commits):
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Allowed types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance
- `spec`: Specification changes (.specify/*)

**Rationale**: Atomic commits facilitate debugging, reviews, and rollbacks.

### VIII. Sprint & Task Organization

Work organization MUST follow a sprint/feature/task structure:

**Sprint**:
- Fixed duration (recommended: 2 weeks)
- Clear and measurable objectives
- Retrospective at each sprint end

**Feature (User Story)**:
- Corresponds to a `feat/` or `spec/` branch
- MUST be E2E testable
- MUST deliver user value
- MUST be independent and deployable alone
- Defined priority (P1, P2, P3...)

**Task**:
- Atomic work unit
- MUST be unit testable
- Estimated duration < 4 hours
- Single owner
- Linked to parent feature

**tasks.md generation**:
- Tasks MUST be organized by User Story
- Each User Story MUST have its tests (E2E) and tasks (unit)
- Dependencies between tasks MUST be explicit
- Format MUST follow: `[ID] [P?] [Story] Description`

**Rationale**: This organization enables precise tracking, incremental deliveries, and measurable velocity.

### IX. Documentation as Code

Documentation MUST be treated as code:

- **Versioned**: All documentation MUST be in the Git repository
- **Reviewed**: Documentation changes MUST go through PR
- **Up-to-date**: Documentation MUST be updated with each feature
- **Automated**: Technical documentation SHOULD be auto-generated (JSDoc, Swagger, etc.)

**Mandatory documents**:
- spec.md: Functional specifications
- plan.md: Technical implementation plan
- tasks.md: Task list
- CHANGELOG.md: Change history
- README.md: Getting started guide

**Rationale**: Up-to-date documentation reduces onboarding time and prevents knowledge loss.

### X. Security by Design

Security MUST be integrated from design:

- **Least privilege principle**: Components have only necessary permissions
- **Input validation**: All user inputs MUST be validated
- **Secrets**: NEVER hardcode secrets in code (use environment variables)
- **Dependencies**: Dependencies MUST be audited regularly
- **OWASP Top 10**: OWASP vulnerabilities MUST be actively prevented

**Rationale**: Upstream security is less costly than fixing production vulnerabilities.

### XI. Observability

The system MUST be observable:

- **Structured logging**: Logs MUST be in JSON format with context
- **Metrics**: Technical KPIs MUST be exposed (latency, errors, saturation)
- **Tracing**: Distributed requests MUST be traceable (correlation IDs)
- **Alerting**: Anomalies MUST trigger proactive alerts

**Rationale**: Observability enables rapid diagnosis and continuous improvement.

### XII. Dependency Management

Dependency management MUST follow these rules:

- **Pinning**: Versions MUST be fixed (lock files)
- **Audit**: Dependencies MUST be audited at each build
- **Updates**: Security updates MUST be applied within 48h
- **Minimization**: Include only necessary dependencies
- **License**: Licenses MUST be compatible with the project

**Rationale**: Good dependency management reduces vulnerabilities and complexity.

### XIII. Feature Flags

Feature flags MUST be used for safe deployments:

- **Decoupled deployment**: Code CAN be deployed to production without being activated
- **Progressive activation**: Features MUST be activatable by user percentage
- **Kill switch**: Each feature flag MUST allow instant deactivation
- **Cleanup**: Feature flags MUST be removed within 30 days of full activation
- **Documentation**: Each flag MUST be documented with its purpose and expected expiration date

**Flag types**:
- `release`: Progressive activation of new functionality
- `experiment`: A/B tests and experimentation
- `ops`: Operational control (maintenance mode, graceful degradation)
- `permission`: Access control by user/group

**Mandatory practices**:
- Flags MUST have a safe default value (disabled)
- Flags MUST be evaluated server-side for sensitive features
- Expired flags MUST trigger cleanup alerts

**Rationale**: Feature flags enable risk-free deployments, instant rollbacks, and controlled experimentation.

### XIV. API Versioning

APIs MUST follow a clear versioning strategy:

**Versioning strategy** (choose one and stick to it):
- **URL Path** (recommended): `/api/v1/resource`, `/api/v2/resource`
- **Header**: `Accept: application/vnd.api+json; version=1`
- **Query Parameter**: `/api/resource?version=1`

**Versioning rules**:
- **MAJOR** (v1 → v2): Incompatible changes (breaking changes)
- **MINOR** (implicit): Backward-compatible additions (new endpoints, optional fields)
- **Deprecation**: Versions MUST be supported minimum 6 months after deprecation announcement

**Mandatory practices**:
- Each version MUST have OpenAPI/Swagger documentation
- Breaking changes MUST be announced minimum 3 months in advance
- Clients MUST receive deprecation headers (`Deprecation`, `Sunset`)
- Version N-1 MUST remain supported while clients actively use it

**Change management**:
- Adding fields: Backward-compatible (no new version)
- Removing fields: Breaking change (new major version)
- Format modification: Breaking change (new major version)
- New endpoints: Backward-compatible (no new version)

**Rationale**: Clear versioning protects existing clients and enables controlled API evolution.

### XV. Infrastructure-First

**CI/CD infrastructure MUST be operational before any feature development begins.**

This principle establishes a mandatory prerequisite for all feature work:

**Pre-requisites before ANY feature work**:
- `main` branch MUST be deployed to production environment
- Integration branch (`develop` or feature branch) MUST be deployed to staging environment
- CI pipeline MUST be fully operational (build, test, lint, security scan)
- CD pipeline MUST be fully operational (auto-deploy to staging, manual deploy to production)
- Branch protection rules MUST be enforced on `main` and integration branch
- Quality gates MUST be configured and blocking

**Infrastructure checklist** (MUST all pass before feature development):
- [ ] Production environment provisioned and accessible
- [ ] Staging environment provisioned and accessible
- [ ] CI pipeline executes on every push
- [ ] CD pipeline deploys to staging on develop merge
- [ ] CD pipeline deploys to production on main merge (manual trigger)
- [ ] Health checks configured for both environments
- [ ] Rollback mechanism tested and documented
- [ ] Monitoring and alerting configured
- [ ] Branch protection rules active

**Blocking rule**: NO feature branch (`feat/*`) may be created until all infrastructure checklist items pass. Specification work (`spec/*` branches) is permitted during infrastructure setup.

**Rationale**: A functional CI/CD pipeline is the foundation of modern software development. Without it, code quality cannot be guaranteed, deployments are risky, and the team cannot iterate safely. Establishing infrastructure first prevents technical debt accumulation and ensures every feature benefits from automated quality gates from day one.

### XVI. GitHub Issues Tracking

**Every feature MUST be tracked as a GitHub issue, and the issue MUST be closed upon merge to the integration branch.**

**Mandatory practices**:
- Each feature (`feat/*` branch) MUST reference a GitHub issue in its branch name: `feat/<issue-id>-<description>`
- Each bug fix (`fix/*` branch) MUST reference a GitHub issue: `fix/<issue-id>-<description>`
- The GitHub issue MUST be created BEFORE work begins on the feature
- PR descriptions MUST include `Closes #<issue-id>` or `Fixes #<issue-id>` to enable automatic closure
- Issues MUST be automatically closed when the associated PR is merged to the **integration branch** (`develop` or feature branch like `001-gtd-todo-app`)

**Issue requirements**:
- **Title**: Clear, concise description of the feature or fix
- **Description**: Acceptance criteria, context, and any relevant links to spec.md or tasks.md
- **Labels**: Appropriate labels (feature, bug, enhancement, etc.)
- **Milestone**: Assigned to the current sprint/milestone when applicable
- **Assignee**: At least one assignee responsible for the work

**Workflow**:
1. Create GitHub issue describing the feature/fix
2. Create branch with issue ID: `feat/<issue-id>-description` (from integration branch)
3. Reference issue in commits: `feat(scope): description (#<issue-id>)`
4. Open PR targeting integration branch with `Closes #<issue-id>` in description
5. Issue auto-closes on merge to integration branch (`develop` or `001-gtd-todo-app`)

**Prohibited practices**:
- NEVER create a `feat/*` or `fix/*` branch without a corresponding GitHub issue
- NEVER merge a PR without proper issue linkage
- NEVER manually close issues that should be auto-closed by PR merge

**Rationale**: GitHub issues provide traceability, enable project management visibility, facilitate team communication, and create an audit trail of all changes. Automatic closure ensures issues stay synchronized with actual code state.

## Development Workflow

### Pull Request Process

1. **Creation**: From a branch conforming to Git Flow naming
2. **Description**: PR template with context, changes, tests
3. **Target**: PRs target integration branch (`develop` or feature branch) or `main`
4. **CI**: Pipeline MUST pass (build, tests, linting)
5. **Review**: Minimum 1 approval required
6. **Merge**: Squash merge to integration branch, merge commit to `main`

### Code Review Checklist

- [ ] Code compiles and tests pass
- [ ] Code respects constitution principles
- [ ] Test coverage is sufficient
- [ ] Documentation is up-to-date
- [ ] No undocumented technical debt
- [ ] Performance is acceptable
- [ ] Security is respected

## Quality Gates

### Pre-commit (local)

- Automatic formatting (Prettier, Black, etc.)
- Quick linting
- Affected unit tests

### Pre-push (local)

- Complete build
- All unit tests
- Type checking (if applicable)

### CI Pipeline (server)

- Build
- Unit tests
- Integration tests
- Coverage analysis (>= 80%)
- Security analysis
- Complete linting

### Pre-merge (PR)

- All CI checks pass
- Code review approved
- No conflicts
- Branch up-to-date with target (integration branch or `main`)

## Governance

### Amendment Process

1. Propose change via a `spec/constitution-*` branch
2. Document the reason for change
3. Obtain maintainer approval
4. Update version according to semver
5. Propagate changes to dependent templates

### Versioning Policy

- **MAJOR**: Incompatible changes or principle removal
- **MINOR**: New principles or sections added
- **PATCH**: Clarifications, minor corrections

### Compliance Review

- Quarterly project compliance review
- Violation audit and action plan
- Constitution update if necessary

### Constitution Precedence

This constitution SUPERSEDES all other practices. In case of conflict between this constitution and other documents, the constitution prevails.

**Version**: 1.4.0 | **Ratified**: 2025-11-28 | **Last Amended**: 2025-11-28

# Branch Protection Policy - RepoSense

**Effective Date**: January 21, 2026  
**License**: AGPL-3.0  
**Status**: Active for all releases

---

## Overview

Branch protection rules ensure code quality, security, and compliance for the RepoSense project. These rules apply to the `main` branch and must be followed by all contributors.

---

## Protected Branches

### Main Branch (`main`)
- **Status**: 🔒 Protected
- **Purpose**: Production-ready code only
- **Access**: Merge via pull request only

### Release Branches (`release/*`)
- **Status**: 🔒 Protected
- **Purpose**: Staging for releases
- **Access**: Merge via pull request only

---

## Branch Protection Rules - GitHub Configuration

### 1. Require Pull Request Reviews

**Setting**: ✅ Enabled

```
Required number of approvals before merge: 1
Require review from Code Owners: ✅ ENABLED
Dismiss stale pull request approvals: ✅ ENABLED
Require approval of the most recent reviewable push: ✅ ENABLED
```

**Rationale:**
- Ensures at least one peer review
- Code owners automatically assigned via CODEOWNERS file
- Stale reviews auto-dismissed when new commits added
- Latest changes always reviewed

### 2. Require Status Checks to Pass

**Setting**: ✅ Enabled

**Required Status Checks:**
- ✅ `build` - TypeScript compilation
- ✅ `test` - Unit tests (90+ tests)
- ✅ `lint` - ESLint validation
- ✅ `coverage` - Minimum 80% code coverage
- ✅ `security` - Security scanning (Snyk/similar)
- ✅ `compliance` - License compliance check

**Require Branches to be Up to Date:**
- ✅ ENABLED
- Prevents merge of stale branches with main conflicts

### 3. Require Code Owner Review

**Setting**: ✅ Enabled

**Applies To:**
- Core engine changes (`/src/core/`, `/src/services/analysis/`)
- Compliance features (`/src/services/compliance/`)
- CLI commands (`/src/cli/`)
- License & legal files (`AGPL_LICENSE.txt`, `LICENSE`)
- CI/CD configuration (`.github/`, `Jenkinsfile`, `.gitlab-ci.yml`)

**Defined in**: `CODEOWNERS` file

### 4. Require Signed Commits

**Setting**: ✅ Recommended (Optional for now)

```
Require commits to be signed and verified: ⚠️ OPTIONAL
```

**Future**: Will be enforced after initial community setup.

### 5. Dismiss Stale Pull Request Approvals

**Setting**: ✅ Enabled

When new commits are pushed to a PR:
- Previous approvals are automatically dismissed
- New review required for new changes
- Ensures reviewers see latest code

### 6. Require Linear History

**Setting**: ✅ Enabled

```
Require linear history: ✅ ENABLED
```

**Effect:**
- No merge commits allowed
- Use squash-and-merge or rebase-and-merge
- Keeps commit history clean and readable

### 7. Restrict Push Access

**Setting**: ✅ Enabled

**Who can push directly:**
- Repository maintainers only
- Team: `@Data-Scientist-MSL/maintainers`

**Who cannot push directly:**
- All community contributors
- All external users
- All bot accounts

### 8. Auto-Delete Head Branches

**Setting**: ✅ Enabled

```
Delete head branches automatically: ✅ ENABLED
```

**Effect:**
- Removes branch after PR merge
- Keeps repository clean
- Reduces clutter

---

## Pull Request Workflow

### Before Creating a PR

```bash
# 1. Create feature branch from main
git checkout -b feature/your-feature main

# 2. Make changes
# ... edit files ...

# 3. Run local tests (must pass)
npm test

# 4. Run linter (must pass)
npm run lint

# 5. Check code coverage
npm run coverage

# 6. Run TypeScript compiler
npm run compile

# 7. Commit with clear message
git commit -m "feat: add feature X"
```

### Creating PR

**Checklist** (Automated via PR template):
- ✅ Tests added/updated
- ✅ Documentation updated
- ✅ No breaking changes (or documented)
- ✅ CHANGELOG.md updated
- ✅ TypeScript compiles with 0 errors
- ✅ ESLint passes
- ✅ Code coverage ≥80%
- ✅ Commit messages follow convention

### During Review

**Reviewer Responsibilities:**
1. Check code logic and design
2. Verify tests are comprehensive
3. Ensure documentation is clear
4. Check for security issues
5. Verify compliance requirements
6. Request changes or approve

**Contributor Responsibilities:**
1. Respond to feedback promptly
2. Make requested changes
3. Re-request review after changes
4. Keep PR focused on single feature

### Merge Conditions

**PR can only be merged if:**
- ✅ At least 1 approval from code owner
- ✅ All status checks pass
- ✅ No merge conflicts
- ✅ Linear history maintained
- ✅ Branch is up-to-date with main

---

## Bypass Exceptions

### Emergency Hotfixes

**Criteria:**
- Production incident affecting >100 users
- Security vulnerability
- Data corruption issue

**Process:**
1. Open emergency PR with `[EMERGENCY]` prefix
2. Get approval from 2 maintainers minimum
3. Document incident in CHANGELOG.md
4. Post-incident review within 24 hours

**Bypass Protocol:**
- Maximum 1 bypass per month
- Requires maintainer approval
- Logged in incident tracker

### Administrative Changes

**Criteria:**
- License updates
- Contributor list
- CODEOWNERS changes

**Process:**
1. Create PR as normal
2. Get approval from project lead
3. Merge follows standard rules (no bypass)

---

## Status Checks Details

### Build Status
```bash
npm run compile  # TypeScript compilation
```
- **Timeout**: 5 minutes
- **Failure**: Blocks merge

### Test Status
```bash
npm test  # Run all tests
```
- **Timeout**: 10 minutes
- **Minimum Coverage**: 80%
- **Failure**: Blocks merge

### Lint Status
```bash
npm run lint  # ESLint
```
- **Timeout**: 2 minutes
- **Failure**: Blocks merge

### Coverage Status
```bash
npm run coverage  # c8 coverage report
```
- **Minimum**: 80% line coverage
- **Target**: 85%+ function coverage
- **Failure**: Blocks merge if <80%

---

## Enforcement & Monitoring

### Automated Enforcement
- GitHub Actions workflow runs on every push
- All checks must pass before merge allowed
- Dashboard shows real-time status

### Manual Verification
- Weekly PR metrics review
- Monthly compliance audit
- Quarterly policy review

### Violations & Enforcement

**Violation**: Commit directly to main

**Consequence:**
1. First offense: Warning + forced revert
2. Second offense: Suspended privileges (1 week)
3. Third offense: Permanent access revocation

**Violation**: Merge without approved review

**Consequence:**
1. First offense: Review audit + warning
2. Second offense: Code review suspension (1 month)
3. Third offense: Contributor removal

---

## Implementation Steps (GitHub)

### Step 1: Enable Branch Protection

1. Go to **Settings** → **Branches**
2. Click **Add rule** under "Branch protection rules"
3. Enter `main` as the branch name pattern

### Step 2: Configure Protection Rules

In the branch protection rule page:

**Pull Request Reviews:**
- ✅ Require pull request reviews before merging
  - Required number of approvals: `1`
  - ✅ Require review from code owners
  - ✅ Dismiss stale pull request approvals
  - ✅ Require approval of the most recent reviewable push
  - ✅ Restrict who can dismiss pull request reviews

**Status Checks:**
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Select checks:
    - ☑ build
    - ☑ test
    - ☑ lint
    - ☑ coverage

**Other Restrictions:**
- ✅ Require linear history
- ✅ Include administrators
- ✅ Restrict who can push to matching branches
  - Allow only: `@Data-Scientist-MSL/maintainers`
- ✅ Allow force pushes → None (disabled)
- ✅ Allow deletions → Unchecked (disabled)
- ✅ Automatically delete head branches → Checked (enabled)

### Step 3: Create CODEOWNERS File

```bash
# Already created at /CODEOWNERS
# GitHub will auto-detect it
```

### Step 4: Create PR Template

**File**: `.github/pull_request_template.md`

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] Feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Code coverage ≥80%
- [ ] CHANGELOG.md updated
```

---

## FAQ

**Q: Can I merge my own PR?**  
A: Only if someone else from the code owners approves first.

**Q: What if all maintainers are on vacation?**  
A: Emergency bypass available (see Bypass Exceptions).

**Q: Can I force push to main?**  
A: No. Force pushes are permanently disabled.

**Q: What counts as a "status check pass"?**  
A: All required checks must report success. Any failure blocks merge.

**Q: How long do reviews typically take?**  
A: Target: 24 hours. Critical/urgent PRs: 2-4 hours.

**Q: Can I delete a branch after merge?**  
A: Yes. Automatic deletion is enabled after merge.

---

## Related Files

- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Code Owners**: [CODEOWNERS](CODEOWNERS)
- **PR Template**: [.github/pull_request_template.md](.github/pull_request_template.md)
- **CI/CD Configuration**: [.github/workflows/](.github/workflows/)

---

## Policy Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-21 | Initial policy |

---

**Last Updated**: January 21, 2026  
**Maintained By**: @Data-Scientist-MSL/maintainers  
**Review Cycle**: Quarterly

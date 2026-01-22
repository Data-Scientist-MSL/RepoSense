# 🔒 Branch Protection Setup Guide

**RepoSense Open Source**  
**Date**: January 21, 2026  
**Status**: Complete - Ready to Deploy

---

## ✅ What's Been Created For You

### 1. **CODEOWNERS File**
- Automatic code reviewer assignment
- Organized by feature area (core, AI, compliance, CI/CD, etc.)
- Maps teams to specific directories

### 2. **Branch Protection Policy** 
- `BRANCH_PROTECTION_POLICY.md` - Complete policy documentation
- Detailed enforcement rules
- Bypass procedures
- Implementation steps

### 3. **GitHub Actions Workflows**
- `.github/workflows/branch-protection.yml` - Automated status checks
- Includes: build, test, lint, coverage, security, compliance
- All checks must pass before merge

### 4. **PR Template**
- `.github/pull_request_template.md` - Guided PR creation
- Automated checklist for contributors
- Reviewer guidelines

---

## 🚀 One-Time GitHub Setup (Manual)

### Step 1: Navigate to Settings

```
GitHub Repository
  → Settings
    → Branches (left sidebar)
```

### Step 2: Add Protection Rule for `main`

```
Branch protection rules
  → Add rule
    → Branch name pattern: main
    → Click "Create"
```

### Step 3: Configure Protection Options

**Copy-paste these settings:**

✅ **Pull Requests**
- [x] Require a pull request before merging
  - Required approvals: **1**
  - [x] Require review from Code Owners (CODEOWNERS file)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require approval of the most recent reviewable push

✅ **Status Checks**
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Select checks:
    - ☑ build
    - ☑ test
    - ☑ lint
    - ☑ coverage
    - ☑ security (optional)
    - ☑ compliance

✅ **Restrictions**
- [x] Require linear history (squash or rebase only)
- [x] Include administrators in above restrictions
- [x] Restrict who can push to matching branches
  - Allow pushes only by: Select `@Data-Scientist-MSL/maintainers`
- [x] Allow force pushes: **None** (disabled)
- [x] Allow deletions: **Unchecked** (disabled)
- [x] Auto delete head branches: **Checked** (enabled)

### Step 4: Save Settings

Click **Save changes** button

---

## ✨ What This Achieves

### 🛡️ Security
- No direct pushes to main
- All changes reviewed before merge
- Code owners automatically notified
- Security scanning on every PR

### 📊 Quality
- All tests must pass
- Code coverage minimum 80%
- ESLint/TypeScript errors block merge
- Linear commit history

### 🔐 Compliance
- AGPL license enforced
- CODEOWNERS file verified
- Breaking changes documented
- Audit trail maintained

### 🚀 Automation
- GitHub Actions runs all checks
- Stale reviews auto-dismissed
- PR template auto-populates
- Head branches auto-deleted

---

## 📋 Contributor Workflow

### For Contributors:

```bash
# 1. Clone repo
git clone https://github.com/Data-Scientist-MSL/RepoSense.git
cd RepoSense

# 2. Create feature branch
git checkout -b feature/my-feature main

# 3. Make changes
# ... edit files ...

# 4. Run quality checks locally
npm run compile   # TypeScript
npm test          # Tests
npm run lint      # Linter
npm run coverage  # Coverage report

# 5. Commit
git commit -m "feat: add my feature"

# 6. Push
git push origin feature/my-feature

# 7. Create PR via GitHub UI
# → Fill out template
# → Submit PR
```

### GitHub Actions Will:
1. ✅ Compile TypeScript
2. ✅ Run all tests
3. ✅ Check code coverage (80%+ required)
4. ✅ Run ESLint
5. ✅ Security scan
6. ✅ License compliance check

### Maintainers Will:
1. 📝 Review code
2. 💬 Request changes if needed
3. ✅ Approve and merge (or request fixes)

---

## 🔄 Emergency Bypass (Rare Cases)

**Only for:**
- Production incidents affecting >100 users
- Security vulnerabilities
- Data corruption

**Process:**
1. Label PR with `[EMERGENCY]`
2. Get approval from 2+ maintainers
3. Document incident in CHANGELOG.md
4. Post-incident review within 24 hours

---

## 📊 Monitoring & Maintenance

### Weekly
- Review PR metrics
- Check failed CI runs
- Update issue status

### Monthly
- Audit branch protection violations
- Review policy effectiveness
- Update CODEOWNERS if needed

### Quarterly
- Policy review & updates
- Team role adjustments
- Status check evaluation

---

## 🆘 Troubleshooting

### "PR won't merge - status checks failing"

**Solution:**
```bash
# Run checks locally
npm run compile
npm test
npm run lint

# Fix any issues
# Push fixes
git push origin feature/my-feature
```

GitHub Actions will re-run automatically.

### "Need code owner approval but can't find them"

**Solution:**
- Check CODEOWNERS file for file ownership
- Check GitHub team settings
- Contact maintainers on Discord

### "Branch is out of date with main"

**Solution:**
```bash
# Update your branch
git fetch origin
git rebase origin/main
git push --force-with-lease origin feature/my-feature
```

GitHub will auto-request fresh reviews.

### "Status check missing from required list"

**Solution:**
1. Go to Settings → Branches
2. Find branch protection rule for `main`
3. Scroll to "Status checks"
4. Add the missing check name
5. Save

---

## 📚 Related Documentation

- **Full Policy**: [BRANCH_PROTECTION_POLICY.md](../BRANCH_PROTECTION_POLICY.md)
- **Code Owners**: [CODEOWNERS](../CODEOWNERS)
- **Contributing**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **PR Template**: [.github/pull_request_template.md](../.github/pull_request_template.md)
- **CI/CD Workflows**: [.github/workflows/](../.github/workflows/)

---

## ✅ Verification Checklist

After setting up branch protection on GitHub, verify:

- [ ] Cannot push directly to main (get error)
- [ ] PR template appears when creating new PR
- [ ] Status checks run on PR creation
- [ ] Cannot merge without 1 approval
- [ ] Cannot merge without passing checks
- [ ] Code owners auto-assigned to relevant PRs
- [ ] Stale reviews dismissed on new commits
- [ ] Linear history enforced (rebase/squash only)

---

## 📞 Support

**Questions about branch protection?**
- 📖 Read: [BRANCH_PROTECTION_POLICY.md](../BRANCH_PROTECTION_POLICY.md)
- 💬 Discord: [discord.gg/reposense](https://discord.gg/reposense)
- 🐛 GitHub Issues: [Report issue](https://github.com/Data-Scientist-MSL/RepoSense/issues)

---

**Setup Complete!** 🎉

Your repository is now ready for open-source contributions with enterprise-grade branch protection.

*Last Updated: January 21, 2026*

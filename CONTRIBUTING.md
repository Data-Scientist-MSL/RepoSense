# Contributing to RepoSense

Thank you for your interest in contributing to RepoSense! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- VS Code 1.85.0+
- Git
- TypeScript knowledge

### Setup Development Environment

1. Fork and clone the repository:
```bash
git clone https://github.com/Data-Scientist-MSL/RepoSense.git
cd RepoSense
```

2. Install dependencies:
```bash
npm install
```

3. Open in VS Code:
```bash
code .
```

4. Press `F5` to launch Extension Development Host

## 📝 Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `hotfix/*`: Critical production fixes

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add gap detection for React hooks
fix: resolve TreeView refresh issue
docs: update API documentation
test: add unit tests for ASTParser
refactor: optimize cache service
```

## 🧪 Testing

### Run Tests

```bash
npm test                 # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
```

### Writing Tests

Place tests in `src/test/` matching the source structure:

```typescript
import * as assert from 'assert';
import { GapDetector } from '../services/analysis/GapDetector';

suite('GapDetector Test Suite', () => {
    test('Should detect orphaned components', () => {
        const detector = new GapDetector();
        const gaps = detector.findOrphanedComponents(calls, endpoints);
        assert.strictEqual(gaps.length, 2);
    });
});
```

## 📋 Code Style

### TypeScript Guidelines

- Use strict mode
- Prefer `const` over `let`
- Use async/await over promises
- Add JSDoc comments for public APIs
- Follow existing naming conventions

### ESLint

```bash
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues
```

## 🎯 Pull Request Process

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**: Follow code style guidelines

3. **Write Tests**: Ensure >80% coverage

4. **Update Documentation**: Update README if needed

5. **Commit Changes**: Use conventional commits

6. **Push to Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request**:
   - Clear description of changes
   - Link related issues
   - Add screenshots for UI changes
   - Ensure CI passes

## 🐛 Bug Reports

Use GitHub Issues with the following template:

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Step one
2. Step two
3. ...

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 11]
- VS Code Version: [e.g., 1.85.0]
- Extension Version: [e.g., 0.1.0]

**Screenshots**
If applicable
```

## 💡 Feature Requests

Use GitHub Issues with the `enhancement` label:

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other approaches you've thought about
```

## 📚 Documentation

- Code comments for complex logic
- JSDoc for public APIs
- README updates for user-facing changes
- Wiki updates for architectural changes

## 🎖️ Recognition

Contributors will be acknowledged in:
- README.md Contributors section
- Release notes
- GitHub Contributors page

## 📞 Questions?

- GitHub Discussions for general questions
- GitHub Issues for bug reports
- Email: [maintainer email]

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for making RepoSense better!** 🚀

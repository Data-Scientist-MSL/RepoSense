# Contributing to RepoSense

Thank you for your interest in contributing to RepoSense! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

---

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- ✅ Be respectful and constructive
- ✅ Welcome newcomers and help them learn
- ✅ Focus on what is best for the community
- ✅ Show empathy towards other community members
- ❌ Use inappropriate language or personal attacks
- ❌ Publish others' private information
- ❌ Engage in trolling or insulting comments

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18.x or higher
- **VS Code** 1.85.0 or higher
- **Git** for version control
- **Ollama** (optional, for testing AI features)

### Fork & Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/RepoSense.git
   cd RepoSense
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/Data-Scientist-MSL/RepoSense.git
   ```

---

## 🛠️ Development Setup

### Installation

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Watch mode (auto-compile on save)
npm run watch
```

### Running the Extension

1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the new VS Code window, open a test project
4. Use Command Palette (`Ctrl+Shift+P`) to run RepoSense commands

### Debugging

- **Extension Code**: Set breakpoints in `src/` files, press `F5`
- **Language Server**: Set breakpoints in `src/server/`, attach debugger
- **Tests**: Use `npm test` or VS Code Test Explorer

---

## 📁 Project Structure

```
RepoSense/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── providers/             # TreeView, CodeLens, CodeAction providers
│   ├── services/              # Business logic services
│   │   ├── llm/              # LLM integration (Ollama, test gen, etc.)
│   │   └── DiagnosticsManager.ts
│   ├── analysis/              # Code analysis modules
│   ├── core/                  # Core scanning logic
│   ├── models/                # TypeScript interfaces and types
│   ├── utils/                 # Utilities (performance, error handling)
│   ├── server/                # Language Server Protocol implementation
│   └── test/                  # Test suites
│       ├── suite/            # Unit tests
│       ├── integration/      # Integration tests
│       └── e2e/              # End-to-end tests
├── media/                     # Icons, images, stylesheets
├── docs/                      # Documentation
├── package.json               # Extension manifest
├── tsconfig.json             # TypeScript configuration
└── README.md                  # Project readme
```

---

## 🎨 Coding Standards

### TypeScript Guidelines

- **Strict Mode**: Always use strict TypeScript (`"strict": true`)
- **Explicit Types**: Avoid `any`, prefer explicit type annotations
- **Async/Await**: Use async/await over raw Promises
- **Arrow Functions**: Prefer arrow functions for callbacks
- **Error Handling**: Always handle errors gracefully

```typescript
// ✅ Good
async function analyzeFile(filePath: string): Promise<AnalysisResult> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return parseContent(content);
    } catch (error) {
        ErrorHandler.getInstance().handleError(error, {
            context: 'analyzeFile',
            filePath
        });
        throw error;
    }
}

// ❌ Bad
function analyzeFile(filePath: any) {
    fs.readFile(filePath, 'utf-8', (err, content) => {
        if (err) console.error(err);
        return parseContent(content);
    });
}
```

### Naming Conventions

- **Classes**: PascalCase (`GapAnalysisProvider`)
- **Interfaces**: PascalCase, prefix with `I` for clarity (`IGapItem`)
- **Functions/Methods**: camelCase (`detectGaps()`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_CONCURRENT_REQUESTS`)
- **Files**: PascalCase for classes (`GapAnalyzer.ts`), camelCase for utilities (`errorHandler.ts`)

### Code Formatting

We use Prettier for code formatting:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Linting

We use ESLint for code quality:

```bash
# Lint all files
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

---

## 🧪 Testing Guidelines

### Test Coverage Requirements

- **Unit Tests**: >= 80% line coverage, >= 85% function coverage
- **Integration Tests**: Cover all major user workflows
- **E2E Tests**: At least 3 sample projects with known gaps

### Writing Unit Tests

```typescript
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('OllamaService', () => {
    let service: OllamaService;
    let axiosStub: sinon.SinonStub;

    before(() => {
        service = new OllamaService();
        axiosStub = sinon.stub(axios, 'post');
    });

    after(() => {
        axiosStub.restore();
    });

    it('should generate code analysis', async () => {
        axiosStub.resolves({
            data: { response: 'This code is well-structured' }
        });

        const result = await service.analyzeCode('const x = 1;', 'typescript');
        
        expect(result).to.include('well-structured');
        expect(axiosStub.calledOnce).to.be.true;
    });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "OllamaService"

# Run with coverage
npm run coverage

# Generate HTML coverage report
npm run coverage:report
```

---

## 🔄 Pull Request Process

### 1. Create a Feature Branch

```bash
# Fetch latest changes
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, well-documented code
- Add tests for new features
- Update documentation as needed
- Follow coding standards

### 3. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat: add support for Vue.js gap detection"

# Bug fix
git commit -m "fix: correct endpoint matching for nested routes"

# Documentation
git commit -m "docs: update getting started guide"

# Performance
git commit -m "perf: optimize AST parsing with caching"

# Tests
git commit -m "test: add integration tests for scan workflow"
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

### 4. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with clear description and link to related issues.

---

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check documentation** for answers
3. **Update to latest version** to see if issue persists

### Creating a Bug Report

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment (OS, VS Code version, RepoSense version)

---

**Happy Contributing! 🚀**

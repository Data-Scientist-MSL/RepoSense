# RepoSense - Intelligent Code Analysis & UAT

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue.svg)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**RepoSense** is a groundbreaking VS Code extension that bridges the critical gap between frontend and backend development while automating User Acceptance Testing. Built to deliver enterprise-grade functionality with zero ongoing costs.

## 🎯 Features

### Gap Analysis
- **Frontend-Backend Integration Detection**: Identifies orphaned UI components and unused API endpoints
- **Type Mismatch Detection**: Catches interface inconsistencies between frontend and backend
- **CRUD Completeness Validation**: Ensures all Create, Read, Update, Delete operations are properly implemented

### Automated UAT Generation
- **AI-Powered Test Cases**: Generates comprehensive test scenarios using local LLMs (DeepSeek-Coder)
- **Multi-Framework Support**: Export to Playwright, Cypress, or Cucumber
- **Coverage Analysis**: Visual representation of integration testing coverage

### Intelligent Remediation
- **One-Click Fixes**: Automated code generation for missing endpoints
- **Smart Suggestions**: Context-aware recommendations based on your codebase
- **Preview & Undo**: Safe remediation with full preview capabilities

## 🚀 Quick Start

### Installation

1. Install from VS Code Marketplace (coming soon) or build from source:

```bash
npm install
npm run compile
```

2. Press `F5` to launch Extension Development Host

3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
   - `RepoSense: Scan Repository`

### Basic Usage

1. **Open Activity Bar**: Click the RepoSense icon in the Activity Bar
2. **Scan Repository**: Click the scan button or run the command
3. **Review Gaps**: Explore detected issues in the Gap Analysis view
4. **Fix Issues**: Use one-click remediation or export test cases

## 🏗️ Architecture

RepoSense uses a multi-process architecture for optimal performance:

- **Extension Host**: UI components and command handlers
- **Language Server**: Heavy AST parsing and analysis
- **AI Worker**: Local LLM processing (Ollama + DeepSeek)

## 📋 Requirements

- VS Code 1.85.0 or higher
- Node.js 18+ (for development)
- Optional: Ollama with DeepSeek-Coder model (for AI features)

## 🛠️ Development

### Project Structure

```
src/
├── extension.ts          # Entry point
├── providers/            # TreeView data providers
├── services/             # Core business logic
│   ├── analysis/         # AST parsing & detection
│   ├── cache/            # SQLite caching
│   └── llm/              # AI integration
├── models/               # TypeScript interfaces
└── test/                 # Unit & integration tests
```

### Build & Test

```bash
npm run compile         # Compile TypeScript
npm run watch          # Watch mode
npm run lint           # Run ESLint
npm run test           # Run tests
```

## 🎯 Roadmap

- [x] **Sprint 1-2**: Foundation & Infrastructure ✅
- [ ] **Sprint 3-4**: Core Analysis Engine (In Progress)
- [ ] **Sprint 5-6**: UI/UX Integration
- [ ] **Sprint 7-8**: Intelligence Layer
- [ ] **Sprint 9-10**: Testing & Remediation
- [ ] **Sprint 11-12**: Polish & Launch

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📞 Support

- GitHub Issues: [Report bugs](https://github.com/Data-Scientist-MSL/RepoSense/issues)
- Documentation: [Full docs](https://github.com/Data-Scientist-MSL/RepoSense/wiki)

---

**Made with ❤️ for developers who value quality and integration**

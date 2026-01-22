# RepoSense - Intelligent Repository Analyzer & UAT Assistant

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=reposense.reposense)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://github.com/Data-Scientist-MSL/RepoSense/workflows/CI/badge.svg)](https://github.com/Data-Scientist-MSL/RepoSense/actions)
[![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen.svg)](https://github.com/Data-Scientist-MSL/RepoSense)

**RepoSense** is the first VS Code extension that intelligently bridges your frontend and backend code, automatically detecting integration gaps and generating comprehensive test coverageâ€”all powered by local AI at **zero cost**.

---

## ðŸš€ Features

### ðŸ” **Intelligent Gap Detection**
- **Frontend-Backend Analysis**: Automatically detects API calls in frontend code and matches them with backend endpoints
- **Missing Endpoint Detection**: Identifies frontend calls to non-existent backend endpoints (critical gaps)
- **Untested Endpoint Detection**: Finds backend endpoints without test coverage (high-priority gaps)
- **Multi-Framework Support**: Works with React, Vue, Angular, Express, Fastify, NestJS, and more

### ðŸ¤– **AI-Powered Analysis (100% Local)**
- **Zero-Cost AI**: Powered by [Ollama](https://ollama.ai) running locally - no API keys, no subscriptions
- **DeepSeek-Coder-V2**: Uses state-of-the-art code-specific LLM for accurate analysis
- **Interactive AI Chat**: Get conversational guidance on fixing gaps with context-aware recommendations
- **Automated Test Generation**: Generates Playwright/Cypress tests for detected gaps
- **Smart Remediation**: Suggests code fixes with AI-powered analysis
- **Executive Reports**: Creates comprehensive markdown/HTML reports with metrics
- **Architecture Diagrams**: Auto-generate L1/L2/L3 architecture diagrams showing defects and improvements

### ðŸ“Š **Architecture Visualization**
- **Multi-Level Diagrams**: Generate L1 (high-level), L2 (component), and L3 (technical) architecture views
- **As-Is vs To-Be**: Visualize current architecture with defects and proposed improvements
- **Mermaid Format**: Diagrams render in VS Code, GitHub, and can be exported to PNG/SVG
- **UI/UX Defect Highlighting**: Identify component structure, data flow, and state management issues
- **Side-by-Side Comparison**: See before/after architecture with detailed difference tracking
- **Report Integration**: Include architecture diagrams in executive reports

### âœ… **Automated UAT & Testing**
- **One-Click Test Generation**: Generate complete test suites for untested endpoints
- **Multiple Test Frameworks**: Supports Playwright, Cypress, Jest, Mocha
- **Backend Endpoint Scaffolding**: Auto-generate missing backend endpoints
- **Test Coverage Analysis**: Visualize coverage gaps in real-time

### ðŸŽ¨ **Professional UI/UX**
- **TreeView Integration**: Browse gaps by severity, type, or file
- **CodeLens Annotations**: See gaps inline in your code
- **Quick Fixes**: Apply AI-generated fixes with one click
- **AI Chat Assistant**: Interactive conversational interface for guidance and remediation
- **Interactive Reports**: Beautiful webview reports with charts and metrics
- **Dark/Light Theme Support**: Seamlessly integrates with your VS Code theme

---

## ðŸ“¦ Installation

### Prerequisites
1. **VS Code** 1.85.0 or higher
2. **Ollama** (for AI features):
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows (PowerShell)
   winget install Ollama.Ollama
   
   # Pull the default model
   ollama pull deepseek-coder:6.7b
   ```

### Install from VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "RepoSense"
4. Click **Install**

### Install from VSIX
```bash
code --install-extension reposense-1.0.0.vsix
```

---

## ðŸŽ¯ Quick Start

### 1ï¸âƒ£ **Scan Your Repository**
```bash
# Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
> RepoSense: Scan Repository
```

RepoSense will analyze your frontend and backend code to detect:
- Missing backend endpoints
- Untested backend endpoints
- Frontend-backend mismatches

### 2ï¸âƒ£ **View Gaps**
Gaps appear in:
- **Activity Bar** â†’ RepoSense TreeView
- **Problems Panel** â†’ Diagnostics
- **Editor** â†’ CodeLens annotations

### 3ï¸âƒ£ **Generate Tests (AI)**
```bash
# Right-click a gap or use Command Palette
> RepoSense: Generate Tests
```

RepoSense uses AI to generate comprehensive test cases:
```typescript
// Generated Playwright test
test('POST /api/users should create user', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: { name: 'John Doe', email: 'john@example.com' }
  });
  
  expect(response.status()).toBe(201);
  const user = await response.json();
  expect(user).toHaveProperty('id');
  expect(user.name).toBe('John Doe');
});
```

### 4ï¸âƒ£ **Chat with AI Assistant**
```bash
# Get interactive help with your gaps
> RepoSense: Open AI Assistant Chat
```

Ask questions like:
- "How do I fix the missing /api/users endpoint?"
- "What are the security implications of this gap?"
- "What's the best testing strategy for my endpoints?"

The AI assistant provides:
- Context-aware recommendations based on your gap analysis
- Step-by-step remediation guidance
- Pros and cons of different approaches
- Best practices and security considerations

See the [AI Chat Guide](docs/ai-chat-guide.md) for detailed usage.

### 5ï¸âƒ£ **Apply Quick Fixes**
Click **Quick Fix** on a gap to:
- Generate missing backend endpoint
- Add test coverage
- Fix frontend API call

### 5ï¸âƒ£ **Generate Architecture Diagrams**
```bash
> RepoSense: Generate Architecture Diagrams
```

Visualize your architecture with AI-generated diagrams:
- **L1 (High-Level)**: System overview for executives
- **L2 (Component)**: Detailed interactions for developers
- **L3 (Technical)**: Deep UI/UX patterns and implementation
- **As-Is vs To-Be**: Compare current state with proposed improvements
- Export as Mermaid diagrams (renders in VS Code, GitHub, exportable to PNG/SVG)

See [Architecture Diagrams Documentation](docs/ARCHITECTURE_DIAGRAMS.md) for details.

### 6ï¸âƒ£ **Generate Executive Report**
```bash
> RepoSense: Generate Executive Report
```

Get a comprehensive report with:
- Gap summary by severity
- Code coverage metrics
- **Architecture diagrams** (choose "Markdown with Diagrams")
- UI/UX defect analysis
- Recommendations
- Export to Markdown/HTML/JSON

---

## âš™ï¸ Configuration

### Extension Settings

Open Settings (`Ctrl+,` / `Cmd+,`) and search for "RepoSense":

```jsonc
{
  // Ollama Configuration
  "reposense.ollamaEndpoint": "http://localhost:11434",
  "reposense.llmModel": "deepseek-coder:6.7b",
  
  // Analysis Settings
  "reposense.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**"
  ],
  "reposense.maxConcurrentAnalysis": 4,
  
  // Test Generation
  "reposense.preferredTestFramework": "playwright",
  
  // Performance
  "reposense.performance.trackingEnabled": true,
  "reposense.performance.incrementalAnalysis": true,
  "reposense.performance.cacheTTL": 300000,
  
  // Telemetry (Optional)
  "reposense.telemetry.enabled": false
}
```

### Supported Languages

| **Frontend** | **Backend** | **Test Frameworks** |
|--------------|-------------|---------------------|
| TypeScript   | Node.js     | Playwright          |
| JavaScript   | Express     | Cypress             |
| React (TSX)  | Fastify     | Jest                |
| Vue          | NestJS      | Mocha               |
| Angular      | Python      | Vitest              |

---

## ðŸ“– Documentation

- [Getting Started (5-Minute Walkthrough)](docs/getting-started.md)
- [AI Chat Assistant Guide](docs/ai-chat-guide.md) â­ **NEW**
- [Gap Detection Guide](docs/gap-detection.md)
- [Test Generation Guide](docs/test-generation.md)
- [Remediation Guide](docs/remediation.md)
- [Settings Reference](docs/settings.md)
- [Troubleshooting](docs/troubleshooting.md)

---

## ðŸ—ï¸ Architecture

RepoSense uses a multi-layered architecture:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚         VS Code Extension Host          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  UI Layer (TreeView, CodeLens, WebView) â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Language Server Protocol (LSP)         â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Core Analysis Engine                   â”‚
â”‚  â”œâ”€ AST Parsing (Tree-sitter)          â”‚
â”‚  â”œâ”€ Gap Detection                       â”‚
â”‚  â””â”€ Test Coverage Analysis             â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Intelligence Layer                     â”‚
â”‚  â”œâ”€ Ollama Service (Local LLM)         â”‚
â”‚  â”œâ”€ Test Generator                      â”‚
â”‚  â”œâ”€ Remediation Engine                  â”‚
â”‚  â””â”€ Report Generator                    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Utilities & Infrastructure             â”‚
â”‚  â”œâ”€ Performance Monitor                 â”‚
â”‚  â”œâ”€ Incremental Analyzer                â”‚
â”‚  â”œâ”€ Error Handler                       â”‚
â”‚  â””â”€ Batch Processor                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ§ª Testing

RepoSense has comprehensive test coverage:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Generate coverage report
npm run coverage
npm run coverage:report
```

### Test Suite
- **90+ Unit Tests** (Mocha + Chai + Sinon)
- **6 Integration Tests** (Complete workflows)
- **3 E2E Test Projects** (Sample apps with known gaps)
- **Code Coverage**: 80%+ line coverage, 85%+ function coverage

### Performance Targets
- âœ… Extension activation: < 500ms
- âœ… Scan 50K LOC: < 30 seconds
- âœ… Memory usage: < 200MB
- âœ… Incremental analysis cache: 60%+ hit rate

---

## ðŸ¤ Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/Data-Scientist-MSL/RepoSense.git
cd RepoSense

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Watch mode (auto-compile)
npm run watch

# Open in VS Code
code .
```

### Development Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: your feature"`
5. Push: `git push origin feature/your-feature`
6. Create Pull Request

---

## ðŸ“ Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

### Latest Release: v1.0.0 (January 2026)
- âœ¨ Initial marketplace release
- ðŸ” Frontend-Backend gap detection
- ðŸ¤– AI-powered test generation with Ollama + DeepSeek
- âœ… Automated remediation engine
- ðŸ“Š Executive report generation
- âš¡ Performance optimization with caching
- ðŸ›¡ï¸ Comprehensive error handling
- ðŸ§ª 90+ unit tests with 80%+ coverage

---

## ðŸ“„ License

GNU Affero General Public License v3.0 - see [LICENSE](LICENSE) file for details.

---

## ðŸ™ Acknowledgments

- **[Ollama](https://ollama.ai)** - Local LLM runtime
- **[DeepSeek](https://www.deepseek.com/)** - DeepSeek-Coder-V2 model
- **[Tree-sitter](https://tree-sitter.github.io/)** - Incremental parsing
- **[VS Code API](https://code.visualstudio.com/api)** - Extension framework

---

## ðŸ› Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/Data-Scientist-MSL/RepoSense/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/Data-Scientist-MSL/RepoSense/discussions)
- **Questions**: [Stack Overflow](https://stackoverflow.com/questions/tagged/reposense) (tag: `reposense`)

---

## ðŸŒŸ Show Your Support

If you find RepoSense helpful, please:
- â­ **Star** the [GitHub repository](https://github.com/Data-Scientist-MSL/RepoSense)
- ðŸ“ **Write a review** on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=reposense.reposense)
- ðŸ¦ **Share** on social media
- ðŸ’¬ **Join** our community discussions

---

## ðŸ“Š Stats

- **Total Lines of Code**: 15,000+
- **Test Coverage**: 80%+
- **Supported Languages**: 8+
- **Total Tests**: 90+
- **Performance**: <30s for 50K LOC

---

**Made with â¤ï¸ by the RepoSense Team**

ðŸš€ **Start analyzing your codebase today!**

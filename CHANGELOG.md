# Changelog

All notable changes to the "RepoSense" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-18

### 🎉 Initial Release

#### Added
- **Gap Detection Engine**
  - Frontend-backend API call matching
  - Missing endpoint detection (frontend calls non-existent backend)
  - Untested endpoint detection (backend endpoints without tests)
  - Multi-language support (TypeScript, JavaScript, Python)
  - Multi-framework support (React, Vue, Angular, Express, Fastify, NestJS)

- **AI-Powered Features**
  - Ollama integration for local LLM (zero-cost AI)
  - DeepSeek-Coder-V2 model support
  - Automated test case generation (Playwright, Cypress)
  - Smart code remediation suggestions
  - Executive report generation (Markdown, HTML, JSON)

- **UI/UX Components**
  - Gap Analysis TreeView with severity grouping
  - Test Case TreeView with framework selection
  - Remediation TreeView with confidence scores
  - CodeLens annotations showing gaps inline
  - CodeAction quick fixes
  - Interactive webview reports with charts
  - Diagnostics integration (Problems Panel)
  - Status bar item with gap count

- **Performance Optimization**
  - Performance monitoring with budget tracking
  - Incremental analysis with SHA-256 content hashing
  - FileSystemWatcher for real-time change detection
  - Analysis result caching with TTL (5 minutes)
  - Batch processing for parallel operations
  - Debouncing and throttling utilities
  - Performance report generation

- **Error Handling & Resilience**
  - Global error handler (uncaught exceptions, unhandled rejections)
  - Retry logic with exponential backoff (3 attempts)
  - User-friendly error messages
  - Error severity classification (CRITICAL/ERROR/WARNING/INFO)
  - Graceful degradation when LLM unavailable
  - Optional telemetry support

- **Testing Infrastructure**
  - 90+ unit tests (Mocha + Chai + Sinon)
  - 6 integration tests (complete workflows)
  - 3 E2E test projects (sample apps with known gaps)
  - Code coverage tracking (c8) with 80%+ line coverage
  - Performance benchmarking

- **Commands**
  - `reposense.scanRepository` - Scan repository for gaps
  - `reposense.generateTests` - Generate AI-powered tests
  - `reposense.fixGap` - Apply AI remediation to gap
  - `reposense.showReport` - Display gap analysis report
  - `reposense.generateReport` - Generate executive report
  - `reposense.analyzeCodeWithAI` - Analyze code with AI
  - `reposense.configureOllama` - Configure Ollama settings
  - `reposense.showPerformanceReport` - Display performance metrics
  - `reposense.changeGrouping` - Change TreeView grouping mode
  - `reposense.openInEditor` - Open gap in editor
  - `reposense.applyAutoFix` - Apply automated fix
  - `reposense.runTest` - Run test case
  - `reposense.copyGapDetails` - Copy gap details to clipboard

- **Configuration Settings**
  - `reposense.ollamaEndpoint` - Ollama server endpoint (default: http://localhost:11434)
  - `reposense.llmModel` - LLM model name (default: deepseek-coder:6.7b)
  - `reposense.preferredTestFramework` - Test framework preference (playwright/cypress/auto)
  - `reposense.excludePatterns` - Glob patterns to exclude from analysis
  - `reposense.maxConcurrentAnalysis` - Maximum concurrent file analysis (default: 4)
  - `reposense.performance.trackingEnabled` - Enable performance tracking (default: true)
  - `reposense.performance.incrementalAnalysis` - Enable incremental analysis (default: true)
  - `reposense.performance.cacheTTL` - Cache TTL in milliseconds (default: 300000)
  - `reposense.telemetry.enabled` - Enable error telemetry (default: false)

#### Performance Metrics
- Extension activation: < 500ms
- Repository scan (50K LOC): < 30 seconds
- Memory usage during scan: < 200MB
- Cache hit rate: 60%+
- Precision: 100% (5 TP, 0 FP)
- Recall: 83.3% (5 TP, 1 FN)

#### Technical Details
- **Total Lines of Code**: 15,000+
- **Test Coverage**: 80%+ lines, 85%+ functions
- **Dependencies**: 
  - vscode-languageclient
  - axios (Ollama HTTP client)
  - mocha, chai, sinon (testing)
  - c8 (code coverage)
- **Supported VS Code**: 1.85.0+
- **License**: MIT

---

## [Unreleased]

### Planned Features
- Additional language support (Java, Go, Rust)
- Additional framework support (Django, Flask, Spring Boot)
- GitHub Copilot integration for enhanced code generation
- Real-time collaboration features
- Cloud sync for analysis results
- Custom rule engine for organization-specific gap detection
- Integration with CI/CD pipelines
- REST API for headless operation
- VS Code Web support

---

## Version History

- **1.0.0** (2026-01-18) - Initial marketplace release
- **0.9.0** (2026-01-11) - Beta release (internal testing)
- **0.8.0** (2026-01-04) - Alpha release (feature complete)
- **0.1.0** (2025-12-01) - Initial development

---

## Migration Guide

### From Beta (0.9.0) to Release (1.0.0)

No breaking changes. All beta users can upgrade seamlessly.

**New features in 1.0.0**:
- Performance monitoring and reporting
- Incremental analysis with caching
- Enhanced error handling with retry logic
- Comprehensive documentation

**Configuration changes**:
- Added `reposense.performance.*` settings (optional, enabled by default)
- Added `reposense.telemetry.enabled` (optional, disabled by default)

---

## Support & Feedback

- **Issues**: [GitHub Issues](https://github.com/Data-Scientist-MSL/RepoSense/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Data-Scientist-MSL/RepoSense/discussions)
- **Twitter**: [@RepoSense](https://twitter.com/reposense) (coming soon)

---

[1.0.0]: https://github.com/Data-Scientist-MSL/RepoSense/releases/tag/v1.0.0
[Unreleased]: https://github.com/Data-Scientist-MSL/RepoSense/compare/v1.0.0...HEAD

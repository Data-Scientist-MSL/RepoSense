"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGenerator = void 0;
const vscode = __importStar(require("vscode"));
class TestGenerator {
    constructor(ollamaService) {
        this.ollamaService = ollamaService;
    }
    async generateTestsForGaps(gaps) {
        const testCases = [];
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating test cases...',
            cancellable: true
        }, async (progress, token) => {
            const total = gaps.length;
            for (let i = 0; i < gaps.length; i++) {
                if (token.isCancellationRequested) {
                    break;
                }
                const gap = gaps[i];
                progress.report({
                    increment: (100 / total),
                    message: `Processing gap ${i + 1}/${total}`
                });
                try {
                    const testCase = await this.generateTestForGap(gap);
                    testCases.push(testCase);
                }
                catch (error) {
                    console.error(`Failed to generate test for gap:`, error);
                }
            }
        });
        return testCases;
    }
    async generateTestForGap(gap) {
        const framework = this.detectFramework(gap.file);
        const code = await this.readFileContext(gap.file, gap.line);
        const testCode = await this.ollamaService.generateTest(code, framework, this.detectLanguage(gap.file));
        return {
            id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: this.generateTestName(gap),
            description: gap.message,
            code: testCode,
            framework: framework,
            category: gap.type,
            priority: this.mapSeverityToPriority(gap.severity)
        };
    }
    async generatePlaywrightTest(endpoint, method, scenario) {
        const systemPrompt = `You are an expert Playwright test engineer. Generate production-ready E2E tests.`;
        const scenarioDescriptions = {
            happy: 'successful user flow with valid data',
            error: 'error handling with invalid inputs',
            edge: 'edge cases like empty strings, max values, special characters'
        };
        const prompt = `Generate a Playwright test for:
Endpoint: ${method} ${endpoint}
Scenario: ${scenarioDescriptions[scenario]}

Include:
- Proper test structure with describe/test blocks
- Data setup and teardown
- Assertions for status codes and responses
- Error handling
- Accessibility checks with axe

Example structure:
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('API: ${method} ${endpoint}', () => {
    test('${scenario} path', async ({ request }) => {
        // Test implementation
    });
});
\`\`\`

Generate the complete test:`;
        return this.ollamaService.generate(prompt, { system: systemPrompt });
    }
    async generateCypressTest(endpoint, method, scenario) {
        const systemPrompt = `You are an expert Cypress test engineer. Generate production-ready E2E tests.`;
        const scenarioDescriptions = {
            happy: 'successful user flow with valid data',
            error: 'error handling with invalid inputs',
            edge: 'edge cases like empty strings, max values, special characters'
        };
        const prompt = `Generate a Cypress test for:
Endpoint: ${method} ${endpoint}
Scenario: ${scenarioDescriptions[scenario]}

Include:
- Proper test structure with describe/it blocks
- cy.request() for API calls
- Assertions with chai
- Error handling
- Custom commands if needed

Example structure:
\`\`\`javascript
describe('API: ${method} ${endpoint}', () => {
    it('should handle ${scenario} scenario', () => {
        // Test implementation
    });
});
\`\`\`

Generate the complete test:`;
        return this.ollamaService.generate(prompt, { system: systemPrompt });
    }
    async generateUITest(component, userFlow, framework) {
        const systemPrompt = `You are an expert E2E test engineer. Generate comprehensive UI tests.`;
        const prompt = `Generate a ${framework} UI test for:
Component: ${component}
User Flow: ${userFlow}

Include:
1. Element selectors (prefer data-testid)
2. User interactions (click, type, etc.)
3. Visual assertions
4. Accessibility checks
5. Error states

Generate the complete test:`;
        return this.ollamaService.generate(prompt, { system: systemPrompt });
    }
    async addTestIdAttributes(code, language) {
        const systemPrompt = `You are an expert frontend developer. Add data-testid attributes to make components testable.`;
        const prompt = `Add data-testid attributes to this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Rules:
- Use descriptive, kebab-case test IDs
- Add to interactive elements (buttons, inputs, links)
- Add to key container elements
- Don't modify existing data-testid attributes

Return the updated code:`;
        return this.ollamaService.generate(prompt, { system: systemPrompt, temperature: 0.1 });
    }
    detectFramework(filePath) {
        // Default to Playwright for modern projects
        // Could be enhanced to check package.json
        return 'playwright';
    }
    detectLanguage(filePath) {
        const ext = filePath.toLowerCase().split('.').pop();
        const languageMap = {
            'ts': 'typescript',
            'tsx': 'typescript',
            'js': 'javascript',
            'jsx': 'javascript',
            'py': 'python',
            'vue': 'vue'
        };
        return languageMap[ext || ''] || 'typescript';
    }
    async readFileContext(filePath, line) {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const startLine = Math.max(0, line - 10);
            const endLine = Math.min(document.lineCount, line + 10);
            let context = '';
            for (let i = startLine; i < endLine; i++) {
                context += document.lineAt(i).text + '\n';
            }
            return context;
        }
        catch (error) {
            return '// Unable to read file context';
        }
    }
    generateTestName(gap) {
        const type = gap.type.replace('_', ' ');
        const action = gap.message.split(' ')[0];
        return `${type} - ${action}`;
    }
    mapSeverityToPriority(severity) {
        if (severity === 'CRITICAL' || severity === 'HIGH')
            return 'high';
        if (severity === 'MEDIUM')
            return 'medium';
        return 'low';
    }
    async generateTestSuite(gaps) {
        const testsByCategory = this.groupByCategory(gaps);
        let testSuite = `import { test, expect } from '@playwright/test';\n\n`;
        for (const [category, categoryGaps] of Object.entries(testsByCategory)) {
            testSuite += `test.describe('${category}', () => {\n`;
            for (const gap of categoryGaps) {
                const testName = this.generateTestName(gap);
                testSuite += `  test('${testName}', async ({ page, request }) => {\n`;
                testSuite += `    // TODO: Implement test for: ${gap.message}\n`;
                testSuite += `    // File: ${gap.file}:${gap.line}\n`;
                testSuite += `  });\n\n`;
            }
            testSuite += `});\n\n`;
        }
        return testSuite;
    }
    groupByCategory(gaps) {
        const grouped = {};
        for (const gap of gaps) {
            const category = gap.type || 'uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(gap);
        }
        return grouped;
    }
}
exports.TestGenerator = TestGenerator;

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
const chai_1 = require("chai");
const mocha_1 = require("mocha");
const sinon = __importStar(require("sinon"));
const ReportGenerator_1 = require("../../../services/llm/ReportGenerator");
const OllamaService_1 = require("../../../services/llm/OllamaService");
(0, mocha_1.describe)('ReportGenerator', () => {
    let reportGenerator;
    let ollamaServiceStub;
    (0, mocha_1.beforeEach)(() => {
        ollamaServiceStub = sinon.createStubInstance(OllamaService_1.OllamaService);
        reportGenerator = new ReportGenerator_1.ReportGenerator(ollamaServiceStub);
    });
    afterEach(() => {
        sinon.restore();
    });
    (0, mocha_1.describe)('generateExecutiveReport()', () => {
        (0, mocha_1.it)('should generate complete executive report', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/users',
                    file: 'Users.tsx',
                    line: 10,
                    suggestedFix: 'Create endpoint'
                },
                {
                    type: 'unused_endpoint',
                    severity: 'LOW',
                    message: 'Unused /api/products',
                    file: 'products.ts',
                    line: 20,
                    suggestedFix: 'Remove or use'
                }
            ];
            const summary = {
                totalFiles: 50,
                critical: 1,
                high: 0,
                medium: 0,
                low: 1
            };
            ollamaServiceStub.generateNaturalLanguageReport.resolves('The codebase has 2 gaps requiring attention...');
            const report = await reportGenerator.generateExecutiveReport(gaps, summary);
            (0, chai_1.expect)(report).to.have.property('title');
            (0, chai_1.expect)(report).to.have.property('summary');
            (0, chai_1.expect)(report).to.have.property('keyFindings');
            (0, chai_1.expect)(report).to.have.property('recommendations');
            (0, chai_1.expect)(report).to.have.property('metrics');
            (0, chai_1.expect)(report).to.have.property('generatedAt');
        });
        (0, mocha_1.it)('should calculate metrics correctly', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Gap 1',
                    file: 'a.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                },
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Gap 2',
                    file: 'b.tsx',
                    line: 2,
                    suggestedFix: 'Fix'
                },
                {
                    type: 'unused_endpoint',
                    severity: 'MEDIUM',
                    message: 'Gap 3',
                    file: 'c.ts',
                    line: 3,
                    suggestedFix: 'Fix'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const report = await reportGenerator.generateExecutiveReport(gaps, {});
            (0, chai_1.expect)(report.metrics.totalGaps).to.equal(3);
            (0, chai_1.expect)(report.metrics.criticalIssues).to.equal(1);
            (0, chai_1.expect)(report.metrics.orphanedComponents).to.equal(2);
            (0, chai_1.expect)(report.metrics.unusedEndpoints).to.equal(1);
        });
        (0, mocha_1.it)('should estimate fix time', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const report = await reportGenerator.generateExecutiveReport(gaps, {});
            (0, chai_1.expect)(report.metrics.estimatedFixTime).to.be.a('string');
            (0, chai_1.expect)(report.metrics.estimatedFixTime).to.match(/\d+(h|m)/);
        });
    });
    (0, mocha_1.describe)('generateMarkdownReport()', () => {
        (0, mocha_1.it)('should generate valid markdown', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Test gap',
                    file: 'test.tsx',
                    line: 10,
                    suggestedFix: 'Fix it'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Executive summary text');
            const markdown = await reportGenerator.generateMarkdownReport(gaps, {});
            (0, chai_1.expect)(markdown).to.include('## Recommendations');
            (0, chai_1.expect)(markdown).to.include('## Detailed Gap Analysis');
        });
        (0, mocha_1.it)('should include UI/UX recommendations in markdown', async () => {
            const gaps = [];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const reportGeneratorExtended = reportGenerator;
            const uiuxPack = {
                description: 'UX Insight',
                overallScore: { accessibility: 90, usability: 85, visual: 80, performance: 95 },
                issues: [{ title: 'Button Size', severity: 'low', type: 'usability', impact: 'small' }],
                disclaimer: 'UX Disclaimer'
            };
            const markdown = await reportGeneratorExtended.generateMarkdown({
                recommendations: [],
                uiuxRecommendations: uiuxPack
            });
            (0, chai_1.expect)(markdown).to.include('## 🎨 Agentic UI/UX Expert Consultation');
            (0, chai_1.expect)(markdown).to.include('UX Insight');
            (0, chai_1.expect)(markdown).to.include('UX Disclaimer');
            (0, chai_1.expect)(markdown).to.include('Button Size');
        });
        (0, mocha_1.it)('should include strategic roadmap in markdown', async () => {
            const reportGeneratorExtended = reportGenerator;
            const roadmap = "### Phase 1\n- Task 1";
            const markdown = await reportGeneratorExtended.generateMarkdown({
                recommendations: [],
                strategicRoadmap: roadmap
            });
            (0, chai_1.expect)(markdown).to.include('## 🗺️ Agentic Strategic Roadmap');
            (0, chai_1.expect)(markdown).to.include('### Phase 1');
            (0, chai_1.expect)(markdown).to.include('- Task 1');
        });
        (0, mocha_1.it)('should include metrics table', async () => {
            const gaps = [];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const markdown = await reportGenerator.generateMarkdownReport(gaps, {});
            (0, chai_1.expect)(markdown).to.include('| Metric | Value |');
            (0, chai_1.expect)(markdown).to.include('Total Gaps');
            (0, chai_1.expect)(markdown).to.include('Critical Issues');
        });
        (0, mocha_1.it)('should group gaps by severity', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Critical gap',
                    file: 'a.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                },
                {
                    type: 'unused_endpoint',
                    severity: 'LOW',
                    message: 'Low gap',
                    file: 'b.ts',
                    line: 2,
                    suggestedFix: 'Fix'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const markdown = await reportGenerator.generateMarkdownReport(gaps, {});
            (0, chai_1.expect)(markdown).to.include('### CRITICAL Priority');
            (0, chai_1.expect)(markdown).to.include('### LOW Priority');
        });
    });
    (0, mocha_1.describe)('generateHTMLReport()', () => {
        (0, mocha_1.it)('should generate valid HTML', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Test gap',
                    file: 'test.tsx',
                    line: 10,
                    suggestedFix: 'Fix it'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const html = await reportGenerator.generateHTMLReport(gaps, {});
            (0, chai_1.expect)(html).to.include('<!DOCTYPE html>');
            (0, chai_1.expect)(html).to.include('<html lang="en">');
            (0, chai_1.expect)(html).to.include('</html>');
        });
        (0, mocha_1.it)('should include UI/UX recommendations in HTML', async () => {
            const reportGeneratorExtended = reportGenerator;
            const uiuxPack = {
                description: 'UX Insight',
                overallScore: { accessibility: 90, usability: 85, visual: 80, performance: 95 },
                issues: [{ title: 'Button Size', severity: 'low', type: 'usability', impact: 'small' }],
                disclaimer: 'UX Disclaimer'
            };
            const html = await reportGeneratorExtended.generateHTML({
                recommendations: [],
                uiuxRecommendations: uiuxPack
            });
            (0, chai_1.expect)(html).to.include('Agentic UI/UX Expert Consultation');
            (0, chai_1.expect)(html).to.include('UX Insight');
            (0, chai_1.expect)(html).to.include('Accessibility Score');
            (0, chai_1.expect)(html).to.include('90%');
        });
        (0, mocha_1.it)('should include strategic roadmap in HTML', async () => {
            const reportGeneratorExtended = reportGenerator;
            const roadmap = "## Strategic Goal\n- Action Item";
            const html = await reportGeneratorExtended.generateHTML({
                recommendations: [],
                strategicRoadmap: roadmap
            });
            (0, chai_1.expect)(html).to.include('Agentic Strategic Roadmap');
            (0, chai_1.expect)(html).to.include('Strategic Goal');
            (0, chai_1.expect)(html).to.include('Action Item');
        });
        (0, mocha_1.it)('should include CSS styles', async () => {
            const gaps = [];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const html = await reportGenerator.generateHTMLReport(gaps, {});
            (0, chai_1.expect)(html).to.include('<style>');
            (0, chai_1.expect)(html).to.include('font-family');
            (0, chai_1.expect)(html).to.include('.metric-card');
        });
        (0, mocha_1.it)('should include metrics cards', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const html = await reportGenerator.generateHTMLReport(gaps, {});
            (0, chai_1.expect)(html).to.include('metric-value');
            (0, chai_1.expect)(html).to.include('metric-label');
            (0, chai_1.expect)(html).to.include('Total Gaps');
        });
        (0, mocha_1.it)('should include gap table', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Test message',
                    file: 'test.tsx',
                    line: 42,
                    suggestedFix: 'Suggested fix'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const html = await reportGenerator.generateHTMLReport(gaps, {});
            (0, chai_1.expect)(html).to.include('<table class="gap-table">');
            (0, chai_1.expect)(html).to.include('<th>Severity</th>');
            (0, chai_1.expect)(html).to.include('Test message');
            (0, chai_1.expect)(html).to.include('test.tsx:42');
        });
        (0, mocha_1.it)('should apply severity CSS classes', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const html = await reportGenerator.generateHTMLReport(gaps, {});
            (0, chai_1.expect)(html).to.include('severity-critical');
        });
    });
    (0, mocha_1.describe)('Key Findings Extraction', () => {
        (0, mocha_1.it)('should extract findings for critical issues', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Critical 1',
                    file: 'a.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                },
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Critical 2',
                    file: 'b.tsx',
                    line: 2,
                    suggestedFix: 'Fix'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const report = await reportGenerator.generateExecutiveReport(gaps, {});
            const criticalFinding = report.keyFindings.find((f) => f.includes('critical issue'));
            (0, chai_1.expect)(criticalFinding).to.exist;
            (0, chai_1.expect)(criticalFinding).to.include('2');
        });
        (0, mocha_1.it)('should identify orphaned component patterns', async () => {
            const gaps = Array(5).fill(null).map((_, i) => ({
                type: 'orphaned_component',
                severity: 'HIGH',
                message: `Gap ${i}`,
                file: `file${i}.tsx`,
                line: i,
                suggestedFix: 'Fix'
            }));
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const report = await reportGenerator.generateExecutiveReport(gaps, {});
            const orphanedFinding = report.keyFindings.find((f) => f.includes('orphaned'));
            (0, chai_1.expect)(orphanedFinding).to.exist;
        });
    });
    (0, mocha_1.describe)('Recommendations Generation', () => {
        (0, mocha_1.it)('should recommend addressing critical gaps first', async () => {
            const gaps = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const report = await reportGenerator.generateExecutiveReport(gaps, {});
            const criticalRec = report.recommendations.find((r) => r.toLowerCase().includes('critical'));
            (0, chai_1.expect)(criticalRec).to.exist;
        });
        (0, mocha_1.it)('should suggest test generation', async () => {
            const gaps = Array(12).fill(null).map((_, i) => ({
                type: 'orphaned_component',
                severity: 'HIGH',
                message: `Gap ${i}`,
                file: 'test.tsx',
                line: i,
                suggestedFix: 'Fix'
            }));
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');
            const report = await reportGenerator.generateExecutiveReport(gaps, {});
            const testRec = report.recommendations.find((r) => r.toLowerCase().includes('test'));
            (0, chai_1.expect)(testRec).to.exist;
        });
    });
});

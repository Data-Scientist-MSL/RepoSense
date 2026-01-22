import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import * as sinon from 'sinon';
import { ReportGenerator } from '../../../services/llm/ReportGenerator';
import { OllamaService } from '../../../services/llm/OllamaService';
import { GapItem } from '../../../models/types';

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;
    let ollamaServiceStub: sinon.SinonStubbedInstance<OllamaService>;

    beforeEach(() => {
        ollamaServiceStub = sinon.createStubInstance(OllamaService);
        reportGenerator = new ReportGenerator(ollamaServiceStub as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('generateExecutiveReport()', () => {
        it('should generate complete executive report', async () => {
            const gaps: GapItem[] = [
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

            ollamaServiceStub.generateNaturalLanguageReport.resolves(
                'The codebase has 2 gaps requiring attention...'
            );

            const report = await reportGenerator.generateExecutiveReport(gaps, summary);

            expect(report).to.have.property('title');
            expect(report).to.have.property('summary');
            expect(report).to.have.property('keyFindings');
            expect(report).to.have.property('recommendations');
            expect(report).to.have.property('metrics');
            expect(report).to.have.property('generatedAt');
        });

        it('should calculate metrics correctly', async () => {
            const gaps: GapItem[] = [
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

            expect(report.metrics.totalGaps).to.equal(3);
            expect(report.metrics.criticalIssues).to.equal(1);
            expect(report.metrics.orphanedComponents).to.equal(2);
            expect(report.metrics.unusedEndpoints).to.equal(1);
        });

        it('should estimate fix time', async () => {
            const gaps: GapItem[] = [
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

            expect(report.metrics.estimatedFixTime).to.be.a('string');
            expect(report.metrics.estimatedFixTime).to.match(/\d+(h|m)/);
        });
    });

    describe('generateMarkdownReport()', () => {
        it('should generate valid markdown', async () => {
            const gaps: GapItem[] = [
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

            expect(markdown).to.include('# RepoSense Analysis Report');
            expect(markdown).to.include('## Executive Summary');
            expect(markdown).to.include('## Key Metrics');
            expect(markdown).to.include('## Key Findings');
            expect(markdown).to.include('## Recommendations');
            expect(markdown).to.include('## Detailed Gap Analysis');
        });

        it('should include metrics table', async () => {
            const gaps: GapItem[] = [];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');

            const markdown = await reportGenerator.generateMarkdownReport(gaps, {});

            expect(markdown).to.include('| Metric | Value |');
            expect(markdown).to.include('Total Gaps');
            expect(markdown).to.include('Critical Issues');
        });

        it('should group gaps by severity', async () => {
            const gaps: GapItem[] = [
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

            expect(markdown).to.include('### CRITICAL Priority');
            expect(markdown).to.include('### LOW Priority');
        });
    });

    describe('generateHTMLReport()', () => {
        it('should generate valid HTML', async () => {
            const gaps: GapItem[] = [
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

            expect(html).to.include('<!DOCTYPE html>');
            expect(html).to.include('<html lang="en">');
            expect(html).to.include('</html>');
        });

        it('should include CSS styles', async () => {
            const gaps: GapItem[] = [];
            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');

            const html = await reportGenerator.generateHTMLReport(gaps, {});

            expect(html).to.include('<style>');
            expect(html).to.include('font-family');
            expect(html).to.include('.metric-card');
        });

        it('should include metrics cards', async () => {
            const gaps: GapItem[] = [
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

            expect(html).to.include('metric-value');
            expect(html).to.include('metric-label');
            expect(html).to.include('Total Gaps');
        });

        it('should include gap table', async () => {
            const gaps: GapItem[] = [
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

            expect(html).to.include('<table class="gap-table">');
            expect(html).to.include('<th>Severity</th>');
            expect(html).to.include('Test message');
            expect(html).to.include('test.tsx:42');
        });

        it('should apply severity CSS classes', async () => {
            const gaps: GapItem[] = [
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

            expect(html).to.include('severity-critical');
        });
    });

    describe('Key Findings Extraction', () => {
        it('should extract findings for critical issues', async () => {
            const gaps: GapItem[] = [
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

            const criticalFinding = report.keyFindings.find((f: string) => 
                f.includes('critical issue')
            );
            expect(criticalFinding).to.exist;
            expect(criticalFinding).to.include('2');
        });

        it('should identify orphaned component patterns', async () => {
            const gaps: GapItem[] = Array(5).fill(null).map((_, i) => ({
                type: 'orphaned_component',
                severity: 'HIGH',
                message: `Gap ${i}`,
                file: `file${i}.tsx`,
                line: i,
                suggestedFix: 'Fix'
            }));

            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');

            const report = await reportGenerator.generateExecutiveReport(gaps, {});

            const orphanedFinding = report.keyFindings.find((f: string) => 
                f.includes('orphaned')
            );
            expect(orphanedFinding).to.exist;
        });
    });

    describe('Recommendations Generation', () => {
        it('should recommend addressing critical gaps first', async () => {
            const gaps: GapItem[] = [
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

            const criticalRec = report.recommendations.find((r: string) => 
                r.toLowerCase().includes('critical')
            );
            expect(criticalRec).to.exist;
        });

        it('should suggest test generation', async () => {
            const gaps: GapItem[] = Array(12).fill(null).map((_, i) => ({
                type: 'orphaned_component',
                severity: 'HIGH',
                message: `Gap ${i}`,
                file: 'test.tsx',
                line: i,
                suggestedFix: 'Fix'
            }));

            ollamaServiceStub.generateNaturalLanguageReport.resolves('Summary');

            const report = await reportGenerator.generateExecutiveReport(gaps, {});

            const testRec = report.recommendations.find((r: string) => 
                r.toLowerCase().includes('test')
            );
            expect(testRec).to.exist;
        });
    });
});

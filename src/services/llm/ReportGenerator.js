"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const ArchitectureDiagramGenerator_1 = require("./ArchitectureDiagramGenerator");
class ReportGenerator {
    constructor(ollamaService) {
        this.ollamaService = ollamaService;
        this.diagramGenerator = new ArchitectureDiagramGenerator_1.ArchitectureDiagramGenerator(ollamaService);
    }
    async generateExecutiveReport(gaps, summary) {
        const metrics = this.calculateMetrics(gaps, summary);
        const nlSummary = await this.ollamaService.generateNaturalLanguageReport(gaps, summary);
        const keyFindings = await this.extractKeyFindings(gaps);
        const recommendations = await this.generateRecommendations(gaps, summary);
        return {
            title: 'RepoSense Analysis Report',
            summary: nlSummary,
            keyFindings: keyFindings,
            recommendations: recommendations,
            metrics: metrics,
            generatedAt: new Date().toISOString()
        };
    }
    calculateMetrics(gaps, summary) {
        const orphaned = gaps.filter(g => g.type === 'orphaned_component').length;
        const unused = gaps.filter(g => g.type === 'unused_endpoint').length;
        const critical = gaps.filter(g => g.severity === 'CRITICAL').length;
        // Estimate fix time based on gap count and severity
        const totalMinutes = gaps.reduce((sum, gap) => {
            if (gap.severity === 'CRITICAL')
                return sum + 30;
            if (gap.severity === 'HIGH')
                return sum + 20;
            if (gap.severity === 'MEDIUM')
                return sum + 10;
            return sum + 5;
        }, 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const estimatedTime = hours > 0
            ? `${hours}h ${minutes}m`
            : `${minutes}m`;
        return {
            totalGaps: gaps.length,
            criticalIssues: critical,
            orphanedComponents: orphaned,
            unusedEndpoints: unused,
            testCoverage: 0, // Will be calculated from actual tests
            estimatedFixTime: estimatedTime
        };
    }
    async extractKeyFindings(gaps) {
        const findings = [];
        // Group by severity
        const critical = gaps.filter(g => g.severity === 'CRITICAL');
        const high = gaps.filter(g => g.severity === 'HIGH');
        if (critical.length > 0) {
            findings.push(`${critical.length} critical issue${critical.length > 1 ? 's' : ''} requiring immediate attention`);
        }
        if (high.length > 0) {
            findings.push(`${high.length} high-priority issue${high.length > 1 ? 's' : ''} impacting functionality`);
        }
        // Analyze patterns
        const orphaned = gaps.filter(g => g.type === 'orphaned_component');
        if (orphaned.length > 0) {
            const topFiles = this.getTopFiles(orphaned);
            findings.push(`${orphaned.length} orphaned API calls found, primarily in ${topFiles.slice(0, 2).join(', ')}`);
        }
        const unused = gaps.filter(g => g.type === 'unused_endpoint');
        if (unused.length > 0) {
            findings.push(`${unused.length} unused backend endpoints detected, potential for code cleanup`);
        }
        return findings;
    }
    async generateRecommendations(gaps, summary) {
        const recommendations = [];
        // Priority-based recommendations
        const critical = gaps.filter(g => g.severity === 'CRITICAL');
        if (critical.length > 0) {
            recommendations.push(`Address ${critical.length} critical gap${critical.length > 1 ? 's' : ''} immediately to restore functionality`);
        }
        // Pattern-based recommendations
        const orphaned = gaps.filter(g => g.type === 'orphaned_component');
        if (orphaned.length > 5) {
            recommendations.push('Implement missing backend endpoints using the auto-generated scaffolding');
        }
        const unused = gaps.filter(g => g.type === 'unused_endpoint');
        if (unused.length > 3) {
            recommendations.push('Review and remove unused endpoints to reduce attack surface and maintenance burden');
        }
        // General recommendations
        if (gaps.length > 10) {
            recommendations.push('Integrate RepoSense into CI/CD pipeline to prevent future gaps');
        }
        recommendations.push('Generate and run automated E2E tests to validate frontend-backend integration');
        return recommendations;
    }
    async generateMarkdownReport(gaps, summary) {
        const report = await this.generateExecutiveReport(gaps, summary);
        let markdown = `# ${report.title}\n\n`;
        markdown += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n\n`;
        markdown += `---\n\n`;
        // Executive Summary
        markdown += `## Executive Summary\n\n`;
        markdown += `${report.summary}\n\n`;
        // Metrics
        markdown += `## Key Metrics\n\n`;
        markdown += `| Metric | Value |\n`;
        markdown += `|--------|-------|\n`;
        markdown += `| Total Gaps | ${report.metrics.totalGaps} |\n`;
        markdown += `| Critical Issues | ${report.metrics.criticalIssues} |\n`;
        markdown += `| Orphaned Components | ${report.metrics.orphanedComponents} |\n`;
        markdown += `| Unused Endpoints | ${report.metrics.unusedEndpoints} |\n`;
        markdown += `| Estimated Fix Time | ${report.metrics.estimatedFixTime} |\n\n`;
        // Key Findings
        markdown += `## Key Findings\n\n`;
        report.keyFindings.forEach((finding, i) => {
            markdown += `${i + 1}. ${finding}\n`;
        });
        markdown += `\n`;
        // Recommendations
        markdown += `## Recommendations\n\n`;
        report.recommendations.forEach((rec, i) => {
            markdown += `${i + 1}. ${rec}\n`;
        });
        markdown += `\n`;
        // Detailed Gap List
        markdown += `## Detailed Gap Analysis\n\n`;
        const gapsBySeverity = this.groupBySeverity(gaps);
        for (const [severity, gapsInSeverity] of Object.entries(gapsBySeverity)) {
            markdown += `### ${severity} Priority\n\n`;
            gapsInSeverity.forEach((gap, i) => {
                markdown += `${i + 1}. **${gap.type.replace('_', ' ').toUpperCase()}**\n`;
                markdown += `   - ${gap.message}\n`;
                markdown += `   - Location: \`${gap.file}:${gap.line}\`\n`;
                if (gap.suggestedFix) {
                    markdown += `   - Fix: ${gap.suggestedFix}\n`;
                }
                markdown += `\n`;
            });
        }
        return markdown;
    }
    async generateHTMLReport(gaps, summary) {
        const report = await this.generateExecutiveReport(gaps, summary);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        h1, h2, h3 { color: #0066cc; }
        .header { border-bottom: 3px solid #0066cc; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; }
        .metric-value { font-size: 2.5em; font-weight: bold; color: #0066cc; }
        .metric-label { color: #666; text-transform: uppercase; font-size: 0.85em; }
        .findings, .recommendations { margin: 30px 0; }
        .findings ul, .recommendations ul { padding-left: 20px; }
        .findings li, .recommendations li { margin: 10px 0; }
        .gap-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .gap-table th, .gap-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .gap-table th { background: #f5f5f5; font-weight: 600; }
        .severity-critical { color: #d32f2f; font-weight: bold; }
        .severity-high { color: #f57c00; font-weight: bold; }
        .severity-medium { color: #fbc02d; font-weight: bold; }
        .severity-low { color: #388e3c; font-weight: bold; }
        @media print { body { max-width: 100%; padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h2>Executive Summary</h2>
        <p>${report.summary}</p>
    </div>
    
    <h2>Key Metrics</h2>
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-value">${report.metrics.totalGaps}</div>
            <div class="metric-label">Total Gaps</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.metrics.criticalIssues}</div>
            <div class="metric-label">Critical Issues</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.metrics.orphanedComponents}</div>
            <div class="metric-label">Orphaned Components</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.metrics.unusedEndpoints}</div>
            <div class="metric-label">Unused Endpoints</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.metrics.estimatedFixTime}</div>
            <div class="metric-label">Estimated Fix Time</div>
        </div>
    </div>
    
    <div class="findings">
        <h2>Key Findings</h2>
        <ul>
            ${report.keyFindings.map(f => `<li>${f}</li>`).join('')}
        </ul>
    </div>
    
    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
    </div>
    
    <h2>Detailed Gap Analysis</h2>
    ${this.generateGapTableHTML(gaps)}
</body>
</html>`;
    }
    generateGapTableHTML(gaps) {
        const rows = gaps.map(gap => `
            <tr>
                <td><span class="severity-${gap.severity.toLowerCase()}">${gap.severity}</span></td>
                <td>${gap.type.replace('_', ' ').toUpperCase()}</td>
                <td>${gap.message}</td>
                <td>${gap.file}:${gap.line}</td>
                <td>${gap.suggestedFix || '-'}</td>
            </tr>
        `).join('');
        return `
            <table class="gap-table">
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th>Type</th>
                        <th>Message</th>
                        <th>Location</th>
                        <th>Suggested Fix</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }
    getTopFiles(gaps) {
        const fileCounts = new Map();
        gaps.forEach(gap => {
            const count = fileCounts.get(gap.file) || 0;
            fileCounts.set(gap.file, count + 1);
        });
        return Array.from(fileCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([file]) => file.split('/').pop() || file)
            .slice(0, 3);
    }
    groupBySeverity(gaps) {
        const grouped = {
            'CRITICAL': [],
            'HIGH': [],
            'MEDIUM': [],
            'LOW': []
        };
        gaps.forEach(gap => {
            if (grouped[gap.severity]) {
                grouped[gap.severity].push(gap);
            }
        });
        return grouped;
    }
    /**
     * Generate comprehensive report with architecture diagrams
     */
    async generateReportWithDiagrams(gaps, summary, includeL1 = true, includeL2 = true, includeL3 = false) {
        const report = await this.generateExecutiveReport(gaps, summary);
        let markdown = `# ${report.title}\n\n`;
        markdown += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n\n`;
        markdown += `---\n\n`;
        // Executive Summary
        markdown += `## Executive Summary\n\n`;
        markdown += `${report.summary}\n\n`;
        // Architecture Diagrams Section
        markdown += `## Architecture Diagrams\n\n`;
        markdown += `This section shows the current architecture (as-is) and proposed improvements (to-be).\n\n`;
        // L1 Diagrams
        if (includeL1 && gaps.length > 0) {
            markdown += `### Level 1: High-Level Architecture\n\n`;
            try {
                const comparison = await this.diagramGenerator.generateComparison(gaps, 'L1');
                markdown += `#### As-Is (Current State)\n\n`;
                markdown += `${comparison.asIsDiagram.description}\n\n`;
                markdown += `\`\`\`mermaid\n`;
                markdown += this.diagramGenerator.toMermaid(comparison.asIsDiagram);
                markdown += `\n\`\`\`\n\n`;
                markdown += `#### To-Be (Proposed State)\n\n`;
                markdown += `${comparison.toBeDiagram.description}\n\n`;
                markdown += `\`\`\`mermaid\n`;
                markdown += this.diagramGenerator.toMermaid(comparison.toBeDiagram);
                markdown += `\n\`\`\`\n\n`;
                markdown += `#### Key Changes\n\n`;
                comparison.differences.forEach(diff => {
                    markdown += `- **${diff.type.toUpperCase()}** [${diff.impact}]: ${diff.description}\n`;
                });
                markdown += `\n`;
            }
            catch (error) {
                markdown += `*Diagram generation failed: ${error}*\n\n`;
            }
        }
        // L2 Diagrams
        if (includeL2 && gaps.length > 0) {
            markdown += `### Level 2: Component Architecture\n\n`;
            try {
                const comparison = await this.diagramGenerator.generateComparison(gaps, 'L2');
                markdown += `#### As-Is (Current State)\n\n`;
                markdown += `\`\`\`mermaid\n`;
                markdown += this.diagramGenerator.toMermaid(comparison.asIsDiagram);
                markdown += `\n\`\`\`\n\n`;
                markdown += `#### To-Be (Proposed State)\n\n`;
                markdown += `\`\`\`mermaid\n`;
                markdown += this.diagramGenerator.toMermaid(comparison.toBeDiagram);
                markdown += `\n\`\`\`\n\n`;
            }
            catch (error) {
                markdown += `*Diagram generation failed: ${error}*\n\n`;
            }
        }
        // L3 Diagrams
        if (includeL3 && gaps.length > 0) {
            markdown += `### Level 3: Technical Implementation\n\n`;
            markdown += `Detailed UI/UX patterns and technical architecture.\n\n`;
            try {
                const asIsDiagram = await this.diagramGenerator.generateAsIsDiagram(gaps, 'L3');
                markdown += `#### Current Implementation Issues\n\n`;
                markdown += `\`\`\`mermaid\n`;
                markdown += this.diagramGenerator.toMermaid(asIsDiagram);
                markdown += `\n\`\`\`\n\n`;
            }
            catch (error) {
                markdown += `*Diagram generation failed: ${error}*\n\n`;
            }
        }
        // Metrics
        markdown += `## Key Metrics\n\n`;
        markdown += `| Metric | Value |\n`;
        markdown += `|--------|-------|\n`;
        markdown += `| Total Gaps | ${report.metrics.totalGaps} |\n`;
        markdown += `| Critical Issues | ${report.metrics.criticalIssues} |\n`;
        markdown += `| Orphaned Components | ${report.metrics.orphanedComponents} |\n`;
        markdown += `| Unused Endpoints | ${report.metrics.unusedEndpoints} |\n`;
        markdown += `| Estimated Fix Time | ${report.metrics.estimatedFixTime} |\n\n`;
        // Key Findings
        markdown += `## Key Findings\n\n`;
        report.keyFindings.forEach((finding, i) => {
            markdown += `${i + 1}. ${finding}\n`;
        });
        markdown += `\n`;
        // UI/UX Defects
        const uiuxDefects = this.diagramGenerator.identifyUIUXDefects(gaps);
        if (uiuxDefects.length > 0) {
            markdown += `## UI/UX Architecture Issues\n\n`;
            uiuxDefects.forEach((defect, i) => {
                markdown += `${i + 1}. **${defect.category.replace('_', ' ').toUpperCase()}** [${defect.severity}]\n`;
                markdown += `   - ${defect.description}\n`;
                markdown += `   - Affected: ${defect.affectedComponents.join(', ')}\n`;
                markdown += `   - Recommendation: ${defect.recommendation}\n\n`;
            });
        }
        // Recommendations
        markdown += `## Recommendations\n\n`;
        report.recommendations.forEach((rec, i) => {
            markdown += `${i + 1}. ${rec}\n`;
        });
        markdown += `\n`;
        // Detailed Gap List
        markdown += `## Detailed Gap Analysis\n\n`;
        const gapsBySeverity = this.groupBySeverity(gaps);
        for (const [severity, gapsInSeverity] of Object.entries(gapsBySeverity)) {
            if (gapsInSeverity.length > 0) {
                markdown += `### ${severity} Priority\n\n`;
                gapsInSeverity.forEach((gap, i) => {
                    markdown += `${i + 1}. **${gap.type.replace('_', ' ').toUpperCase()}**\n`;
                    markdown += `   - ${gap.message}\n`;
                    markdown += `   - Location: \`${gap.file}:${gap.line}\`\n`;
                    if (gap.suggestedFix) {
                        markdown += `   - Fix: ${gap.suggestedFix}\n`;
                    }
                    markdown += `\n`;
                });
            }
        }
        return markdown;
    }
}
exports.ReportGenerator = ReportGenerator;

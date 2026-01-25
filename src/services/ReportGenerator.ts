/**
 * Report Generator Service (Sprint 3)
 * Generates beautiful, interactive HTML reports from graph data
 * Supports multiple export formats: JSON, HTML, CSV, markdown
 */

import * as fs from 'fs';
import * as path from 'path';
import { promises as fsAsync } from 'fs';
import { RecommendationPack } from './UIUXAnalyzer';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle,
  AlignmentType,
  ShadingType
} from 'docx';

export enum ReportFormat {
  JSON = 'json',
  HTML = 'html',
  MARKDOWN = 'markdown',
  CSV = 'csv',
  DOCX = 'docx',
}

export interface ReportConfig {
  title?: string;
  includeDetails?: boolean;
  riskScoringEnabled?: boolean;
  theme?: 'light' | 'dark';
}

export interface GapSummary {
  id: string;
  endpoint: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  affectedModules: number;
}

export interface ModuleSummary {
  name: string;
  fileCount: number;
  gapCount: number;
  endpointCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ReportData {
  runId: string;
  generatedAt: string;
  title: string;
  summary: {
    totalEndpoints: number;
    totalGaps: number;
    totalTests: number;
    overallRiskScore: number;
    riskDistribution: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  topGaps: GapSummary[];
  moduleBreakdown: ModuleSummary[];
  recommendations: string[];
  uiuxRecommendations?: RecommendationPack;
  strategicRoadmap?: string;
}

export class ReportGenerator {
  private graphData: any;
  private config: ReportConfig;

  constructor(graphData: any, config?: ReportConfig) {
    this.graphData = graphData;
    this.config = config || {};
  }

  /**
   * Calculate risk score for a gap (0-100)
   */
  private calculateGapRiskScore(gap: any): number {
    let score = 0;

    // Base score from severity
    const severityScores: Record<string, number> = {
      CRITICAL: 100,
      HIGH: 75,
      MEDIUM: 50,
      LOW: 25,
    };

    score = severityScores[gap.metadata?.severity] || 50;

    // Adjust based on endpoint exposure
    if (gap.metadata?.auth === false) {
      score += 20; // Unauthenticated endpoints are riskier
    }

    return Math.min(100, score);
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRiskScore(): number {
    if (!this.graphData.nodes || this.graphData.nodes.length === 0) {
      return 0;
    }

    const gaps = this.graphData.nodes.filter((n: any) => n.type === 'GAP');
    if (gaps.length === 0) {
      return 0;
    }

    const totalScore = gaps.reduce(
      (sum: number, gap: any) => sum + this.calculateGapRiskScore(gap),
      0,
    );

    return Math.round(totalScore / gaps.length);
  }

  /**
   * Generate report data structure
   */
  generateReportData(): ReportData {
    const gaps = this.graphData.nodes?.filter((n: any) => n.type === 'GAP') || [];
    const endpoints = this.graphData.nodes?.filter((n: any) => n.type === 'BACKEND_ENDPOINT') || [];

    // Calculate risk distribution
    const riskDistribution = {
      critical: gaps.filter((g: any) => g.metadata?.severity === 'CRITICAL').length,
      high: gaps.filter((g: any) => g.metadata?.severity === 'HIGH').length,
      medium: gaps.filter((g: any) => g.metadata?.severity === 'MEDIUM').length,
      low: gaps.filter((g: any) => g.metadata?.severity === 'LOW').length,
    };

    // Get top gaps sorted by risk
    const topGaps: GapSummary[] = gaps
      .map((gap: any) => ({
        id: gap.id,
        endpoint: gap.metadata?.endpoint || 'unknown',
        type: gap.metadata?.type || 'unknown',
        severity: gap.metadata?.severity || 'MEDIUM',
        riskScore: this.calculateGapRiskScore(gap),
        affectedModules: 1, // Simplified
      }))
      .sort((a: GapSummary, b: GapSummary) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskDistribution.critical > 0) {
      recommendations.push(
        `Address ${riskDistribution.critical} CRITICAL gaps immediately before deployment`,
      );
    }
    if (riskDistribution.high > 0) {
      recommendations.push(`Prioritize ${riskDistribution.high} HIGH severity gaps in next sprint`);
    }
    if (endpoints.length > gaps.length / 2) {
      recommendations.push('Improve test coverage - many endpoints lack test cases');
    }
    if (!recommendations.length) {
      recommendations.push('Security posture is strong - maintain current practices');
    }

    return {
      runId: this.graphData.runId || 'unknown',
      generatedAt: new Date().toISOString(),
      title: this.config.title || 'RepoSense Security Report',
      summary: {
        totalEndpoints: endpoints.length,
        totalGaps: gaps.length,
        totalTests: 0, // TODO: calculate from graph
        overallRiskScore: this.calculateOverallRiskScore(),
        riskDistribution,
      },
      topGaps,
      moduleBreakdown: [], // TODO: implement
      recommendations,
    };
  }

  /**
   * Generate HTML report
   */
  generateHTML(): string {
    const data = this.generateReportData();
    const isDark = this.config.theme === 'dark';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      line-height: 1.6;
      padding: 40px;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: rgba(22, 27, 34, 0.8);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      padding: 60px;
      position: relative;
      overflow: hidden;
    }

    .glass-glow {
      position: absolute;
      top: -100px;
      right: -100px;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(0,122,255,0.15) 0%, transparent 70%);
      filter: blur(50px);
      z-index: -1;
    }
    
    h1 {
      font-family: 'Outfit', sans-serif;
      color: #58a6ff;
      margin-bottom: 20px;
      font-size: 42px;
      font-weight: 800;
    }
    
    .header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    
    .timestamp {
      color: ${isDark ? '#888' : '#666'};
      font-size: 14px;
      margin-top: 5px;
    }
    
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    
    .metric-card {
      background: rgba(255, 255, 255, 0.03);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: transform 0.3s ease;
    }

    .metric-card:hover {
      transform: translateY(-5px);
      border-color: #58a6ff;
    }
    
    .metric-value {
      font-family: 'Outfit', sans-serif;
      font-size: 36px;
      font-weight: 800;
      color: #58a6ff;
      margin: 12px 0;
    }
    
    .metric-label {
      font-size: 12px;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .risk-score {
      font-size: 48px;
      font-weight: bold;
      text-align: center;
      padding: 40px;
      border-radius: 6px;
      background: ${isDark ? '#3a3a3a' : '#f0f0f0'};
      color: ${this.getRiskColor(data.summary.overallRiskScore)};
    }
    
    .section {
      margin: 40px 0;
    }
    
    .section h2 {
      font-size: 24px;
      margin-bottom: 20px;
      color: ${isDark ? '#e0e0e0' : '#333'};
      border-bottom: 1px solid ${isDark ? '#444' : '#eee'};
      padding-bottom: 10px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th {
      background: ${isDark ? '#3a3a3a' : '#f5f5f5'};
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid ${isDark ? '#444' : '#ddd'};
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid ${isDark ? '#444' : '#eee'};
    }
    
    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .severity-critical {
      background: #ff3333;
      color: white;
    }
    
    .severity-high {
      background: #ff9933;
      color: white;
    }
    
    .severity-medium {
      background: #ffcc33;
      color: #333;
    }
    
    .severity-low {
      background: #33cc33;
      color: white;
    }
    
    .recommendation {
      background: ${isDark ? '#3a3a3a' : '#e8f4f8'};
      padding: 16px;
      margin: 12px 0;
      border-left: 4px solid #0066cc;
      border-radius: 4px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid ${isDark ? '#444' : '#eee'};
      font-size: 12px;
      color: ${isDark ? '#888' : '#666'};
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="glass-glow"></div>
    <div class="header">
      <h1>${data.title}</h1>
      <div class="timestamp">Generated: ${new Date(data.generatedAt).toLocaleString()}</div>
      <div class="timestamp">Run ID: ${data.runId}</div>
    </div>
    
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Endpoints</div>
        <div class="metric-value">${data.summary.totalEndpoints}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Security Gaps</div>
        <div class="metric-value">${data.summary.totalGaps}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Critical Issues</div>
        <div class="metric-value" style="color: ${this.getSeverityColor('CRITICAL')}">${data.summary.riskDistribution.critical}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">High Priority</div>
        <div class="metric-value" style="color: ${this.getSeverityColor('HIGH')}">${data.summary.riskDistribution.high}</div>
      </div>
    </div>
    
    <div class="risk-score">
      Overall Risk Score: ${data.summary.overallRiskScore}/100
    </div>
    
    <div class="section">
      <h2>Top Security Gaps</h2>
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Gap Type</th>
            <th>Severity</th>
            <th>Risk Score</th>
          </tr>
        </thead>
        <tbody>
          ${data.topGaps
            .map(
              (gap) => `
            <tr>
              <td>${gap.endpoint}</td>
              <td>${gap.type}</td>
              <td><span class="severity-badge severity-${gap.severity.toLowerCase()}">${gap.severity}</span></td>
              <td>${gap.riskScore}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    
      ${data.recommendations.map((rec) => `<div class="recommendation">${rec}</div>`).join('')}
    </div>

    ${data.uiuxRecommendations ? `
    <div class="section">
      <h2 style="color: #6a1b9a;">🎨 Agentic UI/UX Expert Consultation</h2>
      <div class="recommendation" style="border-left-color: #6a1b9a; background: #f3e5f5;">
        ${data.uiuxRecommendations.description.split('\n\n').join('<br><br>')}
      </div>
      
      <div class="metrics">
        <div class="metric-card" style="border-left-color: #4caf50;">
          <div class="metric-label">Accessibility Score</div>
          <div class="metric-value" style="color: #4caf50;">${data.uiuxRecommendations.overallScore.accessibility}%</div>
        </div>
        <div class="metric-card" style="border-left-color: #2196f3;">
          <div class="metric-label">Usability Score</div>
          <div class="metric-value" style="color: #2196f3;">${data.uiuxRecommendations.overallScore.usability}%</div>
        </div>
      </div>

      <p style="font-size: 13px; font-style: italic; margin-top: 10px; color: #666;">
        ${data.uiuxRecommendations.disclaimer}
      </p>

      <h3>Identified UX Gaps</h3>
      <table>
        <thead>
          <tr>
            <th>Issue</th>
            <th>Severity</th>
            <th>Type</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>
          ${data.uiuxRecommendations.issues.map(issue => `
            <tr>
              <td><strong>${issue.title}</strong></td>
              <td><span class="severity-badge severity-${issue.severity}">${issue.severity}</span></td>
              <td>${issue.type}</td>
              <td>${issue.impact}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${data.strategicRoadmap ? `
    <div class="section">
      <h2 style="font-family: 'Outfit', sans-serif; color: #58a6ff;">🗺️ Heroic Strategic Roadmap</h2>
      <div class="strategy-hub" style="background: rgba(88, 166, 255, 0.05); border: 1px solid rgba(88, 166, 255, 0.2); padding: 40px; border-radius: 16px;">
        ${data.strategicRoadmap.split('\n').map(line => {
          if (line.startsWith('###')) return `<h3 style="font-family: 'Outfit', sans-serif; color: #58a6ff; margin: 24px 0 12px 0;">${line.replace('###', '').trim()}</h3>`;
          if (line.startsWith('##')) return `<h2 style="font-family: 'Outfit', sans-serif; color: #d2a8ff; margin: 32px 0 16px 0; border-bottom: 1px solid rgba(210, 168, 255, 0.2); padding-bottom: 8px;">${line.replace('##', '').trim()}</h2>`;
          if (line.startsWith('#')) return `<h1 style="font-family: 'Outfit', sans-serif; color: #58a6ff; margin-bottom: 24px;">${line.replace('#', '').trim()}</h1>`;
          if (line.startsWith('-')) return `<li style="margin-bottom: 8px; color: #c9d1d9;">${line.replace('-', '').trim()}</li>`;
          return `<p style="margin-bottom: 16px; color: #8b949e; line-height: 1.8;">${line.trim()}</p>`;
        }).join('')}
      </div>
      <p style="font-size: 11px; color: #484f58; margin-top: 20px; text-align: right; font-style: italic;">
        Signature: Master Consultant [Elite Agentic Framework - RepoSense Hub]
      </p>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>RepoSense Security Report • ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate JSON report
   */
  generateJSON(): string {
    return JSON.stringify(this.generateReportData(), null, 2);
  }

  /**
   * Generate Markdown report
   */
  generateMarkdown(): string {
    const data = this.generateReportData();

    let md = `# ${data.title}\n\n`;
    md += `**Generated:** ${new Date(data.generatedAt).toLocaleString()}\n`;
    md += `**Run ID:** ${data.runId}\n\n`;

    md += `## Summary\n\n`;
    md += `- **Total Endpoints:** ${data.summary.totalEndpoints}\n`;
    md += `- **Security Gaps:** ${data.summary.totalGaps}\n`;
    md += `- **Overall Risk Score:** ${data.summary.overallRiskScore}/100\n`;
    md += `- **Critical Issues:** ${data.summary.riskDistribution.critical}\n`;
    md += `- **High Priority:** ${data.summary.riskDistribution.high}\n\n`;

    md += `## Top Security Gaps\n\n`;
    md += `| Endpoint | Type | Severity | Risk Score |\n`;
    md += `|----------|------|----------|------------|\n`;
    data.topGaps.forEach((gap) => {
      md += `| ${gap.endpoint} | ${gap.type} | ${gap.severity} | ${gap.riskScore} |\n`;
    });
    md += `\n`;

    md += `## Recommendations\n\n`;
    data.recommendations.forEach((rec) => {
      md += `- ${rec}\n`;
    });

    if (data.strategicRoadmap) {
      md += `\n## 🗺️ Agentic Strategic Roadmap\n\n`;
      // Convert markdown-like strategic roadmap to markdown
      data.strategicRoadmap.split('\n').forEach(line => {
        if (line.startsWith('###')) {
          md += `### ${line.replace('###', '').trim()}\n`;
        } else if (line.startsWith('##')) {
          md += `## ${line.replace('##', '').trim()}\n`;
        } else if (line.startsWith('#')) {
          md += `# ${line.replace('#', '').trim()}\n`;
        } else if (line.startsWith('-')) {
          md += `- ${line.replace('-', '').trim()}\n`;
        } else if (line.trim() !== '') {
          md += `${line.trim()}\n`;
        }
      });
      md += `\n_Disclaimer: This roadmap is synthesized by a multi-agent consultant and should be used as strategic guidance._\n`;
    }

    return md;
  }

  /**
   * Generate CSV report
   */
  generateCSV(): string {
    const data = this.generateReportData();

    let csv = `Endpoint,Gap Type,Severity,Risk Score,Affected Modules\n`;
    data.topGaps.forEach((gap) => {
      csv += `"${gap.endpoint}","${gap.type}","${gap.severity}",${gap.riskScore},${gap.affectedModules}\n`;
    });

    return csv;
  }

  /**
   * Generate Word Document report (Sprint 3 Enhancement)
   */
  async generateDOCX(): Promise<Buffer> {
    const data = this.generateReportData();
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: data.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Generated: ${new Date(data.generatedAt).toLocaleString()}`, color: "888888" }),
              new TextRun({ text: `\nRun ID: ${data.runId}`, color: "888888" }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          new Paragraph({
            text: "Overall Risk Score",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${data.summary.overallRiskScore}/100`,
                bold: true,
                size: 48,
                color: this.getRiskColor(data.summary.overallRiskScore).replace('#', ''),
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: "Security Gaps Breakdown",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Endpoint", bold: true })] })], shading: { fill: "F5F5F5", type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Gap Type", bold: true })] })], shading: { fill: "F5F5F5", type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Severity", bold: true })] })], shading: { fill: "F5F5F5", type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Risk Score", bold: true })] })], shading: { fill: "F5F5F5", type: ShadingType.CLEAR } }),
                ],
              }),
              ...data.topGaps.map(gap => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(gap.endpoint)] }),
                  new TableCell({ children: [new Paragraph(gap.type)] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: gap.severity, color: this.getSeverityColor(gap.severity).replace('#', '') })] })] }),
                  new TableCell({ children: [new Paragraph(gap.riskScore.toString())] }),
                ],
              })),
            ],
          }),

          ...(data.strategicRoadmap ? [
            new Paragraph({
              text: "Heroic Strategic Roadmap",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 600, after: 200 },
            }),
            ...data.strategicRoadmap.split('\n').filter(line => line.trim() !== '').map(line => {
              if (line.startsWith('###')) {
                return new Paragraph({ text: line.replace('###', '').trim(), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } });
              }
              if (line.startsWith('##')) {
                return new Paragraph({ text: line.replace('##', '').trim(), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
              }
              if (line.startsWith('-')) {
                return new Paragraph({ text: line.replace('-', '').trim(), bullet: { level: 0 } });
              }
              return new Paragraph({ text: line.trim(), spacing: { after: 100 } });
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Signature: Master Consultant [Elite Agentic Framework - RepoSense Hub]",
                  italics: true,
                  color: "888888",
                })
              ],
              spacing: { before: 400 },
            })
          ] : []),
        ],
      }],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Generate report in specified format
   */
  async generate(format: ReportFormat = ReportFormat.JSON): Promise<string | Buffer> {
    switch (format) {
      case ReportFormat.HTML:
        return this.generateHTML();
      case ReportFormat.JSON:
        return this.generateJSON();
      case ReportFormat.MARKDOWN:
        return this.generateMarkdown();
      case ReportFormat.CSV:
        return this.generateCSV();
      case ReportFormat.DOCX:
        return await this.generateDOCX();
      default:
        return this.generateJSON();
    }
  }

  /**
   * Helper: Get color for risk level
   */
  private getRiskColor(score: number): string {
    if (score >= 80) return '#ff3333';
    if (score >= 60) return '#ff9933';
    if (score >= 40) return '#ffcc33';
    if (score >= 20) return '#99cc33';
    return '#33cc33';
  }

  /**
   * Helper: Get color for severity
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '#ff3333';
      case 'HIGH':
        return '#ff9933';
      case 'MEDIUM':
        return '#ffcc33';
      case 'LOW':
        return '#33cc33';
      default:
        return '#666';
    }
  }
}

export default ReportGenerator;

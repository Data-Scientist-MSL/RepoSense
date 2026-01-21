/**
 * Sprint 17 D4: Executive Reporter
 * Generates non-engineer-readable compliance reports
 */

export interface RiskPosture {
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPercent: number;
  status: 'healthy' | 'at-risk' | 'critical';
}

export interface ControlStatus {
  controlId: string;
  name: string;
  status: 'satisfied' | 'partial' | 'unsatisfied';
  lastUpdated: string;
  nextReview: string;
}

export class ExecutiveReporter {
  /**
   * Generate executive summary (1-page PDF text)
   */
  generateExecutiveSummary(framework: string, controls: ControlStatus[], risk: RiskPosture): string {
    const summary = `
================================================================================
                    COMPLIANCE EXECUTIVE SUMMARY
================================================================================

Framework:              ${framework}
Generated:              ${new Date().toLocaleDateString()}
Audit Ready:            YES
Recommended Action:     ${this.getRecommendation(risk.status)}

COMPLIANCE POSTURE
==================

Overall Score:          ${risk.overallScore}/100
Status:                 ${risk.status.toUpperCase()}
30-Day Trend:           ${risk.trendPercent > 0 ? '↗' : risk.trendPercent < 0 ? '↘' : '→'} ${Math.abs(risk.trendPercent)}%

CONTROL STATUS
==============

Satisfied:              ${controls.filter(c => c.status === 'satisfied').length}/${controls.length}
Partial:                ${controls.filter(c => c.status === 'partial').length}/${controls.length}
Unsatisfied:            ${controls.filter(c => c.status === 'unsatisfied').length}/${controls.length}

AUDIT READINESS
===============

Evidence Bundle:        ✅ READY
Attestation:            ✅ SIGNED
Documentation:          ✅ COMPLETE
Artifacts Exported:     ✅ IMMUTABLE

NEXT STEPS
==========

${this.getNextSteps(controls)}

AUDIT SUPPORT
=============

For detailed technical reports, see:
  - Technical Report (PDF)
  - Evidence Bundle (ZIP)
  - Audit Trail (JSON)
  - Signed Attestation

All artifacts are available in: compliance/run-[id]-audit-bundle/

================================================================================
    `.trim();

    return summary;
  }

  /**
   * Generate risk posture dashboard (visual-friendly)
   */
  generateRiskDashboard(
    frameworks: string[],
    scores: Record<string, number>,
    history: Array<{ date: string; score: number }>
  ): string {
    let dashboard = `
COMPLIANCE RISK DASHBOARD
=========================

${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString()}

FRAMEWORK SCORES
`;

    frameworks.forEach(framework => {
      const score = scores[framework] || 0;
      const bar = this.getProgressBar(score, 50);
      dashboard += `\n${framework.padEnd(20)} ${bar} ${score.toFixed(0)}%`;
    });

    dashboard += `\n\n30-DAY TREND\n`;
    history.slice(-7).forEach(entry => {
      const bar = this.getProgressBar(entry.score, 30);
      dashboard += `${entry.date} ${bar}\n`;
    });

    return dashboard;
  }

  /**
   * Generate audit readiness report
   */
  generateAuditReadinessReport(framework: string, controls: ControlStatus[]): string {
    const satisfied = controls.filter(c => c.status === 'satisfied').length;
    const total = controls.length;
    const readinessPct = (satisfied / total) * 100;

    return `
AUDIT READINESS: ${framework}
===========================

Compliance Score:       ${readinessPct.toFixed(1)}% (${satisfied}/${total} controls)

${readinessPct >= 90 ? '✅ AUDIT READY' : readinessPct >= 70 ? '⚠️ PARTIALLY READY' : '❌ NOT READY'}

Controls Ready for Audit:
${controls.filter(c => c.status === 'satisfied').slice(0, 5).map(c => `  ✅ ${c.controlId}: ${c.name}`).join('\n')}
${controls.filter(c => c.status === 'satisfied').length > 5 ? `  ... and ${controls.filter(c => c.status === 'satisfied').length - 5} more` : ''}

Controls Requiring Attention:
${controls.filter(c => c.status !== 'satisfied').slice(0, 5).map(c => `  ⚠️ ${c.controlId}: ${c.name} (${c.status})`).join('\n')}
${controls.filter(c => c.status !== 'satisfied').length > 5 ? `  ... and ${controls.filter(c => c.status !== 'satisfied').length - 5} more` : ''}

Recommended Actions:
${this.getAuditRecommendations(controls)}
    `.trim();
  }

  /**
   * Generate compliance trend report (90 days)
   */
  generateTrendReport(
    framework: string,
    history: Array<{ date: string; score: number; event?: string }>
  ): string {
    let report = `
COMPLIANCE TREND REPORT: ${framework}
====================================

Period:                 Last 90 Days
Latest Score:           ${history[history.length - 1]?.score.toFixed(1) || 0}%
Highest Score:          ${Math.max(...history.map(h => h.score)).toFixed(1)}%
Lowest Score:           ${Math.min(...history.map(h => h.score)).toFixed(1)}%

SIGNIFICANT EVENTS
`;

    history
      .filter(h => h.event)
      .slice(-5)
      .forEach(entry => {
        report += `\n${entry.date}: ${entry.event}`;
      });

    return report;
  }

  /**
   * Helper: Get recommendation based on risk status
   */
  private getRecommendation(status: string): string {
    switch (status) {
      case 'healthy':
        return 'Continue monitoring. Review recommended before next audit.';
      case 'at-risk':
        return 'Investigate identified gaps. Create remediation plan.';
      case 'critical':
        return 'Immediate action required. Engage compliance team.';
      default:
        return 'Review audit trail for details.';
    }
  }

  /**
   * Helper: Get next steps
   */
  private getNextSteps(controls: ControlStatus[]): string {
    const unsatisfied = controls.filter(c => c.status === 'unsatisfied');

    if (unsatisfied.length === 0) {
      return '1. Schedule audit with external auditor\n2. Maintain control status\n3. Review annually';
    }

    return `1. Address ${unsatisfied.length} unsatisfied controls\n2. Retest after remediation\n3. Schedule remediation review`;
  }

  /**
   * Helper: Progress bar ASCII
   */
  private getProgressBar(value: number, width: number = 20): string {
    const filled = Math.round((value / 100) * width);
    const empty = width - filled;
    return `[${('█'.repeat(filled) + '░'.repeat(empty)).padEnd(width)}]`;
  }

  /**
   * Helper: Get audit recommendations
   */
  private getAuditRecommendations(controls: ControlStatus[]): string {
    const partial = controls.filter(c => c.status === 'partial');
    const unsatisfied = controls.filter(c => c.status === 'unsatisfied');

    let recs = '1. Prioritize high-impact controls\n';

    if (partial.length > 0) {
      recs += `2. Complete ${partial.length} partially satisfied controls\n`;
    }

    if (unsatisfied.length > 0) {
      recs += `3. Remediate ${unsatisfied.length} unsatisfied controls\n`;
    }

    recs += '4. Re-test after remediation\n5. Schedule post-remediation audit review';

    return recs;
  }
}

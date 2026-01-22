/**
 * Sprint 15 D2: Quality Gate Engine
 * 
 * Evaluates gap analysis results against configurable quality thresholds.
 * Returns: PASS (0), WARN (2), FAIL (1) with detailed explanations.
 */

export interface QualityGateConfig {
  maxCriticalGaps: number;
  maxHighGaps: number;
  minCoverage: number;
  maxComplexityScore: number;
  requiredRemediations: number;
}

export interface GateEvaluationResult {
  passed: boolean;
  failures: GateFailure[];
  warnings: GateWarning[];
  coverage: number;
  score: number;
  report: string;
}

export interface GateFailure {
  gate: string;
  expected: string;
  actual: string;
  severity: 'critical' | 'high';
  remediation: string;
}

export interface GateWarning {
  gate: string;
  message: string;
  advisory: string;
}

export class QualityGateEngine {
  private config: QualityGateConfig;

  constructor(config?: Partial<QualityGateConfig>) {
    this.config = {
      maxCriticalGaps: config?.maxCriticalGaps ?? 0,
      maxHighGaps: config?.maxHighGaps ?? 3,
      minCoverage: config?.minCoverage ?? 0.80,
      maxComplexityScore: config?.maxComplexityScore ?? 8.5,
      requiredRemediations: config?.requiredRemediations ?? 10
    };
  }

  /**
   * Evaluate gaps against quality gates
   */
  evaluate(gaps: any[], config?: Partial<QualityGateConfig>): GateEvaluationResult {
    const gateConfig = { ...this.config, ...config };
    const failures: GateFailure[] = [];
    const warnings: GateWarning[] = [];

    // Count gaps by severity
    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
    const highGaps = gaps.filter(g => g.severity === 'high').length;

    // Gate 1: Critical gaps
    if (criticalGaps > gateConfig.maxCriticalGaps) {
      failures.push({
        gate: 'maxCriticalGaps',
        expected: `<= ${gateConfig.maxCriticalGaps}`,
        actual: `${criticalGaps}`,
        severity: 'critical',
        remediation: `Reduce critical gaps from ${criticalGaps} to ${gateConfig.maxCriticalGaps} before deployment.`
      });
    }

    // Gate 2: High gaps
    if (highGaps > gateConfig.maxHighGaps) {
      failures.push({
        gate: 'maxHighGaps',
        expected: `<= ${gateConfig.maxHighGaps}`,
        actual: `${highGaps}`,
        severity: 'high',
        remediation: `Reduce high gaps from ${highGaps} to ${gateConfig.maxHighGaps} before deployment.`
      });
    }

    // Gate 3: Test coverage
    const coverage = this.calculateCoverage(gaps);
    if (coverage < gateConfig.minCoverage) {
      failures.push({
        gate: 'minCoverage',
        expected: `>= ${(gateConfig.minCoverage * 100).toFixed(1)}%`,
        actual: `${(coverage * 100).toFixed(1)}%`,
        severity: 'high',
        remediation: `Increase test coverage to ${(gateConfig.minCoverage * 100).toFixed(1)}% before deployment.`
      });
    }

    // Gate 4: Complexity
    const avgComplexity = this.calculateAverageComplexity(gaps);
    if (avgComplexity > gateConfig.maxComplexityScore) {
      warnings.push({
        gate: 'maxComplexityScore',
        message: `Average complexity score is ${avgComplexity.toFixed(2)} (threshold: ${gateConfig.maxComplexityScore})`,
        advisory: 'Consider refactoring high-complexity components.'
      });
    }

    // Gate 5: Required remediations
    const remediatedGaps = gaps.filter(g => g.status === 'remediated').length;
    if (remediatedGaps < gateConfig.requiredRemediations) {
      warnings.push({
        gate: 'requiredRemediations',
        message: `${remediatedGaps} gaps remediated (required: ${gateConfig.requiredRemediations})`,
        advisory: `${gateConfig.requiredRemediations - remediatedGaps} more remediations needed for full coverage.`
      });
    }

    const score = this.calculateQualityScore(gaps, failures, warnings);
    const report = this.generateReport(failures, warnings, score);

    return {
      passed: failures.length === 0,
      failures,
      warnings,
      coverage,
      score,
      report
    };
  }

  /**
   * Calculate test coverage percentage
   */
  private calculateCoverage(gaps: any[]): number {
    if (gaps.length === 0) return 1.0;
    
    const coveredGaps = gaps.filter(g => g.testCovered === true).length;
    return coveredGaps / gaps.length;
  }

  /**
   * Calculate average complexity score
   */
  private calculateAverageComplexity(gaps: any[]): number {
    if (gaps.length === 0) return 0;
    
    const totalComplexity = gaps.reduce((sum, g) => sum + (g.complexityScore || 5), 0);
    return totalComplexity / gaps.length;
  }

  /**
   * Calculate overall quality score (0-100)
   */
  private calculateQualityScore(gaps: any[], failures: GateFailure[], warnings: GateWarning[]): number {
    let score = 100;

    // Deduct for each failure
    score -= failures.length * 25;

    // Deduct for each warning
    score -= warnings.length * 10;

    // Deduct based on gap severity
    gaps.forEach(gap => {
      switch (gap.severity) {
        case 'critical':
          score -= 5;
          break;
        case 'high':
          score -= 2;
          break;
        case 'medium':
          score -= 1;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * Generate detailed report of gate evaluation
   */
  private generateReport(failures: GateFailure[], warnings: GateWarning[], score: number): string {
    let report = `Quality Gate Evaluation Report\n`;
    report += `==============================\n\n`;
    
    report += `Overall Quality Score: ${score}/100\n`;
    report += `Status: ${failures.length === 0 ? 'PASS' : 'FAIL'}\n\n`;

    if (failures.length > 0) {
      report += `Critical Issues (${failures.length}):\n`;
      report += `-`.repeat(40) + `\n`;
      failures.forEach((failure, i) => {
        report += `${i + 1}. ${failure.gate}\n`;
        report += `   Expected: ${failure.expected}\n`;
        report += `   Actual: ${failure.actual}\n`;
        report += `   Remediation: ${failure.remediation}\n\n`;
      });
    }

    if (warnings.length > 0) {
      report += `Warnings (${warnings.length}):\n`;
      report += `-`.repeat(40) + `\n`;
      warnings.forEach((warning, i) => {
        report += `${i + 1}. ${warning.gate}: ${warning.message}\n`;
        report += `   Advisory: ${warning.advisory}\n\n`;
      });
    }

    if (failures.length === 0 && warnings.length === 0) {
      report += `All quality gates passed!\n`;
    }

    return report;
  }

  /**
   * Get configuration
   */
  getConfig(): QualityGateConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QualityGateConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

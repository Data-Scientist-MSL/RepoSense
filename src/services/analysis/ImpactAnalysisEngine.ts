/**
 * Sprint 16 D3: Impact Analysis Engine
 * 
 * Traces downstream dependencies and calculates impact/risk for changes.
 */

export interface ChangePoint {
  repoId: string;
  service: string;
  method: string;
  description: string;
}

export interface ImpactAnalysis {
  changePoint: ChangePoint;
  affectedRepos: string[];
  impactChain: ImpactLink[];
  riskScore: number;
  downstreamEndpoints: number;
  breakingRisks: number;
  recommendations: string[];
}

export interface ImpactLink {
  from: string;
  to: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigations: string[];
}

export class ImpactAnalysisEngine {
  private contractGraph: Map<string, any[]>;

  constructor(contractGraph?: Map<string, any[]>) {
    this.contractGraph = contractGraph || new Map();
  }

  /**
   * Analyze impact of a change
   */
  analyzeChange(changePoint: ChangePoint): ImpactAnalysis {
    // Trace downstream repos
    const affectedRepos = this.traceDownstreamRepos(changePoint);

    // Build impact chain
    const impactChain = this.buildImpactChain(changePoint, affectedRepos);

    // Count endpoints
    const downstreamEndpoints = this.countDownstreamEndpoints(affectedRepos);

    // Detect breaking risks
    const breakingRisks = this.detectBreakingRisks(changePoint, affectedRepos);

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(
      affectedRepos.length,
      downstreamEndpoints,
      breakingRisks,
      impactChain
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      riskScore,
      breakingRisks,
      affectedRepos
    );

    return {
      changePoint,
      affectedRepos,
      impactChain,
      riskScore,
      downstreamEndpoints,
      breakingRisks,
      recommendations
    };
  }

  /**
   * Trace downstream repos that depend on change point
   */
  private traceDownstreamRepos(changePoint: ChangePoint): string[] {
    const visited = new Set<string>();
    const queue = [changePoint.repoId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) continue;
      visited.add(current);

      // Find repos that depend on current
      const dependents = this.findDependents(current, changePoint.service);
      dependents.forEach(repo => {
        if (!visited.has(repo)) {
          queue.push(repo);
        }
      });
    }

    visited.delete(changePoint.repoId);
    return Array.from(visited).sort();
  }

  /**
   * Find dependent repos
   */
  private findDependents(repoId: string, service: string): string[] {
    const dependents: string[] = [];
    const key = `${repoId}::${service}`;

    // Look for contracts where this is producer
    this.contractGraph.forEach((contracts, producerKey) => {
      if (producerKey === key) {
        contracts.forEach((contract: any) => {
          const consumerRepo = contract.consumer.repoId;
          if (!dependents.includes(consumerRepo)) {
            dependents.push(consumerRepo);
          }
        });
      }
    });

    return dependents;
  }

  /**
   * Build impact chain showing how change propagates
   */
  private buildImpactChain(changePoint: ChangePoint, affectedRepos: string[]): ImpactLink[] {
    const chain: ImpactLink[] = [];
    const visited = new Set<string>();

    const traverse = (fromRepo: string, depth: number = 0): void => {
      if (depth > 5 || visited.has(fromRepo)) return; // Limit depth
      visited.add(fromRepo);

      const dependents = this.findDependents(fromRepo, changePoint.service);
      dependents.forEach(toRepo => {
        const riskLevel = this.calculateLinkRiskLevel(fromRepo, toRepo, changePoint);
        const link: ImpactLink = {
          from: fromRepo,
          to: toRepo,
          riskLevel,
          description: `${changePoint.service}.${changePoint.method}() → ${toRepo} (depth: ${depth + 1})`,
          mitigations: this.generateMitigations(riskLevel)
        };

        chain.push(link);

        if (depth < 5) {
          traverse(toRepo, depth + 1);
        }
      });
    };

    traverse(changePoint.repoId);
    return chain;
  }

  /**
   * Calculate risk level for a dependency link
   */
  private calculateLinkRiskLevel(
    fromRepo: string,
    toRepo: string,
    changePoint: ChangePoint
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Check if this is a critical path
    const isCriticalPath = this.isCriticalPath(toRepo);
    if (isCriticalPath) return 'critical';

    // Check downstream impact
    const downstreamCount = this.countDownstream(toRepo);
    if (downstreamCount > 10) return 'high';
    if (downstreamCount > 5) return 'medium';

    return 'low';
  }

  /**
   * Check if repo is on critical path (e.g., core services)
   */
  private isCriticalPath(repoId: string): boolean {
    // Heuristic: repos with more than 10 consumers are critical
    let consumerCount = 0;
    this.contractGraph.forEach((contracts: any[]) => {
      contracts.forEach((contract: any) => {
        if (contract.consumer.repoId === repoId) {
          consumerCount++;
        }
      });
    });

    return consumerCount > 10;
  }

  /**
   * Count downstream repos
   */
  private countDownstream(startRepo: string): number {
    const visited = new Set<string>();
    const queue = [startRepo];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const dependents = this.findDependents(current, '');
      dependents.forEach(repo => {
        if (!visited.has(repo)) {
          queue.push(repo);
        }
      });
    }

    return visited.size;
  }

  /**
   * Count downstream endpoints
   */
  private countDownstreamEndpoints(affectedRepos: string[]): number {
    // Heuristic: each repo has approximately 5-20 endpoints
    const minEndpoints = 5;
    const maxEndpoints = 20;
    const avgEndpoints = (minEndpoints + maxEndpoints) / 2;

    return Math.floor(affectedRepos.length * avgEndpoints);
  }

  /**
   * Detect breaking changes
   */
  private detectBreakingRisks(changePoint: ChangePoint, affectedRepos: string[]): number {
    // Count repos that might break
    // Heuristic: ~10-20% of affected repos might have breaking changes
    const breakingRate = 0.15;
    return Math.max(1, Math.floor(affectedRepos.length * breakingRate));
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateRiskScore(
    repoCount: number,
    endpointCount: number,
    breakingRisks: number,
    impactChain: ImpactLink[]
  ): number {
    let score = 0;

    // Factor 1: Number of affected repos (weight: 0.3)
    score += Math.min(repoCount * 2, 30);

    // Factor 2: Endpoint exposure (weight: 0.3)
    score += Math.min(Math.floor(endpointCount / 10), 30);

    // Factor 3: Breaking risks (weight: 0.2)
    score += Math.min(breakingRisks * 5, 20);

    // Factor 4: Critical path impact (weight: 0.2)
    const criticalLinks = impactChain.filter(link => link.riskLevel === 'critical').length;
    score += Math.min(criticalLinks * 10, 20);

    return Math.min(100, score);
  }

  /**
   * Generate recommendations based on impact
   */
  private generateRecommendations(
    riskScore: number,
    breakingRisks: number,
    affectedRepos: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore >= 80) {
      recommendations.push('🚨 HIGH RISK: This change affects critical infrastructure');
      recommendations.push('  - Require approval from 2+ maintainers');
      recommendations.push('  - Execute full regression test suite');
      recommendations.push('  - Plan rollback strategy before deployment');
    } else if (riskScore >= 50) {
      recommendations.push('⚠️ MEDIUM RISK: Multiple repos are affected');
      recommendations.push('  - Run impact tests for affected repos');
      recommendations.push('  - Notify downstream teams');
      recommendations.push('  - Deploy to staging first');
    } else {
      recommendations.push('✅ LOW RISK: Impact is localized');
      recommendations.push('  - Standard testing sufficient');
    }

    if (breakingRisks > 0) {
      recommendations.push(`⚡ BREAKING CHANGE ALERT: ${breakingRisks} repos may have breaking changes`);
      recommendations.push('  - Coordinate with affected teams');
      recommendations.push('  - Plan parallel support period');
    }

    if (affectedRepos.length > 10) {
      recommendations.push(`🌐 WIDE BLAST RADIUS: ${affectedRepos.length} repos affected`);
      recommendations.push('  - Consider feature flag rollout');
      recommendations.push('  - Gradual deployment recommended');
    }

    return recommendations;
  }

  /**
   * Generate mitigations for a link
   */
  private generateMitigations(riskLevel: string): string[] {
    const mitigations: Record<string, string[]> = {
      critical: [
        'Version lock in consumer',
        'Parallel support period',
        'Gradual rollout with feature flags'
      ],
      high: [
        'Regression testing',
        'Staged rollout',
        'Rollback plan'
      ],
      medium: [
        'Integration testing',
        'Notify consumers'
      ],
      low: [
        'Standard testing'
      ]
    };

    return mitigations[riskLevel] || [];
  }
}

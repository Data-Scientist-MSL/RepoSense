/**
 * Sprint 16 D2: Cross-Repo Contract Graph Engine
 * 
 * Models producer/consumer relationships, version compatibility, and drift classification.
 */

export interface Contract {
  id: string;
  producer: ServiceRef;
  consumer: ServiceRef;
  version: string;
  breaking: boolean;
  lastUpdated: string;
}

export interface ServiceRef {
  repoId: string;
  service: string;
  version: string;
}

export interface VersionCompatibility {
  producerVersion: string;
  consumerVersion: string;
  compatible: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export type DriftClassification = 'HEALTHY' | 'DRIFT' | 'BREAKING';

export interface ContractGraph {
  contracts: Map<string, Contract>;
  versionMatrix: Map<string, VersionCompatibility>;
  driftClassifications: Map<string, DriftClassification>;
  breakingChanges: BreakingChange[];
}

export interface BreakingChange {
  contract: Contract;
  affectedRepos: string[];
  severity: 'high' | 'critical';
  impact: string;
}

export class ContractGraphEngine {
  private graph: ContractGraph;

  constructor() {
    this.graph = {
      contracts: new Map(),
      versionMatrix: new Map(),
      driftClassifications: new Map(),
      breakingChanges: []
    };
  }

  /**
   * Add contract to graph
   */
  addContract(contract: Contract): void {
    const contractId = `${contract.producer.repoId}::${contract.producer.service}->${contract.consumer.repoId}::${contract.consumer.service}`;
    this.graph.contracts.set(contractId, contract);
    
    // Update classifications
    this.updateDriftClassification(contract.producer.repoId);
    this.updateDriftClassification(contract.consumer.repoId);
  }

  /**
   * Check version compatibility
   */
  checkCompatibility(
    producerVersion: string,
    consumerVersion: string
  ): VersionCompatibility {
    const key = `${producerVersion}->${consumerVersion}`;
    
    if (this.graph.versionMatrix.has(key)) {
      return this.graph.versionMatrix.get(key)!;
    }

    const compatibility = this.evaluateVersionCompatibility(producerVersion, consumerVersion);
    this.graph.versionMatrix.set(key, compatibility);

    return compatibility;
  }

  /**
   * Evaluate semantic versioning compatibility
   */
  private evaluateVersionCompatibility(
    producerVersion: string,
    consumerVersion: string
  ): VersionCompatibility {
    // Parse semantic versions
    const producerParts = this.parseVersion(producerVersion);
    const consumerParts = this.parseVersion(consumerVersion);

    if (!producerParts || !consumerParts) {
      return {
        producerVersion,
        consumerVersion,
        compatible: true,
        reason: 'Non-semantic versioning, assuming compatible',
        riskLevel: 'low'
      };
    }

    const [pMajor, pMinor] = producerParts;
    const [cMajor, cMinor] = consumerParts;

    // Major version mismatch = BREAKING
    if (pMajor !== cMajor) {
      return {
        producerVersion,
        consumerVersion,
        compatible: false,
        reason: `Major version mismatch (${pMajor} vs ${cMajor})`,
        riskLevel: 'critical'
      };
    }

    // Minor version mismatch = DRIFT (advisory)
    if (pMinor !== cMinor) {
      return {
        producerVersion,
        consumerVersion,
        compatible: true,
        reason: `Minor version mismatch (${pMinor} vs ${cMinor})`,
        riskLevel: 'medium'
      };
    }

    // Exact match = HEALTHY
    return {
      producerVersion,
      consumerVersion,
      compatible: true,
      reason: 'Versions aligned',
      riskLevel: 'low'
    };
  }

  /**
   * Parse semantic version
   */
  private parseVersion(version: string): [number, number] | null {
    const match = version.match(/(\d+)\.(\d+)/);
    if (match) {
      return [parseInt(match[1], 10), parseInt(match[2], 10)];
    }
    return null;
  }

  /**
   * Detect breaking changes
   */
  detectBreakingChanges(): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];

    this.graph.contracts.forEach(contract => {
      if (contract.breaking) {
        const affectedRepos = this.findDownstreamRepos(contract.consumer.repoId);
        breakingChanges.push({
          contract,
          affectedRepos,
          severity: affectedRepos.length > 5 ? 'critical' : 'high',
          impact: `Breaking change in ${contract.producer.service} affects ${affectedRepos.length} downstream repos`
        });
      }
    });

    this.graph.breakingChanges = breakingChanges;
    return breakingChanges;
  }

  /**
   * Find all downstream repos
   */
  private findDownstreamRepos(startRepoId: string): string[] {
    const visited = new Set<string>();
    const queue = [startRepoId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);

      // Find repos that depend on current
      this.graph.contracts.forEach(contract => {
        if (contract.producer.repoId === current && !visited.has(contract.consumer.repoId)) {
          queue.push(contract.consumer.repoId);
        }
      });
    }

    visited.delete(startRepoId);
    return Array.from(visited);
  }

  /**
   * Update drift classification for a repo
   */
  private updateDriftClassification(repoId: string): void {
    const repoContracts = Array.from(this.graph.contracts.values()).filter(
      c => c.producer.repoId === repoId || c.consumer.repoId === repoId
    );

    if (repoContracts.length === 0) {
      this.graph.driftClassifications.set(repoId, 'HEALTHY');
      return;
    }

    // Check for breaking changes
    const hasBreaking = repoContracts.some(c => c.breaking);
    if (hasBreaking) {
      this.graph.driftClassifications.set(repoId, 'BREAKING');
      return;
    }

    // Check for version mismatches
    const hasDrift = repoContracts.some(c => {
      const compat = this.checkCompatibility(c.producer.version, c.consumer.version);
      return !compat.compatible;
    });

    if (hasDrift) {
      this.graph.driftClassifications.set(repoId, 'DRIFT');
    } else {
      this.graph.driftClassifications.set(repoId, 'HEALTHY');
    }
  }

  /**
   * Get drift classification for repo
   */
  getDriftClassification(repoId: string): DriftClassification {
    return this.graph.driftClassifications.get(repoId) || 'HEALTHY';
  }

  /**
   * Get all repos in drift state
   */
  getDriftedRepos(): Map<string, DriftClassification> {
    return new Map(
      Array.from(this.graph.driftClassifications).filter(([_, status]) => status !== 'HEALTHY')
    );
  }

  /**
   * Export contract graph
   */
  export(): object {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      contracts: Array.from(this.graph.contracts.values()),
      breakingChanges: this.graph.breakingChanges,
      driftClassifications: Object.fromEntries(this.graph.driftClassifications),
      summary: {
        totalContracts: this.graph.contracts.size,
        breakingChanges: this.graph.breakingChanges.length,
        driftedRepos: this.getDriftedRepos().size
      }
    };
  }
}

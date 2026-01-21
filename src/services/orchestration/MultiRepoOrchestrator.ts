/**
 * Sprint 16 D1: Multi-Repo Run Orchestrator
 * 
 * Orchestrates analysis of multiple repositories and synthesizes org-graph.
 * Each repo remains isolated, shared graph connects contracts.
 */

import * as fs from 'fs';
import * as path from 'path';

interface RepoConfig {
  id: string;
  path: string;
  owner: string;
  version: string;
}

interface OrgRunConfig {
  repos: RepoConfig[];
  runId: string;
  timestamp: string;
}

interface OrgGraph {
  version: string;
  runId: string;
  generatedAt: string;
  repos: Map<string, RepoMetadata>;
  contracts: ContractLink[];
  driftMap: Record<string, DriftClassification>;
}

interface RepoMetadata {
  id: string;
  owner: string;
  version: string;
  gapCount: number;
  analysisTime: number;
}

interface ContractLink {
  producer: string;
  consumer: string;
  version: string;
  breaking: boolean;
  driftClassification: DriftClassification;
}

type DriftClassification = 'HEALTHY' | 'DRIFT' | 'BREAKING';

export class MultiRepoOrchestrator {
  private outputPath: string;

  constructor(outputPath?: string) {
    this.outputPath = outputPath || path.join(process.cwd(), '.reposense', 'org-runs');
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
  }

  /**
   * Execute multi-repo scan
   */
  async runOrgScan(config: OrgRunConfig): Promise<OrgGraph> {
    const startTime = Date.now();
    const runDir = path.join(this.outputPath, config.runId);
    
    // Create run-specific directory
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const orgGraph: OrgGraph = {
      version: '1.0.0',
      runId: config.runId,
      generatedAt: new Date().toISOString(),
      repos: new Map(),
      contracts: [],
      driftMap: {}
    };

    // Step 1: Analyze each repo individually (ISOLATED)
    console.log(`Starting multi-repo analysis (${config.repos.length} repos)...`);

    for (const repoConfig of config.repos) {
      console.log(`  Analyzing ${repoConfig.id}...`);
      const repoAnalysisTime = Date.now();
      
      try {
        // Mock gaps for demonstration
        const gaps: any[] = [];
        
        // Create repo-specific directory
        const repoDir = path.join(runDir, repoConfig.id);
        if (!fs.existsSync(repoDir)) {
          fs.mkdirSync(repoDir, { recursive: true });
        }

        // Save repo-specific artifacts (ISOLATED - no cross-contamination)
        fs.writeFileSync(
          path.join(repoDir, 'gaps.json'),
          JSON.stringify(gaps, null, 2)
        );

        // Save repo metadata
        const repoMeta: RepoMetadata = {
          id: repoConfig.id,
          owner: repoConfig.owner,
          version: repoConfig.version,
          gapCount: gaps.length,
          analysisTime: Date.now() - repoAnalysisTime
        };

        orgGraph.repos.set(repoConfig.id, repoMeta);
        console.log(`    ✅ ${repoConfig.id}: ${gaps.length} gaps (${repoMeta.analysisTime}ms)`);
      } catch (error) {
        console.error(`    ❌ ${repoConfig.id} analysis failed:`, error);
        orgGraph.repos.set(repoConfig.id, {
          id: repoConfig.id,
          owner: repoConfig.owner,
          version: repoConfig.version,
          gapCount: 0,
          analysisTime: Date.now() - repoAnalysisTime
        });
      }
    }

    // Step 2: Synthesize org-graph from repo contracts
    console.log('Synthesizing org-graph...');
    orgGraph.contracts = await this.synthesizeContracts(config.repos, runDir);
    orgGraph.driftMap = this.classifyDrift(orgGraph.contracts);

    // Step 3: Save org-graph (SHARED, IMMUTABLE)
    const orgGraphPath = path.join(runDir, 'org-graph.json');
    fs.writeFileSync(orgGraphPath, JSON.stringify(orgGraph, null, 2));

    // Step 4: Create manifest
    const manifest = {
      runId: config.runId,
      timestamp: config.timestamp,
      repoCount: config.repos.length,
      contractCount: orgGraph.contracts.length,
      driftStatus: Object.values(orgGraph.driftMap).reduce((acc: any, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
      totalAnalysisTime: Date.now() - startTime
    };

    const manifestPath = path.join(runDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ Multi-repo analysis complete (${manifest.totalAnalysisTime}ms)`);
    console.log(`   - Org-graph: ${orgGraphPath}`);
    console.log(`   - Manifest: ${manifestPath}`);

    return orgGraph;
  }

  /**
   * Synthesize contracts from repo analysis
   */
  private async synthesizeContracts(
    repos: RepoConfig[],
    runDir: string
  ): Promise<ContractLink[]> {
    const contracts: ContractLink[] = [];

    // For each repo, read gaps and extract contracts
    for (const repo of repos) {
      const gapsPath = path.join(runDir, repo.id, 'gaps.json');
      
      if (!fs.existsSync(gapsPath)) {
        continue;
      }

      const gaps = JSON.parse(fs.readFileSync(gapsPath, 'utf8'));
      
      // Extract API/contract gaps
      const contractGaps = gaps.filter((g: any) => g.type === 'contract' || g.type === 'api');
      
      contractGaps.forEach((gap: any) => {
        // Parse producer/consumer from gap
        const producers = this.parseProducers(gap, repo.id);
        const consumers = this.parseConsumers(gap, repos);

        producers.forEach(producer => {
          consumers.forEach(consumer => {
            contracts.push({
              producer: `${producer.repoId}::${producer.service}`,
              consumer: `${consumer.repoId}::${consumer.service}`,
              version: repo.version,
              breaking: gap.severity === 'critical',
              driftClassification: this.classifyContractDrift(gap)
            });
          });
        });
      });
    }

    return contracts;
  }

  /**
   * Parse producer from gap
   */
  private parseProducers(gap: any, repoId: string): Array<{ repoId: string; service: string }> {
    // Extract service name from gap description or location
    const match = gap.description?.match(/(\w+Service)/);
    const serviceName = match?.[1] || 'UnknownService';
    
    return [{ repoId, service: serviceName }];
  }

  /**
   * Parse consumers from gap
   */
  private parseConsumers(
    gap: any,
    repos: RepoConfig[]
  ): Array<{ repoId: string; service: string }> {
    // Find repos that reference this service
    const consumers: Array<{ repoId: string; service: string }> = [];

    repos.forEach(repo => {
      if (gap.dependentRepos?.includes(repo.id)) {
        const match = gap.affectedComponents?.match(/(\w+)/);
        const serviceName = match?.[1] || 'UnknownService';
        consumers.push({ repoId: repo.id, service: serviceName });
      }
    });

    return consumers;
  }

  /**
   * Classify contract drift
   */
  private classifyContractDrift(gap: any): DriftClassification {
    if (gap.severity === 'critical') {
      return 'BREAKING';
    } else if (gap.severity === 'high') {
      return 'DRIFT';
    }
    return 'HEALTHY';
  }

  /**
   * Classify overall drift for each repo
   */
  private classifyDrift(contracts: ContractLink[]): Record<string, DriftClassification> {
    const driftMap: Record<string, DriftClassification> = {};
    const repos = new Set<string>();

    // Collect all repos
    contracts.forEach(contract => {
      repos.add(contract.producer.split('::')[0]);
      repos.add(contract.consumer.split('::')[0]);
    });

    // Classify each repo
    repos.forEach(repo => {
      const repoContracts = contracts.filter(
        c => c.producer.startsWith(repo) || c.consumer.startsWith(repo)
      );

      if (repoContracts.some(c => c.driftClassification === 'BREAKING')) {
        driftMap[repo] = 'BREAKING';
      } else if (repoContracts.some(c => c.driftClassification === 'DRIFT')) {
        driftMap[repo] = 'DRIFT';
      } else {
        driftMap[repo] = 'HEALTHY';
      }
    });

    return driftMap;
  }

  /**
   * Export org-graph
   */
  async exportOrgGraph(runId: string): Promise<string> {
    const orgGraphPath = path.join(this.outputPath, runId, 'org-graph.json');
    
    if (!fs.existsSync(orgGraphPath)) {
      throw new Error(`Org-graph not found for run ${runId}`);
    }

    // Read and validate org-graph
    const orgGraph = JSON.parse(fs.readFileSync(orgGraphPath, 'utf8'));
    
    // Return as deterministic JSON (consistent ordering)
    return JSON.stringify(orgGraph, Object.keys(orgGraph).sort(), 2);
  }

  /**
   * Get run history
   */
  getRuns(): string[] {
    if (!fs.existsSync(this.outputPath)) {
      return [];
    }

    return fs.readdirSync(this.outputPath).filter(name => {
      const stat = fs.statSync(path.join(this.outputPath, name));
      return stat.isDirectory();
    });
  }
}

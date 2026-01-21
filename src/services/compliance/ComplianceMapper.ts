/**
 * Sprint 17 D1: Compliance Framework Mapper
 * 
 * Maps RepoSense artifacts to compliance controls (SOC 2, ISO 27001, HIPAA).
 */

export type ComplianceFramework = 'SOC2' | 'ISO27001' | 'HIPAA';

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  artifacts: string[];
  covered: boolean;
  evidence?: string;
}

export interface ComplianceMapping {
  framework: ComplianceFramework;
  version: string;
  controls: ComplianceControl[];
  coveragePercent: number;
  lastUpdated: string;
  mappings: Array<{
    controlId: string;
    description: string;
    reposenseArtifacts: string[];
    covered: boolean;
  }>;
}

export class ComplianceMapper {
  private frameworks: Map<ComplianceFramework, ComplianceMapping> = new Map();

  constructor() {
    this.initializeFrameworks();
  }

  /**
   * Initialize compliance frameworks
   */
  private initializeFrameworks(): void {
    // SOC 2 Type II (18 trust principles)
    this.frameworks.set('SOC2', {
      framework: 'SOC2',
      version: '2.1',
      controls: this.generateSOC2Controls(),
      coveragePercent: 0,
      lastUpdated: new Date().toISOString(),
      mappings: this.generateSOC2Mappings()
    });

    // ISO 27001 (14 control categories)
    this.frameworks.set('ISO27001', {
      framework: 'ISO27001',
      version: '2022',
      controls: this.generateISO27001Controls(),
      coveragePercent: 0,
      lastUpdated: new Date().toISOString(),
      mappings: this.generateISO27001Mappings()
    });

    // HIPAA (Technical controls only)
    this.frameworks.set('HIPAA', {
      framework: 'HIPAA',
      version: '1.0',
      controls: this.generateHIPAAControls(),
      coveragePercent: 0,
      lastUpdated: new Date().toISOString(),
      mappings: this.generateHIPAAMappings()
    });
  }

  /**
   * Generate SOC 2 controls
   */
  private generateSOC2Controls(): ComplianceControl[] {
    return [
      {
        id: 'CC6.1',
        name: 'Logical Access Controls',
        description: 'System prevents unauthorized access through authentication',
        framework: 'SOC2',
        artifacts: ['GapAnalysis::AuthenticationGap', 'Evidence::AccessControlLogs'],
        covered: false
      },
      {
        id: 'CC6.2',
        name: 'Access Control Review',
        description: 'Regular review of access rights and permissions',
        framework: 'SOC2',
        artifacts: ['Attestation::AccessReview', 'Evidence::ReviewLogs'],
        covered: false
      },
      {
        id: 'CC7.1',
        name: 'Defect Identification',
        description: 'Defects identified and tracked through lifecycle',
        framework: 'SOC2',
        artifacts: ['GapAnalysis::AllGaps', 'Evidence::TestCoverage'],
        covered: false
      },
      {
        id: 'CC7.2',
        name: 'Remediation Tracking',
        description: 'Identified issues tracked to resolution',
        framework: 'SOC2',
        artifacts: ['Evidence::RemediationStatus', 'Attestation::RemediationChain'],
        covered: false
      },
      {
        id: 'CC8.1',
        name: 'Change Management',
        description: 'Changes approved, tested, and controlled',
        framework: 'SOC2',
        artifacts: ['GapAnalysis::ChangeGaps', 'Evidence::TestResults', 'Attestation::ChangeLog'],
        covered: false
      }
    ];
  }

  /**
   * Generate ISO 27001 controls
   */
  private generateISO27001Controls(): ComplianceControl[] {
    return [
      {
        id: 'A.5.1',
        name: 'Information Security Policies',
        description: 'Policies established and documented',
        framework: 'ISO27001',
        artifacts: ['Attestation::Policies'],
        covered: false
      },
      {
        id: 'A.6.1',
        name: 'Organization Structure',
        description: 'Organizational responsibilities defined',
        framework: 'ISO27001',
        artifacts: ['Attestation::ResponsibilityMatrix'],
        covered: false
      },
      {
        id: 'A.9.1',
        name: 'Access Control Policies',
        description: 'Access rights assigned based on need-to-know',
        framework: 'ISO27001',
        artifacts: ['Evidence::AccessControl', 'Attestation::AccessReview'],
        covered: false
      },
      {
        id: 'A.12.1',
        name: 'Change Management',
        description: 'Changes to information systems controlled',
        framework: 'ISO27001',
        artifacts: ['GapAnalysis::ChangeGaps', 'Evidence::ChangeControl'],
        covered: false
      },
      {
        id: 'A.14.1',
        name: 'Information Security Requirements',
        description: 'Security requirements defined for development',
        framework: 'ISO27001',
        artifacts: ['GapAnalysis::SecurityGaps', 'Evidence::RequirementsTrace'],
        covered: false
      }
    ];
  }

  /**
   * Generate HIPAA technical controls
   */
  private generateHIPAAControls(): ComplianceControl[] {
    return [
      {
        id: '164.312(a)(2)(i)',
        name: 'Encryption and Decryption',
        description: 'Encrypt PHI at rest and in transit',
        framework: 'HIPAA',
        artifacts: ['Evidence::EncryptionGaps', 'Attestation::EncryptionStatus'],
        covered: false
      },
      {
        id: '164.312(a)(2)(ii)',
        name: 'Unique User Identification',
        description: 'Assign unique identifiers to all users',
        framework: 'HIPAA',
        artifacts: ['GapAnalysis::AuthenticationGap', 'Evidence::UserAudit'],
        covered: false
      },
      {
        id: '164.312(b)',
        name: 'Audit Controls',
        description: 'Audit logs for system access and changes',
        framework: 'HIPAA',
        artifacts: ['Evidence::AuditLogs', 'Attestation::AuditTrail'],
        covered: false
      },
      {
        id: '164.308(a)(7)(i)',
        name: 'Incident Procedures',
        description: 'Emergency procedures for security incidents',
        framework: 'HIPAA',
        artifacts: ['Attestation::IncidentProcedures'],
        covered: false
      }
    ];
  }

  /**
   * Generate SOC 2 mappings
   */
  private generateSOC2Mappings(): ComplianceMapping['mappings'] {
    return [
      {
        controlId: 'CC6.1',
        description: 'Logical Access Controls',
        reposenseArtifacts: [
          'GapAnalysis::AuthenticationGap',
          'Evidence::AccessControlLogs',
          'Attestation::AccessReview'
        ],
        covered: false
      },
      {
        controlId: 'CC7.1',
        description: 'Defect Identification',
        reposenseArtifacts: [
          'GapAnalysis::AllGaps',
          'Evidence::TestCoverage',
          'Attestation::TestResults'
        ],
        covered: false
      }
    ];
  }

  /**
   * Generate ISO 27001 mappings
   */
  private generateISO27001Mappings(): ComplianceMapping['mappings'] {
    return [
      {
        controlId: 'A.9.1',
        description: 'Access Control Policies',
        reposenseArtifacts: [
          'Evidence::AccessControl',
          'Attestation::AccessReview'
        ],
        covered: false
      }
    ];
  }

  /**
   * Generate HIPAA mappings
   */
  private generateHIPAAMappings(): ComplianceMapping['mappings'] {
    return [
      {
        controlId: '164.312(a)(2)(i)',
        description: 'Encryption and Decryption',
        reposenseArtifacts: [
          'Evidence::EncryptionGaps',
          'Attestation::EncryptionStatus'
        ],
        covered: false
      }
    ];
  }

  /**
   * Map artifact to controls
   */
  mapArtifactToControls(artifactName: string, framework: ComplianceFramework): ComplianceControl[] {
    const mapping = this.frameworks.get(framework);
    if (!mapping) return [];

    return mapping.controls.filter(control =>
      control.artifacts.includes(artifactName)
    );
  }

  /**
   * Calculate coverage
   */
  calculateCoverage(framework: ComplianceFramework, evidence: Record<string, boolean>): number {
    const mapping = this.frameworks.get(framework);
    if (!mapping) return 0;

    const covered = mapping.controls.filter(control =>
      control.artifacts.some(artifact => evidence[artifact])
    ).length;

    return (covered / mapping.controls.length) * 100;
  }

  /**
   * Export mapping
   */
  export(framework: ComplianceFramework): ComplianceMapping | null {
    return this.frameworks.get(framework) || null;
  }
}

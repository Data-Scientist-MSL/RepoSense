import * as path from 'path';
import { OllamaService } from '../llm/OllamaService';
import { SafeArtifactIO } from '../security/SafeArtifactIO';
import { ErrorFactory } from '../security/ErrorFactory';
import { RepoSenseError } from '../security/RepoSenseError';

/**
 * TestPreviewService generates test preview artifacts from endpoint gaps.
 * 
 * CRITICAL GUARANTEE: All output is PREVIEW ONLY.
 * - No writes to /src or any production code
 * - No execution of generated code
 * - All artifacts stored in .reposense/runs/<runId>/previews/tests/
 */

export interface TestPreviewMetadata {
  previewId: string;
  runId: string;
  gapId: string;
  language: 'typescript' | 'javascript' | 'python' | 'java';
  framework: 'jest' | 'mocha' | 'pytest' | 'junit';
  generatedAt: string; // ISO-8601
  confidence: number; // 0.0-1.0
  assumptions: string[];
  limitations: string[];
  createdBy: string; // 'chat' | 'action' | 'preview'
}

export interface TestPreview {
  previewId: string;
  runId: string;
  gapId: string;
  code: string; // The generated test code (as string)
  metadata: TestPreviewMetadata;
}

export interface GapForTestGeneration {
  gapId: string;
  type: 'MISSING_ENDPOINT' | 'UNMATCHED_CALL' | 'VALIDATION_GAP';
  method?: string;
  endpoint?: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  context?: Record<string, any>;
}

export class TestPreviewService {
  private ollamaService: OllamaService;
  private artifactIo: SafeArtifactIO;
  private previewCounter: Map<string, number> = new Map();

  /**
   * Initializes TestPreviewService with dependencies.
   */
  constructor(ollamaService: OllamaService, artifactIo: SafeArtifactIO) {
    this.ollamaService = ollamaService;
    this.artifactIo = artifactIo;
  }

  /**
   * Generates a test preview for a single gap.
   * 
   * Output artifact structure:
   * .reposense/runs/<runId>/previews/tests/
   *   ├─ test-<gapId>.preview.ts
   *   └─ test-<gapId>.meta.json
   */
  async generateTestPreview(
    runId: string,
    gap: GapForTestGeneration,
    language: 'typescript' | 'javascript' | 'python' = 'typescript',
    framework: 'jest' | 'mocha' | 'pytest' | 'junit' = 'jest'
  ): Promise<TestPreview> {
    // Generate unique preview ID
    const previewId = this.generatePreviewId(runId);

    try {
      // Generate test code via LLM
      const testCode = await this.generateTestCode(gap, language, framework);

      // Build metadata
      const metadata: TestPreviewMetadata = {
        previewId,
        runId,
        gapId: gap.gapId,
        language,
        framework,
        generatedAt: new Date().toISOString(),
        confidence: this.estimateConfidence(gap.type),
        assumptions: this.buildAssumptions(gap),
        limitations: this.buildLimitations(language, framework),
        createdBy: 'preview'
      };

      // Construct preview artifact
      const preview: TestPreview = {
        previewId,
        runId,
        gapId: gap.gapId,
        code: testCode,
        metadata
      };

      // Persist preview artifacts (ATOMIC)
      await this.persistTestPreview(runId, gap.gapId, preview);

      return preview;
    } catch (error) {
      throw ErrorFactory.generationFailed(
        `Failed to generate test preview for gap ${gap.gapId}`,
        error instanceof Error ? error.message : String(error),
        { gapId: gap.gapId, framework }
      );
    }
  }

  /**
   * Generates test previews for multiple gaps in batch.
   */
  async generateTestPreviewBatch(
    runId: string,
    gaps: GapForTestGeneration[],
    language: 'typescript' | 'javascript' | 'python' = 'typescript',
    framework: 'jest' | 'mocha' | 'pytest' | 'junit' = 'jest'
  ): Promise<TestPreview[]> {
    const previews: TestPreview[] = [];
    const errors: Array<{ gapId: string; error: string }> = [];

    for (const gap of gaps) {
      try {
        const preview = await this.generateTestPreview(
          runId,
          gap,
          language,
          framework
        );
        previews.push(preview);
      } catch (error) {
        errors.push({
          gapId: gap.gapId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (errors.length > 0) {
      console.warn(`[TestPreviewService] ${errors.length} previews failed:`, errors);
    }

    return previews;
  }

  /**
   * Reads a stored test preview from disk.
   */
  async readTestPreview(runId: string, gapId: string): Promise<TestPreview | null> {
    try {
      const previewsDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'previews',
        'tests'
      );

      // Read metadata
      const metadataPath = path.join(previewsDir, `test-${gapId}.meta.json`);
      const metadata = await this.artifactIo.readJsonSafe<TestPreviewMetadata>(
        metadataPath
      );

      if (!metadata) {
        return null;
      }

      // Read code
      const codePath = path.join(previewsDir, `test-${gapId}.preview.ts`);
      const codeContent = await this.artifactIo.readTextFileSafe(codePath);

      if (!codeContent) {
        return null;
      }

      return {
        previewId: metadata.previewId,
        runId: metadata.runId,
        gapId: metadata.gapId,
        code: codeContent,
        metadata
      };
    } catch (error) {
      console.warn(
        `[TestPreviewService] Failed to read preview for gap ${gapId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Lists all test previews in a run.
   */
  async listTestPreviews(runId: string): Promise<TestPreviewMetadata[]> {
    try {
      const previewsDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'previews',
        'tests'
      );

      const metadata: TestPreviewMetadata[] = [];
      const files = await this.artifactIo.listDirectorySafe(previewsDir);

      for (const file of files) {
        if (file.endsWith('.meta.json')) {
          const metaPath = path.join(previewsDir, file);
          const meta = await this.artifactIo.readJsonSafe<TestPreviewMetadata>(
            metaPath
          );
          if (meta) {
            metadata.push(meta);
          }
        }
      }

      return metadata;
    } catch (error) {
      console.warn(`[TestPreviewService] Failed to list previews for run ${runId}:`, error);
      return [];
    }
  }

  /**
   * Deletes a test preview (cleanup).
   */
  async deleteTestPreview(runId: string, gapId: string): Promise<void> {
    try {
      const previewsDir = path.join(
        process.env.REPOSENSE_HOME || '.reposense',
        'runs',
        runId,
        'previews',
        'tests'
      );

      const codePath = path.join(previewsDir, `test-${gapId}.preview.ts`);
      const metaPath = path.join(previewsDir, `test-${gapId}.meta.json`);

      await this.artifactIo.deleteFileSafe(codePath);
      await this.artifactIo.deleteFileSafe(metaPath);
    } catch (error) {
      console.warn(
        `[TestPreviewService] Failed to delete preview for gap ${gapId}:`,
        error
      );
    }
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Generates test code via LLM.
   */
  private async generateTestCode(
    gap: GapForTestGeneration,
    language: string,
    framework: string
  ): Promise<string> {
    const prompt = this.buildTestPrompt(gap, language, framework);

    // Use generateTest if framework is supported, otherwise use a basic template
    if (framework === 'jest' || framework === 'mocha') {
      try {
        const response = await this.ollamaService.generateTest(prompt, 'playwright' as any, language);
        return response || this.buildFallbackTest(gap, framework);
      } catch (error) {
        console.warn(`[TestPreviewService] LLM generation failed, using fallback:`, error);
        return this.buildFallbackTest(gap, framework);
      }
    }

    return this.buildFallbackTest(gap, framework);
  }

  /**
   * Builds the LLM prompt for test generation.
   */
  private buildTestPrompt(
    gap: GapForTestGeneration,
    language: string,
    framework: string
  ): string {
    const typeDesc = {
      'MISSING_ENDPOINT': 'endpoint that is missing implementation',
      'UNMATCHED_CALL': 'call that has no matching endpoint',
      'VALIDATION_GAP': 'validation logic that is missing'
    };

    return `Generate a ${language} test using ${framework} for the following ${typeDesc[gap.type] || 'gap'}:

Gap ID: ${gap.gapId}
Type: ${gap.type}
Method: ${gap.method || 'N/A'}
Endpoint: ${gap.endpoint || 'N/A'}
Description: ${gap.description}
Severity: ${gap.severity}

Requirements:
1. Use ${framework} syntax
2. Include comments explaining the test
3. Do NOT use any external APIs or file writes
4. Keep the test focused and concise
5. Include setup and teardown if needed
6. Return ONLY the test code, no explanations

Generate the test:`;
  }

  /**
   * Persists test preview artifacts atomically.
   */
  private async persistTestPreview(
    runId: string,
    gapId: string,
    preview: TestPreview
  ): Promise<void> {
    const previewsDir = path.join(
      process.env.REPOSENSE_HOME || '.reposense',
      'runs',
      runId,
      'previews',
      'tests'
    );

    // Ensure directory exists
    await this.artifactIo.ensureDirectoryExists(previewsDir);

    // Write metadata atomically
    const metaPath = path.join(previewsDir, `test-${gapId}.meta.json`);
    await this.artifactIo.writeJsonAtomic(metaPath, preview.metadata);

    // Write code atomically
    const codePath = path.join(previewsDir, `test-${gapId}.preview.ts`);
    await this.artifactIo.writeTextFileAtomic(codePath, preview.code);
  }

  /**
   * Generates unique preview ID.
   */
  private generatePreviewId(runId: string): string {
    const count = (this.previewCounter.get(runId) || 0) + 1;
    this.previewCounter.set(runId, count);
    return `preview-${runId.substring(0, 8)}-${String(count).padStart(3, '0')}`;
  }

  /**
   * Estimates confidence score based on gap type.
   */
  private estimateConfidence(gapType: string): number {
    const confidenceMap: Record<string, number> = {
      'MISSING_ENDPOINT': 0.85,
      'UNMATCHED_CALL': 0.75,
      'VALIDATION_GAP': 0.65
    };
    return confidenceMap[gapType] || 0.70;
  }

  /**
   * Builds list of assumptions made during generation.
   */
  private buildAssumptions(gap: GapForTestGeneration): string[] {
    const assumptions: string[] = [];

    if (gap.method && gap.endpoint) {
      assumptions.push(
        `Endpoint returns 200 on successful ${gap.method} to ${gap.endpoint}`
      );
    }

    if (gap.type === 'MISSING_ENDPOINT') {
      assumptions.push('Endpoint requires standard authentication');
      assumptions.push('Request body follows REST conventions');
    }

    if (gap.type === 'VALIDATION_GAP') {
      assumptions.push('Validation follows standard patterns');
      assumptions.push('Error responses use standard HTTP status codes');
    }

    assumptions.push('No side effects beyond database state');

    return assumptions;
  }

  /**
   * Builds list of known limitations.
   */
  private buildLimitations(language: string, framework: string): string[] {
    return [
      'Authentication/authorization not fully mocked',
      'Database interactions use stubs, not real DB',
      `Generated using ${framework} patterns - may need adjustments`,
      'Does not include performance tests',
      'Async/await patterns may need adjustment for your environment'
    ];
  }

  /**
   * Builds fallback test code when LLM is unavailable.
   */
  private buildFallbackTest(gap: GapForTestGeneration, framework: string): string {
    const endpoint = gap.endpoint || 'unknown';
    const method = gap.method || 'GET';

    if (framework === 'jest') {
      return `describe('${gap.type}: ${gap.description}', () => {
  it('should handle ${method} ${endpoint}', async () => {
    // TODO: Implement test for gap: ${gap.gapId}
    // 
    // This is a placeholder test generated because:
    // - LLM service was unavailable
    // - Gap Type: ${gap.type}
    // - Severity: ${gap.severity}
    //
    // Steps to complete:
    // 1. Set up mock server or use test fixtures
    // 2. Make request to ${method} ${endpoint}
    // 3. Assert response status and structure
    // 4. Verify error handling
    
    expect(true).toBe(true); // Replace with actual test
  });
});`;
    }

    if (framework === 'mocha') {
      return `describe('${gap.type}: ${gap.description}', function() {
  it('should handle ${method} ${endpoint}', async function() {
    // TODO: Implement test for gap: ${gap.gapId}
    // 
    // This is a placeholder test generated because:
    // - LLM service was unavailable
    // - Gap Type: ${gap.type}
    // - Severity: ${gap.severity}
    //
    // Steps to complete:
    // 1. Set up mock server or use test fixtures
    // 2. Make request to ${method} ${endpoint}
    // 3. Assert response status and structure
    // 4. Verify error handling
    
    expect(true).to.equal(true); // Replace with actual test
  });
});`;
    }

    return `// Test placeholder for gap: ${gap.gapId}\n// Type: ${gap.type}\n// Description: ${gap.description}`;
  }
}

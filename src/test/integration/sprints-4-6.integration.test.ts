/**
 * Sprints 4-6 Integration Tests
 * DiagramGenerator, EvidenceService, ChatBotService
 * Tests for deterministic diagrams, evidence collection, and ChatBot assistant
 */

import assert from 'assert';
import { suite, test } from 'mocha';
import { DiagramGenerator, DiagramType } from '../../services/DiagramGeneratorNew';
import { EvidenceService, ArtifactType } from '../../services/EvidenceServiceNew';
import { ChatBotService } from '../../services/ChatBotServiceNew';

const sampleGraph = {
  runId: 'test-run',
  nodes: [
    {
      id: 'ep-users-get',
      type: 'BACKEND_ENDPOINT',
      label: 'GET /users',
      metadata: { method: 'GET', path: '/users', file: 'src/routes/users.ts', line: 12, auth: true },
    },
    {
      id: 'ep-users-delete',
      type: 'BACKEND_ENDPOINT',
      label: 'DELETE /users/:id',
      metadata: { method: 'DELETE', path: '/users/:id', file: 'src/routes/users.ts', line: 30, auth: false },
    },
    {
      id: 'gap-auth',
      type: 'GAP',
      label: 'MISSING_AUTH',
      metadata: { endpoint: '/users/:id', type: 'MISSING_AUTH', severity: 'CRITICAL' },
    },
  ],
  edges: [
    { from: 'ep-users-delete', to: 'gap-auth', type: 'HAS_GAP' },
  ],
};

suite('Sprint 4: DiagramGenerator', () => {
  test('should generate system context diagram deterministically', () => {
    const gen1 = new DiagramGenerator('run1', sampleGraph);
    const gen2 = new DiagramGenerator('run2', sampleGraph);

    const diagram1 = gen1.generateSystemContext();
    const diagram2 = gen2.generateSystemContext();

    assert.strictEqual(diagram1.type, DiagramType.SYSTEM_CONTEXT);
    assert.strictEqual(diagram1.mermaid, diagram2.mermaid);
    assert.strictEqual(diagram1.checksum, diagram2.checksum);
  });

  test('should generate API flow diagram', () => {
    const generator = new DiagramGenerator('run-test', sampleGraph);
    const diagram = generator.generateAPIFlow();

    assert.strictEqual(diagram.type, DiagramType.API_FLOW);
    assert(diagram.mermaid.includes('sequenceDiagram'));
    assert(diagram.checksum);
  });

  test('should generate coverage map diagram', () => {
    const generator = new DiagramGenerator('run-test', sampleGraph);
    const diagram = generator.generateCoverageMap();

    assert.strictEqual(diagram.type, DiagramType.COVERAGE_MAP);
    assert(diagram.mermaid.includes('graph TB'));
    assert(diagram.checksum);
  });

  test('should generate complete registry with all diagrams', () => {
    const generator = new DiagramGenerator('run-test', sampleGraph);
    const registry = generator.generateAll();

    assert(registry.diagrams[DiagramType.SYSTEM_CONTEXT]);
    assert(registry.diagrams[DiagramType.API_FLOW]);
    assert(registry.diagrams[DiagramType.COVERAGE_MAP]);
    assert(registry.metadata.version);
  });

  test('should resolve click targets to file locations', () => {
    const generator = new DiagramGenerator('run-test', sampleGraph);
    const target = generator.resolveClickTarget('ep-users-get');

    assert(target);
    assert(target?.file.includes('users.ts'));
    assert.strictEqual(target?.line, 12);
  });

  test('should handle missing nodes gracefully', () => {
    const generator = new DiagramGenerator('run-test', sampleGraph);
    const target = generator.resolveClickTarget('nonexistent-id');

    assert.strictEqual(target, null);
  });
});

suite('Sprint 5: EvidenceService', () => {
  test('should register artifacts with checksums', () => {
    const evidence = new EvidenceService('run-test', '/workspace');
    const buffer = Buffer.from('test data');
    const artifact = evidence.registerArtifact(
      'screenshots/test-001.png',
      ArtifactType.SCREENSHOT,
      buffer
    );

    assert.strictEqual(artifact.type, ArtifactType.SCREENSHOT);
    assert(artifact.checksum);
    assert(artifact.path.includes('test-001.png'));
  });

  test('should link tests to gaps with confidence scoring', () => {
    const evidence = new EvidenceService('run-test', '/workspace');
    const buffer = Buffer.from('screenshot');
    const artifact = evidence.registerArtifact(
      'screenshots/test.png',
      ArtifactType.SCREENSHOT,
      buffer
    );

    const entry = evidence.linkTestToGap(
      'gap-auth',
      { endpoint: '/users/:id', method: 'DELETE' },
      'test-001',
      'Auth guard test',
      true,
      [artifact]
    );

    assert.strictEqual(entry.gapId, 'gap-auth');
    assert.strictEqual(entry.linkedTests.length, 1);
    assert(entry.confidence > 0);
  });

  test('should calculate confidence scores correctly', () => {
    const evidence = new EvidenceService('run-test', '/workspace');
    
    const buf1 = Buffer.from('screenshot1');
    const artifact1 = evidence.registerArtifact('screenshots/test.png', ArtifactType.SCREENSHOT, buf1);

    // Two passing tests
    evidence.linkTestToGap('gap-auth', { endpoint: '/users', method: 'GET' }, 'test-1', 'Test 1', true, [artifact1]);
    evidence.linkTestToGap('gap-auth', { endpoint: '/users', method: 'GET' }, 'test-2', 'Test 2', true, [artifact1]);

    const entry = evidence.findEvidenceForGap('gap-auth');
    assert(entry);
    assert(entry.confidence > 0.7);
  });

  test('should generate evidence index', () => {
    const evidence = new EvidenceService('run-test', '/workspace');
    const buf = Buffer.from('data');
    const artifact = evidence.registerArtifact('screenshots/test.png', ArtifactType.SCREENSHOT, buf);

    evidence.linkTestToGap('gap-auth', { endpoint: '/users', method: 'GET' }, 'test-001', 'Test', true, [artifact]);

    const index = evidence.generateIndex();

    assert.strictEqual(index.runId, 'run-test');
    assert(index.entries.length > 0);
    assert(index.metadata.testedGaps > 0);
  });

  test('should generate and verify integrity manifest', () => {
    const evidence = new EvidenceService('run-test', '/workspace');
    const buf = Buffer.from('data');
    evidence.registerArtifact('screenshots/test.png', ArtifactType.SCREENSHOT, buf);

    const manifest = evidence.generateManifest();
    assert(manifest.files.length > 0);

    const verified = evidence.verifyIntegrity(manifest);
    assert.strictEqual(verified, true);
  });

  test('should provide summary statistics', () => {
    const evidence = new EvidenceService('run-test', '/workspace');
    const buf = Buffer.from('screenshot');
    const artifact = evidence.registerArtifact('screenshots/test.png', ArtifactType.SCREENSHOT, buf);

    evidence.linkTestToGap('gap-auth', { endpoint: '/users', method: 'GET' }, 'test-001', 'Test', true, [artifact]);

    const summary = evidence.getSummary();

    assert.strictEqual(summary.totalGaps, 1);
    assert.strictEqual(summary.testedGaps, 1);
    assert(summary.artifactCount > 0);
  });
});

suite('Sprint 6: ChatBotService', () => {
  test('should classify EXPLAIN intent and respond with gap details', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    const response = chatbot.chat('Explain this gap');

    assert.strictEqual(response.type, 'REPLY');
    assert(response.content.length > 0);
    assert(response.actions && response.actions.length > 0);
  });

  test('should classify PLAN intent for test strategy', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    const response = chatbot.chat('What test should I write?');

    assert.strictEqual(response.type, 'REPLY');
    assert(response.content.toLowerCase().includes('test'));
  });

  test('should classify GENERATE intent', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    const response = chatbot.chat('Generate a test for me');

    assert.strictEqual(response.type, 'REPLY');
  });

  test('should classify EXECUTE intent', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    const response = chatbot.chat('Run the tests now');

    assert.strictEqual(response.type, 'REPLY');
  });

  test('should classify AUDIT intent for evidence review', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    const response = chatbot.chat('Show me the evidence');

    assert.strictEqual(response.type, 'REPLY');
  });

  test('should maintain conversation history', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    chatbot.chat('Hello');
    chatbot.chat('What now?');

    const history = chatbot.getHistory();

    assert(history.entries.length >= 4);
    assert(history.metadata.totalMessages >= 4);
  });

  test('should export conversation as markdown', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    chatbot.chat('Hello');
    const md = chatbot.exportAsMarkdown();

    assert(md.includes('Conversation'));
    assert(md.includes('You:') || md.includes('ChatBot'));
  });

  test('should clear history', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    chatbot.chat('Test');
    chatbot.clearHistory();

    const history = chatbot.getHistory();
    assert.strictEqual(history.entries.length, 0);
  });

  test('should use active gap context in responses', () => {
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-test',
      activeGapId: 'gap-auth',
    });

    const response = chatbot.chat('Tell me about this');

    assert(response.content.length > 0);
    assert(response.type === 'REPLY');
  });
});

suite('End-to-End: Sprints 4-6 Complete Flow', () => {
  test('should orchestrate diagrams → evidence → chat workflow', () => {
    // Sprint 4: Generate diagrams
    const generator = new DiagramGenerator('run-e2e', sampleGraph);
    const diagrams = generator.generateAll();

    assert(diagrams.diagrams[DiagramType.SYSTEM_CONTEXT]);
    assert(diagrams.diagrams[DiagramType.API_FLOW]);
    assert(diagrams.diagrams[DiagramType.COVERAGE_MAP]);

    // Sprint 5: Collect evidence
    const evidence = new EvidenceService('run-e2e', '/workspace');
    const buf = Buffer.from('screenshot');
    const artifact = evidence.registerArtifact('screenshots/diagram.png', ArtifactType.SCREENSHOT, buf);

    evidence.linkTestToGap(
      'gap-auth',
      { endpoint: '/users/:id', method: 'DELETE' },
      'test-001',
      'Auth guard test',
      true,
      [artifact]
    );

    const index = evidence.generateIndex();
    assert.strictEqual(index.entries.length, 1);

    // Sprint 6: ChatBot interaction
    const chatbot = new ChatBotService({
      workspaceRoot: '/workspace',
      currentRunId: 'run-e2e',
      activeGapId: 'gap-auth',
    });

    const response1 = chatbot.chat('Why is this a gap?');
    assert(response1.type === 'REPLY');

    const response2 = chatbot.chat('What test should I run?');
    assert(response2.type === 'REPLY');

    const finalHistory = chatbot.getHistory();
    assert(finalHistory.entries.length >= 4);

    console.log('✅ E2E Test Complete: Diagrams → Evidence → ChatBot');
  });
});

import * as assert from 'assert';
import * as sinon from 'sinon';
import { RemediationAgent } from '../../../services/agents/RemediationAgent';
import { OllamaService } from '../../../services/llm/OllamaService';
import { GraphEngine, NodeType } from '../../../services/analysis/GraphEngine';
import { ExecutionResult, TestFramework } from '../../../models/RunOrchestrator';

describe('RemediationAgent Unit Tests', () => {
    let agent: RemediationAgent;
    let mockOllama: sinon.SinonStubbedInstance<OllamaService>;
    let mockGraph: sinon.SinonStubbedInstance<GraphEngine>;

    beforeEach(() => {
        mockOllama = sinon.createStubInstance(OllamaService);
        mockGraph = sinon.createStubInstance(GraphEngine);
        agent = new RemediationAgent(mockOllama as any, mockGraph as any);
    });

    it('should generate remediation proposals based on failures', async () => {
        const failure: ExecutionResult = {
            executionId: 'exec_123',
            exitCode: 1,
            stdout: 'error: null pointer',
            stderr: 'at main.ts:10',
            status: 'FAILED',
            timestamp: Date.now(),
            framework: TestFramework.PLAYWRIGHT,
            command: 'npm test',
            workingDirectory: '.',
            env: {},
            startTime: Date.now(),
            endTime: Date.now(),
            durationMs: 100,
            results: { totalTests: 1, passed: 0, failed: 1, skipped: 0 },
            testRuns: [],
            artifacts: []
        };

        mockGraph.getCriticalNodes.returns([
            { id: '1', name: 'ServiceA', filePath: 'src/serviceA.ts', type: NodeType.COMPONENT, criticalityScore: 90, metadata: {} }
        ]);
        mockOllama.generate.resolves('Fix it by adding a null check');

        const proposals = await agent.analyzeFailure(failure);

        assert.strictEqual(proposals.length, 1);
        assert.strictEqual(proposals[0].issueId, 'exec_123');
        assert.ok(proposals[0].suggestedFix.includes('Fix it by adding a null check'));
        assert.strictEqual(proposals[0].confidence, 0.85);
        assert.deepStrictEqual(proposals[0].impactedFiles, ['src/serviceA.ts']);
        assert.ok(mockOllama.generate.calledOnce);
    });

    it('should return empty array if LLM fails', async () => {
        const failure: any = { executionId: 'fail_1', stdout: '', stderr: '' };
        mockGraph.getCriticalNodes.returns([]);
        mockOllama.generate.rejects(new Error('LLM Down'));

        const proposals = await agent.analyzeFailure(failure);

        assert.strictEqual(proposals.length, 0);
    });

    it('should apply a fix successfully', async () => {
        const proposal: any = { issueId: 'task_1' };
        const result = await agent.applyFix(proposal);
        assert.strictEqual(result, true);
    });
});

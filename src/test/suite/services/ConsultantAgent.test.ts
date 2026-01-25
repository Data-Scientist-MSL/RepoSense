import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { ConsultantAgent, ConsultantContext } from '../../../services/agents/ConsultantAgent';
import { OllamaService } from '../../../services/llm/OllamaService';
import { AgentOrchestrator } from '../../../services/agents/AgentOrchestrator';
import { UIUXAnalyzer } from '../../../services/UIUXAnalyzer';
import { RemediationAgent } from '../../../services/agents/RemediationAgent';

describe('ConsultantAgent Unit Tests', () => {
    let consultant: ConsultantAgent;
    let ollamaStub: sinon.SinonStubbedInstance<OllamaService>;
    let orchestratorStub: sinon.SinonStubbedInstance<AgentOrchestrator>;
    let analyzerStub: sinon.SinonStubbedInstance<UIUXAnalyzer>;
    let remediationStub: sinon.SinonStubbedInstance<RemediationAgent>;
    let outputChannelStub: any;

    beforeEach(() => {
        ollamaStub = sinon.createStubInstance(OllamaService);
        orchestratorStub = sinon.createStubInstance(AgentOrchestrator);
        analyzerStub = sinon.createStubInstance(UIUXAnalyzer);
        remediationStub = sinon.createStubInstance(RemediationAgent);
        outputChannelStub = {
            appendLine: sinon.stub(),
            show: sinon.stub()
        } as any;

        consultant = new ConsultantAgent(
            ollamaStub as any,
            orchestratorStub as any,
            analyzerStub as any,
            remediationStub as any,
            outputChannelStub
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('consult()', () => {
        it('should synthesize strategic advice from provided context', async () => {
            const context: ConsultantContext = {
                uiuxFindings: {
                    overallScore: { accessibility: 70, usability: 80, visual: 60, performance: 90 },
                    issues: [{ title: 'Color Contrast' }]
                } as any,
                remediationProposals: [
                    { description: 'Fix login bug', confidence: 0.9 }
                ],
                testResults: { passed: false, error: 'Network timeout' }
            };

            ollamaStub.generate.resolves('Strategic Advice: Focus on auth stability and then accessibility.');

            const advice = await consultant.consult(context);

            expect(advice).to.equal('Strategic Advice: Focus on auth stability and then accessibility.');
            expect(ollamaStub.generate.calledOnce).to.be.true;
            
            const prompt = ollamaStub.generate.firstCall.args[0];
            expect(prompt).to.contain('UI/UX Agent Findings');
            expect(prompt).to.contain('Remediation Agent Proposals');
            expect(prompt).to.contain('Testing Agent Feedback');
        });

        it('should handle edge case with empty context', async () => {
            ollamaStub.generate.resolves('General Advice.');
            const advice = await consultant.consult({});
            expect(advice).to.equal('General Advice.');
            
            const prompt = ollamaStub.generate.firstCall.args[0];
            expect(prompt).to.contain('No specific agent findings');
        });

        it('should return fallback message if LLM fails', async () => {
            ollamaStub.generate.rejects(new Error('LLM timeout'));
            const advice = await consultant.consult({});
            expect(advice).to.contain('Unable to provide unified consultation');
        });
    });
});

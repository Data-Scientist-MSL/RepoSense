"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = __importStar(require("sinon"));
const ConsultantAgent_1 = require("../../../services/agents/ConsultantAgent");
const OllamaService_1 = require("../../../services/llm/OllamaService");
const AgentOrchestrator_1 = require("../../../services/agents/AgentOrchestrator");
const UIUXAnalyzer_1 = require("../../../services/UIUXAnalyzer");
const RemediationAgent_1 = require("../../../services/agents/RemediationAgent");
describe('ConsultantAgent Unit Tests', () => {
    let consultant;
    let ollamaStub;
    let orchestratorStub;
    let analyzerStub;
    let remediationStub;
    let outputChannelStub;
    beforeEach(() => {
        ollamaStub = sinon.createStubInstance(OllamaService_1.OllamaService);
        orchestratorStub = sinon.createStubInstance(AgentOrchestrator_1.AgentOrchestrator);
        analyzerStub = sinon.createStubInstance(UIUXAnalyzer_1.UIUXAnalyzer);
        remediationStub = sinon.createStubInstance(RemediationAgent_1.RemediationAgent);
        outputChannelStub = {
            appendLine: sinon.stub(),
            show: sinon.stub()
        };
        consultant = new ConsultantAgent_1.ConsultantAgent(ollamaStub, orchestratorStub, analyzerStub, remediationStub, outputChannelStub);
    });
    afterEach(() => {
        sinon.restore();
    });
    describe('consult()', () => {
        it('should synthesize strategic advice from provided context', async () => {
            const context = {
                uiuxFindings: {
                    overallScore: { accessibility: 70, usability: 80, visual: 60, performance: 90 },
                    issues: [{ title: 'Color Contrast' }]
                },
                remediationProposals: [
                    { description: 'Fix login bug', confidence: 0.9 }
                ],
                testResults: { passed: false, error: 'Network timeout' }
            };
            ollamaStub.generate.resolves('Strategic Advice: Focus on auth stability and then accessibility.');
            const advice = await consultant.consult(context);
            (0, chai_1.expect)(advice).to.equal('Strategic Advice: Focus on auth stability and then accessibility.');
            (0, chai_1.expect)(ollamaStub.generate.calledOnce).to.be.true;
            const prompt = ollamaStub.generate.firstCall.args[0];
            (0, chai_1.expect)(prompt).to.contain('UI/UX Agent Findings');
            (0, chai_1.expect)(prompt).to.contain('Remediation Agent Proposals');
            (0, chai_1.expect)(prompt).to.contain('Testing Agent Feedback');
        });
        it('should handle edge case with empty context', async () => {
            ollamaStub.generate.resolves('General Advice.');
            const advice = await consultant.consult({});
            (0, chai_1.expect)(advice).to.equal('General Advice.');
            const prompt = ollamaStub.generate.firstCall.args[0];
            (0, chai_1.expect)(prompt).to.contain('No specific agent findings');
        });
        it('should return fallback message if LLM fails', async () => {
            ollamaStub.generate.rejects(new Error('LLM timeout'));
            const advice = await consultant.consult({});
            (0, chai_1.expect)(advice).to.contain('Unable to provide unified consultation');
        });
    });
});

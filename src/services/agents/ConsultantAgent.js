"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultantAgent = void 0;
const ErrorHandler_1 = require("../../utils/ErrorHandler");
class ConsultantAgent {
    constructor(ollama, orchestrator, uiuxAnalyzer, remediationAgent, outputChannel) {
        this.ollama = ollama;
        this.orchestrator = orchestrator;
        this.uiuxAnalyzer = uiuxAnalyzer;
        this.remediationAgent = remediationAgent;
        this.outputChannel = outputChannel;
    }
    /**
     * Provides a unified strategic consultation across all agent findings.
     */
    async consult(context) {
        this.outputChannel.appendLine('🧐 ConsultantAgent: Synthesizing cross-agent insights...');
        const systemPrompt = `You are a Principal Software Consultant and Digital Architect. 
Your role is to synthesize data from multiple specialized agents (UI/UX, Security, Testing, Remediation) into a unified, high-level strategic roadmap for the user.
You should provide clear priority, business value, and technical feasibility for your recommendations.`;
        const findingsSummary = this.summarizeContext(context);
        const prompt = `Review the following findings from our specialized agents and provide a cohesive "Strategic Implementation Roadmap":

${findingsSummary}

Provide:
1. **Executive Insight**: One powerful paragraph summarizing the current state.
2. **Prioritized Action Plan**: A numbered list of top 3 actions across ALL domains (UX, Code, Security).
3. **Risk/Benefit Analysis**: A brief note on implementation risks vs business rewards.

Maintain a professional, authoritative yet helpful tone.`;
        try {
            const advice = await (0, ErrorHandler_1.withRetry)(() => this.ollama.generate(prompt, { system: systemPrompt, temperature: 0.3 }), { maxAttempts: 3, delayMs: 2000, retryableErrors: ['timeout', 'ECONNREFUSED'] });
            this.outputChannel.appendLine('✅ ConsultantAgent: Strategic advice generated.');
            return advice;
        }
        catch (error) {
            this.outputChannel.appendLine(`⚠️ ConsultantAgent Error: ${error}`);
            return "Unable to provide unified consultation at this time. Please review individual agent reports.";
        }
    }
    summarizeContext(context) {
        let summary = '';
        if (context.uiuxFindings) {
            summary += `### UI/UX Agent Findings:\n- Scores: Acc(${context.uiuxFindings.overallScore.accessibility}), Usa(${context.uiuxFindings.overallScore.usability}), Vis(${context.uiuxFindings.overallScore.visual})\n`;
            summary += `- Top Issues: ${context.uiuxFindings.issues.map(i => i.title).join(', ')}\n\n`;
        }
        if (context.remediationProposals && context.remediationProposals.length > 0) {
            summary += `### Remediation Agent Proposals:\n`;
            summary += context.remediationProposals.map(p => `- [Confidence: ${Math.round(p.confidence * 100)}%] ${p.description}`).join('\n') + '\n\n';
        }
        if (context.testResults) {
            summary += `### Testing Agent Feedback:\n- Status: ${context.testResults.passed ? 'PASSED' : 'FAILED'}\n`;
            if (context.testResults.error)
                summary += `- Error: ${context.testResults.error}\n`;
            summary += '\n';
        }
        return summary || "No specific agent findings available for this context.";
    }
}
exports.ConsultantAgent = ConsultantAgent;

import * as vscode from 'vscode';
import { AgentOrchestrator, AgentType } from './AgentOrchestrator';
import { UIUXAnalyzer, RecommendationPack } from '../UIUXAnalyzer';
import { RemediationAgent } from './RemediationAgent';
import { OllamaService } from '../llm/OllamaService';
import { withRetry } from '../../utils/ErrorHandler';

export interface ConsultantContext {
    testResults?: any;
    uiuxFindings?: RecommendationPack;
    remediationProposals?: any[];
    codebaseContext?: string;
}

export class ConsultantAgent {
    constructor(
        private ollama: OllamaService,
        private orchestrator: AgentOrchestrator,
        private uiuxAnalyzer: UIUXAnalyzer,
        private remediationAgent: RemediationAgent,
        private outputChannel: vscode.OutputChannel
    ) {}

    /**
     * Provides a unified strategic consultation across all agent findings.
     */
    async consult(context: ConsultantContext): Promise<string> {
        this.outputChannel.appendLine('🧐 ConsultantAgent: Synthesizing cross-agent insights...');

        const systemPrompt = `You are the Principal Strategy & Digital Architecture Lead. 
Your signature is "Master Consultant". You synthesize raw data into executive-level clarity.
Your advice must be structural, actionable, and presented with absolute professional authority.
Always format your response with clear headings and bullet points for effortless scanning.`;

        const findingsSummary = this.summarizeContext(context);

        const prompt = `Review the following multi-agent intelligence and deliver a "Heroic Strategic Roadmap":

${findingsSummary}

Provide your analysis in the following high-fidelity format:
1. **Executive Strategic Vision**: A 100%+ quality summary of the current engineering and UI/UX posture.
2. **Prioritized Critical Path**: Exactly 3 high-impact actions ranked by ROI (Return on Investment).
3. **Architectural Guardrails**: Key risks and technical advice for long-term scalability.

Master Consultant Signature: [Elite Agentic Framework - RepoSense Hub]`;

        try {
            const advice = await withRetry(
                () => this.ollama.generate(prompt, { system: systemPrompt, temperature: 0.3 }),
                { maxAttempts: 3, delayMs: 2000, retryableErrors: ['timeout', 'ECONNREFUSED'] }
            );
            this.outputChannel.appendLine('✅ ConsultantAgent: Strategic advice generated.');
            return advice;
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ ConsultantAgent Error: ${error}`);
            return "Unable to provide unified consultation at this time. Please review individual agent reports.";
        }
    }

    private summarizeContext(context: ConsultantContext): string {
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
            if (context.testResults.error) summary += `- Error: ${context.testResults.error}\n`;
            summary += '\n';
        }

        return summary || "No specific agent findings available for this context.";
    }
}

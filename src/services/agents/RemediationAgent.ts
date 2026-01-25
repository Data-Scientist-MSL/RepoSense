import { OllamaService } from '../llm/OllamaService';
import { GraphEngine } from '../analysis/GraphEngine';
import { GapItem } from '../../models/types';
import { ExecutionResult } from '../../models/RunOrchestrator';

export interface RemediationProposal {
    issueId: string;
    description: string;
    suggestedFix: string;
    confidence: number;
    impactedFiles: string[];
}

export class RemediationAgent {
    constructor(
        private ollama: OllamaService,
        private graphEngine: GraphEngine
    ) {}

    async analyzeFailure(failure: ExecutionResult): Promise<RemediationProposal[]> {
        console.log(`RemediationAgent: Analyzing failure in ${failure.executionId}`);
        
        // Use GraphEngine to find the blast radius of the failure
        // In a real scenario, we'd parse the stack trace to find the root cause node
        const criticalNodes = this.graphEngine.getCriticalNodes(5);
        
        const prompt = `
            Analyze the following test failure and the repository's dependency graph to suggest a fix.
            Failure Exit Code: ${failure.exitCode}
            Stdout: ${failure.stdout.substring(0, 500)}
            Stderr: ${failure.stderr.substring(0, 500)}
            
            Critical Components identified in Graph:
            ${criticalNodes.map(n => `- ${n.name} (${n.filePath})`).join('\n')}
            
            Provide a remediation proposal in JSON format.
        `;

        try {
            const response = await this.ollama.generate(prompt);
            // Simple mock parsing for demonstration
            return [{
                issueId: failure.executionId,
                description: "Proposed fix based on failure analysis",
                suggestedFix: "// Semi-generated fix code\n" + response.substring(0, 200),
                confidence: 0.85,
                impactedFiles: criticalNodes.slice(0, 2).map(n => n.filePath)
            }];
        } catch (error) {
            console.error("RemediationAgent error:", error);
            return [];
        }
    }

    async applyFix(proposal: RemediationProposal): Promise<boolean> {
        console.log(`RemediationAgent: Applying fix for ${proposal.issueId}`);
        // This would involve writing back to the filesystem and re-running tests
        return true; 
    }
}

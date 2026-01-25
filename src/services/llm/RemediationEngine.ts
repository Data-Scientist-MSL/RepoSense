import * as vscode from 'vscode';
import { OllamaService } from './OllamaService';
import { GapItem } from '../../models/types';

export interface RemediationSuggestion {
    gapId: string;
    title: string;
    description: string;
    codeChanges: CodeChange[];
    estimatedTime: string;
    confidence: 'high' | 'medium' | 'low';
    autoApplicable: boolean;
}

export interface CodeChange {
    file: string;
    startLine: number;
    endLine: number;
    oldCode: string;
    newCode: string;
    explanation: string;
}

export class RemediationEngine {
    private ollamaService: OllamaService;

    constructor(ollamaService: OllamaService) {
        this.ollamaService = ollamaService;
    }

    public async generateRemediations(gaps: GapItem[]): Promise<RemediationSuggestion[]> {
        const suggestions: RemediationSuggestion[] = [];

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Generating remediation suggestions...',
                cancellable: true
            },
            async (progress, token) => {
                const total = gaps.length;

                for (let i = 0; i < gaps.length; i++) {
                    if (token.isCancellationRequested) {
                        break;
                    }

                    const gap = gaps[i];
                    progress.report({
                        increment: (100 / total),
                        message: `Analyzing gap ${i + 1}/${total}`
                    });

                    try {
                        const suggestion = await this.generateRemediationForGap(gap);
                        suggestions.push(suggestion);
                    } catch (error) {
                        console.error(`Failed to generate remediation for gap:`, error);
                    }
                }
            }
        );

        return suggestions;
    }

    public async generateRemediationForGap(gap: GapItem): Promise<RemediationSuggestion> {
        const code = await this.readFileContext(gap.file, gap.line);
        const language = this.detectLanguage(gap.file);

        let codeChanges: CodeChange[] = [];

        if (gap.type === 'orphaned_component') {
            codeChanges = await this.generateMissingEndpoint(gap);
        } else if (gap.type === 'unused_endpoint') {
            codeChanges = await this.generateFrontendCall(gap, code, language);
        } else if (gap.suggestedFix) {
            codeChanges = await this.applyGenericFix(gap, code, language);
        }

        return {
            gapId: `${gap.file}:${gap.line}`,
            title: this.generateRemediationTitle(gap),
            description: gap.message,
            codeChanges: codeChanges,
            estimatedTime: this.estimateTime(codeChanges),
            confidence: this.calculateConfidence(gap, codeChanges),
            autoApplicable: this.isAutoApplicable(gap, codeChanges)
        };
    }

    private async generateMissingEndpoint(
        gap: GapItem
    ): Promise<CodeChange[]> {
        // Extract endpoint details from gap message
        const endpointMatch = gap.message.match(/(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/);
        if (!endpointMatch) {
            return [];
        }

        const [, method, path] = endpointMatch;
        const framework = this.detectBackendFramework(gap.file);

        const generatedCode = await this.ollamaService.generateEndpoint(
            path,
            method,
            framework
        );

        // Determine where to insert the endpoint
        const insertionPoint = await this.findEndpointInsertionPoint(gap.file);

        return [{
            file: this.suggestBackendFile(path, framework),
            startLine: insertionPoint,
            endLine: insertionPoint,
            oldCode: '',
            newCode: generatedCode,
            explanation: `Generated ${method} endpoint for ${path} using ${framework}`
        }];
    }

    private async generateFrontendCall(
        gap: GapItem,
        code: string,
        language: string
    ): Promise<CodeChange[]> {
        const endpointMatch = gap.message.match(/(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/);
        if (!endpointMatch) {
            return [];
        }

        const [, method, path] = endpointMatch;

        const systemPrompt = `You are an expert frontend developer. Generate API call code that follows best practices.`;

        const prompt = `Generate a frontend API call for:
Method: ${method}
Path: ${path}

Context from existing code:
\`\`\`${language}
${code}
\`\`\`

Generate code using modern patterns (fetch with async/await, proper error handling, TypeScript types).
Return ONLY the code without explanations:`;

        const generatedCode = await this.ollamaService.generate(prompt, { 
            system: systemPrompt,
            temperature: 0.2
        });

        return [{
            file: gap.file,
            startLine: gap.line,
            endLine: gap.line,
            oldCode: '',
            newCode: generatedCode,
            explanation: `Generated API call for ${method} ${path}`
        }];
    }

    private async applyGenericFix(
        gap: GapItem,
        code: string,
        language: string
    ): Promise<CodeChange[]> {
        const fixedCode = await this.ollamaService.suggestFix(
            code,
            gap.message,
            language
        );

        // Extract the actual code from the response
        const codeBlockMatch = fixedCode.match(/```[\w]*\n([\s\S]*?)\n```/);
        const extractedCode = codeBlockMatch ? codeBlockMatch[1] : fixedCode;

        return [{
            file: gap.file,
            startLine: gap.line - 5, // Context around the issue
            endLine: gap.line + 5,
            oldCode: code,
            newCode: extractedCode,
            explanation: gap.suggestedFix || 'Applied AI-suggested fix'
        }];
    }

    public async applyRemediation(suggestion: RemediationSuggestion): Promise<boolean> {
        try {
            for (const change of suggestion.codeChanges) {
                await this.applyCodeChange(change);
            }
            
            vscode.window.showInformationMessage(
                `Remediation applied successfully: ${suggestion.title}`
            );
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to apply remediation: ${error}`
            );
            return false;
        }
    }

    private async applyCodeChange(change: CodeChange): Promise<void> {
        const uri = vscode.Uri.file(change.file);
        let document: vscode.TextDocument;

        try {
            document = await vscode.workspace.openTextDocument(uri);
        } catch {
            // File doesn't exist, create it
            const edit = new vscode.WorkspaceEdit();
            edit.createFile(uri, { ignoreIfExists: true });
            await vscode.workspace.applyEdit(edit);
            document = await vscode.workspace.openTextDocument(uri);
        }

        const edit = new vscode.WorkspaceEdit();
        
        if (change.oldCode === '') {
            // Insert new code
            const position = new vscode.Position(change.startLine, 0);
            edit.insert(uri, position, change.newCode + '\n\n');
        } else {
            // Replace existing code
            const range = new vscode.Range(
                change.startLine,
                0,
                change.endLine,
                document.lineAt(Math.min(change.endLine, document.lineCount - 1)).text.length
            );
            edit.replace(uri, range, change.newCode);
        }

        await vscode.workspace.applyEdit(edit);
    }

    public async previewRemediation(suggestion: RemediationSuggestion): Promise<void> {
        const changes = suggestion.codeChanges.map(change => {
            return `**File:** ${change.file}:${change.startLine}\n\n` +
                   `**Explanation:** ${change.explanation}\n\n` +
                   `\`\`\`diff\n- ${change.oldCode || '(new code)'}\n+ ${change.newCode}\n\`\`\`\n\n`;
        }).join('\n---\n\n');

        const markdown = new vscode.MarkdownString();
        markdown.appendMarkdown(`# ${suggestion.title}\n\n`);
        markdown.appendMarkdown(`**Description:** ${suggestion.description}\n\n`);
        markdown.appendMarkdown(`**Estimated Time:** ${suggestion.estimatedTime}\n\n`);
        markdown.appendMarkdown(`**Confidence:** ${suggestion.confidence.toUpperCase()}\n\n`);
        markdown.appendMarkdown(`## Changes\n\n${changes}`);

        // Show in a webview or notification
        const action = await vscode.window.showInformationMessage(
            `Preview remediation: ${suggestion.title}`,
            'Apply', 'Cancel'
        );

        if (action === 'Apply') {
            await this.applyRemediation(suggestion);
        }
    }

    private async readFileContext(filePath: string, line: number): Promise<string> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const startLine = Math.max(0, line - 10);
            const endLine = Math.min(document.lineCount, line + 10);
            
            let context = '';
            for (let i = startLine; i < endLine; i++) {
                context += document.lineAt(i).text + '\n';
            }
            return context;
        } catch (error) {
            return '// Unable to read file context';
        }
    }

    private detectLanguage(filePath: string): string {
        const ext = filePath.toLowerCase().split('.').pop();
        const languageMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescript',
            'js': 'javascript',
            'jsx': 'javascript',
            'py': 'python'
        };
        return languageMap[ext || ''] || 'typescript';
    }

    private detectBackendFramework(filePath: string): 'express' | 'nestjs' | 'fastapi' | 'flask' | 'django' {
        if (filePath.includes('controller') || filePath.includes('nest')) return 'nestjs';
        if (filePath.endsWith('.py')) {
            if (filePath.includes('fastapi')) return 'fastapi';
            if (filePath.includes('flask')) return 'flask';
            return 'django';
        }
        return 'express';
    }

    private suggestBackendFile(path: string, framework: string): string {
        const pathParts = path.split('/').filter(p => p && !p.startsWith(':'));
        const resourceName = pathParts[pathParts.length - 1] || 'api';
        
        if (framework === 'nestjs') {
            return `src/api/${resourceName}.controller.ts`;
        } else if (framework === 'express') {
            return `src/api/${resourceName}.routes.ts`;
        } else {
            return `src/api/${resourceName}.py`;
        }
    }

    private async findEndpointInsertionPoint(_filePath: string): Promise<number> {
        // Default to end of file for new endpoints
        return 0; // Will be enhanced to find the best insertion point
    }

    private generateRemediationTitle(gap: GapItem): string {
        if (gap.type === 'orphaned_component') {
            return `Generate Missing Backend Endpoint`;
        } else if (gap.type === 'unused_endpoint') {
            return `Add Frontend API Call`;
        }
        return `Fix: ${gap.message.substring(0, 50)}`;
    }

    private estimateTime(changes: CodeChange[]): string {
        const totalLines = changes.reduce((sum, c) => 
            sum + c.newCode.split('\n').length, 0
        );
        
        if (totalLines < 10) return '1-2 minutes';
        if (totalLines < 30) return '5-10 minutes';
        if (totalLines < 100) return '15-30 minutes';
        return '30-60 minutes';
    }

    private calculateConfidence(gap: GapItem, changes: CodeChange[]): 'high' | 'medium' | 'low' {
        if (changes.length === 0) return 'low';
        if (gap.type === 'orphaned_component' || gap.type === 'unused_endpoint') {
            return 'high';
        }
        return 'medium';
    }

    private isAutoApplicable(gap: GapItem, changes: CodeChange[]): boolean {
        // Only auto-apply simple, single-file changes
        return changes.length === 1 && 
               changes[0].newCode.split('\n').length < 50 &&
               gap.severity !== 'CRITICAL';
    }
}

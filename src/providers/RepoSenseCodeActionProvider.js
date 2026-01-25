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
exports.RepoSenseCodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
class RepoSenseCodeActionProvider {
    constructor() {
        this.gaps = [];
    }
    updateGaps(gaps) {
        this.gaps = gaps;
    }
    provideCodeActions(document, range, context, token) {
        const codeActions = [];
        // Find gaps at this location
        const gapsAtLocation = this.gaps.filter(gap => gap.file.toLowerCase() === document.uri.fsPath.toLowerCase() &&
            gap.line - 1 === range.start.line);
        for (const gap of gapsAtLocation) {
            // Add quick fix action if suggested fix is available
            if (gap.suggestedFix) {
                const fixAction = new vscode.CodeAction(`💡 ${gap.suggestedFix}`, vscode.CodeActionKind.QuickFix);
                fixAction.command = {
                    title: 'Apply RepoSense Fix',
                    command: 'reposense.fixGap',
                    arguments: [gap]
                };
                fixAction.diagnostics = context.diagnostics.filter(d => d.source === 'RepoSense' && d.code === gap.type);
                fixAction.isPreferred = gap.severity === 'CRITICAL';
                codeActions.push(fixAction);
            }
            // Add "Show in Report" action
            const showAction = new vscode.CodeAction('📊 Show in RepoSense Report', vscode.CodeActionKind.RefactorInline);
            showAction.command = {
                title: 'Show Gap Details',
                command: 'reposense.showGapDetails',
                arguments: [gap]
            };
            codeActions.push(showAction);
            // Add ignore action
            const ignoreAction = new vscode.CodeAction('🚫 Ignore This Gap', vscode.CodeActionKind.Empty);
            ignoreAction.command = {
                title: 'Ignore Gap',
                command: 'reposense.ignoreGap',
                arguments: [gap]
            };
            codeActions.push(ignoreAction);
            // Type-specific actions
            if (gap.type === 'orphaned_component') {
                const generateAction = new vscode.CodeAction('🔧 Generate Missing Endpoint', vscode.CodeActionKind.RefactorExtract);
                generateAction.command = {
                    title: 'Generate Endpoint',
                    command: 'reposense.generateEndpoint',
                    arguments: [gap.message] // Extract endpoint from message
                };
                codeActions.push(generateAction);
            }
            if (gap.type === 'unused_endpoint') {
                const removeAction = new vscode.CodeAction('🗑️ Remove Unused Endpoint', vscode.CodeActionKind.QuickFix);
                removeAction.command = {
                    title: 'Remove Endpoint',
                    command: 'reposense.removeUnusedEndpoint',
                    arguments: [gap]
                };
                codeActions.push(removeAction);
                const generateCallAction = new vscode.CodeAction('➕ Generate Frontend Call', vscode.CodeActionKind.RefactorExtract);
                generateCallAction.command = {
                    title: 'Generate Call',
                    command: 'reposense.generateFrontendCall',
                    arguments: [gap]
                };
                codeActions.push(generateCallAction);
            }
        }
        return codeActions.length > 0 ? codeActions : undefined;
    }
}
exports.RepoSenseCodeActionProvider = RepoSenseCodeActionProvider;

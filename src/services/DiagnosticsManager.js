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
exports.DiagnosticsManager = void 0;
const vscode = __importStar(require("vscode"));
class DiagnosticsManager {
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('reposense');
    }
    updateDiagnostics(gaps) {
        // Clear existing diagnostics
        this.diagnosticCollection.clear();
        // Group gaps by file
        const fileGaps = new Map();
        for (const gap of gaps) {
            const existing = fileGaps.get(gap.file) || [];
            existing.push(gap);
            fileGaps.set(gap.file, existing);
        }
        // Create diagnostics for each file
        for (const [file, gapsInFile] of fileGaps) {
            const uri = vscode.Uri.file(file);
            const diagnostics = [];
            for (const gap of gapsInFile) {
                const diagnostic = this.createDiagnostic(gap);
                diagnostics.push(diagnostic);
            }
            this.diagnosticCollection.set(uri, diagnostics);
        }
    }
    createDiagnostic(gap) {
        const line = Math.max(0, gap.line - 1);
        const range = new vscode.Range(line, 0, line, 1000);
        const diagnostic = new vscode.Diagnostic(range, gap.message, this.getSeverity(gap.severity));
        diagnostic.code = gap.type;
        diagnostic.source = 'RepoSense';
        if (gap.suggestedFix) {
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.file(gap.file), range), `Suggested Fix: ${gap.suggestedFix}`)
            ];
        }
        return diagnostic;
    }
    getSeverity(severity) {
        switch (severity) {
            case 'CRITICAL':
            case 'HIGH':
                return vscode.DiagnosticSeverity.Error;
            case 'MEDIUM':
                return vscode.DiagnosticSeverity.Warning;
            case 'LOW':
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Hint;
        }
    }
    clear() {
        this.diagnosticCollection.clear();
    }
    dispose() {
        this.diagnosticCollection.dispose();
    }
}
exports.DiagnosticsManager = DiagnosticsManager;

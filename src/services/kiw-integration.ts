/**
 * KIW Integration Service for ReproSense
 * 
 * Sends detected gaps to KIW for mission creation and orchestration.
 */

import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { Gap } from '../types/gap';

export interface KIWMissionResponse {
    status: 'pending_approval' | 'processing';
    problem_id: string;
    requires_human_approval: boolean;
    approval_reasons: string[];
    created_at: string;
}

export interface KIWBatchResponse {
    total: number;
    successful: number;
    failed: number;
    results: Array<{
        gap_id: string;
        status: 'success' | 'failed';
        problem_id?: string;
        error?: string;
    }>;
}

export class KIWIntegrationService {
    private client: AxiosInstance;
    private outputChannel: vscode.OutputChannel;
    private config: vscode.WorkspaceConfiguration;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.config = vscode.workspace.getConfiguration('reposense');

        const kiwEndpoint = this.config.get<string>('kiwEndpoint', 'http://localhost:8000');

        this.client = axios.create({
            baseURL: kiwEndpoint,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Send a single gap to KIW for mission creation
     */
    async sendGapToKIW(gap: Gap): Promise<KIWMissionResponse> {
        try {
            this.log(`Sending gap ${gap.id} to KIW...`);

            const payload = this.buildGapPayload(gap);

            const response = await this.client.post<KIWMissionResponse>(
                '/api/v1/intake/gap',
                payload
            );

            this.log(`✓ Gap ${gap.id} sent to KIW. Mission ID: ${response.data.problem_id}`);

            if (response.data.requires_human_approval) {
                this.log(`⚠ Mission requires human approval: ${response.data.approval_reasons.join(', ')}`);
                vscode.window.showWarningMessage(
                    `Gap sent to KIW but requires human approval: ${response.data.approval_reasons[0]}`
                );
            } else {
                vscode.window.showInformationMessage(
                    `Gap sent to KIW and is being processed (Mission: ${response.data.problem_id})`
                );
            }

            return response.data;

        } catch (error) {
            this.handleError('Failed to send gap to KIW', error);
            throw error;
        }
    }

    /**
     * Send multiple gaps to KIW in batch
     */
    async sendGapsBatch(gaps: Gap[]): Promise<KIWBatchResponse> {
        try {
            this.log(`Sending ${gaps.length} gaps to KIW in batch...`);

            const payloads = gaps.map(gap => this.buildGapPayload(gap));

            const response = await this.client.post<KIWBatchResponse>(
                '/api/v1/intake/batch',
                payloads
            );

            this.log(`✓ Batch complete: ${response.data.successful}/${response.data.total} successful`);

            vscode.window.showInformationMessage(
                `Sent ${response.data.successful}/${response.data.total} gaps to KIW successfully`
            );

            return response.data;

        } catch (error) {
            this.handleError('Failed to send batch to KIW', error);
            throw error;
        }
    }

    /**
     * Check the status of a mission created from a gap
     */
    async getMissionStatus(problemId: string): Promise<any> {
        try {
            const response = await this.client.get(`/api/v1/intake/status/${problemId}`);
            return response.data;
        } catch (error) {
            this.handleError(`Failed to get mission status for ${problemId}`, error);
            throw error;
        }
    }

    /**
     * Build KIW-compatible payload from ReproSense gap
     */
    private buildGapPayload(gap: Gap): any {
        return {
            gap_id: gap.id,
            type: this.mapGapTypeToKIW(gap.type),
            severity: gap.severity,
            description: gap.description,
            file_path: gap.filePath,
            line_number: gap.lineNumber,
            framework: gap.framework || 'unknown',
            tags: gap.tags || [],
            metadata: {
                endpoint: gap.endpoint,
                method: gap.method,
                expected_response: gap.expectedResponse,
                actual_response: gap.actualResponse,
                test_framework: gap.testFramework,
                ...gap.metadata
            },
            user_id: vscode.env.machineId  // Use VS Code machine ID as user identifier
        };
    }

    /**
     * Map ReproSense gap types to KIW problem types
     */
    private mapGapTypeToKIW(gapType: string): string {
        const mapping: Record<string, string> = {
            'missing_endpoint': 'missing_endpoint',
            'untested_endpoint': 'untested_endpoint',
            'missing_test': 'untested_endpoint',
            'security_gap': 'security_vulnerability',
            'performance_issue': 'performance_issue',
            'architecture_smell': 'architecture_smell'
        };

        return mapping[gapType] || gapType;
    }

    /**
     * Test connection to KIW
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.client.get('/api/v1/health');
            this.log('✓ KIW connection successful');
            return true;
        } catch (error) {
            this.log('✗ KIW connection failed');
            return false;
        }
    }

    private log(message: string): void {
        this.outputChannel.appendLine(`[KIW Integration] ${message}`);
    }

    private handleError(message: string, error: any): void {
        const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
        this.log(`✗ ${message}: ${errorMsg}`);
        vscode.window.showErrorMessage(`${message}: ${errorMsg}`);
    }
}

/**
 * VS Code Command: Send selected gap to KIW
 */
export async function sendGapToKIWCommand(
    gap: Gap,
    kiwService: KIWIntegrationService
): Promise<void> {
    try {
        const result = await kiwService.sendGapToKIW(gap);

        // Store mission ID in gap metadata for tracking
        gap.metadata = gap.metadata || {};
        gap.metadata.kiwMissionId = result.problem_id;
        gap.metadata.kiwStatus = result.status;

    } catch (error) {
        // Error already handled in service
    }
}

/**
 * VS Code Command: Send all detected gaps to KIW
 */
export async function sendAllGapsToKIWCommand(
    gaps: Gap[],
    kiwService: KIWIntegrationService
): Promise<void> {
    if (gaps.length === 0) {
        vscode.window.showInformationMessage('No gaps detected to send to KIW');
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Send ${gaps.length} detected gap(s) to KIW for mission creation?`,
        'Yes', 'No'
    );

    if (confirm !== 'Yes') {
        return;
    }

    try {
        const result = await kiwService.sendGapsBatch(gaps);

        // Update gap metadata with mission IDs
        result.results.forEach((r, index) => {
            if (r.status === 'success' && r.problem_id) {
                gaps[index].metadata = gaps[index].metadata || {};
                gaps[index].metadata.kiwMissionId = r.problem_id;
                gaps[index].metadata.kiwStatus = 'processing';
            }
        });

    } catch (error) {
        // Error already handled in service
    }
}

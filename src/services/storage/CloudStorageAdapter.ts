import * as fs from 'fs';
import * as path from 'path';

export interface StorageProvider {
    uploadFile(localPath: string, remotePath: string): Promise<string>;
    downloadFile(remotePath: string, localPath: string): Promise<void>;
    getSignedUrl(remotePath: string, expiresInSeconds: number): Promise<string>;
    deleteFile(remotePath: string): Promise<void>;
}

export class MockStorageProvider implements StorageProvider {
    async uploadFile(localPath: string, remotePath: string): Promise<string> {
        console.log(`[MockStorage] Uploading ${localPath} to ${remotePath}`);
        return `https://cloud-storage.mock/${remotePath}`;
    }

    async downloadFile(remotePath: string, localPath: string): Promise<void> {
        console.log(`[MockStorage] Downloading ${remotePath} to ${localPath}`);
    }

    async getSignedUrl(remotePath: string, expiresInSeconds: number): Promise<string> {
        return `https://cloud-storage.mock/${remotePath}?expires=${Date.now() + expiresInSeconds * 1000}`;
    }

    async deleteFile(remotePath: string): Promise<void> {
        console.log(`[MockStorage] Deleting ${remotePath}`);
    }
}

export class CloudStorageAdapter {
    private provider: StorageProvider;

    constructor(provider?: StorageProvider) {
        // Default to Mock for now, can be configured to S3/GCS later
        this.provider = provider || new MockStorageProvider();
    }

    public async uploadArtifact(localPath: string, runId: string, artifactType: string): Promise<string> {
        const fileName = path.basename(localPath);
        const remotePath = `runs/${runId}/${artifactType}/${fileName}`;
        return this.provider.uploadFile(localPath, remotePath);
    }

    public async generateReportLink(runId: string): Promise<string> {
        const remotePath = `runs/${runId}/reports/report.html`;
        return this.provider.getSignedUrl(remotePath, 3600 * 24 * 7); // 7 days
    }
}

let instance: CloudStorageAdapter | null = null;
export function getCloudStorage(): CloudStorageAdapter {
    if (!instance) {
        instance = new CloudStorageAdapter();
    }
    return instance;
}

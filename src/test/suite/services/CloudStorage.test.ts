import * as assert from 'assert';
import * as sinon from 'sinon';
import { CloudStorageAdapter, StorageProvider } from '../../../services/storage/CloudStorageAdapter';

describe('CloudStorageAdapter Unit Tests', () => {
    let adapter: CloudStorageAdapter;
    let mockProvider: sinon.SinonStubbedInstance<StorageProvider>;

    beforeEach(() => {
        mockProvider = {
            uploadFile: sinon.stub(),
            downloadFile: sinon.stub(),
            getSignedUrl: sinon.stub(),
            deleteFile: sinon.stub()
        } as any;
        adapter = new CloudStorageAdapter(mockProvider as any);
    });

    it('should upload an artifact to the correct remote path', async () => {
        mockProvider.uploadFile.resolves('https://cloud.com/runs/run1/logs/test.log');
        
        const url = await adapter.uploadArtifact('/local/path/test.log', 'run1', 'logs');

        assert.strictEqual(url, 'https://cloud.com/runs/run1/logs/test.log');
        assert.ok(mockProvider.uploadFile.calledWith('/local/path/test.log', 'runs/run1/logs/test.log'));
    });

    it('should generate a signed report link with correct expiration', async () => {
        mockProvider.getSignedUrl.resolves('https://cloud.com/signed-report');
        
        const url = await adapter.generateReportLink('run555');

        assert.strictEqual(url, 'https://cloud.com/signed-report');
        assert.ok(mockProvider.getSignedUrl.calledWith('runs/run555/reports/report.html', sinon.match.number));
    });

    it('should handle upload failures', async () => {
        mockProvider.uploadFile.rejects(new Error('Network error'));
        
        await assert.rejects(
            adapter.uploadArtifact('f.txt', 'r1', 't1'),
            /Network error/
        );
    });
});

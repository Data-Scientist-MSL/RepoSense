# STABLE ID GENERATION: SPECIFICATION & REFERENCE IMPLEMENTATION

**Critical for**: Test A2.1 (IDs identical across 5 consecutive scans)  
**Status**: Must pass before moving forward  
**Complexity**: HIGH (Non-negotiable requirement)

---

## THE PROBLEM

If your ID generation includes:
- ❌ **Timestamps** → Different ID each time
- ❌ **Random components** → Different ID each time
- ❌ **File system order** → Different ID if files processed differently
- ❌ **Absolute paths** → Different ID on different machines/branches
- ❌ **User names** → Different ID per developer

**Result**: Test A2.1 fails immediately.

---

## THE SOLUTION: Deterministic Hash

**Input** (deterministic):
```
type | method | normalized_path | line_number
```

**Output**:
```
node-<12-char-hex-hash>
```

**Property**: Same input → Same hash, **always**.

**Across 5 consecutive scans**: Identical.

---

## REFERENCE IMPLEMENTATION

### NodeJS Implementation

```typescript
// src/services/orchestration/GraphBuilder.ts

import * as crypto from 'crypto';

export class GraphBuilder {
  /**
   * Generate a STABLE, deterministic ID for an endpoint or call site.
   *
   * The ID is a SHA256 hash of the endpoint's immutable characteristics.
   * This ensures the same endpoint gets the same ID across multiple scans,
   * different machines, different branches, etc.
   *
   * @param endpoint - The endpoint object with: type, method, path, line
   * @returns A deterministic ID in format: "node-<12-char-hash>"
   *
   * CRITICAL: This function must be tested for determinism.
   * See test: src/test/suite/orchestration/GraphBuilder.test.ts (stable-ids)
   */
  generateStableId(endpoint: {
    type?: string;
    method?: string;
    path?: string;
    line?: number;
  }): string {
    // Step 1: Normalize all inputs
    const type = (endpoint.type || 'ENDPOINT').toUpperCase().trim();
    const method = (endpoint.method || 'UNKNOWN').toUpperCase().trim();
    const path = this.normalizePath(endpoint.path || '');
    const line = endpoint.line || 0;

    // Step 2: Create deterministic hash input
    // Format: TYPE|METHOD|PATH|LINE
    // Example: ENDPOINT|GET|/src/api.ts|42
    const hashInput = `${type}|${method}|${path}|${line}`;

    // Step 3: Generate SHA256 hash
    const hash = crypto
      .createHash('sha256')
      .update(hashInput, 'utf-8')
      .digest('hex');

    // Step 4: Use first 12 characters for readability
    const shortHash = hash.substring(0, 12);

    // Step 5: Return formatted ID
    return `node-${shortHash}`;
  }

  /**
   * Normalize file paths for cross-platform determinism.
   *
   * Goals:
   * 1. Windows paths → Unix paths (backslashes to forward slashes)
   * 2. Absolute paths → Relative (remove drive letters)
   * 3. Consistent separators (always forward slash)
   * 4. No trailing slashes
   *
   * Examples:
   * - C:\repo\src\api.ts → /repo/src/api.ts
   * - /home/user/repo/src/api.ts → /repo/src/api.ts
   * - src\api.ts → /src/api.ts
   * - ./src/api.ts → /src/api.ts
   *
   * @param filePath - Original file path (may have backslashes, drive letters, etc.)
   * @returns Normalized path suitable for hashing
   */
  private normalizePath(filePath: string): string {
    if (!filePath) return '';

    // Step 1: Convert backslashes to forward slashes (Windows → Unix)
    let normalized = filePath.replace(/\\/g, '/');

    // Step 2: Remove drive letter (Windows C: → /, D: → /)
    normalized = normalized.replace(/^[A-Za-z]:/, '');

    // Step 3: Remove leading ./ if present
    normalized = normalized.replace(/^\.\//, '');

    // Step 4: Ensure leading / for consistency
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    // Step 5: Remove trailing / if present (but keep single /)
    normalized = normalized.replace(/\/$/, '') || '/';

    // Step 6: Remove duplicate slashes (// → /)
    normalized = normalized.replace(/\/+/g, '/');

    // Step 7: Lowercase for consistency (optional but recommended)
    normalized = normalized.toLowerCase();

    return normalized;
  }

  /**
   * Generate a stable edge ID from two node IDs.
   * Format: edge-<12-char-hash>
   *
   * @param fromNodeId - Source node ID
   * @param toNodeId - Target node ID
   * @returns Deterministic edge ID
   */
  generateStableEdgeId(fromNodeId: string, toNodeId: string): string {
    const edgeInput = `${fromNodeId}→${toNodeId}`;
    const hash = crypto
      .createHash('sha256')
      .update(edgeInput, 'utf-8')
      .digest('hex')
      .substring(0, 12);

    return `edge-${hash}`;
  }
}
```

---

## TEST CASES FOR VALIDATION

### Test 1: Path Normalization

```typescript
describe('normalizePath', () => {
  const builder = new GraphBuilder();

  it('converts Windows paths to Unix', () => {
    const result = builder['normalizePath']('C:\\repo\\src\\api.ts');
    expect(result).toBe('/repo/src/api.ts');
  });

  it('removes drive letters', () => {
    const result = builder['normalizePath']('D:\\project\\main.ts');
    expect(result).toBe('/project/main.ts');
  });

  it('handles relative paths', () => {
    const result = builder['normalizePath']('./src/api.ts');
    expect(result).toBe('/src/api.ts');
  });

  it('removes duplicate slashes', () => {
    const result = builder['normalizePath']('/repo//src///api.ts');
    expect(result).toBe('/repo/src/api.ts');
  });

  it('lowercases paths', () => {
    const result = builder['normalizePath']('/Repo/SRC/Api.ts');
    expect(result).toBe('/repo/src/api.ts');
  });
});
```

### Test 2: Deterministic ID Generation

```typescript
describe('generateStableId', () => {
  const builder = new GraphBuilder();

  it('generates same ID for same input', () => {
    const endpoint = {
      type: 'ENDPOINT',
      method: 'GET',
      path: '/src/api.ts',
      line: 42,
    };

    const id1 = builder.generateStableId(endpoint);
    const id2 = builder.generateStableId(endpoint);

    expect(id1).toBe(id2);
  });

  it('generates different IDs for different endpoints', () => {
    const endpoint1 = {
      type: 'ENDPOINT',
      method: 'GET',
      path: '/src/api.ts',
      line: 42,
    };

    const endpoint2 = {
      type: 'ENDPOINT',
      method: 'POST',
      path: '/src/api.ts',
      line: 42,
    };

    const id1 = builder.generateStableId(endpoint1);
    const id2 = builder.generateStableId(endpoint2);

    expect(id1).not.toBe(id2);
  });

  it('generates same ID regardless of path format', () => {
    // These should hash to the same ID (after normalization)
    const endpoint1 = {
      type: 'ENDPOINT',
      method: 'GET',
      path: 'C:\\repo\\src\\api.ts',
      line: 42,
    };

    const endpoint2 = {
      type: 'ENDPOINT',
      method: 'GET',
      path: '/repo/src/api.ts',
      line: 42,
    };

    const id1 = builder.generateStableId(endpoint1);
    const id2 = builder.generateStableId(endpoint2);

    expect(id1).toBe(id2); // MUST be identical
  });

  it('generates IDs in format "node-<12-hex-chars>"', () => {
    const endpoint = {
      type: 'ENDPOINT',
      method: 'GET',
      path: '/src/api.ts',
      line: 42,
    };

    const id = builder.generateStableId(endpoint);

    expect(id).toMatch(/^node-[0-9a-f]{12}$/);
  });
});
```

### Test 3: Stability Across Multiple Scans (CRITICAL)

```typescript
describe('Stable IDs across multiple scans (A2.1)', () => {
  it('generates identical IDs across 5 consecutive scans', async () => {
    const fixture = loadFixture('simple-rest');
    const builder = new GraphBuilder();

    // Scan 1
    const analysis1 = await analyzeRepository(fixture.path);
    const graph1 = builder.buildGraph(analysis1);
    const ids1 = graph1.nodes.map(n => n.id).sort();

    // Scan 2
    const analysis2 = await analyzeRepository(fixture.path);
    const graph2 = builder.buildGraph(analysis2);
    const ids2 = graph2.nodes.map(n => n.id).sort();

    // Scan 3
    const analysis3 = await analyzeRepository(fixture.path);
    const graph3 = builder.buildGraph(analysis3);
    const ids3 = graph3.nodes.map(n => n.id).sort();

    // Scan 4
    const analysis4 = await analyzeRepository(fixture.path);
    const graph4 = builder.buildGraph(analysis4);
    const ids4 = graph4.nodes.map(n => n.id).sort();

    // Scan 5
    const analysis5 = await analyzeRepository(fixture.path);
    const graph5 = builder.buildGraph(analysis5);
    const ids5 = graph5.nodes.map(n => n.id).sort();

    // All must be identical
    expect(ids1).toEqual(ids2);
    expect(ids2).toEqual(ids3);
    expect(ids3).toEqual(ids4);
    expect(ids4).toEqual(ids5);

    console.log(`✓ IDs stable across 5 scans: ${ids1.length} nodes`);
  });
});
```

---

## GOTCHAS & SOLUTIONS

### Gotcha 1: File System Order

**Problem**: Files processed in different order → Different analysis output → Different IDs?

**Answer**: No, because IDs are based on endpoint properties, not process order.

**Solution**: Each endpoint hash is independent. As long as the same endpoint is detected, it gets the same ID.

---

### Gotcha 2: Windows vs Unix Paths

**Problem**: Dev runs on Windows, CI runs on Linux → IDs differ?

**Answer**: Yes, if paths aren't normalized.

**Solution**: Always normalize paths to Unix format before hashing.

**Test on Windows**:
```typescript
it('Windows path → Unix normalization', () => {
  const endpoint = {
    type: 'ENDPOINT',
    method: 'GET',
    path: 'C:\\Users\\Dev\\repo\\src\\api.ts',
    line: 42,
  };

  const id = builder.generateStableId(endpoint);

  // Should match ID from Linux path
  const expectedId = builder.generateStableId({
    type: 'ENDPOINT',
    method: 'GET',
    path: '/home/dev/repo/src/api.ts',
    line: 42,
  });

  expect(id).toBe(expectedId);
});
```

---

### Gotcha 3: Case Sensitivity

**Problem**: Windows: `API.ts`, Linux: `api.ts` → Different IDs?

**Answer**: Yes, if not normalized.

**Solution**: Lowercase all paths before hashing.

---

### Gotcha 4: Method Names

**Problem**: `GET`, `get`, `Get` → Different IDs?

**Answer**: Yes, if not normalized.

**Solution**: Uppercase all method names before hashing.

---

### Gotcha 5: Line Numbers Change

**Problem**: Adding a line above an endpoint → Line number changes → ID changes?

**Answer**: Yes, this is **intentional**.

**Explanation**: An endpoint is identified by its method + path + **line number**. If the line number changes, it's a different location in the code, hence different ID.

**When this matters**:
- Refactoring code (moving endpoints) → IDs change (correct)
- Adding comments above endpoint → Line shifts → ID changes (correct)

**When it doesn't matter**:
- Changing endpoint internals (adding a line inside) → Line number stays (ID same)

---

## VALIDATION CHECKLIST

Before considering this complete:

```
✅ ID format: node-<12-hex-chars>
✅ Path normalization converts backslashes → forward slashes
✅ Drive letters removed (C:\repo → /repo)
✅ Methods uppercase (GET, POST, etc.)
✅ Paths lowercase
✅ Edge IDs generated from node IDs
✅ Test: Same input → Same ID (10 iterations)
✅ Test: Windows path = Linux path (after normalization)
✅ Test: Across 5 consecutive scans (A2.1 assertion)
✅ No timestamps in hash input
✅ No random components
✅ No file system order dependency
```

---

## DEBUGGING: IF TESTS FAIL

### Scenario 1: IDs differ across scans

**Symptom**: 
```
Scan 1 ID: node-abc123def456
Scan 2 ID: node-xyz789uvw012
```

**Diagnosis**:
- [ ] Check if analyzer output is different (use JSON snapshot)
- [ ] Check if path normalization is working
- [ ] Check if hash function includes timestamps

**Fix**:
```typescript
// WRONG: Includes timestamp
const hashInput = `${type}|${method}|${path}|${line}|${Date.now()}`;

// RIGHT: No timestamp
const hashInput = `${type}|${method}|${path}|${line}`;
```

### Scenario 2: Windows vs Linux IDs differ

**Symptom**:
```
Windows: node-abc123def456
Linux:   node-xyz789uvw012
```

**Diagnosis**:
- [ ] Check if paths are normalized on Windows
- [ ] Check if backslashes → forward slashes

**Fix**:
```typescript
// Add to normalizePath
let normalized = filePath.replace(/\\/g, '/'); // Windows backslash to forward slash
```

### Scenario 3: Same endpoint gets different IDs

**Symptom**: Endpoint appears twice in same scan with different IDs.

**Diagnosis**:
- [ ] Check if endpoint data is different (method case? path format?)
- [ ] Check if line numbers vary

**Fix**:
```typescript
// Debug: Print hash inputs
console.log('Hash input:', hashInput);
console.log('Hash output:', hash);
```

---

## TESTING COMMAND

Run this to validate stable IDs:

```bash
# Unit tests
npm test -- src/test/suite/orchestration/GraphBuilder.test.ts --grep "stable"

# Integration test (5 consecutive scans)
npm test -- src/test/suite/orchestration/GraphBuilder.test.ts --grep "A2.1"

# Fixture tests
npm test -- test/fixtures/simple-rest.stable-id.test.ts
npm test -- test/fixtures/dynamic-params.stable-id.test.ts
npm test -- test/fixtures/mixed-patterns.stable-id.test.ts
```

---

## FINAL CONFIDENCE CHECK

When you can run:
```bash
npm test -- src/test/suite/sprint-9/workstream-a.test.ts --grep "A2.1"
```

And get:
```
A2.1 - Stable IDs across 5 consecutive scans
  ✓ Scan 1 IDs: 3 nodes
  ✓ Scan 2 IDs: 3 nodes (identical to scan 1)
  ✓ Scan 3 IDs: 3 nodes (identical to scan 1)
  ✓ Scan 4 IDs: 3 nodes (identical to scan 1)
  ✓ Scan 5 IDs: 3 nodes (identical to scan 1)
  ✓ All IDs match across scans

✓ Test passed
```

**Then you're ready** to move on to the next modules.

---

**Status**: 🟢 Ready for Implementation  
**Estimated Time**: 1 day to implement + 1 day to validate  
**Critical Success**: Test A2.1 passes with 100% confidence

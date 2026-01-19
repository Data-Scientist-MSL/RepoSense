#!/bin/bash

# UAT Test Execution Script for RepoSense Extension
# This script runs all tests and generates comprehensive reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamp for test report
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="uat-reports/${TIMESTAMP}"
mkdir -p "${REPORT_DIR}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RepoSense UAT Test Execution${NC}"
echo -e "${BLUE}Started: $(date)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Log function
log_section() {
    echo -e "\n${GREEN}▶ $1${NC}\n"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Initialize test results
TOTAL_TESTS=0
TESTS_PASSED=0
TESTS_FAILED=0
START_TIME=$(date +%s)

# 1. Clean install dependencies
log_section "Step 1: Clean install dependencies"
npm ci --ignore-scripts > "${REPORT_DIR}/npm-install.log" 2>&1
if [ $? -eq 0 ]; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    exit 1
fi

# 2. Lint code
log_section "Step 2: Running linter"
npm run lint > "${REPORT_DIR}/lint-results.txt" 2>&1
if [ $? -eq 0 ]; then
    log_success "Linting passed"
else
    log_warning "Linting issues found (see ${REPORT_DIR}/lint-results.txt)"
fi

# 3. Compile TypeScript
log_section "Step 3: Compiling TypeScript"
npm run compile > "${REPORT_DIR}/compile.log" 2>&1
if [ $? -eq 0 ]; then
    log_success "Compilation successful"
else
    log_error "Compilation failed"
    exit 1
fi

# 4. Run unit tests
log_section "Step 4: Running unit tests"
if npm run test:unit > "${REPORT_DIR}/unit-tests.log" 2>&1; then
    log_success "Unit tests passed"
    UNIT_TESTS_PASSED=true
else
    log_warning "Unit tests completed with issues (check logs)"
    UNIT_TESTS_PASSED=false
fi

# 5. Run integration tests (via npm test which runs VS Code tests)
log_section "Step 5: Running integration and E2E tests"
if npm test > "${REPORT_DIR}/integration-e2e-tests.log" 2>&1; then
    log_success "Integration/E2E tests passed"
    INTEGRATION_TESTS_PASSED=true
else
    log_warning "Integration/E2E tests completed with issues (check logs)"
    INTEGRATION_TESTS_PASSED=false
fi

# 6. Generate coverage report
log_section "Step 6: Generating code coverage report"
if npm run coverage > "${REPORT_DIR}/coverage.log" 2>&1; then
    log_success "Coverage report generated"
    # Copy coverage report
    if [ -d "coverage" ]; then
        cp -r coverage "${REPORT_DIR}/"
        log_success "Coverage report copied to ${REPORT_DIR}/coverage"
    fi
else
    log_warning "Coverage generation completed with issues"
fi

# 7. Package extension
log_section "Step 7: Packaging extension"
if command -v vsce &> /dev/null; then
    if vsce package > "${REPORT_DIR}/package.log" 2>&1; then
        log_success "Extension packaged successfully"
        VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -1)
        if [ -n "$VSIX_FILE" ]; then
            log_success "VSIX file created: $VSIX_FILE"
            cp "$VSIX_FILE" "${REPORT_DIR}/"
        fi
    else
        log_warning "Extension packaging had issues"
    fi
else
    log_warning "vsce not installed globally, skipping packaging"
    log_warning "Run: npm install -g @vscode/vsce"
fi

# 8. Collect metrics
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Extract test counts from logs (basic parsing)
if [ -f "${REPORT_DIR}/unit-tests.log" ]; then
    UNIT_COUNT=$(grep -o "passing" "${REPORT_DIR}/unit-tests.log" | wc -l || echo "0")
    UNIT_FAIL=$(grep -o "failing" "${REPORT_DIR}/unit-tests.log" | wc -l || echo "0")
fi

# 9. Generate JSON summary
log_section "Step 8: Generating test summary"
cat > "${REPORT_DIR}/test-summary.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "duration_seconds": ${DURATION},
  "unit_tests": {
    "passed": ${UNIT_TESTS_PASSED},
    "count": "${UNIT_COUNT:-N/A}"
  },
  "integration_tests": {
    "passed": ${INTEGRATION_TESTS_PASSED}
  },
  "lint": {
    "status": "completed"
  },
  "compilation": {
    "status": "success"
  },
  "coverage": {
    "report_available": $([ -d "${REPORT_DIR}/coverage" ] && echo "true" || echo "false")
  },
  "vsix_package": {
    "created": $([ -f "${REPORT_DIR}/"*.vsix ] && echo "true" || echo "false")
  }
}
EOF

# 10. Generate HTML report summary
cat > "${REPORT_DIR}/index.html" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>RepoSense UAT Test Report - ${TIMESTAMP}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; border-left: 4px solid #28a745; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .error { background: #f8d7da; border-left: 4px solid #dc3545; }
        .info { background: #d1ecf1; border-left: 4px solid #17a2b8; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #3498db; color: white; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; color: #3498db; }
        .metric-label { color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 RepoSense UAT Test Report</h1>
        <div class="info status">
            <strong>Test Execution Date:</strong> $(date)<br>
            <strong>Duration:</strong> ${DURATION} seconds<br>
            <strong>Report Directory:</strong> ${REPORT_DIR}
        </div>

        <h2>📊 Test Summary</h2>
        <div class="metric">
            <div class="metric-value">$([ "$UNIT_TESTS_PASSED" = "true" ] && echo "✓" || echo "⚠")</div>
            <div class="metric-label">Unit Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value">$([ "$INTEGRATION_TESTS_PASSED" = "true" ] && echo "✓" || echo "⚠")</div>
            <div class="metric-label">Integration Tests</div>
        </div>

        <h2>📁 Available Reports</h2>
        <ul>
            <li><a href="unit-tests.log">Unit Tests Log</a></li>
            <li><a href="integration-e2e-tests.log">Integration & E2E Tests Log</a></li>
            <li><a href="coverage/index.html">Coverage Report</a> (if available)</li>
            <li><a href="lint-results.txt">Lint Results</a></li>
            <li><a href="test-summary.json">JSON Summary</a></li>
        </ul>

        <h2>🔍 Next Steps</h2>
        <ol>
            <li>Review all test logs for any failures or warnings</li>
            <li>Check coverage report to ensure >80% coverage</li>
            <li>Verify VSIX package was created successfully</li>
            <li>Install and manually test the extension</li>
            <li>Complete the UAT_TEST_RESULTS.md document</li>
        </ol>
    </div>
</body>
</html>
EOF

# Final summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Execution Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Duration: ${DURATION} seconds"
echo -e "Reports saved to: ${REPORT_DIR}"
echo -e "\nOpen ${REPORT_DIR}/index.html in a browser to view the summary"
echo -e "\n${GREEN}✓ UAT test execution completed${NC}\n"

# Create a latest symlink
rm -f uat-reports/latest
ln -sf "${TIMESTAMP}" uat-reports/latest

log_success "Latest report linked at: uat-reports/latest"

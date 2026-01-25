"use strict";
/**
 * RunOrchestrator.ts
 *
 * Comprehensive type contracts for the unified RepoSense run lifecycle.
 * Bridges: scan → plan → generate → apply → execute → evidence → report
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestFramework = exports.GapSeverity = exports.GapType = exports.RunState = void 0;
// ============================================================================
// Run State Machine
// ============================================================================
var RunState;
(function (RunState) {
    RunState["IDLE"] = "IDLE";
    RunState["SCANNING"] = "SCANNING";
    RunState["PLANNING"] = "PLANNING";
    RunState["GENERATING"] = "GENERATING";
    RunState["APPLYING"] = "APPLYING";
    RunState["EXECUTING"] = "EXECUTING";
    RunState["REPORTING"] = "REPORTING";
    RunState["DONE"] = "DONE";
    RunState["FAILED"] = "FAILED";
    RunState["CANCELLED"] = "CANCELLED";
})(RunState || (exports.RunState = RunState = {}));
// ============================================================================
// Gap & Priority Model
// ============================================================================
var GapType;
(function (GapType) {
    GapType["MISSING_ENDPOINT"] = "missing_endpoint";
    GapType["UNUSED_ENDPOINT"] = "unused_endpoint";
    GapType["UNTESTED_ENDPOINT"] = "untested_endpoint";
    GapType["TYPE_MISMATCH"] = "type_mismatch";
    GapType["MISSING_CRUD"] = "missing_crud";
    GapType["ORPHANED_COMPONENT"] = "orphaned_component";
    GapType["SUGGESTION"] = "suggestion"; // generic suggestion
})(GapType || (exports.GapType = GapType = {}));
var GapSeverity;
(function (GapSeverity) {
    GapSeverity["CRITICAL"] = "CRITICAL";
    GapSeverity["HIGH"] = "HIGH";
    GapSeverity["MEDIUM"] = "MEDIUM";
    GapSeverity["LOW"] = "LOW";
})(GapSeverity || (exports.GapSeverity = GapSeverity = {}));
// ============================================================================
// Execution Phase
// ============================================================================
var TestFramework;
(function (TestFramework) {
    TestFramework["PLAYWRIGHT"] = "playwright";
    TestFramework["CYPRESS"] = "cypress";
    TestFramework["JEST"] = "jest";
    TestFramework["MOCHA"] = "mocha";
    TestFramework["PYTEST"] = "pytest";
    TestFramework["VITEST"] = "vitest";
})(TestFramework || (exports.TestFramework = TestFramework = {}));

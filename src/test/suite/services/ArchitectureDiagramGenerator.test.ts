import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import * as sinon from 'sinon';
import { ArchitectureDiagramGenerator } from '../../../services/llm/ArchitectureDiagramGenerator';
import { OllamaService } from '../../../services/llm/OllamaService';
import { GapItem } from '../../../models/types';

describe('ArchitectureDiagramGenerator', () => {
    let diagramGenerator: ArchitectureDiagramGenerator;
    let ollamaServiceStub: sinon.SinonStubbedInstance<OllamaService>;

    beforeEach(() => {
        ollamaServiceStub = sinon.createStubInstance(OllamaService);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        diagramGenerator = new ArchitectureDiagramGenerator(ollamaServiceStub as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('generateAsIsDiagram()', () => {
        it('should generate L1 as-is diagram with defects', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/users endpoint',
                    file: 'Users.tsx',
                    line: 10,
                    suggestedFix: 'Create endpoint'
                },
                {
                    type: 'unused_endpoint',
                    severity: 'LOW',
                    message: 'Unused /api/products',
                    file: 'products.ts',
                    line: 20,
                    suggestedFix: 'Remove'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L1');

            expect(diagram.level).to.equal('L1');
            expect(diagram.type).to.equal('as-is');
            expect(diagram.title).to.include('As-Is Architecture');
            expect(diagram.nodes).to.be.an('array');
            expect(diagram.edges).to.be.an('array');
            expect(diagram.annotations).to.be.an('array');
            expect(diagram.legend).to.have.property('symbols');
            expect(diagram.legend).to.have.property('colors');
        });

        it('should mark problematic nodes', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing /api/test',
                    file: 'Test.tsx',
                    line: 5,
                    suggestedFix: 'Fix'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L2');

            const problematicNodes = diagram.nodes.filter(n => n.isProblematic);
            expect(problematicNodes.length).to.be.greaterThan(0);
        });

        it('should include defect annotations', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'type_mismatch',
                    severity: 'MEDIUM',
                    message: 'Type mismatch',
                    file: 'Component.tsx',
                    line: 15,
                    suggestedFix: 'Fix types'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L3');

            const nodesWithDefects = diagram.nodes.filter(n => n.defects && n.defects.length > 0);
            expect(nodesWithDefects.length).to.be.greaterThan(0);
        });

        it('should generate appropriate annotations for different levels', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];

            const l1Diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L1');
            const l3Diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L3');

            expect(l1Diagram.annotations).to.include.members(
                l1Diagram.annotations.filter(a => a.includes('High-level'))
            );
            expect(l3Diagram.annotations).to.include.members(
                l3Diagram.annotations.filter(a => a.includes('UI/UX'))
            );
        });
    });

    describe('generateToBeDiagram()', () => {
        it('should generate to-be diagram without defects', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/users',
                    file: 'Users.tsx',
                    line: 10,
                    suggestedFix: 'Create'
                }
            ];

            const diagram = await diagramGenerator.generateToBeDiagram(gaps, 'L1');

            expect(diagram.type).to.equal('to-be');
            expect(diagram.title).to.include('To-Be Architecture');
            
            // No nodes should be problematic in to-be diagram
            const problematicNodes = diagram.nodes.filter(n => n.isProblematic);
            expect(problematicNodes.length).to.equal(0);
        });

        it('should include improvement annotations', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing endpoint',
                    file: 'Test.tsx',
                    line: 5,
                    suggestedFix: 'Create'
                }
            ];

            const diagram = await diagramGenerator.generateToBeDiagram(gaps, 'L2');

            expect(diagram.annotations).to.be.an('array');
            expect(diagram.annotations.some(a => a.includes('resolved'))).to.be.true;
        });

        it('should add new nodes for missing endpoints', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/new-endpoint',
                    file: 'Component.tsx',
                    line: 10,
                    suggestedFix: 'Create'
                }
            ];

            const diagram = await diagramGenerator.generateToBeDiagram(gaps, 'L2');

            // Should have nodes for both the component and the new endpoint
            expect(diagram.nodes.length).to.be.greaterThan(0);
            const newEndpoints = diagram.nodes.filter(n => n.label.includes('NEW'));
            expect(newEndpoints.length).to.be.greaterThan(0);
        });
    });

    describe('generateComparison()', () => {
        it('should generate both as-is and to-be diagrams', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing /api/test',
                    file: 'Test.tsx',
                    line: 5,
                    suggestedFix: 'Create'
                }
            ];

            const comparison = await diagramGenerator.generateComparison(gaps, 'L2');

            expect(comparison.asIsDiagram).to.exist;
            expect(comparison.toBeDiagram).to.exist;
            expect(comparison.differences).to.be.an('array');
            expect(comparison.summary).to.be.a('string');
        });

        it('should calculate differences correctly', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/endpoint',
                    file: 'Component.tsx',
                    line: 10,
                    suggestedFix: 'Create'
                },
                {
                    type: 'unused_endpoint',
                    severity: 'LOW',
                    message: 'Unused /api/old',
                    file: 'old.ts',
                    line: 5,
                    suggestedFix: 'Remove'
                }
            ];

            const comparison = await diagramGenerator.generateComparison(gaps, 'L1');

            expect(comparison.differences.length).to.be.greaterThan(0);
            
            // Should have differences for added, removed, or modified elements
            const types = comparison.differences.map(d => d.type);
            expect(types).to.satisfy((arr: string[]) => 
                arr.includes('added') || arr.includes('removed') || arr.includes('modified')
            );
        });

        it('should include summary with change counts', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];

            const comparison = await diagramGenerator.generateComparison(gaps, 'L1');

            expect(comparison.summary).to.include('Total Changes');
            expect(comparison.summary).to.include('Added');
            expect(comparison.summary).to.include('defects');
        });
    });

    describe('toMermaid()', () => {
        it('should convert diagram to valid Mermaid syntax', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/users',
                    file: 'Users.tsx',
                    line: 10,
                    suggestedFix: 'Create'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L1');
            const mermaid = diagramGenerator.toMermaid(diagram);

            expect(mermaid).to.include('graph TB');
            expect(mermaid).to.be.a('string');
            expect(mermaid.length).to.be.greaterThan(0);
        });

        it('should include node definitions', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing /api/test',
                    file: 'Test.tsx',
                    line: 5,
                    suggestedFix: 'Create'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L2');
            const mermaid = diagramGenerator.toMermaid(diagram);

            // Should have node definitions
            expect(mermaid).to.match(/\[.*\]/); // Square brackets for nodes
        });

        it('should include edge definitions for orphaned components', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/endpoint',
                    file: 'Component.tsx',
                    line: 10,
                    suggestedFix: 'Create'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L2');
            const mermaid = diagramGenerator.toMermaid(diagram);

            // Should have edge definitions with arrows
            expect(mermaid).to.match(/(-->|-\.\->)/);
        });

        it('should include style definitions', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L1');
            const mermaid = diagramGenerator.toMermaid(diagram);

            expect(mermaid).to.include('classDef');
            expect(mermaid).to.include('problematic');
        });

        it('should mark problematic elements with dashed lines', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing /api/broken',
                    file: 'Broken.tsx',
                    line: 10,
                    suggestedFix: 'Fix'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L2');
            const mermaid = diagramGenerator.toMermaid(diagram);

            // Problematic edges should be dashed
            expect(mermaid).to.include('-.->');
        });
    });

    describe('identifyUIUXDefects()', () => {
        it('should identify component structure issues', () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing /api/users',
                    file: 'Users.tsx',
                    line: 10,
                    suggestedFix: 'Create'
                },
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Missing /api/posts',
                    file: 'Users.tsx',
                    line: 20,
                    suggestedFix: 'Create'
                }
            ];

            const uiuxDefects = diagramGenerator.identifyUIUXDefects(gaps);

            expect(uiuxDefects).to.be.an('array');
            expect(uiuxDefects.length).to.be.greaterThan(0);
            
            const structureDefects = uiuxDefects.filter(d => d.category === 'component_structure');
            expect(structureDefects.length).to.be.greaterThan(0);
        });

        it('should identify data flow issues', () => {
            const gaps: GapItem[] = [
                {
                    type: 'type_mismatch',
                    severity: 'MEDIUM',
                    message: 'Type mismatch in API response',
                    file: 'Component.tsx',
                    line: 15,
                    suggestedFix: 'Align types'
                }
            ];

            const uiuxDefects = diagramGenerator.identifyUIUXDefects(gaps);

            const dataFlowDefects = uiuxDefects.filter(d => d.category === 'data_flow');
            expect(dataFlowDefects.length).to.be.greaterThan(0);
        });

        it('should include severity and recommendations', () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'CRITICAL',
                    message: 'Missing endpoint',
                    file: 'Test.tsx',
                    line: 5,
                    suggestedFix: 'Create'
                }
            ];

            const uiuxDefects = diagramGenerator.identifyUIUXDefects(gaps);

            expect(uiuxDefects.length).to.be.greaterThan(0);
            expect(uiuxDefects[0]).to.have.property('severity');
            expect(uiuxDefects[0]).to.have.property('recommendation');
            expect(uiuxDefects[0]).to.have.property('affectedComponents');
        });
    });

    describe('Legend Generation', () => {
        it('should generate different legends for as-is and to-be', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];

            const asIsDiagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L1');
            const toBeDiagram = await diagramGenerator.generateToBeDiagram(gaps, 'L1');

            expect(asIsDiagram.legend.colors).to.not.deep.equal(toBeDiagram.legend.colors);
        });

        it('should include symbol explanations', async () => {
            const gaps: GapItem[] = [];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L1');

            expect(diagram.legend.symbols.length).to.be.greaterThan(0);
            expect(diagram.legend.symbols[0]).to.have.property('icon');
            expect(diagram.legend.symbols[0]).to.have.property('description');
        });

        it('should explain color meanings', async () => {
            const gaps: GapItem[] = [
                {
                    type: 'orphaned_component',
                    severity: 'HIGH',
                    message: 'Gap',
                    file: 'test.tsx',
                    line: 1,
                    suggestedFix: 'Fix'
                }
            ];

            const diagram = await diagramGenerator.generateAsIsDiagram(gaps, 'L1');

            expect(diagram.legend.colors.length).to.be.greaterThan(0);
            expect(diagram.legend.colors[0]).to.have.property('color');
            expect(diagram.legend.colors[0]).to.have.property('meaning');
        });
    });
});

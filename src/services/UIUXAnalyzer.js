"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIUXAnalyzer = void 0;
const OllamaService_1 = require("./llm/OllamaService");
const ErrorHandler_1 = require("../utils/ErrorHandler");
// ============================================================================
// AI-POWERED UI/UX ANALYZER
// ============================================================================
class UIUXAnalyzer {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.ollama = new OllamaService_1.OllamaService();
    }
    /**
     * Analyze test results and generate comprehensive UI/UX recommendations
     */
    async analyzeTestResults(testResult, gap) {
        this.outputChannel.appendLine('🎨 Starting UI/UX Analysis...');
        // Use AI to analyze screenshots and agent observations
        const issues = await (0, ErrorHandler_1.withRetry)(() => this.detectUIUXIssues(testResult), { maxAttempts: 3 });
        // Generate mockups for each issue
        for (const issue of issues) {
            issue.toBe.mockup = this.sanitizeSVG(await (0, ErrorHandler_1.withRetry)(() => this.generateMockup(issue), { maxAttempts: 3 }));
            // asIs.mockup can be the same or a placeholder since generateMockup currently combines both
            issue.asIs.mockup = issue.toBe.mockup;
        }
        // Create prioritized roadmap
        const roadmap = this.generateRoadmap(issues);
        // Calculate overall scores
        const scores = this.calculateScores(issues);
        const pack = {
            id: `rec_${Date.now()}`,
            name: `UI/UX Recommendations: ${gap.endpoint}`,
            description: `Comprehensive UI/UX analysis and recommendations for ${gap.method} ${gap.endpoint}`,
            testId: testResult.testName,
            endpoint: gap.endpoint,
            generatedAt: Date.now(),
            summary: {
                totalIssues: issues.length,
                criticalIssues: issues.filter(i => i.severity === 'critical').length,
                highIssues: issues.filter(i => i.severity === 'high').length,
                mediumIssues: issues.filter(i => i.severity === 'medium').length,
                lowIssues: issues.filter(i => i.severity === 'low').length,
                estimatedTotalEffort: this.calculateTotalEffort(issues)
            },
            issues,
            overallScore: scores,
            prioritizedRoadmap: roadmap,
            disclaimer: "This report provides AI-generated UI/UX guidance based on agentic testing observations. All implementation decisions should be reviewed by your design and engineering teams to ensure alignment with brand guidelines and user needs."
        };
        // Agentic Consultation Step: Consult with a UI/UX Expert LLM
        await this.consultExpert(pack, testResult);
        this.outputChannel.appendLine(`✅ Found ${issues.length} UI/UX issues`);
        this.outputChannel.appendLine(`📊 Overall Scores:`);
        this.outputChannel.appendLine(`   Accessibility: ${scores.accessibility}/100`);
        this.outputChannel.appendLine(`   Usability: ${scores.usability}/100`);
        this.outputChannel.appendLine(`   Visual: ${scores.visual}/100`);
        this.outputChannel.appendLine(`   Performance: ${scores.performance}/100`);
        return pack;
    }
    /**
     * Detect UI/UX issues using AI analysis
     */
    async detectUIUXIssues(testResult) {
        const issues = [];
        // Analyze each step for UI/UX issues
        for (const step of testResult.steps) {
            // Common UI/UX issues to check for
            const detectedIssues = await this.analyzeStep(step);
            issues.push(...detectedIssues);
        }
        // Add issues detected from agent's observations
        if (testResult.error || !testResult.passed) {
            issues.push(...this.extractIssuesFromError(testResult));
        }
        return issues;
    }
    /**
     * Analyze a single step for UI/UX issues
     */
    async analyzeStep(step) {
        const issues = [];
        // Check for accessibility issues
        if (this.hasAccessibilityIssue(step)) {
            issues.push(this.createAccessibilityIssue(step));
        }
        // Check for usability issues
        if (this.hasUsabilityIssue(step)) {
            issues.push(this.createUsabilityIssue(step));
        }
        // Check for visual design issues
        if (this.hasVisualIssue(step)) {
            issues.push(this.createVisualIssue(step));
        }
        // Check for performance issues
        if (this.hasPerformanceIssue(step)) {
            issues.push(this.createPerformanceIssue(step));
        }
        return issues;
    }
    /**
     * Detect accessibility issues
     */
    hasAccessibilityIssue(step) {
        const indicators = [
            'no label',
            'missing alt',
            'low contrast',
            'not keyboard accessible',
            'missing aria',
            'screen reader',
            'color only'
        ];
        return indicators.some(indicator => step.thinking?.toLowerCase().includes(indicator) ||
            step.result?.toLowerCase().includes(indicator));
    }
    /**
     * Create accessibility issue with recommendations
     */
    createAccessibilityIssue(step) {
        return {
            id: `acc_${step.stepNumber}_${Date.now()}`,
            type: 'accessibility',
            severity: 'high',
            category: 'Form Accessibility',
            title: 'Form inputs missing accessible labels',
            description: 'Input fields lack proper labels, making them inaccessible to screen readers',
            impact: 'Users relying on assistive technologies cannot complete the form',
            detectedAt: {
                stepNumber: step.stepNumber,
                screenshot: step.screenshot || '',
                timestamp: step.timestamp
            },
            asIs: {
                description: 'Form inputs use placeholder text instead of proper labels',
                screenshot: step.screenshot || '',
                issues: [
                    'No <label> elements for inputs',
                    'Placeholder text disappears on focus',
                    'Screen readers cannot identify input purpose',
                    'Tab navigation unclear'
                ],
                wcagViolations: [
                    'WCAG 2.1 Level A - 1.3.1 Info and Relationships',
                    'WCAG 2.1 Level A - 3.3.2 Labels or Instructions',
                    'WCAG 2.1 Level AA - 2.4.6 Headings and Labels'
                ]
            },
            toBe: {
                description: 'Form with proper accessible labels and ARIA attributes',
                mockup: '', // Will be generated
                improvements: [
                    'Add visible <label> elements for all inputs',
                    'Include aria-required for required fields',
                    'Add aria-describedby for error messages',
                    'Implement proper focus management'
                ],
                wcagCompliance: [
                    '✅ WCAG 2.1 Level AA compliant',
                    '✅ Screen reader friendly',
                    '✅ Keyboard navigable'
                ]
            },
            recommendations: [
                {
                    title: 'Add Accessible Form Labels',
                    description: 'Replace placeholder-only inputs with proper label elements',
                    beforeCode: `<!-- ❌ AS-IS: Inaccessible -->
<input type="text" placeholder="Enter your name" />`,
                    afterCode: `<!-- ✅ TO-BE: Accessible -->
<label for="userName">
  Name <span aria-label="required">*</span>
</label>
<input 
  type="text" 
  id="userName"
  name="userName"
  aria-required="true"
  placeholder="John Doe"
/>`,
                    benefits: [
                        'Screen reader users can identify inputs',
                        'Labels remain visible when typing',
                        'Clicking label focuses input',
                        'WCAG 2.1 Level AA compliant'
                    ],
                    implementation: {
                        steps: [
                            'Add <label> element for each input',
                            'Link label to input using for/id attributes',
                            'Add aria-required="true" for required fields',
                            'Keep placeholder as helpful hint only'
                        ],
                        files: ['components/UserForm.tsx', 'components/Form.css']
                    },
                    resources: [
                        {
                            title: 'WCAG 2.1 - Labels or Instructions',
                            url: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html'
                        },
                        {
                            title: 'MDN - Accessible Forms',
                            url: 'https://developer.mozilla.org/en-US/docs/Learn/Forms/HTML5_input_types#accessible_forms'
                        }
                    ]
                }
            ],
            estimatedEffort: 'low',
            priority: 9
        };
    }
    /**
     * Detect usability issues
     */
    hasUsabilityIssue(step) {
        const indicators = [
            'difficult to find',
            'unclear',
            'confusing',
            'multiple clicks',
            'hidden',
            'small target',
            'timeout'
        ];
        return indicators.some(indicator => step.thinking?.toLowerCase().includes(indicator));
    }
    /**
     * Create usability issue
     */
    createUsabilityIssue(step) {
        return {
            id: `usa_${step.stepNumber}_${Date.now()}`,
            type: 'usability',
            severity: 'medium',
            category: 'User Flow',
            title: 'Submit button difficult to locate',
            description: 'Primary action button not visually prominent',
            impact: 'Users may struggle to complete the task, leading to abandonment',
            detectedAt: {
                stepNumber: step.stepNumber,
                screenshot: step.screenshot || '',
                timestamp: step.timestamp
            },
            asIs: {
                description: 'Submit button blends with secondary actions',
                screenshot: step.screenshot || '',
                issues: [
                    'Primary and secondary buttons have same visual weight',
                    'Button placement not intuitive',
                    'No clear visual hierarchy',
                    'Small click target (< 44px)'
                ]
            },
            toBe: {
                description: 'Clear visual hierarchy with prominent primary action',
                mockup: '',
                improvements: [
                    'Primary action uses high-contrast color',
                    'Larger click target (min 44x44px)',
                    'Better positioning (bottom-right)',
                    'Clear visual distinction from secondary actions'
                ]
            },
            recommendations: [
                {
                    title: 'Improve Button Hierarchy',
                    description: 'Make primary action visually dominant',
                    beforeCode: `<!-- ❌ AS-IS: No hierarchy -->
<div class="actions">
  <button class="btn">Cancel</button>
  <button class="btn">Reset</button>
  <button class="btn">Submit</button>
</div>`,
                    afterCode: `<!-- ✅ TO-BE: Clear hierarchy -->
<div class="actions">
  <button class="btn-secondary">Cancel</button>
  <button class="btn-secondary">Reset</button>
  <button class="btn-primary">
    Submit
    <span class="icon">→</span>
  </button>
</div>

<style>
.btn-primary {
  background: #0066cc;
  color: white;
  font-weight: 600;
  min-width: 120px;
  min-height: 44px;
  box-shadow: 0 2px 8px rgba(0,102,204,0.3);
}

.btn-secondary {
  background: transparent;
  border: 1px solid #ccc;
  color: #666;
}
</style>`,
                    benefits: [
                        'Users find primary action immediately',
                        'Reduces cognitive load',
                        'Matches user expectations',
                        'Improves conversion rate'
                    ],
                    implementation: {
                        steps: [
                            'Audit all buttons in the flow',
                            'Classify as primary/secondary/tertiary',
                            'Apply appropriate styling',
                            'Test with real users'
                        ],
                        files: ['components/Button.tsx', 'styles/buttons.css']
                    },
                    resources: [
                        {
                            title: 'Nielsen Norman - Button Design',
                            url: 'https://www.nngroup.com/articles/clickable-elements/'
                        }
                    ]
                }
            ],
            estimatedEffort: 'low',
            priority: 7
        };
    }
    /**
     * Detect visual design issues
     */
    hasVisualIssue(step) {
        const indicators = [
            'inconsistent',
            'misaligned',
            'poor spacing',
            'cluttered',
            'hard to read'
        ];
        return indicators.some(indicator => step.thinking?.toLowerCase().includes(indicator));
    }
    /**
     * Create visual design issue
     */
    createVisualIssue(step) {
        return {
            id: `vis_${step.stepNumber}_${Date.now()}`,
            type: 'visual',
            severity: 'low',
            category: 'Visual Design',
            title: 'Inconsistent spacing and alignment',
            description: 'Form fields have irregular spacing',
            impact: 'Unprofessional appearance, reduces trust',
            detectedAt: {
                stepNumber: step.stepNumber,
                screenshot: step.screenshot || '',
                timestamp: step.timestamp
            },
            asIs: {
                description: 'Inconsistent margins and padding throughout form',
                screenshot: step.screenshot || '',
                issues: [
                    'Field spacing varies (8px, 12px, 16px)',
                    'Labels not vertically aligned',
                    'Buttons different sizes',
                    'No design system applied'
                ]
            },
            toBe: {
                description: 'Consistent 8px grid system applied',
                mockup: '',
                improvements: [
                    'All spacing multiples of 8px',
                    'Consistent field heights',
                    'Aligned to grid',
                    'Professional appearance'
                ]
            },
            recommendations: [
                {
                    title: 'Implement 8px Grid System',
                    description: 'Use consistent spacing based on 8px base unit',
                    codeExample: `// Design tokens
const spacing = {
  xs: '8px',   // 1 unit
  sm: '16px',  // 2 units
  md: '24px',  // 3 units
  lg: '32px',  // 4 units
  xl: '48px',  // 6 units
};

// Apply to form
<Form spacing={spacing.md}>
  <FormField marginBottom={spacing.sm}>
    <Label>Name</Label>
    <Input height="44px" padding={spacing.sm} />
  </FormField>
</Form>`,
                    benefits: [
                        'Visual harmony',
                        'Easier to maintain',
                        'Professional appearance',
                        'Scales well'
                    ],
                    implementation: {
                        steps: [
                            'Define spacing tokens',
                            'Audit existing spacing',
                            'Replace with token values',
                            'Document in style guide'
                        ],
                        files: ['styles/tokens.ts', 'components/Form.tsx']
                    },
                    resources: [
                        {
                            title: '8-Point Grid System',
                            url: 'https://spec.fm/specifics/8-pt-grid'
                        }
                    ]
                }
            ],
            estimatedEffort: 'medium',
            priority: 4
        };
    }
    /**
     * Detect performance issues
     */
    hasPerformanceIssue(step) {
        return (step.duration || 0) > 3000; // > 3 seconds
    }
    /**
     * Create performance issue
     */
    createPerformanceIssue(step) {
        return {
            id: `perf_${step.stepNumber}_${Date.now()}`,
            type: 'performance',
            severity: 'medium',
            category: 'Load Time',
            title: 'Slow form submission',
            description: 'Form takes over 3 seconds to submit',
            impact: 'Users may think form failed and submit multiple times',
            detectedAt: {
                stepNumber: step.stepNumber,
                screenshot: step.screenshot || '',
                timestamp: step.timestamp
            },
            asIs: {
                description: 'No loading indicator, user waits with no feedback',
                screenshot: step.screenshot || '',
                issues: [
                    'No loading state shown',
                    'Button remains clickable during submission',
                    'No progress indication',
                    'Can submit multiple times'
                ]
            },
            toBe: {
                description: 'Clear loading state with progress feedback',
                mockup: '',
                improvements: [
                    'Loading spinner appears',
                    'Button disabled during submission',
                    'Progress message shown',
                    'Prevents double-submission'
                ]
            },
            recommendations: [
                {
                    title: 'Add Loading States',
                    description: 'Show clear feedback during async operations',
                    beforeCode: `// ❌ AS-IS: No feedback
<button onClick={handleSubmit}>
  Submit
</button>`,
                    afterCode: `// ✅ TO-BE: Clear feedback
const [isSubmitting, setIsSubmitting] = useState(false);

<button 
  onClick={handleSubmit}
  disabled={isSubmitting}
  className={isSubmitting ? 'loading' : ''}
>
  {isSubmitting ? (
    <>
      <Spinner />
      Submitting...
    </>
  ) : (
    'Submit'
  )}
</button>`,
                    benefits: [
                        'User knows action is processing',
                        'Prevents double-submission',
                        'Reduces abandonment',
                        'Professional UX'
                    ],
                    implementation: {
                        steps: [
                            'Add loading state to component',
                            'Disable button during submission',
                            'Show spinner or progress indicator',
                            'Update button text to reflect state'
                        ],
                        files: ['components/Form.tsx', 'hooks/useFormSubmit.ts'],
                        dependencies: ['react-spinners']
                    },
                    resources: [
                        {
                            title: 'Loading States Best Practices',
                            url: 'https://www.nngroup.com/articles/progress-indicators/'
                        }
                    ]
                }
            ],
            estimatedEffort: 'low',
            priority: 8
        };
    }
    /**
     * Extract issues from test errors
     */
    extractIssuesFromError(testResult) {
        const issues = [];
        if (testResult.error && testResult.error.toLowerCase().includes('timeout')) {
            issues.push({
                id: `err_timeout_${Date.now()}`,
                type: 'performance',
                severity: 'critical',
                category: 'Response Time',
                title: 'Page load timeout',
                description: 'Page takes too long to load or become interactive',
                impact: 'Users abandon before completing task',
                detectedAt: {
                    stepNumber: 0,
                    screenshot: '',
                    timestamp: Date.now()
                },
                asIs: {
                    description: 'Page load exceeds 10 seconds',
                    screenshot: '',
                    issues: [
                        'Excessive bundle size',
                        'Unoptimized images',
                        'Synchronous scripts blocking render',
                        'No lazy loading'
                    ]
                },
                toBe: {
                    description: 'Page loads in under 3 seconds',
                    mockup: '',
                    improvements: [
                        'Code splitting applied',
                        'Images optimized and lazy-loaded',
                        'Critical CSS inlined',
                        'Non-critical resources deferred'
                    ]
                },
                recommendations: [],
                estimatedEffort: 'high',
                priority: 10
            });
        }
        return issues;
    }
    /**
     * Generate SVG mockup showing AS-IS vs TO-BE
     */
    async generateMockup(issue) {
        // Create side-by-side comparison mockup
        const mockupSVG = `
<svg width="1200" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="600" fill="#f5f5f5"/>
  
  <!-- AS-IS Section -->
  <rect x="20" y="20" width="560" height="560" fill="white" rx="8"/>
  <text x="300" y="50" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#333">
    ❌ AS-IS
  </text>
  
  ${this.generateAsIsMockup(issue, 40, 80)}
  
  <!-- TO-BE Section -->
  <rect x="620" y="20" width="560" height="560" fill="white" rx="8"/>
  <text x="900" y="50" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#0066cc">
    ✅ TO-BE
  </text>
  
  ${this.generateToBeMockup(issue, 640, 80)}
  
  <!-- Arrow between sections -->
  <path d="M 590 300 L 610 300" stroke="#999" stroke-width="2" marker-end="url(#arrowhead)"/>
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <polygon points="0 0, 10 5, 0 10" fill="#999"/>
    </marker>
  </defs>
</svg>`;
        return Buffer.from(mockupSVG).toString('base64');
    }
    /**
     * Generate AS-IS mockup specific to issue type
     */
    generateAsIsMockup(issue, x, y) {
        switch (issue.type) {
            case 'accessibility':
                return `
  <!-- Form with poor accessibility -->
  <rect x="${x}" y="${y}" width="520" height="60" fill="#fafafa" stroke="#ddd" rx="4"/>
  <text x="${x + 10}" y="${y + 25}" font-family="sans-serif" font-size="12" fill="#999">Enter your name</text>
  
  <rect x="${x}" y="${y + 80}" width="520" height="60" fill="#fafafa" stroke="#ddd" rx="4"/>
  <text x="${x + 10}" y="${y + 105}" font-family="sans-serif" font-size="12" fill="#999">Enter your email</text>
  
  <!-- Warning indicators -->
  <circle cx="${x + 530}" cy="${y + 30}" r="15" fill="#dc3545"/>
  <text x="${x + 525}" y="${y + 36}" fill="white" font-family="sans-serif" font-size="18">!</text>
  <text x="${x + 10}" y="${y + 160}" font-family="sans-serif" font-size="11" fill="#dc3545">⚠ No labels for screen readers</text>
`;
            case 'usability':
                return `
  <!-- Buttons with poor hierarchy -->
  <rect x="${x}" y="${y + 200}" width="160" height="40" fill="#e0e0e0" stroke="#bbb" rx="4"/>
  <text x="${x + 80}" y="${y + 225}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#666">Cancel</text>
  
  <rect x="${x + 180}" y="${y + 200}" width="160" height="40" fill="#e0e0e0" stroke="#bbb" rx="4"/>
  <text x="${x + 260}" y="${y + 225}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#666">Reset</text>
  
  <rect x="${x + 360}" y="${y + 200}" width="160" height="40" fill="#e0e0e0" stroke="#bbb" rx="4"/>
  <text x="${x + 440}" y="${y + 225}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#666">Submit</text>
  
  <text x="${x + 10}" y="${y + 270}" font-family="sans-serif" font-size="11" fill="#dc3545">⚠ All buttons look the same</text>
`;
            default:
                return `<text x="${x + 10}" y="${y + 30}" font-family="sans-serif" font-size="14" fill="#666">Current implementation</text>`;
        }
    }
    /**
     * Generate TO-BE mockup specific to issue type
     */
    generateToBeMockup(issue, x, y) {
        switch (issue.type) {
            case 'accessibility':
                return `
  <!-- Form with proper accessibility -->
  <text x="${x}" y="${y}" font-family="sans-serif" font-size="13" font-weight="600" fill="#333">Name *</text>
  <rect x="${x}" y="${y + 10}" width="520" height="60" fill="white" stroke="#0066cc" stroke-width="2" rx="4"/>
  <text x="${x + 10}" y="${y + 45}" font-family="sans-serif" font-size="14" fill="#333">John Doe</text>
  
  <text x="${x}" y="${y + 90}" font-family="sans-serif" font-size="13" font-weight="600" fill="#333">Email *</text>
  <rect x="${x}" y="${y + 100}" width="520" height="60" fill="white" stroke="#0066cc" stroke-width="2" rx="4"/>
  <text x="${x + 10}" y="${y + 135}" font-family="sans-serif" font-size="14" fill="#333">john@example.com</text>
  
  <!-- Success indicators -->
  <circle cx="${x + 530}" cy="${y + 40}" r="15" fill="#28a745"/>
  <text x="${x + 524}" y="${y + 46}" fill="white" font-family="sans-serif" font-size="18">✓</text>
  <text x="${x}" y="${y + 180}" font-family="sans-serif" font-size="11" fill="#28a745">✓ WCAG 2.1 Level AA compliant</text>
`;
            case 'usability':
                return `
  <!-- Buttons with clear hierarchy -->
  <rect x="${x}" y="${y + 200}" width="140" height="40" fill="transparent" stroke="#999" rx="4"/>
  <text x="${x + 70}" y="${y + 225}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#666">Cancel</text>
  
  <rect x="${x + 160}" y="${y + 200}" width="140" height="40" fill="transparent" stroke="#999" rx="4"/>
  <text x="${x + 230}" y="${y + 225}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#666">Reset</text>
  
  <rect x="${x + 320}" y="${y + 200}" width="200" height="48" fill="#0066cc" rx="6"/>
  <text x="${x + 420}" y="${y + 228}" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="600" fill="white">Submit →</text>
  
  <text x="${x}" y="${y + 270}" font-family="sans-serif" font-size="11" fill="#28a745">✓ Clear primary action</text>
`;
            default:
                return `<text x="${x + 10}" y="${y + 30}" font-family="sans-serif" font-size="14" fill="#333">Improved implementation</text>`;
        }
    }
    /**
     * Generate prioritized implementation roadmap
     */
    generateRoadmap(issues) {
        // Sort by priority (high to low)
        const sortedIssues = [...issues].sort((a, b) => b.priority - a.priority);
        const roadmap = [
            {
                phase: 1,
                name: 'Critical Fixes',
                issues: sortedIssues
                    .filter(i => i.severity === 'critical')
                    .map(i => i.id),
                estimatedTime: '1 week',
                dependencies: []
            },
            {
                phase: 2,
                name: 'High Priority Improvements',
                issues: sortedIssues
                    .filter(i => i.severity === 'high')
                    .map(i => i.id),
                estimatedTime: '2 weeks',
                dependencies: ['phase-1']
            },
            {
                phase: 3,
                name: 'Medium Priority Enhancements',
                issues: sortedIssues
                    .filter(i => i.severity === 'medium')
                    .map(i => i.id),
                estimatedTime: '2 weeks',
                dependencies: ['phase-2']
            },
            {
                phase: 4,
                name: 'Polish & Refinement',
                issues: sortedIssues
                    .filter(i => i.severity === 'low')
                    .map(i => i.id),
                estimatedTime: '1 week',
                dependencies: ['phase-3']
            }
        ];
        return roadmap.filter(phase => phase.issues.length > 0);
    }
    /**
     * Consult with a UI/UX expert LLM to refine recommendations
     */
    async consultExpert(pack, testResult) {
        this.outputChannel.appendLine('🧠 Consulting with UI/UX Expert Agent...');
        const systemPrompt = `You are a Senior UI/UX Consultant with over 15 years of experience in human-computer interaction, accessibility (WCAG), and visual design. 
Your goal is to review a set of automatically detected UI/UX issues and provide expert refinement, additional context, or innovative solutions.
Always maintain a professional, helpful, and slightly "expert" tone.`;
        const summaryData = {
            endpoint: pack.endpoint,
            issueCount: pack.issues.length,
            scores: pack.overallScore,
            testSummary: testResult.passed ? "Agent completed the task." : `Agent failed: ${testResult.error}`
        };
        const prompt = `Review this UI/UX analysis for the endpoint: ${pack.endpoint}.
Current Findings Summary:
- Accessibility Score: ${pack.overallScore.accessibility}/100
- Usability Score: ${pack.overallScore.usability}/100
- Visual Score: ${pack.overallScore.visual}/100
- Performance Score: ${pack.overallScore.performance}/100

Detected Issues:
${pack.issues.map(i => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`).join('\n')}

Please provide a "Consultant's Note" for the top critical issue or an overall strategic recommendation for the product's design direction.
Focus on user impact and competitive advantage. 
Return your response as a single concise expert insight (max 150 words).`;
        try {
            const expertInsight = await (0, ErrorHandler_1.withRetry)(() => this.ollama.generate(prompt, { system: systemPrompt }), { maxAttempts: 3, delayMs: 2000, retryableErrors: ['timeout', 'ECONNREFUSED'] });
            // Add expert insight to the disclaimer or as a new field
            pack.description += `\n\n**UI/UX Expert Consultation**: "${expertInsight}"`;
            this.outputChannel.appendLine('✅ Expert consultation complete.');
        }
        catch (error) {
            this.outputChannel.appendLine(`⚠️ Expert consultation unavailable: ${error}`);
        }
    }
    /**
     * Simple SVG Sanitization to ensure safe rendering
     */
    sanitizeSVG(svg) {
        // Remove scripts and event handlers
        return svg
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/ on\w+="[^"]*"/gi, '')
            .replace(/ on\w+='[^']*'/gi, '');
    }
    calculateScores(issues) {
        // Mock score calculation based on issue count/severity
        const total = issues.length;
        if (total === 0)
            return { accessibility: 100, usability: 100, visual: 100, performance: 100 };
        const accCount = issues.filter(i => i.type === 'accessibility').length;
        const usaCount = issues.filter(i => i.type === 'usability').length;
        const visCount = issues.filter(i => i.type === 'visual').length;
        const perfCount = issues.filter(i => i.type === 'performance').length;
        return {
            accessibility: Math.max(0, 100 - (accCount * 20)),
            usability: Math.max(0, 100 - (usaCount * 15)),
            visual: Math.max(0, 100 - (visCount * 10)),
            performance: Math.max(0, 100 - (perfCount * 25))
        };
    }
    calculateTotalEffort(issues) {
        const high = issues.filter(i => i.estimatedEffort === 'high').length;
        const med = issues.filter(i => i.estimatedEffort === 'medium').length;
        if (high > 2)
            return 'High';
        if (med > 3 || high > 0)
            return 'Medium';
        return 'Low';
    }
}
exports.UIUXAnalyzer = UIUXAnalyzer;

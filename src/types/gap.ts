export interface Gap {
    id: string;
    type: string;
    severity: string;
    description: string;
    filePath: string;
    lineNumber: number;
    framework?: string;
    tags?: string[];
    endpoint?: string;
    method?: string;
    expectedResponse?: string;
    actualResponse?: string;
    testFramework?: string;
    metadata?: any;
}

# Architecture Diagram Generation

RepoSense now supports automatic generation of architecture diagrams to visualize UI/UX defects and proposed improvements.

## Features

### Multi-Level Diagrams

Generate architecture diagrams at three levels of detail:

- **L1 (Level 1)**: High-level system overview showing major components and their relationships
- **L2 (Level 2)**: Detailed component interactions and data flows
- **L3 (Level 3)**: Technical implementation details including UI/UX patterns

### As-Is vs To-Be

For each level, you can generate:

- **As-Is Diagrams**: Show the current architecture with defects highlighted
  - Problematic components marked with red borders
  - Broken connections shown as dashed lines
  - Defect annotations on affected components
  
- **To-Be Diagrams**: Show the improved architecture after remediation
  - New components/endpoints shown in blue
  - Fixed components shown in green
  - All connections restored as solid lines

- **Comparison View**: Side-by-side comparison with detailed difference analysis

### Diagram Format

Diagrams are generated in **Mermaid** format, which:
- Renders automatically in VS Code's markdown preview
- Renders on GitHub, GitLab, and other platforms
- Can be exported to PNG/SVG using Mermaid CLI or online tools
- Is human-readable as text
- Can be edited manually if needed

## Usage

### Generate Standalone Diagrams

1. Run a RepoSense scan to identify gaps
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run `RepoSense: Generate Architecture Diagrams`
4. Select the diagram level (L1, L2, or L3)
5. Select the diagram type:
   - As-Is (Current State)
   - To-Be (Proposed State)
   - Comparison (Side-by-side)
6. Diagrams are saved to `diagrams/` folder in your workspace

### Generate Reports with Diagrams

1. Run a RepoSense scan
2. Open the Command Palette
3. Run `RepoSense: Generate Executive Report`
4. Select `Markdown with Diagrams`
5. Report is saved to `reports/` folder with embedded diagrams

## UI/UX Defect Categories

The diagram generator identifies and visualizes:

- **Component Structure**: Orphaned API calls, missing endpoints
- **Data Flow**: Type mismatches, improper data handling
- **State Management**: State-related issues
- **Performance**: Performance bottlenecks
- **Accessibility**: Accessibility gaps
- **User Interaction**: Interaction pattern issues
- **Rendering**: Rendering and layout problems

## Integration with AI Assistant

Diagrams are generated using:
- Static analysis of your codebase
- Gap analysis results from RepoSense
- AI-powered architectural recommendations from Ollama

The AI assistant:
- Analyzes component relationships
- Identifies architectural patterns and anti-patterns
- Suggests improvements based on best practices
- Generates remediation strategies

## Configuration

No special configuration needed. The feature uses your existing Ollama setup.

Required:
- Ollama running locally (default: `http://localhost:11434`)
- A code model installed (e.g., `deepseek-coder:6.7b`)

## Export Options

### Mermaid Source
Diagrams are saved as Markdown files with Mermaid code blocks, viewable in:
- VS Code (with Markdown Preview)
- GitHub/GitLab/Bitbucket
- Any Markdown viewer with Mermaid support

### PNG/SVG Export
To export to PNG or SVG:

1. **Using Mermaid CLI**:
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   mmdc -i diagram.md -o diagram.png
   ```

2. **Using Mermaid Live Editor**:
   - Copy the Mermaid code
   - Paste into https://mermaid.live
   - Download as PNG or SVG

3. **Using VS Code Extensions**:
   - Install "Markdown Preview Mermaid Support"
   - Preview and screenshot diagrams

## Tips

- **L1 diagrams** are best for executive presentations
- **L2 diagrams** are ideal for developer discussions
- **L3 diagrams** provide deep technical analysis (may be complex for large codebases)
- Use **comparison view** to show before/after in meetings
- Include diagrams in **pull requests** to visualize changes

## Limitations

- Diagram complexity increases with codebase size
- Very large codebases may need L1/L2 only
- AI analysis requires Ollama to be running
- First generation may be slow as AI analyzes architecture

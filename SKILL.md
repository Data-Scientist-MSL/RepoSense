---
name: RepoSense Development
description: Tools for building, testing, and packaging the RepoSense VS Code extension.
---

# RepoSense Development Skill

This skill provides capabilities to develop, test, and package the RepoSense extension.

## Tools

### `reposense_build`
Builds the extension source code using the project's build script.
- **Command**: `npm run compile`

### `reposense_lint`
Runs static analysis on the codebase to identify potential issues.
- **Command**: `npm run lint`

### `reposense_test`
Runs the test suite. 
- **Command**: `npm run test:unit` (Unit tests)
- **Command**: `npm test` (Integration tests - Note: May require UI or virtual framebuffer)

### `reposense_package`
Packages the extension into a VSIX file for distribution.
- **Command**: `vsce package` (Requires `vsce` installed globally or use `npx vsce package`)

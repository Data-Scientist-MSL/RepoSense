# AI Chat Assistant Guide

The RepoSense AI Chat Assistant provides interactive guidance for understanding and fixing code gaps detected during repository analysis.

## Features

### Context-Aware Assistance
- Automatically receives context about detected gaps
- Understands severity levels and gap types
- Provides specific recommendations based on your codebase

### Interactive Conversations
- Ask follow-up questions
- Get clarification on recommendations
- Explore pros and cons of different approaches
- Request examples and best practices

### Conversation Management
- Export chat history to text or markdown
- Clear conversation to start fresh
- Maintains conversation context for better responses

## How to Use

### Opening the Chat
1. **From Command Palette** (Ctrl/Cmd+Shift+P):
   - Type "RepoSense: Open AI Assistant Chat"
   - Press Enter

2. **After Running Analysis**:
   - The chat will automatically receive context about found gaps
   - Critical and high-priority gaps are highlighted in prompts

### Example Questions

#### Understanding Gaps
- "What are the critical gaps in my codebase?"
- "Explain the security implications of the missing endpoint gap"
- "Why is this considered a high-priority issue?"

#### Getting Remediation Help
- "How do I fix the missing endpoint for /api/users?"
- "What's the best way to add test coverage for this endpoint?"
- "Show me an example of implementing this fix"

#### Exploring Options
- "What are the pros and cons of using Playwright vs Cypress?"
- "Should I fix this gap immediately or can it wait?"
- "What's the impact on performance if I make this change?"

## Requirements

### Ollama Setup
The AI chat requires Ollama to be running. See the main README for installation instructions.

## Tips for Best Results

### Be Specific
❌ "Fix my code"
✅ "How do I add error handling to the /api/users POST endpoint?"

### Provide Context
- Reference specific gaps from the analysis
- Mention severity levels when asking about priorities
- Include framework/language context when relevant

### Use Conversation Features
- **Export**: Save important conversations for documentation
- **Clear**: Start fresh when switching to a different topic
- **Context**: The chat automatically sees your gap analysis data

## Privacy & Data

- **Local Processing**: All AI processing happens locally via Ollama
- **No External Calls**: Your code never leaves your machine
- **Zero Cost**: No API keys or cloud services required
- **Offline Capable**: Works without internet (after model download)

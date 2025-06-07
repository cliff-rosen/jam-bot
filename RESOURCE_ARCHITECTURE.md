# External System Architecture

## Overview

The external system architecture introduces a clear separation between **user-provided data**, **external systems**, and **tools** that access those systems. This eliminates confusion about what should be mission inputs and creates a clean, reusable component model.

## Core Concepts

### 1. **External Systems** - Accessed Through Tools
External systems represent services that specific tools can access:
- **Gmail** - Accessed by email tools  
- **PubMed** - Accessed by research search tools
- **Web Search** - Accessed by web search tools
- **Dropbox** - Accessed by file storage tools

**Key Insight**: External systems are not presented separately - they're integrated into tool descriptions where they're relevant.

### 2. **Mission Inputs** - Only User-Provided Data
Mission inputs are **ONLY** things the user directly provides:

✅ **Valid Mission Inputs**:
- Files uploaded by user
- Text entered by user  
- External system credentials (OAuth tokens, API keys)
- Configuration parameters

❌ **NOT Mission Inputs** (these are intermediate assets):
- Emails from Gmail
- Research articles from PubMed
- Files from Dropbox
- Social media posts
- Web search results

### 3. **Tools with Integrated External System Context**
Tools show their external system requirements directly in their descriptions:

```
## Available Tools
- **email_search**: Search Gmail emails (Requires External System: Gmail - needs OAuth credentials)
- **pubmed_search**: Search research articles (Requires External System: PubMed - needs API key)  
- **extract**: Extract information from data (External System: None - processes data directly)
- **summarize**: Create summaries (External System: None - processes data directly)
```

### 4. **Hop Steps** Reference Both Tool and Credentials
Hop steps specify the tool and which credential asset to use:
```json
{
  "tool_id": "email_search",
  "external_system_connection_asset": "gmail_credentials_asset_id",
  "parameters": {
    "query": "AI newsletters",
    "limit": 100
  }
}
```

## Benefits

### 1. **Eliminates Duplication**
No separate "Available Resources" section - external system info appears contextually with tools that use them.

### 2. **Clear Data Flow**
- User provides credentials → Mission Input
- Tool uses credentials to access external system → Retrieves external data
- External data becomes intermediate asset → Can be processed by other tools

### 3. **Intuitive Understanding**
- "To get emails, I need the email_search tool + Gmail credentials"
- "To process data, I just need the extract tool (no external system)"

### 4. **Reduced Cognitive Load**
Agents don't need to cross-reference separate tool and resource lists.

## Example: AI Newsletter Analysis Mission

### Integrated Tool Presentation
```
## Available Tools
- **email_search**: Search and retrieve emails from Gmail (Requires External System: Gmail - needs OAuth credentials)
- **extract**: Extract information from items (External System: None - processes data directly)
- **summarize**: Create content summaries (External System: None - processes data directly)
```

### Mission Definition
```json
{
  "inputs": [
    {
      "name": "Gmail Credentials",
      "type": "config",
      "subtype": "oauth_token",
      "role": "input",
      "external_system_for": "gmail"
    },
    {
      "name": "Search Keywords", 
      "type": "config",
      "subtype": "string",
      "role": "input"
    }
  ],
  "intermediate_assets": [
    {
      "name": "Retrieved Emails",
      "type": "object", 
      "role": "intermediate",
      "description": "Emails retrieved from Gmail using keywords"
    }
  ]
}
```

### Hop Implementation
```json
{
  "tool_id": "email_search",
  "external_system_connection_asset": "gmail_credentials",
  "parameters": {
    "query": "${search_keywords}",
    "limit": 100
  },
  "output_mapping": {
    "emails": "retrieved_emails_asset"
  }
}
```

## Architecture Principles

### 1. **Context Over Separation**
Instead of listing external systems separately, embed their information where it's used (in tool descriptions).

### 2. **Functional Relationships**
External systems only matter in the context of tools that access them.

### 3. **User Mental Model**
Users think: "I want to get emails" → "I need email tool + Gmail access"
Not: "What external systems are available?" → "Which tools use Gmail?"

## File Structure

```
backend/schemas/
  ├── tools.py             # Tools with embedded external system info
  └── tools.json           # Tools with external system requirements

frontend/src/types/
  └── schema.ts            # Asset schemas with external_system_for field

agents/prompts/
  └── mission_prompt.py    # Integrated tool descriptions
```

## Implementation Status

✅ **Completed**:
- Tool definitions with external system context
- Integrated tool descriptions in mission prompt  
- Simplified mission prompt without separate resource section
- Updated primary agent to handle external_system_for field

🔄 **Next Steps**:
- Update tool execution to use external system connections
- Add external system credential validation
- Implement external system-specific error handling

This architecture provides a clean foundation for building complex workflows while maintaining simplicity and clarity about data sources and tool capabilities - without the duplication of separate resource listings. 
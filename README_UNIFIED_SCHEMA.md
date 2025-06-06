# Unified Schema System - Quick Reference

## 🎯 Problem Solved
Previously had **4 different schema systems**:
- Assets (frontend vs backend mismatch)
- Tool parameters (multiple formats)
- Tool outputs (different structures) 
- StateVariables (deprecated)

## ✅ Solution
**One unified schema** that works for everything:

```typescript
// Every schema entity has these
interface SchemaEntity {
    id: string;
    name: string; 
    description: string;
    schema: SchemaType;  // The actual structure definition
}

// Assets = Schema + Value (actual data)
interface Asset extends SchemaEntity {
    value?: any;  // The actual content
    // ... metadata
}

// Tools = Schema Only (no data, just structure)
interface ToolParameter extends SchemaEntity {
    required?: boolean;
    default?: any;
}
```

## 📁 Files
- **Frontend**: `frontend/src/types/schema.ts`
- **Backend**: `backend/schemas/unified_schema.py` 
- **Integration**: `workflow.ts`, `toolsApi.ts`, `tools.py`
- **Docs**: `docs/UNIFIED_SCHEMA.md`

## 🚀 Usage

```typescript
// Import unified types
import { Asset, ToolDefinition, SchemaType } from './types/schema';

// Create an asset
const asset: Asset = {
    id: "email-1",
    name: "User Email",
    description: "Email from user",
    schema: {
        type: "email",
        description: "Email data structure", 
        is_array: false,
        fields: {
            subject: { type: "string", description: "Subject", is_array: false },
            body: { type: "string", description: "Body", is_array: false }
        }
    },
    value: { subject: "Hello", body: "World" },
    // ... metadata
};

// Check schema compatibility
if (isCompatibleSchema(sourceSchema, targetSchema)) {
    // Can map data between schemas
}
```

## 🔥 Benefits
- **Single source of truth** for all schemas
- **Type safety** across frontend/backend
- **Schema compatibility** checking built-in
- **Clean API** - id, name, description + schema
- **No migration headaches** - you handle manually

Ready to use! 🎉 
# Unified Schema System

## Overview

The Unified Schema System homogenizes the previously fragmented schema definitions across assets, tool parameters, and tool outputs. This system provides a single, consistent way to define data structures throughout the application.

## Core Principles

1. **Universal `id`, `name`, `description`** - Every schema entity has these three fields
2. **Single `SchemaType`** - One schema definition that works for all use cases  
3. **Assets = Schema + Value** - Assets extend the base schema with actual data
4. **Tools = Schema Only** - Tool parameters/outputs define structure without data

## Architecture

### Base Types

```typescript
// Core value types
type PrimitiveType = 'string' | 'number' | 'boolean';
type CustomType = 'email' | 'webpage' | 'search_result' | 'pubmed_article' | 'newsletter' | 'daily_newsletter_recap';
type ComplexType = 'object' | 'file' | 'database_entity' | CustomType;
type ValueType = PrimitiveType | ComplexType;

// Universal schema definition
interface SchemaType {
    type: ValueType;
    description?: string;
    is_array: boolean;
    fields?: Record<string, SchemaType>;  // for nested objects
}
```

### Schema Entities

```typescript
// Base entity - used by both assets and tool params/outputs
interface SchemaEntity {
    id: string;
    name: string;
    description: string;
    schema: SchemaType;
}

// Assets extend with actual value
interface Asset extends SchemaEntity {
    value?: any;  // the actual data content
    subtype?: CustomType;
    is_collection: boolean;
    collection_type?: 'array' | 'map' | 'set' | 'null';
    asset_metadata: {
        createdAt: string;
        updatedAt: string;
        creator: string | null;
        tags: string[];
        agent_associations: string[];
        version: number;
        token_count: number;
    };
}

// Tool parameters/outputs are just schema definitions
interface ToolParameter extends SchemaEntity {
    required?: boolean;
    default?: any;
    examples?: any[];
}

interface ToolOutput extends SchemaEntity {
    examples?: any[];
}

interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    parameters: ToolParameter[];
    outputs: ToolOutput[];
    examples?: Array<{
        description: string;
        input: Record<string, any>;
        output: Record<string, any>;
    }>;
}
```

## Usage Examples

### Creating a New Asset

```typescript
import { Asset } from './types/schema';

const newAsset: Asset = {
    id: "user-profile",
    name: "User Profile",
    description: "User profile information",
    schema: {
        type: "object",
        description: "User profile data structure",
        is_array: false,
        fields: {
            name: { type: "string", description: "User name", is_array: false },
            email: { type: "string", description: "User email", is_array: false },
            preferences: { type: "object", description: "User preferences", is_array: false }
        }
    },
    value: {
        name: "John Doe",
        email: "john@example.com", 
        preferences: { theme: "dark" }
    },
    is_collection: false,
    asset_metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creator: null,
        tags: [],
        agent_associations: [],
        version: 1,
        token_count: 0
    }
};
```

### Creating a Tool Definition

```typescript
import { ToolDefinition } from './types/schema';

const newTool: ToolDefinition = {
    id: "user_lookup",
    name: "User Lookup",
    description: "Look up user by email",
    category: "data_retrieval",
    parameters: [{
        id: "user_lookup_email",
        name: "email", 
        description: "User email to lookup",
        schema: {
            type: "string",
            description: "Valid email address",
            is_array: false
        },
        required: true
    }],
    outputs: [{
        id: "user_lookup_profile",
        name: "profile",
        description: "User profile data",
        schema: {
            type: "object",
            description: "User profile information",
            is_array: false,
            fields: {
                name: { type: "string", description: "User name", is_array: false },
                email: { type: "string", description: "User email", is_array: false }
            }
        }
    }]
};
```

### Schema Compatibility Checking

```typescript
import { isCompatibleSchema } from './types/schema';

const sourceSchema = { type: "string", is_array: false };
const targetSchema = { type: "email", is_array: false };

if (isCompatibleSchema(sourceSchema, targetSchema)) {
    // Schemas are compatible - can map data between them
}
```

## Utility Functions

The schema system includes several utility functions:

- `isCompatibleSchema(sourceSchema, targetSchema)` - Check if two schemas are compatible for data mapping
- `isCustomType(type)` - Check if a type is a custom type (email, webpage, etc.)
- `isPrimitiveType(type)` - Check if a type is a primitive type (string, number, boolean)

## Benefits

1. **Consistency**: Single schema definition across all data types
2. **Type Safety**: Strong TypeScript typing for all schema operations
3. **Compatibility**: Built-in schema compatibility checking
4. **Flexibility**: Supports both simple and complex nested data structures
5. **Validation**: Built-in validation for schema correctness
6. **Simplicity**: Clean, minimal API with clear semantics

## File Structure

- **Frontend**: `frontend/src/types/schema.ts` - TypeScript definitions
- **Backend**: `backend/schemas/unified_schema.py` - Python/Pydantic equivalents
- **Integration**: Updated in `workflow.ts`, `toolsApi.ts`, and backend routes

## Usage in the Codebase

### Frontend
```typescript
import { Asset, ToolDefinition, SchemaType } from './types/schema';
```

### Backend
```python
from schemas.unified_schema import Asset, ToolDefinition, SchemaType
```

This unified schema system provides a solid foundation for consistent data modeling across the entire application. 
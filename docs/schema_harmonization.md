# Schema Harmonization Guide

## Overview
This document outlines the harmonization of schemas between frontend and backend, focusing on tools, resources, assets, and workflow components. The goal is to maintain a single source of truth for all schema definitions while ensuring type safety and consistency across the entire application.

## Current Files Structure

### Frontend
```
frontend/src/types/
├── schema.ts      # Core schema definitions (assets, resources, tools)
├── workflow.ts    # Workflow-specific types (missions, hops, steps)
└── tool.ts        # Tool-specific types and utilities
```

### Backend
```
backend/schemas/
├── unified_schema.py    # Core schema definitions (assets, resources, tools)
├── resource.py          # Resource-specific types and validation
├── tools.py            # Tool definitions and execution
├── tool_handler_schema.py  # Tool execution input/output types
└── workflow.py         # Workflow-specific types (missions, hops, steps)
```

## Core Components

### 1. Resources
Resources represent external systems and services that tools can interact with.

#### Frontend (schema.ts)
```typescript
interface Resource {
    id: string;
    name: string;
    type: 'database' | 'api' | 'file_system' | 'messaging' | 'storage' | 'web' | 'social';
    description: string;
    auth_config: AuthConfig;
    base_url?: string;
    documentation_url?: string;
    rate_limits?: Record<string, any>;
}
```

#### Backend (resource.py)
```python
class Resource(BaseModel):
    id: str
    name: str
    type: ResourceType
    description: str
    auth_config: AuthConfig
    base_url: Optional[str]
    documentation_url: Optional[str]
    rate_limits: Optional[Dict[str, Any]]
```

### 2. Tools
Tools are the atomic units of work that can be executed within a hop.

#### Frontend (schema.ts)
```typescript
interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    parameters: ToolParameter[];
    outputs: ToolOutput[];
    resource_dependencies: Resource[];
}
```

#### Backend (tools.py)
```python
class ToolDefinition(BaseModel):
    id: str
    name: str
    description: str
    category: str
    parameters: List[ToolParameter]
    outputs: List[ToolOutput]
    resource_dependencies: List[Resource]
    execution_handler: Optional[ToolExecutionHandler]
```

### 3. Assets
Assets are the data containers that flow through the workflow.

#### Frontend (schema.ts)
```typescript
interface Asset extends SchemaEntity {
    value?: any;
    status: AssetStatus;
    subtype?: CustomType;
    is_collection: boolean;
    collection_type?: 'array' | 'map' | 'set' | 'null';
    role?: AssetRole;
    error_message?: string;
    last_updated_by?: string;
    ready_at?: string;
    asset_metadata: AssetMetadata;
}
```

#### Backend (unified_schema.py)
```python
class Asset(SchemaEntity):
    value: Optional[Any]
    status: AssetStatus
    subtype: Optional[str]
    is_collection: bool
    collection_type: Optional[Literal['array', 'map', 'set', 'null']]
    role: Optional[AssetRole]
    error_message: Optional[str]
    last_updated_by: Optional[str]
    ready_at: Optional[datetime]
    asset_metadata: AssetMetadata
```

### 4. Workflow Components

#### Frontend (workflow.ts)
```typescript
interface ToolStep {
    id: string;
    tool_id: string;
    description: string;
    resource_configs: Record<string, Resource>;
    parameter_mapping: Record<string, ParameterMappingValue>;
    result_mapping: Record<string, ResultMappingValue>;
    status: ExecutionStatus;
    error?: string;
    created_at: string;
    updated_at: string;
    validation_errors?: string[];
}

interface Mission {
    id: string;
    name: string;
    description: string;
    hops: Hop[];
    inputs: Asset[];
    outputs: Asset[];
    status: MissionStatus;
}
```

#### Backend (workflow.py)
```python
class ToolStep(BaseModel):
    id: str
    tool_id: str
    description: str
    resource_configs: Dict[str, Resource]
    parameter_mapping: Dict[str, ParameterMappingValue]
    result_mapping: Dict[str, ResultMappingValue]
    status: ExecutionStatus
    error: Optional[str]
    created_at: datetime
    updated_at: datetime
    validation_errors: Optional[List[str]]

class Mission(BaseModel):
    id: str
    name: str
    description: str
    hops: List[Hop]
    inputs: List[Asset]
    outputs: List[Asset]
    status: MissionStatus
```

## Harmonization Goals

1. **Single Source of Truth**
   - Each schema component should be defined in exactly one place
   - Frontend and backend should mirror each other's structure
   - Types should be consistent across the entire application

2. **Resource Management**
   - Resources should be defined in `resource.py`/`schema.ts`
   - All resource-related functionality should be centralized
   - Resource validation should be consistent across frontend and backend

3. **Tool System**
   - Tools should be self-contained units with clear inputs/outputs
   - Resource dependencies should be explicitly declared
   - Tool execution should be consistent and type-safe

4. **Asset System**
   - Assets should be the primary data containers
   - Asset status and lifecycle should be consistent
   - Asset validation should be unified

5. **Workflow System**
   - Missions should be the top-level workflow container
   - Hops should be the execution units
   - Tool steps should be the atomic units of work

## Current Issues

1. **Resource Duplication**
   - Resource types are defined in multiple places
   - Need to consolidate in `resource.py`/`schema.ts`

2. **Schema Inconsistency**
   - Some types don't match exactly between frontend and backend
   - Need to ensure complete alignment

3. **Validation Gaps**
   - Some validation logic is duplicated
   - Need to centralize validation in appropriate places

## Next Steps

1. Consolidate resource definitions
2. Align frontend and backend schemas
3. Centralize validation logic
4. Update tool registry to use new resource system
5. Update workflow components to use new resource system
6. Add comprehensive tests for schema validation
7. Update documentation to reflect new structure 
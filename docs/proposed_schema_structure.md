# Proposed Schema Structure

## Backend Structure

### Core Schema Files
```
backend/schemas/
├── base.py                 # Base types and common utilities
│   - BaseModel extensions
│   - Common type definitions
│   - Shared utilities
│
├── resource.py            # Resource definitions and validation
│   - Resource class
│   - AuthConfig
│   - AuthField
│   - Resource validation
│   - Resource utilities
│
├── asset.py              # Asset system
│   - Asset class
│   - AssetStatus
│   - AssetMetadata
│   - Asset validation
│   - Asset lifecycle methods
│
├── tool.py               # Tool system
│   - ToolDefinition
│   - ToolParameter
│   - ToolOutput
│   - Tool validation
│   - Tool utilities
│
└── workflow.py           # Workflow system
    - Mission
    - Hop
    - ToolStep
    - Workflow validation
    - Workflow utilities
```

### Supporting Files
```
backend/tools/
├── tool_registry.py      # Tool registration and management
│   - TOOL_REGISTRY
│   - Tool loading
│   - Tool discovery
│
└── tool_handlers/        # Tool implementations
    ├── base.py          # Base handler class
    └── [tool_name].py   # Individual tool implementations
```

## Frontend Structure

### Core Schema Files
```
frontend/src/types/
├── base.ts              # Base types and common utilities
│   - Common interfaces
│   - Type definitions
│   - Shared utilities
│
├── resource.ts          # Resource definitions
│   - Resource interface
│   - AuthConfig
│   - AuthField
│   - Resource validation
│   - Resource utilities
│
├── asset.ts            # Asset system
│   - Asset interface
│   - AssetStatus enum
│   - AssetMetadata
│   - Asset validation
│   - Asset lifecycle methods
│
├── tool.ts             # Tool system
│   - ToolDefinition
│   - ToolParameter
│   - ToolOutput
│   - Tool validation
│   - Tool utilities
│
└── workflow.ts         # Workflow system
    - Mission
    - Hop
    - ToolStep
    - Workflow validation
    - Workflow utilities
```

### Supporting Files
```
frontend/src/
├── components/
│   ├── tools/          # Tool-related components
│   ├── assets/         # Asset-related components
│   └── workflow/       # Workflow-related components
│
└── utils/
    ├── validation/     # Shared validation logic
    └── schema/         # Schema utilities
```

## Key Changes from Current Structure

1. **Separation of Concerns**
   - Each major component (resource, asset, tool, workflow) has its own file
   - Clear boundaries between different schema systems
   - Easier to maintain and update individual components

2. **Validation Centralization**
   - Validation logic moved to respective component files
   - Shared validation utilities in dedicated files
   - Consistent validation approach across components

3. **Type Safety**
   - Strong typing throughout the system
   - Clear interfaces between components
   - Consistent type definitions between frontend and backend

4. **Resource Management**
   - Dedicated resource system
   - Clear separation of resource configuration and validation
   - Centralized resource utilities

5. **Workflow System**
   - Clear hierarchy (Mission -> Hop -> ToolStep)
   - Consistent state management
   - Unified validation approach

## Implementation Priorities

1. **Phase 1: Core Schema Separation**
   - Split current unified_schema.py into component files
   - Update imports across the codebase
   - Ensure type consistency

2. **Phase 2: Resource System**
   - Implement new resource system
   - Update tool definitions to use new resource system
   - Add resource validation

3. **Phase 3: Validation System**
   - Implement consistent validation across components
   - Add validation utilities
   - Update existing validation calls

4. **Phase 4: Frontend Alignment**
   - Update frontend to match new structure
   - Implement consistent validation
   - Update components to use new types

5. **Phase 5: Testing and Documentation**
   - Add comprehensive tests
   - Update documentation
   - Add type checking 
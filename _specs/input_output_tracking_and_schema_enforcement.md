# Input/Output Tracking and Schema Enforcement Specification

## Core Types

```typescript
export interface WorkflowVariable {
    variable_id: string;     // System-wide unique ID
    name: VariableName;      // Reference name in current context
    schema: Schema;          // Structure definition
    value?: SchemaValueType; // Actual data
    description?: string;    // Human-readable description
    io_type: 'input' | 'output' | 'evaluation';
    required?: boolean;
}

export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'object' | 'file';
export type ValueType = PrimitiveType | ComplexType;

export interface Schema {
    type: ValueType;
    description?: string;
    is_array: boolean;  // If true, the value will be an array of the base type
    fields?: Record<string, Schema>;  // Only used for object type
    format?: string;    // Format constraints
    content_types?: string[];
}

export type SchemaValueType =
    | string
    | number
    | boolean
    | object
    | file
    | query
    | SearchResult
    | KnowledgeBase
```

## System Structure

### 1. Mission Level
```typescript
interface Mission {
    id: string;
    title: string;
    goal: string;
    status: string;
    workflow: Workflow;
    inputs: WorkflowVariable[];  // Mission-level inputs
    outputs: WorkflowVariable[]; // Mission-level outputs
    success_criteria: string[];
    selectedTools: Tool[];
}
```

### 2. Workflow Level
```typescript
interface Workflow {
    id: string;
    name: string;
    description: string;
    status: string;
    stages: Stage[];
    inputs: WorkflowVariable[];  // Workflow-level inputs
    outputs: WorkflowVariable[]; // Workflow-level outputs
}
```

### 3. Stage Level
```typescript
interface Stage {
    id: string;
    name: string;
    description: string;
    status: string;
    steps: Step[];
    inputs: WorkflowVariable[];  // Stage-level inputs
    outputs: WorkflowVariable[]; // Stage-level outputs
    success_criteria: string[];
}
```

### 4. Step Level
```typescript
interface Step {
    id: string;
    name: string;
    description: string;
    status: string;
    type: 'atomic' | 'composite';
    tool?: Tool;
    inputs: WorkflowVariable[];  // Step-level inputs
    outputs: WorkflowVariable[]; // Step-level outputs
    substeps?: Step[];
}
```

### 5. Tool Level
```typescript
interface Tool {
    id: string;
    name: string;
    description: string;
    category: string;
    inputs: WorkflowVariable[];  // Tool-level inputs
    outputs: WorkflowVariable[]; // Tool-level outputs
    steps?: ToolStep[];
}
```

## Data Flow and Validation

### 1. Variable Propagation
- Mission inputs propagate to workflow inputs
- Workflow inputs propagate to stage inputs
- Stage inputs propagate to step inputs
- Step inputs must match tool input schemas
- Tool outputs propagate to step outputs
- Step outputs propagate to stage outputs
- Stage outputs propagate to workflow outputs
- Workflow outputs propagate to mission outputs

### 2. Schema Validation Rules
```typescript
function validateVariablePropagation(
    source: WorkflowVariable,
    target: WorkflowVariable
): boolean {
    // Check schema compatibility
    if (!isSchemaCompatible(source.schema, target.schema)) {
        return false;
    }

    // Check required status
    if (target.required && !source.value) {
        return false;
    }

    // Check io_type compatibility
    if (source.io_type === 'output' && target.io_type === 'input') {
        return true;
    }
    if (source.io_type === 'evaluation' && target.io_type === 'evaluation') {
        return true;
    }
    return false;
}
```

### 3. Data Flow Tracking
```typescript
interface DataFlowEdge {
    source: {
        variable_id: string;
        node_id: string;
        node_type: 'mission' | 'workflow' | 'stage' | 'step' | 'tool';
    };
    target: {
        variable_id: string;
        node_id: string;
        node_type: 'mission' | 'workflow' | 'stage' | 'step' | 'tool';
    };
    validation_status: 'valid' | 'invalid' | 'warning';
    validation_errors?: string[];
}
```

## Implementation Plan

### Phase 1: Core Type Implementation
1. Implement `WorkflowVariable` type
2. Update all existing types to use `WorkflowVariable`
3. Implement schema validation utilities

### Phase 2: Data Flow Implementation
1. Implement variable propagation system
2. Add validation at each propagation point
3. Create data flow tracking system

### Phase 3: Tool Integration
1. Update tool interface to use `WorkflowVariable`
2. Implement tool schema validation
3. Add compatibility checking between tools and steps

### Phase 4: UI/UX Implementation
1. Create variable management interface
2. Implement data flow visualization
3. Add validation feedback and error reporting

## Benefits

1. **Unified Variable System**
   - Single type for all inputs/outputs
   - Consistent schema validation
   - Clear data flow tracking

2. **Improved Type Safety**
   - Strong typing throughout the system
   - Runtime schema validation
   - Clear error messages

3. **Better Debugging**
   - Clear data flow visualization
   - Easy identification of validation failures
   - Tracking of variable transformations

## Migration Strategy

1. **Type Migration**
   - Update all existing types to use `WorkflowVariable`
   - Provide migration utilities for old data
   - Support both old and new systems during transition

2. **Gradual Rollout**
   - Start with new workflows
   - Gradually migrate existing workflows
   - Provide clear documentation and support

3. **Validation Tools**
   - Create tools to validate existing data
   - Provide recommendations for fixing issues
   - Support automated migration where possible 
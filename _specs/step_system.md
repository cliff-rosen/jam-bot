# Step System Specification

## Overview
The step system is a hierarchical structure that allows for both atomic (single tool) and composite (multiple substeps) operations. It manages data flow through inputs and outputs, with clear rules for visibility and mapping.

## Status System

### Status States
Steps can be in one of the following states:
- `unresolved`: Initial state or incomplete configuration
- `pending_inputs_ready`: Configured but waiting for inputs
- `ready`: Fully configured and ready to execute
- `in_progress`: Currently executing
- `completed`: Successfully finished
- `failed`: Execution failed

### Status Rules

#### Atomic Steps
- `unresolved`: No tool assigned or inputs not mapped
- `pending_inputs_ready`: Tool assigned and inputs mapped, but inputs not ready
- `ready`: Tool assigned, inputs mapped, and all inputs ready
- Other states follow execution flow

#### Composite Steps
- `unresolved`: Less than 2 substeps or substeps not configured
- `pending_inputs_ready`: All substeps configured but waiting for their inputs
- `ready`: All substeps ready
- Other states follow execution flow

## Data Flow Rules

### Input Visibility
1. **Parent Input Inheritance**
   - All substeps inherit access to their parent's inputs
   - This inheritance is automatic and doesn't require explicit mapping

2. **Sibling Output Visibility**
   - Substeps can see outputs from their prior siblings
   - This creates a sequential data flow within composite steps

3. **Visibility Hierarchy**
   ```
   Parent Step Inputs
   ↓
   First Substep (sees parent inputs)
   ↓
   Second Substep (sees parent inputs + first substep outputs)
   ↓
   Third Substep (sees parent inputs + first substep outputs + second substep outputs)
   ```

### Output Mapping

1. **Parent Output Mapping**
   - When a step/substep generates an output that matches a parent's output requirement:
     - The output must be explicitly mapped to the parent's output variable
     - This creates a direct link between the tool's output and the parent's output

2. **Intermediate Outputs**
   - For outputs that don't match parent requirements:
     - Creates a new output variable
     - Becomes available to:
       - All subsequent siblings
       - All child steps
     - These are part of the step's internal data flow

3. **Output Inheritance**
   - Parent outputs must be explicitly mapped from child outputs
   - Intermediate outputs are automatically available to subsequent steps
   - Output visibility follows the same hierarchy as input visibility

## Example Data Flow

```
Composite Step
├── Inputs: [A, B]
├── Outputs: [X]
│
├── Substep 1
│   ├── Inputs: [A, B]  // Inherits parent inputs
│   └── Outputs: [Y]    // New intermediate output
│
├── Substep 2
│   ├── Inputs: [A, B, Y]  // Inherits parent inputs + Substep 1 output
│   └── Outputs: [X]       // Maps to parent output
│
└── Substep 3
    ├── Inputs: [A, B, Y, X]  // Inherits parent inputs + all prior outputs
    └── Outputs: [Z]          // New intermediate output
```

## Implementation Notes

1. **Status Tracking**
   - Each step maintains its own status
   - Composite steps must track status of all substeps
   - Status changes should propagate up the hierarchy

2. **Input/Output Management**
   - System must maintain a clear mapping of available inputs
   - Output mapping must be explicit for parent outputs
   - Intermediate outputs should be automatically tracked

3. **Validation Rules**
   - Composite steps must have at least 2 substeps
   - All required inputs must be mapped
   - Parent outputs must be explicitly mapped
   - Input/output types must match

## Future Considerations

1. **Error Handling**
   - How to handle failed substeps in composite steps
   - Error propagation rules
   - Recovery mechanisms

2. **Performance**
   - Optimizing input/output visibility checks
   - Caching strategies for frequently accessed data

3. **Extensibility**
   - Support for parallel execution
   - Conditional execution paths
   - Dynamic step generation 
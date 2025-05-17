# Step Component Specification

## Layout Structure
- Grid layout with 6 columns:
  1. Status (100px fixed)
  2. Name (200px fixed)
  3. Action (200px fixed)
  4. Inputs (flexible, min 200px)
  5. Outputs (flexible, min 200px)
  6. Actions (100px fixed)
- Gap of 4 units between columns
- Consistent indentation for substeps (20px per level)

## Business Rules

### Field-by-Field Rules

1. Status Field:
   - Read-only display of current step status
   - Updates automatically based on step configuration and execution
   - Color-coded to indicate state
   - Shows icon + text combination

2. Name Field:
   - Required text field
   - Must be unique within parent step
   - Can be edited via edit button
   - Truncates with ellipsis if too long
   - Shows indentation based on depth

3. Action Field:
   - Step Type Dropdown:
     - Options: "Atomic" or "Composite"
     - Required selection
     - Affects available tools and input/output behavior
   - Tool Selection Dropdown (Atomic only):
     - Shows only after step type is selected
     - Filters available tools based on selected inputs
     - Updates available outputs when changed
     - Required for atomic steps

4. Input Field:
   - Always visible
   - Smart Defaults:
     - First child: Inherits parent's input
     - Subsequent children: Uses prior sibling's output
   - Variable Selection:
     - Dropdown of available variables
     - Shows variable status
     - Must match tool input schema if tool selected
   - Schema Validation:
     - Validates against tool requirements
     - Shows compatibility status
   - Multiple Inputs:
     - Can have multiple inputs if tool requires
     - Each input independently configurable
     - Shows clear mapping to tool parameters

5. Output Field:
   - Always visible
   - Smart Defaults:
     - First child: Inherits parent's output
     - Subsequent children: Uses prior sibling's output
   - Add Output Button:
     - Creates new WorkflowVariable scoped to current step
     - Opens type selection dialog
     - Validates against tool output schema
   - Output Management:
     - Can have multiple outputs
     - Each output independently configurable
     - Shows clear mapping to tool outputs
   - Schema Requirements:
     - Must match tool output schema if tool selected
     - Can be custom for composite steps
   - Status Tracking:
     - Shows generation status
     - Indicates if output is ready
     - Shows error state if generation fails

6. Actions Field:
   - Edit Button:
     - Opens step configuration dialog
     - Allows name and description editing
     - Shows advanced options
   - AI Suggestion Button:
     - Provides AI-powered configuration suggestions
     - Can suggest tool selection
     - Can suggest input/output mappings
   - Delete Button:
     - Removes step and all substeps
     - Requires confirmation
     - Updates parent step status
   - Add Substep Button (Composite only):
     - Creates new substep
     - Inherits parent's context
     - Maintains proper indentation

### Step Types
1. Atomic Steps:
   - Must have a tool selected
   - Show inputs and outputs at all times
   - Inputs can be mapped to available variables
   - Outputs are determined by the selected tool
   - Available tools are filtered based on selected inputs

2. Composite Steps:
   - Must have at least 2 substeps
   - Can contain both atomic and composite substeps
   - Show inputs and outputs at all times
   - "Add Substep" action in the actions column

## Status Values
1. Step Status:
   - `unresolved`: Initial state, needs configuration
   - `pending_inputs_ready`: Tool selected, waiting for inputs
   - `ready`: All required inputs mapped and ready
   - `in_progress`: Step is executing
   - `completed`: Step finished successfully
   - `failed`: Step execution failed

2. Variable Status:
   - `pending`: Initial state, not yet configured
   - `ready`: Value is available and valid
   - `error`: Failed to generate or invalid value

## Variable Rules

### Input Variables
1. Available Inputs:
   - Parent step's inputs
   - All prior sibling outputs
   - These options are fixed based on step's position
   - Shows readiness status for each option

2. Tool Selection Impact:
   - Tools are filtered based on available inputs
   - Only tools whose input requirements can be satisfied by available inputs are shown
   - Tool selection may further filter down available inputs to those matching tool requirements
   - Must respect schema compatibility with selected tool

### Output Variables
1. Output Options:
   - Use parent's output
   - Create new output
   - Only these two choices are available
   - Shows generation status for each option

2. New Output Behavior:
   - Scoped to parent step
   - Available as input to:
     - Subsequent siblings
     - Children of subsequent siblings
   - Not available to:
     - Parent step
     - Prior siblings
     - Children of prior siblings
   - Shows readiness status

3. Tool Selection Impact:
   - Tool selection does not filter available output options
   - Tool selection may filter which outputs can be linked to tool outputs
   - For atomic steps, output schema must match tool output requirements

## UX Rules

### Visual Hierarchy
1. Status Display:
   - Color-coded badges (green=ready, red=failed, blue=in_progress, yellow=pending)
   - Icon + text combination
   - Consistent positioning in first column

2. Name and Actions:
   - Name truncates if too long
   - Action buttons in rightmost column:
     - Edit
     - AI suggestion
     - Delete
     - Add Substep (for composite steps)
   - Proper indentation for substeps

### Interaction Patterns
1. Step Type Selection:
   - Dropdown in Action column
   - Immediate visual feedback on selection
   - Tool selector appears only for atomic steps

2. Tool Selection:
   - Dropdown below step type
   - Shows filtered tools based on selected inputs
   - Updates available outputs when tool changes
   - Clear indication of tool-input compatibility

3. Variable Mapping:
   - Always visible input/output columns
   - Smart defaults based on position in hierarchy
   - Dropdown selectors for inputs
   - Shows available variables based on context
   - Visual feedback on mapping status

### Responsive Behavior
1. Column Sizing:
   - Fixed widths for status, name, action, and actions columns
   - Flexible widths for inputs/outputs
   - Minimum widths to prevent squishing

2. Content Overflow:
   - Names truncate with ellipsis
   - Inputs/outputs scroll vertically if needed
   - Maintains readability at all depths

### Accessibility
1. Interactive Elements:
   - Clear hover states
   - Consistent button sizes
   - Proper contrast ratios
   - Keyboard navigation support

2. Status Indicators:
   - Color + icon + text for redundancy
   - Clear error messaging
   - Consistent positioning

## State Management
1. Step State:
   - Maintains type (atomic/composite)
   - Tracks selected tool
   - Manages input/output mappings
   - Updates status based on dependencies
   - Tracks variable compatibility

2. Parent-Child Relationships:
   - Proper indentation
   - Status propagation
   - Variable availability rules
   - Substeps management
   - Input/output inheritance

## Implementation Notes

### Component Structure
```typescript
interface StepProps {
    step: Step;
    parentStep?: Step;
    onAddSubstep: (step: Step) => void;
    onEditStep?: (step: Step) => void;
    onDeleteStep?: (stepId: string) => void;
    onStepTypeChange?: (step: Step, type: 'atomic' | 'composite') => void;
    onToolSelect?: (step: Step, toolId: string) => void;
    onInputSelect?: (step: Step, input: WorkflowVariable) => void;
    onOutputSelect?: (step: Step, output: WorkflowVariable) => void;
    onUpdateStep: (step: Step) => void;
    availableTools?: Tool[];
    availableInputs?: WorkflowVariable[];
    depth?: number;
}

interface OutputDialogProps {
    step: Step;
    onAddOutput: (output: WorkflowVariable) => void;
    onCancel: () => void;
}

interface WorkflowVariable {
    variable_id: string;
    name: string;
    schema: Schema;
    value?: SchemaValueType;
    description?: string;
    io_type: 'input' | 'output' | 'evaluation';
    required?: boolean;
    status: VariableStatus;
    error_message?: string;
    parent_scope: string; // ID of the parent step that owns this variable
}
```

### Key Helper Components
1. `StepStatusDisplay`: Handles status visualization
2. `VariableStatusBadge`: Shows variable status
3. `VariableList`: Manages input/output variable display and selection
4. `ToolSelector`: Handles tool filtering and selection
5. `ActionButtons`: Manages all step actions
6. `OutputDialog`: Handles creation of new outputs
7. `SchemaSelector`: Manages schema selection for new outputs
8. `VariableScopeManager`: Tracks and manages variable scoping

### State Management
- Uses React's `useMemo` for derived state
- Handles step type changes
- Manages tool selection and filtering
- Tracks variable mappings and compatibility
- Updates step status
- Manages input/output inheritance
- Manages output creation and scoping
- Tracks custom output variables
- Handles output inheritance
- Manages output status propagation

### Event Handling
- Click events for action buttons
- Change events for dropdowns
- Selection events for variables
- Proper event propagation control
- Input/output change events
- Tool selection events
- Output creation events
- Schema selection events
- Scope management events
- Output status update events

### Tool Filtering Logic
```typescript
function getFilteredTools(availableTools: Tool[], selectedInputs: WorkflowVariable[]): Tool[] {
    return availableTools.filter(tool => {
        // Check if tool's input schemas are compatible with selected inputs
        return tool.inputs.every((toolInput, index) => {
            const selectedInput = selectedInputs[index];
            return selectedInput && doSchemasMatch(selectedInput.schema, toolInput.schema);
        });
    });
}
```

### Output Creation Logic
```typescript
function createNewOutput(parentStep: Step, schema: Schema): WorkflowVariable {
    return {
        variable_id: uuidv4(),
        name: `output_${parentStep.id}_${Date.now()}`,
        schema,
        io_type: 'output',
        status: 'pending',
        parent_scope: parentStep.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}
``` 
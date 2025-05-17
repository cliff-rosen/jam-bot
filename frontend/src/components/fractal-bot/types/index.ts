import { v4 as uuidv4 } from 'uuid';
import { Tool, ToolIO, Schema, SchemaValueType, FileValue, Query, SearchResult, KnowledgeBase } from './tools';

// Re-export Tool type
export type { Tool };

// Variable status types
export type VariableStatus = 'pending' | 'ready' | 'error';

// Base variable type - combines schema with identifiers and value
export interface WorkflowVariable {
    variable_id: string;     // System-wide unique ID
    name: string;           // Reference name in current context
    schema: Schema;         // Structure definition
    value?: SchemaValueType; // Actual data
    description?: string;   // Human-readable description
    io_type: 'input' | 'output' | 'wip';
    required?: boolean;
    status: VariableStatus;  // Current status of the variable
    error_message?: string;  // Optional error message when status is 'error'
    createdBy: string;       // ID of the node that created this variable
}

// Mapping target can be either a variable or a parameter
export interface VariableTarget {
    type: 'variable';
    variableId: string;  // Just store the ID
}

export interface ParameterTarget {
    type: 'parameter';
    name: string;
    schema: Schema;
    required?: boolean;
}

export type MappingTarget = VariableTarget | ParameterTarget;

// Updated mapping interface
export interface VariableMapping {
    sourceVariableId: string;  // Just store the ID
    target: MappingTarget;     // Either a variable ID or parameter
    isParentOutput?: boolean;  // Whether this maps to a parent's output
}

// PRIMARY TYPES FOR TASK EXECUTION
// Common status types
export type Status = 'completed' | 'current' | 'pending' | 'failed' | 'in_progress' | 'ready';
export type AssetStatus = 'pendingCompletion' | 'pendingApproval' | 'ready' | 'archived' | 'error';

// Step execution states
export type StepExecutionState = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'blocked';

// Step configuration states
export type StepConfigState = 'unconfigured' | 'configuring' | 'resolved' | 'inputs_pending' | 'error';

// Step status type
export type StepStatus = 'unresolved' | 'pending_inputs_ready' | 'ready' | 'in_progress' | 'completed' | 'failed';

// Updated Step interface
export interface Step {
    id: string;
    name: string;
    description: string;
    type?: 'atomic' | 'composite';
    state: WorkflowVariable[];
    inputMappings: VariableMapping[];  // Maps available inputs to tool parameters
    outputMappings: VariableMapping[]; // Maps tool outputs to new variables
    tool_id: string;
    tool?: Tool;  // The selected tool for this step
    substeps?: Step[];
    isSubstep?: boolean;
    status: StepStatus;
    createdAt: string;
    updatedAt: string;
    availableInputs?: WorkflowVariable[]; // Read-only field showing all available inputs
}

// Updated Stage interface
export interface Stage {
    id: string;
    name: string;
    description: string;
    status: string;
    steps: Step[];
    state: WorkflowVariable[];
    inputMappings: VariableMapping[];  // Maps available inputs to stage inputs
    outputMappings: VariableMapping[]; // Maps step outputs to stage outputs
    success_criteria: string[];
    createdAt: string;
    updatedAt: string;
}

// Updated Workflow interface
export interface Workflow {
    id: string;
    name: string;
    description: string;
    status: string;
    stages: Stage[];
    state: WorkflowVariable[];
    inputMappings: VariableMapping[];  // Maps mission inputs to workflow inputs
    outputMappings: VariableMapping[]; // Maps stage outputs to workflow outputs
    createdAt: string;
    updatedAt: string;
}

// Updated Mission interface
export interface Mission {
    id: string;
    title: string;
    goal: string;
    status: string;
    workflow: Workflow;
    state: WorkflowVariable[];  // Changed back to state to match our data structure
    inputMappings: VariableMapping[];  // Maps available inputs to mission inputs
    outputMappings: VariableMapping[]; // Maps workflow outputs to mission outputs
    resources: string[];
    success_criteria: string[];
    selectedTools: Tool[];
    createdAt: string;
    updatedAt: string;
}

export type MissionProposal = {
    title: string;
    goal: string;
    childVariables: WorkflowVariable[];
    inputMappings: VariableMapping[];  // Maps available inputs to mission inputs
    outputMappings: VariableMapping[]; // Maps workflow outputs to mission outputs
    resources: string[];  // General resources needed but not specific data objects
    success_criteria: string[];
    selectedTools: Tool[];
    has_sufficient_info: boolean;
    missing_info_explanation: string;
}

// Schema matching rules
export interface SchemaMatch {
    isMatch: boolean;
    reason?: string;
}

// SCHEMA AND VARIABLE SUPPORT FUNCTIONS

// Helper function to check if schemas match
export function doSchemasMatch(source: Schema, target: Schema): SchemaMatch {
    // Basic type matching
    if (source.type !== target.type) {
        return {
            isMatch: false,
            reason: `Type mismatch: ${source.type} vs ${target.type}`
        };
    }

    // Array type matching
    if (source.is_array !== target.is_array) {
        return {
            isMatch: false,
            reason: `Array type mismatch: ${source.is_array} vs ${target.is_array}`
        };
    }

    // For object types, check fields
    if (source.type === 'object' && target.type === 'object') {
        if (!source.fields || !target.fields) {
            return {
                isMatch: false,
                reason: 'Missing fields definition for object type'
            };
        }

        // Check if all required target fields exist in source
        for (const [fieldName, targetField] of Object.entries(target.fields)) {
            const sourceField = source.fields[fieldName];
            if (!sourceField) {
                return {
                    isMatch: false,
                    reason: `Missing field: ${fieldName}`
                };
            }

            const fieldMatch = doSchemasMatch(sourceField, targetField);
            if (!fieldMatch.isMatch) {
                return {
                    isMatch: false,
                    reason: `Field ${fieldName}: ${fieldMatch.reason}`
                };
            }
        }
    }

    // For file types, check content types
    if (source.type === 'file' && target.type === 'file') {
        if (target.content_types && source.content_types) {
            const hasMatchingContentType = target.content_types.some(type =>
                source.content_types?.includes(type)
            );
            if (!hasMatchingContentType) {
                return {
                    isMatch: false,
                    reason: 'No matching content types'
                };
            }
        }
    }

    return { isMatch: true };
}

// Helper function to get available inputs for a step or workflow
export function getAvailableInputs(stepOrWorkflow: Step | Workflow, parentStep?: Step): WorkflowVariable[] {
    const availableInputs: WorkflowVariable[] = [];

    if ('stages' in stepOrWorkflow) {
        // This is a Workflow - get mission inputs
        const mission = stepOrWorkflow as Workflow;
        return mission.inputMappings
            .filter(m => m.target.type === 'variable')
            .map(m => mission.state.find(v => v.variable_id === m.sourceVariableId))
            .filter((v): v is WorkflowVariable => v !== undefined);
    }

    // This is a Step
    const step = stepOrWorkflow;

    // Add parent's child variables (variables created by siblings)
    if (parentStep) {
        availableInputs.push(...parentStep.state);
    }

    // Add outputs from prior siblings
    if (parentStep?.substeps) {
        const currentIndex = parentStep.substeps.findIndex(s => s.id === step.id);
        if (currentIndex > 0) {
            for (let i = 0; i < currentIndex; i++) {
                const sibling = parentStep.substeps[i];
                // Get variables created by this sibling that aren't mapped to parent outputs
                const siblingOutputs = sibling.state.filter(v =>
                    !sibling.outputMappings.some(m =>
                        m.isParentOutput && m.target.type === 'variable' && m.target.variableId === v.variable_id
                    )
                );
                availableInputs.push(...siblingOutputs);
            }
        }
    }

    return availableInputs;
}

// Helper function to get available inputs for a workflow
export function getWorkflowAvailableInputs(workflow: Workflow): WorkflowVariable[] {
    return workflow.inputMappings
        .filter(m => m.target.type === 'variable')
        .map(m => workflow.state.find(v => v.variable_id === m.sourceVariableId))
        .filter((v): v is WorkflowVariable => v !== undefined);
}

// Helper function to check if a step is ready
export function isStepReady(step: Step): boolean {
    // Check if all required inputs are mapped and ready
    const allInputsReady = step.inputMappings
        .filter(m => m.target.type === 'parameter' && m.target.required)
        .every(mapping => {
            const sourceVar = step.state.find(v => v.variable_id === mapping.sourceVariableId);
            return sourceVar && sourceVar.status === 'ready';
        });

    if (!allInputsReady) {
        return false;
    }

    if (step.type === 'atomic') {
        // Atomic step is ready if:
        // 1. Has a tool_id
        // 2. All required inputs are mapped and ready
        return !!step.tool_id;
    } else if (step.type === 'composite') {
        // Composite step is ready if:
        // 1. Has at least 2 substeps
        // 2. All substeps are ready
        return step.substeps !== undefined &&
            step.substeps.length >= 2 &&
            step.substeps.every(substep => isStepReady(substep));
    }

    return false;
}

// Helper function to create a new variable
export function createWorkflowVariable(
    name: string,
    schema: Schema,
    io_type: 'input' | 'output' | 'wip',
    createdBy: string
): WorkflowVariable {
    return {
        variable_id: uuidv4(),
        name,
        schema,
        io_type,
        status: 'pending',
        createdBy
    };
}

// NON PRIMARY TYPES

// Chat message types
export type DataFromLine = {
    token: string | null;
    status: string | null;
    mission_proposal: MissionProposal | null;
    error: string | null;
    message: string | null;
}

export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
        missionId?: string;
        stageId?: string;
        stepId?: string;
        assetId?: string;
        type?: 'status' | 'error' | 'info';
    };
}

// Workspace types
export type WorkspaceState = {
    currentMissionId: string | null;
    currentStageId: string | null;
    // Array of step IDs representing the path through the step hierarchy
    // First element is the top-level step, last element is the current step
    currentStepPath: string[];
    viewMode: 'compact' | 'expanded';
}

export interface ItemView {
    title: string;
    type: 'tools' | 'assets' | 'proposedMission' | 'proposedWorkflowDesign' | 'thinking' | 'progressUpdate' | 'text' | 'none';
    isOpen: boolean;
}

// Asset types
export type Asset = {
    id: string;
    name: string;
    type: string;
    status: AssetStatus;
    content: any;
    createdAt: string;
    updatedAt: string;
    version: number;
}

// Workspace types
export type WorkspaceType = 'proposedMission' | 'proposedWorkflowDesign' | 'workflowStepStatus' | 'stepDetails' | 'thinking' | 'progressUpdate' | 'text';

export type ProgressUpdate = {
    id: string;
    timestamp: string;
    title: string;
    details: string;
    status?: Status;
    progress?: number; // Optional progress percentage (0-100)
    icon?: string; // Optional icon name
};

export type Workspace = {
    id: string;
    type: WorkspaceType;
    title: string;
    status: Status;
    content?: {
        text?: string;
        step?: Step;
        mission?: Mission;
        workflow?: Workflow;
        assets?: Asset[];
        progressUpdates?: ProgressUpdate[]; // Array of progress updates
    };
    actionButtons?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary' | 'danger';
        disabled?: boolean;
    }[];
    createdAt: string;
    updatedAt: string;
}

export type StageGeneratorResult = {
    stages: Stage[];
    inputs: WorkflowVariable[];
    outputs: WorkflowVariable[];
    success_criteria: string[];
    explanation: string;
}

export interface SchemaType {
    type: 'string' | 'file' | 'object';
    is_array: boolean;
    name: string;
    description: string;
}


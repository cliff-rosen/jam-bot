import { Asset, AssetType } from './asset';

export enum WorkflowStatus {
    PENDING = "pending", // In design
    READY = "ready", // Ready to be used; assets are pending
    IN_PROGRESS = "in_progress", // Started but not completed
    COMPLETED = "completed", // Completed; assets are ready
    FAILED = "failed", // Failed
    CANCELLED = "cancelled" // Cancelled
}

export enum StateVariableType {
    ASSET = "asset", // References an asset
    PRIMITIVE = "primitive", // Basic type (string, number, boolean)
    OBJECT = "object", // Complex object
    COLLECTION = "collection" // Array or map of other types
}

export interface StateVariable {
    id: string;
    name: string;
    description: string;
    type: StateVariableType;
    value: any;
    asset_id?: string; // ID of the associated asset if type is ASSET
    is_input: boolean; // Whether this is an input to the workflow
    is_output: boolean; // Whether this is an output from the workflow
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface ToolUse {
    id: string;
    name: string;

    // Maps tool parameter names to state variable IDs
    parameter_mapping: Record<string, string>; // Maps tool parameter names to state variable IDs that provide their values

    // Maps tool result paths to state variable IDs
    result_mapping: Record<string, string>; // Maps tool result paths (dot notation) to state variable IDs that will store the results

    // The actual parameters and results after state variable substitution
    parameters: Record<string, any>; // Parameters passed to the tool after state variable substitution
    results: any; // Results from the tool use

    timestamp: string;
    status: WorkflowStatus;
    error?: string;
}

export interface WorkflowStep {
    id: string;
    name: string;
    description: string;
    status: WorkflowStatus;
    tool_uses: ToolUse[];
    input_variables: string[]; // IDs of state variables used as input
    output_variables: string[]; // IDs of state variables produced as output
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    status: WorkflowStatus;
    steps: WorkflowStep[];
    state_variables: Record<string, StateVariable>; // Map of state variable IDs to their definitions
    input_mapping: Record<string, string>; // Maps mission input asset IDs to workflow state variable IDs
    output_mapping: Record<string, string>; // Maps workflow state variable IDs to mission output asset IDs
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Mission {
    id: string;
    name: string;
    description: string;
    goal: string;
    success_criteria: string[];
    inputs: Asset[];
    outputs: Asset[];
    possible_stage_sequence: string[];
    status: WorkflowStatus;
    workflows: Workflow[];
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export const defaultMission2: Mission = {
    id: "default-01",
    name: "Untitled Mission",
    description: "This is a description of the mission.",
    goal: "This is the goal of the mission.",
    success_criteria: ["This is the success criteria of the mission."],
    inputs: [
    ],
    outputs: [
    ],
    status: WorkflowStatus.PENDING,
    workflows: [],
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}


export const defaultMission: Mission = {
    id: "default",
    name: "AI Newsletter Summarization",
    description: "Summarize AI news for a given date range.",
    goal: "Generate a concise report of AI news for the selected date range.",
    success_criteria: ["Report is accurate and covers all major AI news in the range."],
    inputs: [
        {
            id: "input-topic-areas",
            name: "Topic Areas",
            description: "The topic areas to focus on.",
            type: AssetType.PRIMITIVE,
            is_collection: false,
            content: null,
            asset_metadata: {},
        }
    ],
    outputs: [
        {
            id: "output-report",
            name: "Report",
            description: "The generated AI news summary report.",
            type: AssetType.FILE,
            is_collection: false,
            content: null,
            asset_metadata: {},
        }
    ],
    status: WorkflowStatus.READY,
    workflows: [],
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}

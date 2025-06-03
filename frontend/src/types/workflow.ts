import { Asset, AssetType } from './asset';

export enum WorkflowStatus {
    PENDING = "pending", // In design
    READY = "ready", // Ready to be used
    IN_PROGRESS = "in_progress", // Started but not completed
    COMPLETED = "completed", // Completed
    FAILED = "failed", // Failed
    CANCELLED = "cancelled", // Cancelled
    HOP_DESIGN = "hop_design", // Need to design the next hop
    HOP_IMPLEMENTATION = "hop_implementation" // Hop is designed, needs implementation
}

export enum ExecutionStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
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

export interface ToolStep {
    id: string;
    tool_name: string;
    description: string;

    // Asset mappings within hop state
    parameter_mapping: Record<string, { state_asset: string; path: string } | { literal: any }>;
    result_mapping: Record<string, { state_asset: string; path: string }>;

    status: ExecutionStatus;
    error?: string;
    created_at: string;
    updated_at: string;
}

export interface Hop {
    id: string;
    name: string;
    description: string;

    // Asset mappings
    input_mapping: Record<string, string>; // {local_key: external_asset_id}
    state: Record<string, Asset>; // Local asset workspace
    output_mapping: Record<string, string>; // {local_key: external_asset_id}

    // Tool chain (populated during resolution)
    steps: ToolStep[]; // Ordered list of tool executions

    // Status tracking
    status: WorkflowStatus;
    is_resolved: boolean; // Whether the hop has been configured with tools
    is_final: boolean; // Whether this produces the final deliverable
    current_step_index: number;

    created_at: string;
    updated_at: string;
}

export interface Mission {
    id: string;
    name: string;
    description: string;
    goal: string;
    success_criteria: string[];

    // Assets
    inputs: Asset[];
    outputs: Asset[];
    state: Record<string, Asset>; // All assets available (inputs + hop outputs)

    // Execution
    hops: Hop[]; // Sequence of hops to execute
    current_hop?: Hop; // Current hop being designed or executed
    current_hop_index: number;

    // Status tracking
    status: WorkflowStatus;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export const defaultMission: Mission = {
    id: "default-01",
    name: "Untitled Mission",
    description: "This is a description of the mission.",
    goal: "This is the goal of the mission.",
    success_criteria: ["This is the success criteria of the mission."],
    inputs: [],
    outputs: [],
    state: {},
    hops: [],
    current_hop_index: 0,
    status: WorkflowStatus.PENDING,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}


export const defaultMission2: Mission = {
    id: "default",
    name: "AI Newsletter Summarization",
    description: "Summarize AI news for a given topic.",
    goal: "Answer users questions about AI news.",
    success_criteria: ["Answer is accurate."],
    inputs: [
        {
            id: "input-topic-areas",
            name: "Topic Areas",
            description: "The topic areas to focus on.",
            type: AssetType.PRIMITIVE,
            is_collection: false,
            content: null,
            asset_metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                creator: null,
                tags: [],
                agent_associations: [],
                version: 1,
                token_count: 0
            },
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
            asset_metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                creator: null,
                tags: [],
                agent_associations: [],
                version: 1,
                token_count: 0
            },
        }
    ],
    state: {},
    hops: [],
    current_hop_index: 0,
    status: WorkflowStatus.READY,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}

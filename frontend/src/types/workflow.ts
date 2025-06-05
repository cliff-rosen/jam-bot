import { Asset, AssetType } from './asset';

export enum MissionStatus {
    PENDING = "pending", // Mission proposed but not yet approved by user
    ACTIVE = "active",   // Mission approved and in progress
    COMPLETE = "complete" // Mission completed
}

export enum HopStatus {
    READY_TO_DESIGN = "ready_to_design",           // Ready to design next hop
    HOP_PROPOSED = "hop_proposed",                 // Hop designer has proposed a hop
    HOP_READY_TO_RESOLVE = "hop_ready_to_resolve", // User accepted hop, ready to resolve with tools
    HOP_READY_TO_EXECUTE = "hop_ready_to_execute", // Hop resolved with tools, ready to run
    HOP_RUNNING = "hop_running",                   // Hop is executing
    ALL_HOPS_COMPLETE = "all_hops_complete"        // No more hops needed
}

// Keep WorkflowStatus for backwards compatibility but mark as deprecated
/** @deprecated Use MissionStatus and HopStatus instead */
export enum WorkflowStatus {
    PENDING = "pending",
    READY = "ready",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    HOP_DESIGN = "hop_design",
    HOP_IMPLEMENTATION = "hop_implementation"
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
    tool_id: string;
    description: string;

    // Asset mappings within hop state
    parameter_mapping: Record<string, { type: "literal"; value: any } | { type: "asset_field"; state_asset: string; path: string }>;
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
    status: ExecutionStatus; // Individual hop execution status
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
    mission_status: MissionStatus; // Overall mission status
    hop_status?: HopStatus; // Hop workflow status (only when mission is active)
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
    mission_status: MissionStatus.PENDING,
    hop_status: undefined,
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
    mission_status: MissionStatus.ACTIVE,
    hop_status: HopStatus.READY_TO_DESIGN,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}

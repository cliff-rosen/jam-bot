// Journey State Types
export type JourneyState =
    | 'AWAITING_GOAL'
    | 'AWAITING_WORKFLOW_DESIGN'
    | 'AWAITING_WORKFLOW_START'
    | 'WORKFLOW_IN_PROGRESS'
    | 'WORKFLOW_COMPLETE';

// Deliverable Types
export type DeliverableType = 'summary' | 'draft' | 'report' | 'dataset' | 'visual' | 'decision' | 'plan';

export interface Deliverable {
    id: string;
    name: string;
    description: string;
    type: DeliverableType;
}

// Message Types
export type MessageType = 'goal' | 'clarification' | 'suggestion' | 'confirmation' | 'status' | 'result' | 'error';

export interface ActionButton {
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    action: 'accept_journey' | 'reject_journey' | 'edit_journey' | 'start_design' | 'accept_workflow' | 'reject_workflow' | 'edit_workflow';
    onClick: () => void;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: {
        type: MessageType;
        stepId?: string;
        assetIds?: string[];
        toolIds?: string[];
        reactionIds?: string[];
        actionButtons?: ActionButton[];
    };
    reactions?: MessageReaction[];
    thread?: ChatMessage[];
}

export interface MessageReaction {
    id: string;
    type: '👍' | '👎' | '⭐' | '❓' | '💡';
    userId: string;
    timestamp: string;
}

// Asset Types
export interface Asset {
    id: string;
    title: string;
    type: 'input' | 'output' | 'intermediate';
    format: 'text' | 'json' | 'pdf' | 'image' | 'email-list' | 'other';
    content: any;
    metadata: {
        creator: string;
        createdAt: string;
        updatedAt: string;
        tags: string[];
        stepId?: string;
        toolId?: string;
    };
    version: number;
    history: AssetVersion[];
}

export interface AssetVersion {
    version: number;
    content: any;
    updatedAt: string;
    updatedBy: string;
}

// Tool Types
export interface Tool {
    id: string;
    name: string;
    description: string;
    category: 'search' | 'analysis' | 'generation' | 'transformation';
    capabilities: string[];
    parameters: ToolParameter[];
    icon: string;
    metrics?: {
        usageCount: number;
        avgDuration: number;
        successRate: number;
    };
}

export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required: boolean;
    default?: any;
}

// Workflow Types
export interface WorkflowStep {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'ready' | 'running' | 'completed' | 'failed';
    agentType: string;
    level: number;              // Depth in the tree (0 for main steps)
    tools: string[];           // Tools used in this step
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    progress: number;          // Progress percentage (0-100)
    assets: Asset[];          // Assets generated in this step
    subSteps?: WorkflowStep[]; // Nested steps
    parentId?: string;        // Reference to parent step
    isExpanded?: boolean;
}

export interface Workflow {
    id: string;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
    currentStepIndex: number;
    steps: WorkflowStep[];
    assets: Asset[];
    actionButtons?: ActionButton[];
}

// Workspace Types
export type WorkspaceObjectType = 'none' | 'proposed_journey' | 'proposed_workflow' | 'workflow_step';

export interface Workspace {
    id: string;
    objectType: WorkspaceObjectType;
    object: Journey | Workflow | WorkflowStep | null;
    actionButtons?: ActionButton[];
}

// Journey Types (Top Level)
export interface Journey {
    id: string;
    title: string;
    goal: string;
    state: JourneyState;
    creator: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    deliverable: Deliverable;

    // Nested components
    messages: ChatMessage[];
    workflow: Workflow | null;
    workspace: Workspace;
    assets: Asset[];  // Assets at journey level
    agents: Agent[];  // Agents at journey level
}

// Agent Types
export interface Agent {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    tools: string[];
    configuration: Record<string, any>;
    inputs: {
        searchTerms?: string[];
        dateRange?: string;
        dataset?: string;
    };
    outputs: {
        emailList?: string[];
        themes?: string[];
        patterns?: string[];
    };
    metrics?: {
        usageCount: number;
        avgDuration: number;
        successRate: number;
    };
    status?: 'active' | 'inactive';
} 
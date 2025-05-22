import { WorkflowStatus, Workflow, Mission } from './workflow';

export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system'
}

export type ChatMessage = {
    id: string;
    role: MessageRole;
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

// Lightweight asset reference for chat requests
export type AssetReference = {
    id: string;
    name: string;
    description: string;
    type: string;
    metadata?: Record<string, any>;
}

export interface ChatRequest {
    message: string;
    history: ChatMessage[];
    payload?: {
        assets?: AssetReference[];
        workflowId?: string;
        missionId?: string;
        stageId?: string;
        stepId?: string;
        context?: Record<string, any>;
    };
}

export interface ChatResponse {
    message: ChatMessage;
    payload?: {
        assets?: AssetReference[];
        workflow?: Workflow;
        mission?: Mission;
        tool_use_history?: Array<{
            iteration: number;
            tool: {
                name: string;
                parameters: Record<string, any>;
            };
            results: any;
        }>;
        context?: Record<string, any>;
    };
}

export type MessageType =
    | 'text'
    | 'action_prompt'
    | 'agent_update'
    | 'asset_added';

export interface AgentResponse {
    token: string | null;
    message: string | null;
    status: string | null;
    supervisor_response: string | null;
    error: string | null;
}

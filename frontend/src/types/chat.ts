export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system'
}

export interface Message {
    message_id: string;
    role: MessageRole;
    content: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}

export interface ChatResponse {
    message: Message;
    sideEffects?: {
        tool_use_history?: Array<{
            iteration: number;
            tool: {
                name: string;
                parameters: Record<string, any>;
            };
            results: any;
        }>;
    };
}

export interface BotRequest {
    message: string;
    history: Message[];
}

export type MessageType =
    | 'text'
    | 'action_prompt'
    | 'agent_update'
    | 'asset_added';

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

export interface AgentResponse {
    token: string | null;
    message: string | null;
    status: string | null;
    supervisor_response: string | null;
    error: string | null;
}

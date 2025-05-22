import { Asset } from '@/types.old/asset';
import { Mission } from '@/types/workflow';

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
        assets?: Asset[];
        mission?: Mission;
    };
}

export interface ChatResponse {
    message: ChatMessage;
    payload?: {
        assets?: AssetReference[];
        mission?: Mission;
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
    supervisor_response: string | null | object;
    error: string | null;
}

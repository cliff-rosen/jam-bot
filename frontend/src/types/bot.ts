export type MessageType =
    | 'text'
    | 'action_prompt'
    | 'agent_update'
    | 'asset_added';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type: MessageType;
    actionButton?: {
        label: string;
        action: string;
        disabled?: boolean;
    };
}

export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant'
}

export interface Message {
    message_id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
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
// Import from centralized type files
import { Asset, FileType, DataType, AssetStatus, AssetMetadata, AssetPersistence } from '@/types/asset';
import { Agent, AgentType, AgentStatus } from '@/types/agent';
import { Message, MessageType, MessageRole, ChatMessage, ChatResponse } from '@/types/message';
import { ActionType, ActionButton } from '@/types/action';

export type Phase = 'setup' | 'execution' | 'complete';

// Re-export all types for backward compatibility
export type {
    Asset,
    AssetMetadata,
    AssetPersistence,
    Agent,
    Message,
    ChatMessage,
    ChatResponse,
    MessageType,
    ActionButton
};

export {
    FileType,
    DataType,
    AssetStatus,
    AgentType,
    AgentStatus,
    MessageRole,
    ActionType
};

// Main state interface
export interface FractalBotState {
    messages: Message[];
    assets: Record<string, Asset>;
    agents: Record<string, Agent>;
    metadata: {
        isProcessing: boolean;
        lastUpdated: Date;
    };
}

// Initial state factory
export const createInitialState = (): FractalBotState => ({
    messages: [],
    assets: {},
    agents: {},
    metadata: {
        isProcessing: false,
        lastUpdated: new Date()
    }
});

export type StateUpdateAction =
    | { type: 'ADD_MESSAGE'; payload: { message: Message } }
    | { type: 'CLEAR_MESSAGES' }
    | { type: 'ADD_ASSET'; payload: { asset: Asset } }
    | { type: 'UPDATE_ASSET'; payload: { assetId: string; updates: Partial<Asset> } }
    | { type: 'REMOVE_ASSET'; payload: { assetId: string } }
    | { type: 'ADD_AGENT'; payload: { agent: Agent } }
    | { type: 'UPDATE_AGENT'; payload: { agentId: string; updates: Partial<Agent> } }
    | { type: 'REMOVE_AGENT'; payload: { agentId: string } }
    | { type: 'UPDATE_METADATA'; payload: { updates: Partial<FractalBotState['metadata']> } }
    | { type: 'RESET_STATE' }; 
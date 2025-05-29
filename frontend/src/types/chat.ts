import { Asset, AssetType } from '@/types/asset';
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
    metadata?: {
        type?: string;
        [key: string]: any;
    };
}

// Lightweight asset reference for chat requests
export type AssetReference = {
    id: string;
    name: string;
    description: string;
    type: AssetType;
    subtype?: string;
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

export interface MissionDefinitionResponse {
    response_type: 'MISSION_DEFINITION' | 'INTERVIEW_QUESTION';
    response_content: string;
    mission_proposal?: {
        title: string;
        goal: string;
        success_criteria: string[];
        required_inputs: string[];
        expected_outputs: string[];
        possible_stage_sequence: string[];
    };
    information_gaps?: string[];
    confidence_level?: string;
}

export interface SupervisorResponse {
    response_type: 'FINAL_ANSWER' | 'MISSION_SPECIALIST' | 'WORKFLOW_SPECIALIST';
    response_content: string;
    result_details: any;
}


export interface AgentResponse {
    token: string | null;
    message: string | null;
    status: string | null;
    payload: string | object | null;
    error: string | null;
    debug: string | object | null;
}

export interface StatusResponse {
    status: string;
    payload: string | object | null;
    error: string | null;
    debug: string | object | null;
}
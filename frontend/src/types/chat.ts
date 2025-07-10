import { Mission } from '@/types/workflow';

export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
    TOOL = 'tool',
    STATUS = 'status'
}

// Chat persistence models
export interface Chat {
    id: string;
    user_session_id: string;
    title?: string;
    chat_metadata: Record<string, any>;
    created_at: string;
    updated_at: string;

    // Relationships (populated by services)
    messages: ChatMessage[];
}

export interface ChatMessage {
    id: string;
    chat_id: string;
    role: MessageRole;
    content: string;
    message_metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

// Chat API Request/Response types
export interface CreateChatMessageRequest {
    role: MessageRole;
    content: string;
    message_metadata?: Record<string, any>;
}

export interface CreateChatMessageResponse {
    message: ChatMessage;
}

// Lightweight asset reference for chat requests
export type AssetReference = {
    id: string;
    name: string;
    description: string;
    type: string;
    subtype?: string;
    metadata?: Record<string, any>;
}

export interface ChatRequest {
    messages: ChatMessage[];
    payload?: {
        // Additional context data
    };
}

// export interface ChatResponse 
// Chat ressponse is either AgentResponse or StatusResponse

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

// Streaming response types
export interface MissionPayload {
    mission: Mission;
}

export interface HopPayload {
    hop: any; // Could be more specific if Hop type is available
}

export interface StreamResponsePayload {
    mission?: Mission;
    hop?: any;
    [key: string]: any;
}

export interface AgentResponse {
    token: string | null;
    response_text: string | null;
    payload: StreamResponsePayload | string | null;
    status: string | null;
    error: string | null;
    debug: string | object | null;
}

export interface StatusResponse {
    status: string;
    payload: string | object | null;
    error: string | null;
    debug: string | object | null;
}

// Union type for all possible stream responses
export type StreamResponse = AgentResponse | StatusResponse;

// Stream Event Types (matching backend)
export enum StreamEventType {
    MESSAGE = 'message',
    ERROR = 'error',
    STATUS = 'status',
    COMPLETION = 'completion'
}

// Stream Event Data (matching backend)
export interface StreamEventData {
    event_type: StreamEventType;
    timestamp: string;
}

export interface ChatStreamMessageEvent extends StreamEventData {
    event_type: StreamEventType.MESSAGE;

    // Agent response fields
    token?: string;
    response_text?: string;
    payload?: Record<string, any>;
    status?: string;
    debug?: Record<string, any>;
}

export interface ChatStreamErrorEvent extends StreamEventData {
    event_type: StreamEventType.ERROR;
    error: string;
    error_code?: string;
    traceback?: string;
}

export interface ChatStreamStatusEvent extends StreamEventData {
    event_type: StreamEventType.STATUS;
    status: string;
    progress?: number;
    details?: Record<string, any>;
}

export interface ChatStreamCompletionEvent extends StreamEventData {
    event_type: StreamEventType.COMPLETION;
    success: boolean;
    summary?: string;
    metadata?: Record<string, any>;
}

// Union type for all possible stream events
export type ChatStreamEvent =
    | ChatStreamMessageEvent
    | ChatStreamErrorEvent
    | ChatStreamStatusEvent
    | ChatStreamCompletionEvent;

// Stream response wrapper
export interface ChatStreamResponse {
    event: StreamEventType;
    data: ChatStreamEvent;
}

// Response models for API endpoints
export interface GetChatMessagesResponse {
    messages: ChatMessage[];
}

// Helper type for stream data parsing
export interface StreamParseResult {
    response: StreamResponse;
    isValid: boolean;
    parseError?: string;
}
export enum AgentType {
    LIST_LABELS = 'list_labels',
    GET_MESSAGES = 'get_messages',
    GET_MESSAGE = 'get_message',
    EMAIL_SUMMARIZER = 'email_summarizer',
    EMAIL_LIST_SUMMARIZER = 'email_list_summarizer',
    PROMPT_TEMPLATE = 'prompt_template'
}

export enum AgentStatus {
    IDLE = 'idle',
    RUNNING = 'running',
    COMPLETED = 'completed',
    ERROR = 'error'
}

export interface Agent {
    agent_id: string;
    type: AgentType;
    description: string;
    status: AgentStatus;
    input_parameters: Record<string, any>;
    input_asset_ids?: string[];
    output_asset_ids?: string[];
    metadata: {
        lastRunAt?: string;
        completionTime?: string;
        lastError?: string;
        [key: string]: any;
    };
    name: string;
} 
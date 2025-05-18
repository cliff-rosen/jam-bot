import { Schema, SchemaValueType } from './schema';

export interface PromptTemplateToken {
    name: string;
    type: 'string' | 'file';
}

export interface PromptTemplate {
    template_id: string;
    name: string;
    description?: string;
    user_message_template: string;
    system_message_template?: string;
    tokens: PromptTemplateToken[];
    output_schema: Schema;
    created_at: string;
    updated_at: string;
}

export interface PromptTemplateCreate {
    name: string;
    description?: string;
    user_message_template: string;
    system_message_template?: string;
    tokens: PromptTemplateToken[];
    output_schema: Schema;
}

export interface PromptTemplateUpdate extends PromptTemplateCreate {
    template_id: string;
}

// Helper type to extract token names from PromptTemplateToken array
type TokenNames<T extends PromptTemplateToken[]> = T[number]['name'];

// Helper type to create parameter record keyed by token names
type TokenParameters<T extends PromptTemplateToken[]> = {
    [K in TokenNames<T>]: T[number] extends { name: K, type: 'string' } ? string : string;  // file tokens also use string (file_id)
};

export interface PromptTemplateTest<T extends PromptTemplateToken[] = PromptTemplateToken[]> {
    user_message_template: string;
    system_message_template?: string;
    tokens: T;
    parameters: TokenParameters<T>;
    output_schema: Schema;
}

export interface LLMExecuteRequest {
    prompt_template_id: string;
    regular_variables: Record<string, SchemaValueType>;
    file_variables: Record<string, string>;  // Maps variable name to file ID
    model?: string;
    max_tokens?: number;
}

export type MessageContent = {
    type: 'text';
    text: string;
} | {
    type: 'image_url';
    image_url: string;
};

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string | MessageContent[];
}

export interface LLMExecuteResponse {
    template_id: string;
    messages: Message[];
    response: SchemaValueType;
}

export interface PromptTemplateOutputField {
    type: string;
    description?: string;
}

export interface PromptTemplateOutput {
    description?: string;
    fields: PromptTemplateOutputField[];
}

export type PromptTemplateOutputSchema = {
    type: 'string';
    description?: string;
} | {
    type: 'object';
    description?: string;
    fields: {
        [key: string]: {
            type: string;
            description?: string;
        }
    }
}; 
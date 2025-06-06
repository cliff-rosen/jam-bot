import { apiClient } from './apiClient';
import { ToolStep, Asset } from '../types/workflow';

export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    parameters: ToolParameter[];
    outputs: ToolOutput[];
}

export interface ToolParameter {
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
    enum?: any[];
    schema?: any;
    example?: any;
}

export interface ToolOutput {
    name: string;
    type: string;
    description: string;
    schema?: any;
    required: boolean;
    example?: any;
}

export interface ToolExecutionResult {
    success: boolean;
    errors: string[];
    hop_state: Record<string, Asset>;
}

export const toolsApi = {
    /**
     * Get list of available tools
     */
    getAvailableTools: async (): Promise<ToolDefinition[]> => {
        const response = await apiClient.get('/tools/available');
        return response.data.tools;
    },

    /**
     * Execute a tool step
     */
    executeTool: async (
        toolId: string,
        step: ToolStep,
        hopState: Record<string, Asset>
    ): Promise<ToolExecutionResult> => {
        const response = await apiClient.post(`/tools/execute/${toolId}`, {
            step,
            hop_state: hopState
        });
        return response.data;
    }
}; 
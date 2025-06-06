import { api } from './index';
import { ToolStep } from '../../types/workflow';
import { Asset } from '../../types/asset';

export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    input_schema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
    output_schema: Array<{
        name: string;
        type: string;
        description: string;
        required: boolean;
        schema?: Record<string, any>;
    }>;
    examples?: Array<{
        description: string;
        input: Record<string, any>;
    }>;
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
        const response = await api.get<{ tools: ToolDefinition[] }>('/tools/available');
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
        const response = await api.post<ToolExecutionResult>(`/tools/execute/${toolId}`, {
            step,
            hop_state: hopState
        });
        return response.data;
    }
}; 
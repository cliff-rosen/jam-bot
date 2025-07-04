import { api } from './index';
import { ToolStep } from '../../types/workflow';
import { Asset } from '../../types/asset';
import { ToolDefinition } from '../../types/tool';

export interface ToolExecutionResult {
    success: boolean;
    errors: string[];
    outputs: Record<string, any>;  // Maps output parameter names to their values (serialized)
    canonical_outputs?: Record<string, any>;  // Maps output parameter names to their canonical typed values
    metadata?: Record<string, any>;  // Additional metadata about the execution
}

export const toolsApi = {
    /**
     * Get list of available tools
     */
    getAvailableTools: async (): Promise<ToolDefinition[]> => {
        const response = await api.get<{ tools: ToolDefinition[] }>('/api/tools/available');
        return response.data.tools;
    },

    /**
     * Get a single tool definition by ID
     */
    getToolDefinition: async (toolId: string): Promise<ToolDefinition> => {
        const response = await api.get<ToolDefinition>(`/api/tools/tools/${toolId}`);
        return response.data;
    },

    /**
     * Execute a tool step
     */
    executeTool: async (
        toolId: string,
        step: ToolStep,
        hopState: Record<string, Asset>
    ): Promise<ToolExecutionResult> => {
        const response = await api.post<ToolExecutionResult>(`/api/tools/execute/${toolId}`, {
            step,
            hop_state: hopState
        });
        return response.data;
    }
}; 
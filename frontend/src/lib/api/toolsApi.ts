import { api } from './index';
import { ToolStep } from '../../types/workflow';
import { Asset } from '../../types/asset';
import { ToolDefinition } from '../../types/tool';

export interface ToolExecutionResult {
    success: boolean;
    errors: string[];
    outputs: Record<string, any>;  // Maps output parameter names to their values
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
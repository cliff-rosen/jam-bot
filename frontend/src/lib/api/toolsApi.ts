import { api } from './index';
import { ToolStep } from '../../types/workflow';
import { Asset } from '../../types/asset';
import { ToolDefinition } from '../../types/tool';

export interface ToolExecutionResponse {
    success: boolean;
    errors: string[];
    outputs: Record<string, any>;  // Maps output parameter names to their values (serialized)
    canonical_outputs?: Record<string, any>;  // Maps output parameter names to their canonical typed values
    metadata?: Record<string, any>;  // Additional metadata about the execution
}

export interface ToolExecutionStatus {
    id: string;
    tool_id: string;
    step_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    error_message?: string;
    execution_result?: ToolExecutionResponse;
    created_at: string;
    started_at?: string;
    completed_at?: string;
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
     * Create a tool execution record (new streamlined approach)
     */
    createToolExecution: async (
        toolStep: ToolStep,
        hopState: Record<string, Asset>,
        missionId?: string
    ): Promise<{ execution_id: string }> => {
        const response = await api.post<{ execution_id: string }>('/api/tools/execution/create', {
            tool_step: toolStep,
            hop_state: hopState,
            mission_id: missionId
        });
        return response.data;
    },

    /**
     * Execute a tool by execution ID (new streamlined approach)
     */
    executeToolById: async (executionId: string): Promise<ToolExecutionResponse> => {
        const response = await api.post<ToolExecutionResponse>(`/api/tools/execution/${executionId}/execute`);
        return response.data;
    },

    /**
     * Get tool execution status and results
     */
    getToolExecutionStatus: async (executionId: string): Promise<ToolExecutionStatus> => {
        const response = await api.get<ToolExecutionStatus>(`/api/tools/execution/${executionId}`);
        return response.data;
    },

    /**
 * Execute a tool step (streamlined - uses create + execute pattern)
 */
    executeTool: async (
        toolId: string,
        step: ToolStep,
        hopState: Record<string, Asset>,
        missionId?: string
    ): Promise<ToolExecutionResponse> => {
        // Create tool execution record
        const createResponse = await toolsApi.createToolExecution(step, hopState, missionId);

        // Execute the tool
        const result = await toolsApi.executeToolById(createResponse.execution_id);

        return result;
    },

    /**
     * Execute a tool step (legacy - direct execution)
     */
    executeToolLegacy: async (
        toolId: string,
        step: ToolStep,
        hopState: Record<string, Asset>
    ): Promise<ToolExecutionResponse> => {
        const response = await api.post<ToolExecutionResponse>(`/api/tools/execute/${toolId}`, {
            step,
            hop_state: hopState
        });
        return response.data;
    }
}; 
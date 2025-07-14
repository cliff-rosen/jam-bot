import { api } from '@/lib/api';
import { ToolStep } from '@/types/workflow';
import { Asset, AssetMapSummary } from '@/types/asset';

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
    getTools: async (): Promise<any> => {
        const response = await api.get('/api/tools/available');
        return response.data;
    },

    /**
     * Convert asset mapping to hop_state format expected by backend
     */
    convertAssetMapToHopState: async (assetMap: AssetMapSummary): Promise<Record<string, Asset>> => {
        const hopState: Record<string, Asset> = {};

        // For each asset_id in the mapping, fetch the asset and add to hop_state
        for (const [assetId, role] of Object.entries(assetMap)) {
            try {
                const assetResponse = await api.get(`/api/assets/${assetId}`);
                const asset = assetResponse.data;
                // Use asset name as the key (backend expects hop_state by name)
                hopState[asset.name] = asset;
            } catch (error) {
                console.warn(`Failed to fetch asset ${assetId} for hop state:`, error);
            }
        }

        return hopState;
    },

    /**
     * Create a tool execution record (new streamlined approach)
     */
    createToolExecution: async (
        toolStep: ToolStep,
        assetMap: AssetMapSummary,
        missionId?: string
    ): Promise<{ execution_id: string }> => {
        // Convert asset mapping to hop_state format
        const hopState = await toolsApi.convertAssetMapToHopState(assetMap);

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
        assetMap: AssetMapSummary,
        missionId?: string
    ): Promise<ToolExecutionResponse> => {
        // Create tool execution record
        const createResponse = await toolsApi.createToolExecution(step, assetMap, missionId);

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
        assetMap: AssetMapSummary
    ): Promise<ToolExecutionResponse> => {
        // Convert asset mapping to hop_state format
        const hopState = await toolsApi.convertAssetMapToHopState(assetMap);

        const response = await api.post<ToolExecutionResponse>(`/api/tools/execute/${toolId}`, {
            step,
            hop_state: hopState
        });
        return response.data;
    }
}; 
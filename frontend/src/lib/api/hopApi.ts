import { Hop, HopStatus, ToolStep } from '@/types/workflow';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface CreateHopRequest {
    name: string;
    description: string;
    goal?: string;
    success_criteria?: string[];
    input_asset_ids?: string[];
    output_asset_ids?: string[];
    rationale?: string;
    is_final?: boolean;
    metadata?: Record<string, any>;
}

export interface UpdateHopRequest {
    name?: string;
    description?: string;
    goal?: string;
    success_criteria?: string[];
    input_asset_ids?: string[];
    output_asset_ids?: string[];
    rationale?: string;
    is_final?: boolean;
    is_resolved?: boolean;
    status?: HopStatus;
    error_message?: string;
    metadata?: Record<string, any>;
}

export interface CreateToolStepRequest {
    tool_id: string;
    description: string;
    template?: string;
    resource_configs?: Record<string, any>;
    parameter_mapping?: Record<string, any>;
    result_mapping?: Record<string, any>;
    validation_errors?: string[];
}

export interface HopApiResponse {
    message: string;
}

export interface ReorderToolStepsResponse {
    message: string;
    tool_steps: ToolStep[];
}

class HopApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'HopApiError';
    }
}

async function makeApiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE}/api${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new HopApiError(response.status, errorText);
    }

    return response.json();
}

export const hopApi = {
    /**
     * Create a new hop for a mission
     */
    async createHop(missionId: string, hopRequest: CreateHopRequest): Promise<Hop> {
        return makeApiCall<Hop>(`/hops/missions/${missionId}/hops`, {
            method: 'POST',
            body: JSON.stringify(hopRequest),
        });
    },

    /**
     * Get all hops for a mission
     */
    async getMissionHops(missionId: string): Promise<Hop[]> {
        return makeApiCall<Hop[]>(`/hops/missions/${missionId}/hops`);
    },

    /**
     * Get a hop by ID
     */
    async getHop(hopId: string): Promise<Hop> {
        return makeApiCall<Hop>(`/hops/${hopId}`);
    },

    /**
     * Update a hop
     */
    async updateHop(hopId: string, hopRequest: UpdateHopRequest): Promise<Hop> {
        return makeApiCall<Hop>(`/hops/${hopId}`, {
            method: 'PUT',
            body: JSON.stringify(hopRequest),
        });
    },

    /**
     * Update hop status
     */
    async updateHopStatus(hopId: string, status: HopStatus, errorMessage?: string): Promise<HopApiResponse> {
        const body: any = { status };
        if (errorMessage) {
            body.error_message = errorMessage;
        }

        return makeApiCall<HopApiResponse>(`/hops/${hopId}/status`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    },

    /**
     * Delete a hop
     */
    async deleteHop(hopId: string): Promise<HopApiResponse> {
        return makeApiCall<HopApiResponse>(`/hops/${hopId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Create a tool step for a hop
     */
    async createToolStep(hopId: string, toolStepRequest: CreateToolStepRequest): Promise<ToolStep> {
        return makeApiCall<ToolStep>(`/hops/${hopId}/tool-steps`, {
            method: 'POST',
            body: JSON.stringify(toolStepRequest),
        });
    },

    /**
     * Get all tool steps for a hop
     */
    async getHopToolSteps(hopId: string): Promise<ToolStep[]> {
        return makeApiCall<ToolStep[]>(`/hops/${hopId}/tool-steps`);
    },

    /**
     * Reorder tool steps within a hop
     */
    async reorderToolSteps(hopId: string, toolStepIds: string[]): Promise<ReorderToolStepsResponse> {
        return makeApiCall<ReorderToolStepsResponse>(`/hops/${hopId}/reorder-tool-steps`, {
            method: 'POST',
            body: JSON.stringify(toolStepIds),
        });
    },
}; 
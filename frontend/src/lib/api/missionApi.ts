import { Mission, MissionStatus } from '@/types/workflow';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface CreateMissionResponse {
    mission_id: string;
}

export interface MissionApiResponse {
    message: string;
}

export interface MissionWithHopsResponse {
    mission: Mission;
    hops: any[]; // Will be typed properly when hop types are ready
}

export interface MissionStatusUpdate {
    status: MissionStatus;
}

class MissionApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'MissionApiError';
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
        throw new MissionApiError(response.status, errorText);
    }

    return response.json();
}

export const missionApi = {
    /**
     * Create a new mission
     */
    async createMission(mission: Mission): Promise<CreateMissionResponse> {
        return makeApiCall<CreateMissionResponse>('/missions/', {
            method: 'POST',
            body: JSON.stringify(mission),
        });
    },

    /**
     * Get a mission by ID
     */
    async getMission(missionId: string): Promise<Mission> {
        return makeApiCall<Mission>(`/missions/${missionId}`);
    },

    /**
     * Get a mission with its hops and tool steps
     */
    async getMissionWithHops(missionId: string): Promise<MissionWithHopsResponse> {
        return makeApiCall<MissionWithHopsResponse>(`/missions/${missionId}/full`);
    },

    /**
     * Update an existing mission
     */
    async updateMission(missionId: string, mission: Mission): Promise<MissionApiResponse> {
        return makeApiCall<MissionApiResponse>(`/missions/${missionId}`, {
            method: 'PUT',
            body: JSON.stringify(mission),
        });
    },

    /**
     * Update mission status only
     */
    async updateMissionStatus(missionId: string, status: MissionStatus): Promise<MissionApiResponse> {
        return makeApiCall<MissionApiResponse>(`/missions/${missionId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    /**
     * Delete a mission
     */
    async deleteMission(missionId: string): Promise<MissionApiResponse> {
        return makeApiCall<MissionApiResponse>(`/missions/${missionId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Get all missions for the current user
     */
    async getUserMissions(): Promise<Mission[]> {
        return makeApiCall<Mission[]>('/missions/');
    },
}; 
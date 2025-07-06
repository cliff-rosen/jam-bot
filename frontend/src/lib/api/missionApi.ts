import { api } from './index';
import { Mission } from '@/types/workflow';

export interface CreateMissionResponse {
    mission_id: string;
}

export interface MissionApiResponse {
    message: string;
}

export const missionApi = {
    /**
     * Create a new mission
     */
    async createMission(mission: Mission): Promise<CreateMissionResponse> {
        const response = await api.post<CreateMissionResponse>('/api/missions/', mission);
        return response.data;
    },

    /**
     * Get a mission by ID
     */
    async getMission(missionId: string): Promise<Mission> {
        const response = await api.get<Mission>(`/api/missions/${missionId}`);
        return response.data;
    },

    /**
     * Update an existing mission
     */
    async updateMission(missionId: string, mission: Mission): Promise<MissionApiResponse> {
        const response = await api.put<MissionApiResponse>(`/api/missions/${missionId}`, mission);
        return response.data;
    },

    /**
     * Delete a mission
     */
    async deleteMission(missionId: string): Promise<MissionApiResponse> {
        const response = await api.delete<MissionApiResponse>(`/api/missions/${missionId}`);
        return response.data;
    },

    /**
     * Get all missions for the current user
     */
    async getUserMissions(): Promise<Mission[]> {
        const response = await api.get<Mission[]>('/api/missions/');
        return response.data;
    },
}; 
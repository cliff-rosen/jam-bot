/**
 * Session API Client
 * 
 * This module provides API functions for managing user sessions
 */

import { api } from './index';
import {
    UserSession,
    UserSessionStatus,
    CreateUserSessionRequest,
    CreateUserSessionResponse,
    UpdateUserSessionRequest,
    ListUserSessionsResponse
} from '@/types/user_session';

class SessionApiClient {
    /**
     * Create a new user session
     */
    async createSession(request: CreateUserSessionRequest): Promise<CreateUserSessionResponse> {
        const response = await api.post('/api/sessions/initialize', request);

        // Backend returns lightweight response with just IDs
        // Convert to expected format for compatibility
        const data = response.data;
        return {
            user_session: {
                id: data.id,
                user_id: 0, // Will be populated by auth context
                name: data.name || request.name || 'Session',
                status: 'active' as any,
                session_metadata: data.session_metadata || {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString(),
                mission: data.mission_id ? undefined : undefined
            } as any,
            chat: {
                id: data.chat_id,
                user_session_id: data.id,
                title: data.name || request.name || 'Session',
                chat_metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                messages: []
            }
        };
    }

    /**
     * List user sessions with pagination and filtering
     */
    async listSessions(
        page: number = 1,
        perPage: number = 20,
        statusFilter?: UserSessionStatus
    ): Promise<ListUserSessionsResponse> {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString()
        });

        if (statusFilter) {
            params.append('status_filter', statusFilter);
        }

        const response = await api.get(`/api/sessions/?${params.toString()}`);
        return response.data;
    }

    /**
     * Get the user's current active session
     */
    async getActiveSession(): Promise<UserSession | null> {
        const response = await api.get('/api/sessions/active');
        return response.data;
    }

    /**
     * Get a specific user session
     */
    async getSession(sessionId: string): Promise<UserSession> {
        const response = await api.get(`/api/sessions/${sessionId}`);
        return response.data;
    }

    /**
     * Update an existing user session
     */
    async updateSession(sessionId: string, request: UpdateUserSessionRequest): Promise<UserSession> {
        const response = await api.put(`/api/sessions/${sessionId}`, request);
        return response.data;
    }

    /**
     * Link a mission to a user session
     */
    async linkMissionToSession(sessionId: string, missionId: string): Promise<UserSession> {
        const response = await api.post(`/api/sessions/${sessionId}/link-mission/${missionId}`);
        return response.data;
    }

    /**
     * Update session activity timestamp
     */
    async updateSessionActivity(sessionId: string): Promise<void> {
        await api.post(`/api/sessions/${sessionId}/activity`);
    }

    /**
     * Mark session as completed
     */
    async completeSession(sessionId: string): Promise<UserSession> {
        const response = await api.post(`/api/sessions/${sessionId}/complete`);
        return response.data;
    }

    /**
     * Initialize a new session on login
     */
    async initializeSession(name?: string): Promise<CreateUserSessionResponse> {
        return this.createSession({
            name: name, // Will be auto-generated as "Session N" if not provided
            session_metadata: {
                source: 'web_app',
                initialized_at: new Date().toISOString()
            }
        });
    }

    /**
     * Auto-save session state (used for periodic updates)
     */
    async autoSaveSession(sessionId: string, metadata?: Record<string, any>): Promise<void> {
        try {
            await this.updateSessionActivity(sessionId);

            if (metadata) {
                await this.updateSession(sessionId, {
                    session_metadata: {
                        ...metadata,
                        last_auto_save: new Date().toISOString()
                    }
                });
            }
        } catch (error) {
            console.warn('Auto-save failed:', error);
            // Don't throw - auto-save failures shouldn't break the app
        }
    }
}

// Export singleton instance
export const sessionApi = new SessionApiClient();

// Export individual functions for backwards compatibility
export const {
    createSession,
    listSessions,
    getActiveSession,
    getSession,
    updateSession,
    linkMissionToSession,
    updateSessionActivity,
    completeSession,
    initializeSession,
    autoSaveSession
} = sessionApi; 
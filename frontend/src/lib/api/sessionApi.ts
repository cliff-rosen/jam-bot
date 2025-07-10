/**
 * Session API Client
 * 
 * This module provides API functions for managing user sessions
 */

import { api } from './index';
import {
    CreateUserSessionRequest,
    CreateUserSessionResponse
} from '@/types/user_session';

class SessionApiClient {
    /**
     * Initialize a new session on login
     */
    async initializeSession(name?: string): Promise<CreateUserSessionResponse> {
        const response = await api.post('/api/sessions/initialize', {
            name: name, // Will be auto-generated as "Session N" if not provided
            session_metadata: {
                source: 'web_app',
                initialized_at: new Date().toISOString()
            }
        });

        // Backend returns lightweight response with just IDs
        // Convert to expected format for compatibility
        const data = response.data;
        return {
            user_session: {
                id: data.id,
                user_id: data.user_id,
                name: data.name || name || 'Session',
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
                title: data.name || name || 'Session',
                chat_metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                messages: []
            }
        };
    }
}

// Export singleton instance
export const sessionApi = new SessionApiClient();

// Export individual functions for backwards compatibility
export const {
    initializeSession
} = sessionApi; 
/**
 * Session Context
 * 
 * This context manages user session state and provides session persistence
 * and recovery functionality. It integrates with the session API and handles
 * session lifecycle management.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserSession, UserSessionStatus, CreateUserSessionResponse } from '@/types/user_session';
import { sessionApi } from '@/lib/api/sessionApi';
import { useAuth } from './AuthContext';

interface SessionContextType {
    // Session state
    currentSession: UserSession | null;
    isSessionLoading: boolean;
    sessionError: string | null;

    // Session management
    initializeSession: (name?: string) => Promise<UserSession>;
    loadSession: (sessionId: string) => Promise<UserSession | null>;
    updateSession: (updates: Partial<UserSession>) => Promise<void>;
    completeSession: () => Promise<void>;
    linkMissionToSession: (missionId: string) => Promise<void>;

    // Session persistence
    saveSessionState: (metadata?: Record<string, any>) => Promise<void>;
    recoverSession: () => Promise<UserSession | null>;

    // Session activity
    updateActivity: () => void;

    // Session utilities
    getSessionMetadata: (key: string) => any;
    setSessionMetadata: (key: string, value: any) => Promise<void>;

    // Session history
    listSessions: () => Promise<UserSession[]>;
    switchToSession: (sessionId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    // Auto-save timer ref
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize session on authentication
    useEffect(() => {
        if (isAuthenticated && user && !currentSession) {
            recoverSession();
        }
    }, [isAuthenticated, user]);

    // Auto-save session state every 30 seconds
    useEffect(() => {
        if (currentSession && currentSession.status === UserSessionStatus.ACTIVE) {
            autoSaveTimerRef.current = setInterval(() => {
                saveSessionState();
            }, 30000); // 30 seconds

            return () => {
                if (autoSaveTimerRef.current) {
                    clearInterval(autoSaveTimerRef.current);
                }
            };
        }
    }, [currentSession]);

    // Update activity on user interaction
    useEffect(() => {
        const handleUserActivity = () => {
            if (currentSession) {
                updateActivity();
            }
        };

        // Listen for user activity
        window.addEventListener('mousedown', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);

        return () => {
            window.removeEventListener('mousedown', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
        };
    }, [currentSession]);

    /**
     * Initialize a new session
     */
    const initializeSession = async (name?: string): Promise<UserSession> => {
        setIsSessionLoading(true);
        setSessionError(null);

        try {
            const response: CreateUserSessionResponse = await sessionApi.initializeSession(name);
            const session = response.user_session;

            setCurrentSession(session);

            // Store session ID in localStorage for recovery
            localStorage.setItem('currentSessionId', session.id);

            return session;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize session';
            setSessionError(errorMessage);
            throw error;
        } finally {
            setIsSessionLoading(false);
        }
    };

    /**
     * Load a specific session
     */
    const loadSession = async (sessionId: string): Promise<UserSession | null> => {
        setIsSessionLoading(true);
        setSessionError(null);

        try {
            const session = await sessionApi.getSession(sessionId);
            setCurrentSession(session);

            // Store session ID in localStorage for recovery
            localStorage.setItem('currentSessionId', session.id);

            return session;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load session';
            setSessionError(errorMessage);
            return null;
        } finally {
            setIsSessionLoading(false);
        }
    };

    /**
     * Update current session
     */
    const updateSession = async (updates: Partial<UserSession>): Promise<void> => {
        if (!currentSession) return;

        try {
            const updatedSession = await sessionApi.updateSession(currentSession.id, updates);
            setCurrentSession(updatedSession);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update session';
            setSessionError(errorMessage);
            throw error;
        }
    };

    /**
     * Complete current session
     */
    const completeSession = async (): Promise<void> => {
        if (!currentSession) return;

        try {
            const completedSession = await sessionApi.completeSession(currentSession.id);
            setCurrentSession(completedSession);

            // Clear auto-save timer
            if (autoSaveTimerRef.current) {
                clearInterval(autoSaveTimerRef.current);
            }

            // Remove from localStorage
            localStorage.removeItem('currentSessionId');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to complete session';
            setSessionError(errorMessage);
            throw error;
        }
    };

    /**
     * Link mission to current session
     */
    const linkMissionToSession = async (missionId: string): Promise<void> => {
        if (!currentSession) return;

        try {
            const updatedSession = await sessionApi.linkMissionToSession(currentSession.id, missionId);
            setCurrentSession(updatedSession);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to link mission';
            setSessionError(errorMessage);
            throw error;
        }
    };

    /**
     * Save session state with metadata
     */
    const saveSessionState = async (metadata?: Record<string, any>): Promise<void> => {
        if (!currentSession) return;

        try {
            await sessionApi.autoSaveSession(currentSession.id, metadata);
        } catch (error) {
            // Don't throw - auto-save failures shouldn't break the app
            console.warn('Session auto-save failed:', error);
        }
    };

    /**
     * Recover session from storage or get active session
     */
    const recoverSession = async (): Promise<UserSession | null> => {
        setIsSessionLoading(true);
        setSessionError(null);

        try {
            // Try to recover from localStorage first
            const storedSessionId = localStorage.getItem('currentSessionId');
            if (storedSessionId) {
                const session = await loadSession(storedSessionId);
                if (session) {
                    return session;
                }
            }

            // If no stored session, try to get active session
            const activeSession = await sessionApi.getActiveSession();
            if (activeSession) {
                setCurrentSession(activeSession);
                localStorage.setItem('currentSessionId', activeSession.id);
                return activeSession;
            }

            // No active session, initialize new one
            return await initializeSession();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to recover session';
            setSessionError(errorMessage);

            // Try to initialize new session as fallback
            try {
                return await initializeSession();
            } catch (initError) {
                console.error('Failed to initialize fallback session:', initError);
                return null;
            }
        } finally {
            setIsSessionLoading(false);
        }
    };

    /**
     * Update session activity timestamp
     */
    const updateActivity = () => {
        if (currentSession) {
            // Debounced activity update
            sessionApi.updateSessionActivity(currentSession.id).catch(console.warn);
        }
    };

    /**
     * Get session metadata value
     */
    const getSessionMetadata = (key: string): any => {
        return currentSession?.session_metadata[key];
    };

    /**
     * Set session metadata value
     */
    const setSessionMetadata = async (key: string, value: any): Promise<void> => {
        if (!currentSession) return;

        const updatedMetadata = {
            ...currentSession.session_metadata,
            [key]: value
        };

        await updateSession({
            session_metadata: updatedMetadata
        });
    };

    /**
     * List user sessions
     */
    const listSessions = async (): Promise<UserSession[]> => {
        try {
            const response = await sessionApi.listSessions();
            return response.sessions;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to list sessions';
            setSessionError(errorMessage);
            throw error;
        }
    };

    /**
     * Switch to a different session
     */
    const switchToSession = async (sessionId: string): Promise<void> => {
        await loadSession(sessionId);
    };

    const contextValue: SessionContextType = {
        // Session state
        currentSession,
        isSessionLoading,
        sessionError,

        // Session management
        initializeSession,
        loadSession,
        updateSession,
        completeSession,
        linkMissionToSession,

        // Session persistence
        saveSessionState,
        recoverSession,

        // Session activity
        updateActivity,

        // Session utilities
        getSessionMetadata,
        setSessionMetadata,

        // Session history
        listSessions,
        switchToSession
    };

    return (
        <SessionContext.Provider value={contextValue}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = (): SessionContextType => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}; 
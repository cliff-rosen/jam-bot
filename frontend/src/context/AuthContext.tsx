import React, { createContext, useContext, useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api/index'

interface AuthContextType {
    isAuthenticated: boolean
    user: { id: string; username: string; email: string } | null
    login: any
    register: any
    logout: () => void
    error: string | null
    handleSessionExpired: () => void

    // Session management
    sessionId: string | null
    sessionName: string | null
    chatId: string | null
    missionId: string | null
    sessionMetadata: Record<string, any>

    // Session methods
    updateSessionMission: (missionId: string) => Promise<void>
    updateSessionMetadata: (metadata: Record<string, any>) => Promise<void>
    switchToNewSession: (sessionData: { session_id: string; session_name: string; chat_id: string; mission_id?: string; session_metadata: Record<string, any> }) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [user, setUser] = useState<{ id: string; username: string; email: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Session state
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [sessionName, setSessionName] = useState<string | null>(null)
    const [chatId, setChatId] = useState<string | null>(null)
    const [missionId, setMissionId] = useState<string | null>(null)
    const [sessionMetadata, setSessionMetadata] = useState<Record<string, any>>({})

    useEffect(() => {
        const token = localStorage.getItem('authToken')
        const userData = localStorage.getItem('user')
        if (token && userData) {
            setIsAuthenticated(true)
            setUser(JSON.parse(userData))

            // Restore session data from localStorage if available
            const sessionData = localStorage.getItem('sessionData')
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData)
                    setSessionId(parsed.sessionId)
                    setSessionName(parsed.sessionName)
                    setChatId(parsed.chatId)
                    setMissionId(parsed.missionId)
                    setSessionMetadata(parsed.sessionMetadata || {})
                    console.log('Restored session data from localStorage:', parsed)
                } catch (error) {
                    console.error('Error parsing session data from localStorage:', error)
                }
            }

            // Also try to fetch active session from backend in case data changed
            fetchActiveSession()
        }
    }, [])

    const fetchActiveSession = async () => {
        try {
            const response = await api.get('/api/sessions/active')
            const sessionData = response.data

            setSessionId(sessionData.id)
            setSessionName(sessionData.name)
            setChatId(sessionData.chat_id)
            setMissionId(sessionData.mission_id)
            setSessionMetadata(sessionData.session_metadata || {})

            // Update localStorage with fresh data
            localStorage.setItem('sessionData', JSON.stringify({
                sessionId: sessionData.id,
                sessionName: sessionData.name,
                chatId: sessionData.chat_id,
                missionId: sessionData.mission_id,
                sessionMetadata: sessionData.session_metadata || {}
            }))

            console.log('Fetched and restored active session from backend:', sessionData)
        } catch (error) {
            console.error('Error fetching active session:', error)
            // If no active session exists, that's okay - user might need to create one
        }
    }

    const login = useMutation({
        mutationFn: async (credentials: { username: string; password: string }) => {
            try {
                const params = new URLSearchParams()
                params.append('username', credentials.username)
                params.append('password', credentials.password)

                const response = await api.post('/api/auth/login', params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                })

                return response.data
            } catch (error: any) {
                if (error.response) {
                    const errorMessage = error.response.data?.detail ||
                        error.response.data?.message ||
                        error.response.data ||
                        'Login failed'
                    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
                } else if (error.request) {
                    throw new Error('No response from server. Please try again.')
                } else {
                    throw new Error(error.message || 'Login failed. Please try again.')
                }
            }
        },
        onSuccess: async (data) => {
            setError(null)
            localStorage.setItem('authToken', data.access_token)
            localStorage.setItem('user', JSON.stringify({
                id: data.user_id,
                username: data.username,
                email: data.email
            }))
            setUser({
                id: data.user_id,
                username: data.username,
                email: data.email
            })

            // Set session information directly from login response
            setSessionId(data.session_id)
            setSessionName(data.session_name)
            setChatId(data.chat_id)
            setMissionId(data.mission_id)
            setSessionMetadata(data.session_metadata || {})

            // Save session data to localStorage
            localStorage.setItem('sessionData', JSON.stringify({
                sessionId: data.session_id,
                sessionName: data.session_name,
                chatId: data.chat_id,
                missionId: data.mission_id,
                sessionMetadata: data.session_metadata || {}
            }))

            setIsAuthenticated(true)
        },
        onError: (error: Error) => {
            setError(error.message)
        }
    })

    const register = useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            try {
                const response = await api.post('/api/auth/register', credentials)
                return response.data
            } catch (error: any) {
                if (error.response) {
                    const errorMessage = error.response.data?.detail ||
                        error.response.data?.message ||
                        error.response.data ||
                        'Registration failed'
                    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
                } else if (error.request) {
                    throw new Error('No response from server. Please try again.')
                } else {
                    throw new Error(error.message || 'Registration failed. Please try again.')
                }
            }
        },
        onSuccess: () => {
            setError(null)
            setError('Registration successful! Please sign in.')
        },
        onError: (error: Error) => {
            setError(error.message)
        }
    })

    // Session management functions
    const updateSessionMission = async (newMissionId: string) => {
        if (!sessionId) return

        try {
            const response = await api.put(`/api/sessions/${sessionId}`, {
                mission_id: newMissionId
            })
            setMissionId(response.data.mission_id)

            // Update localStorage with new mission_id
            localStorage.setItem('sessionData', JSON.stringify({
                sessionId: sessionId,
                sessionName: sessionName,
                chatId: chatId,
                missionId: response.data.mission_id,
                sessionMetadata: sessionMetadata
            }))
        } catch (error) {
            console.error('Error updating session mission:', error)
            throw error
        }
    }

    const updateSessionMetadata = async (metadata: Record<string, any>) => {
        if (!sessionId) return

        try {
            const updatedMetadata = { ...sessionMetadata, ...metadata }
            const response = await api.put(`/api/sessions/${sessionId}`, {
                session_metadata: updatedMetadata
            })
            setSessionMetadata(response.data.session_metadata)

            // Update localStorage with new metadata
            localStorage.setItem('sessionData', JSON.stringify({
                sessionId: sessionId,
                sessionName: sessionName,
                chatId: chatId,
                missionId: missionId,
                sessionMetadata: response.data.session_metadata
            }))
        } catch (error) {
            console.error('Error updating session metadata:', error)
            // Don't throw - metadata updates shouldn't break the app
        }
    }

    const switchToNewSession = (sessionData: { session_id: string; session_name: string; chat_id: string; mission_id?: string; session_metadata: Record<string, any> }) => {
        setSessionId(sessionData.session_id)
        setSessionName(sessionData.session_name)
        setChatId(sessionData.chat_id)
        setMissionId(sessionData.mission_id || null)
        setSessionMetadata(sessionData.session_metadata)

        // Save session data to localStorage
        localStorage.setItem('sessionData', JSON.stringify({
            sessionId: sessionData.session_id,
            sessionName: sessionData.session_name,
            chatId: sessionData.chat_id,
            missionId: sessionData.mission_id || null,
            sessionMetadata: sessionData.session_metadata
        }))
    }

    const logout = () => {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        localStorage.removeItem('sessionData')
        setIsAuthenticated(false)
        setUser(null)

        // Clear session data
        setSessionId(null)
        setSessionName(null)
        setChatId(null)
        setMissionId(null)
        setSessionMetadata({})
    }

    const handleSessionExpired = () => {
        logout()
        setError('Your session has expired. Please login again.')
    }

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            login,
            register,
            logout,
            error,
            handleSessionExpired,

            // Session management
            sessionId,
            sessionName,
            chatId,
            missionId,
            sessionMetadata,

            // Session methods
            updateSessionMission,
            updateSessionMetadata,
            switchToNewSession
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
} 
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
    chatId: string | null
    missionId: string | null
    sessionMetadata: Record<string, any>

    // Session methods
    updateSessionMission: (missionId: string) => Promise<void>
    updateSessionMetadata: (metadata: Record<string, any>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [user, setUser] = useState<{ id: string; username: string; email: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Session state
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [chatId, setChatId] = useState<string | null>(null)
    const [missionId, setMissionId] = useState<string | null>(null)
    const [sessionMetadata, setSessionMetadata] = useState<Record<string, any>>({})

    useEffect(() => {
        const token = localStorage.getItem('authToken')
        const userData = localStorage.getItem('user')
        if (token && userData) {
            setIsAuthenticated(true)
            setUser(JSON.parse(userData))
        }
    }, [])

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
            setChatId(data.chat_id)
            setMissionId(data.mission_id)
            setSessionMetadata(data.session_metadata || {})

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
        } catch (error) {
            console.error('Error updating session metadata:', error)
            // Don't throw - metadata updates shouldn't break the app
        }
    }

    const logout = () => {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
        setUser(null)

        // Clear session data
        setSessionId(null)
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
            chatId,
            missionId,
            sessionMetadata,

            // Session methods
            updateSessionMission,
            updateSessionMetadata
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
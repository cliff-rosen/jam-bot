import { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api/index';
import settings from '../config/settings';

export default function TokenLogin() {
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    
    const token = searchParams.get('token');

    const loginWithToken = useMutation({
        mutationFn: async (loginToken: string) => {
            const params = new URLSearchParams();
            params.append('token', loginToken);
            
            const response = await api.post('/api/auth/login-with-token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            
            return response.data;
        },
        onSuccess: (data) => {
            // Store auth data in localStorage (same as regular login)
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user_id,
                username: data.username,
                email: data.email,
                role: data.role
            }));
            
            // Store session data
            localStorage.setItem('sessionData', JSON.stringify({
                sessionId: data.session_id,
                sessionName: data.session_name,
                chatId: data.chat_id,
                missionId: data.mission_id,
                sessionMetadata: data.session_metadata || {}
            }));
            
            setStatus('success');
            
            // Redirect after a brief delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        },
        onError: (error: any) => {
            setStatus('error');
            setErrorMessage(
                error.response?.data?.detail || 
                error.message || 
                'Login failed. The token may be invalid or expired.'
            );
        }
    });

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('No login token provided.');
            return;
        }

        // Attempt login with token
        loginWithToken.mutate(token);
    }, [token]);

    // If already authenticated, redirect to home
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        {settings.appName}
                    </h2>
                    <h1 className="text-3xl font-bold dark:text-white mb-2">
                        {status === 'loading' && 'Signing you in...'}
                        {status === 'success' && 'Welcome back!'}
                        {status === 'error' && 'Login Failed'}
                    </h1>
                </div>

                {status === 'loading' && (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-300">
                            Processing your login token...
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center">
                        <div className="text-green-600 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Successfully logged in! Redirecting...
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {errorMessage}
                        </div>
                        <div className="text-center">
                            <a
                                href="/"
                                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                            >
                                Go to Login
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
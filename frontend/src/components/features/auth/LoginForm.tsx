import { useState } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import settings from '@/config/settings';
import { useAuth } from '@/context/AuthContext';

interface LoginFormProps {
    isRegistering: boolean;
    setIsRegistering: (value: boolean) => void;
    login: UseMutationResult<any, Error, { username: string; password: string }, unknown>;
    register: UseMutationResult<any, Error, { email: string; password: string }, unknown>;
    error: string | null;
}

export default function LoginForm({ isRegistering, setIsRegistering, login, register, error }: LoginFormProps) {
    const { requestLoginToken } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isPasswordlessMode, setIsPasswordlessMode] = useState(false);
    const [tokenSent, setTokenSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isRegistering) {
            if (formData.password !== formData.confirmPassword) {
                setPasswordError("Passwords don't match");
                return;
            }

            register.mutate(
                { email: formData.email, password: formData.password },
                {
                    onSuccess: () => {
                        setIsRegistering(false);
                        setFormData(prev => ({
                            ...prev,
                            password: '',
                            confirmPassword: ''
                        }));
                        setPasswordError(null);
                    }
                }
            );
        } else if (isPasswordlessMode) {
            // Request login token using AuthContext
            requestLoginToken.mutate(formData.email, {
                onSuccess: () => {
                    setTokenSent(true);
                }
            });
        } else {
            // Regular login
            login.mutate({ username: formData.email, password: formData.password });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
            setPasswordError(null);
        }
    };

    return (
        <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    {settings.appName}
                </h2>
                <h1 className="text-3xl font-bold dark:text-white mb-2">
                    Welcome
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    {isRegistering
                        ? 'Create your account'
                        : isPasswordlessMode
                            ? 'Get a login link via email'
                            : 'Sign in to your account'
                    }
                </p>
            </div>

            {(error || passwordError || tokenSent || requestLoginToken.error) && (
                <div className={`border px-4 py-3 rounded relative ${error?.includes('successful') || tokenSent
                        ? 'bg-green-100 border-green-400 text-green-700'
                        : 'bg-red-100 border-red-400 text-red-700'
                    }`}>
                    {tokenSent
                        ? 'Login link sent! Check your email and click the link to sign in.'
                        : passwordError || error || (requestLoginToken.error as any)?.message
                    }
                </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="rounded-md shadow-sm space-y-4">
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Email address"
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                    </div>
                    {!isPasswordlessMode && (
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                        </div>
                    )}
                    {isRegistering && (
                        <div>
                            <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Confirm Password"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={requestLoginToken.isPending}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {requestLoginToken.isPending
                            ? 'Sending...'
                            : isRegistering
                                ? 'Register'
                                : isPasswordlessMode
                                    ? 'Send Login Link'
                                    : 'Sign in'
                        }
                    </button>
                </div>
            </form>

            <div className="text-center space-y-2">
                {!isRegistering && (
                    <button
                        onClick={() => {
                            setIsPasswordlessMode(!isPasswordlessMode);
                            setTokenSent(false);
                            setPasswordError(null);
                        }}
                        className="block w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-500"
                    >
                        {isPasswordlessMode
                            ? 'Use password instead'
                            : 'Get login link via email'}
                    </button>
                )}

                <button
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setIsPasswordlessMode(false);
                        setTokenSent(false);
                        setFormData(prev => ({
                            ...prev,
                            password: '',
                            confirmPassword: ''
                        }));
                        setPasswordError(null);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500"
                >
                    {isRegistering
                        ? 'Already have an account? Sign in'
                        : 'Need an account? Register'}
                </button>
            </div>
        </div>
    );
} 
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { MoonIcon, SunIcon, DocumentTextIcon, Square2StackIcon, FolderIcon, PlayIcon, BeakerIcon, ChatBubbleLeftRightIcon, UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import settings from '../config/settings'
import { HelpGuide } from './HelpGuide';
import { useState, useRef, useEffect } from 'react';

export default function TopBar() {
    const { isAuthenticated, logout, user } = useAuth()
    const { isDarkMode, toggleTheme } = useTheme()
    const location = useLocation()
    const [isDevelopOpen, setIsDevelopOpen] = useState(false);
    const developRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (developRef.current && !developRef.current.contains(event.target as Node)) {
                setIsDevelopOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Close dropdown when route changes
    useEffect(() => {
        setIsDevelopOpen(false);
    }, [location.pathname]);

    const isDevelopActive = location.pathname.startsWith('/workflows') ||
        location.pathname.startsWith('/prompts') ||
        location.pathname.startsWith('/files');

    return (
        <div className="bg-white dark:bg-gray-800 shadow">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <img
                                className="h-8 w-auto"
                                src={settings.logoUrl}
                                alt="Logo"
                            />
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
                            {/* Main Navigation Items */}
                            <Link
                                to="/fractal-bot"
                                className={`${location.pathname === '/fractal-bot'
                                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    } inline-flex items-center px-4 border-b-2 text-sm font-medium`}
                            >
                                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                                Collaborate
                            </Link>

                            {/* Develop Section with Dropdown */}
                            <div className="relative" ref={developRef}>
                                <button
                                    onClick={() => setIsDevelopOpen(!isDevelopOpen)}
                                    className={`${isDevelopActive
                                        ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        } inline-flex items-center px-4 border-b-2 text-sm font-medium`}
                                >
                                    <BeakerIcon className="h-5 w-5 mr-2" />
                                    Develop
                                    <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform duration-200 ${isDevelopOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isDevelopOpen && (
                                    <div className="absolute left-0 mt-1 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                                        <div className="py-1" role="menu">
                                            <Link
                                                to="/workflows"
                                                className={`${location.pathname.startsWith('/workflows')
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    } block px-4 py-2 text-sm transition-colors duration-150`}
                                                role="menuitem"
                                            >
                                                <div className="flex items-center">
                                                    <Square2StackIcon className="h-5 w-5 mr-2" />
                                                    Workflows
                                                </div>
                                            </Link>
                                            <Link
                                                to="/prompts"
                                                className={`${location.pathname.startsWith('/prompts')
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    } block px-4 py-2 text-sm transition-colors duration-150`}
                                                role="menuitem"
                                            >
                                                <div className="flex items-center">
                                                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                                                    Templates
                                                </div>
                                            </Link>
                                            <Link
                                                to="/files"
                                                className={`${location.pathname.startsWith('/files')
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    } block px-4 py-2 text-sm transition-colors duration-150`}
                                                role="menuitem"
                                            >
                                                <div className="flex items-center">
                                                    <FolderIcon className="h-5 w-5 mr-2" />
                                                    Files
                                                </div>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Link
                                to="/jobs"
                                className={`${location.pathname.startsWith('/jobs')
                                    ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    } inline-flex items-center px-4 border-b-2 text-sm font-medium`}
                            >
                                <PlayIcon className="h-5 w-5 mr-2" />
                                Run
                            </Link>
                        </div>
                    </div>

                    {/* Right side icons */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className="inline-flex items-center justify-center rounded-md w-8 h-8
                                     text-gray-400 hover:text-gray-500 dark:hover:text-gray-300
                                     hover:bg-gray-100 dark:hover:bg-gray-800
                                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                     transition-colors"
                        >
                            {isDarkMode ? (
                                <SunIcon className="h-5 w-5" />
                            ) : (
                                <MoonIcon className="h-5 w-5" />
                            )}
                        </button>
                        <HelpGuide />
                        {isAuthenticated && (
                            <>
                                <Link
                                    to="/profile"
                                    className={`${location.pathname === '/profile'
                                        ? 'text-blue-500'
                                        : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-300'
                                        } inline-flex items-center justify-center rounded-md w-8 h-8
                                        hover:bg-gray-100 dark:hover:bg-gray-800
                                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                        transition-colors`}
                                    aria-label="Profile"
                                    title="Profile"
                                >
                                    <UserCircleIcon className="h-5 w-5" />
                                </Link>
                                <button
                                    onClick={logout}
                                    className="ml-4 inline-flex items-center justify-center rounded-md
                                             px-3 py-1.5 text-sm font-medium
                                             text-gray-500 hover:text-gray-700 hover:bg-gray-100
                                             dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                                             focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                             transition-colors"
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} 
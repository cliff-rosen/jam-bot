import React, { useState } from 'react';
import { ToolBrowser } from '@/components/features/tools';

export default function LabPage() {
    const [activeTab, setActiveTab] = useState('hop');

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 border-b-2 border-gray-200 dark:border-gray-700">
                {/* Tabs */}
                <div className="px-4">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('hop')}
                                className={`${activeTab === 'hop'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                Hop
                            </button>
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`${activeTab === 'chat'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                Chat
                            </button>
                        </nav>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'hop' ? (
                    <div className="p-4 h-full">
                        <ToolBrowser />
                    </div>
                ) : (
                    <div className="p-4 h-full">
                        {/* A chat component can be placed here in the future */}
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Chat interface for the lab is under construction.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


import React, { useState } from 'react';
import { Agent, Tool } from './types';

interface AgentPanelProps {
    agents: Agent[];
    tools: Tool[];
    onAgentSelect: (agent: Agent) => void;
    onToolSelect: (tool: Tool) => void;
    className?: string;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
    agents,
    tools,
    onAgentSelect,
    onToolSelect,
    className = ''
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [showTools, setShowTools] = useState(false);

    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredTools = tools.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.capabilities.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAgentSelect = (agent: Agent) => {
        setSelectedAgent(agent);
        onAgentSelect(agent);
    };

    const renderMetrics = (metrics?: { usageCount: number; avgDuration: number; successRate: number }) => {
        if (!metrics) return null;

        return (
            <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-center">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Usage</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {metrics.usageCount}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Time</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {metrics.avgDuration.toFixed(1)}s
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Success</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {(metrics.successRate * 100).toFixed(1)}%
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {showTools ? 'Tools' : 'Agents'}
                        </h2>
                        <button
                            onClick={() => setShowTools(!showTools)}
                            className="ml-4 px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            Show {showTools ? 'Agents' : 'Tools'}
                        </button>
                    </div>
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${showTools ? 'tools' : 'agents'}...`}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 gap-4 p-4">
                    {showTools ? (
                        // Tools List
                        filteredTools.map(tool => (
                            <div
                                key={tool.id}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer"
                                onClick={() => onToolSelect(tool)}
                            >
                                <div className="p-4 bg-white dark:bg-gray-800">
                                    <div className="flex items-center">
                                        <svg
                                            className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d={tool.icon}
                                            />
                                        </svg>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                {tool.name}
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {tool.description}
                                            </p>
                                        </div>
                                    </div>
                                    {renderMetrics(tool.metrics)}
                                </div>
                            </div>
                        ))
                    ) : (
                        // Agents List
                        filteredAgents.map(agent => (
                            <div
                                key={agent.id}
                                className={`
                                    rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden
                                    ${selectedAgent?.id === agent.id
                                        ? 'ring-2 ring-blue-500'
                                        : 'hover:border-blue-500 dark:hover:border-blue-400'
                                    }
                                    cursor-pointer
                                `}
                                onClick={() => handleAgentSelect(agent)}
                            >
                                <div className="p-4 bg-white dark:bg-gray-800">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                {agent.name}
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                {agent.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Capabilities */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {agent.capabilities.map(capability => (
                                            <span
                                                key={capability}
                                                className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                            >
                                                {capability}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Tools Used */}
                                    {agent.tools.length > 0 && (
                                        <div className="mt-4">
                                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Tools
                                            </h5>
                                            <div className="flex flex-wrap gap-2">
                                                {agent.tools.map(toolId => {
                                                    const tool = tools.find(t => t.id === toolId);
                                                    return tool ? (
                                                        <span
                                                            key={tool.id}
                                                            className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                                                        >
                                                            {tool.name}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {renderMetrics(agent.metrics)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}; 
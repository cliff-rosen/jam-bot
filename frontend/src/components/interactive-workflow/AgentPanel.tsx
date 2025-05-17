import React from 'react';
import { Journey, Agent } from './types';

interface AgentPanelProps {
    journey: Journey | null;
}

const getAgentIcon = (agent: Agent) => {
    if (agent.capabilities.includes('data_collection')) return '🔍';
    if (agent.capabilities.includes('analysis')) return '📊';
    if (agent.capabilities.includes('generation')) return '✨';
    return '🤖';
};

const getAgentColor = (agent: Agent) => {
    if (agent.capabilities.includes('data_collection')) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    if (agent.capabilities.includes('analysis')) return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    if (agent.capabilities.includes('generation')) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
};

export const AgentPanel: React.FC<AgentPanelProps> = ({ journey }) => {
    if (!journey) {
        return <div className="text-gray-500 dark:text-gray-400">No journey selected</div>;
    }

    const agents = journey.agents || [];

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="p-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Agents</h3>
                {agents.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400">
                        No agents active
                    </div>
                ) : (
                    <div className="space-y-2">
                        {agents.map(agent => (
                            <div
                                key={agent.id}
                                className={`p-3 rounded-lg border ${getAgentColor(agent)}`}
                            >
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="text-4xl">{getAgentIcon(agent)}</div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {agent.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {agent.capabilities.join(' • ')}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {agent.description}
                                </div>
                                <div className="space-y-1">
                                    {agent.inputs && Object.entries(agent.inputs).length > 0 && (
                                        <div className="text-xs">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Inputs:</span>
                                            <ul className="list-disc list-inside">
                                                {Object.entries(agent.inputs).map(([key, value]) => (
                                                    <li key={key} className="text-gray-500 dark:text-gray-400">
                                                        {key}: {Array.isArray(value) ? value.join(', ') : value}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {agent.outputs && Object.entries(agent.outputs).length > 0 && (
                                        <div className="text-xs">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Outputs:</span>
                                            <ul className="list-disc list-inside">
                                                {Object.entries(agent.outputs).map(([key, value]) => (
                                                    <li key={key} className="text-gray-500 dark:text-gray-400">
                                                        {key}: {Array.isArray(value) ? value.join(', ') : value}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}; 
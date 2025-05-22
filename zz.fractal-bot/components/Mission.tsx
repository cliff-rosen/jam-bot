import React, { useState } from 'react';
import { useFractalBot } from '@/context/FractalBotContext';
import { LayoutGrid, List, Target, CheckCircle2, Clock } from 'lucide-react';
import { WorkflowVariable } from '@/components/fractal-bot/types/index';

interface MissionProps {
    className?: string;
}

export default function Mission({
    className = ''
}: MissionProps) {
    const {
        state,
        resetState
    } = useFractalBot();

    const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('compact');
    const mission = state.currentMission || {
        title: '',
        goal: '',
        status: 'pending',
        workflow: {
            id: '',
            name: '',
            description: '',
            status: 'pending',
            stages: [],
            state: [],
            inputMappings: [],
            outputMappings: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        state: [],
        inputMappings: [],
        outputMappings: [],
        resources: [],
        success_criteria: [],
        selectedTools: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30';
            case 'active':
                return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
            case 'failed':
                return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
            case 'ready':
                return 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20';
            case 'pending':
                return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
            default:
                return 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return 'COMPLETED';
            case 'current':
                return 'IN PROGRESS';
            case 'failed':
                return 'FAILED';
            case 'ready':
                return 'READY';
            case 'active':
                return 'ACTIVE';
            default:
                return 'PENDING';
        }
    };

    return (
        <div className={`dark:bg-[#1e2330] ${className}`}>
            {/* Clean Summary Bar */}
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                <div>
                    <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {mission.title || 'No Mission Selected'}
                    </h1>
                    {mission.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {mission.description}
                        </p>
                    )}
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(mission.status)}`}>
                    {getStatusText(mission.status)}
                </span>
            </div>

            <div className="p-4">
                {/* Mission Header */}
                <div className="relative">
                    {/* Section Heading Left, Title/Goal Centered */}
                    <div className="mb-4">
                        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">Current Mission</h2>
                        <div className="flex flex-col items-center text-center mt-1">
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-200">{mission.title || 'No Mission Selected'}</h1>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-0 right-0 flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(mission.status)} dark:bg-opacity-20`}>
                            {getStatusText(mission.status)}
                        </span>
                        <div className="flex space-x-1">
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-1.5 rounded-lg ${viewMode === 'compact'
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('expanded')}
                                className={`p-1.5 rounded-lg ${viewMode === 'expanded'
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={resetState}
                            className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Reset All
                        </button>
                    </div>
                </div>

                {viewMode === 'expanded' ? (
                    <>
                        <div className="mt-6 p-6 border-t border-gray-100 dark:border-gray-700">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-gray-50 dark:bg-[#252b3b] p-4 rounded-lg">
                                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inputs & Resources</h3>
                                    <div className="mt-4 grid grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Required Inputs</h4>
                                            <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                                                {mission.state?.filter(v => v.io_type === 'input').map((input: WorkflowVariable) => (
                                                    <li key={input.variable_id} className="flex items-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                                        {input.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Resources</h4>
                                            <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                                                {mission.resources?.map((resource: string) => (
                                                    <li key={resource} className="flex items-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                                        {resource}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-[#252b3b] p-4 rounded-lg">
                                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outputs</h3>
                                    <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                                        {mission.state?.filter(v => v.io_type === 'output').map((output: WorkflowVariable) => (
                                            <li key={output.variable_id} className="flex items-center">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                                {output.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-gray-50 dark:bg-[#252b3b] p-4 rounded-lg">
                                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected Tools</h3>
                                    <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                                        {mission.selectedTools?.map((tool) => (
                                            <li key={tool.id} className="flex items-center">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                                {tool.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-6 border-t border-gray-100 dark:border-gray-700">
                            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Success Criteria</h3>
                            <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                                {mission.success_criteria?.map((criterion: string) => (
                                    <li key={criterion} className="flex items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                        {criterion}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                ) : (
                    <div className="mt-2 p-1 border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 dark:bg-[#252b3b] p-2 rounded-lg">
                                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Inputs</h4>
                                <ul className="mt-1 space-y-0.5">
                                    {mission.state?.filter(v => v.io_type === 'input').slice(0, 3).map((input: WorkflowVariable) => (
                                        <li key={input.variable_id} className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                            {input.name}
                                        </li>
                                    ))}
                                    {mission.state?.filter(v => v.io_type === 'input').length > 3 && (
                                        <li className="text-xs text-gray-500 dark:text-gray-400">
                                            +{mission.state.filter(v => v.io_type === 'input').length - 3} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <div className="p-2">
                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                    {mission.goal || 'No mission goal defined'}
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#252b3b] p-2 rounded-lg">
                                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Outputs</h4>
                                <ul className="mt-1 space-y-0.5">
                                    {mission.state?.filter(v => v.io_type === 'output').slice(0, 3).map((output: WorkflowVariable) => (
                                        <li key={output.variable_id} className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                            {output.name}
                                        </li>
                                    ))}
                                    {mission.state?.filter(v => v.io_type === 'output').length > 3 && (
                                        <li className="text-xs text-gray-500 dark:text-gray-400">
                                            +{mission.state.filter(v => v.io_type === 'output').length - 3} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 
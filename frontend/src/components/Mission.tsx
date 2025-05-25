import React from 'react';
import { useJamBot } from '@/context/JamBotContext';

interface MissionProps {
    className?: string;
}

export default function Mission({
    className = ''
}: MissionProps) {
    const {
        state
    } = useJamBot();

    const mission = state.mission || {
        name: '',
        description: '',
        status: 'pending',
        inputs: [],
        outputs: []
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
            {/* Section Header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mission</h2>
            </div>
            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-4 px-4 pt-2 pb-4">
                {/* Left Column - Name and Description */}
                <div className="space-y-1">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {mission.name || 'No Mission Selected'}
                    </h1>
                    {mission.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {mission.description}
                        </p>
                    )}
                </div>

                {/* Right Column - Status, Inputs, Outputs */}
                <div className="space-y-1">
                    <div className="flex justify-end">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(mission.status)}`}>
                            {getStatusText(mission.status)}
                        </span>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Inputs</h3>
                        {mission.inputs && mission.inputs.length > 0 ? (
                            <ul className="space-y-1">
                                {mission.inputs.map((input, idx) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded px-2 py-1">
                                        {typeof input === 'string' ? input : input.name || JSON.stringify(input)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic">No inputs</div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Outputs</h3>
                        {mission.outputs && mission.outputs.length > 0 ? (
                            <ul className="space-y-1">
                                {mission.outputs.map((output, idx) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded px-2 py-1">
                                        {typeof output === 'string' ? output : output.name || JSON.stringify(output)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic">No outputs</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 
import React, { useState } from 'react';
import { Hop, ToolStep, ExecutionStatus } from '@/types/workflow';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getExecutionStatusDisplay, getStatusBadgeClass } from '@/utils/statusUtils';

interface CurrentHopDetailsProps {
    hop: Hop;
    className?: string;
}

export const CurrentHopDetails: React.FC<CurrentHopDetailsProps> = ({
    hop,
    className = ''
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showSteps, setShowSteps] = useState(true);

    // Helper function to truncate text
    const truncateText = (text: string, maxLength: number = 50): string => {
        if (!text) return 'N/A';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const statusDisplay = getExecutionStatusDisplay(hop.status);
    const completedSteps = hop.steps?.filter(step => step.status === ExecutionStatus.COMPLETED).length || 0;
    const totalSteps = hop.steps?.length || 0;

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Header with toggle */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500">Current Hop</h3>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center"
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Basic Info Card */}
            <div className="bg-gray-50 dark:bg-[#23283a] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {hop.name}
                    </h4>
                    <div className="flex items-center gap-2">
                        {hop.is_final && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                FINAL
                            </span>
                        )}
                        <span className={`${getStatusBadgeClass(statusDisplay.color)} flex items-center gap-1`}>
                            {statusDisplay.icon}
                            {statusDisplay.text}
                        </span>
                    </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400">
                    {hop.description || 'No description provided'}
                </p>

                {/* Progress Bar */}
                {totalSteps > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Step Progress</span>
                            <span>{completedSteps}/{totalSteps} steps</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                                className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="space-y-3">
                    {/* Input/Output Mappings */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Input Mapping</h5>
                            <div className="bg-gray-50 dark:bg-[#23283a] rounded p-2 text-xs">
                                {Object.keys(hop.input_mapping || {}).length > 0 ? (
                                    Object.entries(hop.input_mapping).map(([localKey, assetId]) => (
                                        <div key={localKey} className="flex justify-between py-0.5">
                                            <span className="text-gray-700 dark:text-gray-300 font-mono">{localKey}</span>
                                            <span className="text-gray-500 dark:text-gray-400 truncate ml-2">{truncateText(assetId, 20)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-gray-400 italic">No inputs</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Output Mapping</h5>
                            <div className="bg-gray-50 dark:bg-[#23283a] rounded p-2 text-xs">
                                {Object.keys(hop.output_mapping || {}).length > 0 ? (
                                    Object.entries(hop.output_mapping).map(([localKey, assetId]) => (
                                        <div key={localKey} className="flex justify-between py-0.5">
                                            <span className="text-gray-700 dark:text-gray-300 font-mono">{localKey}</span>
                                            <span className="text-gray-500 dark:text-gray-400 truncate ml-2">{truncateText(assetId, 20)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-gray-400 italic">No outputs</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Steps Section */}
                    {hop.steps && hop.steps.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Steps ({hop.steps.length})
                                </h5>
                                <button
                                    onClick={() => setShowSteps(!showSteps)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center"
                                >
                                    {showSteps ? 'Hide Steps' : 'Show Steps'}
                                    {showSteps ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                                </button>
                            </div>

                            {showSteps && (
                                <div className="space-y-2">
                                    {hop.steps.map((step, index) => {
                                        const stepStatus = getExecutionStatusDisplay(step.status);
                                        const isCurrentStep = index === hop.current_step_index;

                                        return (
                                            <div
                                                key={step.id || index}
                                                className={`bg-gray-50 dark:bg-[#23283a] rounded p-2 border-l-2 ${isCurrentStep
                                                    ? 'border-blue-500 dark:border-blue-400'
                                                    : 'border-gray-200 dark:border-gray-600'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                            Step {index + 1}
                                                        </span>
                                                        {isCurrentStep && (
                                                            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                                CURRENT
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Step Status */}
                                                    <span className={`${getStatusBadgeClass(stepStatus.color)} flex items-center gap-1`}>
                                                        {stepStatus.icon}
                                                        {stepStatus.text}
                                                    </span>
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-xs text-gray-700 dark:text-gray-300">
                                                        <span className="font-medium">Tool:</span> {step.tool_id}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        {truncateText(step.description, 80)}
                                                    </p>
                                                    {step.error && (
                                                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                                                            <span className="font-medium">Error:</span> {step.error}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* State Assets Count */}
                    {hop.state && Object.keys(hop.state).length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#23283a] rounded p-2">
                            <span className="font-medium">Local State:</span> {Object.keys(hop.state).length} assets
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <div>
                            <span className="font-medium">Resolved:</span> {hop.is_resolved ? 'Yes' : 'No'}
                        </div>
                        <div>
                            <span className="font-medium">Created:</span> {new Date(hop.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurrentHopDetails; 
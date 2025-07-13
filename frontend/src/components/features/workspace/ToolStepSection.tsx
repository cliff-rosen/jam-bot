import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ToolStep } from '@/types/workflow';

interface ToolStepSectionProps {
    toolSteps: ToolStep[];
    canCollapse?: boolean;
}

const ToolStepSection: React.FC<ToolStepSectionProps> = ({ toolSteps, canCollapse = false }) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    const toggleStepExpansion = (stepId: string) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(stepId)) {
            newExpanded.delete(stepId);
        } else {
            newExpanded.add(stepId);
        }
        setExpandedSteps(newExpanded);
    };

    const renderValue = (value: any) => {
        if (typeof value === 'object' && value !== null) {
            return <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
        }
        return <span className="text-sm">{String(value)}</span>;
    };

    if (!toolSteps || toolSteps.length === 0) {
        return null;
    }

    return (
        <div className="mt-4">
            <div className="space-y-2">
                {toolSteps.map((step) => {
                    const isExpanded = expandedSteps.has(step.id);
                    const hasDetails = step.parameter_mapping && Object.keys(step.parameter_mapping).length > 0 ||
                        step.result_mapping && Object.keys(step.result_mapping).length > 0 ||
                        step.resource_configs && Object.keys(step.resource_configs).length > 0;

                    return (
                        <div key={step.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {canCollapse && hasDetails && (
                                        <button
                                            onClick={() => toggleStepExpansion(step.id)}
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                            {step.name || `Step ${step.sequence_order}`}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${step.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                                            step.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                                step.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                                        }`}>
                                        {step.status}
                                    </span>
                                </div>
                            </div>

                            {canCollapse && hasDetails && isExpanded && (
                                <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                                    <div className="space-y-3">
                                        {step.parameter_mapping && Object.keys(step.parameter_mapping).length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Parameters</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(step.parameter_mapping).map(([key, value]) => (
                                                        <div key={key} className="flex flex-col gap-1">
                                                            <span className="font-medium text-xs text-gray-600 dark:text-gray-400">{key}:</span>
                                                            {renderValue(value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {step.result_mapping && Object.keys(step.result_mapping).length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Outputs</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(step.result_mapping).map(([key, value]) => (
                                                        <div key={key} className="flex flex-col gap-1">
                                                            <span className="font-medium text-xs text-gray-600 dark:text-gray-400">{key}:</span>
                                                            {renderValue(value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {step.resource_configs && Object.keys(step.resource_configs).length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Resources</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(step.resource_configs).map(([key, value]) => (
                                                        <div key={key} className="flex flex-col gap-1">
                                                            <span className="font-medium text-xs text-gray-600 dark:text-gray-400">{key}:</span>
                                                            {renderValue(value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!canCollapse && hasDetails && (
                                <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                                    <div className="space-y-3">
                                        {step.parameter_mapping && Object.keys(step.parameter_mapping).length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Parameters</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(step.parameter_mapping).map(([key, value]) => (
                                                        <div key={key} className="flex flex-col gap-1">
                                                            <span className="font-medium text-xs text-gray-600 dark:text-gray-400">{key}:</span>
                                                            {renderValue(value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {step.result_mapping && Object.keys(step.result_mapping).length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Outputs</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(step.result_mapping).map(([key, value]) => (
                                                        <div key={key} className="flex flex-col gap-1">
                                                            <span className="font-medium text-xs text-gray-600 dark:text-gray-400">{key}:</span>
                                                            {renderValue(value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {step.resource_configs && Object.keys(step.resource_configs).length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Resources</h5>
                                                <div className="space-y-2">
                                                    {Object.entries(step.resource_configs).map(([key, value]) => (
                                                        <div key={key} className="flex flex-col gap-1">
                                                            <span className="font-medium text-xs text-gray-600 dark:text-gray-400">{key}:</span>
                                                            {renderValue(value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ToolStepSection; 
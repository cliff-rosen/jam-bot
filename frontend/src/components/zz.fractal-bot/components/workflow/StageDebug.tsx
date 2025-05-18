import React, { useState, useEffect } from 'react';
import type { Stage, Step, Workflow } from '../../types';
import { getStepFromTree } from '../../utils/variableScoping';

interface StageDebugProps {
    workflow: Workflow;
}

export default function StageDebug({ workflow }: StageDebugProps) {
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [selectedStep, setSelectedStep] = useState<Step | null>(null);

    // useeffect to find the step in the workflow tree
    useEffect(() => {
        const step = getStepFromTree(workflow.stages[0], selectedStepId);
        if (step) {
            setSelectedStep(step);
        }
    }, [selectedStepId]);


    const renderStep = (step: Step, depth: number = 0) => {
        return (
            <div key={step.id} style={{ marginLeft: `${depth * 20}px` }} className="py-1">
                <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded"
                    onClick={() => setSelectedStepId(step.id)}
                >
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {step.id}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        {step.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${step.status === 'ready' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        step.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            step.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                step.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                        {step.status}
                    </span>
                </div>
                {step.substeps?.map(substep => renderStep(substep, depth + 1))}
            </div>
        );
    };

    const renderStepDetails = (step: Step) => {
        return (
            <div className="space-y-4">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">[{step.id}] - {step.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
                </div>

                <div className="space-y-2">
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{step.status}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{step.type || 'Not specified'}</p>
                    </div>

                    {step.tool_id && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tool ID</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{step.tool_id}</p>
                        </div>
                    )}

                    {step.childVariables && step.childVariables.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Variables</h4>
                            <div className="mt-2 space-y-2">
                                {step.childVariables.map(variable => (
                                    <div key={variable.variable_id} className="text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{variable.name}</span>
                                        <span className="text-gray-500 dark:text-gray-500"> ({variable.io_type})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-2 h-full">
            {/* Left Column - Step Tree */}
            <div className="border-r border-gray-200 dark:border-gray-700 p-4 overflow-auto">
                <div className="space-y-4">
                    {workflow.stages.map((stage, stageIndex) => (
                        <div key={stage.id} className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div className="space-y-1">
                                {stage.steps.map(step => renderStep(step))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column - Step Details */}
            <div className="p-4 overflow-auto">
                {selectedStep ? (
                    renderStepDetails(selectedStep)
                ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-center mt-8">
                        Select a step to view details
                    </div>
                )}
            </div>
        </div>
    );
}




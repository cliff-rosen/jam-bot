import React from 'react';
import { Workflow } from './types';

interface WorkflowCardProps {
    workflow?: Workflow;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow }) => {

    if (!workflow) {
        return <div className="text-gray-500 dark:text-gray-400">No workflow</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="p-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Workflow Steps</h3>
                <div className="space-y-1">
                    {workflow.steps.length === 0 && workflow.status === 'pending' ? (
                        <div className="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-900">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    Design in progress
                                </div>
                            </div>
                        </div>
                    ) : (
                        workflow.steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`flex items-center gap-2 p-2 rounded ${index < workflow.currentStepIndex
                                    ? 'bg-gray-50 dark:bg-gray-900'
                                    : index === workflow.currentStepIndex
                                        ? 'bg-blue-50 dark:bg-blue-900'
                                        : 'bg-white dark:bg-gray-800'
                                    }`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${index < workflow.currentStepIndex
                                    ? 'bg-green-500'
                                    : index === workflow.currentStepIndex
                                        ? 'bg-blue-500'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {step.name} • {step.agentType}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {step.description}
                                    </div>
                                </div>
                                {index === workflow.currentStepIndex && (
                                    <div className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 whitespace-nowrap">
                                        Current
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}; 
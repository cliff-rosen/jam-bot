import React, { useState } from 'react';
import { WorkflowStep } from './types';

interface WorkflowViewerProps {
    steps: WorkflowStep[];
    currentStepIndex: number;
    onStepSelect: (stepIndex: number) => void;
    onStepReorder: (fromIndex: number, toIndex: number) => void;
    onStepToggle: (stepIndex: number) => void;
    className?: string;
}

export const WorkflowViewer: React.FC<WorkflowViewerProps> = ({
    steps,
    currentStepIndex,
    onStepSelect,
    onStepReorder,
    onStepToggle,
    className = ''
}) => {
    const [draggedStep, setDraggedStep] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedStep(index);
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedStep === null) return;
        onStepReorder(draggedStep, index);
        setDraggedStep(null);
    };

    const getStepStatusColor = (status: WorkflowStep['status']) => {
        switch (status) {
            case 'running':
                return 'bg-blue-500 animate-pulse';
            case 'completed':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            default:
                return 'bg-gray-300 dark:bg-gray-600';
        }
    };

    const renderStep = (step: WorkflowStep, index: number, level: number = 0) => {
        const isCurrentStep = index === currentStepIndex;
        const marginLeft = level * 2;

        return (
            <div key={step.id}>
                <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`
                        flex items-center p-4 mb-2 rounded-lg cursor-pointer
                        transition-all duration-200 ease-in-out
                        ${isCurrentStep
                            ? 'bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500'
                            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                        ml-${marginLeft}
                    `}
                    onClick={() => onStepSelect(index)}
                >
                    {/* Status Indicator */}
                    <div className={`w-3 h-3 rounded-full ${getStepStatusColor(step.status)}`} />

                    {/* Step Content */}
                    <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {step.name}
                            </h4>
                            <div className="flex items-center space-x-2">
                                {/* Progress Indicator */}
                                {step.progress > 0 && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {step.progress}%
                                    </span>
                                )}

                                {/* Expand/Collapse Button (if has substeps) */}
                                {step.subSteps && step.subSteps.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onStepToggle(index);
                                        }}
                                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <svg
                                            className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d={step.isExpanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"}
                                            />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Step Description */}
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {step.description}
                        </p>

                        {/* Tools Used */}
                        {step.tools && step.tools.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {step.tools.map(tool => (
                                    <span
                                        key={tool}
                                        className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                    >
                                        {tool}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Render Substeps */}
                {step.subSteps && step.isExpanded && step.subSteps.map((subStep, subIndex) =>
                    renderStep(subStep, index + subIndex + 1, level + 1)
                )}
            </div>
        );
    };

    return (
        <div className={`overflow-y-auto p-4 ${className}`}>
            {/* Progress Bar */}
            <div className="mb-6">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
                        style={{
                            width: `${(currentStepIndex + 1) / steps.length * 100}%`
                        }}
                    />
                </div>
                <div className="mt-2 flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>Step {currentStepIndex + 1} of {steps.length}</span>
                    <span>{Math.round((currentStepIndex + 1) / steps.length * 100)}% Complete</span>
                </div>
            </div>

            {/* Steps List */}
            <div className="space-y-2">
                {steps.map((step, index) => renderStep(step, index))}
            </div>
        </div>
    );
}; 
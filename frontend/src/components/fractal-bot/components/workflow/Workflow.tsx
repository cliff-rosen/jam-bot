import React, { useState } from 'react';
import { useFractalBot } from '@/context/FractalBotContext';
import type { Stage } from '../../types';
import StepsList from './StepsList';
import StageCard from './StageCard';
import StageDebug from './StageDebug';

interface WorkflowProps {
    className?: string;
}

export default function Workflow({ className = '' }: WorkflowProps) {
    const { state, generateWorkflow, setCurrentStage } = useFractalBot();

    const workflow = state.currentWorkflow;

    const handleGenerateWorkflowClick = async () => {
        try {
            await generateWorkflow();
        } catch (error) {
            console.error('Failed to generate workflow:', error);
        }
    };

    const handleStageClick = (stageIdx: number) => {
        console.log('handleStageClick', stageIdx);
        setCurrentStage(stageIdx);
    };

    // Show generate button only when mission is ready and workflow is not ready
    const shouldShowGenerateButton = state.currentMission.status === 'ready' && workflow.status !== 'ready';

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
            <div className="relative">
                {/* Workflow Header */}
                <div className="relative p-4">
                    <div className="flex flex-col">
                        <div className="space-y-0.5">
                            <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">Workflow Stages</h2>
                        </div>
                        {shouldShowGenerateButton && (
                            <button
                                onClick={handleGenerateWorkflowClick}
                                className="mt-4 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            >
                                Generate Workflow
                            </button>
                        )}
                    </div>
                </div>

                {/* Horizontal Stages */}
                <div className="relative py-2">
                    <div className="flex justify-center items-center">
                        {workflow.stages.map((stage: Stage, index: number) => (
                            <React.Fragment key={stage.id}>
                                <StageCard
                                    stage={stage}
                                    index={index}
                                    isSelected={state.currentStageIdx === index}
                                    onClick={handleStageClick}
                                />
                                {index < workflow.stages.length - 1 && (
                                    <div className="flex items-center px-6">
                                        <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                        <div className="w-2 h-2 border-t-2 border-r-2 border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Vertical line between workflow and step list, aligned with selected stage */}
                {state.currentStageIdx !== null && (
                    <div className="flex justify-center items-start gap-16" style={{ minHeight: '1.5rem' }}>
                        {workflow.stages.map((_, idx) => (
                            <div key={idx} className="flex-1 flex justify-center">
                                {state.currentStageIdx === idx ? (
                                    <div className="w-1 h-4 bg-blue-500 dark:bg-blue-400 my-1 rounded"></div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}

                {/* Stage Details */}
                {state.currentStageIdx !== null && (
                    <div className="relative px-4 pb-4">
                        <StepsList stage={workflow.stages[state.currentStageIdx]} />
                    </div>
                )}
            </div>
        </div>
    );
} 
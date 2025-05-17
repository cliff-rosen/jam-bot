import React, { useState } from 'react';
import { ChatMessage, WorkflowStep, StepDetails } from './types';
import { AssetModal } from './AssetModal';

interface Asset {
    id: string;
    title: string;
    data: Record<string, any>;
    icon: string;
    type: string;
}

interface InformationPaletteProps {
    messages: ChatMessage[];
    workflowInputs: Record<string, any>;
    workflowSteps: WorkflowStep[];
    currentStepIndex: number;
    stepDetails: Record<string, StepDetails>;
}

export const InformationPalette: React.FC<InformationPaletteProps> = ({
    messages,
    workflowInputs,
    workflowSteps,
    currentStepIndex,
    stepDetails
}) => {
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const getAssetsUpToStep = (stepIndex: number): Asset[] => {
        const assets: Asset[] = [];

        // Initial Question asset
        const question = messages.find(m =>
            m.role === 'assistant' &&
            m.metadata?.phase === 'setup' &&
            m.metadata?.subPhase === 'question_development'
        )?.content;

        assets.push({
            id: 'initial-question',
            title: 'Initial Question',
            data: { question: question || 'No question available' },
            icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            type: 'question'
        });

        // Add assets for completed steps
        for (let i = 0; i <= Math.min(stepIndex, workflowSteps.length - 1); i++) {
            const step = workflowSteps[i];
            const stepDetail = stepDetails[step.id];

            switch (step.name) {
                case 'Compile Beatles Songs':
                    assets.push({
                        id: step.id,
                        title: 'Song List',
                        data: stepDetail?.outputs || { status: 'Compiling songs...' },
                        icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
                        type: 'list'
                    });
                    break;
                case 'Retrieve Song Lyrics':
                    assets.push({
                        id: step.id,
                        title: 'Lyrics Database',
                        data: stepDetail?.outputs || { status: 'Retrieving lyrics...' },
                        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
                        type: 'database'
                    });
                    break;
                case 'Analyze Love References':
                    assets.push({
                        id: step.id,
                        title: 'Analysis',
                        data: stepDetail?.outputs || { status: 'Analyzing lyrics...' },
                        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                        type: 'analysis'
                    });
                    break;
            }
        }

        // Add Final Answer asset if workflow is complete
        const isComplete = workflowSteps.length > 0 &&
            stepIndex === workflowSteps.length - 1 &&
            workflowSteps[stepIndex].status === 'completed';

        if (isComplete) {
            // Find the result message
            const resultMessage = messages.find(m =>
                m.role === 'assistant' &&
                m.metadata?.phase === 'execution' &&
                m.metadata?.type === 'result'
            );

            assets.push({
                id: 'final-answer',
                title: 'Final Answer',
                data: {
                    result: resultMessage?.content || 'Analysis complete',
                    summary: stepDetails[workflowSteps[stepIndex].id]?.outputs?.summary || {}
                },
                icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
                type: 'result'
            });
        }

        return assets;
    };

    const assets = getAssetsUpToStep(currentStepIndex);

    return (
        <>
            <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    Information Palette
                </h3>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        {assets.map((asset) => (
                            <div
                                key={asset.id}
                                className={`
                                    group relative flex flex-col
                                    bg-white dark:bg-gray-800 rounded-lg
                                    border border-gray-200 dark:border-gray-700
                                    shadow-sm hover:shadow-md
                                    transition-all duration-200
                                    cursor-pointer
                                    ${asset.type === 'result' ? 'border-green-200 dark:border-green-800 ring-1 ring-green-500/20' : ''}
                                `}
                                onClick={() => setSelectedAsset(asset)}
                                draggable="true"
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', JSON.stringify(asset));
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                <div className="flex items-start p-3 gap-3">
                                    <div className={`
                                        flex-shrink-0 w-10 h-10 rounded-lg
                                        flex items-center justify-center
                                        ${asset.type === 'question' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                                            asset.type === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                                asset.type === 'database' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                    asset.type === 'result' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                        'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}
                                    `}>
                                        <svg
                                            className="w-6 h-6"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d={asset.icon}
                                            />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {asset.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Click to open • Drag to use
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AssetModal
                asset={selectedAsset}
                onClose={() => setSelectedAsset(null)}
            />
        </>
    );
}; 
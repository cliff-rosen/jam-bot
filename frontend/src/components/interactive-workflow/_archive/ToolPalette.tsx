import React from 'react';
import { ToolTemplate, WorkflowStep } from './types';

interface ToolPaletteProps {
    tools: ToolTemplate[];
    currentStepIndex: number;
    onAddStep: (step: WorkflowStep) => void;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({
    tools,
    currentStepIndex,
    onAddStep
}) => {
    return (
        <div className="h-full overflow-y-auto bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Tool Palette
            </h3>
            <div className="space-y-4">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-purple-100 dark:border-purple-800 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-md"
                        onClick={() => {
                            const newStep: WorkflowStep = {
                                id: crypto.randomUUID(),
                                name: tool.name,
                                description: tool.description,
                                status: 'pending',
                                agentType: tool.category
                            };
                            onAddStep(newStep);
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {tool.name}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {tool.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 
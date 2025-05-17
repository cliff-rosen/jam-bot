import React, { useState } from 'react';
import { JourneyCard } from './JourneyCard';
import { WorkflowCard } from './WorkflowCard';
import { WorkspacePanel } from './WorkspacePanel';
import { EnhancedChatPanel } from './EnhancedChatPanel';
import { uiSnapshots } from './workflowTransitionData';
import { ActionButton } from './types';
import { AgentPanel } from './AgentPanel';
import { AssetPanel } from './AssetPanel';

const InteractiveWorkflowTest: React.FC = () => {
    const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
    const currentSnapshot = uiSnapshots[currentSnapshotIndex];
    const [inputMessage, setInputMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleNext = () => {
        if (currentSnapshotIndex < uiSnapshots.length - 1) {
            setCurrentSnapshotIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentSnapshotIndex > 0) {
            setCurrentSnapshotIndex(prev => prev - 1);
        }
    };

    const handleReset = () => {
        setCurrentSnapshotIndex(0);
    };

    const handleAction = (action: ActionButton['action']) => {
        switch (action) {
            case 'accept_journey':
            case 'reject_journey':
            case 'edit_journey':
            case 'start_design':
            case 'accept_workflow':
            case 'reject_workflow':
                handleNext();
                break;
        }
    };

    const handleSendMessage = (message: string) => {
        setIsProcessing(true);
        // Simulate processing
        setTimeout(() => {
            setIsProcessing(false);
            setInputMessage('');
        }, 1000);
    };

    const getActionButtons = () => {
        if (!currentSnapshot.journey?.messages) return [];

        const messages = currentSnapshot.journey.messages;
        const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');

        if (!lastAssistantMessage?.metadata?.actionButtons) return [];

        return lastAssistantMessage.metadata.actionButtons.map(button => ({
            ...button,
            onClick: () => handleAction(button.action)
        }));
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
            {/* Header */}
            <div className="h-12 bg-white dark:bg-gray-800 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Orchestrator Demo
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handlePrevious}
                        disabled={currentSnapshotIndex === 0}
                        className="px-3 py-1 text-sm rounded bg-gray-200 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentSnapshotIndex === uiSnapshots.length - 1}
                        className="px-3 py-1 text-sm rounded bg-blue-500 text-white disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex p-4 gap-4 overflow-hidden">
                {/* Left: Chat Panel */}
                <div className="w-[400px] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    <div className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Chat</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <EnhancedChatPanel
                            messages={currentSnapshot.journey?.messages || []}
                            inputMessage={inputMessage}
                            isProcessing={isProcessing}
                            onSendMessage={handleSendMessage}
                            actionButtons={getActionButtons()}
                        />
                    </div>
                </div>

                {/* Right: Journey, Workflow, and Workspace */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Journey Card */}
                    {currentSnapshot.journey && currentSnapshot.journey.status !== 'draft' && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <div className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Journey</h2>
                            </div>
                            <div className="p-4">
                                <JourneyCard journey={currentSnapshot.journey} />
                            </div>
                        </div>
                    )}

                    {/* Two Column Layout */}
                    <div className="flex-1 flex gap-4">
                        {/* Left Column */}
                        <div className="flex-1 flex flex-col gap-4">
                            {/* Workflow Card */}
                            <div className="h-[300px] bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <div className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                                    <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Workflow</h2>
                                </div>
                                <div className="p-4 h-[calc(300px-3rem)] overflow-y-auto">
                                    <WorkflowCard workflow={currentSnapshot.journey?.workflow || undefined} />
                                </div>
                            </div>

                            {/* Workspace Panel */}
                            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <div className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                                    <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Workspace</h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <WorkspacePanel
                                        journey={currentSnapshot.journey}
                                        onAction={handleAction}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="w-[400px] flex flex-col gap-4">
                            {/* Agent Panel */}
                            <div className="h-[300px] bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <div className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                                    <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Agents</h2>
                                </div>
                                <div className="p-4 h-[calc(300px-3rem)] overflow-y-auto">
                                    <AgentPanel journey={currentSnapshot.journey} />
                                </div>
                            </div>

                            {/* Asset Panel */}
                            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <div className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                                    <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Assets</h2>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <AssetPanel journey={currentSnapshot.journey} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InteractiveWorkflowTest; 
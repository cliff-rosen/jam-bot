import React from 'react';
import { Play, Square, RotateCcw, Settings, CheckCircle, XCircle } from 'lucide-react';

import { useJamBot } from '@/context/JamBotContext';
import { MessageRole } from '@/types/chat';

import { Mission } from './Mission';
import { SessionManagement } from './SessionManagement';
import { HopDetails } from '@/components/features/hop';
import { Hop, HopStatus, MissionStatus } from '@/types/workflow';

const CollabArea: React.FC = () => {
    const {
        state,
        acceptMissionProposal,
        acceptHopProposal,
        acceptHopImplementationProposal,
        startHopExecution,
        failHopExecution,
        retryHopExecution,
        sendMessage,
        createMessage
    } = useJamBot();

    const handleStartHopPlanning = async () => {
        if (!state.mission) return;

        const planningMessage = createMessage(
            "I'm ready to start planning the first hop for this mission. Please help me design the hop plan.",
            MessageRole.USER
        );

        sendMessage(planningMessage);
    };

    const handleStartHopImplementation = async () => {
        if (!state.mission?.current_hop) return;

        const implementationMessage = createMessage(
            "I'm ready to start implementing this hop. Please help me design the implementation plan.",
            MessageRole.USER
        );

        sendMessage(implementationMessage);
    };

    const renderMissionAwaiting = () => {
        if (!state.mission) return null;

        return (
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto p-8">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
                            Mission Awaiting Approval
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300 mb-4">
                            Review the mission details and approve to begin work.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">Mission Goal</h4>
                                <p className="text-gray-600 dark:text-gray-400">{state.mission.goal || 'No goal specified'}</p>
                            </div>
                            {state.mission.success_criteria && state.mission.success_criteria.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Success Criteria</h4>
                                    <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
                                        {state.mission.success_criteria.map((criteria, idx) => (
                                            <li key={idx}>{criteria}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={acceptMissionProposal}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Mission
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderHopProposed = () => {
        if (!state.mission?.current_hop) return null;
        const hop = state.mission.current_hop;

        return (
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto p-8">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
                            Hop Plan Proposed
                        </h3>
                        <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                            Review the hop plan and approve to proceed with implementation.
                        </p>
                    </div>
                    <div className="mt-6">
                        <HopDetails hop={hop} />
                    </div>
                </div>
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => acceptHopProposal(hop)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept Hop Plan
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderHopImplementationProposed = () => {
        if (!state.mission?.current_hop) return null;
        const hop = state.mission.current_hop;

        return (
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto p-8">
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">
                            Implementation Plan Proposed
                        </h3>
                        <p className="text-purple-700 dark:text-purple-300 mb-4">
                            Review the implementation plan and approve to proceed with execution.
                        </p>
                    </div>
                    <div className="mt-6">
                        <HopDetails hop={hop} />
                    </div>
                </div>
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => acceptHopImplementationProposal(hop)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept Implementation
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderCurrentHop = () => {
        if (!state.mission?.current_hop) return null;
        const hop = state.mission.current_hop;

        const actionButtons = [];

        // Add action buttons based on hop status
        if (hop.status === HopStatus.HOP_PLAN_READY) {
            actionButtons.push(
                <button
                    key="implement"
                    onClick={handleStartHopImplementation}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                    <Settings className="w-5 h-5 mr-2" />
                    Start Implementation
                </button>
            );
        }

        if (hop.status === HopStatus.HOP_IMPL_READY) {
            actionButtons.push(
                <button
                    key="start"
                    onClick={() => startHopExecution(hop.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <Play className="w-5 h-5 mr-2" />
                    Start Execution
                </button>
            );
        }

        if (hop.status === HopStatus.EXECUTING) {
            actionButtons.push(
                <button
                    key="stop"
                    onClick={() => failHopExecution(hop.id, "Execution stopped by user")}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    <Square className="w-5 h-5 mr-2" />
                    Stop Execution
                </button>
            );
        }

        if (hop.status === HopStatus.FAILED) {
            actionButtons.push(
                <button
                    key="retry"
                    onClick={() => retryHopExecution(hop.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Retry Execution
                </button>
            );
        }

        return (
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto p-8">
                    <HopDetails hop={hop} />
                </div>
                {actionButtons.length > 0 && (
                    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex gap-3 justify-end">
                            {actionButtons}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderNoCurrentHop = () => {
        if (!state.mission) return null;

        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 max-w-md">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Ready to Start Planning
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Your mission is ready. Let's plan the first hop to get started.
                    </p>
                    <button
                        onClick={handleStartHopPlanning}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Play className="w-5 h-5 mr-2" />
                        Start Hop Planning
                    </button>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        // No mission at all
        if (!state.mission) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                        <h3 className="text-lg font-medium mb-2">No Mission</h3>
                        <p>Start a conversation to create your first mission.</p>
                    </div>
                </div>
            );
        }

        // Mission awaiting approval
        if (state.mission.status === MissionStatus.AWAITING_APPROVAL) {
            return renderMissionAwaiting();
        }

        // Mission in progress - check hop state
        if (state.mission.status === MissionStatus.IN_PROGRESS) {
            const currentHop = state.mission.current_hop;

            if (!currentHop) {
                // No current hop - show start planning button
                return renderNoCurrentHop();
            }

            // Show content based on hop status
            switch (currentHop.status) {
                case HopStatus.HOP_PLAN_PROPOSED:
                    return renderHopProposed();
                case HopStatus.HOP_IMPL_PROPOSED:
                    return renderHopImplementationProposed();
                case HopStatus.HOP_PLAN_READY:
                case HopStatus.HOP_IMPL_READY:
                case HopStatus.EXECUTING:
                case HopStatus.FAILED:
                    return renderCurrentHop();
                default:
                    return (
                        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                            <div className="text-center">
                                <h3 className="text-lg font-medium mb-2">Processing...</h3>
                                <p>Working on your hop. Please wait.</p>
                            </div>
                        </div>
                    );
            }
        }

        // Mission completed or failed
        if (state.mission.status === MissionStatus.COMPLETED) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Mission Completed</h3>
                        <p>Congratulations! Your mission has been successfully completed.</p>
                    </div>
                </div>
            );
        }

        if (state.mission.status === MissionStatus.FAILED) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Mission Failed</h3>
                        <p>The mission encountered an error and could not be completed.</p>
                    </div>
                </div>
            );
        }

        // Default fallback
        return (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">Unknown State</h3>
                    <p>The mission is in an unknown state.</p>
                </div>
            </div>
        );
    };

    const getHeaderTitle = () => {
        if (!state.mission) return 'Mission Control';

        if (state.mission.status === MissionStatus.AWAITING_APPROVAL) {
            return 'Mission Proposal';
        }

        if (state.mission.status === MissionStatus.IN_PROGRESS) {
            const currentHop = state.mission.current_hop;

            if (!currentHop) {
                return 'Mission Planning';
            }

            switch (currentHop.status) {
                case HopStatus.HOP_PLAN_PROPOSED:
                    return 'Hop Proposal';
                case HopStatus.HOP_IMPL_PROPOSED:
                    return 'Implementation Proposal';
                default:
                    return 'Current Hop';
            }
        }

        return 'Mission Control';
    };

    return (
        <div className="h-full w-full flex flex-col">
            {/* Session Management */}
            <SessionManagement />

            {/* Mission Header */}
            <Mission className="flex-shrink-0" />

            {/* Header Section */}
            <div className="flex-shrink-0 px-6 py-3 border-b dark:border-gray-700">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {getHeaderTitle()}
                </h2>
            </div>

            {/* Main Content Section */}
            <div className="flex-1 overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
};

export default CollabArea; 
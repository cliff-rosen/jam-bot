import React, { useState } from 'react';
import { CheckCircle, XCircle, Play, Square, RotateCcw, X } from 'lucide-react';

import { useJamBot } from '@/context/JamBotContext';

import { Mission } from './Mission';
import { VariableRenderer } from './common/VariableRenderer';
import { CurrentHopDetails } from './common/CurrentHopDetails';
import { ToolStep, Hop, ExecutionStatus, HopStatus, MissionStatus } from '@/types/workflow';
import { Asset } from '@/types/asset';
import { ApprovalContent } from '@/types/collabArea';

interface CollabAreaProps {
    type: 'current-hop' | ApprovalContent['type'] | null;
    content: Hop | ApprovalContent['content'] | null;
}

const CollabArea: React.FC<CollabAreaProps> = ({ type, content }) => {

    const {
        state,
        acceptMissionProposal,
        acceptHopProposal,
        acceptHopImplementationProposal,
        acceptHopImplementationAsComplete,
        startHopExecution,
        completeHopExecution,
        failHopExecution,
        retryHopExecution,
        setCollabArea,
        updateHopState,
        clearCollabArea
    } = useJamBot();


    const handleHopUpdate = (updatedHop: Hop, updatedMissionOutputs: Map<string, Asset>) => {
        updateHopState(updatedHop, updatedMissionOutputs);
    };

    const renderApprovalContent = () => {
        if (!type || !content) return null;

        switch (type) {
            case 'mission-proposal':
                return renderMissionProposal();
            case 'hop-proposal':
                return renderHopProposal();
            case 'hop-implementation-proposal':
                return renderHopImplementationProposal();
            default:
                return null;
        }
    };

    const renderMissionProposal = () => {
        const mission = content?.mission;
        if (!mission) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No mission proposal available
                </div>
            );
        }

        const isAlreadyAccepted = state?.mission?.mission_status === MissionStatus.ACTIVE;

        return (
            <div className="h-full overflow-auto">
                <div className="p-6 space-y-6">
                    {/* Mission Proposal Header */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Mission Proposal {isAlreadyAccepted && <span className="text-sm font-normal">(Accepted)</span>}
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            {isAlreadyAccepted
                                ? "This mission proposal has been accepted and is now active."
                                : "Review the proposed mission details below. You can accept this proposal to activate the mission."
                            }
                        </p>
                    </div>

                    {/* Mission Details */}
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Mission Name</h4>
                            <p className="text-base text-gray-900 dark:text-gray-100">{mission.name}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{mission.description}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Goal</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{mission.goal}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Success Criteria</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {mission.success_criteria?.map((criteria: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200">{criteria}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Inputs</h4>
                                {mission.inputs && mission.inputs.length > 0 ? (
                                    <ul className="space-y-1">
                                        {mission.inputs.map((input: any, idx: number) => (
                                            <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                                                {input.name || JSON.stringify(input)}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No inputs required</p>
                                )}
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Outputs</h4>
                                {mission.outputs && mission.outputs.length > 0 ? (
                                    <ul className="space-y-1">
                                        {mission.outputs.map((output: any, idx: number) => (
                                            <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                                                {output.name || JSON.stringify(output)}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No outputs defined</p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {!isAlreadyAccepted && (
                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    onClick={acceptMissionProposal}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Accept Mission
                                </button>
                                <button
                                    onClick={clearCollabArea}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <XCircle className="w-5 h-5 mr-2" />
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderHopProposal = () => {
        const hop = content?.hop as Hop | undefined;

        if (!hop) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No hop proposal available
                </div>
            );
        }

        const isAlreadyAccepted = state?.mission?.hop_history.some(existingHop =>
            existingHop.id === hop.id &&
            existingHop.status === HopStatus.HOP_READY_TO_RESOLVE
        );

        const needsAcceptance = hop.status === HopStatus.HOP_PROPOSED &&
            state?.mission?.current_hop?.status === HopStatus.HOP_PROPOSED &&
            !isAlreadyAccepted;

        return (
            <div className="h-full overflow-auto">
                <div className="p-6 space-y-6">
                    {/* Hop Proposal Header */}
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                                    Hop Proposal {isAlreadyAccepted && <span className="text-sm font-normal">(Accepted)</span>}
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    {isAlreadyAccepted
                                        ? "This hop proposal has been accepted and added to the mission."
                                        : "Review the proposed hop details below. You can accept this proposal to proceed with implementation."
                                    }
                                </p>
                            </div>
                            <button
                                onClick={clearCollabArea}
                                className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 transition-colors"
                                title="Close hop proposal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Hop Details */}
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Hop Name</h4>
                            <p className="text-base text-gray-900 dark:text-gray-100">{hop.name}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{hop.description}</p>
                        </div>

                        {/* Action Buttons */}
                        {needsAcceptance && (
                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    onClick={() => acceptHopProposal(hop)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Accept Hop
                                </button>
                                <button
                                    onClick={clearCollabArea}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    <XCircle className="w-5 h-5 mr-2" />
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderHopImplementationProposal = () => {
        let hopToRender: Hop | Partial<Hop> | undefined = undefined;

        if (content?.hop && typeof content.hop === 'object' && (content.hop as Partial<Hop>).is_resolved === true) {
            hopToRender = content.hop as Hop;
        } else if (content?.mission?.current_hop && typeof content.mission.current_hop === 'object' && (content.mission.current_hop as Partial<Hop>).is_resolved === true) {
            hopToRender = content.mission.current_hop as Hop;
        }

        if (!hopToRender || !hopToRender.is_resolved) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No valid hop implementation proposal available or hop is not resolved.
                </div>
            );
        }

        const liveHop = state?.mission?.hop_history?.find(h => h.id === hopToRender.id) ||
            (state?.mission?.current_hop?.id === hopToRender.id ? state?.mission?.current_hop : null);

        if (!liveHop) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Hop not found in current mission
                </div>
            );
        }

        return (
            <div className="h-full overflow-auto">
                <div className="p-6 space-y-6">
                    {/* Hop Implementation Proposal Header */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                                    Hop Implementation Proposal
                                </h3>
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                    Review the proposed hop implementation below. You can accept this implementation to proceed with execution.
                                </p>
                            </div>
                            <button
                                onClick={clearCollabArea}
                                className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 transition-colors"
                                title="Close hop implementation proposal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Hop Implementation Details */}
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Hop Name</h4>
                            <p className="text-base text-gray-900 dark:text-gray-100">{liveHop.name}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{liveHop.description}</p>
                        </div>

                        {/* Tool Steps */}
                        {liveHop.tool_steps && liveHop.tool_steps.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Tool Steps</h4>
                                <div className="space-y-3">
                                    {liveHop.tool_steps.map((step: ToolStep, idx: number) => (
                                        <div key={step.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        Step {idx + 1}: {step.description}
                                                    </h5>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        Tool: {step.tool_id}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${step.status === ExecutionStatus.COMPLETED
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                                                    : step.status === ExecutionStatus.RUNNING
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                                                        : step.status === ExecutionStatus.FAILED
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400'
                                                    }`}>
                                                    {step.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => acceptHopImplementationProposal(liveHop)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            >
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Accept Implementation
                            </button>
                            <button
                                onClick={clearCollabArea}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            >
                                <XCircle className="w-5 h-5 mr-2" />
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCurrentHop = () => {
        const currentHop = state?.mission?.current_hop;
        if (!currentHop) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No current hop available
                </div>
            );
        }

        const actionButtons = [];

        // Add action buttons based on hop status
        if (currentHop.status === HopStatus.HOP_READY_TO_EXECUTE) {
            actionButtons.push(
                <button
                    key="start"
                    onClick={() => startHopExecution(currentHop.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <Play className="w-5 h-5 mr-2" />
                    Start Execution
                </button>
            );
        } else if (currentHop.status === HopStatus.HOP_RUNNING) {
            actionButtons.push(
                <button
                    key="stop"
                    onClick={() => failHopExecution(currentHop.id, "Execution stopped by user")}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    <Square className="w-5 h-5 mr-2" />
                    Stop Execution
                </button>
            );
        } else if (currentHop.status === HopStatus.FAILED) {
            actionButtons.push(
                <button
                    key="retry"
                    onClick={() => retryHopExecution(currentHop.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Retry Execution
                </button>
            );
        }

        return (
            <div className="h-full flex flex-col">
                {/* Content */}
                <div className="flex-1 overflow-auto">
                    <div className="px-8 pt-8">
                        <CurrentHopDetails hop={currentHop} className="" onHopUpdate={handleHopUpdate} />
                    </div>
                </div>

                {/* Action Buttons */}
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

    return (
        <div className="h-full w-full flex flex-col">
            {/* Mission Header */}
            <Mission className="flex-shrink-0" />

            {/* Header Section */}
            <div className="flex-shrink-0 px-6 py-3 border-b dark:border-gray-700">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {type === 'current-hop' && 'Current Hop'}
                    {type === 'mission-proposal' && 'Mission Proposal'}
                    {type === 'hop-proposal' && 'Hop Proposal'}
                    {type === 'hop-implementation-proposal' && 'Hop Implementation Proposal'}
                </h2>
            </div>

            {/* Main Content Section */}
            <div className="flex-1 overflow-hidden">
                {type === 'current-hop' && renderCurrentHop()}
                {type && type !== 'current-hop' && renderApprovalContent()}
            </div>
        </div>
    );
};

export default CollabArea; 
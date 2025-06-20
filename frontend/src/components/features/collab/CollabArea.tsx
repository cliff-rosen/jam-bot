import React, { useState } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';

import { useJamBot } from '@/context/JamBotContext';

import { Mission } from './Mission';
import { HopDetails } from '@/components/features/hop';
import { ToolStep, Hop, ExecutionStatus, HopStatus, MissionStatus } from '@/types/workflow';
import { ApprovalContent } from '@/types/collabArea';
import { MissionProposal } from './MissionProposal';
import { HopProposal } from './HopProposal';
import { HopImplementationProposal } from './HopImplementationProposal';

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
        startHopExecution,
        failHopExecution,
        retryHopExecution,
        clearCollabArea
    } = useJamBot();

    const renderApprovalContent = () => {
        if (!type || !content) return null;

        switch (type) {
            case 'mission-proposal':
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
                    <MissionProposal
                        mission={mission}
                        isAlreadyAccepted={isAlreadyAccepted}
                        onAccept={acceptMissionProposal}
                        onReject={clearCollabArea}
                    />
                );

            case 'hop-proposal':
                const hop = content?.hop as Hop | undefined;
                const proposedAssets = content?.proposed_assets as any[] | undefined;
                if (!hop) {
                    return (
                        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                            No hop proposal available
                        </div>
                    );
                }
                const isHopAlreadyAccepted = state?.mission?.hop_history.some(existingHop =>
                    existingHop.id === hop.id &&
                    existingHop.status === HopStatus.HOP_READY_TO_RESOLVE
                ) || false;
                const needsAcceptance = hop.status === HopStatus.HOP_PROPOSED && !isHopAlreadyAccepted;
                return (
                    <HopProposal
                        hop={hop}
                        proposedAssets={proposedAssets}
                        isAlreadyAccepted={isHopAlreadyAccepted}
                        needsAcceptance={needsAcceptance}
                        onAccept={acceptHopProposal}
                        onReject={clearCollabArea}
                        onClose={clearCollabArea}
                    />
                );

            case 'hop-implementation-proposal':
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
                return (
                    <HopImplementationProposal
                        hop={hopToRender as Hop}
                        onAccept={acceptHopImplementationProposal}
                        onReject={clearCollabArea}
                        onClose={clearCollabArea}
                    />
                );

            default:
                return null;
        }
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
                        <HopDetails hop={currentHop as Hop} className="" />
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
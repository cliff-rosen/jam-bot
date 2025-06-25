import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Mission } from '@/types/workflow';

interface MissionProposalProps {
    mission: Mission;
    isAlreadyAccepted: boolean;
    onAccept: () => void;
    onReject: () => void;
}

export const MissionProposal: React.FC<MissionProposalProps> = ({
    mission,
    isAlreadyAccepted,
    onAccept,
    onReject
}) => {
    return (
        <div className="h-full overflow-auto">
            <div className="p-6 space-y-6">
                {/* Mission Proposal Header */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Mission Proposal
                        {isAlreadyAccepted && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                Accepted
                            </span>
                        )}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {isAlreadyAccepted
                            ? "This mission proposal has been accepted and is now active."
                            : "Review the proposed mission details below. You can accept this proposal to activate the mission."
                        }
                    </p>
                </div>

                {/* Mission Details */}
                <div className="space-y-5">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Mission Name</h4>
                        <p className="text-lg text-gray-900 dark:text-gray-100">{mission.name}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Description</h4>
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{mission.description}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Goal</h4>
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{mission.goal}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">Success Criteria</h4>
                        <div className="space-y-2">
                            {mission.success_criteria?.map((criteria: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-2"></div>
                                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{criteria}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">Inputs</h4>
                        {mission.inputs && mission.inputs.length > 0 ? (
                            <ul className="space-y-2">
                                {mission.inputs.map((input: any, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                        {input.name || JSON.stringify(input)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No inputs required</p>
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">Outputs</h4>
                        {mission.outputs && mission.outputs.length > 0 ? (
                            <ul className="space-y-2">
                                {mission.outputs.map((output: any, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                        {output.name || JSON.stringify(output)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No outputs defined</p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                {!isAlreadyAccepted && (
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onReject}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                        </button>
                        <button
                            onClick={onAccept}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept Mission
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}; 
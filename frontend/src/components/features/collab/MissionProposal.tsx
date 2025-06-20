import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Mission } from '@/types/workflow';
import { MissionStatus } from '@/types/workflow';

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
                                onClick={onAccept}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Accept Mission
                            </button>
                            <button
                                onClick={onReject}
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
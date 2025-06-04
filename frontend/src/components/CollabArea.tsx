import React, { useState } from 'react';
import { VariableRenderer } from './common/VariableRenderer';
import Mission from './Mission';
import { CheckCircle, XCircle } from 'lucide-react';
import { useJamBot } from '@/context/JamBotContext';
import { ToolStep, Hop } from '@/types/workflow';

interface CollabAreaProps {
    // We can add props here as needed for different types of content
    type?: 'default' | 'workflow' | 'document' | 'code' | 'object-list' | 'object' | 'mission-proposal' | 'hop-proposal' | 'hop-implementation-proposal';
    content?: any;
}

const CollabArea: React.FC<CollabAreaProps> = ({ type = 'default', content }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { acceptMissionProposal, acceptHopProposal, acceptHopImplementationProposal } = useJamBot();

    const handlePrevious = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        if (Array.isArray(content)) {
            setCurrentIndex(prev => Math.min(content.length - 1, prev + 1));
        }
    };

    const renderObject = () => {
        return (
            <div className="h-full">
                <VariableRenderer value={content} useEnhancedJsonView={true} maxTextLength={1000} maxArrayItems={20} maxArrayItemLength={500} className="h-full" />
            </div>
        );
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

        return (
            <div className="h-full overflow-auto">
                <div className="p-6 space-y-6">
                    {/* Mission Proposal Header */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Mission Proposal
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Review the proposed mission details below. You can accept this proposal to activate the mission.
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
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => acceptMissionProposal()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Accept Mission
                        </button>
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

        return (
            <div className="h-full overflow-auto">
                <div className="p-6 space-y-6">
                    {/* Hop Proposal Header */}
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                            Hop Proposal
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                            Review the proposed hop details below. You can accept this proposal to proceed with implementation.
                        </p>
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

                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Type</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                                {hop.is_final ? 'Final Hop (produces final deliverable)' : 'Intermediate Hop'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Input Mapping</h4>
                                {hop.input_mapping && Object.keys(hop.input_mapping).length > 0 ? (
                                    <ul className="space-y-1">
                                        {Object.entries(hop.input_mapping).map(([key, value]) => (
                                            <li key={key} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                                                <span className="font-medium">{key}:</span> {String(value)}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No inputs required</p>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Output Mapping</h4>
                                {hop.output_mapping && Object.keys(hop.output_mapping).length > 0 ? (
                                    <ul className="space-y-1">
                                        {Object.entries(hop.output_mapping).map(([key, value]) => (
                                            <li key={key} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                                                <span className="font-medium">{key}:</span> {String(value)}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No outputs defined</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => {
                                if (hop) {
                                    acceptHopProposal(hop);
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Accept Hop
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderHopImplementationProposal = () => {
        let hopToRender: Hop | Partial<Hop> | undefined = undefined;

        // Path 1: Hop data is directly in content.hop (e.g., from hop_designer_completed with resolved hop)
        if (content?.hop && typeof content.hop === 'object' && (content.hop as Partial<Hop>).is_resolved === true) {
            hopToRender = content.hop as Hop;
        }
        // Path 2: Hop data is in content.mission.current_hop (e.g., from a status that sends the full mission)
        else if (content?.mission?.current_hop && typeof content.mission.current_hop === 'object' && (content.mission.current_hop as Partial<Hop>).is_resolved === true) {
            hopToRender = content.mission.current_hop as Hop;
        }

        if (!hopToRender || !hopToRender.is_resolved) { // Final check on the derived hop
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No valid hop implementation proposal available or hop is not resolved.
                </div>
            );
        }

        // Use hopToRender for displaying details from this point onwards
        // For example, to access name: hopToRender.name

        return (
            <div className="h-full overflow-auto">
                <div className="p-6 space-y-6">
                    {/* Hop Implementation Proposal Header */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                            Hop Implementation Proposal
                        </h3>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                            Review the resolved tool steps for the hop below. Accepting will prepare this hop for execution.
                        </p>
                    </div>

                    {/* Hop Details using hopToRender */}
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Hop Name</h4>
                            <p className="text-base text-gray-900 dark:text-gray-100">{hopToRender.name}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{hopToRender.description}</p>
                        </div>
                        {/* Displaying Inputs if available on hopToRender */}
                        {hopToRender.input_mapping && Object.keys(hopToRender.input_mapping).length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Inputs</h4>
                                <ul className="list-disc list-inside pl-4 text-xs text-gray-700 dark:text-gray-300">
                                    {Object.entries(hopToRender.input_mapping).map(([key, value]) => (
                                        <li key={key}><span className="font-semibold">{key}:</span> {String(value)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {/* Displaying Outputs if available on hopToRender */}
                        {hopToRender.output_mapping && Object.keys(hopToRender.output_mapping).length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Outputs</h4>
                                <ul className="list-disc list-inside pl-4 text-xs text-gray-700 dark:text-gray-300">
                                    {Object.entries(hopToRender.output_mapping).map(([key, value]) => (
                                        <li key={key}><span className="font-semibold">{key}:</span> {String(value)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Tool Steps using hopToRender.steps */}
                    <div className="space-y-4">
                        <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">Tool Steps:</h4>
                        {hopToRender.steps && hopToRender.steps.length > 0 ? (
                            <ul className="space-y-3">
                                {hopToRender.steps.map((step: ToolStep, index: number) => (
                                    <li key={step.id || index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Step {index + 1}: {step.tool_name}</p>
                                        {step.description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{step.description}</p>}

                                        {step.parameter_mapping && Object.keys(step.parameter_mapping).length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Parameters:</p>
                                                <ul className="list-disc list-inside pl-4 text-xs text-gray-700 dark:text-gray-300">
                                                    {Object.entries(step.parameter_mapping).map(([paramKey, paramValue]) => (
                                                        <li key={paramKey}>
                                                            <span className="font-semibold">{paramKey}:</span> {typeof paramValue === 'object' && paramValue !== null && 'literal' in paramValue ? JSON.stringify((paramValue as any).literal) : JSON.stringify(paramValue)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {step.result_mapping && Object.keys(step.result_mapping).length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Result Mapping:</p>
                                                <ul className="list-disc list-inside pl-4 text-xs text-gray-700 dark:text-gray-300">
                                                    {Object.entries(step.result_mapping).map(([resultKey, resultValue]) => (
                                                        <li key={resultKey}>
                                                            <span className="font-semibold">{resultKey}:</span> {JSON.stringify(resultValue)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No tool steps defined for this hop.</p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => acceptHopImplementationProposal()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Accept Hop Implementation
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderObjectList = () => {
        if (!Array.isArray(content) || content.length === 0) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No objects to display
                </div>
            );
        }

        const currentItem = content[currentIndex];
        const showNavigation = content.length > 1;

        return (
            <div className="h-full flex flex-col">
                {/* Navigation controls - only show if there are multiple items */}
                {showNavigation && (
                    <div className="flex-none flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Item {currentIndex + 1} of {content.length}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === content.length - 1}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Content area */}
                <div className="flex-1 overflow-auto">
                    <div className="h-full p-6">
                        <VariableRenderer
                            value={currentItem}
                            useEnhancedJsonView={true}
                            maxTextLength={1000}
                            maxArrayItems={20}
                            maxArrayItemLength={500}
                            className="h-full"
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col">
            {/* Mission Header */}
            <Mission className="flex-shrink-0" />

            {/* Header Section */}
            <div className="flex-shrink-0 px-4 py-3 border-b dark:border-gray-700">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {type === 'workflow' && 'Workflow'}
                    {type === 'document' && 'Document'}
                    {type === 'code' && 'Code Editor'}
                    {type === 'object' && 'Object'}
                    {type === 'object-list' && 'Object List'}
                    {type === 'mission-proposal' && 'Mission Proposal'}
                    {type === 'hop-proposal' && 'Hop Proposal'}
                    {type === 'hop-implementation-proposal' && 'Hop Implementation Proposal'}
                    {type === 'default' && 'Collaboration Area'}
                </h2>
            </div>

            {/* Main Content Section */}
            <div className="flex-1 overflow-hidden">
                {/* Content will be rendered here based on type */}
                {type === 'default' && (
                    <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        - - -
                    </div>
                )}
                {type === 'workflow' && content && (
                    <div className="h-full">
                        WORKFLOW
                    </div>
                )}
                {type === 'document' && content && (
                    <div className="h-full">
                        <VariableRenderer
                            value={content}
                            useEnhancedJsonView={true}
                            maxTextLength={1000}
                            maxArrayItems={20}
                            maxArrayItemLength={500}
                            className="h-full"
                        />
                    </div>
                )}
                {type === 'code' && content && (
                    <div className="h-full">
                        <VariableRenderer
                            value={content}
                            useEnhancedJsonView={true}
                            maxTextLength={1000}
                            maxArrayItems={20}
                            maxArrayItemLength={500}
                            className="h-full"
                        />
                    </div>
                )}
                {type === 'object-list' && renderObjectList()}
                {type === 'object' && renderObject()}
                {type === 'mission-proposal' && renderMissionProposal()}
                {type === 'hop-proposal' && renderHopProposal()}
                {type === 'hop-implementation-proposal' && renderHopImplementationProposal()}
            </div>
        </div>
    );
};

export default CollabArea; 
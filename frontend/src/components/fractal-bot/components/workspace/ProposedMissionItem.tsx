import React from 'react';
import { MissionProposal } from '../../../types/index';

interface ProposedMissionItemProps {
    proposal: MissionProposal;
}

export default function ProposedMissionItem({ proposal }: ProposedMissionItemProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proposed Mission</h2>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-200 mt-1">{proposal.title}</h1>
                <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
                    {proposal.description}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Goal:</span> {proposal.goal}
                </p>
            </div>

            <div className="mt-6">
                <div>
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inputs</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Specific data objects required to start the mission</p>
                    <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                        {proposal.inputs.map((input: string, index: number) => (
                            <li key={index} className="flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                {input}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-4">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resources</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sources of additional information that may be required</p>
                    <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                        {proposal.resources.map((resource: string, index: number) => (
                            <li key={index} className="flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                {resource}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-4">
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outputs</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Specific deliverables that will be produced</p>
                    <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                        {proposal.outputs.map((output: string, index: number) => (
                            <li key={index} className="flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                {output}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Success Criteria</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Measurable conditions that verify mission completion</p>
                <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                    {proposal.success_criteria.map((criterion: string, index: number) => (
                        <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                            {criterion}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
} 
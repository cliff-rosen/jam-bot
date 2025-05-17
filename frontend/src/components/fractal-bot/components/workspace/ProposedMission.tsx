import React from 'react';
import { Mission } from '../types';

interface ProposedMissionProps {
    mission: Mission;
}

export default function ProposedMission({ mission }: ProposedMissionProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proposed Mission</h2>
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">{mission.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{mission.goal}</p>
                </div>
            </div>

            <div className="mt-6">
                <div>
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inputs</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Specific data objects required to start the mission</p>
                    <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                        {mission.inputs.map((input, index) => (
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
                        {mission.resources.map((resource, index) => (
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
                        {mission.outputs.map((output, index) => (
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
                    {mission.success_criteria.map((criterion, index) => (
                        <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                            {criterion}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proposed Workflow</h3>
                <div className="mt-2 space-y-4">
                    {mission.workflow.stages.map((stage, index) => (
                        <div key={stage.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">{stage.name}</h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{stage.description}</p>
                            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                {stage.steps.map((step, stepIndex) => (
                                    <li key={step.id} className="flex items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2"></span>
                                        {step.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 
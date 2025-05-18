import React from 'react';
import type { Workflow, Stage } from '../../types/index';

interface ProposedWorkflowProps {
    workflow: Workflow;
}

export default function ProposedWorkflow({ workflow }: ProposedWorkflowProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Proposed Workflow</h2>
                <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">
                    {workflow.description}
                </p>
            </div>

            <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stages</h3>
                <div className="mt-2 space-y-4">
                    {workflow.stages.map((stage: Stage, index: number) => (
                        <div key={stage.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">{stage.name}</h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{stage.description}</p>

                            {/* Stage Inputs and Outputs */}
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="bg-gray-100 dark:bg-gray-600/50 p-3 rounded-lg">
                                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Inputs</h5>
                                    {stage.state.filter(v => v.io_type === 'input').length > 0 ? (
                                        <ul className="space-y-1">
                                            {stage.state.filter(v => v.io_type === 'input').map((input) => (
                                                <li key={input.variable_id} className="text-sm text-gray-600 dark:text-gray-300">
                                                    {input.name}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-400 dark:text-gray-500">No inputs</p>
                                    )}
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-600/50 p-3 rounded-lg">
                                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Outputs</h5>
                                    {stage.state.filter(v => v.io_type === 'output').length > 0 ? (
                                        <ul className="space-y-1">
                                            {stage.state.filter(v => v.io_type === 'output').map((output) => (
                                                <li key={output.variable_id} className="text-sm text-gray-600 dark:text-gray-300">
                                                    {output.name}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-400 dark:text-gray-500">No outputs</p>
                                    )}
                                </div>
                            </div>

                            {/* Success Criteria */}
                            {stage.success_criteria && stage.success_criteria.length > 0 && (
                                <div className="mt-3 bg-gray-100 dark:bg-gray-600/50 p-3 rounded-lg">
                                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Success Criteria</h5>
                                    <ul className="space-y-1">
                                        {stage.success_criteria.map((criterion: string, idx: number) => (
                                            <li key={idx} className="text-sm text-gray-600 dark:text-gray-300">
                                                {criterion}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 
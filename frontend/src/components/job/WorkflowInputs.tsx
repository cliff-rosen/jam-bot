import React from 'react';
import { WorkflowVariable } from '../../types/workflows';
import { JobVariable } from '../../types/jobs';
import { useValueFormatter } from '../../hooks/useValueFormatter.tsx';

interface WorkflowInputsProps {
    inputs: (WorkflowVariable | JobVariable)[];
}

export const WorkflowInputs: React.FC<WorkflowInputsProps> = ({ inputs }) => {
    const { formatValue } = useValueFormatter();

    if (!inputs || inputs.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Workflow Inputs
                </h3>
            </div>
            <div className="p-4 space-y-2">
                {inputs.map((variable) => {
                    const value = variable.value;
                    const formattedValue = formatValue(value);
                    const isComplexValue = React.isValidElement(formattedValue);

                    return (
                        <div key={variable.variable_id} className="text-sm grid grid-cols-[150px_30px_1fr] items-start">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                {variable.name}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 text-center">=</span>
                            {isComplexValue ? (
                                <div className="min-w-0 text-gray-700 dark:text-gray-100">
                                    {formattedValue}
                                </div>
                            ) : (
                                <span className="text-gray-700 dark:text-gray-100">
                                    {formattedValue}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}; 
import React from 'react';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';

export interface WorkflowOutputsProps {
    finalStepOutput: Record<WorkflowVariableName, SchemaValueType>;
    otherOutputs?: Array<{
        step_type: string;
        label: string;
        outputs: Record<string, SchemaValueType>;
    }>;
}

export const WorkflowOutputs: React.FC<WorkflowOutputsProps> = ({ finalStepOutput, otherOutputs = [] }) => {
    return (
        <div className="space-y-6">
            {/* Final step outputs */}
            {Object.keys(finalStepOutput).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Final Outputs</h3>
                    <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto">
                        {JSON.stringify(finalStepOutput, null, 2)}
                    </pre>
                </div>
            )}

            {/* Other step outputs */}
            {otherOutputs.map((output, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">{output.label} Outputs</h3>
                    <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto">
                        {JSON.stringify(output.outputs, null, 2)}
                    </pre>
                </div>
            ))}
        </div>
    );
}; 
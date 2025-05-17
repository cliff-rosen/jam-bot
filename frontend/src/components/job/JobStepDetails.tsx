import React, { useState } from 'react';
import { Job, JobStatus, JobStep } from '../../types/jobs';
import { PromptTemplateLink } from './PromptTemplateLink';
import { Box, Typography } from '@mui/material';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';
import { ToolOutputName } from '../../types/tools';
import VariableRenderer from '../common/VariableRenderer';

interface JobStepCardProps {
    job: Job;
    step: JobStep;
    isExpanded: boolean;
    onToggle: () => void;
}

// Helper function to safely get a value from outputs
const getOutputValue = (outputs: Record<WorkflowVariableName, SchemaValueType> | undefined, key: string): string => {
    if (!outputs) return '';
    const value = outputs[key as WorkflowVariableName];
    return value !== undefined ? String(value) : '';
};

const JobStepCard: React.FC<JobStepCardProps> = ({ job, step, isExpanded, onToggle }) => {
    // Function to format timestamp
    const formatTimestamp = (timestamp: string | undefined) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString();
    };

    // Get the actual input values from the job's variables
    const getInputValue = (mapping: string) => {
        // First check state variables
        const stateVariable = job.state.find(v => v.name === mapping);
        if (stateVariable) {
            return stateVariable.value;
        }

        // If not found in state variables then return the mapping itself
        return mapping;
    };

    const hasDetails = step.tool ||
        (step.parameter_mappings && Object.keys(step.parameter_mappings).length > 0) ||
        (step.latest_execution?.outputs && Object.keys(step.latest_execution.outputs || {}).length > 0) ||
        step.error_message ||
        step.step_type === 'EVALUATION';

    const hasOutputs = (
        step.latest_execution?.outputs && Object.keys(step.latest_execution.outputs || {}).length > 0
    ) || (step.executions && step.executions.length > 0);

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${isExpanded ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step.status === JobStatus.RUNNING ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                        step.status === JobStatus.COMPLETED ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                            step.status === JobStatus.FAILED ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                        {job.steps.findIndex(s => s.step_id === step.step_id) + 1}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {step.label || `Step ${job.steps.findIndex(s => s.step_id === step.step_id) + 1}`}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimestamp(step.started_at)}
                                {step.completed_at && ` - ${formatTimestamp(step.completed_at)}`}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {step.step_type === 'EVALUATION' ? 'Evaluation Step' : step.tool?.name}
                            </p>
                            {step.tool?.tool_type === 'llm' && step.prompt_template_id && (
                                <div className="text-xs">
                                    <PromptTemplateLink templateId={step.prompt_template_id} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex items-center gap-2">
                    {step.status === JobStatus.COMPLETED && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-green-600/20 dark:ring-green-300/20">
                            Completed
                        </span>
                    )}
                    {step.status === JobStatus.FAILED && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 ring-1 ring-rose-600/20 dark:ring-rose-300/20">
                            Failed
                        </span>
                    )}
                    <svg
                        className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Details Panel */}
            {isExpanded && hasDetails && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    {/* Error Message */}
                    {step.error_message && (
                        <div className="bg-rose-50/30 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900 rounded-lg p-3">
                            <h4 className="text-xs uppercase font-medium text-rose-600 dark:text-rose-400 mb-1">
                                Error
                            </h4>
                            <p className="text-sm text-rose-600 dark:text-rose-300">
                                {step.error_message}
                            </p>
                        </div>
                    )}

                    {/* Evaluation Step Details */}
                    {step.step_type === 'EVALUATION' && step.latest_execution?.outputs && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom className="text-gray-900 dark:text-gray-100">
                                Evaluation Result
                            </Typography>
                            <Typography className="text-gray-700 dark:text-gray-300">
                                {getOutputValue(step.latest_execution.outputs, 'condition_met') === 'none' ? 'No conditions met' : 'Condition met'}
                            </Typography>
                            {getOutputValue(step.latest_execution.outputs, 'condition_met') !== 'none' && (
                                <>
                                    <Typography variant="subtitle2" gutterBottom className="text-gray-900 dark:text-gray-100">
                                        Condition Details
                                    </Typography>
                                    <Typography className="text-gray-700 dark:text-gray-300">
                                        {getOutputValue(step.latest_execution.outputs, 'variable_name')} = {getOutputValue(step.latest_execution.outputs, 'variable_value')}
                                    </Typography>
                                    <Typography className="text-gray-700 dark:text-gray-300">
                                        {getOutputValue(step.latest_execution.outputs, 'operator')} {getOutputValue(step.latest_execution.outputs, 'comparison_value')}
                                    </Typography>
                                    <Typography variant="subtitle2" gutterBottom className="text-gray-900 dark:text-gray-100">
                                        Action
                                    </Typography>
                                    <Typography className="text-gray-700 dark:text-gray-300">
                                        {getOutputValue(step.latest_execution.outputs, 'action') === 'jump'
                                            ? `Jump to step ${parseInt(getOutputValue(step.latest_execution.outputs, 'target_step_index')) + 1}`
                                            : getOutputValue(step.latest_execution.outputs, 'action') === 'end'
                                                ? 'End workflow'
                                                : 'Continue to next step'
                                        }
                                    </Typography>
                                    {getOutputValue(step.latest_execution.outputs, 'reason') && (
                                        <>
                                            <Typography variant="subtitle2" gutterBottom className="text-gray-900 dark:text-gray-100">
                                                Reason
                                            </Typography>
                                            <Typography className="text-gray-700 dark:text-gray-300">
                                                {getOutputValue(step.latest_execution.outputs, 'reason')}
                                            </Typography>
                                        </>
                                    )}
                                </>
                            )}
                        </Box>
                    )}

                    {/* Tool Parameters */}
                    {step.step_type === 'ACTION' && step.parameter_mappings && Object.keys(step.parameter_mappings).length > 0 && (
                        <div>
                            <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Input Parameters
                            </h4>
                            <div className="space-y-3">
                                {Object.entries(step.parameter_mappings).map(([key, mapping]) => {
                                    const value = getInputValue(mapping);

                                    return (
                                        <div key={key} className="text-sm">
                                            <div className="flex items-center mb-1">
                                                <span className="font-medium text-gray-600 dark:text-gray-300">{key}</span>
                                                <span className="mx-2 text-gray-400 dark:text-gray-500">=</span>
                                                <span className="text-blue-600 dark:text-blue-400">{mapping}</span>
                                            </div>
                                            <div className="pl-4">
                                                <VariableRenderer value={value} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tool Outputs */}
                    {step.step_type === 'ACTION' && step.latest_execution?.outputs && Object.keys(step.latest_execution.outputs || {}).length > 0 && (
                        <div>
                            <h4 className="text-xs uppercase font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Outputs
                            </h4>
                            <div className="space-y-4">
                                {Object.entries(step.latest_execution.outputs).map(([key, value]) => {
                                    const variableByOutputName = job.state.find(v => v.name === step.output_mappings?.[key as ToolOutputName])?.value;
                                    const outputSchema = step.tool?.signature.outputs.find(o => o.name === key)?.schema;

                                    return (
                                        <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                                            <div className="mb-2">
                                                <span className="font-medium text-gray-700 dark:text-gray-200">{key}</span>
                                                {step.output_mappings?.[key as ToolOutputName] && (
                                                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                                        → {step.output_mappings[key as ToolOutputName]}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mb-2">
                                                <VariableRenderer
                                                    value={value}
                                                    schema={outputSchema}
                                                    isMarkdown={true}
                                                />
                                            </div>

                                            {variableByOutputName !== undefined && step.output_mappings && (
                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                                        Variable value after mapping:
                                                    </div>
                                                    <VariableRenderer value={variableByOutputName} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface JobStepDetailsProps {
    job: Job;
}

export const JobStepDetails: React.FC<JobStepDetailsProps> = ({ job }) => {
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

    const toggleStep = (index: number) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSteps(newExpanded);
    };

    // Filter to only show executed steps
    const executedSteps = job.steps.filter(step =>
        step.status === JobStatus.COMPLETED ||
        step.status === JobStatus.FAILED
    );

    return (
        <div className="space-y-2">
            {/* Steps List */}
            {executedSteps.map((step, index) => (
                <JobStepCard
                    key={step.step_id}
                    job={job}
                    step={step}
                    isExpanded={expandedSteps.has(index)}
                    onToggle={() => toggleStep(index)}
                />
            ))}

            {/* Job Error */}
            {job.error_message && (
                <div className="mt-4 border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-900/10 rounded-lg p-4">
                    <h4 className="text-xs uppercase font-medium text-rose-600 dark:text-rose-400 mb-2">
                        Job Error
                    </h4>
                    <p className="text-sm text-rose-600 dark:text-rose-300">
                        {job.error_message}
                    </p>
                </div>
            )}
        </div>
    );
}; 
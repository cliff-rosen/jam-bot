import React, { useState } from 'react';
import { Job, StepExecutionResult, JobExecutionState, JobStatus } from '../../types/jobs';
import { WorkflowVariableName } from '../../types/workflows';
import { SchemaValueType } from '../../types/schema';
import { usePromptTemplates } from '../../context/PromptTemplateContext';
import { JobEngine } from '../../lib/job/jobEngine';
import { ToolParameterName } from '../../types/tools';
import JobDataViewer from '../common/JobDataViewer';
import DataViewer from '../common/DataViewer';
import EvaluationDataViewer from '../common/EvaluationDataViewer';

// Simple variable renderer that doesn't show type information
const SimpleVariableRenderer: React.FC<{ value: any }> = ({ value }) => {
    // Handle undefined or null values
    if (value === undefined || value === null) {
        return (
            <span className="text-gray-400 dark:text-gray-500 italic">
                Not set
            </span>
        );
    }

    // Use the enhanced DataViewer component for better visualization
    return <DataViewer data={value} initiallyExpanded={true} />;
};

interface JobExecutionHistoryProps {
    job: Job;
    executionState?: JobExecutionState;
}

interface StepResultCardProps {
    job: Job;
    result: StepExecutionResult;
    isExpanded: boolean;
    onToggle: () => void;
    executionIndex: number;
}

// Helper function to safely get a value from outputs
const getOutputValue = (outputs: Record<WorkflowVariableName, SchemaValueType> | undefined, key: string): string => {
    if (!outputs) return '';
    const value = outputs[key as WorkflowVariableName];
    return value !== undefined ? String(value) : '';
};

// Helper function to safely get a value from inputs
const getInputValue = (inputs: Record<ToolParameterName, SchemaValueType> | undefined, key: string): SchemaValueType | undefined => {
    if (!inputs) return undefined;
    return inputs[key as ToolParameterName];
};

const StepResultCard: React.FC<StepResultCardProps> = ({ job, result, isExpanded, onToggle, executionIndex }) => {
    const { templates } = usePromptTemplates();

    // Function to format timestamp
    const formatTimestamp = (timestamp: string | undefined) => {
        if (!timestamp) return 'Not started';
        const date = new Date(timestamp);
        return date.toLocaleString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    // Calculate duration if both timestamps exist
    const getDuration = () => {
        if (!result.started_at || !result.completed_at) return null;
        const start = new Date(result.started_at).getTime();
        const end = new Date(result.completed_at).getTime();
        const durationMs = end - start;

        if (durationMs < 1000) {
            return `${durationMs}ms`;
        } else if (durationMs < 60000) {
            return `${(durationMs / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    };

    // Get step definition from job
    const stepIndex = job.steps.findIndex(s => s.step_id === result.step_id);
    const stepDefinition = job.steps[stepIndex] || { step_type: 'UNKNOWN' };

    // Get template name if this is an LLM tool
    const getTemplateName = () => {
        if (stepDefinition.tool?.tool_type === 'llm' && stepDefinition.prompt_template_id) {
            const template = templates.find(t => t.template_id === stepDefinition.prompt_template_id);
            return template?.name || stepDefinition.prompt_template_id;
        }
        return null;
    };

    // Get step type display text
    const getStepTypeDisplay = () => {
        if (stepDefinition.step_type === 'EVALUATION') {
            return 'Evaluation';
        } else if (stepDefinition.step_type === 'ACTION') {
            return 'Tool';
        } else {
            return stepDefinition.step_type;
        }
    };

    // Get input mappings and values directly from the step execution result
    const getInputMappings = () => {
        return JobEngine.getStepInputMappingsFromHistory(job, result.step_id, result);
    };

    // Get output mappings and values directly from the step execution result
    const getOutputMappings = () => {
        return JobEngine.getStepOutputMappingsFromHistory(job, result.step_id, result);
    };

    const inputMappings = getInputMappings();
    const outputMappings = getOutputMappings();
    const duration = getDuration();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
                        {executionIndex + 1}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {stepDefinition.label || `Step ${stepIndex + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{formatTimestamp(result.started_at)}</span>
                            {duration && (
                                <>
                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                    <span>{duration}</span>
                                </>
                            )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                            <span className="font-medium">{getStepTypeDisplay()}</span>
                            {stepDefinition.step_type === 'ACTION' && stepDefinition.tool && (
                                <>
                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                    <span>{stepDefinition.tool.name}</span>
                                    {stepDefinition.tool.tool_type === 'llm' && getTemplateName() && (
                                        <>
                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                            <span>Template: {getTemplateName()}</span>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${result.success
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {result.success ? 'Success' : 'Failed'}
                    </span>
                    <svg
                        className={`h-5 w-5 text-gray-400 dark:text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
                    {/* Error Message (if any) */}
                    {!result.success && result.error && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Error</h4>
                            <DataViewer
                                data={result.error}
                                className="border-l-2 border-l-red-400"
                            />
                        </div>
                    )}

                    {/* Step Type Specific: Evaluation */}
                    {stepDefinition.step_type === 'EVALUATION' && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Condition Evaluation
                                {!result.outputs && (
                                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                                        (no evaluation data available)
                                    </span>
                                )}
                            </h4>
                            {result.outputs ? (
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-3 divide-y divide-gray-100 dark:divide-gray-700">
                                    <EvaluationDataViewer
                                        label="Condition"
                                        data={getOutputValue(result.outputs, 'condition_met')}
                                    />

                                    <EvaluationDataViewer
                                        label="Result"
                                        data={(() => {
                                            const variableName = getOutputValue(result.outputs, 'variable_name');
                                            let variableValue = getOutputValue(result.outputs, 'variable_value');
                                            const operator = getOutputValue(result.outputs, 'operator');
                                            let comparisonValue = getOutputValue(result.outputs, 'comparison_value');

                                            // Try to parse JSON values
                                            try {
                                                if (variableValue) variableValue = JSON.parse(variableValue);
                                            } catch (e) { /* Use as is if not valid JSON */ }

                                            try {
                                                if (comparisonValue) comparisonValue = JSON.parse(comparisonValue);
                                            } catch (e) { /* Use as is if not valid JSON */ }

                                            if (variableName && operator && comparisonValue) {
                                                return `${variableName} (${variableValue}) ${operator.replace('_', ' ')} ${comparisonValue}`;
                                            } else {
                                                // Use condition_met and reason as fallback
                                                const conditionMet = getOutputValue(result.outputs, 'condition_met');
                                                const reason = getOutputValue(result.outputs, 'reason');
                                                return conditionMet !== 'none'
                                                    ? `Condition "${conditionMet}" met`
                                                    : reason || 'No condition met';
                                            }
                                        })()}
                                    />

                                    <EvaluationDataViewer
                                        label="Action"
                                        data={(() => {
                                            const action = getOutputValue(result.outputs, 'next_action');
                                            if (action === 'jump') {
                                                return `Jump to step ${getOutputValue(result.outputs, 'target_step_index')}`;
                                            } else if (action === 'end') {
                                                return 'End workflow';
                                            } else {
                                                return 'Continue to next step';
                                            }
                                        })()}
                                    />

                                    {getOutputValue(result.outputs, 'reason') && (
                                        <EvaluationDataViewer
                                            label="Reason"
                                            data={getOutputValue(result.outputs, 'reason')}
                                        />
                                    )}

                                    {getOutputValue(result.outputs, 'jump_count') && (
                                        <EvaluationDataViewer
                                            label="Jump Count"
                                            data={`${getOutputValue(result.outputs, 'jump_count')} / ${getOutputValue(result.outputs, 'max_jumps')}${getOutputValue(result.outputs, 'max_jumps_reached') === 'true'
                                                ? ' (Maximum reached)'
                                                : ''
                                                }`}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-3 text-gray-500 dark:text-gray-400 text-sm italic">
                                    No evaluation data available for this execution.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Input/Output Mappings */}
                    {stepDefinition.step_type === 'ACTION' && (
                        <div>
                            {/* Input Mappings */}
                            {inputMappings.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                        Inputs
                                        {!result.inputs && (
                                            <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                                                (showing current values - historical values not available)
                                            </span>
                                        )}
                                    </h4>
                                    <div className="space-y-3">
                                        {inputMappings.map((input, idx) => (
                                            <JobDataViewer
                                                key={idx}
                                                label={`$${input.paramLabel}`}
                                                data={input.value}
                                                isInput={true}
                                                isMarkdown={false}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Output Mappings */}
                            {outputMappings.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                        Outputs
                                        {!result.outputs && (
                                            <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                                                (no output values available)
                                            </span>
                                        )}
                                    </h4>
                                    <div className="space-y-3">
                                        {outputMappings.map((output, idx) => (
                                            <JobDataViewer
                                                key={idx}
                                                label={`$${output.outputLabel}`}
                                                data={output.value}
                                                isInput={false}
                                                isMarkdown={stepDefinition.tool?.tool_type === 'llm'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const JobExecutionHistory: React.FC<JobExecutionHistoryProps> = ({ job, executionState }) => {
    const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

    const toggleResult = (index: number) => {
        const newExpanded = new Set(expandedResults);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedResults(newExpanded);
    };

    // Get step results from executionState if available, otherwise try to build from job steps
    let stepResults: StepExecutionResult[] = [];

    if (executionState?.step_results && executionState.step_results.length > 0) {
        // Use execution state if available
        stepResults = executionState.step_results;
    } else {
        // Fall back to job step execution history
        stepResults = job.steps
            .filter(step => step.latest_execution)
            .map(step => step.latest_execution!)
            .filter(execution => execution !== undefined);
    }

    // Show message if no execution history is available
    if (stepResults.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No execution history available
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Step Results List */}
            {stepResults.map((result, index) => (
                <StepResultCard
                    key={`${result.step_id}-${index}`}
                    job={job}
                    result={result}
                    isExpanded={expandedResults.has(index)}
                    onToggle={() => toggleResult(index)}
                    executionIndex={index}
                />
            ))}

            {/* Job Error */}
            {job.error_message && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Job Error</h4>
                    <DataViewer
                        data={job.error_message}
                        className="border-l-2 border-l-red-400"
                    />
                </div>
            )}
        </div>
    );
}; 
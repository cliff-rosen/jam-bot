import React from 'react';
import { WorkflowStep } from '@/types/workflows';
import { EvaluationOutputs } from '@/types/evaluation';
import { useWorkflows } from '@/context/WorkflowContext';
import { resolveVariablePath } from '@/lib/utils/variablePathUtils';
import { formatVariablePath } from '@/lib/utils/variableUIUtils';

interface EvaluationStepRunnerProps {
    step: WorkflowStep;
    isExecuted: boolean;
    isExecuting: boolean;
}

const EvaluationStepRunner: React.FC<EvaluationStepRunnerProps> = ({
    step,
    isExecuted,
    isExecuting
}) => {
    const { workflow } = useWorkflows();

    // Get all available variables for condition evaluation
    const availableVariables = [
        ...(workflow?.state || [])
    ];

    // Get evaluation results from workflow state
    const evaluationResultVar = workflow?.state?.find(
        v => v.name === `eval_${step.step_id.slice(0, 8)}`
    );

    // The value stored in the workflow state is actually just the outputs object from EvaluationResult
    // not the full EvaluationResult object as defined in the types
    const evaluationOutputs = evaluationResultVar?.value as EvaluationOutputs | undefined;

    // If we don't have an evaluation config, show an error
    if (!step.evaluation_config) {
        return (
            <div className="p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400">
                <h2 className="text-lg font-semibold mb-2">Error</h2>
                <p>This evaluation step is missing its configuration. Please edit this step to set up conditions.</p>
            </div>
        );
    }

    // Get the condition that was met (if any) from the outputs
    const conditionMet = evaluationOutputs?.condition_met;

    // Get other useful values from the outputs
    const nextAction = evaluationOutputs?.next_action;
    const targetStepIndex = evaluationOutputs?.target_step_index ?
        Number(evaluationOutputs.target_step_index) : undefined;
    const reason = evaluationOutputs?.reason;
    const maxJumpsReached = evaluationOutputs?.max_jumps_reached === 'true';
    const jumpCount = evaluationOutputs?.jump_count ? Number(evaluationOutputs.jump_count) : 0;
    const maxJumps = evaluationOutputs?.max_jumps ? Number(evaluationOutputs.max_jumps) : step.evaluation_config.maximum_jumps;

    // Render the evaluation step
    return (
        <div className="space-y-6">
            {/* Evaluation Step Header */}
            <div className="p-4 bg-blue-50/40 dark:bg-blue-900/5 border border-blue-100 dark:border-blue-800/30 rounded-lg">
                <h2 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-300">
                    <span className="mr-2">⚖️</span>
                    Evaluation Step
                </h2>
                <p className="mb-2 text-blue-500/80 dark:text-blue-300/80">
                    This step evaluates conditions and determines which path to take in the workflow.
                </p>
                {isExecuted && maxJumpsReached && (
                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/40 rounded text-gray-600 dark:text-gray-300 text-sm">
                        <span className="font-medium">Note:</span> Maximum jumps ({maxJumps}) reached. The workflow will continue to the next step.
                    </div>
                )}
            </div>

            {/* List of Conditions */}
            <div className="space-y-3">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">Conditions</h3>
                <div className="space-y-2">
                    {step.evaluation_config.conditions.map((condition, index) => {
                        // Get the variable value using the variable path
                        const { value: variableValue, validPath } = resolveVariablePath(
                            availableVariables,
                            condition.variable.toString()
                        );

                        // Check if this condition was met
                        const isConditionMet = isExecuted &&
                            conditionMet !== undefined &&
                            conditionMet !== 'none' &&
                            String(conditionMet) === String(condition.condition_id);

                        return (
                            <div
                                key={index}
                                className={`border rounded-lg p-3 transition-colors ${isConditionMet
                                    ? maxJumpsReached
                                        ? 'border-gray-200 bg-gray-50/70 dark:bg-gray-800/70 dark:border-gray-700/50'
                                        : 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/5 dark:border-emerald-700/30'
                                    : 'border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/50'
                                    }`}
                            >
                                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-center">
                                    <div className="text-sm">
                                        <div className={`font-medium ${isConditionMet
                                            ? maxJumpsReached
                                                ? 'text-gray-700 dark:text-gray-300'
                                                : 'text-emerald-600 dark:text-emerald-300'
                                            : 'text-gray-700 dark:text-gray-300'}`}>
                                            {formatVariablePath(condition.variable.toString())}
                                        </div>
                                        {isExecuted && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Current value: {validPath && variableValue !== undefined ? String(variableValue) : 'undefined'}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`font-medium ${isConditionMet
                                        ? maxJumpsReached
                                            ? 'text-gray-500 dark:text-gray-400'
                                            : 'text-emerald-500 dark:text-emerald-300/80'
                                        : 'text-gray-500 dark:text-gray-400'}`}>
                                        {condition.operator}
                                    </div>
                                    <div className={`text-sm ${isConditionMet
                                        ? maxJumpsReached
                                            ? 'text-gray-700 dark:text-gray-300'
                                            : 'text-emerald-600 dark:text-emerald-300'
                                        : 'text-gray-700 dark:text-gray-300'}`}>
                                        {condition.value}
                                    </div>
                                    <div className={`${isConditionMet
                                        ? maxJumpsReached
                                            ? 'text-gray-500 dark:text-gray-400'
                                            : 'text-emerald-500 dark:text-emerald-300/80'
                                        : 'text-gray-400 dark:text-gray-500'}`}>
                                        →
                                    </div>
                                    <div className={`text-sm font-medium ${isConditionMet
                                        ? maxJumpsReached
                                            ? 'text-gray-700 dark:text-gray-300'
                                            : 'text-emerald-600 dark:text-emerald-300'
                                        : 'text-gray-700 dark:text-gray-300'}`}>
                                        {condition.target_step_index !== undefined
                                            ? `Jump to step ${condition.target_step_index + 1}`
                                            : 'Next step'
                                        }
                                    </div>
                                </div>
                                {isConditionMet && (
                                    <div className={`mt-2 text-sm flex items-center ${maxJumpsReached
                                        ? 'text-gray-500 dark:text-gray-400'
                                        : 'text-emerald-500 dark:text-emerald-300/80'}`}>
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {maxJumpsReached
                                            ? 'Maximum jumps reached'
                                            : 'Condition met'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Execution status */}
            {isExecuting && (
                <div className="mt-4 flex items-center text-blue-500/80 dark:text-blue-300/80">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Evaluating conditions...
                </div>
            )}

            {/* Evaluation Result - Only shown after execution */}
            {isExecuted && evaluationOutputs && (
                <div className="mt-4 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Evaluation Result
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        {nextAction === 'jump' && targetStepIndex !== undefined ? (
                            <p>
                                A condition was met. The workflow will jump to Step {targetStepIndex + 1}.
                            </p>
                        ) : (
                            <p>
                                {conditionMet === 'none' || conditionMet === undefined
                                    ? 'No conditions were met. The workflow will continue to the next step.'
                                    : maxJumpsReached
                                        ? `A condition was met, but maximum jumps (${maxJumps}) have been reached. The workflow will continue to the next step.`
                                        : 'A condition was met. The workflow will continue to the next step.'}
                            </p>
                        )}
                    </div>
                    {isExecuted && jumpCount > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Jump count: {jumpCount} / {maxJumps}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EvaluationStepRunner; 
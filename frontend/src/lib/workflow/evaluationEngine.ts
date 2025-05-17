import {
    WorkflowStep,
    WorkflowVariable,
    WorkflowVariableName,
    StepExecutionResult,
    Workflow
} from '../../types/workflows';
import {
    EvaluationCondition,
    EvaluationConditionResult
} from '../../types/evaluation';
import { resolveVariablePath } from '../utils/variablePathUtils';

export class EvaluationEngine {
    /**
     * Evaluates conditions for a workflow step
     * This returns a simple object with result and conditions, not the EvaluationResult type
     */
    static evaluateConditions(
        step: WorkflowStep,
        state: WorkflowVariable[]
    ): {
        result: boolean;
        conditions: EvaluationConditionResult[];
    } {
        if (!step.evaluation_config || !step.evaluation_config.conditions) {
            return { result: true, conditions: [] };
        }

        const allVariables = state || [];
        const conditionResults: EvaluationConditionResult[] = [];
        let foundMatchingCondition = false;

        // Evaluate each condition until we find one that's met
        for (const condition of step.evaluation_config.conditions) {
            if (!condition.variable) continue;

            // Resolve the variable value
            const { value, validPath } = resolveVariablePath(allVariables, condition.variable.toString());

            let result = false;

            if (validPath) {
                // Evaluate the condition based on the operator
                switch (condition.operator) {
                    case 'equals':
                        result = value === condition.value;
                        break;
                    case 'not_equals':
                        result = value !== condition.value;
                        break;
                    case 'greater_than':
                        result = typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
                        break;
                    case 'less_than':
                        result = typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
                        break;
                    case 'contains':
                        if (typeof value === 'string' && typeof condition.value === 'string') {
                            result = value.includes(condition.value);
                        } else if (Array.isArray(value)) {
                            result = value.includes(condition.value);
                        }
                        break;
                    case 'not_contains':
                        if (typeof value === 'string' && typeof condition.value === 'string') {
                            result = !value.includes(condition.value);
                        } else if (Array.isArray(value)) {
                            result = !value.includes(condition.value);
                        }
                        break;
                    default:
                        console.warn(`Unknown operator: ${condition.operator}`);
                        result = false;
                }
            } else {
                console.warn(`Invalid variable path: ${condition.variable}`);
                result = false;
            }

            // Add this condition to the results
            conditionResults.push({
                condition,
                result,
                value
            });

            // If this condition is met, we can stop checking others
            if (result) {
                foundMatchingCondition = true;
                console.log(`Found matching condition: ${condition.variable} ${condition.operator} ${condition.value}`);
                break;
            }
        }

        return {
            result: foundMatchingCondition,
            conditions: conditionResults
        };
    }

    /**
     * Evaluates conditions with provided inputs instead of resolving from workflow state
     * This is a more focused version of evaluateConditions that works with pre-extracted inputs
     */
    static async executeEvaluationStep(
        step: WorkflowStep,
        currentStepIndex: number,
        state: WorkflowVariable[],
        statusCallback?: (status: {
            stepId: string;
            stepIndex: number;
            status: 'running' | 'completed' | 'failed';
            message?: string;
            progress?: number;
            result?: Partial<StepExecutionResult>;
        }) => void
    ): Promise<{
        result: StepExecutionResult,
        nextStepIndex: number
    }> {
        // Notify status: running with progress
        if (statusCallback) {
            statusCallback({
                stepId: step.step_id,
                stepIndex: currentStepIndex,
                status: 'running',
                message: `Evaluating conditions`,
                progress: 30
            });
        }

        // Evaluate conditions
        const evaluationResult = this.evaluateConditions(step, state);

        // Default values
        let nextStepIndex = currentStepIndex + 1;
        let nextAction = 'continue';
        let targetStepIndex = -1;
        let jumpCount = 0;
        let maxJumpsReached = false;

        // Get the first condition that was met (if any)
        // Since we're stopping at the first matching condition in evaluateConditions,
        // it will be the last one in the results array if any condition was met
        const metCondition = evaluationResult.result
            ? evaluationResult.conditions[evaluationResult.conditions.length - 1]
            : null;

        // If a condition was met and it has a target step, prepare for jump
        if (metCondition && metCondition.condition.target_step_index !== undefined) {
            // Check jump count from previous evaluation result to prevent infinite loops
            const shortStepId = step.step_id.slice(0, 8);
            const evalVarName = `eval_${shortStepId}`;
            const prevEvalResult = state?.find(v => v.name === evalVarName);

            // Get jump count from previous evaluation result if it exists
            if (prevEvalResult?.value && typeof prevEvalResult.value === 'object') {
                const prevOutputs = prevEvalResult.value as Record<string, any>;
                if (prevOutputs.jump_count) {
                    jumpCount = Number(prevOutputs.jump_count);
                    console.log(`Found previous jump count: ${jumpCount} for step ${step.step_id}`);
                }
            } else {
                console.log(`No previous jump count found for step ${step.step_id}, starting at 0`);
            }

            const maxJumps = step.evaluation_config?.maximum_jumps || 3;
            maxJumpsReached = jumpCount >= maxJumps;

            if (!maxJumpsReached) {
                nextAction = 'jump';
                targetStepIndex = metCondition.condition.target_step_index;
                nextStepIndex = targetStepIndex;
                jumpCount++; // Increment for the output
                console.log(`Jump count incremented to ${jumpCount} for step ${step.step_id}`);
            } else {
                console.warn(`Maximum jumps (${maxJumps}) reached for step ${step.step_id}, continuing to next step`);
            }
        }

        // Create evaluation outputs in the original format
        const outputs: Record<string, any> = {
            condition_met: metCondition ? metCondition.condition.variable : 'none',
            variable_name: metCondition ? metCondition.condition.variable.toString() : '',
            variable_value: metCondition ? JSON.stringify(metCondition.value) : '',
            operator: metCondition ? metCondition.condition.operator : '',
            comparison_value: metCondition ? JSON.stringify(metCondition.condition.value) : '',
            next_action: nextAction,
            target_step_index: targetStepIndex !== -1 ? targetStepIndex.toString() : '',
            reason: metCondition
                ? `Condition met: ${metCondition.condition.variable} ${metCondition.condition.operator} ${metCondition.condition.value}`
                : 'No conditions met',
            jump_count: jumpCount.toString(),
            max_jumps: (step.evaluation_config?.maximum_jumps || 3).toString(),
            max_jumps_reached: maxJumpsReached ? 'true' : 'false'
        };

        if (statusCallback) {
            statusCallback({
                stepId: step.step_id,
                stepIndex: currentStepIndex,
                status: 'completed',
                message: `Evaluation ${evaluationResult.result ? 'passed' : 'failed'}, ${nextAction}`,
                progress: 100,
                result: {
                    success: true,
                    outputs
                }
            });
        }

        return {
            result: {
                success: true,
                outputs
            },
            nextStepIndex
        };
    }

    /**
     * Determines the next step to execute based on evaluation results
     */
    static determineNextStep(
        evaluationResult: {
            result: boolean;
            conditions: EvaluationConditionResult[];
        },
        currentStepIndex: number,
        totalSteps: number
    ): number {
        let nextStepIndex = currentStepIndex + 1;

        // If a condition was met, it will be the last one in the results array
        if (evaluationResult.result) {
            const metCondition = evaluationResult.conditions[evaluationResult.conditions.length - 1];

            if (metCondition.condition.target_step_index !== undefined) {
                nextStepIndex = metCondition.condition.target_step_index;
                console.log('Jump will occur to step:', nextStepIndex);
            } else {
                console.log('Condition met but no jump target specified, continuing to next step:', nextStepIndex);
            }
        } else {
            console.log('No condition met, continuing to next step:', nextStepIndex);
        }

        return nextStepIndex;
    }
} 
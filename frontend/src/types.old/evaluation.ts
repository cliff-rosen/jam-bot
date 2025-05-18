import { WorkflowVariableName, WorkflowVariable, StepExecutionResult } from './workflows';
import { SchemaValueType } from './schema';

// Evaluation condition operators
export type EvaluationOperator =
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'not_contains';

// Evaluation condition configuration
export interface EvaluationCondition {
    condition_id: string;
    variable: WorkflowVariableName;
    operator: EvaluationOperator;
    value: any;
    target_step_index?: number;  // Step to jump to if condition is met
}

// Evaluation configuration for workflow steps
export interface EvaluationConfig {
    conditions: EvaluationCondition[];
    default_action: 'continue' | 'end';  // What to do if no conditions match
    maximum_jumps: number;  // Maximum number of times conditions will be checked before forcing continue
}

/**
 * Represents the structure of evaluation outputs that are stored in the workflow state
 */
export interface EvaluationOutputs {
    condition_met: string;
    variable_name: string;
    variable_value: string;
    operator: string;
    comparison_value: string;
    reason: string;
    next_action: string;
    target_step_index: string;
    jump_count: string;
    max_jumps: string;
    max_jumps_reached: string;
    [key: string]: SchemaValueType;  // Index signature to make it compatible with SchemaObjectType
}

// Evaluation result that determines the next step in workflow
export interface EvaluationResult extends Omit<StepExecutionResult, 'outputs'> {
    conditionMet: string;  // ID of the condition that was met, or 'none'
    nextAction: 'continue' | 'jump' | 'end';
    targetStepIndex?: number;  // Only required when nextAction is 'jump'
    reason?: string;  // Optional explanation for the decision
    outputs?: EvaluationOutputs;  // Typed outputs for evaluation steps
}

// Result of evaluating a single condition
export interface EvaluationConditionResult {
    condition: EvaluationCondition;
    result: boolean;
    value: any;
} 
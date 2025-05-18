import { Variable } from './schema';
import { Tool, ToolParameterName, ToolOutputName } from './tools';
import {
    WorkflowVariableName,
    WorkflowVariable,
    StepExecutionResult as WorkflowStepResult,
    WorkflowStepType,
    EvaluationConfig
} from './workflows';

export enum JobStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

// Branded types for type-safe job references
export type JobId = string & { readonly __brand: unique symbol };
export type JobStepId = string & { readonly __brand: unique symbol };

// Job variable extends base Variable with required flag
export interface JobVariable extends Omit<Variable, 'name'> {
    name: WorkflowVariableName;  // Must match a workflow variable name
    required: boolean;
}

// Job step definition
export interface JobStep {
    step_id: JobStepId;
    job_id: JobId;
    label: string;
    description: string;
    step_type: WorkflowStepType;
    tool?: Tool;
    tool_id?: string;
    prompt_template_id?: string;
    parameter_mappings: Record<ToolParameterName, WorkflowVariableName>;
    output_mappings: Record<ToolOutputName, WorkflowVariableName>;
    evaluation_config?: EvaluationConfig;
    sequence_number: number;
    status: JobStatus;
    error_message?: string;
    started_at?: string;
    completed_at?: string;

    // Execution history for this step (replaces output_data)
    executions: StepExecutionResult[];

    // Latest execution result (for quick access)
    latest_execution?: StepExecutionResult;
}

// Complete job definition
export interface Job {
    job_id: JobId;
    workflow_id: string;
    user_id: string;
    name: string;
    description?: string;
    status: JobStatus;
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
    error_message?: string;

    // State management (single source of truth for all variables and their values)
    state: WorkflowVariable[];

    // Legacy properties (to be phased out)
    input_variables?: JobVariable[];

    steps: JobStep[];
    execution_progress?: {
        current_step: number;
        total_steps: number;
    };
}

// Job execution state (runtime-only state, not persisted)
export interface JobExecutionState {
    job_id: JobId;
    current_step_index: number;
    total_steps: number;
    is_paused: boolean;
    live_output: string;
    status: JobStatus;

    // Complete history of all step executions during this run
    step_results: StepExecutionResult[];
}

// Step execution result (aligned with workflow step result)
export interface StepExecutionResult extends WorkflowStepResult {
    step_id: JobStepId;
    started_at: string;
    completed_at?: string;
}

// Create job request
export interface CreateJobRequest {
    workflow_id: string;
    name: string;
    description?: string;
    input_variables: JobVariable[];
}

// Validation utilities
export const isJobComplete = (job: Job): job is Job & { status: JobStatus.COMPLETED } => {
    return job.status === JobStatus.COMPLETED;
};

export const isJobFailed = (job: Job): job is Job & { status: JobStatus.FAILED; error_message: string } => {
    return job.status === JobStatus.FAILED;
};

export const isJobRunning = (job: Job): job is Job & { status: JobStatus.RUNNING; started_at: string } => {
    return job.status === JobStatus.RUNNING;
};

export const isStepComplete = (step: JobStep): step is JobStep & { status: JobStatus.COMPLETED; completed_at: string } => {
    return step.status === JobStatus.COMPLETED;
};

export const isStepFailed = (step: JobStep): step is JobStep & { status: JobStatus.FAILED; error_message: string } => {
    return step.status === JobStatus.FAILED;
}; 
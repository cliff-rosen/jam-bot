import { AgentWorkflow } from '../../../types/agent-workflows';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowEngine } from '../workflowEngine';
import { WorkflowVariable } from '../../../types/workflows';
import { updateStateWithInputs } from '../utils/state-management';

// Job status type
type JobStatus = 'running' | 'completed' | 'failed';

/**
 * Interface for a workflow job configuration
 */
export interface WorkflowJobConfig {
    workflow: AgentWorkflow;
    inputs: Record<string, any>;
    statusCallback?: (status: {
        jobId: string;
        stepId: string;
        stepIndex: number;
        status: 'running' | 'completed' | 'failed';
        message?: string;
        progress?: number;
        result?: any;
        currentState?: WorkflowVariable[];
    }) => void;
}

/**
 * Interface for a job result
 */
export interface WorkflowJobResult {
    success: boolean;
    outputs?: Record<string, any>;
    error?: string;
}

/**
 * A WorkflowEngine implementation for agent workflows
 */
export class AgentWorkflowEngine {
    private activeJobs: Map<string, {
        status: JobStatus;
        currentStepIndex?: number;
    }> = new Map();

    async runJob(config: WorkflowJobConfig): Promise<WorkflowJobResult> {
        const jobId = uuidv4();
        console.log(`🚀 [JOB ${jobId}] Starting workflow job: ${config.workflow.name}`);

        // Store the job status
        this.activeJobs.set(jobId, {
            status: 'running'
        });

        try {
            const { workflow, inputs, statusCallback } = config;

            // Update workflow state with inputs using the new system
            const workflowState = updateStateWithInputs(
                workflow.state as WorkflowVariable[],
                inputs,
                // Create identity mapping since inputs are already in workflow variable space
                Object.fromEntries(Object.keys(inputs).map(k => [k, k]))
            );

            // Execute each step in sequence
            let currentState = workflowState;
            const outputs: Record<string, any> = {};
            let currentStepIndex = 0;

            console.log(`📋 [JOB ${jobId}] Workflow has ${workflow.steps.length} steps`);

            while (currentStepIndex < workflow.steps.length) {
                // Check if job was cancelled
                if (this.activeJobs.get(jobId)?.status !== 'running') {
                    throw new Error('Job cancelled');
                }

                const step = workflow.steps[currentStepIndex];
                console.log(`▶️ [JOB ${jobId}] Executing step ${currentStepIndex + 1}/${workflow.steps.length}: ${step.label}`);

                // Update job status with current step
                this.activeJobs.set(jobId, {
                    status: 'running',
                    currentStepIndex
                });

                // Execute the step
                const stepResult = await WorkflowEngine.executeStepSimple(
                    {
                        ...workflow,
                        state: currentState
                    },
                    currentStepIndex,
                    statusCallback ? (status) => statusCallback({
                        ...status,
                        jobId,
                        currentState
                    }) : undefined
                );

                // Update current state
                currentState = stepResult.updatedState;

                // Check if the step execution was successful
                if (!stepResult.result.success) {
                    const error = stepResult.result.error || 'Step failed';
                    console.error(`❌ [JOB ${jobId}] Step ${currentStepIndex + 1} failed: ${error}`);

                    // Update job status to failed
                    this.activeJobs.set(jobId, {
                        status: 'failed',
                        currentStepIndex
                    });

                    throw new Error(error);
                }

                // Collect outputs if step was successful
                if (stepResult.result.outputs) {
                    Object.assign(outputs, stepResult.result.outputs);
                }

                console.log(`✅ [JOB ${jobId}] Step ${currentStepIndex + 1} completed successfully`);

                // Move to the next step
                const previousStepIndex = currentStepIndex;
                currentStepIndex = stepResult.nextStepIndex;

                // Log if we're jumping to a different step
                if (currentStepIndex !== previousStepIndex + 1) {
                    if (currentStepIndex >= workflow.steps.length) {
                        console.log(`🏁 [JOB ${jobId}] Workflow execution completed (end of workflow)`);
                    } else {
                        console.log(`↪️ [JOB ${jobId}] Jumping from step ${previousStepIndex + 1} to step ${currentStepIndex + 1}`);
                    }
                }
            }

            // Update job status to completed
            this.activeJobs.set(jobId, {
                status: 'completed',
                currentStepIndex: workflow.steps.length - 1
            });

            console.log(`🎉 [JOB ${jobId}] Workflow job completed successfully`);

            return {
                success: true,
                outputs: currentState
            };
        } catch (error) {
            console.error(`❌ [JOB ${jobId}] Error executing workflow:`, error);

            // Update job status to failed if not already
            if (this.activeJobs.get(jobId)?.status === 'running') {
                this.activeJobs.set(jobId, {
                    status: 'failed'
                });
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async cancelJob(jobId: string): Promise<boolean> {
        const jobData = this.activeJobs.get(jobId);
        if (jobData && jobData.status === 'running') {
            this.activeJobs.set(jobId, {
                ...jobData,
                status: 'failed'
            });
            return true;
        }
        return false;
    }
} 
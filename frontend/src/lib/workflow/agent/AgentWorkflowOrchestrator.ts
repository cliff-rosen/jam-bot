import { EventEmitter } from '../../../lib/utils/EventEmitter';
import { v4 as uuidv4 } from 'uuid';
import {
    AgentWorkflow,
    AgentWorkflowChain,
    WorkflowPhase
} from '../../../types/agent-workflows';
import { WorkflowVariable } from '../../../types/workflows';
import { AgentWorkflowEngine } from './AgentWorkflowEngine';
import { updateStateWithInputs, updateStateWithOutputs, variablesToRecord } from '../utils/state-management';

/**
 * Message types for workflow status updates
 */
export enum WorkflowMessageType {
    STATUS_UPDATE = 'status_update',
    PHASE_COMPLETE = 'phase_complete',
    WORKFLOW_COMPLETE = 'workflow_complete',
    ERROR = 'error'
}

/**
 * Phases of the orchestration process
 */
export type OrchestrationPhase =
    | 'question_development'
    | 'knowledge_base_development'
    | 'answer_generation'
    | 'completed'
    | 'failed';

/**
 * Status of a workflow step
 */
export interface WorkflowStepStatus {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'failed';
    result?: any;
    message?: string;
}

/**
 * Core status information for the workflow
 */
export interface WorkflowStatus {
    phase: OrchestrationPhase;
    progress: number;
    error?: string;
    currentSteps: WorkflowStepStatus[];
    results?: Record<string, any>;
    currentState?: WorkflowVariable[];
}

/**
 * Unified message structure for all workflow updates
 */
export interface WorkflowMessage {
    type: WorkflowMessageType;
    sessionId: string;
    timestamp: string;
    status: WorkflowStatus;
}

/**
 * Configuration options for the agent workflow
 */
export interface AgentWorkflowConfig {
    maxIterationsPerPhase?: Record<string, number>;
    confidenceThresholds?: Record<string, number>;
}

/**
 * Interface for the agent workflow orchestrator
 */
export interface AgentWorkflowOrchestratorInterface {
    executeWorkflowChain(
        workflowChain: AgentWorkflowChain,
        inputValues: WorkflowVariable[],
        config?: AgentWorkflowConfig
    ): Promise<string>;
    getStatus(): WorkflowStatus;
    cancelExecution(): Promise<boolean>;
    onMessage(callback: (message: WorkflowMessage) => void): void;
}

/**
 * AgentWorkflowOrchestrator coordinates the execution of the three agent workflows
 * that make up the complete agent workflow: question development, knowledge base
 * development, and answer generation.
 */
export class AgentWorkflowOrchestrator implements AgentWorkflowOrchestratorInterface {
    private sessionId: string;
    private status: WorkflowStatus;
    private eventEmitter: EventEmitter;
    private workflowEngine: AgentWorkflowEngine;
    private config: AgentWorkflowConfig;
    private phaseResults: Record<string, any> = {};


    constructor(workflowEngine?: AgentWorkflowEngine) {
        this.sessionId = uuidv4();
        this.status = {
            phase: 'question_development',
            progress: 0,
            error: undefined,
            currentSteps: [],
            results: {}
        };
        this.eventEmitter = new EventEmitter();
        this.workflowEngine = workflowEngine || new AgentWorkflowEngine();
        this.config = {};
    }

    /**
     * Register a callback for all workflow messages
     */
    onMessage(callback: (message: WorkflowMessage) => void): void {
        this.eventEmitter.on('workflow_message', callback);
    }

    /**
     * Remove a callback for workflow messages
     */
    offMessage(callback: (message: WorkflowMessage) => void): void {
        this.eventEmitter.off('workflow_message', callback);
    }

    private emitMessage(type: WorkflowMessageType, status: Partial<WorkflowStatus>): void {
        const message: WorkflowMessage = {
            type,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            status: {
                phase: this.status.phase,
                progress: this.status.progress,
                error: this.status.error,
                currentSteps: this.status.currentSteps,
                results: this.status.results,
                currentState: this.status.currentState,
                ...status
            }
        };
        this.eventEmitter.emit('workflow_message', message);
    }

    /**
     * Execute the full agent workflow
     * @param inputValues The input values to initialize the workflow chain state
     * @param workflowChain The workflow chain to execute
     * @param config Optional configuration for the workflow
     * @returns Promise resolving to the final answer
     */
    async executeWorkflowChain(
        workflowChain: AgentWorkflowChain,
        inputValues: Record<string, any>,
        config?: AgentWorkflowConfig
    ): Promise<string> {
        try {
            console.log('🚀 [WORKFLOW] Starting full workflow execution');

            // Store config
            this.config = config || {};

            // Update chain state with input values
            let chainState = updateStateWithInputs(
                workflowChain.state as WorkflowVariable[],
                inputValues,
                // Create identity mapping for input values
                Object.fromEntries(Object.keys(inputValues).map(k => [k, k]))
            );

            // Initialize phase results with the input values
            this.phaseResults = {
                ...inputValues
            };

            this.updateStatus({
                currentState: chainState
            });


            // Execute each phase in sequence
            let finalAnswer = '';
            for (const phase of workflowChain.phases) {
                console.log(`🔄 [WORKFLOW] Starting phase: ${phase.id}`);

                // Update status to the current phase
                this.updateStatus({
                    phase: phase.id as OrchestrationPhase,
                    currentSteps: []
                });

                // Get the workflow for this phase
                const workflow = await (phase.workflow instanceof Promise ? phase.workflow : phase.workflow());

                // Apply workflow configuration
                this.applyWorkflowConfig(workflow);

                // Execute the workflow for this phase
                const result = await this.executeWorkflowPhase(phase, variablesToRecord(chainState));

                // Store the results in the phase results
                this.phaseResults[phase.id] = result;

                // Update chain state with phase outputs
                chainState = updateStateWithOutputs(
                    chainState,
                    variablesToRecord(result),
                    phase.outputs_mappings
                );


                console.timeEnd(`⏱️ Phase Execution Time: ${phase.id}`);
                console.log(`✅ [WORKFLOW] Completed phase: ${phase.id}`);
            }

            // Update status to completed
            this.updateStatus({
                phase: 'completed',
                progress: 100,
                results: {
                    chainOutputs: chainState
                }
            });

            // Emit workflow complete event
            this.emitWorkflowComplete(chainState);

            console.timeEnd('⏱️ Full Workflow Execution Time');
            console.log('✅ [WORKFLOW] Workflow execution completed');

            return finalAnswer;
        } catch (error) {
            console.error('❌ [WORKFLOW] Error executing workflow:', error);

            // Update status to failed
            this.updateStatus({
                phase: 'failed',
                error: error instanceof Error ? error.message : String(error)
            });

            // Emit error event
            this.emitError(error instanceof Error ? error.message : String(error));

            throw error;
        }
    }

    /**
     * Get the current status of the workflow
     */
    getStatus(): WorkflowStatus {
        return { ...this.status };
    }

    /**
     * Cancel the execution of the workflow
     */
    async cancelExecution(): Promise<boolean> {
        // If there's a current workflow job, cancel it
        if (this.status.currentSteps.length > 0) {
            await this.workflowEngine.cancelJob(this.status.currentSteps[0].id);
        }

        // Update status
        this.updateStatus({
            phase: 'failed',
            error: 'Workflow cancelled by user',
            currentSteps: []
        });

        // Emit error event
        this.emitError('Workflow cancelled by user');

        return true;
    }

    /**
     * Execute a single workflow phase
     * @param phase The workflow phase to execute
     * @param inputs The input values for this phase
     * @returns Promise resolving to the phase results
     */
    private async executeWorkflowPhase(
        phase: WorkflowPhase,
        inputs: Record<string, any>
    ): Promise<Record<string, any>> {
        console.log(`🔄 [PHASE ${phase.id}] Starting workflow phase: ${phase.label}`);

        // Store the current phase but don't emit a status update since it was already done in executeWorkflowChain
        this.status.phase = phase.id as OrchestrationPhase;

        // Get the workflow
        const workflow = await (phase.workflow instanceof Promise ? phase.workflow : phase.workflow());

        // Apply configuration
        this.applyWorkflowConfig(workflow);

        // Update workflow state with inputs
        const workflowState = updateStateWithInputs(
            workflow.state as WorkflowVariable[],
            inputs,
            phase.inputs_mappings
        );

        // Create status callback
        const statusCallback = (status: {
            jobId: string;
            stepId: string;
            stepIndex: number;
            status: 'running' | 'completed' | 'failed';
            message?: string;
            progress?: number;
            result?: any;
            currentState?: WorkflowVariable[];
        }) => {
            // Calculate progress
            const stepCount = workflow.steps.length;
            const stepWeight = 1 / stepCount;
            const stepProgress = status.progress || 0;
            const phaseProgress = Math.min(
                100,
                Math.round((status.stepIndex * stepWeight * 100) + (stepProgress * stepWeight))
            );

            // Emit a status update message with step information
            this.updateStatus({
                progress: phaseProgress,
                currentSteps: [{
                    id: status.stepId,
                    name: workflow.steps[status.stepIndex]?.label || `Step ${status.stepIndex + 1}`,
                    status: status.status,
                    result: status.result,
                    message: status.message
                }],
                results: status.result ? {
                    [`step_${status.stepIndex}`]: status.result
                } : undefined,
                currentState: status.currentState // Include current state in status updates
            });
        };

        // Run the workflow with updated state
        const jobResult = await this.workflowEngine.runJob({
            workflow: {
                ...workflow,
                state: workflowState
            },
            inputs,
            statusCallback
        });
        console.log('qqq AgentWorkflowOrchestrator jobResult', jobResult);

        // Update status to reflect phase completion
        this.updateStatus({
            progress: jobResult.success ? 100 : this.status.progress,
            error: jobResult.error,
            currentSteps: []
        });

        // Check for errors
        if (!jobResult.success || !jobResult.outputs) {
            const errorMessage = jobResult.error || `Unknown error in ${phase.label} workflow`;
            console.error(`❌ [PHASE ${phase.id}] Workflow job failed:`, errorMessage);
            throw new Error(errorMessage);
        }

        // Return the raw outputs from the workflow engine
        // The mapping to chain variables will be done in executeWorkflowChain
        console.log(`✅ [PHASE ${phase.id}] Workflow completed successfully with outputs:`, Object.keys(jobResult.outputs));

        // Emit phase complete event with the raw outputs
        this.emitPhaseComplete(phase.id as OrchestrationPhase, jobResult.outputs);

        return jobResult.outputs;
    }

    /**
     * Apply configuration to a workflow
     */
    private applyWorkflowConfig(workflow: AgentWorkflow): void {
        const { agent_workflow_type } = workflow;

        // Apply max iterations
        if (this.config.maxIterationsPerPhase &&
            agent_workflow_type in this.config.maxIterationsPerPhase) {
            const maxIterations = this.config.maxIterationsPerPhase[agent_workflow_type as keyof typeof this.config.maxIterationsPerPhase];
            if (maxIterations !== undefined) {
                workflow.max_iterations = maxIterations;
            }
        }

        // Apply confidence threshold
        if (this.config.confidenceThresholds &&
            agent_workflow_type in this.config.confidenceThresholds) {
            const threshold = this.config.confidenceThresholds[agent_workflow_type as keyof typeof this.config.confidenceThresholds];
            if (threshold !== undefined) {
                workflow.confidence_threshold = threshold;
            }
        }
    }

    private updateStatus(updates: Partial<WorkflowStatus>): void {
        // Update internal state
        if (updates.phase !== undefined) this.status.phase = updates.phase;
        if (updates.progress !== undefined) this.status.progress = updates.progress;
        if (updates.error !== undefined) this.status.error = updates.error;
        if (updates.currentSteps !== undefined) this.status.currentSteps = updates.currentSteps;
        if (updates.results !== undefined) this.status.results = updates.results;
        if (updates.currentState !== undefined) this.status.currentState = updates.currentState;

        // Emit status update message
        this.emitMessage(WorkflowMessageType.STATUS_UPDATE, updates);
    }

    private emitError(error: string): void {
        this.emitMessage(WorkflowMessageType.ERROR, {
            phase: 'failed',
            error
        });
    }

    private emitPhaseComplete(phase: OrchestrationPhase, result: any): void {
        this.emitMessage(WorkflowMessageType.PHASE_COMPLETE, {
            phase,
            results: { [phase]: result }
        });
    }

    private emitWorkflowComplete(result: any): void {
        this.emitMessage(WorkflowMessageType.WORKFLOW_COMPLETE, {
            phase: 'completed',
            progress: 100,
            results: result
        });
    }
} 
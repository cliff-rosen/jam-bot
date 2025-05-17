import { EventEmitter } from '../../../lib/utils/EventEmitter';
import { AgentWorkflowChain } from '../../../types/agent-workflows';
import {
    WorkflowVariable,
    WorkflowVariableRole,
    validateWorkflowInputs,
    getWorkflowSignature
} from '../../../types/workflows';
import { AgentWorkflowOrchestrator } from './AgentWorkflowOrchestrator';

// Define the missing interfaces
interface OrchestrationStatus {
    sessionId: string;
    // Add other properties as needed
}

interface StatusChangeEvent {
    // Define properties as needed
}

interface PhaseCompleteEvent {
    // Define properties as needed
}

interface WorkflowCompleteEvent {
    // Define properties as needed
}

interface ErrorEvent {
    // Define properties as needed
}

interface AgentWorkflowOrchestratorInterface {
    // Define methods as needed
}

interface WorkflowExecutionConfig {
    // Define properties as needed
}

/**
 * Service for interacting with the Agent Workflow system
 */
export class AgentWorkflowService implements AgentWorkflowOrchestratorInterface {
    private readonly eventEmitter: EventEmitter;
    private readonly activeOrchestrators: Map<string, AgentWorkflowOrchestrator>;
    private readonly stepStatusListeners: Map<string, Set<(status: any) => void>> = new Map();

    constructor() {
        this.eventEmitter = new EventEmitter();
        this.activeOrchestrators = new Map();
    }

    /**
     * Register a listener for step status updates
     * @param sessionId The session ID to listen for updates on
     * @param callback The callback to call when a step status update is received
     */
    onStepStatusUpdate(sessionId: string, callback: (status: {
        jobId: string;
        stepId: string;
        stepIndex: number;
        status: 'running' | 'completed' | 'failed';
        message?: string;
        progress?: number;
        result?: any;
    }) => void): void {
        if (!this.stepStatusListeners.has(sessionId)) {
            this.stepStatusListeners.set(sessionId, new Set());
        }
        this.stepStatusListeners.get(sessionId)?.add(callback);
    }

    /**
     * Unregister a listener for step status updates
     * @param sessionId The session ID to stop listening for updates on
     * @param callback The callback to remove
     */
    offStepStatusUpdate(sessionId: string, callback: (status: any) => void): void {
        this.stepStatusListeners.get(sessionId)?.delete(callback);
        if (this.stepStatusListeners.get(sessionId)?.size === 0) {
            this.stepStatusListeners.delete(sessionId);
        }
    }

    /**
     * Start a new agent workflow with the given input values
     * @param inputValues The input values to initialize the workflow chain state
     * @param workflowChain The workflow chain to execute
     * @param config Optional configuration for the workflow
     * @returns Promise resolving to the final answer
     */
    async executeWorkflowChain(
        inputValues: WorkflowVariable[],
        workflowChain: AgentWorkflowChain,
        config?: WorkflowExecutionConfig
    ): Promise<string> {
        try {
            // Create a new orchestrator
            const orchestrator = new AgentWorkflowOrchestrator();

            // Set up event listeners
            this.setupOrchestratorListeners(orchestrator);

            // Get the session ID
            const status = orchestrator.getStatus();
            const { sessionId } = status;

            // Store the orchestrator
            this.activeOrchestrators.set(sessionId, orchestrator);

            // Process input values to ensure they have appropriate roles
            const processedInputs = inputValues.map(input => {
                // If no role is specified, assign a default role
                if (!input.variable_role) {
                    return { ...input, variable_role: WorkflowVariableRole.USER_INPUT };
                }
                return input;
            });

            // Validate inputs against the workflow signature
            // This is a simplified validation since we're working with WorkflowVariable objects
            // rather than raw input values
            if (workflowChain.phases.length > 0) {
                try {
                    // Get the first phase's workflow
                    const firstPhase = workflowChain.phases[0];
                    const workflowResult = firstPhase.workflow();

                    // Handle both synchronous and asynchronous workflow results
                    const firstWorkflow = workflowResult instanceof Promise
                        ? await workflowResult
                        : workflowResult;

                    const signature = getWorkflowSignature(firstWorkflow);

                    // Check if all required inputs are provided
                    const missingInputs = signature.requiredInputs.filter(requiredInput => {
                        return !processedInputs.some(input =>
                            input.name.toString() === requiredInput.name.toString()
                        );
                    });

                    if (missingInputs.length > 0) {
                        const missingNames = missingInputs.map(input => input.name.toString()).join(', ');
                        throw new Error(`Missing required inputs for workflow: ${missingNames}`);
                    }
                } catch (error: unknown) {
                    console.error('Error validating workflow inputs:', error);
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Unknown validation error';
                    throw new Error(`Failed to validate workflow inputs: ${errorMessage}`);
                }
            }

            // Execute the workflow
            const result = await orchestrator.executeWorkflowChain(processedInputs, workflowChain, config);

            // Clean up the orchestrator after a delay
            setTimeout(() => {
                this.activeOrchestrators.delete(sessionId);
            }, 5000);

            return result;
        } catch (error) {
            console.error('Error executing workflow:', error);
            throw error;
        }
    }

    /**
     * Get the current status of a workflow
     * @param sessionId The session ID of the workflow
     * @returns The current status
     */
    getStatus(sessionId: string): OrchestrationStatus {
        const orchestrator = this.getOrchestrator(sessionId);
        return orchestrator.getStatus();
    }

    /**
     * Cancel a running workflow
     * @param sessionId The session ID of the workflow to cancel
     * @returns Promise resolving to true if canceled successfully
     */
    async cancelExecution(sessionId: string): Promise<boolean> {
        try {
            const orchestrator = this.getOrchestrator(sessionId);
            return await orchestrator.cancelExecution();
        } catch (error) {
            console.error('Error canceling workflow:', error);
            throw error;
        }
    }

    /**
     * Register a callback for status change events
     * @param callback Function to call when status changes
     */
    onStatusChange(callback: (event: StatusChangeEvent) => void): void {
        //this.eventEmitter.on(AgentWorkflowEventType.STATUS_CHANGE, callback);
        console.log('onStatusChange', callback);
    }

    /**
     * Register a callback for phase complete events
     * @param callback Function to call when a phase completes
     */
    onPhaseComplete(callback: (event: PhaseCompleteEvent) => void): void {
        //this.eventEmitter.on(AgentWorkflowEventType.PHASE_COMPLETE, callback);
        console.log('onPhaseComplete', callback);
    }

    /**
     * Register a callback for workflow complete events
     * @param callback Function to call when the workflow completes
     */
    onWorkflowComplete(callback: (event: WorkflowCompleteEvent) => void): void {
        //this.eventEmitter.on(AgentWorkflowEventType.WORKFLOW_COMPLETE, callback);
        console.log('onWorkflowComplete', callback);
    }

    /**
     * Register a callback for error events
     * @param callback Function to call when an error occurs
     */
    onError(callback: (event: ErrorEvent) => void): void {
        //this.eventEmitter.on(AgentWorkflowEventType.ERROR, callback);
        console.log('onError', callback);
    }

    /**
     * Remove a status change event listener
     * @param callback The callback to remove
     */
    offStatusChange(callback: (event: StatusChangeEvent) => void): void {
        //this.eventEmitter.removeListener(AgentWorkflowEventType.STATUS_CHANGE, callback);
        console.log('offStatusChange', callback);
    }

    /**
     * Remove a phase complete event listener
     * @param callback The callback to remove
     */
    offPhaseComplete(callback: (event: PhaseCompleteEvent) => void): void {
        //this.eventEmitter.removeListener(AgentWorkflowEventType.PHASE_COMPLETE, callback);
        console.log('offPhaseComplete', callback);
    }

    /**
     * Remove a workflow complete event listener
     * @param callback The callback to remove
     */
    offWorkflowComplete(callback: (event: WorkflowCompleteEvent) => void): void {
        //this.eventEmitter.removeListener(AgentWorkflowEventType.WORKFLOW_COMPLETE, callback);
        console.log('offWorkflowComplete', callback);
    }

    /**
     * Remove an error event listener
     * @param callback The callback to remove
     */
    offError(callback: (event: ErrorEvent) => void): void {
        // this.eventEmitter.removeListener(AgentWorkflowEventType.ERROR, callback);
        console.log('offError', callback);
    }

    /**
     * Get an orchestrator by session ID
     * @param sessionId The session ID
     * @returns The orchestrator
     * @throws Error if the orchestrator is not found
     */
    private getOrchestrator(sessionId: string): AgentWorkflowOrchestrator {
        const orchestrator = this.activeOrchestrators.get(sessionId);

        if (!orchestrator) {
            throw new Error(`No active workflow found with session ID: ${sessionId}`);
        }

        return orchestrator;
    }

    /**
     * Set up event listeners for an orchestrator
     * @param orchestrator The orchestrator to set up listeners for
     */
    private setupOrchestratorListeners(orchestrator: AgentWorkflowOrchestrator): void {
        // Set up status change listener
        orchestrator.onStatusChange((event) => {
            //this.eventEmitter.emit(AgentWorkflowEventType.STATUS_CHANGE, event);
            console.log('onStatusChange', event);
        });

        // Set up phase complete listener
        orchestrator.onPhaseComplete((event) => {
            //this.eventEmitter.emit(AgentWorkflowEventType.PHASE_COMPLETE, event);
            console.log('onPhaseComplete', event);
        });

        // Set up workflow complete listener
        orchestrator.onWorkflowComplete((event) => {
            //this.eventEmitter.emit(AgentWorkflowEventType.WORKFLOW_COMPLETE, event);
            console.log('onWorkflowComplete', event);
        });

        // Set up error listener
        orchestrator.onError((event) => {
            // this.eventEmitter.emit(AgentWorkflowEventType.ERROR, event);
            console.log('onError', event);
        });

        // Set up step status update listener
        const sessionId = orchestrator.getStatus().sessionId;
        const stepStatusCallback = (status: any) => {
            // Forward the step status update to all registered listeners
            this.stepStatusListeners.get(sessionId)?.forEach(callback => {
                callback(status);
            });
        };

        // Pass the step status callback to the orchestrator
        // We need to modify the AgentWorkflowOrchestrator to accept this callback
        // and pass it to the workflowEngine.runJob method
        (orchestrator as any).setStepStatusCallback?.(stepStatusCallback);
    }
} 
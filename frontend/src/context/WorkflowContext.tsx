import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    Workflow,
    StepExecutionResult,
    WorkflowStep
} from '../types';
import { workflowApi } from '../lib/api';
import { WorkflowEngine, WorkflowStateAction } from '../lib/workflow/workflowEngine';
import { createQuestionDevelopmentWorkflow } from '@/lib/workflow/agent/definitions/questionDevelopmentWorkflow';
import { createWorkflowFromTemplate } from '../types/workflow-templates';


interface WorkflowContextType {
    // Public State
    workflows: Workflow[]
    workflow: Workflow | null
    hasUnsavedChanges: boolean
    activeStep: number
    isExecuting: boolean
    stepExecuted: boolean
    stepRequestsInput: boolean
    isLoading: boolean
    error: string | null

    // User Operations
    loadWorkflows(): Promise<void>
    loadWorkflow(id: string): Promise<void>
    createWorkflow(templateId?: string): void
    saveWorkflow(): Promise<string | undefined>
    exitWorkflow(): void
    // New granular update method
    updateWorkflowByAction(action: WorkflowStateAction): void

    // legacy update methods
    updateWorkflowStep(step: WorkflowStep): void

    // Workflow Execution
    setActiveStep: (step: number) => void
    setStepExecuted: (executed: boolean) => void
    setStepRequestsInput: (requestsInput: boolean) => void
    executeCurrentStep(): Promise<StepExecutionResult>
    moveToNextStep(): void
    moveToPreviousStep(): void
    resetWorkflow(): void
    resetWorkflowState(): void

    zz_updateWorkflow(updates: Partial<Workflow>): void

}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Public State
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [isExecuting, setIsExecuting] = useState(false);
    const [stepExecuted, setStepExecuted] = useState(false);
    const [stepRequestsInput, setStepRequestsInput] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Add state to track original workflow
    const [originalWorkflow, setOriginalWorkflow] = useState<Workflow | null>(null);
    // Track workflow IDs that have failed to load to prevent infinite retry loops
    const [failedWorkflowIds] = useState<Set<string>>(new Set());

    // Persist workflow state in sessionStorage
    useEffect(() => {
        if (workflow) {
            sessionStorage.setItem('currentWorkflow', JSON.stringify(workflow));
            sessionStorage.setItem('hasUnsavedChanges', JSON.stringify(hasUnsavedChanges));
            sessionStorage.setItem('activeStep', JSON.stringify(activeStep));
            sessionStorage.setItem('originalWorkflow', JSON.stringify(originalWorkflow));
        }
    }, [workflow, hasUnsavedChanges, activeStep, originalWorkflow]);

    // Restore workflow state from sessionStorage
    useEffect(() => {
        const savedWorkflow = sessionStorage.getItem('currentWorkflow');
        const savedHasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges');
        const savedActiveStep = sessionStorage.getItem('activeStep');
        const savedOriginalWorkflow = sessionStorage.getItem('originalWorkflow');

        if (savedWorkflow) {
            setWorkflow(JSON.parse(savedWorkflow));
        }
        if (savedHasUnsavedChanges) {
            setHasUnsavedChanges(JSON.parse(savedHasUnsavedChanges));
        }
        if (savedActiveStep) {
            setActiveStep(JSON.parse(savedActiveStep));
        }
        if (savedOriginalWorkflow) {
            setOriginalWorkflow(JSON.parse(savedOriginalWorkflow));
        }
    }, []);

    // User Operations
    const createWorkflow = useCallback((templateId?: string) => {
        let newWorkflow: Workflow;

        if (templateId) {
            // Create from template if templateId is provided
            const templateWorkflow = createWorkflowFromTemplate(templateId);
            if (templateWorkflow) {
                newWorkflow = templateWorkflow;
            } else {
                // Fall back to empty workflow if template not found
                newWorkflow = WorkflowEngine.createNewWorkflow();
            }
        } else {
            // Create empty workflow if no templateId
            newWorkflow = WorkflowEngine.createNewWorkflow();
        }

        setWorkflow(newWorkflow);
        setHasUnsavedChanges(true);
        setActiveStep(0);
    }, []);

    const loadWorkflows = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const fetchedWorkflows = await workflowApi.getWorkflows();
            const questionDevelopmentWorkflow = createQuestionDevelopmentWorkflow();
            setWorkflows([...fetchedWorkflows, questionDevelopmentWorkflow]);
        } catch (err) {
            setError('Failed to load workflows');
            console.error('Error loading workflows:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadWorkflow = useCallback(async (id: string) => {
        console.log('loadWorkflow', id);


        if (id === 'question-development') {
            const questionDevelopmentWorkflow = createQuestionDevelopmentWorkflow();
            setWorkflow(questionDevelopmentWorkflow);
            setOriginalWorkflow(questionDevelopmentWorkflow);
            setHasUnsavedChanges(false);
            setActiveStep(0);
            return;
        }

        if (id === 'new') {
            createWorkflow();
            return;
        }

        // Skip if we're already loading
        if (isLoading) {
            console.log('Already loading');
            return;
        }

        // If we already have this workflow loaded and there are unsaved changes, don't reload
        if (workflow?.workflow_id === id) {
            console.log('Already loaded', workflow);
            return;
        }

        // Check if this workflow ID has already failed to load
        if (failedWorkflowIds.has(id)) {
            console.log('Workflow already failed to load, not retrying:', id);
            setError('Failed to load workflow');
            throw new Error('Workflow not found or access denied');
        }

        try {
            setIsLoading(true);
            setError(null);
            const baseWorkflow = await workflowApi.getWorkflow(id);

            // Convert to runtime workflow with state
            const runtimeWorkflow: Workflow = {
                ...baseWorkflow,
                state: baseWorkflow.state ?? []
            };

            setWorkflow(runtimeWorkflow);
            setOriginalWorkflow(runtimeWorkflow); // Store the original state
            setHasUnsavedChanges(false);
            setActiveStep(0);
        } catch (err) {
            setError('Failed to load workflow');
            console.error('Error loading workflow:', err);
            // Add this workflow ID to the failed set to prevent retries
            failedWorkflowIds.add(id);
            // Make sure to throw the error so it can be caught by the component
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [createWorkflow, isLoading, workflow?.workflow_id, failedWorkflowIds]);

    const updateWorkflowByAction = useCallback((action: WorkflowStateAction) => {
        setWorkflow(currentWorkflow => {
            if (!currentWorkflow) return null;

            const newWorkflow = WorkflowEngine.updateWorkflowByAction(currentWorkflow, action);

            // Set active step to the new step when adding a step
            if (action.type === 'ADD_STEP') {
                setActiveStep(newWorkflow.steps.length - 1);
            }
            // Adjust active step when deleting a step
            else if (action.type === 'DELETE_STEP' && action.payload.stepId) {
                const deletedStepIndex = currentWorkflow.steps.findIndex(s => s.step_id === action.payload.stepId);
                if (deletedStepIndex !== -1 && deletedStepIndex <= activeStep) {
                    setActiveStep(Math.max(0, activeStep - 1));
                }
            }

            // Compare with original workflow to determine if there are unsaved changes
            if (originalWorkflow) {
                const hasChanges = JSON.stringify(newWorkflow) !== JSON.stringify(originalWorkflow);
                setHasUnsavedChanges(hasChanges);
            } else {
                setHasUnsavedChanges(true);
            }

            return newWorkflow;
        });
    }, [originalWorkflow, activeStep]);

    const updateWorkflowStep = useCallback((step: WorkflowStep) => {
        console.log('updateWorkflowStep called with step:', step);
        if (!workflow) return;

        // Find the existing step to preserve tool information
        const existingStep = workflow.steps.find(s => s.step_id === step.step_id);
        console.log('Existing step:', existingStep);

        // Create updated step, properly handling tool clearing and evaluation config
        const updatedStep = {
            ...step,
            // Only preserve tool and tool_id if they weren't explicitly set to undefined
            tool: 'tool' in step ? step.tool : existingStep?.tool,
            tool_id: 'tool_id' in step ? step.tool_id : existingStep?.tool_id,
            // Only preserve prompt_template_id if the tool hasn't changed
            prompt_template_id: step.tool?.tool_id === existingStep?.tool_id ?
                (step.prompt_template_id ?? existingStep?.prompt_template_id) :
                step.prompt_template_id,
            parameter_mappings: {
                ...(existingStep?.parameter_mappings || {}),  // Keep existing mappings as base
                ...(step.parameter_mappings || {})  // Override with any new mappings
            },
            output_mappings: {
                ...(existingStep?.output_mappings || {}),  // Keep existing mappings as base
                ...(step.output_mappings || {})  // Override with any new mappings
            }
        };
        console.log('Updated step:', updatedStep);

        // DEPRECATED: This method is being phased out in favor of direct updateWorkflowByAction calls.
        console.warn('updateWorkflowStep is deprecated. Consider using updateWorkflowByAction directly.');

        updateWorkflowByAction({
            type: 'UPDATE_STEP',
            payload: {
                stepId: step.step_id,
                step: updatedStep
            }
        });
    }, [workflow, updateWorkflowByAction]);

    const saveWorkflow = useCallback(async () => {
        if (!workflow) return;

        try {
            setIsLoading(true);
            setError(null);

            const workflowData = {
                ...workflow,
                state: workflow.state ?? []
            };

            const savedWorkflow = workflow.workflow_id === 'new'
                ? await workflowApi.createWorkflow(workflowData)
                : await workflowApi.updateWorkflow(workflow.workflow_id, workflowData);

            setWorkflow(savedWorkflow);
            setOriginalWorkflow(savedWorkflow); // Update the original state after saving
            setHasUnsavedChanges(false);

            // If this was a new workflow, add it to the workflows collection
            if (workflow.workflow_id === 'new') {
                setWorkflows(prevWorkflows => {
                    // Make sure we don't add duplicates
                    const exists = prevWorkflows.some(w => w.workflow_id === savedWorkflow.workflow_id);
                    if (exists) {
                        return prevWorkflows.map(w =>
                            w.workflow_id === savedWorkflow.workflow_id ? savedWorkflow : w
                        );
                    }
                    return [...prevWorkflows, savedWorkflow];
                });
            } else {
                // If this was an update, update the workflow in the collection
                setWorkflows(prevWorkflows =>
                    prevWorkflows.map(w =>
                        w.workflow_id === savedWorkflow.workflow_id ? savedWorkflow : w
                    )
                );
            }

            // Return the saved workflow ID so the component can update the URL
            return savedWorkflow.workflow_id;
        } catch (error) {
            setError('Failed to save workflow');
            console.error('Error saving workflow:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [workflow]);

    const exitWorkflow = useCallback(() => {
        setWorkflow(null);
        setOriginalWorkflow(null); // Clear original workflow state
        setActiveStep(0);
        setHasUnsavedChanges(false);
        // Clear persisted state
        sessionStorage.removeItem('currentWorkflow');
        sessionStorage.removeItem('hasUnsavedChanges');
        sessionStorage.removeItem('activeStep');
        sessionStorage.removeItem('originalWorkflow');
    }, []);

    // HACK: clear the outputs of the current step  
    const clearClearStepOutputs = useCallback(() => {
        if (!workflow) return;
        const stepIndex = Math.max(0, activeStep);
        const step = workflow.steps[stepIndex];
        const updatedState = WorkflowEngine.clearStepOutputs(step, workflow);
        updateWorkflowByAction({ type: 'UPDATE_STATE', payload: { state: updatedState } });
    }, [workflow, activeStep, updateWorkflowByAction]);

    // Workflow Execution Methods
    const executeCurrentStep = useCallback(async (): Promise<StepExecutionResult> => {
        console.log('executeCurrentStep called');
        if (!workflow) {
            const errorMessage = 'No workflow loaded';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        }

        try {
            clearClearStepOutputs()
            setIsExecuting(true);
            setError(null);

            // Make sure we don't pass a negative index to executeStep
            const stepIndex = Math.max(0, activeStep);

            // Check if the step exists
            if (!workflow.steps[stepIndex]) {
                const errorMessage = `Step at index ${stepIndex} does not exist`;
                setError(errorMessage);
                return {
                    success: false,
                    error: errorMessage
                };
            }

            // Execute step using WorkflowEngine.executeStepSimple instead of executeStep
            const { updatedState, result, nextStepIndex } = await WorkflowEngine.executeStepSimple(workflow, stepIndex);
            console.log('executeCurrentStep result:', result);

            // Update the workflow state manually
            if (updatedState !== workflow.state) {
                updateWorkflowByAction({
                    type: 'UPDATE_WORKFLOW',
                    payload: {
                        workflowUpdates: {
                            state: updatedState,
                            steps: workflow.steps,
                            nextStepIndex: nextStepIndex // Store the next step index
                        }
                    }
                });
            }

            // Track UI execution state
            setStepExecuted(true);

            // If the execution failed, set the error state
            if (!result.success && result.error) {
                // Check for LLM JSON parsing errors and provide a more helpful message
                if (result.error.includes('LLM response was not valid JSON')) {
                    const friendlyError = 'The AI returned a response in an invalid format. This usually happens when the AI doesn\'t follow the required JSON structure. Try running the step again or adjusting the prompt to emphasize the need for valid JSON output.';
                    setError(friendlyError);
                    return {
                        success: false,
                        error: friendlyError,
                        outputs: result.outputs
                    };
                }

                setError(result.error);
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error
                ? `Error executing step: ${error.message}`
                : 'Unknown error occurred during step execution';
            console.error(errorMessage, error);
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setIsExecuting(false);
        }
    }, [workflow, activeStep, updateWorkflowByAction, setStepExecuted, setError, setIsExecuting, clearClearStepOutputs]);

    const moveToNextStep = useCallback(() => {
        if (!workflow) return;

        // Use the stored nextStepIndex if available, otherwise just go to the next sequential step
        if (workflow.nextStepIndex !== undefined) {
            setActiveStep(workflow.nextStepIndex);
        } else {
            setActiveStep(prevStep => prevStep + 1);
        }

        // Clear the nextStepIndex after using it
        updateWorkflowByAction({
            type: 'UPDATE_WORKFLOW',
            payload: {
                workflowUpdates: {
                    nextStepIndex: undefined
                }
            }
        });

        setStepExecuted(false);
    }, [workflow, updateWorkflowByAction]);

    const moveToPreviousStep = useCallback(() => {
        setActiveStep(Math.max(0, activeStep - 1));
        setStepExecuted(false);
    }, [activeStep]);

    const resetWorkflow = useCallback(() => {
        if (!workflow?.state) return;

        // Use the new RESET_WORKFLOW_STATE action to reset workflow state
        // This will clear all values and remove evaluation results
        updateWorkflowByAction({
            type: 'RESET_WORKFLOW_STATE',
            payload: {
                keepEvaluationResults: false
            }
        });

        setActiveStep(0);
        setStepExecuted(false);
        setStepRequestsInput(true);
    }, [workflow, updateWorkflowByAction]);

    // Reset workflow state without changing the active step
    // This is used when switching to run mode to allow running from any step
    const resetWorkflowState = useCallback(() => {
        if (!workflow?.state) return;

        // Use the new RESET_WORKFLOW_STATE action to reset workflow state
        // This will clear all values and remove evaluation results
        updateWorkflowByAction({
            type: 'RESET_WORKFLOW_STATE',
            payload: {
                keepEvaluationResults: false
            }
        });

        setStepExecuted(false);
        setStepRequestsInput(true);
    }, [workflow, updateWorkflowByAction]);

    const zz_updateWorkflow = useCallback((updates: Partial<Workflow>) => {
        if (!workflow) return;

        // DEPRECATED: This method is being phased out in favor of updateWorkflowByAction.
        // Use updateWorkflowByAction with the UPDATE_WORKFLOW action type instead.
        console.warn('updateWorkflow is deprecated. Use updateWorkflowByAction with UPDATE_WORKFLOW action type instead.');

        updateWorkflowByAction({
            type: 'UPDATE_WORKFLOW',
            payload: {
                workflowUpdates: updates
            }
        });
    }, [workflow, updateWorkflowByAction]);

    // Initial load
    useEffect(() => {
        loadWorkflows();
    }, [loadWorkflows]);

    const value: WorkflowContextType = {
        // Public State
        workflows,
        workflow,
        hasUnsavedChanges,
        activeStep,
        isExecuting,
        stepExecuted,
        stepRequestsInput,
        isLoading,
        error,

        // Setters
        setActiveStep,
        setStepExecuted,
        setStepRequestsInput,


        // Workflow Operations
        createWorkflow,
        loadWorkflow,
        loadWorkflows,
        updateWorkflowStep,
        saveWorkflow,
        exitWorkflow,
        updateWorkflowByAction,

        // Workflow Execution
        executeCurrentStep,
        moveToNextStep,
        moveToPreviousStep,
        resetWorkflow,
        resetWorkflowState,

        zz_updateWorkflow
    };

    return (
        <WorkflowContext.Provider value={value}>
            {children}
        </WorkflowContext.Provider>
    );
};

export const useWorkflows = (): WorkflowContextType => {
    const context = useContext(WorkflowContext);
    if (context === undefined) {
        throw new Error('useWorkflows must be used within a WorkflowProvider');
    }
    return context;
}; 
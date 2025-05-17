import React, { useState, useEffect, useRef } from 'react';
import {
    AgentWorkflowOrchestrator,
    AgentWorkflowConfig,
    StatusChangeEvent,
    PhaseCompleteEvent,
    WorkflowCompleteEvent,
    AgentWorkflowEventType,
    OrchestrationStatus
} from '../../lib/workflow/agent/AgentWorkflowOrchestrator';
import { AgentWorkflowEngine } from '../../lib/workflow/agent/AgentWorkflowEngine';
import AgentWorkflowStatusDisplay, { AgentWorkflowStatusDisplayRef } from './AgentWorkflowStatusDisplay';
import {
    AgentWorkflowChain,
    SAMPLE_WORKFLOW_CHAIN
} from '../../types/agent-workflows';
import {
    WorkflowVariable,
    WorkflowVariableRole
} from '../../types/workflows';

// Use a different name to avoid conflict with the DOM ErrorEvent
interface WorkflowErrorEvent {
    type: AgentWorkflowEventType.ERROR;
    sessionId: string;
    timestamp: string;
    error: string;
}

/**
 * Interface for the agent workflow orchestrator
 */
interface AgentWorkflowOrchestratorInterface {
    executeWorkflowChain(
        inputValues: WorkflowVariable[],
        workflowChain: AgentWorkflowChain,
        config?: AgentWorkflowConfig
    ): Promise<string>;
    getStatus(): OrchestrationStatus;
    cancelExecution(): Promise<boolean>;
    onStatusChange(callback: (event: StatusChangeEvent) => void): void;
    onPhaseComplete(callback: (event: PhaseCompleteEvent) => void): void;
    onWorkflowComplete(callback: (event: WorkflowCompleteEvent) => void): void;
    onError(callback: (event: WorkflowErrorEvent) => void): void;
    setStepStatusCallback(callback: (status: any) => void): void;
}

/**
 * Test component for the AgentWorkflowOrchestrator
 */
const AgentWorkflowOrchestratorTest: React.FC = () => {

    // Replace single question with dynamic input values
    const [inputValues, setInputValues] = useState<Record<string, any>>({});
    const [finalAnswer, setFinalAnswer] = useState<string>('');

    const [workflowChain, setWorkflowChain] = useState<AgentWorkflowChain>(SAMPLE_WORKFLOW_CHAIN);
    // Rename workflowState to orchestrationResult to avoid confusion with workflowChain.state
    const [orchestrationResult, setOrchestrationResult] = useState<{
        finalAnswer?: string;
        status?: OrchestrationStatus;
        phaseResults?: Record<string, any>;
        timestamp?: string;
        sessionId?: string;
        workflowChain?: AgentWorkflowChain;
        error?: string;
    } | null>(null);

    const [status, setStatus] = useState<OrchestrationStatus | null>(null);
    const [stepStatus, setStepStatus] = useState<any | null>(null);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const [selectedStatus, setSelectedStatus] = useState<OrchestrationStatus | any | null>(null);
    const [selectedStatusIndex, setSelectedStatusIndex] = useState<number | undefined>(undefined);
    const [showInput, setShowInput] = useState<boolean>(true);

    const orchestratorRef = useRef<AgentWorkflowOrchestratorInterface | null>(null);
    const statusDisplayRef = useRef<AgentWorkflowStatusDisplayRef>(null);

    // Initialize the orchestrator if it doesn't exist
    if (!orchestratorRef.current) {
        const workflowEngine = new AgentWorkflowEngine();
        // Cast to the interface to avoid type errors
        orchestratorRef.current = new AgentWorkflowOrchestrator(workflowEngine) as unknown as AgentWorkflowOrchestratorInterface;

        // Set the step status callback
        if (orchestratorRef.current) {
            orchestratorRef.current.setStepStatusCallback((status) => {
                setStepStatus(status);
            });
        }
    }

    // Get the orchestrator from the ref
    const orchestrator = orchestratorRef.current;

    // Handle status selection
    const handleSelectStatus = (status: any, index: number) => {
        setSelectedStatus(status);
        setSelectedStatusIndex(index);
    };

    // Process new status updates
    useEffect(() => {
        if (status || stepStatus) {
            const currentStatus = status || stepStatus;
            setSelectedStatus(currentStatus);

            // Update the selected index to the last one after a short delay
            // to ensure the status messages array has been updated
            setTimeout(() => {
                if (statusDisplayRef.current) {
                    const messages = statusDisplayRef.current.getMessages();
                    setSelectedStatusIndex(messages.length - 1);
                }
            }, 50);
        }
    }, [status, stepStatus]);

    // Handle status change events
    const handleStatusChange = (event: StatusChangeEvent) => {
        setStatus(event.status);

        // Update running state based on status
        if (event.status.currentPhase === 'completed' || event.status.currentPhase === 'failed') {
            setIsRunning(false);
        }

        // Update error state
        if (event.status.currentPhase === 'failed' && event.status.error) {
            setError(event.status.error);
        }
    };

    // Handle phase complete events
    const handlePhaseComplete = (event: PhaseCompleteEvent) => {
        console.log(`Phase ${event.phase} completed with result:`, event.result);

        // Update the workflow chain state with the phase results
        if (orchestrator && event.result) {
            try {
                // Create a proper clone of the current workflow chain
                let updatedChain = {
                    ...workflowChain,
                    // Ensure we have a proper state array
                    state: workflowChain.state && Array.isArray(workflowChain.state)
                        ? [...workflowChain.state]  // Create a new array to avoid modifying the original
                        : SAMPLE_WORKFLOW_CHAIN.state && Array.isArray(SAMPLE_WORKFLOW_CHAIN.state)
                            ? [...SAMPLE_WORKFLOW_CHAIN.state]  // Use the sample as fallback
                            : []  // Empty array as last resort
                };

                console.log(`Current workflowChain state in phase complete (${event.phase}):`, workflowChain.state);

                // Find the phase in the workflow chain
                const phase = workflowChain.phases.find(p => p.id === event.phase);
                if (phase && updatedChain.state && Array.isArray(updatedChain.state)) {
                    console.log(`Updating state with results from phase ${event.phase}:`, event.result);

                    // For each output mapping in this phase
                    Object.entries(phase.outputs_mappings).forEach(([workflowVar, chainVar]) => {
                        // Find the corresponding variable in the state array
                        const stateVarIndex = updatedChain.state.findIndex((v: any) =>
                            v.name === chainVar.toString());

                        if (stateVarIndex !== -1) {
                            // Get the value from the phase result using the workflow variable name
                            const value = event.result[workflowVar];
                            if (value !== undefined) {
                                console.log(`Updating ${chainVar} with value from phase ${event.phase}`);
                                // Update the variable in the state array
                                updatedChain.state[stateVarIndex] = {
                                    ...updatedChain.state[stateVarIndex],
                                    value: value
                                };
                            }
                        }
                    });

                    console.log(`Workflow chain state after updates in phase complete (${event.phase}):`, updatedChain.state);

                    // Update the workflowChain state
                    setWorkflowChain(updatedChain);
                }
            } catch (e) {
                console.error(`Error updating workflow chain state in phase complete (${event.phase}):`, e);
            }
        }
    };

    // Handle workflow complete events
    const handleWorkflowComplete = (event: WorkflowCompleteEvent) => {
        console.log("WorkflowComplete event received:", event);
        setFinalAnswer(event.finalAnswer);

        // Capture the complete orchestration result
        if (orchestrator) {
            try {
                const currentStatus = orchestrator.getStatus();
                console.log("Current status from orchestrator:", currentStatus);
                console.log("Current status results:", currentStatus.results);

                // Create a proper clone of the current workflow chain
                let updatedChain = {
                    ...workflowChain,
                    // Ensure we have a proper state array
                    state: workflowChain.state && Array.isArray(workflowChain.state)
                        ? [...workflowChain.state]  // Create a new array to avoid modifying the original
                        : SAMPLE_WORKFLOW_CHAIN.state && Array.isArray(SAMPLE_WORKFLOW_CHAIN.state)
                            ? [...SAMPLE_WORKFLOW_CHAIN.state]  // Use the sample as fallback
                            : []  // Empty array as last resort
                };

                console.log("Current workflowChain state:", workflowChain.state);
                console.log("Updated chain state before mapping:", updatedChain.state);

                // Get the phase results from the orchestrator status
                const phaseResults = currentStatus.results || {};
                console.log("Phase results from orchestrator:", phaseResults);

                // Update all variables in the state array with values from phase results
                if (updatedChain.state && Array.isArray(updatedChain.state)) {
                    // First, update the final answer
                    updatedChain.state = updatedChain.state.map((variable: any) => {
                        if (variable.name === 'wfc_final_answer') {
                            return {
                                ...variable,
                                value: event.finalAnswer
                            };
                        }
                        return variable;
                    });

                    // Then update all other variables from phase results
                    // For each phase in the workflow chain
                    workflowChain.phases.forEach(phase => {
                        // Get the results for this phase
                        const phaseResult = phaseResults[phase.id];
                        if (phaseResult) {
                            console.log(`Updating state with results from phase ${phase.id}:`, phaseResult);

                            // For each output mapping in this phase
                            Object.entries(phase.outputs_mappings).forEach(([workflowVar, chainVar]) => {
                                // Find the corresponding variable in the state array
                                const stateVarIndex = updatedChain.state.findIndex((v: any) =>
                                    v.name === chainVar.toString());

                                if (stateVarIndex !== -1) {
                                    // Get the value from the phase result
                                    const value = phaseResult[workflowVar];
                                    if (value !== undefined) {
                                        console.log(`Updating ${chainVar} with value from phase ${phase.id}`);
                                        // Update the variable in the state array
                                        updatedChain.state[stateVarIndex] = {
                                            ...updatedChain.state[stateVarIndex],
                                            value: value
                                        };
                                    }
                                }
                            });
                        }
                    });
                }

                console.log("Workflow chain state after updates:", updatedChain.state);

                // Update the workflowChain state
                setWorkflowChain(updatedChain);

                // Create a properly structured orchestration result object
                const newOrchestrationResult = {
                    finalAnswer: event.finalAnswer,
                    status: currentStatus,
                    phaseResults: currentStatus.results || {},
                    timestamp: event.timestamp,
                    sessionId: event.sessionId,
                    workflowChain: updatedChain
                };

                // Update the orchestration result
                setOrchestrationResult(newOrchestrationResult);

                // Log the orchestration result to console for debugging
                console.log("Workflow completed with result:", newOrchestrationResult);
            } catch (e) {
                console.error("Error capturing orchestration result:", e);

                // Create a fallback state with the sample workflow chain
                const fallbackChain = {
                    ...SAMPLE_WORKFLOW_CHAIN,
                    state: SAMPLE_WORKFLOW_CHAIN.state && Array.isArray(SAMPLE_WORKFLOW_CHAIN.state)
                        ? SAMPLE_WORKFLOW_CHAIN.state.map((variable: any) => {
                            if (variable.name === 'wfc_final_answer') {
                                return {
                                    ...variable,
                                    value: event.finalAnswer
                                };
                            }
                            return {
                                ...variable,
                                value: variable.value || ''
                            };
                        })
                        : []
                };

                // Update the workflowChain state with the fallback
                setWorkflowChain(fallbackChain);

                // Create a properly structured fallback orchestration result
                const fallbackOrchestrationResult = {
                    error: "Error capturing orchestration result",
                    finalAnswer: event.finalAnswer,
                    timestamp: event.timestamp,
                    sessionId: event.sessionId,
                    workflowChain: fallbackChain
                };

                setOrchestrationResult(fallbackOrchestrationResult);
            }
        }
    };

    // Handle error events
    const handleError = (event: WorkflowErrorEvent) => {
        setError(event.error);
        setIsRunning(false);

        // Capture the orchestration result even in case of error
        if (orchestrator) {
            try {
                const currentStatus = orchestrator.getStatus();

                // Create a proper clone of the current workflow chain
                let updatedChain = {
                    ...workflowChain,
                    // Ensure we have a proper state array
                    state: workflowChain.state && Array.isArray(workflowChain.state)
                        ? [...workflowChain.state]  // Create a new array to avoid modifying the original
                        : SAMPLE_WORKFLOW_CHAIN.state && Array.isArray(SAMPLE_WORKFLOW_CHAIN.state)
                            ? [...SAMPLE_WORKFLOW_CHAIN.state]  // Use the sample as fallback
                            : []  // Empty array as last resort
                };

                console.log("Workflow chain state in error handler:", updatedChain.state);

                // Get the phase results from the orchestrator status
                const phaseResults = currentStatus.results || {};
                console.log("Phase results from orchestrator in error handler:", phaseResults);

                // Update variables in the state array with values from phase results
                if (updatedChain.state && Array.isArray(updatedChain.state)) {
                    // For each phase in the workflow chain
                    workflowChain.phases.forEach(phase => {
                        // Get the results for this phase
                        const phaseResult = phaseResults[phase.id];
                        if (phaseResult) {
                            console.log(`Updating state with results from phase ${phase.id} in error handler:`, phaseResult);

                            // For each output mapping in this phase
                            Object.entries(phase.outputs_mappings).forEach(([workflowVar, chainVar]) => {
                                // Find the corresponding variable in the state array
                                const stateVarIndex = updatedChain.state.findIndex((v: any) =>
                                    v.name === chainVar.toString());

                                if (stateVarIndex !== -1) {
                                    // Get the value from the phase result
                                    const value = phaseResult[workflowVar];
                                    if (value !== undefined) {
                                        console.log(`Updating ${chainVar} with value from phase ${phase.id} in error handler`);
                                        // Update the variable in the state array
                                        updatedChain.state[stateVarIndex] = {
                                            ...updatedChain.state[stateVarIndex],
                                            value: value
                                        };
                                    }
                                }
                            });
                        }
                    });
                }

                console.log("Workflow chain state after updates in error handler:", updatedChain.state);

                // Update the workflowChain state
                setWorkflowChain(updatedChain);

                // Create a properly structured error orchestration result
                const errorOrchestrationResult = {
                    error: event.error,
                    status: currentStatus,
                    timestamp: event.timestamp,
                    sessionId: event.sessionId,
                    workflowChain: updatedChain
                };

                setOrchestrationResult(errorOrchestrationResult);
            } catch (e) {
                console.error("Error capturing orchestration result in error handler:", e);

                // Create a fallback state with the sample workflow chain
                const fallbackChain = {
                    ...SAMPLE_WORKFLOW_CHAIN,
                    state: SAMPLE_WORKFLOW_CHAIN.state && Array.isArray(SAMPLE_WORKFLOW_CHAIN.state)
                        ? SAMPLE_WORKFLOW_CHAIN.state.map((variable: any) => ({
                            ...variable,
                            value: variable.value || ''
                        }))
                        : []
                };

                // Update the workflowChain state with the fallback
                setWorkflowChain(fallbackChain);

                // Create a properly structured fallback error orchestration result
                const fallbackErrorOrchestrationResult = {
                    error: event.error,
                    timestamp: event.timestamp,
                    sessionId: event.sessionId,
                    workflowChain: fallbackChain
                };

                setOrchestrationResult(fallbackErrorOrchestrationResult);
            }
        }
    };

    // Set up event listeners when the component mounts
    useEffect(() => {
        if (orchestrator) {
            orchestrator.onStatusChange(handleStatusChange);
            orchestrator.onPhaseComplete(handlePhaseComplete);
            orchestrator.onWorkflowComplete(handleWorkflowComplete);
            orchestrator.onError(handleError);
        }

        // Clean up event listeners when the component unmounts
        return () => {
            // Note: In a real implementation, we would need to remove the event listeners
            // but the current interface doesn't provide methods for that
        };
    }, [orchestrator]);

    // Handle input change for any input field
    const handleInputChange = (name: string, value: any, type: string = 'string') => {
        // Convert value based on type
        let processedValue = value;

        try {
            if (type === 'number') {
                processedValue = value === '' ? '' : Number(value);
                if (isNaN(processedValue) && value !== '') {
                    setValidationErrors(prev => ({
                        ...prev,
                        [name]: 'Please enter a valid number'
                    }));
                    return;
                }
            } else if (type === 'boolean') {
                processedValue = value === 'true';
            } else if (type === 'object' && typeof value === 'string') {
                try {
                    processedValue = value.trim() ? JSON.parse(value) : {};
                } catch (e) {
                    setValidationErrors(prev => ({
                        ...prev,
                        [name]: 'Please enter valid JSON'
                    }));
                    return;
                }
            }

            // Clear validation error if value is valid
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });

            // Update input values
            setInputValues(prev => ({
                ...prev,
                [name]: processedValue
            }));
        } catch (e) {
            console.error(`Error processing input for ${name}:`, e);
            setValidationErrors(prev => ({
                ...prev,
                [name]: 'Invalid input value'
            }));
        }
    };

    // Validate all inputs
    const isValidInputs = (): boolean => {
        if (!workflowChain || !Array.isArray(workflowChain.state)) {
            return false;
        }

        // Get all required input variables
        const requiredInputs = workflowChain.state.filter(
            variable => variable.io_type === 'input' && variable.required
        );

        // Check if all required inputs have values
        const missingInputs: Record<string, string> = {};
        let isValid = true;

        requiredInputs.forEach(variable => {
            const name = variable.name as string;
            if (inputValues[name] === undefined || inputValues[name] === '') {
                missingInputs[name] = `${name} is required`;
                isValid = false;
            }
        });

        // Update validation errors
        setValidationErrors(missingInputs);
        return isValid;
    };

    // Initialize input values when workflow chain changes
    useEffect(() => {
        if (workflowChain && Array.isArray(workflowChain.state)) {
            const initialInputs: Record<string, any> = {};

            // Get all input variables
            const inputVariables = workflowChain.state.filter(
                variable => variable.io_type === 'input'
            );

            // Initialize input values with existing values or defaults
            inputVariables.forEach(variable => {
                const name = variable.name as string;
                initialInputs[name] = variable.value !== undefined ? variable.value : '';
            });

            // Update input values
            setInputValues(initialInputs);
        }
    }, [workflowChain]);

    // Start the workflow
    const startWorkflow = async () => {
        if (!isValidInputs()) {
            setError('Please fill in all required inputs');
            return;
        }

        if (!orchestrator) {
            setError('Orchestrator not initialized');
            return;
        }

        try {
            // Reset state
            setError(null);
            setIsRunning(true);
            setFinalAnswer('');
            setStatus(null);
            setStepStatus(null);
            setSelectedStatus(null);
            setSelectedStatusIndex(undefined);
            setShowInput(false); // Hide the input form

            // Create a shallow clone of the workflow chain but preserve the workflow functions
            const workflowChainToUse = {
                ...SAMPLE_WORKFLOW_CHAIN,
                // Clone the phases array but keep the workflow functions
                phases: SAMPLE_WORKFLOW_CHAIN.phases.map(phase => ({
                    ...phase,
                    // Keep the original workflow function
                    workflow: phase.workflow
                })),
                // PRESERVE THE ORIGINAL STATE STRUCTURE - just initialize values
                state: SAMPLE_WORKFLOW_CHAIN.state
            };

            // Initialize values in the state
            if (Array.isArray(workflowChainToUse.state)) {
                workflowChainToUse.state.forEach(variable => {
                    // Initialize input variables with empty strings, leave outputs undefined
                    if (variable.io_type === 'input') {
                        const name = variable.name as string;
                        variable.value = inputValues[name] !== undefined ? inputValues[name] : '';
                    } else {
                        variable.value = undefined;
                    }
                });
            }

            setWorkflowChain(workflowChainToUse);

            // Also set the orchestrationResult directly to ensure the UI can display the variables
            const initialOrchestrationResult = {
                workflowChain: workflowChainToUse,
                // Add initial status information
                status: {
                    sessionId: "new-session",
                    currentPhase: "starting",
                    progress: 0,
                    startTime: new Date().toISOString()
                },
                timestamp: new Date().toISOString(),
                sessionId: "new-session"
            };

            setOrchestrationResult(initialOrchestrationResult);

            // Clear previous status messages
            if (statusDisplayRef.current) {
                statusDisplayRef.current.clearMessages();
            }

            // Create input variables from all input values
            const inputVariables: WorkflowVariable[] = Object.entries(inputValues).map(([name, value]) => {
                // Find the variable in the workflow chain state to get its schema and other properties
                const variable = workflowChainToUse.state && Array.isArray(workflowChainToUse.state)
                    ? workflowChainToUse.state.find((v: any) => v.name === name)
                    : undefined;

                return {
                    variable_id: name,
                    name: name as any,
                    value: value,
                    schema: variable?.schema || {
                        type: typeof value as any,
                        description: `Input ${name}`,
                        is_array: Array.isArray(value)
                    },
                    io_type: 'input',
                    required: variable?.required || false,
                    variable_role: variable?.variable_role || WorkflowVariableRole.USER_INPUT
                };
            });

            // Update all input variables in the workflow chain state
            if (workflowChainToUse.state && Array.isArray(workflowChainToUse.state)) {
                Object.entries(inputValues).forEach(([name, value]) => {
                    const variable = workflowChainToUse.state && workflowChainToUse.state.find((v: any) => v.name === name);
                    if (variable) {
                        variable.value = value;
                    }
                });
            }

            console.log("Starting workflow with chain:", workflowChainToUse);
            console.log("Input variables:", inputVariables);

            // Start the workflow
            await orchestrator.executeWorkflowChain(inputVariables, workflowChainToUse);
        } catch (error) {
            console.error('Error starting workflow:', error);
            setError('Failed to start workflow');
            setIsRunning(false);
        }
    };

    // Cancel the workflow
    const cancelWorkflow = async () => {
        if (!orchestrator) {
            return;
        }

        try {
            await orchestrator.cancelExecution();
            setIsRunning(false);
        } catch (error) {
            console.error('Error cancelling workflow:', error);
        }
    };

    // Restart the workflow
    const restartWorkflow = () => {
        // Reset all input values
        setInputValues({});
        setFinalAnswer('');
        setStatus(null);
        setStepStatus(null);
        setSelectedStatus(null);
        setSelectedStatusIndex(undefined);
        setError(null);
        setValidationErrors({});
        setOrchestrationResult(null);

        // Create a fresh clone of the workflow chain
        const freshWorkflowChain = {
            ...SAMPLE_WORKFLOW_CHAIN,
            // Clone the phases array but keep the workflow functions
            phases: SAMPLE_WORKFLOW_CHAIN.phases.map(phase => ({
                ...phase,
                // Keep the original workflow function
                workflow: phase.workflow
            })),
            // PRESERVE THE ORIGINAL STATE STRUCTURE - just reset values
            state: SAMPLE_WORKFLOW_CHAIN.state
        };

        // Reset values in the state
        if (Array.isArray(freshWorkflowChain.state)) {
            freshWorkflowChain.state.forEach(variable => {
                // Reset all values
                variable.value = '';
            });
        }

        // Reset the workflow chain to the initial state
        setWorkflowChain(freshWorkflowChain);

        setShowInput(true); // Show the input form

        // Clear previous status messages
        if (statusDisplayRef.current) {
            statusDisplayRef.current.clearMessages();
        }
    };

    // Debug effect for workflow variables rendering
    useEffect(() => {
        console.log("Rendering workflow variables section");
        console.log("orchestrationResult:", orchestrationResult);
        console.log("orchestrationResult?.workflowChain:", orchestrationResult?.workflowChain);

        // Check if orchestrationResult.workflowChain.state exists and is an array
        if (orchestrationResult?.workflowChain?.state && Array.isArray(orchestrationResult.workflowChain.state)) {
            console.log("orchestrationResult.workflowChain.state is an array with length:",
                orchestrationResult.workflowChain.state.length);
        } else {
            console.log("orchestrationResult.workflowChain.state is not an array or is undefined");
        }
    }, [orchestrationResult]);

    // Log initial workflowChain state
    useEffect(() => {
        console.log("Initial SAMPLE_WORKFLOW_CHAIN:", SAMPLE_WORKFLOW_CHAIN);
        console.log("Initial workflowChain:", workflowChain);
        console.log("Initial workflowChain.state:", workflowChain.state);
        console.log("Is initial state array:", Array.isArray(workflowChain.state));

        // Check if state variables are properly defined
        if (Array.isArray(workflowChain.state)) {
            console.log("Number of state variables:", workflowChain.state.length);
            console.log("State variable names:", workflowChain.state.map(v => v.name));
        }
    }, []);

    return (
        <div>
            {/* 1. Workflow Chain Input at the top */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    Workflow Chain Input
                </h3>

                {showInput ? (
                    <>
                        {/* Dynamic Input Fields */}
                        {workflowChain && Array.isArray(workflowChain.state) && (
                            <div className="space-y-4">
                                {workflowChain.state
                                    .filter(variable => variable.io_type === 'input')
                                    .map((variable, index) => {
                                        const name = variable.name as string;
                                        const type = variable.schema?.type || 'string';
                                        const isArray = variable.schema?.is_array || false;
                                        const description = variable.schema?.description || '';
                                        const required = variable.required || false;

                                        return (
                                            <div key={index} className="mb-4">
                                                <label
                                                    htmlFor={`input-${name}`}
                                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                                >
                                                    {name}
                                                    {required && <span className="text-red-500 ml-1">*</span>}
                                                </label>

                                                {description && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        {description}
                                                    </p>
                                                )}

                                                {/* Render different input types based on schema */}
                                                {type === 'boolean' ? (
                                                    <select
                                                        id={`input-${name}`}
                                                        value={inputValues[name] === true ? 'true' : 'false'}
                                                        onChange={(e) => handleInputChange(name, e.target.value, 'boolean')}
                                                        disabled={isRunning}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                                                    >
                                                        <option value="true">True</option>
                                                        <option value="false">False</option>
                                                    </select>
                                                ) : type === 'number' ? (
                                                    <input
                                                        id={`input-${name}`}
                                                        type="number"
                                                        value={inputValues[name] !== undefined ? inputValues[name] : ''}
                                                        onChange={(e) => handleInputChange(name, e.target.value, 'number')}
                                                        placeholder={`Enter ${name}...`}
                                                        disabled={isRunning}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                                                    />
                                                ) : type === 'object' ? (
                                                    <textarea
                                                        id={`input-${name}`}
                                                        value={typeof inputValues[name] === 'object'
                                                            ? JSON.stringify(inputValues[name], null, 2)
                                                            : inputValues[name] || ''}
                                                        onChange={(e) => handleInputChange(name, e.target.value, 'object')}
                                                        placeholder={`Enter JSON for ${name}...`}
                                                        disabled={isRunning}
                                                        rows={5}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed font-mono text-sm"
                                                    />
                                                ) : (
                                                    <textarea
                                                        id={`input-${name}`}
                                                        value={inputValues[name] !== undefined ? inputValues[name] : ''}
                                                        onChange={(e) => handleInputChange(name, e.target.value)}
                                                        placeholder={`Enter ${name}...`}
                                                        disabled={isRunning}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                                                    />
                                                )}

                                                {validationErrors[name] && (
                                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                                        {validationErrors[name]}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={startWorkflow}
                                disabled={isRunning || Object.keys(validationErrors).length > 0}
                                className="px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Submit
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-4">
                            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                Input Values:
                            </h4>
                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                                {Object.entries(inputValues).map(([name, value], index) => (
                                    <div key={index} className="mb-2">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{name}: </span>
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {typeof value === 'object'
                                                ? JSON.stringify(value)
                                                : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {isRunning ? (
                                <button
                                    onClick={cancelWorkflow}
                                    className="px-4 py-2 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 transition-colors"
                                >
                                    Cancel Workflow
                                </button>
                            ) : (
                                <button
                                    onClick={restartWorkflow}
                                    className="px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
                                >
                                    Restart Workflow
                                </button>
                            )}
                        </div>
                    </>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                        {error}
                    </div>
                )}
            </div>

            {/* 2. Workflow Chain Variables - always visible, fixed size */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Workflow Variables</h3>
                <div className="overflow-x-auto" style={{ height: '300px', overflowY: 'auto' }}>
                    {/* Use orchestrationResult.workflowChain.state if available, otherwise fall back to workflowChain.state */}
                    {((orchestrationResult?.workflowChain?.state && Array.isArray(orchestrationResult.workflowChain.state)) ||
                        (workflowChain?.state && Array.isArray(workflowChain.state))) ? (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Variable Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {/* Use orchestrationResult.workflowChain.state if available, otherwise fall back to workflowChain.state */}
                                {(orchestrationResult?.workflowChain?.state && Array.isArray(orchestrationResult.workflowChain.state)
                                    ? orchestrationResult.workflowChain.state
                                    : (workflowChain?.state || [])).map((variable: any, index: number) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                                                {variable.name || 'Unnamed'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {variable.schema?.type || 'unknown'}{variable.schema?.is_array ? '[]' : ''}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {variable.variable_role || variable.io_type || 'unknown'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="max-h-32 overflow-y-auto">
                                                    <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                                        {(() => {
                                                            try {
                                                                return typeof variable.value === 'object'
                                                                    ? JSON.stringify(variable.value, null, 2)
                                                                    : String(variable.value || '');
                                                            } catch (e) {
                                                                return '[Error displaying value]';
                                                            }
                                                        })()}
                                                    </pre>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            <p>Workflow variables will appear here when available.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Status Logs with Detail - side by side layout */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Updates */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Status Updates</h3>
                    <div style={{ height: '400px' }}>
                        <AgentWorkflowStatusDisplay
                            ref={statusDisplayRef}
                            status={status as any}
                            stepStatus={stepStatus}
                            onSelectStatus={handleSelectStatus}
                            selectedIndex={selectedStatusIndex}
                            maxHeight="350px"
                        />
                    </div>
                </div>

                {/* Selected Status Details */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Selected Status Details</h3>
                    <div className="overflow-auto" style={{ height: '350px' }}>
                        {selectedStatus ? (
                            <pre className="whitespace-pre-wrap p-4 bg-gray-100 dark:bg-gray-900 rounded text-gray-800 dark:text-gray-200 text-sm h-full">
                                {JSON.stringify(selectedStatus, null, 2)}
                            </pre>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                Select a status update to view details
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Final Answer (if available) */}
            {finalAnswer && (
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        Final Answer
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{finalAnswer}</p>
                    </div>
                </div>
            )}

            {/* 4. Complete Orchestration Result Summary */}
            {orchestrationResult && !isRunning && (
                <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Complete Orchestration Result</h3>
                    <div className="mb-2 flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Session ID: {orchestrationResult.sessionId || 'N/A'}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Completed at: {orchestrationResult.timestamp ? new Date(orchestrationResult.timestamp).toLocaleString() : 'N/A'}
                        </span>
                    </div>
                    <div className="overflow-auto" style={{ maxHeight: '400px' }}>
                        <pre className="whitespace-pre-wrap p-4 bg-gray-100 dark:bg-gray-900 rounded text-gray-800 dark:text-gray-200 text-sm">
                            {(() => {
                                try {
                                    return JSON.stringify(orchestrationResult, null, 2);
                                } catch (e) {
                                    return '[Error displaying orchestration result]';
                                }
                            })()}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentWorkflowOrchestratorTest; 
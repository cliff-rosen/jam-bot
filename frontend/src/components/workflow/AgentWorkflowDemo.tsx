import React, { useState, useEffect, useRef } from 'react';
import {
    AgentWorkflowOrchestrator,
    WorkflowMessage,
    WorkflowMessageType,
    WorkflowStatus,
    WorkflowStepStatus
} from '../../lib/workflow/agent/AgentWorkflowOrchestrator';
import { AgentWorkflowEngine } from '../../lib/workflow/agent/AgentWorkflowEngine';
import {
    AgentWorkflowChain,
    SAMPLE_WORKFLOW_CHAIN
} from '../../types/agent-workflows';
import {
    WorkflowVariable,
} from '../../types/workflows';

// Helper functions for phase display
const getPhaseProgress = (phaseId: string): number => {
    // In a real app, this would be calculated based on actual progress
    // For demo purposes, we'll return a random value between 10 and 100
    return Math.floor(Math.random() * 90) + 10;
};

const AgentWorkflowDemo: React.FC = () => {
    const [activeWorkflowChain, setActiveWorkflowChain] = useState<AgentWorkflowChain>(SAMPLE_WORKFLOW_CHAIN);
    const [chainInputValues, setChainInputValues] = useState<Record<string, any>>({});
    const [chainOutputs, setChainOutputs] = useState<Record<string, any>>({});
    const [selectedPhase, setSelectedPhase] = useState('input');
    const [currentSteps, setCurrentSteps] = useState<WorkflowStepStatus[]>([]);
    const [phaseResults, setPhaseResults] = useState<Record<string, any>>({});
    const [status, setStatus] = useState<WorkflowStatus>({
        phase: 'question_development',
        progress: 0,
        currentSteps: [],
        results: {}
    });
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [workflowMessages, setWorkflowMessages] = useState<WorkflowMessage[]>([]);
    const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
    const [isMessagesFullscreen, setIsMessagesFullscreen] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    // Create a ref to the orchestrator to avoid recreating it on each render
    const orchestratorRef = useRef<AgentWorkflowOrchestrator | null>(null);
    const messageHandlerRef = useRef<((message: WorkflowMessage) => void) | null>(null);

    // Initialize the orchestrator if it doesn't exist
    if (!orchestratorRef.current) {
        const workflowEngine = new AgentWorkflowEngine();
        orchestratorRef.current = new AgentWorkflowOrchestrator(workflowEngine);
    }

    // Get the orchestrator from the ref
    const orchestrator = orchestratorRef.current;

    // Handle all workflow messages
    const handleWorkflowMessage = (message: WorkflowMessage) => {
        console.log('Workflow message:', message);

        // Always update status
        setStatus(message.status);
        setCurrentSteps(message.status.currentSteps);

        // Update error state if present
        if (message.status.error) {
            setError(message.status.error);
        }

        // Simply add every message without any filtering
        setWorkflowMessages(prev => {
            const newMessages = [...prev, message];
            // Keep the timestamp sorting
            return newMessages.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
        });

        switch (message.type) {
            case WorkflowMessageType.STATUS_UPDATE:
                // Update phase selection if not completed/failed
                if (message.status.phase !== 'completed' && message.status.phase !== 'failed') {
                    setSelectedPhase(message.status.phase);
                }
                // Update phase state if available
                if (message.status.currentState) {
                    setPhaseStateData(prev => prev ? {
                        ...prev,
                        state: message.status.currentState || []
                    } : {
                        phase: message.status.phase,
                        state: message.status.currentState || []
                    });
                }
                break;

            case WorkflowMessageType.PHASE_COMPLETE:
                if (message.status.results) {
                    // Update phase results
                    setPhaseResults(prev => ({
                        ...prev,
                        ...message.status.results
                    }));

                    // Update chain outputs
                    setChainOutputs(prev => ({
                        ...prev,
                        ...message.status.results
                    }));
                }
                break;

            case WorkflowMessageType.WORKFLOW_COMPLETE:
                setSelectedPhase('output');
                setIsRunning(false);
                if (message.status.results) {
                    const newStateVars = getStateVarsFromCompletedPhases(message.status.results);
                    setActiveWorkflowChain(prev => ({
                        ...prev,
                        state: newStateVars
                    }));
                }
                break;

            case WorkflowMessageType.ERROR:
                setError(message.status.error || 'Unknown error');
                setIsRunning(false);
                break;
        }
    };

    const getStateVarsFromCompletedPhases = (results: Record<string, any>): WorkflowVariable[] => {
        const newStateVars: WorkflowVariable[] = [];
        var phaseId: string | undefined;
        Object.keys(results).map(
            (key: string) => {
                if (!phaseId) phaseId = activeWorkflowChain.phases.find(p => p.id === key)?.id;
                newStateVars.push(results[key]);
            }

        );
        return newStateVars;
    };

    // Set up message handler when the component mounts
    useEffect(() => {
        if (orchestrator && (!messageHandlerRef.current || messageHandlerRef.current !== handleWorkflowMessage)) {
            // Remove old handler if it exists
            if (messageHandlerRef.current) {
                orchestrator.offMessage(messageHandlerRef.current);
            }
            // Add new handler
            messageHandlerRef.current = handleWorkflowMessage;
            orchestrator.onMessage(handleWorkflowMessage);
        }

        // Cleanup when unmounting
        return () => {
            if (orchestrator && messageHandlerRef.current) {
                orchestrator.offMessage(messageHandlerRef.current);
                messageHandlerRef.current = null;
            }
        };
    }, [orchestrator]);

    // Handle input change for dynamic inputs
    const handleInputChange = (
        inputName: string,
        value: any
    ) => {
        setChainInputValues(prev => ({
            ...prev,
            [inputName]: value
        }));
    };

    // Get required inputs from chain state
    const getChainInputs = (): WorkflowVariable[] => {
        if (!activeWorkflowChain?.state || !Array.isArray(activeWorkflowChain.state)) return [];

        return (activeWorkflowChain.state as WorkflowVariable[]).filter(
            (variable: WorkflowVariable) => variable.io_type === 'input'
        );
    };

    // Check if all required inputs are provided
    const areRequiredInputsProvided = () => {
        const chainInputs = getChainInputs();
        return chainInputs.every((input: WorkflowVariable) => {
            if (input.required) {
                const value = chainInputValues[input.name];
                return value !== undefined && value !== '';
            }
            return true;
        });
    };

    // Start the workflow
    const startWorkflow = async () => {
        try {
            // Reset state
            setError(null);
            setIsRunning(true);
            setSelectedPhase(activeWorkflowChain.phases[0].id);
            setPhaseResults({});
            setChainOutputs({});
            setWorkflowMessages([]); // Clear previous messages

            // Execute the workflow chain with the input values
            await orchestrator.executeWorkflowChain(
                activeWorkflowChain,
                chainInputValues
            );
        } catch (error) {
            console.error('Error starting workflow:', error);
            setError('Failed to start workflow');
            setIsRunning(false);
        }
    };

    // Render input fields based on chain state
    const renderInputFields = () => {
        const chainInputs = getChainInputs();

        if (chainInputs.length === 0) {
            return <p>No inputs required for this workflow chain.</p>;
        }

        return (
            <div className="flex flex-col gap-4">
                {chainInputs.map((input: WorkflowVariable) => (
                    <div key={input.name.toString()} className="flex flex-col gap-1.5">
                        <label className="font-medium text-sm text-gray-700 dark:text-gray-300">
                            {input.name.toString()}
                            {input.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {input.schema.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {input.schema.description}
                            </div>
                        )}
                        <input
                            type="text"
                            value={chainInputValues[input.name] || ''}
                            onChange={(e) => handleInputChange(input.name, e.target.value)}
                            placeholder={`Enter ${input.name}...`}
                            disabled={isRunning}
                            className="p-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm w-full focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-700 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                        />
                    </div>
                ))}
                <button
                    onClick={startWorkflow}
                    disabled={isRunning || !areRequiredInputsProvided()}
                    className="mt-2 px-4 py-2.5 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors self-start disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isRunning ? 'Processing...' : 'Submit'}
                </button>
            </div>
        );
    };

    // Render the workflow steps with more details
    const renderWorkflowSteps = () => {
        if (!currentSteps || currentSteps.length === 0) {
            return <p>No steps available for this workflow.</p>;
        }

        return (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">Current Steps:</h4>
                <ul className="list-none p-0 m-0">
                    {currentSteps.map((step, index) => (
                        <li key={step.id} className="p-3 mb-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-semibold">{index + 1}</span>
                                <strong className="flex-1 font-medium text-gray-800 dark:text-gray-200">{step.name}</strong>
                                <span className={`text-xs px-2 py-1 rounded ${step.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    step.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    }`}>
                                    {step.status}
                                </span>
                            </div>
                            {step.message && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {step.message}
                                </div>
                            )}
                            {step.result && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                                        View Result
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-48">
                                        {JSON.stringify(step.result, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    // Render the workflow phases in the top panel
    const renderWorkflowPhases = () => {
        // Always include input and output phases
        const allPhases = [
            { id: 'input', label: 'Initial Inputs' },
            ...activeWorkflowChain.phases,
            { id: 'output', label: 'Final Output' }
        ];

        return (
            <div className="flex items-center justify-between mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto min-h-[120px]">
                {allPhases.map((phase, index) => (
                    <React.Fragment key={phase.id}>
                        {/* Phase item */}
                        <div
                            className={`flex flex-col items-center justify-center cursor-pointer p-3 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:-translate-y-1 min-w-[100px] max-w-[150px] ${selectedPhase === phase.id ? 'bg-blue-50 dark:bg-blue-900/20 -translate-y-1 shadow' : ''
                                }`}
                            onClick={() => !isRunning && setSelectedPhase(phase.id)}
                        >
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full mb-3 transition-colors ${selectedPhase === phase.id ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {index + 1}
                            </div>
                            <div className={`text-sm text-center whitespace-nowrap ${selectedPhase === phase.id ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                {phase.label}
                            </div>
                            {status.phase === phase.id && (
                                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${status.progress}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Connector */}
                        {index < allPhases.length - 1 && (
                            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 min-w-[20px] max-w-[100px] z-0" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    // Render the input phase details
    const renderInputPhaseDetails = () => {
        return (
            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">Required Inputs</h4>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Required</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {getChainInputs().map((input: WorkflowVariable) => (
                                <tr key={input.name.toString()}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{input.name.toString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {input.schema.is_array ? `${input.schema.type}[]` : input.schema.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {input.required ? 'Yes' : 'No'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                        {input.schema.description || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Render the output phase details
    const renderOutputPhaseDetails = () => {
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IO Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {Array.isArray(activeWorkflowChain?.state) && activeWorkflowChain.state.length > 0 ? (
                            activeWorkflowChain.state.map((variable: WorkflowVariable) => (
                                <tr key={variable.name.toString()}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {variable.name.toString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {variable.schema.is_array ? `${variable.schema.type}[]` : variable.schema.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {variable.io_type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {variable.variable_role || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                        {variable.value ? JSON.stringify(variable.value) : '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-300">
                                    No workflow state available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedMessageIndex === null || workflowMessages.length === 0) return;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const newIndex = Math.max(0, selectedMessageIndex - 1);
                setSelectedMessageIndex(newIndex);
                scrollRowIntoView(newIndex);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const newIndex = Math.min(workflowMessages.length - 1, selectedMessageIndex + 1);
                setSelectedMessageIndex(newIndex);
                scrollRowIntoView(newIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedMessageIndex, workflowMessages.length]);

    // Helper function to scroll the selected row into view
    const scrollRowIntoView = (index: number) => {
        const tableContainer = tableRef.current;
        if (!tableContainer) return;

        const rows = tableContainer.getElementsByTagName('tr');
        const selectedRow = rows[index + 1]; // +1 to account for header row
        if (selectedRow) {
            selectedRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    };

    // Add new function to get current phase state
    const getCurrentPhaseState = async () => {
        if (selectedPhase === 'input' || selectedPhase === 'output') return null;

        const phase = activeWorkflowChain.phases.find(p => p.id === selectedPhase);
        if (!phase) return null;

        // Get all variables that are mapped in this phase's workflow
        const workflow = await phase.workflow();
        if (!workflow) return null;

        const phaseState = workflow.state || [];
        return {
            phase,
            state: phaseState
        };
    };

    // Add state for phase state data
    const [phaseStateData, setPhaseStateData] = useState<{
        phase: any;
        state: any[];
    } | null>(null);

    // Add effect to update phase state when phase changes
    useEffect(() => {
        const updatePhaseState = async () => {
            if (selectedPhase !== 'input' && selectedPhase !== 'output') {
                const state = await getCurrentPhaseState();
                setPhaseStateData(state);
            } else {
                setPhaseStateData(null);
            }
        };
        updatePhaseState();
    }, [selectedPhase]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-[2000px]">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Sample Workflow Chain Demo
                {isRunning && (
                    <span className="ml-4 text-sm font-normal text-blue-500">
                        Running... ({status.progress}%)
                    </span>
                )}
            </h2>

            {/* Section 1: Workflow Phases */}
            <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                {renderWorkflowPhases()}
            </div>

            {/* Main Content Area - Split into two columns */}
            <div className="flex gap-6">
                {/* Left Column - Main Content */}
                <div className="flex-1">
                    {/* Section 2: Input Area */}
                    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow overflow-auto p-6">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                            Workflow Inputs
                        </h3>
                        {renderInputFields()}
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Phase Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-auto p-6">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                            {selectedPhase === 'input' ? 'Input Phase Details' :
                                selectedPhase === 'output' ? 'Final Results' :
                                    `Phase: ${activeWorkflowChain.phases.find(p => p.id === selectedPhase)?.label || selectedPhase}`}
                        </h3>

                        {selectedPhase === 'input' && renderInputPhaseDetails()}
                        {selectedPhase === 'output' && renderOutputPhaseDetails()}
                        {selectedPhase !== 'input' && selectedPhase !== 'output' && (
                            <>
                                {renderWorkflowSteps()}
                                {phaseResults[selectedPhase] && (
                                    <div className="mt-6">
                                        <h4 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">Phase Results:</h4>
                                        <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-sm text-gray-800 dark:text-gray-200">
                                            {JSON.stringify(phaseResults[selectedPhase], null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Section 4: Workflow Messages */}
                    <div className={`${isMessagesFullscreen
                        ? 'fixed inset-0 z-50 bg-white dark:bg-gray-800'
                        : 'mt-6 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden'}`}>
                        <div className={`${isMessagesFullscreen ? 'h-full flex flex-col' : 'p-6'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                    Workflow Messages
                                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                        ({workflowMessages.length} messages)
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setIsMessagesFullscreen(prev => !prev)}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {isMessagesFullscreen ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {workflowMessages.length > 0 ? (
                                <div className={`flex gap-4 ${isMessagesFullscreen ? 'flex-1 overflow-hidden' : ''}`}>
                                    {/* Left Pane - Message List */}
                                    <div className={`${isMessagesFullscreen ? 'w-1/2' : 'w-[500px]'} border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden`}>
                                        <div ref={tableRef} className={`${isMessagesFullscreen ? 'h-full' : 'h-[400px]'} overflow-y-auto`}>
                                            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Time</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Type</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Status</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {workflowMessages.map((message, index) => (
                                                        <tr
                                                            key={`${message.sessionId}-${index}`}
                                                            onClick={() => setSelectedMessageIndex(index)}
                                                            className={`cursor-pointer transition-colors ${selectedMessageIndex === index
                                                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                }`}
                                                            tabIndex={0}
                                                            role="row"
                                                            aria-selected={selectedMessageIndex === index}
                                                        >
                                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                                                {(() => {
                                                                    const date = new Date(message.timestamp);
                                                                    const time = date.toLocaleTimeString();
                                                                    const ms = date.getMilliseconds().toString().padStart(3, '0');
                                                                    return `${time}.${ms}`;
                                                                })()}
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${message.type === WorkflowMessageType.STATUS_UPDATE ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                                    message.type === WorkflowMessageType.PHASE_COMPLETE ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                        message.type === WorkflowMessageType.WORKFLOW_COMPLETE ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                    }`}>
                                                                    {message.type === WorkflowMessageType.STATUS_UPDATE ? 'Update' :
                                                                        message.type === WorkflowMessageType.PHASE_COMPLETE ? 'Phase' :
                                                                            message.type === WorkflowMessageType.WORKFLOW_COMPLETE ? 'Done' : 'Error'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                                                                {message.status.error ? (
                                                                    <span className="text-red-500 dark:text-red-400">Error</span>
                                                                ) : message.type === WorkflowMessageType.PHASE_COMPLETE ? (
                                                                    <span>Phase Complete</span>
                                                                ) : message.type === WorkflowMessageType.WORKFLOW_COMPLETE ? (
                                                                    <span>Workflow Complete</span>
                                                                ) : (
                                                                    <span>{message.status.phase}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full transition-all duration-500 ${message.status.error ? 'bg-red-500' :
                                                                                message.type === WorkflowMessageType.WORKFLOW_COMPLETE ? 'bg-green-500' :
                                                                                    'bg-blue-500'
                                                                                }`}
                                                                            style={{ width: `${message.status.progress}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs">{message.status.progress}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                                                                {message.status.error ? (
                                                                    <span className="text-red-500 dark:text-red-400">
                                                                        {message.status.error.slice(0, 50)}{message.status.error.length > 50 ? '...' : ''}
                                                                    </span>
                                                                ) : message.type === WorkflowMessageType.PHASE_COMPLETE ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                        <span>Completed {message.status.phase}</span>
                                                                    </div>
                                                                ) : message.type === WorkflowMessageType.WORKFLOW_COMPLETE ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        <span>Workflow completed successfully</span>
                                                                    </div>
                                                                ) : message.status.currentSteps.length > 0 ? (
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="truncate">
                                                                            {message.status.currentSteps[0].name}
                                                                            {message.status.currentSteps.length > 1 && (
                                                                                <span className="ml-1 text-xs text-gray-400">
                                                                                    (+{message.status.currentSteps.length - 1})
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                        {message.status.currentSteps[0].status === 'completed' && (
                                                                            <svg className="w-4 h-4 text-green-500 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span>Processing {message.status.phase}</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Right Pane - Message Details */}
                                    <div className={`flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${isMessagesFullscreen ? 'h-full' : 'h-[400px]'} overflow-y-auto`}>
                                        {selectedMessageIndex !== null && selectedMessageIndex < workflowMessages.length ? (
                                            <div className="space-y-6">
                                                {/* Message Overview */}
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Message Overview
                                                    </h4>
                                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                                        <dl className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <dt className="text-xs text-gray-500 dark:text-gray-400">Type</dt>
                                                                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                                                    {workflowMessages[selectedMessageIndex].type}
                                                                </dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-xs text-gray-500 dark:text-gray-400">Phase</dt>
                                                                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                                                    {workflowMessages[selectedMessageIndex].status.phase}
                                                                </dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-xs text-gray-500 dark:text-gray-400">Progress</dt>
                                                                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                                                    {workflowMessages[selectedMessageIndex].status.progress}%
                                                                </dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-xs text-gray-500 dark:text-gray-400">Timestamp</dt>
                                                                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                                                    {(() => {
                                                                        const date = new Date(workflowMessages[selectedMessageIndex].timestamp);
                                                                        const fullDate = date.toLocaleString();
                                                                        const ms = date.getMilliseconds().toString().padStart(3, '0');
                                                                        return `${fullDate}.${ms}`;
                                                                    })()}
                                                                </dd>
                                                            </div>
                                                        </dl>
                                                    </div>
                                                </div>

                                                {/* Current Steps */}
                                                {workflowMessages[selectedMessageIndex].status.currentSteps.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Current Steps
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {workflowMessages[selectedMessageIndex].status.currentSteps.map(step => (
                                                                <div key={step.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="font-medium text-gray-700 dark:text-gray-300">{step.name}</span>
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${step.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                            step.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                            }`}>
                                                                            {step.status}
                                                                        </span>
                                                                    </div>
                                                                    {step.message && (
                                                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                                            {step.message}
                                                                        </div>
                                                                    )}
                                                                    {step.result && (
                                                                        <details className="mt-2">
                                                                            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                                                                                View Result
                                                                            </summary>
                                                                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-48">
                                                                                {JSON.stringify(step.result, null, 2)}
                                                                            </pre>
                                                                        </details>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Error Details */}
                                                {workflowMessages[selectedMessageIndex].status.error && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                                            Error Details
                                                        </h4>
                                                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r">
                                                            <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                                                                {workflowMessages[selectedMessageIndex].status.error}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Phase/Workflow Results */}
                                                {workflowMessages[selectedMessageIndex].status.results &&
                                                    Object.keys(workflowMessages[selectedMessageIndex].status.results).length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                {workflowMessages[selectedMessageIndex].type === WorkflowMessageType.PHASE_COMPLETE ? 'Phase Results' :
                                                                    workflowMessages[selectedMessageIndex].type === WorkflowMessageType.WORKFLOW_COMPLETE ? 'Final Results' :
                                                                        'Results'}
                                                            </h4>
                                                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                                                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-96">
                                                                    {JSON.stringify(workflowMessages[selectedMessageIndex].status.results, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                                                Select a message to view details
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No workflow messages yet. Start a workflow to see messages here.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Phase State Panel */}
                {selectedPhase !== 'input' && selectedPhase !== 'output' && (
                    <div className="w-[768px] bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                Phase State
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {(() => {
                                if (!phaseStateData) {
                                    return (
                                        <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                                            No phase state available
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-2">
                                        {phaseStateData.state.map((variable: WorkflowVariable) => (
                                            <div key={variable.name} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {variable.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {variable.io_type}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    {variable.schema.type}
                                                    {variable.schema.is_array && '[]'}
                                                </div>
                                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                                    {variable.value !== undefined ? (
                                                        <pre className="whitespace-pre-wrap break-words">
                                                            {JSON.stringify(variable.value, null, 2)}
                                                        </pre>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-gray-500 italic">
                                                            No value
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentWorkflowDemo; 
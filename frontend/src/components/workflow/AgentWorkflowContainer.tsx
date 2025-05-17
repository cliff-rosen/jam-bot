import React, { useState, useEffect, useCallback } from 'react';
import {
    AgentWorkflowConfig,
    AgentWorkflowEventType,
    OrchestrationPhase,
    OrchestrationStatus,
    StatusChangeEvent
} from '../types/agent-workflows';
import { AgentWorkflowService } from '../services/AgentWorkflowService';

// Progress bar component
const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${value}%` }}
            ></div>
        </div>
    );
};

// Phase indicator component
const PhaseIndicator: React.FC<{
    phase: OrchestrationPhase;
    currentPhase: OrchestrationPhase;
    label: string;
}> = ({ phase, currentPhase, label }) => {
    const getPhaseStatus = () => {
        const phases: OrchestrationPhase[] = [
            'question_development',
            'kb_development',
            'answer_generation',
            'completed'
        ];

        const currentIndex = phases.indexOf(currentPhase);
        const phaseIndex = phases.indexOf(phase);

        if (currentPhase === 'failed') {
            return phaseIndex <= phases.indexOf('answer_generation') ? 'failed' : 'pending';
        }

        if (phaseIndex < currentIndex) {
            return 'completed';
        } else if (phaseIndex === currentIndex) {
            return 'active';
        } else {
            return 'pending';
        }
    };

    const status = getPhaseStatus();

    const getStatusClasses = () => {
        switch (status) {
            case 'completed':
                return 'bg-green-500 text-white';
            case 'active':
                return 'bg-blue-500 text-white';
            case 'failed':
                return 'bg-red-500 text-white';
            default:
                return 'bg-gray-200 text-gray-500';
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusClasses()}`}>
                {status === 'completed' ? '✓' : (status === 'failed' ? '✗' : '')}
            </div>
            <div className="mt-2 text-sm">{label}</div>
        </div>
    );
};

// Phase connector component
const PhaseConnector: React.FC<{ active: boolean }> = ({ active }) => {
    return (
        <div className="flex-1 h-1 mx-2">
            <div className={`h-full ${active ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
        </div>
    );
};

interface AgentWorkflowContainerProps {
    initialQuestion?: string;
    config?: AgentWorkflowConfig;
}

const AgentWorkflowContainer: React.FC<AgentWorkflowContainerProps> = ({
    initialQuestion = '',
    config
}) => {
    const [question, setQuestion] = useState(initialQuestion);
    const [status, setStatus] = useState<OrchestrationStatus | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Create a ref to the service to avoid recreating it on each render
    const serviceRef = React.useRef<AgentWorkflowService | null>(null);

    // Initialize the service if it doesn't exist
    if (!serviceRef.current) {
        serviceRef.current = new AgentWorkflowService();
    }

    // Get the service from the ref
    const service = serviceRef.current;

    // Handle status change events
    const handleStatusChange = useCallback((event: StatusChangeEvent) => {
        setStatus(event.status);

        if (event.status.currentPhase === 'completed' || event.status.currentPhase === 'failed') {
            setIsRunning(false);
        }
    }, []);

    // Set up event listeners when the component mounts
    useEffect(() => {
        service.onStatusChange(handleStatusChange);

        return () => {
            service.offStatusChange(handleStatusChange);
        };
    }, [service, handleStatusChange]);

    // Start the workflow
    const startWorkflow = async () => {
        if (!question.trim()) {
            setError('Please enter a question');
            return;
        }

        setError(null);
        setIsRunning(true);

        try {
            await service.executeWorkflowChain(question, config);
        } catch (error) {
            console.error('Workflow execution failed:', error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
            setIsRunning(false);
        }
    };

    // Cancel the workflow
    const cancelWorkflow = async () => {
        if (status && status.sessionId) {
            try {
                await service.cancelExecution(status.sessionId);
                setIsRunning(false);
            } catch (error) {
                console.error('Failed to cancel workflow:', error);
                setError(error instanceof Error ? error.message : 'Failed to cancel workflow');
            }
        }
    };

    // Get the phase label
    const getPhaseLabel = (phase: OrchestrationPhase): string => {
        switch (phase) {
            case 'question_development':
                return 'Improving Question';
            case 'kb_development':
                return 'Building Knowledge Base';
            case 'answer_generation':
                return 'Generating Answer';
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            default:
                return phase;
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Agent Workflow</h1>

            {/* Question input */}
            <div className="mb-6">
                <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Question
                </label>
                <div className="flex">
                    <input
                        type="text"
                        id="question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={isRunning}
                        placeholder="Enter your question here..."
                        className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isRunning ? (
                        <button
                            onClick={cancelWorkflow}
                            className="px-4 py-2 bg-red-500 text-white rounded-r-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Cancel
                        </button>
                    ) : (
                        <button
                            onClick={startWorkflow}
                            className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Submit
                        </button>
                    )}
                </div>
                {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
            </div>

            {/* Workflow status */}
            {status && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Workflow Status</h2>

                    {/* Progress bar */}
                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                                {getPhaseLabel(status.currentPhase)}
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                                {status.progress}%
                            </span>
                        </div>
                        <ProgressBar value={status.progress} />
                    </div>

                    {/* Phase indicators */}
                    <div className="flex items-center justify-between mb-6">
                        <PhaseIndicator
                            phase="question_development"
                            currentPhase={status.currentPhase}
                            label="Question"
                        />
                        <PhaseConnector
                            active={['kb_development', 'answer_generation', 'completed'].includes(status.currentPhase)}
                        />
                        <PhaseIndicator
                            phase="kb_development"
                            currentPhase={status.currentPhase}
                            label="Knowledge Base"
                        />
                        <PhaseConnector
                            active={['answer_generation', 'completed'].includes(status.currentPhase)}
                        />
                        <PhaseIndicator
                            phase="answer_generation"
                            currentPhase={status.currentPhase}
                            label="Answer"
                        />
                        <PhaseConnector
                            active={['completed'].includes(status.currentPhase)}
                        />
                        <PhaseIndicator
                            phase="completed"
                            currentPhase={status.currentPhase}
                            label="Complete"
                        />
                    </div>

                    {/* Results */}
                    {status.results && (
                        <div className="space-y-4">
                            {status.results.improvedQuestion && (
                                <div className="p-4 bg-gray-50 rounded-md">
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Improved Question</h3>
                                    <p className="text-gray-700">{status.results.improvedQuestion}</p>
                                </div>
                            )}

                            {status.results.finalAnswer && (
                                <div className="p-4 bg-blue-50 rounded-md">
                                    <h3 className="text-lg font-medium text-blue-900 mb-2">Final Answer</h3>
                                    <p className="text-gray-700">{status.results.finalAnswer}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error message */}
                    {status.error && (
                        <div className="p-4 bg-red-50 rounded-md mt-4">
                            <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
                            <p className="text-red-700">{status.error}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AgentWorkflowContainer; 
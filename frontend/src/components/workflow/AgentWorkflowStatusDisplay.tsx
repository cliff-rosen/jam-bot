import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

// Simplified types for our component
export interface AgentStatus {
    currentPhase: string;
    progress: number;
    error?: string;
    currentWorkflowStatus?: any;
}

export interface StepStatus {
    currentPhase: string;
    progress: number;
    error?: string;
}

/**
 * Status message type
 */
export interface StatusMessage {
    text: string;
    type: 'info' | 'success' | 'error' | 'warning';
    timestamp: string;
    originalStatus: AgentStatus | StepStatus;
}

/**
 * Props for the AgentWorkflowStatusDisplay component
 */
export interface AgentWorkflowStatusDisplayProps {
    status?: AgentStatus;
    stepStatus?: StepStatus;
    onSelectStatus?: (status: AgentStatus | StepStatus, index: number) => void;
    selectedIndex?: number;
    maxHeight?: string;
    className?: string;
}

/**
 * Ref interface for the AgentWorkflowStatusDisplay component
 */
export interface AgentWorkflowStatusDisplayRef {
    clearMessages: () => void;
    getMessages: () => StatusMessage[];
}

/**
 * Component that displays status updates from the AgentWorkflowOrchestrator
 * in a scrolling log format rather than replacing previous updates
 */
const AgentWorkflowStatusDisplay = forwardRef<AgentWorkflowStatusDisplayRef, AgentWorkflowStatusDisplayProps>(({
    status,
    stepStatus,
    onSelectStatus,
    selectedIndex = null,
    maxHeight,
    className
}, ref) => {
    // State to store all status messages
    const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);

    // Ref to the status container for auto-scrolling
    const statusContainerRef = useRef<HTMLDivElement>(null);

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
        clearMessages: () => {
            setStatusMessages([]);
        },
        getMessages: () => {
            return statusMessages;
        }
    }));

    // Process the status object and add new messages when it changes
    useEffect(() => {
        if (!status && !stepStatus) return;

        // Create a new message based on the status
        const newMessage = createMessageFromStatus(status, stepStatus);
        if (newMessage) {
            setStatusMessages(prev => [...prev, newMessage]);
        }
    }, [status, stepStatus]);

    // Auto-scroll to the bottom when new messages are added
    useEffect(() => {
        if (statusContainerRef.current) {
            statusContainerRef.current.scrollTop = statusContainerRef.current.scrollHeight;
        }
    }, [statusMessages]);

    // Helper function to create a message object from the status
    const createMessageFromStatus = (status: AgentStatus | undefined, stepStatus: StepStatus | undefined): StatusMessage | null => {
        if (!status && !stepStatus) return null;

        const timestamp = new Date().toISOString();
        let message = '';
        let type: StatusMessage['type'] = 'info';

        // Determine the message and type based on the status
        if (status?.error) {
            message = `Error: ${status.error}`;
            type = 'error';
        } else if (status?.currentPhase === 'completed') {
            message = 'Workflow completed successfully';
            type = 'success';
        } else if (status?.currentPhase === 'failed') {
            message = 'Workflow failed';
            type = 'error';
        } else if (status?.currentWorkflowStatus?.state?.steps) {
            // Get the latest step status
            const steps = status.currentWorkflowStatus.state.steps;
            const latestStep = steps[steps.length - 1];

            if (latestStep) {
                message = `Step: ${latestStep.name} - ${latestStep.status}`;

                if (latestStep.status === 'failed') {
                    type = 'error';
                } else if (latestStep.status === 'completed') {
                    type = 'success';
                }
            } else {
                message = `[${status.currentPhase}] Progress: ${status.progress}%`;
            }
        } else if (stepStatus) {
            message = `[${stepStatus.currentPhase}] Progress: ${stepStatus.progress}%`;
        } else if (status) {
            message = `[${status.currentPhase}] Progress: ${status.progress}%`;
        }

        return { text: message, type, timestamp, originalStatus: status || stepStatus as (AgentStatus | StepStatus) };
    };

    // Format the timestamp for display
    const formatTimestamp = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    // Handle click on a status message
    const handleStatusClick = (index: number) => {
        if (onSelectStatus && statusMessages[index]) {
            onSelectStatus(statusMessages[index].originalStatus, index);
        }
    };

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${maxHeight || ''} ${className || ''}`}
        >
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 rounded-t-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Workflow Status Updates</h3>
            </div>
            <div
                ref={statusContainerRef}
                className="p-3 overflow-y-auto font-mono text-sm"
                style={{ maxHeight: maxHeight || '300px' }}
            >
                {statusMessages.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400 italic">No status updates yet</div>
                ) : (
                    statusMessages.map((msg, index) => (
                        <div
                            key={index}
                            onClick={() => handleStatusClick(index)}
                            className={`mb-1 pb-1 border-b border-gray-100 dark:border-gray-800 
                                ${msg.type === 'error' ? 'text-red-600 dark:text-red-400' :
                                    msg.type === 'success' ? 'text-green-600 dark:text-green-400' :
                                        msg.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                            'text-gray-700 dark:text-gray-300'
                                }
                                ${selectedIndex === index ?
                                    'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500 dark:border-blue-400 pl-2 rounded-l' :
                                    'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                }
                                cursor-pointer p-1 rounded transition-colors`}
                        >
                            <span className="text-gray-500 dark:text-gray-400 mr-2">[{formatTimestamp(msg.timestamp)}]</span>
                            {msg.text}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

export default AgentWorkflowStatusDisplay; 
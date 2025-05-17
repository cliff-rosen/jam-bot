import React, { useState } from 'react';
import { Journey, Workflow, ChatMessage, JourneyState } from './types';
import { transitionSteps } from './workflowTransitionData';

interface TransitionStep {
    state: JourneyState;
    description: string;
    chatMessages: ChatMessage[];
    journey?: Partial<Journey>;
    workflow?: Partial<Workflow>;
}

const WorkflowTransitionDemo: React.FC = () => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const currentStep = transitionSteps[currentStepIndex];

    const handleNext = () => {
        if (currentStepIndex < transitionSteps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    return (
        <div className="p-4">
            <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">Workflow Transition Demo</h2>
                <p className="text-gray-600">{currentStep.description}</p>
            </div>

            <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Current State: {currentStep.state}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStepIndex === 0}
                        className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentStepIndex === transitionSteps.length - 1}
                        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="border rounded p-4">
                    <h3 className="font-semibold mb-2">Chat Messages</h3>
                    <div className="space-y-2">
                        {currentStep.chatMessages.map(msg => (
                            <div key={msg.id} className="p-2 bg-gray-50 rounded">
                                <div className="font-medium">{msg.role}</div>
                                <div>{msg.content}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border rounded p-4">
                    <h3 className="font-semibold mb-2">State Changes</h3>
                    {currentStep.journey && (
                        <div className="mb-4">
                            <h4 className="font-medium">Journey Updates:</h4>
                            <pre className="text-sm bg-gray-50 p-2 rounded">
                                {JSON.stringify(currentStep.journey, null, 2)}
                            </pre>
                        </div>
                    )}
                    {currentStep.workflow && (
                        <div>
                            <h4 className="font-medium">Workflow Updates:</h4>
                            <pre className="text-sm bg-gray-50 p-2 rounded">
                                {JSON.stringify(currentStep.workflow, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkflowTransitionDemo; 
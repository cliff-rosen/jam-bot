import React, { useState } from 'react';
import AgentWorkflowOrchestratorTest from '../components/workflow/AgentWorkflowOrchestratorTest';
import { PageLayout } from '../components/layout/PageLayout';

/**
 * Enum for the different test components
 */
enum TestComponentType {
    WORKFLOW_ENGINE = 'WORKFLOW_ENGINE',
    WORKFLOW_ORCHESTRATOR = 'WORKFLOW_ORCHESTRATOR'
}

/**
 * A page for testing components with a menu to select between different tests
 */
const TestPage: React.FC = () => {
    // State for the selected test component
    const [selectedTest, setSelectedTest] = useState<TestComponentType>(TestComponentType.WORKFLOW_ENGINE);

    // Render the selected test component
    const renderTestComponent = () => {
        switch (selectedTest) {
            case TestComponentType.WORKFLOW_ENGINE:
                return <div>REMOVED</div>;
            case TestComponentType.WORKFLOW_ORCHESTRATOR:
                return <AgentWorkflowOrchestratorTest />;
            default:
                return <div>Select a test component</div>;
        }
    };

    return (
        <PageLayout>
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Test Components
                </h2>
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={() => setSelectedTest(TestComponentType.WORKFLOW_ENGINE)}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${selectedTest === TestComponentType.WORKFLOW_ENGINE
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Workflow Engine Test
                    </button>
                    <button
                        onClick={() => setSelectedTest(TestComponentType.WORKFLOW_ORCHESTRATOR)}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${selectedTest === TestComponentType.WORKFLOW_ORCHESTRATOR
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Workflow Orchestrator Test
                    </button>
                </div>
            </div>
            {renderTestComponent()}
        </PageLayout>
    );
};

export default TestPage; 
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '../context/WorkflowContext';
import { workflowApi } from '../lib/api';
import AssetList from '../components/common/AssetList';
import WorkflowTemplateDialog from '../components/workflow/WorkflowTemplateDialog';
import {
    Workflow,
    getWorkflowInputs,
    getWorkflowOutputs
} from '@/types/workflows';

const WorkflowsManager: React.FC = () => {
    const navigate = useNavigate();
    const {
        workflows,
        workflow: currentWorkflow,
        isLoading,
        loadWorkflows,
        createWorkflow
    } = useWorkflows();
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

    useEffect(() => {
        if (currentWorkflow) {
            navigate(`/workflow/${currentWorkflow.workflow_id}`);
        }
    }, [currentWorkflow, navigate]);

    const handleCreateWorkflow = () => {
        setIsTemplateDialogOpen(true);
    };

    const handleCreateEmptyWorkflow = () => {
        createWorkflow();
        setIsTemplateDialogOpen(false);
        navigate('/workflow/new');
    };

    const handleSelectTemplate = (templateId: string) => {
        createWorkflow(templateId);
        setIsTemplateDialogOpen(false);
        navigate('/workflow/new');
    };

    const handleDelete = async (workflowId: string) => {
        try {
            await workflowApi.deleteWorkflow(workflowId);
            loadWorkflows(); // Refresh the list after deletion
        } catch (error) {
            console.error('Error deleting workflow:', error);
            alert('Failed to delete workflow');
        }
    };

    const handleEdit = (workflowId: string) => {
        navigate(`/workflow/${workflowId}`);
    };

    if (currentWorkflow) {
        return null;
    }

    const assets = workflows?.map(workflow => ({
        id: workflow.workflow_id,
        name: workflow.name || 'Untitled Workflow',
        description: workflow.description || 'No description',
        metadata: getWorkflowStats(workflow)
    })) || [];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent dark:border-blue-400 dark:border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading workflows...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <AssetList
                title="Workflows"
                subtitle="Design and author sequences of steps to accomplish your goals"
                assets={assets}
                onCreateNew={handleCreateWorkflow}
                onEdit={handleEdit}
                onDelete={handleDelete}
                createButtonText="New Workflow"
                emptyStateMessage="Get started by creating a new workflow."
            />

            <WorkflowTemplateDialog
                isOpen={isTemplateDialogOpen}
                onClose={() => setIsTemplateDialogOpen(false)}
                onSelectTemplate={handleSelectTemplate}
                onCreateEmpty={handleCreateEmptyWorkflow}
            />
        </>
    );
};

// Helper function to get workflow statistics for display
function getWorkflowStats(workflow: Workflow) {
    const stats = [];

    // Count steps
    const stepCount = workflow.steps?.length || 0;
    stats.push({
        label: stepCount === 1 ? 'step' : 'steps',
        value: stepCount
    });

    // Count inputs
    const inputs = getWorkflowInputs(workflow);
    if (inputs.length > 0) {
        stats.push({
            label: inputs.length === 1 ? 'input' : 'inputs',
            value: inputs.length
        });
    }

    // Count outputs
    const outputs = getWorkflowOutputs(workflow);
    if (outputs.length > 0) {
        stats.push({
            label: outputs.length === 1 ? 'output' : 'outputs',
            value: outputs.length
        });
    }

    return stats;
}

export default WorkflowsManager; 
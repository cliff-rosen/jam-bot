import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobsContext';
import { useWorkflows } from '../context/WorkflowContext';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';
import AssetList from '../components/common/AssetList';
import {
    Workflow,
    getWorkflowInputs,
    WorkflowStatus
} from '@/types/workflows';

const JobsManager: React.FC = () => {
    const navigate = useNavigate();
    const { jobs, createJob, deleteJob, currentJob } = useJobs();
    const { workflows } = useWorkflows();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
    const [jobToDelete, setJobToDelete] = useState<string | null>(null);
    const [jobName, setJobName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (selectedWorkflow) {
            const workflow = workflows?.find(w => w.workflow_id === selectedWorkflow);
            if (workflow) {
                const date = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                setJobName(`${workflow.name || 'Untitled Workflow'} - ${date}`);
            }
        } else {
            setJobName('');
        }
    }, [selectedWorkflow, workflows]);

    useEffect(() => {
        if (currentJob) {
            console.log('JobsManager.tsx useEffect found currentJob', currentJob);
            navigate(`/jobs/${currentJob.job_id}`);
        }
    }, [currentJob, navigate]);

    if (currentJob) {
        return null;
    }

    const handleCreateJob = async () => {
        console.log('JobsManager.tsx handleCreateJob starting', selectedWorkflow);
        if (!selectedWorkflow || isCreating) return;

        const workflow = workflows?.find(w => w.workflow_id === selectedWorkflow);
        if (!workflow) return;

        setIsCreating(true);
        try {
            const job = await createJob({
                workflow_id: selectedWorkflow,
                name: jobName,
                input_variables: []
            });

            // Only close dialog and reset state after successful creation
            setIsCreateDialogOpen(false);
            setSelectedWorkflow(null);
            setJobName('');
        } catch (error) {
            console.error('Failed to create job:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteClick = (jobId: string) => {
        setJobToDelete(jobId);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!jobToDelete) return;

        try {
            await deleteJob(jobToDelete);
            setIsDeleteDialogOpen(false);
            setJobToDelete(null);
        } catch (error) {
            console.error('Failed to delete job:', error);
        }
    };

    const handleCloseCreateDialog = () => {
        if (!isCreating) {
            setIsCreateDialogOpen(false);
            setSelectedWorkflow(null);
            setJobName('');
        }
    };

    const assets = jobs.map(job => ({
        id: job.job_id,
        name: job.name,
        description: job.description || 'No description',
        metadata: [
            {
                label: 'status',
                value: job.status
            },
            {
                label: 'created',
                value: new Date(job.created_at).toLocaleString()
            }
        ]
    }));

    // Update the workflow stats display
    const WorkflowStats: React.FC<{ workflow: Workflow }> = ({ workflow }) => (
        <div className="flex gap-4 text-sm text-gray-500">
            <span>{workflow.steps.length} steps</span>
            <span>{getWorkflowInputs(workflow).length} inputs</span>
        </div>
    );

    return (
        <>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-white dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-gray-100">Delete Job</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-700 dark:text-gray-300">
                            Are you sure you want to delete this job? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="bg-white dark:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AssetList
                title="Jobs"
                subtitle="Run and monitor your workflow executions"
                assets={assets}
                onEdit={(jobId) => navigate(`/jobs/${jobId}`)}
                onDelete={handleDeleteClick}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                emptyStateMessage="No jobs yet. Create one to get started."
                useConfirmDialog={false}
            />

            <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseCreateDialog}>
                <DialogContent className="max-w-2xl bg-white dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Job</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <p className="text-gray-600 dark:text-gray-400">
                            Select a workflow to create a new job.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {workflows?.map(workflow => (
                                <div
                                    key={workflow.workflow_id}
                                    onClick={() => setSelectedWorkflow(workflow.workflow_id)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all
                                              ${selectedWorkflow === workflow.workflow_id
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                        }`}
                                >
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                        {workflow.name || 'Untitled Workflow'}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {workflow.description || 'No description'}
                                    </p>
                                    <WorkflowStats workflow={workflow} />
                                </div>
                            ))}
                        </div>

                        {selectedWorkflow && (
                            <div className="space-y-2">
                                <label htmlFor="jobName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Job Name
                                </label>
                                <input
                                    id="jobName"
                                    type="text"
                                    value={jobName}
                                    onChange={(e) => setJobName(e.target.value)}
                                    autoFocus
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                                             rounded-md bg-white dark:bg-gray-700 
                                             text-gray-900 dark:text-gray-100
                                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter job name"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={handleCloseCreateDialog}
                            disabled={isCreating}
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={!selectedWorkflow || !jobName.trim() || isCreating}
                            onClick={handleCreateJob}
                            className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                            {isCreating ? 'Creating...' : 'Continue'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default JobsManager; 
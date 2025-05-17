import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs } from '../context/JobsContext';
import { useWorkflows } from '../context/WorkflowContext';

import { JobStatus } from '../types/jobs';
import { JobProgress } from '../components/job/JobProgress';
import { JobExecutionHistory } from '../components/job/JobExecutionHistory';
import { JobLiveOutput } from '../components/job/JobLiveOutput';
import { JobStepsList } from '../components/job/JobStepsList';
import { JobInputForm } from '../components/job/JobInputForm';
import JobMenuBar from '../components/job/JobMenuBar';
import { JobSummary } from '../components/job/JobSummary';
import { getWorkflowInputs } from '@/types/workflows';

const Job: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const {
        currentJob,
        loadJob,
        runJob,
        cancelJob,
        resetJob,
        resetCurrentJob,
        inputValues,
        inputErrors,
        setInputValue,
        validateInputs,
        areInputsValid,
        error,
        executionState
    } = useJobs();
    const { workflows } = useWorkflows();

    const workflow = workflows?.find(w => w.workflow_id === currentJob?.workflow_id);
    // Use the getWorkflowInputs helper function to get inputs from the workflow state
    const workflowInputs = workflow ? getWorkflowInputs(workflow) : [];

    // Determine if we need inputs based on job status and workflow inputs
    const needsInput = currentJob?.status === JobStatus.PENDING && workflowInputs.length > 0;

    //console.log('Job.tsx', currentJob);

    // Load job data
    useEffect(() => {
        if (jobId) {
            //console.log('Job.tsx loading job', jobId);
            loadJob(jobId);
        }
    }, [jobId, loadJob]);

    // Early return for loading state
    if (!currentJob || !workflow) {
        if (error) {
            return (
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                    {error.message}
                                </h3>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                    <button
                                        onClick={() => navigate('/jobs')}
                                        className="text-red-800 dark:text-red-200 underline hover:text-red-600 dark:hover:text-red-300"
                                    >
                                        Return to Jobs List
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent dark:border-blue-400 dark:border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading job...</p>
                </div>
            </div>
        );
    }

    const handleStart = async () => {
        console.log('Job.tsx handleStart called', {
            jobId: currentJob.job_id,
            status: currentJob.status,
            state: currentJob.state
        });

        if (needsInput) {
            if (!validateInputs()) return;

            try {
                await runJob();
            } catch (error) {
                console.error('Failed to run job:', error);
            }
        } else {
            console.log('Running job without variables');
            try {
                await runJob();
            } catch (error) {
                console.error('Failed to run job:', error);
            }
        }
    };

    const handleCancel = async () => {
        try {
            await cancelJob(currentJob.job_id);
        } catch (error) {
            console.error('Failed to cancel job:', error);
        }
    };

    const handleRestart = async () => {
        console.log('Job.tsx handleRestart called', {
            jobId: currentJob.job_id,
            status: currentJob.status
        });
        try {
            await resetJob(currentJob.job_id);
            console.log('back from resetJob', {
                jobId: currentJob.job_id,
                status: currentJob.status
            });

        } catch (error) {
            console.error('Failed to restart job:', error);
        }
    };

    return (
        <div className="w-full max-w-[95%] md:max-w-[90%] lg:max-w-[85%] xl:max-w-[80%] mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2">
            <JobMenuBar
                jobName={currentJob.name}
                workflow={workflow}
                status={currentJob.status}
                needsInput={needsInput}
                areInputsValid={areInputsValid}
                onBack={() => {
                    resetCurrentJob();
                    navigate('/jobs');
                }}
                onStart={handleStart}
                onCancel={handleCancel}
                onRestart={handleRestart}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-12 gap-3 md:gap-6 py-4">
                {/* Steps List - Left Side */}
                <div className="col-span-3">
                    <JobStepsList
                        job={currentJob}
                        workflow={workflow}
                        needsInput={needsInput}
                    />
                </div>

                {/* Execution Details - Right Side */}
                <div className="col-span-9 space-y-6">
                    {needsInput ? (
                        <JobInputForm
                            workflowInputs={workflowInputs}
                            inputValues={inputValues}
                            inputErrors={inputErrors}
                            setInputValue={setInputValue}
                        />
                    ) : (
                        <>
                            {/* Live Status Dashboard */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                {/* Progress Bar Section */}
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                    <JobProgress job={currentJob} />
                                </div>

                                {/* Current Step Section - Only show for running or pending jobs */}
                                {(currentJob.status === JobStatus.RUNNING || currentJob.status === JobStatus.PENDING) && (
                                    <div className="p-4 job-live-output-container" style={{ minHeight: '450px' }}>
                                        <JobLiveOutput
                                            job={currentJob}
                                            workflow={workflow}
                                            executionState={executionState}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Job Summary - Only show for completed or failed jobs */}
                            {(currentJob.status === JobStatus.COMPLETED || currentJob.status === JobStatus.FAILED) && (
                                <JobSummary job={currentJob} />
                            )}

                            {/* Job History Log */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="border-b border-gray-100 dark:border-gray-700 p-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                                            Execution History
                                        </h2>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentJob.status === JobStatus.COMPLETED
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : currentJob.status === JobStatus.FAILED
                                                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                : currentJob.status === JobStatus.RUNNING
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                                            }`}>
                                            {currentJob.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <JobExecutionHistory
                                        job={currentJob}
                                        executionState={executionState}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Job; 
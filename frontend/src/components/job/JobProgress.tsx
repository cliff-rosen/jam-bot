import React from 'react';
import { Job, JobStatus } from '../../types/jobs';
import { useJobs } from '../../context/JobsContext';

interface JobProgressProps {
    job: Job;
}

export const JobProgress: React.FC<JobProgressProps> = ({ job }) => {
    const { executionState } = useJobs();
    //console.log('JobProgress.tsx', { job, executionState });

    // If we have executionState and it matches our job, use it
    // Otherwise fall back to job.execution_progress
    const progress = (executionState?.job_id === job.job_id)
        ? { current_step: executionState.current_step_index, total_steps: executionState.total_steps }
        : job.execution_progress;

    if (!progress) return null;

    const percentage = Math.round((progress.current_step / progress.total_steps) * 100);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${job.status === JobStatus.RUNNING ? 'bg-indigo-400 animate-pulse' :
                        job.status === JobStatus.COMPLETED ? 'bg-gray-400' :
                            job.status === JobStatus.FAILED ? 'bg-rose-400' :
                                'bg-gray-400'
                        }`} />
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                        Step {Math.min(progress.current_step + 1, progress.total_steps)} of {progress.total_steps}
                    </span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                    {percentage}% Complete
                </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${job.status === JobStatus.COMPLETED ? 'bg-gray-400' :
                        job.status === JobStatus.FAILED ? 'bg-rose-400' :
                            'bg-indigo-400'
                        }`}
                    style={{
                        width: `${percentage}%`
                    }}
                />
            </div>
        </div>
    );
}; 
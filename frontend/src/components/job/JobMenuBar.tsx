import React from 'react';
import { Button } from '../ui/button';
import { PlayCircle, StopCircle, ArrowLeft } from 'lucide-react';
import { JobStatus } from '../../types/jobs';
import { Workflow } from '../../types/workflows';

interface JobMenuBarProps {
    jobName: string;
    workflow: Workflow;
    status: JobStatus;
    needsInput: boolean;
    areInputsValid: () => boolean;
    onBack: () => void;
    onStart: () => void;
    onCancel: () => void;
    onRestart: () => void;
}

const JobMenuBar: React.FC<JobMenuBarProps> = ({
    jobName,
    workflow,
    status,
    needsInput,
    areInputsValid,
    onBack,
    onStart,
    onCancel,
    onRestart
}) => {
    return (
        <div className="flex items-center justify-between mb-6">
            {/* Left side: Back button and Job info */}
            <div className="flex items-center gap-6">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                </Button>

                <div className="flex flex-col gap-2">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                        {jobName}
                    </h1>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Workflow:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-50">{workflow.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Status:</span>
                            <span className={`inline-flex items-center gap-2 ${status === JobStatus.RUNNING ? 'text-blue-500 dark:text-blue-400' :
                                status === JobStatus.COMPLETED ? 'text-green-500 dark:text-green-400' :
                                    status === JobStatus.FAILED ? 'text-red-500 dark:text-red-400' :
                                        'text-gray-500 dark:text-gray-400'
                                }`}>
                                <span className={`h-2 w-2 rounded-full ${status === JobStatus.RUNNING ? 'bg-blue-500 animate-pulse' :
                                    status === JobStatus.COMPLETED ? 'bg-green-500' :
                                        status === JobStatus.FAILED ? 'bg-red-500' :
                                            'bg-gray-500'
                                    }`} />
                                {status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side: Job Controls */}
            <div className="flex gap-3">
                {status === JobStatus.PENDING && (
                    <Button
                        onClick={onStart}
                        disabled={needsInput && !areInputsValid()}
                        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors
                            ${needsInput && !areInputsValid()
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'}`}
                    >
                        <PlayCircle className="h-4 w-4 mr-1.5" />
                        Start Job
                    </Button>
                )}
                {status === JobStatus.RUNNING && (
                    <Button
                        onClick={onCancel}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium
                                 bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    >
                        <StopCircle className="h-4 w-4 mr-1.5" />
                        Cancel
                    </Button>
                )}
                {(status === JobStatus.COMPLETED || status === JobStatus.FAILED) && (
                    <Button
                        onClick={onRestart}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium
                                 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        <PlayCircle className="h-4 w-4 mr-1.5" />
                        Restart
                    </Button>
                )}
            </div>
        </div>
    );
};

export default JobMenuBar; 
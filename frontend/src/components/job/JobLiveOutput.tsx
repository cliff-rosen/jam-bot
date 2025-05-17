import React from 'react';
import { Link } from 'react-router-dom';
import { Job, JobStatus, JobStep, JobExecutionState } from '../../types/jobs';
import { Workflow } from '../../types/workflows';
import { WorkflowInputs } from './WorkflowInputs';
import { SchemaValueType } from '../../types/schema';
import { JobEngine } from '../../lib/job/jobEngine';

interface JobLiveOutputProps {
    job: Job;
    workflow: Workflow;
    step?: JobStep;
    executionState?: JobExecutionState;
}

export const JobLiveOutput: React.FC<JobLiveOutputProps> = ({ job, workflow, step, executionState }) => {
    // Get input variables using JobEngine
    const inputVariables = JobEngine.getInputVariables(job);

    // Get steps with outputs
    const stepsWithOutputs = job.steps
        .map((step, index) => ({
            index,
            step,
            outputs: step.latest_execution?.outputs || {}
        }))
        .filter(output => Object.keys(output.outputs).length > 0);

    // Format outputs for WorkflowOutputs component
    const formattedOutputs = stepsWithOutputs.map(({ step, outputs, index }) => ({
        step_type: step.step_type,
        label: step.label || `Step ${index + 1}`,
        outputs: outputs as Record<string, SchemaValueType>
    }));

    // Get final step output
    const finalStepOutput = formattedOutputs[formattedOutputs.length - 1]?.outputs || {};
    const otherOutputs = formattedOutputs.slice(0, -1);

    // Get current step information
    const currentStepIndex = job.execution_progress?.current_step || 0;
    const currentStep = currentStepIndex < job.steps.length ? job.steps[currentStepIndex] : undefined;

    // Status badge styling
    const getStatusBadgeClass = (status: JobStatus) => {
        switch (status) {
            case JobStatus.RUNNING:
                return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case JobStatus.COMPLETED:
                return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case JobStatus.FAILED:
                return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };

    return (
        <div className="min-h-[400px]">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                        Current Execution
                    </h2>
                    {workflow && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Running <Link to={`/workflow/${workflow.workflow_id}`} className="text-blue-600 hover:underline">{workflow.name}</Link>
                        </p>
                    )}
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClass(job.status)}`}>
                    {job.status}
                </span>
            </div>

            {/* Current step */}
            {currentStep && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">Current Step</h3>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {currentStep.label || `Step ${currentStepIndex + 1}`}
                            </h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(currentStep.status)}`}>
                                {currentStep.status}
                            </span>
                        </div>

                        {currentStep.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {currentStep.description}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Live output */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">Live Output</h3>
                </div>
                <div className="h-48 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-auto">
                    {executionState?.live_output ? (
                        <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                            {executionState.live_output}
                        </pre>
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                No live output available
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Inputs and Outputs */}
            {inputVariables.length > 0 && (
                <div className="mb-6">
                    <div className="mb-2">
                        <h3 className="text-base font-medium text-gray-700 dark:text-gray-300">Workflow Inputs</h3>
                    </div>
                    <WorkflowInputs inputs={inputVariables} />
                </div>
            )}


        </div>
    );
}; 
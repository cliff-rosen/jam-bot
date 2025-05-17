import React from 'react';
import { WorkflowStepType, WorkflowStep } from '@/types/workflows';
import ActionStepEditor from './ActionStepEditor';
import ActionStepRunner from './ActionStepRunner';
import EvaluationStepRunner from './EvaluationStepRunner';

interface StepDetailProps {
    step: WorkflowStep;
    isEditMode: boolean;
    stepExecuted: boolean;
    isExecuting: boolean;
    onStepUpdate: (step: WorkflowStep) => void;
    onStepDelete: (stepId: string) => void;
}

const StepDetail: React.FC<StepDetailProps> = ({
    step,
    isEditMode,
    stepExecuted,
    isExecuting,
    onStepUpdate,
    onStepDelete
}) => {
    if (!step) {
        return <div>Error: No step provided</div>;
    }
    const isEvaluationStep = step.step_type === WorkflowStepType.EVALUATION;

    // In edit mode, action and evaluation steps use the editor
    if (isEditMode) {
        return (
            <ActionStepEditor
                step={step}
                onStepUpdate={onStepUpdate}
                onDeleteRequest={() => onStepDelete(step.step_id)}
            />
        );
    }

    if (isEvaluationStep) {
        return (
            <EvaluationStepRunner
                step={step}
                isExecuted={stepExecuted}
                isExecuting={isExecuting}
            />
        );
    }

    return (
        <ActionStepRunner
            actionStep={step}
            isExecuted={stepExecuted}
            isExecuting={isExecuting}
        />
    );
};

export default StepDetail; 
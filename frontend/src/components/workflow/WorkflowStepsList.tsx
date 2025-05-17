import React from 'react';
import { WorkflowStep } from '@/types/workflows';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStep } from './SortableStep';

interface WorkflowStepsListProps {
    steps: WorkflowStep[];
    activeStep: number;
    isEditMode: boolean;
    onStepClick: (index: number) => void;
    onAddStep: () => void;
    onReorder?: (steps: WorkflowStep[]) => void;
    onStepDelete: (stepId: string) => void;
    isCollapsed?: boolean;
}

const WorkflowStepsList: React.FC<WorkflowStepsListProps> = ({
    steps,
    activeStep,
    isEditMode,
    onStepClick,
    onAddStep,
    onReorder,
    onStepDelete,
    isCollapsed = false,
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = steps.findIndex((step) => step.step_id === active.id);
            const newIndex = steps.findIndex((step) => step.step_id === over.id);

            const newSteps = arrayMove(steps, oldIndex, newIndex);
            onReorder?.(newSteps);
        }
    };

    if (isCollapsed) {
        return (
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="flex flex-col gap-2 p-2">
                    {steps.map((step, index) => (
                        <button
                            key={step.step_id}
                            onClick={() => onStepClick(index)}
                            className={`w-full flex justify-center p-2 rounded-md transition-colors
                                ${index === activeStep
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                }`}
                            title={step.label}
                        >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                                ${index == activeStep
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                            >
                                {index + 1}
                            </div>
                        </button>
                    ))}

                    {isEditMode && (
                        <button
                            onClick={onAddStep}
                            className="w-full flex justify-center p-2 rounded-md transition-colors
                                text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Add Step"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm
                                border-2 border-dashed border-blue-400 dark:border-blue-500 text-blue-500 dark:text-blue-400"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-0">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={steps.map(step => step.step_id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col gap-2 p-2">
                        {steps.map((step, index) => (
                            <SortableStep
                                key={step.step_id}
                                step={step}
                                index={index}
                                isActive={index === activeStep}
                                isCompleted={index < activeStep && !isEditMode}
                                isEditMode={isEditMode}
                                onClick={() => onStepClick(index)}
                                onDelete={() => onStepDelete(step.step_id)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add Step Button */}
            {isEditMode && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700 sticky bottom-0">
                    <button
                        onClick={onAddStep}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium
                            text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors
                            border border-dashed border-blue-300 dark:border-blue-500/50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Step</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorkflowStepsList; 
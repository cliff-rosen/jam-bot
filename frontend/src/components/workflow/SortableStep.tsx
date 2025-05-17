import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkflowStep } from '../../types/workflows';
import { GripVertical } from 'lucide-react';

interface SortableStepProps {
    step: WorkflowStep;
    index: number;
    isActive: boolean;
    isCompleted: boolean;
    isEditMode: boolean;
    onClick: () => void;
    onDelete: () => void;
}

export const SortableStep: React.FC<SortableStepProps> = ({
    step,
    index,
    isActive,
    isCompleted,
    isEditMode,
    onClick,
    onDelete,
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step.step_id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isEditMode ? 'cursor-pointer' : ''}
                    ${isDragging ? 'opacity-50' : ''}
                    ${isActive
                        ? 'bg-blue-50/70 border border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500/40 dark:text-blue-300'
                        : isCompleted
                            ? 'bg-emerald-50/70 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-500/30 dark:text-emerald-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-200 text-gray-600 dark:border-gray-700/50 dark:text-gray-400'
                    }`}
                onClick={onClick}
            >
                {isEditMode && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>
                )}
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium shrink-0
                    ${isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                        : isCompleted
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                >
                    {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{step.label}</div>
                </div>
                {isEditMode && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete Step"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            Delete Step
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this step?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onDelete();
                                    setShowDeleteConfirm(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}; 
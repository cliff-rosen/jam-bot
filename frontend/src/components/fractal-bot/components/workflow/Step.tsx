import React, { useMemo, useState } from 'react';
import type { Step, Tool, WorkflowVariable, StepStatus, VariableStatus, VariableMapping } from '../../types';
import { Pencil, Sparkles, Plus, Trash2, AlertCircle, CheckCircle2, Clock, Settings, ArrowRight, XCircle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { getFilteredInputs, getStepStatus, getAvailableInputs } from '../../utils/variableScoping';
import { doSchemasMatch } from '../../types';
import { useFractalBot } from '@/context/FractalBotContext';

interface StepProps {
    step: Step;
    parentStep?: Step;
    onAddSubstep: (step: Step) => void;
    onEditStep?: (step: Step) => void;
    onDeleteStep?: (stepId: string) => void;
    onStepTypeChange?: (step: Step, type: 'atomic' | 'composite') => void;
    onToolSelect?: (step: Step, toolId: string) => void;
    onInputSelect?: (step: Step, input: WorkflowVariable) => void;
    onOutputSelect?: (step: Step, output: WorkflowVariable) => void;
    onUpdateStep: (step: Step) => void;
    availableTools?: Tool[];
    availableInputs?: WorkflowVariable[];
    depth?: number;
}

// Helper component for step status display
const StepStatusDisplay = ({ status }: { status: StepStatus }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'unresolved':
                return 'bg-red-500';
            case 'pending_inputs_ready':
                return 'bg-yellow-500';
            case 'ready':
                return 'bg-green-500';
            case 'in_progress':
                return 'bg-blue-500';
            case 'completed':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <span className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></span>
    );
};

// Helper component for input mapping list
const InputMappingList = ({
    step,
    availableInputs,
    onInputMapping
}: {
    step: Step;
    availableInputs: WorkflowVariable[];
    onInputMapping: (mappingIndex: number, sourceVariableId: string) => void;
}) => {
    return (
        <div className="space-y-1">
            {step.inputMappings.map((mapping, index) => (
                <div key={index} className="flex items-center justify-between gap-2">
                    <div className="w-1/3">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                {mapping.target.type === 'parameter' ? mapping.target.name : 'Input'}
                            </span>
                            {mapping.target.type === 'parameter' && mapping.target.required && (
                                <span className="text-xs text-red-500 flex-none">*</span>
                            )}
                        </div>
                    </div>
                    <select
                        value={mapping.sourceVariableId}
                        onChange={(e) => onInputMapping(index, e.target.value)}
                        className="flex-1 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">Select input</option>
                        {availableInputs.map(input => (
                            <option key={input.variable_id} value={input.variable_id}>
                                {input.name}
                            </option>
                        ))}
                    </select>
                </div>
            ))}
        </div>
    );
};

// Helper component for output mapping list
const OutputMappingList = ({
    step,
    onOutputMapping,
    availableInputs,
    parentStep,
    onUpdateStep
}: {
    step: Step;
    onOutputMapping: (outputIndex: number, sourceVariableId: string) => void;
    availableInputs: WorkflowVariable[];
    parentStep?: Step;
    onUpdateStep: (step: Step) => void;
}) => {
    const selectedTool = step.tool_id ? step.tool : undefined;
    const [isCreatingNew, setIsCreatingNew] = useState<number | null>(null);
    const [newOutputName, setNewOutputName] = useState('');
    const [newOutputType, setNewOutputType] = useState<'string' | 'number' | 'boolean' | 'object'>('string');

    // Get available outputs from ancestor steps
    const getAvailableOutputs = () => {
        const availableOutputs: WorkflowVariable[] = [];


        return availableOutputs;
    };

    const handleCreateNewOutput = (outputIndex: number) => {
        const selectedTool = step.tool;
        if (!selectedTool) return;

        const outputSchema = selectedTool.outputs[outputIndex].schema;
        const newVariable: WorkflowVariable = {
            variable_id: crypto.randomUUID(),
            name: newOutputName || `Output ${outputIndex + 1}`,
            schema: {
                type: newOutputType,
                is_array: outputSchema.is_array,
                description: selectedTool.outputs[outputIndex].description || ''
            },
            io_type: 'output',
            status: 'pending',
            createdBy: step.id
        };

        // Update the mapping to point to this new variable
        const updatedMappings = step.outputMappings.map((m, i) =>
            i === outputIndex
                ? {
                    ...m,
                    sourceVariableId: newVariable.variable_id,
                    target: {
                        type: 'variable' as const,
                        variableId: newVariable.variable_id
                    }
                }
                : m
        );

        onUpdateStep({
            ...step,
            state: [...step.state, newVariable],
            outputMappings: updatedMappings
        });

        setIsCreatingNew(null);
        setNewOutputName('');
        setNewOutputType('string');
    };

    const availableOutputs = getAvailableOutputs();

    return (
        <div className="space-y-1">
            {step.outputMappings.map((mapping, index) => {
                const outputName = selectedTool?.outputs[index]?.name || `Output ${index + 1}`;
                const outputDescription = selectedTool?.outputs[index]?.description;
                const outputSchema = selectedTool?.outputs[index]?.schema;

                return (
                    <div key={index} className="flex items-center justify-between gap-2">
                        <div className="w-1/3">
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                    {outputName}
                                </span>
                                {mapping.sourceVariableId && (
                                    <div className="w-2 h-2 rounded-full flex-none" style={{
                                        backgroundColor: step.state.find(v => v.variable_id === mapping.sourceVariableId)?.status === 'ready'
                                            ? 'rgb(34 197 94)' // green-500
                                            : step.state.find(v => v.variable_id === mapping.sourceVariableId)?.status === 'error'
                                                ? 'rgb(239 68 68)' // red-500
                                                : 'rgb(234 179 8)' // yellow-500
                                    }} />
                                )}
                            </div>
                            {outputDescription && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                    {outputDescription}
                                </p>
                            )}
                        </div>
                        {isCreatingNew === index ? (
                            <div className="flex-1 flex flex-col gap-2">
                                <input
                                    type="text"
                                    value={newOutputName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOutputName(e.target.value)}
                                    placeholder="Output name"
                                    className="text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <select
                                    value={newOutputType}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewOutputType(e.target.value as 'string' | 'number' | 'boolean' | 'object')}
                                    className="text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Boolean</option>
                                    <option value="object">Object</option>
                                </select>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleCreateNewOutput(index)}
                                        className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => setIsCreatingNew(null)}
                                        className="text-xs px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-900/50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex gap-2">
                                <select
                                    value={mapping.sourceVariableId || ''}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onOutputMapping(index, e.target.value)}
                                    className="flex-1 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">Select output</option>
                                    {availableOutputs
                                        .filter((output: WorkflowVariable) => {
                                            if (!outputSchema) return true;
                                            return doSchemasMatch(output.schema, outputSchema).isMatch;
                                        })
                                        .map((output: WorkflowVariable) => (
                                            <option key={output.variable_id} value={output.variable_id}>
                                                {output.name}
                                            </option>
                                        ))
                                    }
                                </select>
                                <button
                                    onClick={() => setIsCreatingNew(index)}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 flex-none"
                                >
                                    New
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// Helper function to create a new step with proper defaults
const createNewStep = (parentStep?: Step, priorSibling?: Step): Step => {
    const newStep: Step = {
        id: crypto.randomUUID(),
        name: 'New Step',
        description: '',
        type: 'atomic',
        tool_id: '',
        state: [],
        inputMappings: [],
        outputMappings: [],
        status: 'unresolved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // If this is a stage-level step (no parentStep), we should see stage inputs
    if (!parentStep) {
        // Stage inputs will be available through getAvailableInputs
        // We don't need to do anything special here as the stage's inputs
        // will be automatically available through the stepAvailableInputs
        // calculation in the main Step component
        return newStep;
    }

    // For substeps, we need to consider parent's child variables and prior siblings
    if (priorSibling) {
        // Get outputs from prior sibling that aren't mapped to parent outputs
        const siblingOutputs = priorSibling.state.filter(v =>
            !priorSibling.outputMappings.some(m =>
                m.isParentOutput && m.target.type === 'variable' && m.target.variableId === v.variable_id
            )
        );

        // These will be available through getAvailableInputs
        return newStep;
    }

    return newStep;
};

export default function Step({
    step,
    parentStep,
    onAddSubstep,
    onDeleteStep,
    onStepTypeChange,
    onToolSelect,
    onInputSelect,
    onOutputSelect,
    onUpdateStep,
    availableTools = [],
    availableInputs = [],
    depth = 0
}: StepProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [stepName, setStepName] = useState(step.name);
    const [stepDescription, setStepDescription] = useState(step.description);

    // Get available inputs based on step position
    const stepAvailableInputs = useMemo(() => {
        if (!availableInputs) return [];
        return availableInputs;
    }, [availableInputs]);

    // Get filtered inputs based on selected tool
    const filteredInputs = useMemo(() => {
        if (!step.tool_id) return [];
        const selectedTool = availableTools.find(t => t.id === step.tool_id);
        if (!selectedTool) return [];
        return getFilteredInputs(stepAvailableInputs, [selectedTool]);
    }, [step.tool_id, availableTools, stepAvailableInputs]);

    // Get step status
    const stepStatus = useMemo(() => {
        return getStepStatus(step);
    }, [step]);

    const handleAISuggestion = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Implement AI suggestion
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteStep?.(step.id);
    };

    const handleStepTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        onStepTypeChange?.(step, e.target.value as 'atomic' | 'composite');
    };

    const handleToolSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        const toolId = e.target.value;
        if (!toolId) return;

        const selectedTool = availableTools.find(t => t.id === toolId);
        if (!selectedTool) return;

        // Create input mappings to connect available inputs to tool parameters
        const inputMappings: VariableMapping[] = selectedTool.inputs.map(input => ({
            sourceVariableId: '', // Will be set when user selects from available inputs
            target: {
                type: 'parameter' as const,
                name: input.name,
                schema: input.schema,
                required: input.required
            }
        }));

        // Initialize empty output mappings
        const outputMappings: VariableMapping[] = selectedTool.outputs.map(output => ({
            sourceVariableId: '', // Will be set when user maps to a variable
            target: {
                type: 'variable' as const,
                variableId: '' // Will be set when user creates or selects a variable
            }
        }));

        onUpdateStep({
            ...step,
            tool_id: toolId,
            inputMappings,
            outputMappings
        });
    };

    const handleInputMapping = (mappingIndex: number, sourceVariableId: string) => {
        const updatedMappings = step.inputMappings.map((m, i) =>
            i === mappingIndex
                ? { ...m, sourceVariableId }
                : m
        );

        onUpdateStep({
            ...step,
            inputMappings: updatedMappings
        });
    };

    const handleOutputMapping = (outputIndex: number, sourceVariableId: string) => {
        const updatedMappings = step.outputMappings.map((m, i) =>
            i === outputIndex
                ? {
                    ...m,
                    sourceVariableId,
                    target: {
                        type: 'variable' as const,
                        variableId: sourceVariableId
                    }
                }
                : m
        );

        onUpdateStep({
            ...step,
            outputMappings: updatedMappings
        });
    };

    const handleAddSubstep = () => {
        const newStep = createNewStep(step);
        console.log('step', step);
        console.log('newStep', newStep);
        onAddSubstep(step);
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        onUpdateStep({
            ...step,
            name: stepName,
            description: stepDescription
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setStepName(step.name);
        setStepDescription(step.description);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-[40px_240px_1fr_1fr_120px] gap-4 items-start">
                {/* Status Column */}
                <div className="flex items-center justify-center pt-1.5">
                    <StepStatusDisplay status={stepStatus} />
                </div>

                {/* Name and Description Column */}
                <div className="flex items-start gap-2 min-w-0">
                    <div style={{ marginLeft: `${(depth - 1) * 20}px` }} className="flex flex-col gap-1 min-w-0">
                        {depth > 0 && (
                            <div className="flex items-center">
                                <div className="relative w-4 h-4 flex items-center justify-center">
                                    <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
                                    <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gray-300 dark:bg-gray-600"></div>
                                    <div className="w-2 h-2 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                        <ArrowRight className="w-2 h-2" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {isEditing ? (
                            <div className="flex flex-col gap-2 w-full">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={stepName}
                                        onChange={(e) => setStepName(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full"
                                        placeholder="Step name"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSave}
                                        className="p-1 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                                <textarea
                                    value={stepDescription}
                                    onChange={(e) => setStepDescription(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full resize-none"
                                    placeholder="Step description"
                                    rows={2}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 group">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{step.name}</h3>
                                    <button
                                        onClick={handleEdit}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>
                                {step.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{step.description}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Type Selection Column */}
                <div className="flex items-center">
                    <select
                        value={step.type || 'atomic'}
                        onChange={handleStepTypeChange}
                        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="atomic">Atomic</option>
                        <option value="composite">Composite</option>
                    </select>
                </div>

                {/* Tool Selection Column */}
                <div className="flex items-center">
                    {step.type === 'atomic' ? (
                        <select
                            value={step.tool_id || ''}
                            onChange={handleToolSelect}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Select a tool</option>
                            {availableTools.map((tool) => (
                                <option key={tool.id} value={tool.id}>
                                    {tool.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <button
                            onClick={handleAddSubstep}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        >
                            <Plus className="w-3 h-3" />
                            <span>Add Substep</span>
                        </button>
                    )}
                </div>

                {/* Actions Column */}
                <div className="flex items-center gap-1 justify-end">
                    <button
                        onClick={handleAISuggestion}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <Sparkles className="w-3 h-3" />
                    </button>
                    <button
                        onClick={handleDeleteClick}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Inputs and Outputs - Only show for atomic steps with a selected tool */}
            {step.type === 'atomic' && (
                <div className="mt-2 grid grid-cols-[40px_240px_1fr_1fr_120px] gap-4" style={{ marginLeft: `${depth * 20}px` }}>
                    <div></div> {/* Empty cell to align with status column */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Available Inputs</h4>
                        <div className="space-y-1">
                            {stepAvailableInputs.map((input) => {
                                const isCompatible = step.tool_id ?
                                    filteredInputs.some(fi => fi.variable_id === input.variable_id) :
                                    true;

                                return (
                                    <div
                                        key={input.variable_id}
                                        className={`text-xs flex items-center gap-1 ${isCompatible
                                            ? 'text-gray-600 dark:text-gray-300'
                                            : 'text-gray-400 dark:text-gray-500 line-through'
                                            }`}
                                    >
                                        {input.name}
                                        {!isCompatible && step.tool_id && (
                                            <div className="group relative">
                                                <HelpCircle className="w-3 h-3" />
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                                                    Incompatible with selected tool's requirements
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {(!stepAvailableInputs || stepAvailableInputs.length === 0) && (
                                <div className="text-xs text-gray-400 dark:text-gray-400">No available inputs</div>
                            )}
                        </div>
                    </div>
                    {step.tool_id && (
                        <>
                            <div className="bg-white/50 dark:bg-gray-700/50 p-2 rounded-lg">
                                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Inputs</h4>
                                <InputMappingList
                                    step={step}
                                    availableInputs={stepAvailableInputs}
                                    onInputMapping={handleInputMapping}
                                />
                            </div>
                            <div className="bg-white/50 dark:bg-gray-700/50 p-2 rounded-lg">
                                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Outputs</h4>
                                <OutputMappingList
                                    step={step}
                                    onOutputMapping={handleOutputMapping}
                                    availableInputs={stepAvailableInputs}
                                    parentStep={parentStep}
                                    onUpdateStep={onUpdateStep}
                                />
                            </div>
                        </>
                    )}
                    <div></div> {/* Empty cell to align with actions column */}
                </div>
            )}

            {/* Substeps */}
            {step.type === 'composite' && (
                <div className="mt-2 space-y-2">
                    {step.substeps?.map((substep) => (
                        <Step
                            key={substep.id}
                            step={substep}
                            parentStep={step}
                            onAddSubstep={onAddSubstep}
                            onDeleteStep={onDeleteStep}
                            onStepTypeChange={onStepTypeChange}
                            onToolSelect={onToolSelect}
                            onInputSelect={onInputSelect}
                            onOutputSelect={onOutputSelect}
                            onUpdateStep={onUpdateStep}
                            availableTools={availableTools}
                            availableInputs={stepAvailableInputs}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
} 
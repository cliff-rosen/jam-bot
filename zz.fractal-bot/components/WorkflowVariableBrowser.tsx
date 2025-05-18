import React, { useState } from 'react';
import { ArrowRight, Database } from 'lucide-react';
import type { WorkflowVariable, Stage, Step, Mission, VariableMapping, MappingTarget, VariableTarget, VariableStatus } from '../types';
import { useFractalBot } from '@/context/FractalBotContext';

interface WorkflowVariableBrowserProps {
    className?: string;
    stages: Stage[];
    mission: Mission;
}

const getVariableIcon = (io_type: string) => {
    switch (io_type) {
        case 'input':
            return <ArrowRight className="w-4 h-4 rotate-180" />;
        case 'output':
            return <ArrowRight className="w-4 h-4" />;
        default:
            return <Database className="w-4 h-4" />;
    }
};

// Helper function to get all ancestor steps of a step
const getAncestors = (targetStep: Step, stages: Stage[]): Step[] => {
    const ancestors: Step[] = [];
    let currentStep = targetStep;

    // Find the stage containing this step
    const stage = stages.find(s => s.steps.some(st => st.id === currentStep.id));
    if (!stage) return ancestors;

    // Find the step in the stage
    const findStepInStage = (steps: Step[], targetId: string): Step | undefined => {
        for (const s of steps) {
            if (s.id === targetId) return s;
            if (s.substeps) {
                const found = findStepInStage(s.substeps, targetId);
                if (found) return found;
            }
        }
        return undefined;
    };

    // Traverse up the tree
    while (currentStep) {
        const parentStep = findStepInStage(stage.steps, currentStep.id);
        if (!parentStep) break;

        // Find the parent of this step
        const findParent = (steps: Step[], targetId: string): Step | undefined => {
            for (const s of steps) {
                if (s.substeps?.some(sub => sub.id === targetId)) return s;
                if (s.substeps) {
                    const found = findParent(s.substeps, targetId);
                    if (found) return found;
                }
            }
            return undefined;
        };

        const parent = findParent(stage.steps, currentStep.id);
        if (!parent) break;

        ancestors.push(parent);
        currentStep = parent;
    }

    return ancestors;
};

// Helper function to get outputs from prior siblings of a step
const getPriorSiblingOutputs = (targetStep: Step, stages: Stage[]): WorkflowVariable[] => {
    const outputs: WorkflowVariable[] = [];
    const stage = stages.find(s => s.steps.some(st => st.id === targetStep.id));
    if (!stage) return outputs;

    const findStepInStage = (steps: Step[], targetId: string): { step: Step, siblings: Step[] } | undefined => {
        for (const s of steps) {
            if (s.id === targetId) return { step: s, siblings: steps };
            if (s.substeps) {
                const found = findStepInStage(s.substeps, targetId);
                if (found) return found;
            }
        }
        return undefined;
    };

    const result = findStepInStage(stage.steps, targetStep.id);
    if (!result) return outputs;

    const { step, siblings } = result;
    const currentIndex = siblings.findIndex(s => s.id === step.id);

    // Get outputs from prior siblings
    for (let i = 0; i < currentIndex; i++) {
        const sibling = siblings[i];
        // Only include outputs that weren't mapped to parent outputs
        const newOutputs = sibling.outputMappings
            .filter(mapping => !mapping.isParentOutput)
            .map(mapping => mapping.targetVariable);
        outputs.push(...newOutputs);
    }

    return outputs;
};

// Helper function to get available inputs for a step
const getAvailableInputs = (step: Step, stages: Stage[], mission: Mission): WorkflowVariable[] => {
    const availableInputs: WorkflowVariable[] = [];

    // Always include all mission inputs
    if (mission.childVariables) {
        availableInputs.push(...mission.childVariables.filter(v => v.io_type === 'input'));
    }

    // Get outputs from all ancestors
    const ancestors = getAncestors(step, stages);
    ancestors.forEach(ancestor => {
        // Only include outputs that weren't mapped to parent outputs
        const ancestorOutputs = ancestor.outputMappings
            .filter(mapping => !mapping.isParentOutput)
            .map(mapping => mapping.targetVariable);
        availableInputs.push(...ancestorOutputs);
    });

    // Get outputs from prior siblings of all ancestors
    ancestors.forEach(ancestor => {
        const priorSiblingOutputs = getPriorSiblingOutputs(ancestor, stages);
        availableInputs.push(...priorSiblingOutputs);
    });

    // Get outputs from prior siblings of the current step
    const priorSiblingOutputs = getPriorSiblingOutputs(step, stages);
    availableInputs.push(...priorSiblingOutputs);

    return availableInputs;
};

const WorkflowVariableBrowser: React.FC<WorkflowVariableBrowserProps> = ({ className = '', stages, mission }) => {
    const {
        state,
        updateStepInput,
        updateStepOutput
    } = useFractalBot();

    const [selectedStep, setSelectedStep] = useState<string | null>(null);

    const getAvailableInputs = (stepId: string) => {
        if (!mission?.childVariables) return [];
        return mission.childVariables.filter((v: WorkflowVariable) => v.io_type === 'input');
    };

    const getAvailableOutputs = (stepId: string) => {
        if (!mission?.childVariables) return [];
        return mission.childVariables.filter((v: WorkflowVariable) => v.io_type === 'output');
    };

    const getMappedInputs = (stepId: string) => {
        if (!mission?.inputMappings) return [];
        return mission.inputMappings.filter((m: VariableMapping) => m.sourceVariableId === stepId);
    };

    const getMappedOutputs = (stepId: string) => {
        if (!mission?.outputMappings) return [];
        return mission.outputMappings.filter((m: VariableMapping) => m.sourceVariableId === stepId);
    };

    const handleInputMapping = (stepId: string, inputId: string) => {
        const input: WorkflowVariable = {
            variable_id: inputId,
            name: getAvailableInputs(stepId).find((v: WorkflowVariable) => v.variable_id === inputId)?.name || '',
            io_type: 'input',
            schema: {
                type: 'string',
                is_array: false,
                description: ''
            },
            status: 'pending' as VariableStatus,
            createdBy: stepId
        };
        updateStepInput(mission.id, stepId, input);
    };

    const handleOutputMapping = (stepId: string, outputId: string) => {
        const output: WorkflowVariable = {
            variable_id: outputId,
            name: getAvailableOutputs(stepId).find((v: WorkflowVariable) => v.variable_id === outputId)?.name || '',
            io_type: 'output',
            schema: {
                type: 'string',
                is_array: false,
                description: ''
            },
            status: 'pending' as VariableStatus,
            createdBy: stepId
        };
        updateStepOutput(mission.id, stepId, output);
    };

    const getVariableIdFromTarget = (target: MappingTarget): string | undefined => {
        if (target.type === 'variable') {
            return target.variableId;
        }
        return undefined;
    };

    const getMappedVariableId = (mappings: VariableMapping[], variableId: string): string | undefined => {
        const mapping = mappings.find((m: VariableMapping) => m.sourceVariableId === variableId);
        if (mapping && mapping.target.type === 'variable') {
            return mapping.target.variableId;
        }
        return undefined;
    };

    return (
        <div className={`dark:bg-[#1e2330] ${className}`}>
            <div className="p-4">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Workflow Variables</h2>
                <div className="mt-4 space-y-4">
                    {stages.map((stage) => (
                        <div key={stage.id} className="bg-gray-50 dark:bg-[#252b3b] p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{stage.name}</h3>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Inputs</h4>
                                    <div className="mt-1 space-y-1">
                                        {getAvailableInputs(stage.id).map((input: WorkflowVariable) => (
                                            <div key={input.variable_id} className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600 dark:text-gray-300">{input.name}</span>
                                                <select
                                                    className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                                                    value={getMappedVariableId(getMappedInputs(stage.id), input.variable_id) || ''}
                                                    onChange={(e) => handleInputMapping(stage.id, input.variable_id)}
                                                >
                                                    <option value="">Select mapping</option>
                                                    {getAvailableInputs(stage.id).map((i: WorkflowVariable) => (
                                                        <option key={i.variable_id} value={i.variable_id}>
                                                            {i.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Outputs</h4>
                                    <div className="mt-1 space-y-1">
                                        {getAvailableOutputs(stage.id).map((output: WorkflowVariable) => (
                                            <div key={output.variable_id} className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600 dark:text-gray-300">{output.name}</span>
                                                <select
                                                    className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                                                    value={getMappedVariableId(getMappedOutputs(stage.id), output.variable_id) || ''}
                                                    onChange={(e) => handleOutputMapping(stage.id, output.variable_id)}
                                                >
                                                    <option value="">Select mapping</option>
                                                    {getAvailableOutputs(stage.id).map((o: WorkflowVariable) => (
                                                        <option key={o.variable_id} value={o.variable_id}>
                                                            {o.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WorkflowVariableBrowser; 
import { Step, Stage, Workflow, WorkflowVariable, doSchemasMatch, StepStatus, Tool, ParameterTarget } from '../types/index';
import { useFractalBot } from '@/context/FractalBotContext';

// Helper function to get available inputs for a step or workflow
export function getAvailableInputs(workflow: Workflow, step?: Step): WorkflowVariable[] {
    if (!workflow || !workflow.state) {
        return [];
    }

    const availableInputs: WorkflowVariable[] = [];

    // Add workflow inputs from state
    const workflowInputs = workflow.state.filter(v =>
        v.io_type === 'input'
    );
    availableInputs.push(...workflowInputs);

    // Add outputs from previous stages
    if (workflow.stages) {
        const previousStages = workflow.stages.slice(0, workflow.stages.findIndex(s =>
            s.steps.some(st => st.id === step?.id)
        ));
        previousStages.forEach(stage => {
            if (stage.state) {
                const stageOutputs = stage.state.filter(v =>
                    v.io_type === 'output'
                );
                availableInputs.push(...stageOutputs);
            }
        });
    }

    // If this is a step, add outputs from prior siblings
    if (step) {
        // Find the stage containing this step
        const findStage = (stages: Stage[]): Stage | undefined => {
            for (const stage of stages) {
                // Check if step is directly in this stage
                if (stage.steps.some(s => s.id === step.id)) {
                    return stage;
                }
                // Check if step is in any substeps
                const findInSubsteps = (steps: Step[]): boolean => {
                    for (const s of steps) {
                        if (s.id === step.id) return true;
                        if (s.substeps && findInSubsteps(s.substeps)) return true;
                    }
                    return false;
                };
                if (findInSubsteps(stage.steps)) {
                    return stage;
                }
            }
            return undefined;
        };

        const stage = findStage(workflow.stages || []);
        if (stage) {
            // Find all prior siblings in the stage
            const findPriorSiblings = (steps: Step[], targetId: string): Step[] => {
                const priorSiblings: Step[] = [];
                for (const s of steps) {
                    if (s.id === targetId) break;
                    priorSiblings.push(s);
                    if (s.substeps) {
                        priorSiblings.push(...findPriorSiblings(s.substeps, targetId));
                    }
                }
                return priorSiblings;
            };

            const priorSiblings = findPriorSiblings(stage.steps, step.id);
            priorSiblings.forEach(sibling => {
                if (sibling.state) {
                    const siblingOutputs = sibling.state.filter(v =>
                        v.io_type === 'output'
                    );
                    availableInputs.push(...siblingOutputs);
                }
            });
        }
    }

    return availableInputs;
}

// Helper function to get filtered inputs based on available tools
export function getFilteredInputs(
    availableInputs: WorkflowVariable[],
    tools: Tool[]
): WorkflowVariable[] {
    // Get all required input types from tools
    const requiredTypes = tools.flatMap(tool =>
        tool.inputs.map(input => ({
            type: input.schema.type,
            required: input.required
        }))
    );

    // Filter inputs that match any of the required types
    return availableInputs.filter(input => {
        return requiredTypes.some(required =>
            required.type === input.schema.type
        );
    });
}

// Helper function to validate input mapping
export function validateInputMapping(
    sourceVariable: WorkflowVariable,
    targetVariable: WorkflowVariable
): boolean {
    const match = doSchemasMatch(sourceVariable.schema, targetVariable.schema);
    return match.isMatch;
}

// Helper function to validate output mapping
export function validateOutputMapping(
    sourceVariable: WorkflowVariable,
    targetVariable: WorkflowVariable,
    isParentOutput: boolean
): boolean {
    // For parent outputs, we need exact schema match
    if (isParentOutput) {
        const match = doSchemasMatch(sourceVariable.schema, targetVariable.schema);
        return match.isMatch;
    }

    // For intermediate outputs, we just need compatible types
    return sourceVariable.schema.type === targetVariable.schema.type;
}

export function getStepFromTree(treeStart: Step | Stage, stepId: string): Step | Stage | undefined {
    console.log('getStepFromTree', treeStart.id, stepId);
    if (treeStart.id === stepId) {
        return treeStart;
    }

    const stepsToSearch = [];

    if ('steps' in treeStart) {
        stepsToSearch.push(...treeStart.steps);
    } else {
        stepsToSearch.push(treeStart);
    }

    while (stepsToSearch.length > 0) {
        const step = stepsToSearch.shift();
        if (!step) continue;
        if (step.id === stepId) {
            console.log('found step', step.id);
            return step;
        }
        if (step.substeps) {
            console.log('searching substeps', step.substeps);
            stepsToSearch.push(...step.substeps);
        }
    }

    console.log('no step found from ', treeStart.id);

    return undefined;
}

export function getStepFromId(stepId: string): Step | undefined {
    const { state } = useFractalBot();
    const { currentWorkflow } = state;

    for (const stage of currentWorkflow.stages) {
        const result = getStepFromTree(stage, stepId);
        if (result && !('steps' in result)) {
            return result as Step;
        }
    }

    return undefined;
}

export function getAvailableOutputVariables(task: Step | Stage, workflow: Workflow): WorkflowVariable[] {
    const availableOutputs: WorkflowVariable[] = [];

    // Always include workflow-level variables
    availableOutputs.push(...workflow.state);

    // If it's a stage, we're done - can only map to workflow vars
    if ('steps' in task) {
        return availableOutputs;
    }

    // Helper to find a step's parent stage and step by recursively searching
    function findParents(currentStep: Step): { parentStage: Stage | undefined, parentStep: Step | undefined } {
        for (const stage of workflow.stages) {
            // Recursive helper to search through step tree
            function findInStepTree(step: Step): { parentStage: Stage | undefined, parentStep: Step | undefined } | null {
                if (step.substeps) {
                    for (const substep of step.substeps) {
                        if (substep.id === currentStep.id) {
                            return { parentStage: stage, parentStep: step };
                        }
                        const result = findInStepTree(substep);
                        if (result) return result;
                    }
                }
                return null;
            }

            // Search in each step of the stage
            for (const step of stage.steps) {
                if (step.id === currentStep.id) {
                    return { parentStage: stage, parentStep: undefined };
                }
                const result = findInStepTree(step);
                if (result) return result;
            }
        }
        return { parentStage: undefined, parentStep: undefined };
    }

    // For steps/substeps, recursively collect all ancestor variables
    function collectAncestorVariables(currentStep: Step): void {
        const { parentStage, parentStep } = findParents(currentStep);

        if (parentStage) {
            availableOutputs.push(...parentStage.state);
        }

        if (parentStep) {
            availableOutputs.push(...parentStep.state);
            // Recursively collect from parent step's ancestors
            collectAncestorVariables(parentStep);
        }
    }

    // Start collecting from the current step
    collectAncestorVariables(task);

    return availableOutputs;
}

// Helper function to get step status
export function getStepStatus(step: Step): StepStatus {
    // For atomic steps
    if (step.type === 'atomic') {
        // Check if tool is assigned
        if (!step.tool_id) {
            return 'unresolved';
        }

        // Check if all required inputs are mapped
        const requiredInputs = step.inputMappings.filter(m =>
            m.target.type === 'parameter' &&
            (m.target as ParameterTarget).required
        );
        const allRequiredInputsMapped = requiredInputs.every(mapping => mapping.sourceVariableId);

        if (!allRequiredInputsMapped) {
            return 'unresolved';
        }

        // Check if all mapped inputs are ready
        const allMappedInputsReady = step.inputMappings.every(mapping => {
            const sourceVariable = step.state.find(v => v.variable_id === mapping.sourceVariableId);
            return sourceVariable?.status === 'ready';
        });

        if (!allMappedInputsReady) {
            return 'pending_inputs_ready';
        }

        // Return current status if all checks pass
        return step.status;
    }

    // For composite steps
    if (step.type === 'composite') {
        // Check if there are at least 2 substeps
        if (!step.substeps || step.substeps.length < 2) {
            return 'unresolved';
        }

        // Check if all substeps are resolved
        const allSubstepsResolved = step.substeps.every(substep =>
            getStepStatus(substep) !== 'unresolved'
        );

        if (!allSubstepsResolved) {
            return 'unresolved';
        }

        // Check if all substeps are ready
        const allSubstepsReady = step.substeps.every(substep =>
            getStepStatus(substep) === 'ready'
        );

        if (!allSubstepsReady) {
            return 'pending_inputs_ready';
        }

        // Return current status if all checks pass
        return step.status;
    }

    // Default to unresolved for unknown step types
    return 'unresolved';
}

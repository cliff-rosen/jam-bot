import { Step } from './index';

export function getDirectSubsteps(step: Step): Step[] {
    if (!step.substeps || step.substeps.length === 0) {
        return [];
    }

    return step.substeps;
}

export const stepHasChildren = (step: Step) => {
    return step.substeps && step.substeps.length > 0
}

export const getStepWithUpdatedType = (step: Step, type: 'atomic' | 'composite') => {
    return {
        ...step,
        type
    }
}

///////////////////////////// AUTO GENERATED /////////////////////////////

/**
 * Gets all substeps from a step, including nested substeps
 * @param step The step to get substeps from
 * @returns Array of all substeps
 */
export function getAllSubsteps(step: Step): Step[] {
    if (!step.substeps || step.substeps.length === 0) {
        return [];
    }

    return step.substeps.reduce((allSubsteps: Step[], substep: Step) => {
        return [...allSubsteps, substep, ...getAllSubsteps(substep)];
    }, []);
}

/**
 * Finds a step by ID in a step tree
 * @param step The root step to search from
 * @param stepId The ID of the step to find
 * @returns The found step or undefined
 */
export function findStepById(step: Step, stepId: string): Step | undefined {
    if (step.id === stepId) {
        return step;
    }

    if (step.substeps) {
        for (const substep of step.substeps) {
            const found = findStepById(substep, stepId);
            if (found) {
                return found;
            }
        }
    }

    return undefined;
}

/**
 * Gets the parent step of a given step in a step tree
 * @param rootStep The root step to search from
 * @param targetStepId The ID of the step whose parent we want to find
 * @returns The parent step or undefined if not found
 */
export function getParentStep(rootStep: Step, targetStepId: string): Step | undefined {
    if (!rootStep.substeps) {
        return undefined;
    }

    // Check if any direct substep is the target
    const directParent = rootStep.substeps.find(substep => substep.id === targetStepId);
    if (directParent) {
        return rootStep;
    }

    // Recursively check substeps
    for (const substep of rootStep.substeps) {
        const parent = getParentStep(substep, targetStepId);
        if (parent) {
            return parent;
        }
    }

    return undefined;
}

/**
 * Gets the path from root to a specific step
 * @param rootStep The root step to start from
 * @param targetStepId The ID of the step to find the path to
 * @returns Array of step IDs representing the path, or empty array if not found
 */
export function getStepPath(rootStep: Step, targetStepId: string): string[] {
    if (rootStep.id === targetStepId) {
        return [rootStep.id];
    }

    if (rootStep.substeps) {
        for (const substep of rootStep.substeps) {
            const path = getStepPath(substep, targetStepId);
            if (path.length > 0) {
                return [rootStep.id, ...path];
            }
        }
    }

    return [];
}

/**
 * Checks if a step is a leaf step (has no substeps)
 * @param step The step to check
 * @returns boolean indicating if the step is a leaf
 */
export function isLeafStep(step: Step): boolean {
    return !step.substeps || step.substeps.length === 0;
}

/**
 * Gets the depth of a step in the step tree
 * @param rootStep The root step to start from
 * @param targetStepId The ID of the step to find the depth of
 * @returns The depth of the step (0 for root), or -1 if not found
 */
export function getStepDepth(rootStep: Step, targetStepId: string): number {
    if (rootStep.id === targetStepId) {
        return 0;
    }

    if (rootStep.substeps) {
        for (const substep of rootStep.substeps) {
            const depth = getStepDepth(substep, targetStepId);
            if (depth >= 0) {
                return depth + 1;
            }
        }
    }

    return -1;
} 
import { MissionProposal, Mission, Workflow, Status, StageGeneratorResult, Stage, Step, WorkflowVariable, StepStatus, StepConfigState, StepExecutionState, VariableMapping, doSchemasMatch, Tool, Schema, ParameterTarget } from "../types";
import { v4 as uuidv4 } from 'uuid';


export function createMissionFromProposal(proposal: MissionProposal): Mission {
    const now = new Date().toISOString();

    // Create an empty workflow with initial state
    const emptyWorkflow: Workflow = {
        id: uuidv4(),
        name: `${proposal.title} Workflow`,
        description: `Workflow for ${proposal.title}`,
        status: 'pending' as Status,
        stages: [],
        childVariables: [],
        inputMappings: [],
        outputMappings: [],
        createdAt: now,
        updatedAt: now
    };

    console.log(proposal);

    return {
        id: uuidv4(),
        title: proposal.title,
        goal: proposal.goal,
        status: 'ready' as Status,
        workflow: emptyWorkflow,
        inputs: proposal.inputs,
        resources: proposal.resources || [],
        outputs: proposal.outputs,
        success_criteria: proposal.success_criteria,
        selectedTools: proposal.selectedTools || [],
        createdAt: now,
        updatedAt: now
    };
}

import { api, handleApiError } from './index';
import { Workflow, WorkflowStatus, WorkflowStepId, WorkflowStepType } from '../../types/workflows';

export const workflowApi = {
    getWorkflows: async (): Promise<Workflow[]> => {
        try {
            const response = await api.get('/api/workflows');
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    getWorkflow: async (workflowId: string): Promise<Workflow> => {
        try {
            const response = await api.get(`/api/workflows/${workflowId}`);
            return response.data
        } catch (error) {
            throw handleApiError(error);
        }
    },

    createWorkflow: async (workflow: Omit<Workflow, 'workflow_id'>): Promise<Workflow> => {
        try {
            // Transform the workflow data to match backend schema
            const transformedWorkflow = {
                name: workflow.name,
                description: workflow.description,
                status: workflow.status,
                steps: workflow.steps?.map(step => ({
                    label: step.label,
                    description: step.description,
                    step_type: step.step_type,
                    tool_id: step.tool?.tool_id ?? null,
                    prompt_template_id: step.prompt_template_id,
                    parameter_mappings: step.parameter_mappings,
                    output_mappings: step.output_mappings,
                    sequence_number: step.sequence_number,
                    // Include evaluation_config for evaluation steps
                    ...(step.step_type === WorkflowStepType.EVALUATION ? {
                        evaluation_config: {
                            conditions: (step.evaluation_config?.conditions || []).map(condition => ({
                                ...condition,
                                condition_id: condition.condition_id || crypto.randomUUID()
                            })),
                            default_action: step.evaluation_config?.default_action || 'continue'
                        }
                    } : {})
                })),
                state: workflow.state?.map(variable => ({
                    variable_id: variable.variable_id,
                    name: variable.name,
                    schema: variable.schema,
                    io_type: variable.io_type
                }))
            };

            const response = await api.post('/api/workflows', transformedWorkflow);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    updateWorkflow: async (workflowId: string, workflow: Partial<Workflow>): Promise<Workflow> => {
        try {
            // Transform the workflow data to match backend schema
            const transformedWorkflow = {
                name: workflow.name,
                description: workflow.description,
                status: workflow.status,
                steps: workflow.steps?.map(step => ({
                    label: step.label,
                    description: step.description,
                    step_type: step.step_type,
                    tool_id: step.tool?.tool_id ?? null,
                    prompt_template_id: step.prompt_template_id,
                    parameter_mappings: step.parameter_mappings,
                    output_mappings: step.output_mappings,
                    sequence_number: step.sequence_number,
                    // Include evaluation_config for evaluation steps
                    ...(step.step_type === WorkflowStepType.EVALUATION ? {
                        evaluation_config: {
                            conditions: (step.evaluation_config?.conditions || []).map(condition => ({
                                ...condition,
                                condition_id: condition.condition_id || crypto.randomUUID()
                            })),
                            default_action: step.evaluation_config?.default_action || 'continue',
                            maximum_jumps: step.evaluation_config?.maximum_jumps || 3
                        }
                    } : {})
                })),
                state: workflow.state?.map(variable => ({
                    variable_id: variable.variable_id,
                    name: variable.name,
                    schema: variable.schema,
                    io_type: variable.io_type
                }))
            };

            //console.log('workflowApi.updateWorkflow transformedWorkflow', transformedWorkflow);
            const response = await api.put(`/api/workflows/${workflowId}`, transformedWorkflow);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    deleteWorkflow: async (workflowId: string): Promise<void> => {
        try {
            await api.delete(`/api/workflows/${workflowId}`);
        } catch (error) {
            throw handleApiError(error);
        }
    },

    addWorkflowStep: async (workflowId: string, step: any): Promise<any> => {
        try {
            const response = await api.post(`/api/workflows/${workflowId}/steps`, step);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },

    executeWorkflow: async (workflowId: string, executionData: any): Promise<any> => {
        try {
            const response = await api.post(`/api/workflows/${workflowId}/execute`, executionData);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

// Helper function to convert frontend workflow to API format
const workflowToApiFormat = (workflow: Workflow) => ({
    name: workflow.name,
    description: workflow.description,
    status: workflow.status,
    steps: workflow.steps?.map(step => ({
        label: step.label,
        description: step.description,
        step_type: step.step_type,
        tool_id: step.tool?.tool_id,
        prompt_template_id: step.prompt_template_id,
        parameter_mappings: step.parameter_mappings,
        output_mappings: step.output_mappings,
        evaluation_config: step.evaluation_config,
        sequence_number: step.sequence_number
    })),
    state: workflow.state?.map(variable => ({
        variable_id: variable.variable_id,
        name: variable.name,
        schema: variable.schema,
        io_type: variable.io_type
    }))
});

// Helper function to convert API response to frontend format
const apiToWorkflowFormat = (data: any): Workflow => ({
    workflow_id: data.workflow_id,
    name: data.name,
    description: data.description,
    status: data.status as WorkflowStatus,
    error: data.error,
    created_at: data.created_at,
    updated_at: data.updated_at,
    steps: data.steps?.map((step: any) => ({
        ...step,
        step_id: step.step_id as WorkflowStepId
    })) ?? [],
    state: data.state ?? []
}); 
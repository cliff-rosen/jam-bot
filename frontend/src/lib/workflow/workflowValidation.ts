import {
    WorkflowStep,
    WorkflowVariable,
    WorkflowStepType
} from '../../types/workflows';
import { Tool, ToolParameter } from '../../types/tools';

export class WorkflowValidation {
    /**
     * Validates step configuration
     */
    static validateStep(step: WorkflowStep): string[] {
        const errors: string[] = [];

        if (step.step_type === WorkflowStepType.ACTION) {
            if (!step.tool) {
                errors.push('No tool selected');
            } else {
                // Validate tool configuration
                errors.push(...this.validateToolConfiguration(step.tool, step.parameter_mappings || {}));
            }

            if (step.tool?.tool_type === 'llm' && !step.prompt_template_id) {
                errors.push('No prompt template selected');
            }
        } else if (step.step_type === WorkflowStepType.EVALUATION) {
            if (!step.evaluation_config) {
                errors.push('No evaluation configuration found');
            } else if (!step.evaluation_config.conditions || step.evaluation_config.conditions.length === 0) {
                errors.push('No conditions defined for evaluation step');
            }
        }

        return errors;
    }

    /**
     * Validates tool configuration
     */
    static validateToolConfiguration(
        tool: Tool,
        parameterMappings: Record<string, string>
    ): string[] {
        const errors: string[] = [];

        // Check required parameters
        tool.signature.parameters.forEach((param: ToolParameter) => {
            if (param.required && !parameterMappings[param.name]) {
                errors.push(`Required parameter '${param.name}' not mapped`);
            }
        });

        // Check for invalid parameter mappings
        Object.keys(parameterMappings).forEach(paramName => {
            if (!tool.signature.parameters.find((p: ToolParameter) => p.name === paramName)) {
                errors.push(`Invalid parameter mapping: '${paramName}' is not a valid parameter for this tool`);
            }
        });

        return errors;
    }

    /**
     * Validates workflow variables
     */
    static validateWorkflowVariables(
        variables: WorkflowVariable[],
        parameterMappings: Record<string, string>
    ): string[] {
        const errors: string[] = [];

        // Check that all mapped variables exist
        Object.values(parameterMappings).forEach(varName => {
            if (!variables.find(v => v.name === varName)) {
                errors.push(`Variable '${varName}' referenced in mapping does not exist`);
            }
        });

        return errors;
    }

    /**
     * Validates required input values are present
     */
    static validateInputValues(
        inputs: WorkflowVariable[]
    ): string[] {
        const errors: string[] = [];

        inputs.forEach(input => {
            if (input.required && (input.value === undefined || input.value === null)) {
                errors.push(`Required input '${input.name}' has no value`);
            }
        });

        return errors;
    }
} 
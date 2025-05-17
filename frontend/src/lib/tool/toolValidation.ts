import {
    Tool,
    ToolParameter,
    ToolOutput,
    ResolvedParameters,
    LLMParameters
} from '../../types/tools';
import { SchemaValueType } from '../../types/schema';

export class ToolValidation {
    /**
     * Validates tool configuration
     */
    static validateTool(tool: Tool): string[] {
        const errors: string[] = [];

        if (!tool.tool_id) {
            errors.push('Tool ID is required');
        }

        if (!tool.signature) {
            errors.push('Tool signature is required');
        } else {
            // Validate parameters
            if (!Array.isArray(tool.signature.parameters)) {
                errors.push('Tool parameters must be an array');
            } else {
                tool.signature.parameters.forEach(param => {
                    errors.push(...this.validateParameter(param));
                });
            }

            // Validate outputs
            if (!Array.isArray(tool.signature.outputs)) {
                errors.push('Tool outputs must be an array');
            } else {
                tool.signature.outputs.forEach(output => {
                    errors.push(...this.validateOutput(output));
                });
            }
        }

        return errors;
    }

    /**
     * Validates a tool parameter
     */
    private static validateParameter(parameter: ToolParameter): string[] {
        const errors: string[] = [];

        if (!parameter.name) {
            errors.push('Parameter name is required');
        }

        if (!parameter.schema) {
            errors.push(`Parameter ${parameter.name} must have a schema`);
        } else if (!parameter.schema.type) {
            errors.push(`Parameter ${parameter.name} schema must have a type`);
        }

        return errors;
    }

    /**
     * Validates a tool output
     */
    private static validateOutput(output: ToolOutput): string[] {
        const errors: string[] = [];

        if (!output.name) {
            errors.push('Output name is required');
        }

        if (!output.schema) {
            errors.push(`Output ${output.name} must have a schema`);
        } else if (!output.schema.type) {
            errors.push(`Output ${output.name} schema must have a type`);
        }

        return errors;
    }

    /**
     * Validates parameters against tool signature
     */
    static validateParameters(
        tool: Tool,
        parameters: ResolvedParameters
    ): string[] {
        const errors: string[] = [];

        // Special handling for LLM tools
        if (tool.tool_type === 'llm') {
            return this.validateLLMParameters(parameters as LLMParameters);
        }

        // Check required parameters
        tool.signature.parameters.forEach(param => {
            if (param.required && !(param.name in parameters)) {
                errors.push(`Required parameter '${param.name}' is missing`);
            }
        });

        // Check parameter types
        Object.entries(parameters).forEach(([name, value]) => {
            const param = tool.signature.parameters.find(p => p.name === name);
            if (!param) {
                errors.push(`Unknown parameter '${name}'`);
                return;
            }

            if (!this.validateParameterType(value, param.schema.type)) {
                errors.push(`Parameter '${name}' has invalid type. Expected ${param.schema.type}`);
            }
        });

        return errors;
    }

    /**
     * Validates LLM-specific parameters
     */
    private static validateLLMParameters(parameters: LLMParameters): string[] {
        const errors: string[] = [];

        if (!parameters.prompt_template_id) {
            errors.push('Prompt template ID is required for LLM tools');
        }

        if (!parameters.regular_variables) {
            errors.push('Regular variables are required for LLM tools');
        }

        return errors;
    }

    /**
     * Validates a parameter value against its expected type
     */
    private static validateParameterType(
        value: SchemaValueType,
        expectedType: string
    ): boolean {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null;
            default:
                return true; // Allow unknown types
        }
    }

    /**
     * Validates tool outputs against signature
     */
    static validateOutputs(
        tool: Tool,
        outputs: Record<string, any>
    ): string[] {
        const errors: string[] = [];

        // Check all defined outputs are present
        tool.signature.outputs.forEach(output => {
            if (!(output.name in outputs)) {
                errors.push(`Missing output '${output.name}'`);
            }
        });

        // Check output types
        Object.entries(outputs).forEach(([name, value]) => {
            const output = tool.signature.outputs.find(o => o.name === name);
            if (!output) {
                errors.push(`Unknown output '${name}'`);
                return;
            }

            if (!this.validateParameterType(value, output.schema.type)) {
                errors.push(`Output '${name}' has invalid type. Expected ${output.schema.type}`);
            }
        });

        return errors;
    }
} 
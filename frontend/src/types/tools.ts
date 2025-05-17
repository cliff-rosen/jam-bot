import { Schema, SchemaValueType, FileValue } from './schema';
import { WorkflowVariableName } from './workflows';

export type ToolType = 'llm' | 'search' | 'retrieve' | 'utility';

// Branded types for type-safe tool references
export type ToolParameterName = string & { readonly __brand: unique symbol };
export type ToolOutputName = string & { readonly __brand: unique symbol };

// Tool parameter definition
export interface ToolParameter {
    name: ToolParameterName;  // Parameter name in the tool's context
    value_schema: Schema;           // Structure definition
    required?: boolean;       // Whether this parameter must be provided
    default?: SchemaValueType;// Default value if not provided
    description?: string;     // Describes this parameter to tool users
}

// Tool output definition
export interface ToolOutput {
    name: ToolOutputName;     // Output name in the tool's context
    value_schema: Schema;           // Structure definition
    description?: string;     // Describes this output to tool users
}

// Complete tool signature
export interface ToolSignature {
    parameters: ToolParameter[];
    outputs: ToolOutput[];
}

// Mapping types for tool parameters and outputs to workflow variables
export type ParameterMappingType = Record<ToolParameterName, WorkflowVariableName>;
export type OutputMappingType = Record<ToolOutputName, WorkflowVariableName>;

// Type for resolved parameter values at runtime
export type ResolvedParameters = Record<ToolParameterName, SchemaValueType>;

// Type for tool outputs at runtime
export type ToolOutputs = Record<ToolOutputName, SchemaValueType>;

// Helper type for file parameters
type FileParameterValue = Pick<FileValue, 'file_id'>;

// LLM-specific parameter types
export interface LLMParameters {
    prompt_template_id: string;
    // Variables that will be substituted into the prompt
    regular_variables: Record<ToolParameterName, SchemaValueType>;
    // File variables map to file IDs from FileValue type
    file_variables: Record<ToolParameterName, FileParameterValue['file_id']>;
    // Optional model configuration
    model?: string;
    max_tokens?: number;
    temperature?: number;
}

// Complete tool definition
export interface Tool {
    tool_id: string;          // Unique identifier
    name: string;             // Display name (not a branded type)
    description: string;      // Human-readable description
    tool_type: ToolType;      // Type of tool for runtime handling
    signature: ToolSignature; // Parameter and output definitions
} 
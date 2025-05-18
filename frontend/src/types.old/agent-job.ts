import { FileType, DataType } from './asset';
import { AgentType } from './agent';

/**
 * Configuration for an output asset that will be created by an agent
 */
export interface AssetConfig {
    name: string;
    description: string;
    fileType: FileType;
    dataType: DataType;
}

/**
 * Represents a job that will be executed by an agent
 */
export interface AgentJob {
    agentType: AgentType;  // Use the enum instead of string
    input_parameters: Record<string, any>;
    input_asset_ids: string[];  // Required array of input asset IDs
    output_asset_configs: AssetConfig[];
    description?: string;  // Optional description of what this job will do
    metadata?: Record<string, any>;  // Optional metadata for the job
} 
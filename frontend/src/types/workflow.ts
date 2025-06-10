/**
 * Workflow Schema Definitions
 *
 * This file contains all TypeScript types and interfaces for defining and
 * managing workflows, including Missions, Hops, and ToolSteps.
 */

import { Asset, AssetStatus } from './asset';
import { Resource } from './tool';

// --- Workflow Execution Enums ---

export enum ExecutionStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
}

// Re-exporting this for now to satisfy other files, will be removed.
export enum MissionStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    FAILED = 'failed',
    PAUSED = 'paused'
}

// Re-exporting this for now to satisfy other files, will be removed.
export enum HopStatus {
    PENDING = 'pending',
    READY_TO_DESIGN = 'ready_to_design',
    DESIGN_IN_PROGRESS = 'design_in_progress',
    READY_TO_EXECUTE = 'ready_to_execute',
    EXECUTION_IN_PROGRESS = 'execution_in_progress',
    EXECUTION_PAUSED = 'execution_paused',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

// Keep WorkflowStatus for backwards compatibility but mark as deprecated
/** @deprecated Use MissionStatus and HopStatus instead */
export enum WorkflowStatus {
    PENDING = "pending",
    READY = "ready",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    HOP_DESIGN = "hop_design",
    HOP_IMPLEMENTATION = "hop_implementation"
}

// DEPRECATED: StateVariable system - replaced by unified Asset schema
/** @deprecated Use unified Asset from './schema' instead. This will be removed in a future version. */
export enum StateVariableType {
    ASSET = "asset", // References an asset
    PRIMITIVE = "primitive", // Basic type (string, number, boolean)
    OBJECT = "object", // Complex object
    COLLECTION = "collection" // Array or map of other types
}

/** @deprecated Use unified Asset from './schema' instead. This will be removed in a future version. */
export interface StateVariable {
    id: string;
    name: string;
    description: string;
    type: StateVariableType;
    value: any;
    asset_id?: string; // ID of the associated asset if type is ASSET
    is_input: boolean; // Whether this is an input to the workflow
    is_output: boolean; // Whether this is an output from the workflow
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

// Updated interfaces using unified schema
export interface AssetFieldMapping {
    type: "asset_field";
    state_asset: string;
    path?: string;
}

export interface LiteralMapping {
    type: "literal";
    value: any;
}

export interface DiscardMapping {
    type: "discard";
}

export type ParameterMappingValue = AssetFieldMapping | LiteralMapping;
export type ResultMappingValue = AssetFieldMapping | DiscardMapping;

export interface ToolStep {
    id: string;
    tool_id: string;
    description: string;
    resource_configs: Record<string, Resource>;
    parameter_mapping: Record<string, ParameterMappingValue>;
    result_mapping: Record<string, ResultMappingValue>;
    status: ExecutionStatus;
    error?: string;
    validation_errors?: string[];
    created_at: string;
    updated_at: string;
}

export interface Hop {
    id: string;
    name: string;
    description: string;
    input_mapping: Record<string, string>;
    output_mapping: Record<string, string>;
    tool_steps: ToolStep[];
    hop_state: Record<string, Asset>;
    status: ExecutionStatus;
}

export interface Mission {
    id: string;
    name: string;
    description: string;
    hops: Hop[];
    inputs: Asset[];
    outputs: Asset[];
    mission_state: Record<string, Asset>;
    status: ExecutionStatus;
}

export const defaultMission1: Mission = {
    id: "default-mission-1",
    name: "New Mission",
    description: "A new mission to be defined.",
    hops: [],
    inputs: [],
    outputs: [],
    mission_state: {},
    status: ExecutionStatus.PENDING,
};

export const defaultMission2: Mission = {
    id: "default-mission-2",
    name: "Recap Email Generation",
    description: "This mission recaps the top 5 trending articles from a newsletter and generates a new draft email with the summary.",
    hops: [
        // ... (hops content)
    ],
    inputs: [
        {
            id: "input-topic-areas",
            name: "Topic Areas",
            description: "The topic areas to focus on.",
            schema: {
                type: "string",
                description: "The topic areas to focus on.",
                is_array: false
            },
            value: null,
            status: AssetStatus.PENDING,
            is_collection: false,
            collection_type: 'null',
            asset_metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                creator: null,
                tags: [],
                agent_associations: [],
                version: 1,
                token_count: 0
            }
        }
    ],
    outputs: [
        {
            id: "output-report",
            name: "Report",
            description: "The generated AI news summary report.",
            schema: {
                type: "file",
                description: "The generated AI news summary report.",
                is_array: false
            },
            value: null,
            status: AssetStatus.PENDING,
            is_collection: false,
            collection_type: 'null',
            asset_metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                creator: null,
                tags: [],
                agent_associations: [],
                version: 1,
                token_count: 0
            }
        }
    ],
    mission_state: {},
    status: ExecutionStatus.PENDING
};

/**
 * Workflow Schema Definitions
 *
 * This file contains all TypeScript types and interfaces for defining and
 * managing workflows, including Missions, Hops, and ToolSteps.
 */

import { Resource } from './resource';
import { Asset } from './asset';

// --- Workflow Execution Enums ---

export enum MissionStatus {
    PROPOSED = "proposed",
    READY_FOR_NEXT_HOP = "ready_for_next_hop",
    BUILDING_HOP = "building_hop",
    HOP_READY_TO_EXECUTE = "hop_ready_to_execute",
    EXECUTING_HOP = "executing_hop",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}

export enum HopStatus {
    PROPOSED = "proposed",
    READY_TO_RESOLVE = "ready_to_resolve",
    READY_TO_EXECUTE = "ready_to_execute",
    EXECUTING = "executing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}

export enum ToolExecutionStatus {
    PROPOSED = "proposed",
    READY_TO_CONFIGURE = "ready_to_configure",
    READY_TO_EXECUTE = "ready_to_execute",
    EXECUTING = "executing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}

// Updated interfaces using unified schema
export interface AssetFieldMapping {
    type: "asset_field";
    state_asset: string;
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
    // Core fields
    id: string;
    tool_id: string;
    sequence_order: number;
    name: string;
    description?: string;
    status: ToolExecutionStatus;

    // Tool configuration
    parameter_mapping: Record<string, ParameterMappingValue>;
    result_mapping: Record<string, ResultMappingValue>;
    resource_configs: Record<string, Resource>;

    // Execution data
    validation_errors: string[];
    execution_result?: Record<string, any>;
    error_message?: string;

    // Timestamps
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
}

export interface Hop {
    // Core fields
    id: string;
    sequence_order: number;
    name: string;
    description?: string;
    goal?: string;
    success_criteria: string[];
    rationale?: string;
    status: HopStatus;

    // Hop state
    is_final: boolean;
    is_resolved: boolean;
    error_message?: string;
    hop_metadata: Record<string, any>;

    // Timestamps
    created_at: string;
    updated_at: string;

    // Relationships (populated by services) - Parent manages child context
    tool_steps: ToolStep[];

    // Asset collections (all hop-scoped assets by name)
    hop_state: Record<string, Asset>;
}

export interface Mission {
    // Core fields
    id: string;
    name: string;
    description?: string;
    goal?: string;
    success_criteria: string[];
    status: MissionStatus;

    // Current hop tracking
    current_hop_id?: string;

    // Metadata
    mission_metadata: Record<string, any>;
    created_at: string;
    updated_at: string;

    // Relationships (populated by services) - Parent manages child context
    current_hop?: Hop;
    hops: Hop[];  // hop_history

    // Asset collection - unified approach (filter by Asset.role for inputs/outputs)
    mission_state: Record<string, Asset>;  // all mission assets by name
}

export const defaultMission: Mission = {
    id: "default-mission-1",
    name: "New Mission",
    description: "A new mission to be defined.",
    goal: "",
    success_criteria: [],
    status: MissionStatus.PROPOSED,
    current_hop_id: undefined,
    mission_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    hops: [],
    mission_state: {}
};



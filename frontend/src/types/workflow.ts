/**
 * Workflow Schema Definitions
 *
 * This file contains all TypeScript types and interfaces for defining and
 * managing workflows, including Missions, Hops, and ToolSteps.
 */

import { Resource } from './resource';

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
    id: string;
    hop_id: string;
    user_id: number;
    tool_id: string;
    sequence_order: number;
    status: ToolExecutionStatus;
    description?: string;
    template?: string;
    parameter_mapping?: Record<string, ParameterMappingValue>;
    result_mapping?: Record<string, ResultMappingValue>;
    resource_configs?: Record<string, Resource>;
    validation_errors?: string[];
    execution_result?: any;
    hop_state_asset_ids?: Record<string, string>;
    error_message?: string;
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
}

export interface Hop {
    id: string;
    mission_id: string;
    user_id: number;
    sequence_order: number;
    name: string;
    description?: string;
    goal?: string;
    success_criteria?: string[];
    rationale?: string;
    status: HopStatus;
    tool_steps?: ToolStep[];
    is_final: boolean;
    is_resolved: boolean;
    error_message?: string;
    hop_metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Mission {
    id: string;
    user_id: number;
    name: string;
    description?: string;
    goal?: string;
    status: MissionStatus;
    success_criteria?: string[];

    // Current hop tracking
    current_hop_id?: string;

    mission_metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;

    // Relationships (populated by queries)
    current_hop?: Hop;
    hops?: Hop[];  // hop_history in logical model

    // Assets are queried by scope: scope_type='mission' AND scope_id=mission.id
    // NO input_asset_ids or output_asset_ids fields needed
}

export const defaultMission: Mission = {
    id: "default-mission-1",
    user_id: 1,
    name: "New Mission",
    description: "A new mission to be defined.",
    goal: "",
    success_criteria: [],
    status: MissionStatus.PROPOSED,
    current_hop_id: undefined,
    mission_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};



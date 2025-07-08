/**
 * Workflow Schema Definitions
 *
 * This file contains all TypeScript types and interfaces for defining and
 * managing workflows, including Missions, Hops, and ToolSteps.
 */

import { Resource } from './resource';

// --- Workflow Execution Enums ---

export enum ExecutionStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed"
}

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
    tool_id: string;
    description: string;
    template?: string;
    sequence_order: number;
    resource_configs: Record<string, Resource>;
    parameter_mapping: Record<string, ParameterMappingValue>;
    result_mapping: Record<string, ResultMappingValue>;
    status: ExecutionStatus;
    error_message?: string;
    validation_errors?: string[];
    created_at: string;
    updated_at: string;
}

export interface Hop {
    id: string;
    name: string;
    description: string;
    goal?: string;
    success_criteria: string[];
    input_asset_ids: string[];
    output_asset_ids: string[];
    sequence_order: number;
    status: HopStatus;
    is_final: boolean;
    is_resolved: boolean;
    rationale?: string;
    error_message?: string;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Mission {
    id: string;
    name: string;
    description: string;
    goal: string;
    success_criteria: string[];
    status: MissionStatus;
    input_asset_ids: string[];
    output_asset_ids: string[];
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export const defaultMission: Mission = {
    id: "default-mission-1",
    name: "New Mission",
    description: "A new mission to be defined.",
    goal: "",
    success_criteria: [],
    status: MissionStatus.PROPOSED,
    input_asset_ids: [],
    output_asset_ids: [],
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};



/**
 * Workflow Schema Definitions
 *
 * This file contains all TypeScript types and interfaces for defining and
 * managing workflows, including Missions, Hops, and ToolSteps.
 */

import { Asset, AssetStatus } from './asset';
import { Resource } from './resource';

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
    COMPLETE = 'complete',
    FAILED = 'failed'
}

// Re-exporting this for now to satisfy other files, will be removed.
export enum HopStatus {
    READY_TO_DESIGN = "ready_to_design",
    HOP_PROPOSED = "hop_proposed",
    HOP_READY_TO_RESOLVE = "hop_ready_to_resolve",
    HOP_READY_TO_EXECUTE = "hop_ready_to_execute",
    HOP_RUNNING = "hop_running",
    ALL_HOPS_COMPLETE = "all_hops_complete",
    FAILED = "failed"
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
    current_step_index?: number;
}

export interface Hop {
    id: string;
    name: string;
    description: string;
    input_mapping: Record<string, string>;
    output_mapping: Record<string, string>;
    tool_steps: ToolStep[];
    hop_state: Record<string, Asset>;
    status: HopStatus;
    is_final?: boolean;
    is_resolved?: boolean;
    current_step_index?: number;
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
    current_hop?: Hop;
    current_hop_index?: number;
    mission_status?: MissionStatus;
    hop_status?: HopStatus;
    goal?: string;
    success_criteria?: string[];
}

export const defaultMission: Mission = {
    id: "default-mission-1",
    name: "New Mission",
    description: "A new mission to be defined.",
    hops: [],
    inputs: [],
    outputs: [],
    mission_state: {},
    status: ExecutionStatus.PENDING,
    mission_status: MissionStatus.PENDING,
    hop_status: HopStatus.READY_TO_DESIGN,
};


export function markHopOutputsReady(
    hopState: Record<string, Asset>,
    outputMapping: Record<string, string>,
    missionState: Record<string, Asset>,
    updatedBy: string
): Record<string, Asset> {
    const updatedMissionState = { ...missionState };

    for (const localKey in outputMapping) {
        if (Object.prototype.hasOwnProperty.call(outputMapping, localKey)) {
            const missionAssetId = outputMapping[localKey];
            if (updatedMissionState[missionAssetId]) {
                updatedMissionState[missionAssetId].status = AssetStatus.READY;
                updatedMissionState[missionAssetId].asset_metadata.updatedAt = new Date().toISOString();
            }
        }
    }
    return updatedMissionState;
}

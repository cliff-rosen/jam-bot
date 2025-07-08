/**
 * Mission Utilities
 * 
 * This module provides utilities for mission sanitization and chat context preparation.
 */

import { Mission, Hop } from '@/types/workflow';
import { Asset } from '@/types/asset';

export interface SanitizedAsset {
    id: string;
    name: string;
    description: string;
    schema_definition: any;
    status: string;
    subtype?: string;
    role?: string;
    asset_metadata: {
        createdAt: string;
        updatedAt: string;
        creator: string | null;
        tags: string[];
        agent_associations: string[];
        version: number;
        token_count: number;
    };
    // Explicitly excludes 'value' field to reduce payload size
}

export interface SanitizedMission {
    id: string;
    name: string;
    description: string;
    goal?: string;
    success_criteria?: string[];
    mission_state: Record<string, SanitizedAsset>;
    current_hop?: any;
    hop_history: any[];
    inputs: SanitizedAsset[];
    outputs: SanitizedAsset[];
    mission_status: string;
    created_at: string;
    updated_at: string;
}

/**
 * Sanitize an asset for chat context by removing large content values.
 */
export function sanitizeAssetForChat(asset: Asset): SanitizedAsset {
    return {
        id: asset.id,
        name: asset.name,
        description: asset.description,
        schema_definition: asset.schema_definition,
        status: asset.status,
        subtype: asset.subtype,
        role: asset.role,
        asset_metadata: {
            ...asset.asset_metadata,
            token_count: asset.asset_metadata?.token_count || 0
        }
        // Explicitly exclude 'value' field to reduce payload size
    };
}

/**
 * Sanitize a hop for chat context by removing asset content values.
 */
export function sanitizeHopForChat(hop: Hop): any {
    return {
        ...hop,
        // hop_state will be computed from assets with scope_type='hop' and scope_id=hop.id
        hop_state: {} // Will be populated from assets relationship
    };
}

/**
 * Sanitize a mission for chat context by removing large asset content values.
 */
export function sanitizeMissionForChat(mission: Mission | null): SanitizedMission | null {
    if (!mission) {
        return null;
    }

    return {
        id: mission.id,
        name: mission.name,
        description: mission.description,
        goal: mission.goal,
        success_criteria: mission.success_criteria || [],
        mission_status: mission.status, // Fixed: use 'status' instead of 'mission_status'
        created_at: typeof mission.created_at === 'string' ? mission.created_at : new Date().toISOString(),
        updated_at: typeof mission.updated_at === 'string' ? mission.updated_at : new Date().toISOString(),

        // These fields need to be computed from the Mission's relationships
        // For now, return empty/default values until we implement the computed fields
        mission_state: {}, // Will be populated from assets with scope_type='mission'
        current_hop: undefined, // Will be computed from hops relationship
        hop_history: [], // Will be populated from completed hops
        inputs: [], // Will be populated from assets with role='input'
        outputs: [] // Will be populated from assets with role='output'
    };
} 
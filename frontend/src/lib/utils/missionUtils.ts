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
        hop_state: Object.keys(hop.hop_state).reduce((acc, key) => {
            acc[key] = sanitizeAssetForChat(hop.hop_state[key]);
            return acc;
        }, {} as Record<string, SanitizedAsset>)
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
        success_criteria: mission.success_criteria,
        mission_status: mission.mission_status,
        created_at: typeof mission.created_at === 'string' ? mission.created_at : new Date().toISOString(),
        updated_at: typeof mission.updated_at === 'string' ? mission.updated_at : new Date().toISOString(),

        // Sanitize mission state assets
        mission_state: Object.keys(mission.mission_state).reduce((acc, key) => {
            acc[key] = sanitizeAssetForChat(mission.mission_state[key]);
            return acc;
        }, {} as Record<string, SanitizedAsset>),

        // Sanitize current hop
        current_hop: mission.current_hop ? sanitizeHopForChat(mission.current_hop) : undefined,

        // Sanitize hop history
        hop_history: mission.hop_history.map(hop => sanitizeHopForChat(hop)),

        // Sanitize input and output assets
        inputs: mission.inputs.map(asset => sanitizeAssetForChat(asset)),
        outputs: mission.outputs.map(asset => sanitizeAssetForChat(asset))
    };
} 
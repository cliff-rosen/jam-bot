/**
 * Asset Schema Definitions
 *
 * This file contains all TypeScript types and interfaces for defining and
 * managing Assets. Assets are the data containers that flow between hops.
 */

import { SchemaType } from './base';

// --- Asset-Specific Enums and Interfaces ---

export enum AssetStatus {
    PROPOSED = "proposed",
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    READY = "ready",
    ERROR = "error",
    EXPIRED = "expired"
}

export enum AssetRole {
    INPUT = "input",
    OUTPUT = "output",
    INTERMEDIATE = "intermediate"
}

export enum AssetScopeType {
    MISSION = "mission",
    HOP = "hop"
}

export interface Asset {
    // Inherited from SchemaEntity: id, name, description, schema_definition
    id: string;
    name: string;
    description: string;
    schema_definition: SchemaType;

    // Additional fields beyond SchemaEntity
    subtype?: string;

    // Scope information
    scope_type: AssetScopeType;
    scope_id: string;

    // Asset lifecycle
    status: AssetStatus;
    role: AssetRole;

    // Value representation (generated from content_summary)
    value_representation: string;

    // Metadata
    asset_metadata: Record<string, any>;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface AssetWithContent extends Asset {
    content: any;  // Full content for tool execution
}

// --- Asset-Specific Utility Functions ---

export function getPendingAssets(assets: Asset[]): Asset[] {
    return assets.filter(asset => asset.status === AssetStatus.PENDING);
}

export function getProposedAssets(assets: Asset[]): Asset[] {
    return assets.filter(asset => asset.status === AssetStatus.PROPOSED);
}

export function getReadyAssets(assets: Asset[]): Asset[] {
    return assets.filter(asset => asset.status === AssetStatus.READY);
}

export function getFailedAssets(assets: Asset[]): Asset[] {
    return assets.filter(asset => asset.status === AssetStatus.ERROR);
}

export function isAssetAvailable(asset: Asset): boolean {
    return asset.status === AssetStatus.READY;
}

export function isAssetProposed(asset: Asset): boolean {
    return asset.status === AssetStatus.PROPOSED;
}

export function assetNeedsAttention(asset: Asset): boolean {
    return asset.status === AssetStatus.ERROR || asset.status === AssetStatus.EXPIRED;
} 
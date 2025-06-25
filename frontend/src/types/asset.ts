/**
 * Asset Schema Definitions
 *
 * This file contains all TypeScript types and interfaces for defining and
 * managing Assets. Assets are the data containers that flow between hops.
 */

import { SchemaEntity, AssetRole, CustomType } from './base';

// --- Asset-Specific Enums and Interfaces ---

export enum AssetStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    READY = "ready",
    ERROR = "error",
    EXPIRED = "expired"
}

export interface AssetMetadata {
    createdAt: string;
    updatedAt: string;
    creator: string | null;
    tags: string[];
    agent_associations: string[];
    version: number;
    token_count: number;
}

export interface Asset extends SchemaEntity {
    value?: any;
    status: AssetStatus;
    subtype?: CustomType;
    is_collection: boolean;
    collection_type?: 'array' | 'map' | 'set' | 'null';
    role?: AssetRole;
    agent_specification?: string;
    error_message?: string;
    last_updated_by?: string;
    ready_at?: string;
    asset_metadata: AssetMetadata;
}

// --- Asset-Specific Utility Functions ---

export function getPendingAssets(assets: Asset[]): Asset[] {
    return assets.filter(asset => asset.status === AssetStatus.PENDING);
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

export function assetNeedsAttention(asset: Asset): boolean {
    return asset.status === AssetStatus.ERROR || asset.status === AssetStatus.EXPIRED;
} 
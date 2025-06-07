// Unified Schema System for Assets, Tool Parameters, and Tool Outputs

export type PrimitiveType = 'string' | 'number' | 'boolean';
export type CustomType = 'email' | 'webpage' | 'search_result' | 'pubmed_article' | 'newsletter' | 'daily_newsletter_recap';
export type ComplexType = 'object' | 'file' | 'database_entity' | CustomType;
export type ValueType = PrimitiveType | ComplexType;

// Asset role in the workflow/mission context
export type AssetRole = 'input' | 'output' | 'intermediate';

// Asset status in the execution lifecycle
export enum AssetStatus {
    PENDING = "pending",           // Asset defined but not yet available/provided
    IN_PROGRESS = "in_progress",   // Asset is currently being created/processed
    READY = "ready",               // Asset is available and ready to use
    ERROR = "error",               // Asset creation/provision failed
    EXPIRED = "expired"            // Asset (like credentials) has expired
}

export interface SchemaType {
    type: ValueType;
    description?: string;
    is_array: boolean;
    fields?: Record<string, SchemaType>;  // for nested objects
}

// Base schema entity - shared by assets
export interface SchemaEntity {
    id: string;
    name: string;
    description: string;
    schema: SchemaType;
}

// Assets extend SchemaEntity with actual value and status tracking
export interface Asset extends SchemaEntity {
    value?: any;  // the actual data content
    status: AssetStatus;  // Current status of the asset

    // Asset-specific metadata
    subtype?: CustomType;
    is_collection: boolean;
    collection_type?: 'array' | 'map' | 'set' | 'null';
    role?: AssetRole;  // Role of this asset in the workflow (input, output, or intermediate/WIP)

    // Status-related fields
    error_message?: string;  // Error message if status is ERROR
    last_updated_by?: string;  // Who/what last updated this asset
    ready_at?: string;  // When the asset became ready (ISO string)

    asset_metadata: {
        createdAt: string;
        updatedAt: string;
        creator: string | null;
        tags: string[];
        agent_associations: string[];
        version: number;
        token_count: number;
    };
}

// External system information (matches backend)
export interface ExternalSystemInfo {
    id: string;
    name: string;
    description: string;
    type: 'messaging' | 'database' | 'storage' | 'web' | 'social' | 'file_system';
    connection_schema: Record<string, any>;
    capabilities: string[];
    base_url?: string;
    documentation_url?: string;
    rate_limits?: Record<string, any>;
}

// Tool parameters - matches backend tools.py structure (no inheritance to avoid conflicts)
export interface ToolParameter {
    name: string;
    description: string;
    required: boolean;
    schema?: Record<string, any>;
}

// Tool outputs - matches backend tools.py structure (no inheritance to avoid conflicts)
export interface ToolOutput {
    name: string;
    description: string;
    schema?: Record<string, any>;
}

// Tool definition - matches backend tools.py structure exactly
export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    parameters: ToolParameter[];
    outputs: ToolOutput[];
    examples?: Array<{
        description: string;
        input: Record<string, any>;
        output: Record<string, any>;
    }>;

    // External system integration (matches backend)
    external_system?: ExternalSystemInfo;

    // Legacy support for required_resources (used in mission prompt)
    required_resources?: string[];

    // Execution handler (present in backend but not used in frontend)
    execution_handler?: any;
}

// Tool definition utility functions
export function toolAccessesExternalSystem(tool: ToolDefinition): boolean {
    return tool.external_system !== undefined || (tool.required_resources !== undefined && tool.required_resources.length > 0);
}

export function getToolExternalSystemId(tool: ToolDefinition): string | undefined {
    if (tool.external_system) {
        return tool.external_system.id;
    } else if (tool.required_resources && tool.required_resources.length > 0) {
        return tool.required_resources[0]; // Return first resource for legacy compatibility
    }
    return undefined;
}

// Utility functions for schema operations
export function isCompatibleSchema(sourceSchema: SchemaType, targetSchema: SchemaType): boolean {
    // Basic type compatibility check
    if (sourceSchema.type === targetSchema.type) {
        return true;
    }

    // Allow string -> any custom type conversion
    if (sourceSchema.type === 'string' && isCustomType(targetSchema.type)) {
        return true;
    }

    // Allow object -> any custom type conversion
    if (sourceSchema.type === 'object' && isCustomType(targetSchema.type)) {
        return true;
    }

    return false;
}

export function isCustomType(type: ValueType): type is CustomType {
    const customTypes: CustomType[] = ['email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap'];
    return customTypes.includes(type as CustomType);
}

export function isPrimitiveType(type: ValueType): type is PrimitiveType {
    const primitiveTypes: PrimitiveType[] = ['string', 'number', 'boolean'];
    return primitiveTypes.includes(type as PrimitiveType);
}

// Asset status utility functions
export function getPendingAssets(assets: Asset[]): Asset[] {
    return assets.filter(asset => asset.status === AssetStatus.PENDING);
}

export function getReadyAssets(assets: Asset[]): Asset[] {
    return assets.filter(asset => asset.status === AssetStatus.READY);
}

export function getFailedAssets(assets: Asset[]): Asset[] {
    return assets.filter(asset => asset.status === AssetStatus.ERROR);
}

export function checkMissionReady(inputAssets: Asset[]): { ready: boolean; messages: string[] } {
    const pendingInputs = inputAssets.filter(asset => asset.status !== AssetStatus.READY).map(asset => asset.name);
    const failedInputs = inputAssets.filter(asset => asset.status === AssetStatus.ERROR).map(asset => asset.name);

    if (failedInputs.length > 0) {
        return { ready: false, messages: [`Failed inputs that need attention: ${failedInputs.join(', ')}`] };
    } else if (pendingInputs.length > 0) {
        return { ready: false, messages: [`Pending inputs from user: ${pendingInputs.join(', ')}`] };
    } else {
        return { ready: true, messages: [] };
    }
}

export function markHopOutputsReady(
    hopState: Record<string, Asset>,
    outputMapping: Record<string, string>,
    missionState: Record<string, Asset>,
    updatedBy: string = "hop_execution"
): string[] {
    /**
     * Mark hop output assets as ready when hop completes successfully
     * 
     * @param hopState - The hop's local asset state
     * @param outputMapping - Maps hop local asset names to mission asset IDs
     * @param missionState - The mission's global asset state to update
     * @param updatedBy - Who is marking the assets as ready
     * @returns Array of asset names that were marked as ready
     */
    const markedReady: string[] = [];

    for (const [hopLocalName, missionAssetId] of Object.entries(outputMapping)) {
        // Get the asset from hop's local state
        const hopAsset = hopState[hopLocalName];
        if (hopAsset && hopAsset.status === AssetStatus.READY) {
            // Find the corresponding asset in mission state
            const missionAsset = missionState[missionAssetId];
            if (missionAsset) {
                // Mark the mission asset as ready
                const updatedAsset = markAssetReady(missionAsset, updatedBy);
                // Copy the value from hop asset to mission asset
                updatedAsset.value = hopAsset.value;
                // Update the mission state
                missionState[missionAssetId] = updatedAsset;
                markedReady.push(missionAsset.name);
                console.log(`Marked mission asset '${missionAsset.name}' as ready from hop output`);
            }
        }
    }

    return markedReady;
}

// Asset helper methods (for use with Asset objects)
export function markAssetReady(asset: Asset, updatedBy?: string): Asset {
    return {
        ...asset,
        status: AssetStatus.READY,
        ready_at: new Date().toISOString(),
        last_updated_by: updatedBy,
        error_message: undefined,
        asset_metadata: {
            ...asset.asset_metadata,
            updatedAt: new Date().toISOString()
        }
    };
}

export function markAssetError(asset: Asset, errorMessage: string, updatedBy?: string): Asset {
    return {
        ...asset,
        status: AssetStatus.ERROR,
        error_message: errorMessage,
        last_updated_by: updatedBy,
        asset_metadata: {
            ...asset.asset_metadata,
            updatedAt: new Date().toISOString()
        }
    };
}

export function markAssetInProgress(asset: Asset, updatedBy?: string): Asset {
    return {
        ...asset,
        status: AssetStatus.IN_PROGRESS,
        last_updated_by: updatedBy,
        error_message: undefined,
        asset_metadata: {
            ...asset.asset_metadata,
            updatedAt: new Date().toISOString()
        }
    };
}

export function isAssetAvailable(asset: Asset): boolean {
    return asset.status === AssetStatus.READY;
}

export function assetNeedsAttention(asset: Asset): boolean {
    return asset.status === AssetStatus.ERROR || asset.status === AssetStatus.EXPIRED;
} 
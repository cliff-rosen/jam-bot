export enum AssetType {
    FILE = "file",
    PRIMITIVE = "primitive",
    OBJECT = "object"
}

export enum CollectionType {
    ARRAY = "array",
    MAP = "map",
    SET = "set",
    NONE = "null"
}

export interface Asset {
    id: string;
    type: AssetType;
    subtype?: string;
    is_collection: boolean;
    collection_type?: CollectionType;
    content: any;
    asset_metadata: Record<string, any>;
}

export interface AssetPersistence {
    isInDb: boolean;
    dbId?: string;
    isDirty?: boolean;
    lastSyncedAt?: string;
    version?: number;
}

export interface AssetWithPersistence extends Asset {
    persistence: AssetPersistence;
} 
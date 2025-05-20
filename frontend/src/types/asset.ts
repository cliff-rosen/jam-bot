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

export enum DataType {
    UNSTRUCTURED = "unstructured",
    EMAIL_LIST = "email_list",
    GENERIC_LIST = "generic_list",
    GENERIC_TABLE = "generic_table",
    EMAIL_MESSAGE = "email_message",
    EMAIL_SUMMARIES_LIST = "email_summaries_list"
}

export interface Asset {
    id: string;
    name: string;
    description?: string;
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
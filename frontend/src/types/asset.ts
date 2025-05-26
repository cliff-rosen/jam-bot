export enum AssetType {
    FILE = "file",
    PRIMITIVE = "primitive",
    OBJECT = "object",
    DATABASE_ENTITY = "database_entity"
}

export enum CollectionType {
    ARRAY = "array",
    MAP = "map",
    SET = "set",
    NONE = "null"
}

export enum AssetSubtype {
    EMAIL = "email",
    NEWSLETTER = "newsletter",
    SEARCH_RESULT = "search_result",
    WEB_PAGE = "web_page",
    PUBMED_ARTICLE = "pubmed_article"
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

export interface Asset {
    id: string;
    name: string;
    description?: string;
    type: AssetType;
    subtype?: AssetSubtype;
    is_collection: boolean;
    collection_type?: CollectionType;
    content: any;
    asset_metadata: AssetMetadata;
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
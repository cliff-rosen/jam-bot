export enum FileType {
    // Common file types
    PDF = 'pdf',
    DOC = 'doc',
    DOCX = 'docx',
    TXT = 'txt',
    CSV = 'csv',
    JSON = 'json',
    // Image types
    PNG = 'png',
    JPG = 'jpg',
    JPEG = 'jpeg',
    GIF = 'gif',
    // Audio/Video types
    MP3 = 'mp3',
    MP4 = 'mp4',
    WAV = 'wav',
    // Other
    UNKNOWN = 'unknown'
}

export enum DataType {
    // Unstructured data (default)
    UNSTRUCTURED = 'unstructured',
    // Structured data types
    EMAIL_LIST = 'email_list',
    GENERIC_LIST = 'generic_list',
    GENERIC_TABLE = 'generic_table',
    EMAIL_MESSAGE = 'email_message',
    EMAIL_SUMMARIES_LIST = 'email_summaries_list'
}

export enum AssetStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    READY = 'READY',
    ERROR = 'ERROR'
}

export interface AssetPersistence {
    // Whether the asset exists in the database
    isInDb: boolean;
    // If the asset is in the db, this is its database ID
    dbId?: string;
    // If the asset is in the db, this tracks if it has been modified since loading
    isDirty?: boolean;
    // When the asset was last synced with the database
    lastSyncedAt?: string;
    // Version number in the database
    version?: number;
}

export interface AssetMetadata {
    createdAt: string;
    updatedAt: string;
    creator?: string;
    tags?: string[];
    agent_associations?: string[];
    name?: string;
    size?: number;
    lastModified?: number;
    error?: string;
    agentId?: string;
    prompt_template_param?: string;  // The parameter name this asset maps to in a prompt template
}

export interface Asset {
    // Core fields
    asset_id: string;
    name: string;
    description?: string;

    // Type information
    fileType: FileType;
    dataType: DataType;

    // Content and status
    content: any;
    status: AssetStatus;

    // Metadata and persistence
    metadata: AssetMetadata;
    persistence: AssetPersistence;
} 
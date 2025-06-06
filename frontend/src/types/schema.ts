// Unified Schema System for Assets, Tool Parameters, and Tool Outputs

export type PrimitiveType = 'string' | 'number' | 'boolean';
export type CustomType = 'email' | 'webpage' | 'search_result' | 'pubmed_article' | 'newsletter' | 'daily_newsletter_recap';
export type ComplexType = 'object' | 'file' | 'database_entity' | CustomType;
export type ValueType = PrimitiveType | ComplexType;

export interface SchemaType {
    type: ValueType;
    description?: string;
    is_array: boolean;
    fields?: Record<string, SchemaType>;  // for nested objects
}

// Base schema entity - shared by assets and tool params/outputs
export interface SchemaEntity {
    id: string;
    name: string;
    description: string;
    schema: SchemaType;
}

// Assets extend SchemaEntity with actual value
export interface Asset extends SchemaEntity {
    value?: any;  // the actual data content
    // Asset-specific metadata
    subtype?: CustomType;
    is_collection: boolean;
    collection_type?: 'array' | 'map' | 'set' | 'null';
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

// Tool parameters - schema definition only
export interface ToolParameter extends SchemaEntity {
    required?: boolean;
    default?: any;
    examples?: any[];
}

// Tool outputs - schema definition only  
export interface ToolOutput extends SchemaEntity {
    examples?: any[];
}

// Tool definition using unified schema
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
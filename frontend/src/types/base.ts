/**
 * Base Schema Definitions
 *
 * This file contains the most fundamental, shared types and interfaces that
 * other schema modules will build upon. It is the root of the new,
 * modular schema system for the frontend.
 */

// --- Common Type Definitions ---

export type PrimitiveType = 'string' | 'number' | 'boolean';
export type CustomType = 'email' | 'webpage' | 'search_result' | 'pubmed_article' | 'newsletter' | 'daily_newsletter_recap';
export type ComplexType = 'object' | 'file' | 'database_entity' | CustomType;
export type ValueType = PrimitiveType | ComplexType;

// Defines the role an asset plays within a workflow.
export type AssetRole = 'input' | 'output' | 'intermediate';

// --- Core Schema Interfaces ---

export interface SchemaType {
    type: ValueType;
    description?: string;
    is_array: boolean;
    fields?: Record<string, SchemaType>; // for nested objects
}

export interface SchemaEntity {
    id: string;
    name: string;
    description: string;
    schema: SchemaType;
}

// --- Utility Functions ---

export function isCustomType(type: ValueType): type is CustomType {
    const customTypes: CustomType[] = ['email', 'webpage', 'search_result', 'pubmed_article', 'newsletter', 'daily_newsletter_recap'];
    return customTypes.includes(type as CustomType);
}

export function isPrimitiveType(type: ValueType): type is PrimitiveType {
    const primitiveTypes: PrimitiveType[] = ['string', 'number', 'boolean'];
    return primitiveTypes.includes(type as PrimitiveType);
} 
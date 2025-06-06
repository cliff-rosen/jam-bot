
export type CustomType = 'email' | 'webpage' | 'search_result' | 'pubmed_article';
export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'object' | 'file' | CustomType;
export type ValueType = PrimitiveType | ComplexType;

export interface SchemaType {
    type: ValueType;
    description?: string;
    is_array: boolean;
    fields?: Record<string, SchemaType>;
}

export interface Asset {
    id: string;
    name: string;
    description?: string;
    type: SchemaType;
    subtype?: CustomType;
    schema: SchemaType;
    value?: ValueType;
}



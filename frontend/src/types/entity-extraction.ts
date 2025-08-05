/**
 * Types for entity relationship extraction
 */

export type EntityType = 
  | 'medical_condition'
  | 'biological_factor'
  | 'intervention'
  | 'patient_characteristic'
  | 'psychological_factor'
  | 'outcome'
  | 'gene'
  | 'protein'
  | 'pathway'
  | 'drug'
  | 'other';

export type RelationshipType = 
  | 'causal'
  | 'therapeutic'
  | 'associative'
  | 'temporal'
  | 'inhibitory'
  | 'regulatory'
  | 'interactive'
  | 'paradoxical';

export type PatternComplexity = 'SIMPLE' | 'COMPLEX';

export type RelationshipStrength = 'strong' | 'moderate' | 'weak';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  mentions?: string[];
}

export interface Relationship {
  source_entity_id: string;
  target_entity_id: string;
  type: RelationshipType;
  description: string;
  evidence?: string;
  strength?: RelationshipStrength;
}

export interface EntityRelationshipAnalysis {
  pattern_complexity: PatternComplexity;
  entities: Entity[];
  relationships: Relationship[];
  complexity_justification?: string;
  clinical_significance?: string;
  key_findings?: string[];
  entity_count?: number;
  relationship_count?: number;
}

export interface EntityExtractionRequest {
  article_id: string;
  title: string;
  abstract: string;
  full_text?: string | null;
  include_gene_data?: boolean;
  include_drug_data?: boolean;
  focus_areas?: string[];
}

export interface EntityExtractionResponse {
  article_id: string;
  analysis: EntityRelationshipAnalysis;
  extraction_metadata?: {
    extraction_timestamp?: string;
    confidence_score?: number;
    include_gene_data?: boolean;
    include_drug_data?: boolean;
    focus_areas?: string[];
  };
}
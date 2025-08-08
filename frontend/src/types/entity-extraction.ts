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
  | 'environmental_factor'
  | 'animal_model'
  | 'exposure'
  | 'other';

export type RelationshipType =
  | 'causal'
  | 'therapeutic'
  | 'associative'
  | 'temporal'
  | 'inhibitory'
  | 'regulatory'
  | 'interactive'
  | 'paradoxical'
  | 'correlative'
  | 'predictive';

export type PatternComplexity = 'SIMPLE' | 'COMPLEX';

export type RelationshipStrength = 'strong' | 'moderate' | 'weak';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  role?: string;
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

export interface FocusEntity extends Entity {
  relevance_score: number;
}

export interface RelatedEntity extends Entity {
  connection_to_focus?: string;
}

export interface FocusedRelationship extends Relationship {
  involves_focus_entity: boolean;
}

export interface FocusedEntityRelationshipAnalysis {
  pattern_complexity: PatternComplexity;
  focus_entities: FocusEntity[];
  related_entities?: RelatedEntity[];
  relationships: FocusedRelationship[];
  focus_entity_network?: {
    central_nodes?: string[];
    key_pathways?: Array<{
      pathway: string[];
      description: string;
    }>;
    network_density?: 'sparse' | 'moderate' | 'dense';
  };
  complexity_justification?: string;
  clinical_significance?: string;
  key_findings?: string[];
  focus_entity_insights?: Array<{
    focus_entity: string;
    key_insight: string;
    supporting_evidence?: string;
  }>;
}

export interface EntityExtractionRequest {
  article_id: string;
  title: string;
  abstract: string;
  full_text?: string | null;
  include_gene_data?: boolean;
  include_drug_data?: boolean;
  focus_areas?: string[];
  group_id?: string; // For caching in group context
  force_refresh?: boolean; // Force refresh even if cached
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

export interface ArticleArchetypeResponse {
  article_id: string;
  archetype: string;
  study_type?: string;
}
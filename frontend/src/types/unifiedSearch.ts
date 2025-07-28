/**
 * Unified Search Types
 * 
 * TypeScript types for the unified search system that works with multiple
 * academic search providers (PubMed, Google Scholar, etc.)
 */

export type SearchProvider = "pubmed" | "scholar";

export interface CanonicalResearchArticle {
  // Core identification
  id: string;
  source: SearchProvider;
  
  // Core metadata
  title: string;
  authors: string[];
  abstract?: string;
  snippet?: string;
  
  // Publication details
  journal?: string;
  publication_date?: string;
  publication_year?: number;
  
  // Identifiers and links
  doi?: string;
  url?: string;
  pdf_url?: string;
  
  // Classification and keywords
  keywords: string[];
  mesh_terms: string[];
  categories: string[];
  
  // Citation and related content
  citation_count?: number;
  cited_by_url?: string;
  related_articles_url?: string;
  versions_url?: string;
  
  // Search context
  search_position?: number;
  relevance_score?: number;
  
  // Research analysis results
  extracted_features?: ExtractedFeatures;
  quality_scores?: Record<string, number>;
  
  // Source preservation
  source_metadata?: Record<string, any>;
  
  // System metadata
  indexed_at?: string;
  retrieved_at?: string;
}

export interface UnifiedSearchParams {
  provider: SearchProvider;
  query: string;
  num_results: number;
  sort_by: "relevance" | "date";
  year_low?: number;
  year_high?: number;
  date_type?: "completion" | "publication" | "entry" | "revised";
  include_citations: boolean;
  include_pdf_links: boolean;
  // Pagination support
  page?: number;
  page_size?: number;
  offset?: number;
}

export interface SearchMetadata {
  total_results?: number;
  returned_results: number;
  search_time: number;
  provider: string;
  query_translation?: string;
  provider_metadata: Record<string, any>;
  // Pagination metadata
  current_page?: number;
  page_size?: number;
  total_pages?: number;
  has_next_page?: boolean;
  has_prev_page?: boolean;
}

export interface UnifiedSearchResponse {
  articles: CanonicalResearchArticle[];
  metadata: SearchMetadata;
  success: boolean;
  error?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  supported_features: string[];
  rate_limits?: Record<string, any>;
}

export interface ExtractedFeatures {
  // Common features across providers
  relevance_score?: number;
  confidence_score?: number;
  
  // PubMed-specific features
  clinical_relevance?: "high" | "medium" | "low" | "none";
  study_design?: string;
  evidence_level?: string;
  population_size?: string;
  key_findings?: string;
  methodology_quality?: "excellent" | "good" | "fair" | "poor";
  statistical_significance?: "yes" | "no" | "not reported";
  therapeutic_area?: string;
  intervention_type?: string;
  primary_outcome?: string;
  extraction_notes?: string;
  
  // Scholar-specific features  
  poi_relevance?: "yes" | "no";
  doi_relevance?: "yes" | "no";
  is_systematic?: "yes" | "no";
  study_type?: "human RCT" | "human non-RCT" | "non-human life science" | "non life science" | "not a study";
  study_outcome?: "effectiveness" | "safety" | "diagnostics" | "biomarker" | "other";
}

// Legacy compatibility types (for gradual migration)
export interface CanonicalScholarArticle {
  title: string;
  link?: string;
  authors: string[];
  publication_info?: string;
  snippet?: string;
  cited_by_count?: number;
  cited_by_link?: string;
  related_pages_link?: string;
  versions_link?: string;
  pdf_link?: string;
  year?: number;
  position: number;
  metadata?: Record<string, any>;
}

export interface CanonicalPubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publication_date?: string;
  doi?: string;
  keywords: string[];
  mesh_terms: string[];
  citation_count?: number;
  metadata?: Record<string, any>;
}

// Batch search support
export interface BatchSearchRequest {
  providers: SearchProvider[];
  query: string;
  num_results: number;
  sort_by: "relevance" | "date";
  year_low?: number;
  year_high?: number;
  // Pagination support
  page?: number;
  page_size?: number;
}

export interface BatchSearchResponse {
  results: UnifiedSearchResponse[];
}

// Filter types for unified articles
export interface UnifiedWorkbenchFilters {
  // Source filtering
  sources: SearchProvider[];
  
  // Common filters
  min_confidence: number;
  min_relevance_score: number;
  has_pdf: boolean;
  has_doi: boolean;
  
  // PubMed-specific filters
  clinical_relevance: "all" | "high" | "medium" | "low" | "none";
  study_design: "all" | string;
  evidence_level: "all" | string;
  methodology_quality: "all" | "excellent" | "good" | "fair" | "poor";
  
  // Scholar-specific filters
  poi_relevance: "all" | "yes" | "no";
  doi_relevance: "all" | "yes" | "no";
  is_systematic: "all" | "yes" | "no";
  study_type: "all" | "human RCT" | "human non-RCT" | "non-human life science" | "non life science" | "not a study";
  study_outcome: "all" | "effectiveness" | "safety" | "diagnostics" | "biomarker" | "other";
}

// Provider availability
export interface ProviderStatus {
  id: SearchProvider;
  available: boolean;
  last_checked: string;
  error?: string;
}

// Workbench state
export interface UnifiedWorkbenchState {
  // Search configuration
  searchParams: UnifiedSearchParams;
  selectedProviders: SearchProvider[];
  availableProviders: SearchProvider[];
  
  // Results
  articles: CanonicalResearchArticle[];
  searchMetadata?: SearchMetadata[];
  
  // UI state
  isSearching: boolean;
  isExtracting: boolean;
  searchError?: string;
  
  // Filtering
  filters: UnifiedWorkbenchFilters;
  filteredArticles: CanonicalResearchArticle[];
  
  // Analysis
  extractionResults?: Record<string, ExtractedFeatures>;
  
  // Legacy support (for gradual migration)
  legacyArticles?: CanonicalScholarArticle[];
}
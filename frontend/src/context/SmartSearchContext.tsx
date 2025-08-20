/**
 * SmartSearchContext - Unified state management for Smart Search Lab
 * 
 * Follows the WorkbenchContext pattern where business logic is centralized
 * in the context while UI handlers remain in the page components.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import type {
  FilteredArticle,
  FilteringProgress
} from '@/types/smart-search';
import type {
  EvidenceSpecificationResponse,
  KeywordGenerationResponse,
  SearchExecutionResponse,
  DiscriminatorGenerationResponse,
  FeatureExtractionResponse
} from '@/lib/api/smartSearchApi';

import { smartSearchApi } from '@/lib/api/smartSearchApi';

// ================== STATE INTERFACE ==================

export type SmartSearchStep = 'query' | 'refinement' | 'search-query' | 'searching' | 'search-results' | 'discriminator' | 'filtering' | 'results';

interface SmartSearchState {
  // WORKFLOW STATE
  step: SmartSearchStep;
  sessionId: string | null;
  
  // STEP DATA
  query: string;
  evidenceSpec: string;
  editedSearchQuery: string;
  editedDiscriminator: string;
  strictness: 'low' | 'medium' | 'high';
  selectedSource: string;
  
  // STEP RESPONSES
  refinement: EvidenceSpecificationResponse | null;
  searchQueryGeneration: KeywordGenerationResponse | null;
  initialQueryCount: { total_count: number; sources_searched: string[] } | null;
  searchResults: SearchExecutionResponse | null;
  discriminatorData: DiscriminatorGenerationResponse | null;
  
  // RESULTS DATA
  filteredArticles: FilteredArticle[];
  filteringProgress: FilteringProgress | null;
  savedCustomColumns: any[];
  
  // LOADING STATES
  queryLoading: boolean;
  searchQueryLoading: boolean;
  searchLoading: boolean;
  discriminatorLoading: boolean;
  
  // ERROR STATE
  error: string | null;
}

// ================== ACTIONS INTERFACE ==================

interface SmartSearchActions {
  // STEP WORKFLOW
  updateStep: (step: SmartSearchStep) => void;
  canNavigateToStep: (targetStep: SmartSearchStep) => boolean;
  resetToStep: (sessionId: string, step: string) => Promise<void>;
  resetAllState: () => void;
  
  // STEP 1: Evidence Specification
  createEvidenceSpecification: () => Promise<EvidenceSpecificationResponse>;
  updateQuery: (query: string) => void;
  
  // STEP 2: Search Query Generation
  generateSearchKeywords: (source?: string) => Promise<KeywordGenerationResponse>;
  updateEvidenceSpec: (spec: string) => void;
  updateSelectedSource: (source: string) => void;
  
  // STEP 3: Query Testing and Optimization
  testQueryCount: (queryOverride?: string) => Promise<{ total_count: number; sources_searched: string[] }>;
  generateOptimizedQuery: (evidenceSpecOverride?: string) => Promise<any>;
  updateEditedSearchQuery: (query: string) => void;
  
  // STEP 4: Search Execution
  executeSearch: (offset?: number, maxResults?: number) => Promise<SearchExecutionResponse>;
  
  // STEP 5: Discriminator Generation
  generateDiscriminator: () => Promise<DiscriminatorGenerationResponse>;
  updateEditedDiscriminator: (discriminator: string) => void;
  updateStrictness: (strictness: 'low' | 'medium' | 'high') => void;
  
  // STEP 6: Filtering
  filterArticles: (request: any) => Promise<any>;
  updateFilteringProgress: (progress: FilteringProgress | null) => void;
  
  // STEP 7: Feature Extraction
  extractFeatures: (sessionId: string, features: any[]) => Promise<FeatureExtractionResponse>;
  updateSavedCustomColumns: (columns: any[]) => void;
  
  // UTILITY
  clearError: () => void;
}

// ================== CONTEXT ==================

interface SmartSearchContextType extends SmartSearchState, SmartSearchActions { }

const SmartSearchContext = createContext<SmartSearchContextType | undefined>(undefined);

// ================== PROVIDER COMPONENT ==================

interface SmartSearchProviderProps {
  children: React.ReactNode;
}

export function SmartSearchProvider({ children }: SmartSearchProviderProps) {
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get('session');
  
  // ================== STATE ==================
  
  // Workflow state
  const [step, setStep] = useState<SmartSearchStep>('query');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Step data
  const [query, setQuery] = useState('');
  const [evidenceSpec, setEvidenceSpec] = useState('');
  const [editedSearchQuery, setEditedSearchQuery] = useState('');
  const [editedDiscriminator, setEditedDiscriminator] = useState('');
  const [strictness, setStrictness] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedSource, setSelectedSource] = useState<string>(() => {
    return localStorage.getItem('smartSearchSelectedSource') || 'pubmed';
  });
  
  // Step responses
  const [refinement, setRefinement] = useState<EvidenceSpecificationResponse | null>(null);
  const [searchQueryGeneration, setSearchQueryGeneration] = useState<KeywordGenerationResponse | null>(null);
  const [initialQueryCount, setInitialQueryCount] = useState<{ total_count: number; sources_searched: string[] } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchExecutionResponse | null>(null);
  const [discriminatorData, setDiscriminatorData] = useState<DiscriminatorGenerationResponse | null>(null);
  
  // Results data
  const [filteredArticles, setFilteredArticles] = useState<FilteredArticle[]>([]);
  const [filteringProgress, setFilteringProgress] = useState<FilteringProgress | null>(null);
  const [savedCustomColumns, setSavedCustomColumns] = useState<any[]>([]);
  
  // Loading states
  const [queryLoading, setQueryLoading] = useState(false);
  const [searchQueryLoading, setSearchQueryLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [discriminatorLoading, setDiscriminatorLoading] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // ================== EFFECTS ==================
  
  // Save selected source to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('smartSearchSelectedSource', selectedSource);
  }, [selectedSource]);
  
  // Load existing session if session ID is provided in URL
  useEffect(() => {
    if (!resumeSessionId) return;
    
    const loadSession = async () => {
      try {
        const session = await smartSearchApi.getSession(resumeSessionId);
        
        // Restore session state
        setSessionId(session.id);
        setQuery(session.original_question || '');
        setEvidenceSpec(session.submitted_refined_question || session.refined_question || '');
        setEditedSearchQuery(session.submitted_search_query || session.generated_search_query || '');
        
        // Restore additional component state based on available data
        const lastStep = session.last_step_completed;
        
        // Always create refinement object if we're at or past refinement step
        if (lastStep && ['question_refinement', 'search_query_generation', 'search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
          setRefinement({
            original_query: session.original_question,
            evidence_specification: session.refined_question || '',
            session_id: session.id
          });
        }
        
        // Always create search query generation object if we're at or past search query step
        if (lastStep && ['search_query_generation', 'search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
          setSearchQueryGeneration({
            search_query: session.generated_search_query || '',
            evidence_specification: session.submitted_refined_question || session.refined_question || '',
            session_id: session.id
          });
        }
        
        if (session.search_metadata) {
          setInitialQueryCount({
            total_count: session.search_metadata.total_available || 0,
            sources_searched: session.search_metadata.sources_searched || []
          });
          
          // Reconstruct searchResults state for proper display of article counts
          if (lastStep && ['search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
            setSearchResults({
              articles: [], // We don't store the actual articles in session, only metadata
              pagination: {
                total_available: session.search_metadata.total_available || 0,
                returned: session.search_metadata.total_retrieved || 0,
                offset: 0,
                has_more: (session.search_metadata.total_retrieved || 0) < (session.search_metadata.total_available || 0)
              },
              sources_searched: session.search_metadata.sources_searched || [],
              session_id: session.id
            });
          }
        }
        
        // Always create discriminator data if we're at discriminator step or later
        if (lastStep && ['discriminator_generation', 'filtering'].includes(lastStep)) {
          setDiscriminatorData({
            discriminator_prompt: session.generated_discriminator || '',
            evidence_specification: session.submitted_refined_question || session.refined_question || '',
            search_query: session.submitted_search_query || session.generated_search_query || '',
            strictness: session.filter_strictness || 'medium',
            session_id: session.id
          });
          setEditedDiscriminator(session.submitted_discriminator || session.generated_discriminator || '');
        }
        
        if (session.filter_strictness) {
          setStrictness(session.filter_strictness as 'low' | 'medium' | 'high');
        }
        
        // Restore filtered articles if they exist
        if (session.filtered_articles && Array.isArray(session.filtered_articles)) {
          setFilteredArticles(session.filtered_articles);
        }
        
        // Restore custom columns if they exist
        if (session.filtering_metadata?.custom_columns) {
          setSavedCustomColumns(session.filtering_metadata.custom_columns);
        }
        
        // Map backend step to frontend step
        const mapBackendStepToFrontend = (backendStep: string, session: any): SmartSearchStep => {
          switch (backendStep) {
            case 'question_input':
              return 'query';
            case 'question_refinement':
              return 'refinement';
            case 'search_query_generation':
              return 'search-query';
            case 'search_execution':
              // Only show search-results if we have metadata, otherwise fall back
              return session.search_metadata?.total_available ? 'search-results' : 'search-query';
            case 'discriminator_generation':
              return 'discriminator';
            case 'filtering':
              // If filtering is complete (has results), show results step
              return session.filtering_metadata?.accepted !== undefined ? 'results' : 'filtering';
            default:
              return 'query';
          }
        };
        
        // Determine which step to show based on session progress
        const frontendStep = mapBackendStepToFrontend(lastStep || 'question_input', session);
        setStep(frontendStep);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
        setError(errorMessage);
        console.error('Failed to load session from URL:', err);
      }
    };
    
    loadSession();
  }, [resumeSessionId]);
  
  // ================== WORKFLOW MANAGEMENT ==================
  
  const updateStep = useCallback((newStep: SmartSearchStep) => {
    setStep(newStep);
  }, []);
  
  const canNavigateToStep = useCallback((targetStep: SmartSearchStep): boolean => {
    const stepOrder = ['query', 'refinement', 'search-query', 'search-results', 'discriminator', 'filtering', 'results'];
    const currentIndex = stepOrder.indexOf(step);
    const targetIndex = stepOrder.indexOf(targetStep);
    
    // Can't go back to current or future steps, and can't go back if no session exists yet
    return targetIndex < currentIndex && sessionId !== null;
  }, [step, sessionId]);
  
  const resetToStep = useCallback(async (sessionId: string, targetStep: string) => {
    try {
      await smartSearchApi.resetSessionToStep(sessionId, targetStep);
      
      // Clear frontend state for steps forward of target
      const stepOrder = ['query', 'refinement', 'search-query', 'search-results', 'discriminator', 'filtering', 'results'];
      const targetIndex = stepOrder.indexOf(targetStep.replace('_', '-'));
      
      if (targetIndex < stepOrder.indexOf('refinement')) {
        setRefinement(null);
        setEvidenceSpec('');
      }
      if (targetIndex < stepOrder.indexOf('search-query')) {
        setSearchQueryGeneration(null);
        setEditedSearchQuery('');
        setInitialQueryCount(null);
      }
      if (targetIndex < stepOrder.indexOf('search-results')) {
        setSearchResults(null);
      }
      if (targetIndex < stepOrder.indexOf('discriminator')) {
        setDiscriminatorData(null);
        setEditedDiscriminator('');
      }
      if (targetIndex < stepOrder.indexOf('filtering')) {
        setFilteredArticles([]);
        setFilteringProgress(null);
      }
      
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset session';
      setError(errorMessage);
      throw err;
    }
  }, []);
  
  const resetAllState = useCallback(() => {
    setStep('query');
    setSessionId(null);
    setQuery('');
    setEvidenceSpec('');
    setEditedSearchQuery('');
    setEditedDiscriminator('');
    setRefinement(null);
    setSearchQueryGeneration(null);
    setInitialQueryCount(null);
    setSearchResults(null);
    setDiscriminatorData(null);
    setFilteredArticles([]);
    setFilteringProgress(null);
    setError(null);
  }, []);
  
  
  
  // ================== STEP BUSINESS METHODS ==================
  
  // Step 1: Evidence Specification
  const createEvidenceSpecification = useCallback(async (): Promise<EvidenceSpecificationResponse> => {
    if (!query.trim()) {
      throw new Error('Query is required');
    }
    
    setQueryLoading(true);
    setError(null);
    
    try {
      const response = await smartSearchApi.createEvidenceSpecification({
        query: query,
        session_id: sessionId || undefined
      });
      
      setRefinement(response);
      setEvidenceSpec(response.evidence_specification);
      setSessionId(response.session_id);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Evidence specification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setQueryLoading(false);
    }
  }, [query, sessionId]);
  
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);
  
  // Step 2: Search Query Generation
  const generateSearchKeywords = useCallback(async (source?: string): Promise<KeywordGenerationResponse> => {
    if (!evidenceSpec.trim()) {
      throw new Error('Evidence specification is required');
    }
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    // Update source if provided
    if (source) {
      setSelectedSource(source);
    }
    
    setSearchQueryLoading(true);
    setError(null);
    
    try {
      const response = await smartSearchApi.generateKeywords({
        evidence_specification: evidenceSpec,
        session_id: sessionId,
        selected_sources: [source || selectedSource]
      });
      
      setSearchQueryGeneration(response);
      setEditedSearchQuery(response.search_query);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Keyword generation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setSearchQueryLoading(false);
    }
  }, [evidenceSpec, sessionId, selectedSource]);
  
  const updateEvidenceSpec = useCallback((spec: string) => {
    setEvidenceSpec(spec);
  }, []);
  
  const updateSelectedSource = useCallback((source: string) => {
    setSelectedSource(source);
  }, []);
  
  // Step 3: Query Testing and Optimization
  const testQueryCount = useCallback(async (queryOverride?: string): Promise<{ total_count: number; sources_searched: string[] }> => {
    const queryToTest = queryOverride || editedSearchQuery;
    if (!queryToTest.trim()) {
      throw new Error('Search query is required');
    }
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    try {
      const response = await smartSearchApi.testQueryCount({
        search_query: queryToTest,
        session_id: sessionId,
        selected_sources: [selectedSource]
      });
      
      const result = {
        total_count: response.total_count,
        sources_searched: response.sources_searched
      };
      
      setInitialQueryCount(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query count test failed';
      setError(errorMessage);
      throw err;
    }
  }, [editedSearchQuery, sessionId, selectedSource]);
  
  const generateOptimizedQuery = useCallback(async (evidenceSpecOverride?: string) => {
    const specToUse = evidenceSpecOverride || evidenceSpec;
    if (!editedSearchQuery.trim()) {
      throw new Error('Search query is required');
    }
    if (!specToUse.trim()) {
      throw new Error('Evidence specification is required');
    }
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    try {
      const response = await smartSearchApi.generateOptimizedQuery({
        current_query: editedSearchQuery,
        evidence_specification: specToUse,
        target_max_results: 250,
        session_id: sessionId,
        selected_sources: [selectedSource]
      });
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query optimization failed';
      setError(errorMessage);
      throw err;
    }
  }, [editedSearchQuery, evidenceSpec, sessionId, selectedSource]);
  
  const updateEditedSearchQuery = useCallback((query: string) => {
    setEditedSearchQuery(query);
  }, []);
  
  // Step 4: Search Execution
  const executeSearch = useCallback(async (offset = 0, maxResults?: number): Promise<SearchExecutionResponse> => {
    if (!editedSearchQuery.trim()) {
      throw new Error('Search query is required');
    }
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    setSearchLoading(true);
    setError(null);
    
    try {
      const batchSize = maxResults || (selectedSource === 'google_scholar' ? 20 : 50);
      const results = await smartSearchApi.executeSearch({
        search_query: editedSearchQuery,
        max_results: batchSize,
        offset: offset,
        session_id: sessionId,
        selected_sources: [selectedSource]
      });
      
      if (offset === 0) {
        // Initial search
        setSearchResults(results);
      } else {
        // Load more - combine with existing results
        setSearchResults(prevResults => {
          if (!prevResults) return results;
          
          return {
            ...results,
            articles: [...prevResults.articles, ...results.articles],
            pagination: {
              ...results.pagination,
              returned: prevResults.articles.length + results.articles.length
            }
          };
        });
      }
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search execution failed';
      setError(errorMessage);
      throw err;
    } finally {
      setSearchLoading(false);
    }
  }, [editedSearchQuery, sessionId, selectedSource]);
  
  // Step 5: Discriminator Generation
  const generateDiscriminator = useCallback(async (): Promise<DiscriminatorGenerationResponse> => {
    if (!evidenceSpec.trim()) {
      throw new Error('Evidence specification is required');
    }
    if (!editedSearchQuery.trim()) {
      throw new Error('Search query is required');
    }
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    setDiscriminatorLoading(true);
    setError(null);
    
    try {
      const response = await smartSearchApi.generateDiscriminator({
        evidence_specification: evidenceSpec,
        search_query: editedSearchQuery,
        strictness: strictness,
        session_id: sessionId
      });
      
      setDiscriminatorData(response);
      setEditedDiscriminator(response.discriminator_prompt);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Discriminator generation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setDiscriminatorLoading(false);
    }
  }, [evidenceSpec, editedSearchQuery, strictness, sessionId]);
  
  const updateEditedDiscriminator = useCallback((discriminator: string) => {
    setEditedDiscriminator(discriminator);
  }, []);
  
  const updateStrictness = useCallback((newStrictness: 'low' | 'medium' | 'high') => {
    setStrictness(newStrictness);
  }, []);
  
  // Step 6: Filtering
  const filterArticles = useCallback(async (request: any) => {
    setError(null);
    
    try {
      const response = await smartSearchApi.filterArticles(request);
      setFilteredArticles(response.filtered_articles);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Article filtering failed';
      setError(errorMessage);
      throw err;
    }
  }, []);
  
  const updateFilteringProgress = useCallback((progress: FilteringProgress | null) => {
    setFilteringProgress(progress);
  }, []);
  
  // Step 7: Feature Extraction
  const extractFeatures = useCallback(async (sessionId: string, features: any[]): Promise<FeatureExtractionResponse> => {
    setError(null);
    
    try {
      const response = await smartSearchApi.extractFeatures({
        session_id: sessionId,
        features: features
      });
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Feature extraction failed';
      setError(errorMessage);
      throw err;
    }
  }, []);
  
  const updateSavedCustomColumns = useCallback((columns: any[]) => {
    setSavedCustomColumns(columns);
  }, []);
  
  // ================== UTILITY ==================
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // ================== CONTEXT VALUE ==================
  
  const contextValue: SmartSearchContextType = {
    // State
    step,
    sessionId,
    query,
    evidenceSpec,
    editedSearchQuery,
    editedDiscriminator,
    strictness,
    selectedSource,
    refinement,
    searchQueryGeneration,
    initialQueryCount,
    searchResults,
    discriminatorData,
    filteredArticles,
    filteringProgress,
    savedCustomColumns,
    queryLoading,
    searchQueryLoading,
    searchLoading,
    discriminatorLoading,
    error,
    
    // Actions
    updateStep,
    canNavigateToStep,
    resetToStep,
    resetAllState,
    createEvidenceSpecification,
    updateQuery,
    generateSearchKeywords,
    updateEvidenceSpec,
    updateSelectedSource,
    testQueryCount,
    generateOptimizedQuery,
    updateEditedSearchQuery,
    executeSearch,
    generateDiscriminator,
    updateEditedDiscriminator,
    updateStrictness,
    filterArticles,
    updateFilteringProgress,
    extractFeatures,
    updateSavedCustomColumns,
    clearError,
  };
  
  return (
    <SmartSearchContext.Provider value={contextValue}>
      {children}
    </SmartSearchContext.Provider>
  );
}

// ================== HOOK ==================

export function useSmartSearch() {
  const context = useContext(SmartSearchContext);
  if (!context) {
    throw new Error('useSmartSearch must be used within a SmartSearchProvider');
  }
  return context;
}
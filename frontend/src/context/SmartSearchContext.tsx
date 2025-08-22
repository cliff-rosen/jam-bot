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
  SearchKeywordsResponse,
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
  
  // USER INPUT
  originalQuestion: string;                                      // User's original research question
  
  // AI-GENERATED VERSIONS
  generatedEvidenceSpec: string;                                // AI-generated evidence specification
  generatedSearchKeywords: string;                              // AI-generated boolean search query
  generatedDiscriminator: string;                               // AI-generated semantic filter criteria
  
  // USER-SUBMITTED VERSIONS
  submittedEvidenceSpec: string;                                // User's final evidence specification
  submittedSearchKeywords: string;                              // User's final search keywords
  submittedDiscriminator: string;                               // User's final discriminator
  
  // CONFIGURATION
  strictness: 'low' | 'medium' | 'high';
  selectedSource: string;
  
  // API RESPONSE OBJECTS
  evidenceSpecResponse: EvidenceSpecificationResponse | null;    // Full AI response for evidence spec
  searchKeywordsResponse: SearchKeywordsResponse | null;         // Full AI response for keywords
  discriminatorResponse: DiscriminatorGenerationResponse | null; // Full AI response for discriminator
  keywordsCountResult: { total_count: number; sources_searched: string[] } | null;
  searchResults: SearchExecutionResponse | null;
  
  // RESULTS DATA
  filteredArticles: FilteredArticle[];
  filteringProgress: FilteringProgress | null;
  searchLimitationNote: string | null;
  savedCustomColumns: any[];
  
  // LOADING STATES
  evidenceSpecLoading: boolean;             // Loading AI evidence specification
  searchKeywordsLoading: boolean;           // Loading AI search keywords
  searchExecutionLoading: boolean;          // Loading search results
  discriminatorLoading: boolean;            // Loading AI discriminator
  
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
  generateEvidenceSpecification: () => Promise<EvidenceSpecificationResponse>;
  updateOriginalQuestion: (question: string) => void;
  updateSubmittedEvidenceSpec: (spec: string) => void;
  
  // STEP 2: Search Keyword Generation  
  generateSearchKeywords: (source?: string) => Promise<SearchKeywordsResponse>;
  updateSubmittedSearchKeywords: (keywords: string) => void;
  updateSelectedSource: (source: string) => void;
  
  // STEP 3: Query Testing and Optimization
  testKeywordsCount: (keywordsOverride?: string) => Promise<{ total_count: number; sources_searched: string[] }>;
  generateOptimizedKeywords: (evidenceSpecOverride?: string) => Promise<any>;
  
  // STEP 4: Search Execution
  executeSearch: (offset?: number, maxResults?: number) => Promise<SearchExecutionResponse>;
  
  // STEP 5: Discriminator Generation
  generateDiscriminator: () => Promise<DiscriminatorGenerationResponse>;
  updateSubmittedDiscriminator: (discriminator: string) => void;
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
  
  // User input
  const [originalQuestion, setOriginalQuestion] = useState('');
  
  // AI-generated versions
  const [generatedEvidenceSpec, setGeneratedEvidenceSpec] = useState('');
  const [generatedSearchKeywords, setGeneratedSearchKeywords] = useState('');
  const [generatedDiscriminator, setGeneratedDiscriminator] = useState('');
  
  // User-submitted versions
  const [submittedEvidenceSpec, setSubmittedEvidenceSpec] = useState('');
  const [submittedSearchKeywords, setSubmittedSearchKeywords] = useState('');
  const [submittedDiscriminator, setSubmittedDiscriminator] = useState('');
  
  // Configuration
  const [strictness, setStrictness] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedSource, setSelectedSource] = useState<string>(() => {
    return localStorage.getItem('smartSearchSelectedSource') || 'pubmed';
  });
  
  // API response objects
  const [evidenceSpecResponse, setEvidenceSpecResponse] = useState<EvidenceSpecificationResponse | null>(null);
  const [searchKeywordsResponse, setSearchKeywordsResponse] = useState<SearchKeywordsResponse | null>(null);
  const [discriminatorResponse, setDiscriminatorResponse] = useState<DiscriminatorGenerationResponse | null>(null);
  const [keywordsCountResult, setKeywordsCountResult] = useState<{ total_count: number; sources_searched: string[] } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchExecutionResponse | null>(null);
  
  // Results data
  const [filteredArticles, setFilteredArticles] = useState<FilteredArticle[]>([]);
  const [filteringProgress, setFilteringProgress] = useState<FilteringProgress | null>(null);
  const [searchLimitationNote, setSearchLimitationNote] = useState<string | null>(null);
  const [savedCustomColumns, setSavedCustomColumns] = useState<any[]>([]);
  
  // Loading states
  const [evidenceSpecLoading, setEvidenceSpecLoading] = useState(false);
  const [searchKeywordsLoading, setSearchKeywordsLoading] = useState(false);
  const [searchExecutionLoading, setSearchExecutionLoading] = useState(false);
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
        setOriginalQuestion(session.original_question || '');
        
        // Restore AI-generated versions
        setGeneratedEvidenceSpec(session.generated_evidence_spec || '');
        setGeneratedSearchKeywords(session.generated_search_keywords || '');
        setGeneratedDiscriminator(session.generated_discriminator || '');
        
        // Restore user-submitted versions
        setSubmittedEvidenceSpec(session.submitted_evidence_spec || session.generated_evidence_spec || '');
        setSubmittedSearchKeywords(session.submitted_search_keywords || session.generated_search_keywords || '');
        setSubmittedDiscriminator(session.submitted_discriminator || session.generated_discriminator || '');
        
        // Restore additional component state based on available data
        const lastStep = session.last_step_completed;
        
        // Always create evidence spec response object if we're at or past refinement step
        if (lastStep && ['question_refinement', 'search_query_generation', 'search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
          setEvidenceSpecResponse({
            original_query: session.original_question,
            evidence_specification: session.generated_evidence_spec || '',
            session_id: session.id
          });
        }
        
        // Always create search keywords response object if we're at or past search query step
        if (lastStep && ['search_query_generation', 'search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
          setSearchKeywordsResponse({
            search_keywords: session.generated_search_keywords || '',
            evidence_specification: session.submitted_evidence_spec || session.generated_evidence_spec || '',
            session_id: session.id
          });
        }
        
        if (session.search_metadata) {
          setKeywordsCountResult({
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
        
        // Always create discriminator response if we're at discriminator step or later
        if (lastStep && ['discriminator_generation', 'filtering'].includes(lastStep)) {
          setDiscriminatorResponse({
            discriminator_prompt: session.generated_discriminator || '',
            evidence_specification: session.submitted_evidence_spec || session.generated_evidence_spec || '',
            search_keywords: session.submitted_search_keywords || session.generated_search_keywords || '',
            strictness: session.filter_strictness || 'medium',
            session_id: session.id
          });
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
      
      // Reload session to get the restored state
      const session = await smartSearchApi.getSession(sessionId);
      
      // Restore session state
      setSessionId(session.id);
      setOriginalQuestion(session.original_question || '');
      
      // Restore AI-generated versions
      setGeneratedEvidenceSpec(session.generated_evidence_spec || '');
      setGeneratedSearchKeywords(session.generated_search_keywords || '');
      setGeneratedDiscriminator(session.generated_discriminator || '');
      
      // Restore user-submitted versions
      setSubmittedEvidenceSpec(session.submitted_evidence_spec || session.generated_evidence_spec || '');
      setSubmittedSearchKeywords(session.submitted_search_keywords || session.generated_search_keywords || '');
      setSubmittedDiscriminator(session.submitted_discriminator || session.generated_discriminator || '');
      
      // Clear frontend state for steps forward of target
      const stepOrder = ['query', 'refinement', 'search-query', 'search-results', 'discriminator', 'filtering', 'results'];
      const targetIndex = stepOrder.indexOf(targetStep.replace('_', '-'));
      
      // Restore response objects based on what step we're at
      const lastStep = session.last_step_completed;
      
      if (lastStep && ['question_refinement', 'search_query_generation', 'search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
        setEvidenceSpecResponse({
          original_query: session.original_question,
          evidence_specification: session.generated_evidence_spec || '',
          session_id: session.id
        });
      } else {
        setEvidenceSpecResponse(null);
      }
      
      if (lastStep && ['search_query_generation', 'search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
        setSearchKeywordsResponse({
          evidence_specification: session.submitted_evidence_spec || '',
          search_keywords: session.generated_search_keywords || '',
          session_id: session.id
        });
      } else {
        setSearchKeywordsResponse(null);
        setKeywordsCountResult(null);
      }
      
      if (lastStep && ['discriminator_generation', 'filtering'].includes(lastStep)) {
        setDiscriminatorResponse({
          evidence_specification: session.submitted_evidence_spec || '',
          search_keywords: session.submitted_search_keywords || session.generated_search_keywords || '',
          strictness: session.filter_strictness || 'medium',
          discriminator_prompt: session.generated_discriminator || '',
          session_id: session.id
        });
      } else {
        setDiscriminatorResponse(null);
      }
      
      // Clear data for steps beyond the reset point
      if (targetIndex < stepOrder.indexOf('search-results')) {
        setSearchResults(null);
      } else if (targetStep === 'search_execution' || targetStep === 'search-results') {
        // Need to restore search results when going back to search-results step
        if (session.submitted_search_keywords || session.generated_search_keywords) {
          try {
            const searchResponse = await smartSearchApi.executeSearch({
              search_keywords: session.submitted_search_keywords || session.generated_search_keywords || '',
              max_results: 50,
              offset: 0,
              session_id: session.id,
              selected_sources: session.selected_sources || ['pubmed']
            });
            setSearchResults(searchResponse);
          } catch (error) {
            console.error('Failed to restore search results:', error);
            setSearchResults(null);
          }
        }
      }
      
      if (targetIndex < stepOrder.indexOf('filtering')) {
        setFilteredArticles([]);
        setFilteringProgress(null);
      }
      
      // Update the current step to match the target
      const frontendStep = targetStep.replace('_', '-').replace('question-refinement', 'refinement').replace('search-query-generation', 'search-query').replace('search-execution', 'search-results').replace('discriminator-generation', 'discriminator') as SmartSearchStep;
      setStep(frontendStep);
      
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
    setOriginalQuestion('');
    setGeneratedEvidenceSpec('');
    setGeneratedSearchKeywords('');
    setGeneratedDiscriminator('');
    setSubmittedEvidenceSpec('');
    setSubmittedSearchKeywords('');
    setSubmittedDiscriminator('');
    setEvidenceSpecResponse(null);
    setSearchKeywordsResponse(null);
    setDiscriminatorResponse(null);
    setKeywordsCountResult(null);
    setSearchResults(null);
    setFilteredArticles([]);
    setFilteringProgress(null);
    setError(null);
  }, []);
  
  
  
  // ================== STEP BUSINESS METHODS ==================
  
  // Step 1: Evidence Specification
  const generateEvidenceSpecification = useCallback(async (): Promise<EvidenceSpecificationResponse> => {
    if (!originalQuestion.trim()) {
      throw new Error('Please enter your research question');
    }
    
    setEvidenceSpecLoading(true);
    setError(null);
    
    try {
      const response = await smartSearchApi.createEvidenceSpecification({
        query: originalQuestion,
        session_id: sessionId || undefined
      });
      
      setEvidenceSpecResponse(response);
      setGeneratedEvidenceSpec(response.evidence_specification);
      setSubmittedEvidenceSpec(response.evidence_specification); // Initially same as generated
      setSessionId(response.session_id);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Evidence specification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setEvidenceSpecLoading(false);
    }
  }, [originalQuestion, sessionId]);
  
  const updateOriginalQuestion = useCallback((question: string) => {
    setOriginalQuestion(question);
  }, []);
  
  const updateSubmittedEvidenceSpec = useCallback((spec: string) => {
    setSubmittedEvidenceSpec(spec);
  }, []);
  
  // Step 2: Search Keyword Generation
  const generateSearchKeywords = useCallback(async (source?: string): Promise<SearchKeywordsResponse> => {
    if (!submittedEvidenceSpec.trim()) {
      throw new Error('Please provide an evidence specification');
    }
    if (!sessionId) {
      throw new Error('Session not found. Please start over.');
    }
    
    // Update source if provided
    if (source) {
      setSelectedSource(source);
    }
    
    setSearchKeywordsLoading(true);
    setError(null);
    
    try {
      const response = await smartSearchApi.generateSearchKeywords({
        evidence_specification: submittedEvidenceSpec,
        session_id: sessionId,
        selected_sources: [source || selectedSource]
      });
      
      setSearchKeywordsResponse(response);
      setGeneratedSearchKeywords(response.search_keywords);
      setSubmittedSearchKeywords(response.search_keywords); // Initially same as generated
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Keyword generation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setSearchKeywordsLoading(false);
    }
  }, [submittedEvidenceSpec, sessionId, selectedSource]);
  
  const updateSubmittedSearchKeywords = useCallback((keywords: string) => {
    setSubmittedSearchKeywords(keywords);
  }, []);
  
  const updateSelectedSource = useCallback((source: string) => {
    setSelectedSource(source);
  }, []);
  
  // Step 3: Keywords Testing and Optimization
  const testKeywordsCount = useCallback(async (keywordsOverride?: string): Promise<{ total_count: number; sources_searched: string[] }> => {
    const keywordsToTest = keywordsOverride || submittedSearchKeywords;
    if (!keywordsToTest.trim()) {
      throw new Error('Search keywords are required');
    }
    if (!sessionId) {
      throw new Error('Session not found. Please start over.');
    }
    
    try {
      const response = await smartSearchApi.testKeywordsCount({
        search_keywords: keywordsToTest,
        session_id: sessionId,
        selected_sources: [selectedSource]
      });
      
      const result = {
        total_count: response.total_count,
        sources_searched: response.sources_searched
      };
      
      setKeywordsCountResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Keywords count test failed';
      setError(errorMessage);
      throw err;
    }
  }, [submittedSearchKeywords, sessionId, selectedSource]);
  
  const generateOptimizedKeywords = useCallback(async (evidenceSpecOverride?: string) => {
    const specToUse = evidenceSpecOverride || submittedEvidenceSpec;
    if (!submittedSearchKeywords.trim()) {
      throw new Error('Search keywords are required');
    }
    if (!specToUse.trim()) {
      throw new Error('Evidence specification is required');
    }
    if (!sessionId) {
      throw new Error('Session not found. Please start over.');
    }
    
    try {
      const response = await smartSearchApi.generateOptimizedKeywords({
        current_keywords: submittedSearchKeywords,
        evidence_specification: specToUse,
        target_max_results: 250,
        session_id: sessionId,
        selected_sources: [selectedSource]
      });
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Keywords optimization failed';
      setError(errorMessage);
      throw err;
    }
  }, [submittedSearchKeywords, submittedEvidenceSpec, sessionId, selectedSource]);
  
  // Step 4: Search Execution
  const executeSearch = useCallback(async (offset = 0, maxResults?: number): Promise<SearchExecutionResponse> => {
    if (!submittedSearchKeywords.trim()) {
      throw new Error('Please provide search keywords');
    }
    if (!sessionId) {
      throw new Error('Session not found. Please start over.');
    }
    
    setSearchExecutionLoading(true);
    setError(null);
    
    try {
      const batchSize = maxResults || (selectedSource === 'google_scholar' ? 20 : 50);
      const results = await smartSearchApi.executeSearch({
        search_keywords: submittedSearchKeywords,
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
      setSearchExecutionLoading(false);
    }
  }, [submittedSearchKeywords, sessionId, selectedSource]);
  
  // Step 5: Discriminator Generation
  const generateDiscriminator = useCallback(async (): Promise<DiscriminatorGenerationResponse> => {
    if (!submittedEvidenceSpec.trim()) {
      throw new Error('Evidence specification is missing. Please go back and complete the previous steps.');
    }
    if (!submittedSearchKeywords.trim()) {
      throw new Error('Search keywords are missing. Please go back and complete the previous steps.');
    }
    if (!sessionId) {
      throw new Error('Session not found. Please start over.');
    }
    
    setDiscriminatorLoading(true);
    setError(null);
    
    try {
      const response = await smartSearchApi.generateDiscriminator({
        evidence_specification: submittedEvidenceSpec,
        search_keywords: submittedSearchKeywords,
        strictness: strictness,
        session_id: sessionId
      });
      
      setDiscriminatorResponse(response);
      setGeneratedDiscriminator(response.discriminator_prompt);
      setSubmittedDiscriminator(response.discriminator_prompt); // Initially same as generated
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Discriminator generation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setDiscriminatorLoading(false);
    }
  }, [submittedEvidenceSpec, submittedSearchKeywords, strictness, sessionId]);
  
  const updateSubmittedDiscriminator = useCallback((discriminator: string) => {
    setSubmittedDiscriminator(discriminator);
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
      
      // Store the limitation note if present
      if (response.search_limitation_note) {
        setSearchLimitationNote(response.search_limitation_note);
      }
      
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
    originalQuestion,
    generatedEvidenceSpec,
    generatedSearchKeywords,
    generatedDiscriminator,
    submittedEvidenceSpec,
    submittedSearchKeywords,
    submittedDiscriminator,
    strictness,
    selectedSource,
    evidenceSpecResponse,
    searchKeywordsResponse,
    discriminatorResponse,
    keywordsCountResult,
    searchResults,
    filteredArticles,
    filteringProgress,
    searchLimitationNote,
    savedCustomColumns,
    evidenceSpecLoading,
    searchKeywordsLoading,
    searchExecutionLoading,
    discriminatorLoading,
    error,
    
    // Actions
    updateStep,
    canNavigateToStep,
    resetToStep,
    resetAllState,
    generateEvidenceSpecification,
    updateOriginalQuestion,
    updateSubmittedEvidenceSpec,
    generateSearchKeywords,
    updateSubmittedSearchKeywords,
    updateSelectedSource,
    testKeywordsCount,
    generateOptimizedKeywords,
    executeSearch,
    generateDiscriminator,
    updateSubmittedDiscriminator,
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
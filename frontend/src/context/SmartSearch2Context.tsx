/**
 * SmartSearch2Context - Lightweight state management for SmartSearch2
 * 
 * Optimized for direct search functionality without the guided workflow complexity.
 * Focuses on: source selection, query input, search execution, and results display.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { smartSearch2Api } from '@/lib/api/smartSearch2Api';
import type { DirectSearchResponse, FeatureExtractionResponse, ArticleFilterResponse } from '@/lib/api/smartSearch2Api';
import type { FeatureDefinition } from '@/types/workbench';
import { api } from '@/lib/api';

// ================== STATE INTERFACE ==================

interface SmartSearch2State {
    // SEARCH CONFIGURATION
    selectedSource: 'pubmed' | 'google_scholar';
    searchQuery: string;

    // SEARCH EXECUTION
    searchResults: DirectSearchResponse | null;
    isSearching: boolean;

    // ARTICLE FILTERING
    filteredArticles: ArticleFilterResponse | null;
    isFiltering: boolean;

    // FEATURE EXTRACTION
    appliedFeatures: FeatureDefinition[];
    pendingFeatures: FeatureDefinition[];
    extractedData: Record<string, Record<string, any>>;
    isExtracting: boolean;

    // RESEARCH JOURNEY STATE (persistent data)
    researchQuestion: string;
    evidenceSpec: string;
    extractedConcepts: string[];
    expandedExpressions: Array<{ concept: string; expression: string; count: number; selected?: boolean }>;
    generatedKeywords: string;

    // CONVERSATIONAL REFINEMENT STATE (persistent data)
    conversationHistory: Array<{ question: string; answer: string }>;
    completenessScore: number;
    missingElements: string[];

    // UI STATE
    hasSearched: boolean;
    error: string | null;
}

// ================== ACTIONS INTERFACE ==================

interface SmartSearch2Actions {
    // CONFIGURATION
    updateSelectedSource: (source: 'pubmed' | 'google_scholar') => void;
    updateSearchQuery: (query: string) => void;

    // AI HELPER METHODS
    refineEvidenceSpec: (userDescription: string, conversationHistory?: Array<{ question: string; answer: string }>) => Promise<{
        is_complete: boolean;
        evidence_specification: string | null;
        clarification_questions: string[] | null;
        completeness_score: number;
        missing_elements: string[];
        reasoning?: string;
    }>;
    extractConcepts: (evidenceSpecification: string) => Promise<{ concepts: string[]; evidence_specification: string; }>;
    expandConcepts: (concepts: string[], source: 'pubmed' | 'google_scholar') => Promise<{
        expansions: Array<{ concept: string; expression: string; count: number; }>;
        source: string;
    }>;
    testKeywordCombination: (expressions: string[], source: 'pubmed' | 'google_scholar') => Promise<{
        combined_query: string;
        estimated_results: number;
        source: string;
    }>;
    generateKeywords: (concepts: string[], source: 'pubmed' | 'google_scholar', targetResultCount?: number) => Promise<{
        concepts: string[];
        search_keywords: string;
        source: string;
        estimated_results: number;
        concept_counts: Record<string, number>;
        optimization_strategy: string;
    }>;

    // RESEARCH JOURNEY MANAGEMENT
    setResearchQuestion: (question: string) => void;
    setEvidenceSpec: (spec: string) => void;
    setExtractedConcepts: (concepts: string[]) => void;
    setExpandedExpressions: (expressions: Array<{ concept: string; expression: string; count: number; selected?: boolean }>) => void;
    setGeneratedKeywords: (keywords: string) => void;
    setConversationHistory: (history: Array<{ question: string; answer: string }>) => void;
    setCompletenessScore: (score: number) => void;
    setMissingElements: (elements: string[]) => void;
    resetResearchJourney: () => void;

    // SEARCH EXECUTION
    search: () => Promise<void>;
    resetSearch: () => void;

    // ARTICLE FILTERING
    filterArticles: (evidenceSpec?: string, strictness?: 'low' | 'medium' | 'high') => Promise<ArticleFilterResponse>;

    // FEATURE EXTRACTION
    addPendingFeature: (feature: FeatureDefinition) => void;
    removePendingFeature: (featureId: string) => void;
    extractFeatures: () => Promise<FeatureExtractionResponse>;

    // ERROR HANDLING
    clearError: () => void;

    // COVERAGE TESTING
    testCoverage: (query: string, targetPmids: string[]) => Promise<{
        found_articles: Array<{ pmid: string; title: string; }>;
        missing_articles: string[];
        covered_ids: string[];
        coverage_percentage: number;
        coverage_count: number;
        total_target: number;
        total_found: number;
        estimated_count?: number;
    }>;
    fetchArticles: (pmids: string[]) => Promise<Array<{
        id: string;
        title: string;
        abstract?: string;
        authors?: string[];
        journal?: string;
        year?: number;
    }>>;
}

// ================== CONTEXT ==================

interface SmartSearch2ContextType extends SmartSearch2State, SmartSearch2Actions { }

const SmartSearch2Context = createContext<SmartSearch2ContextType | undefined>(undefined);

// ================== PROVIDER COMPONENT ==================

interface SmartSearch2ProviderProps {
    children: React.ReactNode;
}

export function SmartSearch2Provider({ children }: SmartSearch2ProviderProps) {
    // ================== STATE ==================

    const [selectedSource, setSelectedSource] = useState<'pubmed' | 'google_scholar'>('pubmed');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DirectSearchResponse | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Article filtering state
    const [filteredArticles, setFilteredArticles] = useState<ArticleFilterResponse | null>(null);
    const [isFiltering, setIsFiltering] = useState(false);

    // Research journey state (persistent data)
    const [researchQuestion, setResearchQuestion] = useState('');
    const [evidenceSpec, setEvidenceSpec] = useState('');
    const [extractedConcepts, setExtractedConcepts] = useState<string[]>([]);
    const [expandedExpressions, setExpandedExpressions] = useState<Array<{ concept: string; expression: string; count: number; selected?: boolean }>>([]);
    const [generatedKeywords, setGeneratedKeywords] = useState('');

    // Conversational refinement state (persistent data)
    const [conversationHistory, setConversationHistory] = useState<Array<{ question: string; answer: string }>>([]);
    const [completenessScore, setCompletenessScore] = useState(0);
    const [missingElements, setMissingElements] = useState<string[]>([]);

    // Feature extraction state
    const [appliedFeatures, setAppliedFeatures] = useState<FeatureDefinition[]>([]);
    const [pendingFeatures, setPendingFeatures] = useState<FeatureDefinition[]>([]);
    const [extractedData, setExtractedData] = useState<Record<string, Record<string, any>>>({});
    const [isExtracting, setIsExtracting] = useState(false);

    // ================== ACTIONS ==================

    const updateSelectedSource = useCallback((source: 'pubmed' | 'google_scholar') => {
        setSelectedSource(source);
    }, []);

    const updateSearchQuery = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    const search = useCallback(async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            return;
        }

        setIsSearching(true);
        setError(null);
        setHasSearched(true);

        try {
            // Execute direct search using SmartSearch2 API (no session required)
            const results = await smartSearch2Api.search({
                query: searchQuery,
                source: selectedSource,
                max_results: selectedSource === 'google_scholar' ? 20 : 50,
                offset: 0
            });

            setSearchResults(results);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Search failed';
            setError(errorMessage);
            console.error('Search execution failed:', err);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, selectedSource]);

    const resetSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults(null);
        setHasSearched(false);
        setError(null);
        // Clear feature extraction state
        setAppliedFeatures([]);
        setPendingFeatures([]);
        setExtractedData({});
        setIsExtracting(false);
        // Clear filtering state
        setFilteredArticles(null);
        setIsFiltering(false);
    }, []);

    const resetResearchJourney = useCallback(() => {
        setResearchQuestion('');
        setEvidenceSpec('');
        setExtractedConcepts([]);
        setExpandedExpressions([]);
        setGeneratedKeywords('');
        setConversationHistory([]);
        setCompletenessScore(0);
        setMissingElements([]);
    }, []);

    const refineEvidenceSpec = useCallback(async (
        userDescription: string,
        conversationHistory?: Array<{ question: string; answer: string }>
    ) => {
        try {
            const response = await smartSearch2Api.refineEvidenceSpec({
                user_description: userDescription,
                conversation_history: conversationHistory
            });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to refine evidence specification';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const extractConcepts = useCallback(async (evidenceSpecification: string) => {
        try {
            const response = await smartSearch2Api.extractConcepts({
                evidence_specification: evidenceSpecification
            });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to extract concepts';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const expandConcepts = useCallback(async (concepts: string[], source: 'pubmed' | 'google_scholar') => {
        try {
            const response = await smartSearch2Api.expandConcepts({
                concepts,
                source
            });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to expand concepts';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const testKeywordCombination = useCallback(async (expressions: string[], source: 'pubmed' | 'google_scholar') => {
        try {
            const response = await smartSearch2Api.testKeywordCombination({
                expressions,
                source
            });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to test keyword combination';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const generateKeywords = useCallback(async (
        concepts: string[],
        source: 'pubmed' | 'google_scholar',
        targetResultCount: number = 200
    ) => {
        try {
            const response = await smartSearch2Api.generateKeywords({
                concepts,
                source,
                target_result_count: targetResultCount
            });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate keywords';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const addPendingFeature = useCallback((feature: FeatureDefinition) => {
        setPendingFeatures(prev => [...prev, feature]);
    }, []);

    const removePendingFeature = useCallback((featureId: string) => {
        setPendingFeatures(prev => prev.filter(f => f.id !== featureId));
    }, []);

    const extractFeatures = useCallback(async (): Promise<FeatureExtractionResponse> => {
        if (!searchResults?.articles.length) {
            throw new Error('No articles available for feature extraction');
        }

        if (pendingFeatures.length === 0) {
            throw new Error('No features selected for extraction');
        }

        setIsExtracting(true);
        try {
            const response = await smartSearch2Api.extractFeatures({
                articles: searchResults.articles,
                features: pendingFeatures
            });

            // Move pending features to applied and store extracted data
            setAppliedFeatures(prev => [...prev, ...pendingFeatures]);
            setPendingFeatures([]);
            setExtractedData(response.results);

            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to extract features';
            setError(errorMessage);
            throw err;
        } finally {
            setIsExtracting(false);
        }
    }, [searchResults?.articles, pendingFeatures]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const testCoverage = useCallback(async (query: string, targetPmids: string[]) => {
        try {
            const response = await api.post('/api/pubmed/test-search', {
                search_phrase: query,
                pubmed_ids: targetPmids
            });
            return response.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to test coverage';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const fetchArticles = useCallback(async (pmids: string[]) => {
        try {
            const response = await api.post('/api/pubmed/fetch-articles', {
                pubmed_ids: pmids
            });
            return response.data.articles || [];
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch articles';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const filterArticles = useCallback(async (
        evidenceSpecOverride?: string,
        strictness: 'low' | 'medium' | 'high' = 'medium'
    ): Promise<ArticleFilterResponse> => {
        const finalEvidenceSpec = evidenceSpecOverride || evidenceSpec;

        if (!finalEvidenceSpec.trim()) {
            throw new Error('Evidence specification is required for filtering');
        }

        if (!searchResults?.articles.length) {
            throw new Error('No articles available to filter');
        }

        setIsFiltering(true);
        setError(null);

        try {
            const response = await smartSearch2Api.filterArticles({
                evidence_specification: finalEvidenceSpec,
                articles: searchResults.articles,
                strictness: strictness
            });

            setFilteredArticles(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to filter articles';
            setError(errorMessage);
            throw err;
        } finally {
            setIsFiltering(false);
        }
    }, [evidenceSpec, searchResults?.articles]);

    // ================== CONTEXT VALUE ==================

    const contextValue: SmartSearch2ContextType = {
        // State
        selectedSource,
        searchQuery,
        searchResults,
        isSearching,
        hasSearched,
        error,
        filteredArticles,
        isFiltering,
        appliedFeatures,
        pendingFeatures,
        extractedData,
        isExtracting,

        // Research journey state
        researchQuestion,
        evidenceSpec,
        extractedConcepts,
        expandedExpressions,
        generatedKeywords,
        conversationHistory,
        completenessScore,
        missingElements,

        // Actions
        updateSelectedSource,
        updateSearchQuery,
        refineEvidenceSpec,
        extractConcepts,
        expandConcepts,
        testKeywordCombination,
        generateKeywords,
        search,
        resetSearch,
        filterArticles,
        addPendingFeature,
        removePendingFeature,
        extractFeatures,
        clearError,
        testCoverage,
        fetchArticles,

        // Research journey actions
        setResearchQuestion,
        setEvidenceSpec,
        setExtractedConcepts,
        setExpandedExpressions,
        setGeneratedKeywords,
        setConversationHistory,
        setCompletenessScore,
        setMissingElements,
        resetResearchJourney,
    };

    return (
        <SmartSearch2Context.Provider value={contextValue}>
            {children}
        </SmartSearch2Context.Provider>
    );
}

// ================== HOOK ==================

export function useSmartSearch2() {
    const context = useContext(SmartSearch2Context);
    if (!context) {
        throw new Error('useSmartSearch2 must be used within a SmartSearch2Provider');
    }
    return context;
}

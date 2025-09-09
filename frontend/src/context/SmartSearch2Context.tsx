/**
 * SmartSearch2Context - Lightweight state management for SmartSearch2
 * 
 * Optimized for direct search functionality without the guided workflow complexity.
 * Focuses on: source selection, query input, search execution, and results display.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { smartSearch2Api } from '@/lib/api/smartSearch2Api';
import type { DirectSearchResponse, FeatureExtractionResponse } from '@/lib/api/smartSearch2Api';
import type { FeatureDefinition } from '@/types/workbench';

// ================== STATE INTERFACE ==================

interface SmartSearch2State {
    // SEARCH CONFIGURATION
    selectedSource: 'pubmed' | 'google_scholar';
    searchQuery: string;

    // SEARCH EXECUTION
    searchResults: DirectSearchResponse | null;
    isSearching: boolean;

    // FEATURE EXTRACTION
    appliedFeatures: FeatureDefinition[];
    pendingFeatures: FeatureDefinition[];
    extractedData: Record<string, Record<string, any>>;
    isExtracting: boolean;

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
    createEvidenceSpec: (query: string) => Promise<{ original_query: string; evidence_specification: string; }>;
    generateKeywords: (evidenceSpec: string, source: 'pubmed' | 'google_scholar') => Promise<{ evidence_specification: string; search_keywords: string; source: string; }>;

    // SEARCH EXECUTION
    search: () => Promise<void>;
    resetSearch: () => void;

    // FEATURE EXTRACTION
    addPendingFeature: (feature: FeatureDefinition) => void;
    removePendingFeature: (featureId: string) => void;
    extractFeatures: () => Promise<FeatureExtractionResponse>;

    // ERROR HANDLING
    clearError: () => void;
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
    }, []);

    const createEvidenceSpec = useCallback(async (query: string) => {
        try {
            const response = await smartSearch2Api.createEvidenceSpec({ query });
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate evidence specification';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const generateKeywords = useCallback(async (evidenceSpec: string, source: 'pubmed' | 'google_scholar') => {
        try {
            const response = await smartSearch2Api.generateKeywords({
                evidence_specification: evidenceSpec,
                source
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

    // ================== CONTEXT VALUE ==================

    const contextValue: SmartSearch2ContextType = {
        // State
        selectedSource,
        searchQuery,
        searchResults,
        isSearching,
        hasSearched,
        error,
        appliedFeatures,
        pendingFeatures,
        extractedData,
        isExtracting,

        // Actions
        updateSelectedSource,
        updateSearchQuery,
        createEvidenceSpec,
        generateKeywords,
        search,
        resetSearch,
        addPendingFeature,
        removePendingFeature,
        extractFeatures,
        clearError,
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

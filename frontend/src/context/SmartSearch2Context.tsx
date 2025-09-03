/**
 * SmartSearch2Context - Lightweight state management for SmartSearch2
 * 
 * Optimized for direct search functionality without the guided workflow complexity.
 * Focuses on: source selection, query input, search execution, and results display.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { smartSearchApi } from '@/lib/api/smartSearchApi';
import type { SearchExecutionResponse } from '@/lib/api/smartSearchApi';

// ================== STATE INTERFACE ==================

interface SmartSearch2State {
    // SEARCH CONFIGURATION
    selectedSource: 'pubmed' | 'google_scholar';
    searchQuery: string;

    // SEARCH EXECUTION
    sessionId: string | null;
    searchResults: SearchExecutionResponse | null;
    isSearching: boolean;

    // UI STATE
    hasSearched: boolean;
    error: string | null;
}

// ================== ACTIONS INTERFACE ==================

interface SmartSearch2Actions {
    // CONFIGURATION
    updateSelectedSource: (source: 'pubmed' | 'google_scholar') => void;
    updateSearchQuery: (query: string) => void;

    // SEARCH EXECUTION
    executeSearch: () => Promise<void>;
    resetSearch: () => void;

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
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<SearchExecutionResponse | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ================== ACTIONS ==================

    const updateSelectedSource = useCallback((source: 'pubmed' | 'google_scholar') => {
        setSelectedSource(source);
    }, []);

    const updateSearchQuery = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    const executeSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            return;
        }

        setIsSearching(true);
        setError(null);
        setHasSearched(true);

        try {
            // Create evidence specification (this creates the session)
            const evidenceResponse = await smartSearchApi.createEvidenceSpecification({
                query: searchQuery,
                session_id: sessionId || undefined
            });

            setSessionId(evidenceResponse.session_id);

            // Execute search with the user's query as search keywords
            const results = await smartSearchApi.executeSearch({
                search_keywords: searchQuery,
                max_results: selectedSource === 'google_scholar' ? 20 : 50,
                offset: 0,
                session_id: evidenceResponse.session_id,
                selected_sources: [selectedSource]
            });

            setSearchResults(results);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Search failed';
            setError(errorMessage);
            console.error('Search execution failed:', err);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, selectedSource, sessionId]);

    const resetSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults(null);
        setHasSearched(false);
        setSessionId(null);
        setError(null);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // ================== CONTEXT VALUE ==================

    const contextValue: SmartSearch2ContextType = {
        // State
        selectedSource,
        searchQuery,
        sessionId,
        searchResults,
        isSearching,
        hasSearched,
        error,

        // Actions
        updateSelectedSource,
        updateSearchQuery,
        executeSearch,
        resetSearch,
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

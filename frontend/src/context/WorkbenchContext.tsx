/**
 * WorkbenchContext - State management for the workbench
 * 
 * Manages the current working state of the workbench including:
 * - Articles from search results or loaded groups
 * - Columns and extracted features
 * - Local modifications (notes, metadata, new columns)
 * - Persistence to saved groups
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  WorkbenchColumn,
  ArticleGroup,
} from '@/types/workbench';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';

interface WorkbenchState {
  // Current data
  articles: CanonicalResearchArticle[];
  columns: WorkbenchColumn[];

  // Source tracking
  source: 'search' | 'group' | 'modified';
  sourceGroup?: ArticleGroup;
  searchContext?: {
    query: string;
    provider: string;
    parameters: Record<string, any>;
  };

  // Local modifications
  localArticleData: Record<string, {
    notes?: string;
    features?: Record<string, any>;
    metadata?: Record<string, any>;
  }>;

  // State flags
  hasModifications: boolean;
  lastModified?: Date;
}

interface WorkbenchActions {
  // Data loading
  loadSearchResults: (articles: CanonicalResearchArticle[], searchContext: WorkbenchState['searchContext']) => void;
  loadGroup: (group: ArticleGroup, articles: CanonicalResearchArticle[], columns: WorkbenchColumn[]) => void;

  // Article management
  addArticles: (articles: CanonicalResearchArticle[]) => void;
  removeArticle: (articleId: string) => void;

  // Column management
  addColumn: (column: WorkbenchColumn) => void;
  updateColumn: (columnId: string, updates: Partial<WorkbenchColumn>) => void;
  removeColumn: (columnId: string) => void;

  // Local data management
  updateArticleNotes: (articleId: string, notes: string) => void;
  updateArticleFeatures: (articleId: string, features: Record<string, any>) => void;
  updateArticleMetadata: (articleId: string, metadata: Record<string, any>) => void;

  // State management
  clearWorkbench: () => void;
  markClean: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

type WorkbenchContextType = WorkbenchState & WorkbenchActions;

const WorkbenchContext = createContext<WorkbenchContextType | null>(null);

const STORAGE_KEY = 'jam-bot-workbench-state';

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkbenchState>({
    articles: [],
    columns: [],
    source: 'search',
    localArticleData: {},
    hasModifications: false
  });

  // Load from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (state.hasModifications || state.articles.length > 0) {
      saveToLocalStorage();
    }
  }, [state]);

  const updateState = useCallback((updater: (prev: WorkbenchState) => WorkbenchState) => {
    setState(prev => {
      const updated = updater(prev);
      return {
        ...updated,
        hasModifications: true,
        lastModified: new Date()
      };
    });
  }, []);

  const loadSearchResults = useCallback((articles: CanonicalResearchArticle[], searchContext?: WorkbenchState['searchContext']) => {
    setState({
      articles,
      columns: [],
      source: 'search',
      sourceGroup: undefined,
      searchContext,
      localArticleData: {},
      hasModifications: false,
      lastModified: new Date()
    });
  }, []);

  const loadGroup = useCallback((group: ArticleGroup, articles: CanonicalResearchArticle[], columns: WorkbenchColumn[]) => {
    setState({
      articles,
      columns,
      source: 'group',
      sourceGroup: group,
      searchContext: group.search_query ? {
        query: group.search_query,
        provider: group.search_provider || 'pubmed',
        parameters: group.search_params || {}
      } : undefined,
      localArticleData: {},
      hasModifications: false,
      lastModified: new Date()
    });
  }, []);

  const addArticles = useCallback((articles: CanonicalResearchArticle[]) => {
    updateState(prev => ({
      ...prev,
      articles: [...prev.articles, ...articles.filter(newArticle =>
        !prev.articles.some(existingArticle => existingArticle.id === newArticle.id)
      )],
      source: prev.source === 'group' ? 'modified' : prev.source
    }));
  }, [updateState]);

  const removeArticle = useCallback((articleId: string) => {
    updateState(prev => {
      const { [articleId]: removedData, ...remainingLocalData } = prev.localArticleData;

      return {
        ...prev,
        articles: prev.articles.filter(article => article.id !== articleId),
        columns: prev.columns.map(column => ({
          ...column,
          data: Object.fromEntries(
            Object.entries(column.data).filter(([id]) => id !== articleId)
          )
        })),
        localArticleData: remainingLocalData,
        source: prev.source === 'group' ? 'modified' : prev.source
      };
    });
  }, [updateState]);

  const addColumn = useCallback((column: WorkbenchColumn) => {
    updateState(prev => ({
      ...prev,
      columns: [...prev.columns, column],
      source: prev.source === 'group' ? 'modified' : prev.source
    }));
  }, [updateState]);

  const updateColumn = useCallback((columnId: string, updates: Partial<WorkbenchColumn>) => {
    updateState(prev => ({
      ...prev,
      columns: prev.columns.map(col =>
        col.id === columnId ? { ...col, ...updates } : col
      ),
      source: prev.source === 'group' ? 'modified' : prev.source
    }));
  }, [updateState]);

  const removeColumn = useCallback((columnId: string) => {
    updateState(prev => ({
      ...prev,
      columns: prev.columns.filter(col => col.id !== columnId),
      source: prev.source === 'group' ? 'modified' : prev.source
    }));
  }, [updateState]);

  const updateArticleNotes = useCallback((articleId: string, notes: string) => {
    updateState(prev => ({
      ...prev,
      localArticleData: {
        ...prev.localArticleData,
        [articleId]: {
          ...prev.localArticleData[articleId],
          notes
        }
      },
      source: prev.source === 'group' ? 'modified' : prev.source
    }));
  }, [updateState]);

  const updateArticleFeatures = useCallback((articleId: string, features: Record<string, any>) => {
    updateState(prev => ({
      ...prev,
      localArticleData: {
        ...prev.localArticleData,
        [articleId]: {
          ...prev.localArticleData[articleId],
          features: {
            ...prev.localArticleData[articleId]?.features,
            ...features
          }
        }
      },
      source: prev.source === 'group' ? 'modified' : prev.source
    }));
  }, [updateState]);

  const updateArticleMetadata = useCallback((articleId: string, metadata: Record<string, any>) => {
    updateState(prev => ({
      ...prev,
      localArticleData: {
        ...prev.localArticleData,
        [articleId]: {
          ...prev.localArticleData[articleId],
          metadata: {
            ...prev.localArticleData[articleId]?.metadata,
            ...metadata
          }
        }
      },
      source: prev.source === 'group' ? 'modified' : prev.source
    }));
  }, [updateState]);

  const clearWorkbench = useCallback(() => {
    setState({
      articles: [],
      columns: [],
      source: 'search',
      sourceGroup: undefined,
      searchContext: undefined,
      localArticleData: {},
      hasModifications: false
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const markClean = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasModifications: false
    }));
  }, []);

  const saveToLocalStorage = useCallback(() => {
    try {
      const serializedState = {
        ...state,
        lastModified: state.lastModified?.toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedState));
    } catch (error) {
      console.error('Failed to save workbench state to localStorage:', error);
    }
  }, [state]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const loadedState: WorkbenchState = {
        ...parsed,
        lastModified: parsed.lastModified ? new Date(parsed.lastModified) : undefined
      };

      setState(loadedState);
    } catch (error) {
      console.error('Failed to load workbench state from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const contextValue: WorkbenchContextType = {
    ...state,
    loadSearchResults,
    loadGroup,
    addArticles,
    removeArticle,
    addColumn,
    updateColumn,
    removeColumn,
    updateArticleNotes,
    updateArticleFeatures,
    updateArticleMetadata,
    clearWorkbench,
    markClean,
    saveToLocalStorage,
    loadFromLocalStorage
  };

  return (
    <WorkbenchContext.Provider value={contextValue}>
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbench(): WorkbenchContextType {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error('useWorkbench must be used within a WorkbenchProvider');
  }
  return context;
}
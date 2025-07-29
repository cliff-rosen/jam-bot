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
import { CanonicalResearchArticle, SearchProvider, UnifiedSearchParams } from '@/types/unifiedSearch';
import { unifiedSearchApi } from '@/lib/api/unifiedSearchApi';
import { workbenchApi, ColumnDefinition } from '@/lib/api/workbenchApi';

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

  // Search state
  currentSearchParams: UnifiedSearchParams;
  selectedProviders: SearchProvider[];
  searchMode: 'single' | 'multi';
  
  // Pagination state
  pagination: {
    currentPage: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  
  // Loading states
  isSearching: boolean;
  isExtracting: boolean;
  
  // UI state
  selectedArticle: CanonicalResearchArticle | null;
  
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
  // High-level API orchestration
  performNewSearch: () => Promise<void>;
  performSearchPagination: (page: number) => Promise<void>;
  loadWorkbenchGroup: (groupId: string, page?: number) => Promise<void>;
  saveWorkbenchGroup: (mode: 'new' | 'existing' | 'add', groupId?: string, name?: string, description?: string) => Promise<void>;
  extractColumns: (columns: { name: string; description: string; type: 'boolean' | 'text' | 'score'; options?: { min?: number; max?: number; step?: number } }[]) => Promise<void>;
  exportWorkbenchData: () => Promise<void>;

  // Data loading (internal)
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

  // Search state management
  updateSearchParams: (params: Partial<UnifiedSearchParams>) => void;
  updateSelectedProviders: (providers: SearchProvider[]) => void;
  updateSearchMode: (mode: 'single' | 'multi') => void;
  setSearching: (isSearching: boolean) => void;
  setExtracting: (isExtracting: boolean) => void;
  
  // UI state management
  setSelectedArticle: (article: CanonicalResearchArticle | null) => void;

  // Pagination management
  updatePagination: (pagination: Partial<WorkbenchState['pagination']>) => void;

  // State management
  clearWorkbench: () => void;
  clearResults: () => void;
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
    hasModifications: false,
    currentSearchParams: {
      provider: 'pubmed',
      query: '',
      page_size: 20,
      sort_by: 'relevance',
      include_citations: false,
      include_pdf_links: false,
      page: 1,
    },
    selectedProviders: ['pubmed'],
    searchMode: 'single',
    pagination: {
      currentPage: 1,
      pageSize: 20,
      totalResults: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false
    },
    isSearching: false,
    isExtracting: false,
    selectedArticle: null
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
    setState(prev => ({
      ...prev,
      articles,
      columns: [],
      source: 'search',
      sourceGroup: undefined,
      searchContext,
      localArticleData: {},
      hasModifications: false,
      lastModified: new Date()
    }));
  }, []);

  const loadGroup = useCallback((group: ArticleGroup, articles: CanonicalResearchArticle[], columns: WorkbenchColumn[]) => {
    setState(prev => ({
      ...prev,
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
    }));
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
      hasModifications: false,
      currentSearchParams: {
        provider: 'pubmed',
        query: '',
        page_size: 20,
        sort_by: 'relevance',
        include_citations: false,
        include_pdf_links: false,
        page: 1,
      },
      selectedProviders: ['pubmed'],
      searchMode: 'single',
      pagination: {
        currentPage: 1,
        pageSize: 20,
        totalResults: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      },
      isSearching: false,
      isExtracting: false,
      selectedArticle: null
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

  const updateSearchParams = useCallback((params: Partial<UnifiedSearchParams>) => {
    setState(prev => ({
      ...prev,
      currentSearchParams: {
        ...prev.currentSearchParams,
        ...params
      }
    }));
  }, []);

  const updateSelectedProviders = useCallback((providers: SearchProvider[]) => {
    setState(prev => ({
      ...prev,
      selectedProviders: providers
    }));
  }, []);

  const updateSearchMode = useCallback((mode: 'single' | 'multi') => {
    setState(prev => ({
      ...prev,
      searchMode: mode
    }));
  }, []);

  const setSearching = useCallback((isSearching: boolean) => {
    setState(prev => ({
      ...prev,
      isSearching
    }));
  }, []);

  const setExtracting = useCallback((isExtracting: boolean) => {
    setState(prev => ({
      ...prev,
      isExtracting
    }));
  }, []);

  const updatePagination = useCallback((paginationUpdates: Partial<WorkbenchState['pagination']>) => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        ...paginationUpdates
      }
    }));
  }, []);

  const setSelectedArticle = useCallback((article: CanonicalResearchArticle | null) => {
    setState(prev => ({
      ...prev,
      selectedArticle: article
    }));
  }, []);

  // Reset methods
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      articles: [],
      columns: [],
      source: 'search',
      sourceGroup: undefined,
      localArticleData: {},
      hasModifications: false,
      selectedArticle: null,
      pagination: {
        currentPage: 1,
        pageSize: 20,
        totalResults: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }));
  }, []);

  // High-level API orchestration methods
  const performNewSearch = useCallback(async () => {
    setSearching(true);

    // ALWAYS clear everything for a new search
    setState(prev => ({
      ...prev,
      articles: [],
      columns: [],
      source: 'search',
      sourceGroup: undefined,
      localArticleData: {},
      hasModifications: false,
      selectedArticle: null
    }));

    try {
      const searchParams = {
        ...state.currentSearchParams,
        page: 1,
        offset: 0
      };

      const response = await unifiedSearchApi.search(searchParams);

      // Update pagination state
      const totalResults = response.total_results || 0;
      const totalPages = Math.ceil(totalResults / state.currentSearchParams.page_size);

      updatePagination({
        currentPage: 1,
        pageSize: state.currentSearchParams.page_size,
        totalResults,
        totalPages,
        hasNextPage: totalPages > 1,
        hasPrevPage: false
      });

      // Load fresh search results
      if (response.articles.length > 0) {
        const searchContext = {
          query: searchParams.query,
          provider: searchParams.provider,
          parameters: searchParams
        };
        loadSearchResults(response.articles, searchContext);
      }
    } catch (error) {
      console.error('New search failed:', error);
      throw error;
    } finally {
      setSearching(false);
    }
  }, [state.currentSearchParams, setSearching, updatePagination, loadSearchResults]);

  const performSearchPagination = useCallback(async (page: number) => {
    setSearching(true);

    try {
      const searchParams = {
        ...state.currentSearchParams,
        page,
        offset: (page - 1) * state.currentSearchParams.page_size
      };

      const response = await unifiedSearchApi.search(searchParams);

      // Update pagination state
      updatePagination({
        currentPage: page,
        hasNextPage: page < state.pagination.totalPages,
        hasPrevPage: page > 1
      });

      // Replace articles with new page results
      if (response.articles.length > 0) {
        setState(prev => ({
          ...prev,
          articles: response.articles
        }));
      }
    } catch (error) {
      console.error('Search pagination failed:', error);
      throw error;
    } finally {
      setSearching(false);
    }
  }, [state.currentSearchParams, state.pagination.totalPages, setSearching, updatePagination]);

  const loadWorkbenchGroup = useCallback(async (groupId: string, page = 1) => {
    try {
      // Load group data using the unified workbench API
      const groupDetailResponse = await workbenchApi.getGroupDetail(groupId);
      const group = groupDetailResponse.group;
      
      const groupData: ArticleGroup = {
        id: group.id,
        user_id: group.user_id || 0,
        name: group.name,
        description: group.description,
        search_query: group.search_context?.query,
        search_provider: group.search_context?.provider,
        search_params: group.search_context?.parameters,
        columns: group.columns,
        created_at: group.created_at,
        updated_at: group.updated_at,
        article_count: group.article_count
      };
      
      const articles = group.articles.map(item => item.article);
      const columns = group.columns.map(col => ({
        id: `col_${col.name}`,
        name: col.name,
        description: col.description,
        type: col.type,
        data: {},
        options: col.options
      }));
      
      // Load into workbench
      loadGroup(groupData, articles, columns);

      // Calculate pagination for group
      const totalArticles = articles.length;
      const pageSize = state.pagination.pageSize;
      const totalPages = Math.ceil(totalArticles / pageSize);

      // Update pagination
      updatePagination({
        currentPage: page,
        totalResults: totalArticles,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      });

      // Update search params if available
      if (group.search_context?.query) {
        updateSearchParams({
          query: group.search_context.query,
          provider: group.search_context.provider as SearchProvider
        });
      }
    } catch (error) {
      console.error('Load group failed:', error);
      throw error;
    }
  }, [state.pagination.pageSize, loadGroup, updatePagination, updateSearchParams]);

  const saveWorkbenchGroup = useCallback(async (
    mode: 'new' | 'existing' | 'add',
    groupId?: string,
    name?: string,
    description?: string
  ) => {
    try {
      // Use current workbench data
      const articlesToSave = state.articles;
      const columnsToSave = state.columns;
      const searchContextToSave = state.searchContext || {
        query: state.currentSearchParams.query,
        provider: state.currentSearchParams.provider,
        parameters: state.currentSearchParams
      };
        
      // Prepare column metadata
      const columnMetadata = columnsToSave.map(col => ({
        name: col.name,
        description: col.description,
        type: col.type,
        options: col.options,
        is_extracted: true,
        extraction_method: 'ai' as const
      }));

      let response;
      if (mode === 'new' && name) {
        // Create new group and save
        response = await workbenchApi.createAndSaveGroup({
          group_name: name,
          group_description: description,
          articles: articlesToSave,
          columns: columnMetadata,
          search_query: searchContextToSave.query,
          search_provider: searchContextToSave.provider,
          search_params: searchContextToSave.parameters
        });
      } else if (mode === 'existing' && groupId) {
        // Replace existing group
        response = await workbenchApi.saveWorkbenchState(groupId, {
          group_name: name || state.sourceGroup?.name || 'Untitled',
          group_description: description,
          articles: articlesToSave,
          columns: columnMetadata,
          search_query: searchContextToSave.query,
          search_provider: searchContextToSave.provider,
          search_params: searchContextToSave.parameters
        });
      } else if (mode === 'add' && groupId) {
        // Add to existing group (merge mode)
        response = await workbenchApi.addArticlesToGroup(groupId, {
          articles: articlesToSave
        });
      } else {
        throw new Error('Invalid save parameters');
      }

      // Load the saved group to update workbench state
      if (response.group_id) {
        await loadWorkbenchGroup(response.group_id);
        markClean(); // Mark as clean since it was just saved
      }

      return response;
    } catch (error) {
      console.error('Save group failed:', error);
      throw error;
    }
  }, [state.articles, state.columns, state.searchContext, state.currentSearchParams, state.sourceGroup, loadWorkbenchGroup, markClean]);

  // New unified extract method
  const extractColumns = useCallback(async (
    columns: ColumnDefinition[]
  ) => {
    if (state.articles.length === 0) {
      throw new Error('No articles available for extraction');
    }

    // Get all articles for extraction (not just current page)
    let allArticles = state.articles;
    if (state.source === 'group' && state.sourceGroup) {
      const groupDetailResponse = await workbenchApi.getGroupDetail(state.sourceGroup.id);
      allArticles = groupDetailResponse.group.articles.map(item => item.article);
    }

    setExtracting(true);

    try {
      const response = await workbenchApi.extract({
        articles: workbenchApi.convertArticlesForExtraction(allArticles),
        columns: columns
      });

      // Convert response to WorkbenchColumns and add to workbench
      const newColumns: WorkbenchColumn[] = [];
      const updatedExtractedFeatures: Record<string, Record<string, string>> = {};

      for (const column of columns) {
        const columnData: Record<string, string> = {};
        for (const [articleId, articleResults] of Object.entries(response.results)) {
          const value = articleResults[column.name] || (column.type === 'boolean' ? 'no' : 'error');
          columnData[articleId] = value;

          // Track features for article updates
          if (!updatedExtractedFeatures[articleId]) {
            updatedExtractedFeatures[articleId] = {};
          }
          updatedExtractedFeatures[articleId][column.name] = value;
        }

        newColumns.push({
          id: `col_${Date.now()}_${column.name}`,
          name: column.name,
          description: column.description,
          type: column.type,
          data: columnData,
          options: column.options,
        });
      }

      // Add columns to workbench
      newColumns.forEach(column => {
        addColumn(column);
      });
      
      // Update features in workbench
      for (const [articleId, features] of Object.entries(updatedExtractedFeatures)) {
        updateArticleFeatures(articleId, features);
      }
    } catch (error) {
      console.error('Column extraction failed:', error);
      throw error;
    } finally {
      setExtracting(false);
    }
  }, [state.articles, state.source, state.sourceGroup, setExtracting, addColumn, updateArticleFeatures]);


  const exportWorkbenchData = useCallback(async () => {
    try {
      const filename = `workbench_export_${new Date().toISOString().split('T')[0]}.csv`;
      workbenchApi.exportAsCSV(state.articles, state.columns, filename);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, [state.articles, state.columns]);

  const contextValue: WorkbenchContextType = {
    ...state,
    // High-level API orchestration
    performNewSearch,
    performSearchPagination,
    loadWorkbenchGroup,
    saveWorkbenchGroup,
    extractColumns,
    exportWorkbenchData,
    // Data loading (internal)
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
    updateSearchParams,
    updateSelectedProviders,
    updateSearchMode,
    setSearching,
    setExtracting,
    setSelectedArticle,
    updatePagination,
    clearWorkbench,
    clearResults,
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
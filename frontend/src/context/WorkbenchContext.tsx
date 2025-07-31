/**
 * WorkbenchContext - Unified state management for article collections
 * 
 * Implements the unified collection model where search results and saved groups
 * are both treated as ArticleCollections with different sources and states.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

import {
  ArticleCollection,
  CollectionSource,
  createSearchCollection,
  createSavedGroupCollection,
  SearchParams
} from '@/types/articleCollection';
import { FeatureDefinition, ArticleGroupDetail } from '@/types/workbench';
import { CanonicalResearchArticle } from '@/types/canonical_types';
import { SearchProvider } from '@/types/unifiedSearch';

import { unifiedSearchApi } from '@/lib/api/unifiedSearchApi';
import { workbenchApi } from '@/lib/api/workbenchApi';
import { generateUUID, generatePrefixedUUID } from '@/lib/utils/uuid';

// ================== STATE INTERFACE ==================

interface WorkbenchState {
  // SINGLE COLLECTION STATE
  currentCollection: ArticleCollection | null;   // The active collection
  collectionLoading: boolean;

  // SEARCH STATE
  searchQuery: string;
  selectedProviders: SearchProvider[];
  searchMode: 'single' | 'multi';
  searchParams: {
    pageSize: number;
    sortBy: 'relevance' | 'date';
    yearLow?: number;
    yearHigh?: number;
    dateType: 'completion' | 'publication' | 'entry' | 'revised';
    includeCitations: boolean;
    includePdfLinks: boolean;
  };

  // PAGINATION STATE
  searchPagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    pageSize: number;
  } | null;
  
  groupPagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    pageSize: number;
  } | null;

  // UI STATE  
  selectedArticleIds: Set<string>;               // For operations on articles
  selectedArticle: CanonicalResearchArticle | null;  // For detail view

  // Feature extraction state
  isExtracting: boolean;
  extractionProgress?: {
    current: number;
    total: number;
    currentArticle?: string;
  };

  // Error state
  error: string | null;
}

// ================== ACTIONS INTERFACE ==================

interface WorkbenchActions {
  // Search State Management
  updateSearchQuery: (query: string) => void;
  updateSelectedProviders: (providers: SearchProvider[]) => void;
  updateSearchMode: (mode: 'single' | 'multi') => void;
  updateSearchParams: (params: Partial<WorkbenchState['searchParams']>) => void;

  // Collection Management
  performSearch: (page?: number) => Promise<void>;
  loadGroup: (groupId: string) => Promise<void>;
  loadGroupList: () => Promise<any[]>;
  saveCollection: (name: string, description?: string) => Promise<void>;
  addToExistingGroup: (groupId: string, articleIds?: string[]) => Promise<void>;
  saveCollectionChanges: () => Promise<void>;
  deleteCollection: () => Promise<void>;

  // Collection Modification
  addArticles: (articles: CanonicalResearchArticle[]) => void;
  removeArticles: (articleIds: string[]) => void;
  updateArticlePosition: (articleId: string, newPosition: number) => void;

  // Feature Management
  addFeatureDefinitions: (features: FeatureDefinition[]) => void;
  addFeatureDefinitionsAndExtract: (features: FeatureDefinition[]) => Promise<void>;
  removeFeatureDefinition: (featureId: string) => void;
  extractFeatures: (featureIds?: string[]) => Promise<void>;
  updateFeatureValue: (articleId: string, featureId: string, value: any) => void;

  // Selection Management
  selectArticle: (article: CanonicalResearchArticle | null) => void;
  toggleArticleSelection: (articleId: string) => void;
  selectAllArticles: () => void;
  clearArticleSelection: () => void;

  // Utility Actions
  exportCollection: (format: 'csv' | 'json') => Promise<void>;
  clearError: () => void;
  resetWorkbench: () => void;
}

// ================== CONTEXT ==================

interface WorkbenchContextType extends WorkbenchState, WorkbenchActions { }

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

// ================== PROVIDER COMPONENT ==================

interface WorkbenchProviderProps {
  children: React.ReactNode;
}

export function WorkbenchProvider({ children }: WorkbenchProviderProps) {
  // State
  const [currentCollection, setCurrentCollection] = useState<ArticleCollection | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<SearchProvider[]>(['pubmed']);
  const [searchMode, setSearchMode] = useState<'single' | 'multi'>('single');
  const [searchParams, setSearchParams] = useState<WorkbenchState['searchParams']>({
    pageSize: 20,
    sortBy: 'relevance',
    yearLow: undefined,
    yearHigh: undefined,
    dateType: 'publication',
    includeCitations: false,
    includePdfLinks: false
  });
  
  const [searchPagination, setSearchPagination] = useState<WorkbenchState['searchPagination']>(null);
  const [groupPagination, setGroupPagination] = useState<WorkbenchState['groupPagination']>(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [selectedArticle, setSelectedArticle] = useState<CanonicalResearchArticle | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<WorkbenchState['extractionProgress']>();
  const [error, setError] = useState<string | null>(null);

  // ================== SEARCH STATE MANAGEMENT ==================

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const updateSelectedProviders = useCallback((providers: SearchProvider[]) => {
    setSelectedProviders(providers);
  }, []);

  const updateSearchMode = useCallback((mode: 'single' | 'multi') => {
    setSearchMode(mode);
  }, []);

  const updateSearchParams = useCallback((params: Partial<WorkbenchState['searchParams']>) => {
    setSearchParams(prev => ({ ...prev, ...params }));
  }, []);

  // ================== COLLECTION MANAGEMENT ==================

  const performSearch = useCallback(async (page: number = 1) => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }
    setCollectionLoading(true);
    setError(null);

    try {
      const searchResult = await unifiedSearchApi.search({
        query: searchQuery,
        provider: selectedProviders[0] || 'pubmed',
        page: page,
        page_size: searchParams.pageSize,
        sort_by: searchParams.sortBy,
        year_low: searchParams.yearLow,
        year_high: searchParams.yearHigh,
        date_type: searchParams.dateType,
        include_citations: searchParams.includeCitations,
        include_pdf_links: searchParams.includePdfLinks
      });

      const searchParamsForCollection: SearchParams = {
        query: searchQuery,
        filters: {},
        page: page,
        page_size: searchParams.pageSize,
        provider: selectedProviders[0] || 'pubmed',
        sort_by: searchParams.sortBy,
        year_low: searchParams.yearLow,
        year_high: searchParams.yearHigh,
        date_type: searchParams.dateType,
        include_citations: searchParams.includeCitations,
        include_pdf_links: searchParams.includePdfLinks
      };

      const collection = createSearchCollection(searchResult.articles, searchParamsForCollection);
      setCurrentCollection(collection);
      
      // Update pagination state from metadata
      if (searchResult.metadata) {
        setSearchPagination({
          currentPage: searchResult.metadata.current_page || page,
          totalPages: searchResult.metadata.total_pages || 1,
          totalResults: searchResult.metadata.total_results || searchResult.articles.length,
          pageSize: searchResult.metadata.page_size || searchParams.pageSize
        });
      } else {
        // Fallback for responses without metadata
        setSearchPagination({
          currentPage: page,
          totalPages: 1,
          totalResults: searchResult.articles.length,
          pageSize: searchParams.pageSize
        });
      }
      
      setSelectedArticleIds(new Set());
      setSelectedArticle(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('Search error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [searchQuery, selectedProviders, searchParams]);

  const loadGroup = useCallback(async (groupId: string, page: number = 1) => {
    setCollectionLoading(true);
    setError(null);

    try {
      const pageSize = searchParams.pageSize; // Use same page size as search
      const group = await workbenchApi.getGroupDetails(groupId, page, pageSize);
      const collection = createSavedGroupCollection(group);
      setCurrentCollection(collection);
      setSearchPagination(null); // Clear search pagination
      
      // Set group pagination if available
      if (group.pagination) {
        setGroupPagination({
          currentPage: group.pagination.current_page,
          totalPages: group.pagination.total_pages,
          totalResults: group.pagination.total_results,
          pageSize: group.pagination.page_size
        });
      } else {
        setGroupPagination(null);
      }
      
      setSelectedArticleIds(new Set());
      setSelectedArticle(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group');
      console.error('Load group error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [searchParams.pageSize]);

  const loadGroupList = useCallback(async () => {
    try {
      const response = await workbenchApi.getGroups(1, 100); // Get first 100 groups
      return response.groups;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
      console.error('Load groups error:', err);
      return [];
    }
  }, []);

  const saveCollection = useCallback(async (name: string, description?: string) => {
    if (!currentCollection) return;

    setCollectionLoading(true);
    setError(null);

    try {
      const articleData = currentCollection.articles.map(a => a.article);

      const savedGroup = await workbenchApi.createGroup({
        name,
        description,
        articles: articleData,
        feature_definitions: currentCollection.feature_definitions,
        search_context: {
          query: currentCollection.search_params?.query || '',
          provider: currentCollection.search_params?.provider || 'pubmed',
          parameters: currentCollection.search_params?.filters || {}
        }
      });

      // Update current collection to reflect saved state
      setCurrentCollection({
        ...currentCollection,
        id: savedGroup.id,
        source: CollectionSource.SAVED_GROUP,
        name: savedGroup.name,
        saved_group_id: savedGroup.id,
        is_saved: true,
        is_modified: false,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save collection');
      console.error('Save collection error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [currentCollection]);

  const addToExistingGroup = useCallback(async (groupId: string, articleIds?: string[]) => {
    if (!currentCollection) return;

    setCollectionLoading(true);
    setError(null);

    try {
      // Get articles to add - either specified IDs or all articles
      let articlesToAdd;
      if (articleIds && articleIds.length > 0) {
        articlesToAdd = currentCollection.articles
          .filter(item => articleIds.includes(item.article.id))
          .map(item => item.article);
      } else {
        articlesToAdd = currentCollection.articles.map(a => a.article);
      }

      await workbenchApi.addArticlesToGroup(groupId, {
        articles: articlesToAdd,
        extract_features: false // Don't auto-extract when adding to existing group
      });

      // Load the updated group to reflect the changes
      await loadGroup(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to existing group');
      console.error('Add to group error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [currentCollection, loadGroup]);

  const saveCollectionChanges = useCallback(async () => {
    if (!currentCollection || !currentCollection.saved_group_id) return;

    setCollectionLoading(true);
    setError(null);

    try {
      await workbenchApi.updateGroup(currentCollection.saved_group_id, {
        name: currentCollection.name,
        feature_definitions: currentCollection.feature_definitions
      });

      // TODO: Update articles if needed

      setCurrentCollection({
        ...currentCollection,
        is_modified: false,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      console.error('Save changes error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [currentCollection]);

  const deleteCollection = useCallback(async () => {
    if (!currentCollection || !currentCollection.saved_group_id) return;

    if (!confirm('Are you sure you want to delete this collection?')) return;

    setCollectionLoading(true);
    setError(null);

    try {
      await workbenchApi.deleteGroup(currentCollection.saved_group_id);
      setCurrentCollection(null);
      setSelectedArticleIds(new Set());
      setSelectedArticle(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      console.error('Delete collection error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [currentCollection]);

  // ================== COLLECTION MODIFICATION ==================

  const addArticles = useCallback((articles: CanonicalResearchArticle[]) => {
    if (!currentCollection) return;

    const newArticleDetails: ArticleGroupDetail[] = articles.map(article => ({
      id: generateUUID(),
      article_id: article.id,
      group_id: currentCollection.saved_group_id || '',
      article,
      feature_data: {},
      position: currentCollection.articles.length,
      added_at: new Date().toISOString()
    }));

    setCurrentCollection({
      ...currentCollection,
      articles: [...currentCollection.articles, ...newArticleDetails],
      is_modified: true,
      updated_at: new Date().toISOString()
    });
  }, [currentCollection]);

  const removeArticles = useCallback((articleIds: string[]) => {
    if (!currentCollection) return;

    const idSet = new Set(articleIds);
    const filteredArticles = currentCollection.articles.filter(
      a => !idSet.has(a.article_id)
    );

    setCurrentCollection({
      ...currentCollection,
      articles: filteredArticles,
      is_modified: true,
      updated_at: new Date().toISOString()
    });

    // Clear selection if needed
    setSelectedArticleIds(prev => {
      const newSet = new Set(prev);
      articleIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, [currentCollection]);

  const updateArticlePosition = useCallback((articleId: string, newPosition: number) => {
    if (!currentCollection) return;

    const articles = [...currentCollection.articles];
    const currentIndex = articles.findIndex(a => a.article_id === articleId);

    if (currentIndex === -1) return;

    const [movedArticle] = articles.splice(currentIndex, 1);
    articles.splice(newPosition, 0, movedArticle);

    // Update positions
    articles.forEach((article, index) => {
      article.position = index;
    });

    setCurrentCollection({
      ...currentCollection,
      articles,
      is_modified: true,
      updated_at: new Date().toISOString()
    });
  }, [currentCollection]);

  // ================== FEATURE MANAGEMENT ==================

  const addFeatureDefinitions = useCallback((features: FeatureDefinition[]) => {
    if (!currentCollection) return;

    // Ensure unique IDs
    const newFeatures = features.map(f => ({
      ...f,
      id: f.id || generatePrefixedUUID('feat')
    }));

    // Filter out any features that already exist (prevent duplicates)
    const existingIds = new Set(currentCollection.feature_definitions.map(f => f.id));
    const uniqueNewFeatures = newFeatures.filter(f => !existingIds.has(f.id));

    if (uniqueNewFeatures.length === 0) return; // No new features to add

    setCurrentCollection({
      ...currentCollection,
      feature_definitions: [...currentCollection.feature_definitions, ...uniqueNewFeatures],
      is_modified: true,
      updated_at: new Date().toISOString()
    });
  }, [currentCollection]);

  const addFeatureDefinitionsAndExtract = useCallback(async (features: FeatureDefinition[]) => {
    if (!currentCollection) return;

    console.log('WorkbenchContext addFeatureDefinitionsAndExtract received features:', features);

    // Ensure unique IDs
    const newFeatures = features.map(f => ({
      ...f,
      id: f.id || generatePrefixedUUID('feat')
    }));

    console.log('WorkbenchContext processed features:', newFeatures);

    // Create updated collection with new features
    const updatedCollection = {
      ...currentCollection,
      feature_definitions: [...currentCollection.feature_definitions, ...newFeatures],
      is_modified: true,
      updated_at: new Date().toISOString()
    };

    // Update state immediately
    setCurrentCollection(updatedCollection);

    // Now extract features using the new features directly
    setIsExtracting(true);
    setError(null);

    try {
      const articlesData = updatedCollection.articles.map(a => ({
        id: a.article_id,
        title: a.article.title,
        abstract: a.article.abstract || ''
      }));

      console.log('WorkbenchContext about to call API with:', {
        articles: articlesData,
        features: newFeatures
      });

      const extractionResult = await workbenchApi.extractFeatures({
        articles: articlesData,
        features: newFeatures // Use the new features directly
      });

      console.log('Extraction API Response:', extractionResult);
      console.log('Articles data sent:', articlesData);
      console.log('Features sent:', newFeatures);

      // Update article feature_data
      const updatedArticles = updatedCollection.articles.map(article => {
        const articleFeatures = extractionResult.results[article.article_id] || {};
        console.log(`Article ${article.article_id} features:`, articleFeatures);

        // Handle both feature ID and feature name keys
        const processedFeatures: Record<string, string> = {};

        // First, try direct mapping (if API uses feature IDs)
        Object.keys(articleFeatures).forEach(key => {
          processedFeatures[key] = articleFeatures[key];
        });

        // Also try mapping feature names to IDs (if API uses feature names)
        newFeatures.forEach(feature => {
          if (articleFeatures[feature.name]) {
            processedFeatures[feature.id] = articleFeatures[feature.name];
          }
        });

        console.log(`Processed features for article ${article.article_id}:`, processedFeatures);

        return {
          ...article,
          feature_data: {
            ...article.feature_data,
            ...processedFeatures
          }
        };
      });

      console.log('Updated articles with feature data:', updatedArticles);

      setCurrentCollection({
        ...updatedCollection,
        articles: updatedArticles,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feature extraction failed');
      console.error('Feature extraction error:', err);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(undefined);
    }
  }, [currentCollection]);

  const removeFeatureDefinition = useCallback((featureId: string) => {
    if (!currentCollection) return;

    // Remove from definitions
    const filteredDefinitions = currentCollection.feature_definitions.filter(
      f => f.id !== featureId
    );

    // Remove from all article feature_data
    const updatedArticles = currentCollection.articles.map(article => {
      const newFeatureData = { ...article.feature_data };
      delete newFeatureData[featureId];
      return { ...article, feature_data: newFeatureData };
    });

    setCurrentCollection({
      ...currentCollection,
      feature_definitions: filteredDefinitions,
      articles: updatedArticles,
      is_modified: true,
      updated_at: new Date().toISOString()
    });
  }, [currentCollection]);

  const extractFeatures = useCallback(async (featureIds?: string[]) => {
    if (!currentCollection || currentCollection.feature_definitions.length === 0) return;

    setIsExtracting(true);
    setError(null);

    try {
      const featuresToExtract = featureIds
        ? currentCollection.feature_definitions.filter(f => featureIds.includes(f.id))
        : currentCollection.feature_definitions;

      const articlesData = currentCollection.articles.map(a => ({
        id: a.article_id,
        title: a.article.title,
        abstract: a.article.abstract || ''
      }));

      const extractionResult = await workbenchApi.extractFeatures({
        articles: articlesData,
        features: featuresToExtract
      });

      // Update article feature_data
      const updatedArticles = currentCollection.articles.map(article => {
        const articleFeatures = extractionResult.results[article.article_id] || {};
        return {
          ...article,
          feature_data: {
            ...article.feature_data,
            ...articleFeatures
          }
        };
      });

      setCurrentCollection({
        ...currentCollection,
        articles: updatedArticles,
        is_modified: true,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feature extraction failed');
      console.error('Feature extraction error:', err);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(undefined);
    }
  }, [currentCollection]);

  const updateFeatureValue = useCallback((articleId: string, featureId: string, value: any) => {
    if (!currentCollection) return;

    const updatedArticles = currentCollection.articles.map(article => {
      if (article.article_id === articleId) {
        return {
          ...article,
          feature_data: {
            ...article.feature_data,
            [featureId]: value
          }
        };
      }
      return article;
    });

    setCurrentCollection({
      ...currentCollection,
      articles: updatedArticles,
      is_modified: true,
      updated_at: new Date().toISOString()
    });
  }, [currentCollection]);

  // ================== SELECTION MANAGEMENT ==================

  const selectArticle = useCallback((article: CanonicalResearchArticle | null) => {
    setSelectedArticle(article);
  }, []);

  const toggleArticleSelection = useCallback((articleId: string) => {
    setSelectedArticleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  }, []);

  const selectAllArticles = useCallback(() => {
    if (!currentCollection) return;

    const allIds = new Set(currentCollection.articles.map(a => a.article_id));
    setSelectedArticleIds(allIds);
  }, [currentCollection]);

  const clearArticleSelection = useCallback(() => {
    setSelectedArticleIds(new Set());
  }, []);

  // ================== UTILITY ACTIONS ==================

  const exportCollection = useCallback(async (format: 'csv' | 'json') => {
    if (!currentCollection) return;

    // TODO: Implement export functionality
    console.log('Export collection as', format);
  }, [currentCollection]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetWorkbench = useCallback(() => {
    // Reset collection state
    setCurrentCollection(null);
    setSearchPagination(null);
    setGroupPagination(null);
    setSelectedArticleIds(new Set());
    setSelectedArticle(null);
    setIsExtracting(false);
    setExtractionProgress(undefined);
    setError(null);
    
    // Reset search state
    setSearchQuery('');
    setSelectedProviders(['pubmed']);
    setSearchMode('single');
    setSearchParams({
      pageSize: 20,
      sortBy: 'relevance',
      yearLow: undefined,
      yearHigh: undefined,
      dateType: 'publication',
      includeCitations: false,
      includePdfLinks: false
    });
  }, []);

  // ================== CONTEXT VALUE ==================

  const contextValue: WorkbenchContextType = {
    // State
    currentCollection,
    collectionLoading,
    searchQuery,
    selectedProviders,
    searchMode,
    searchParams,
    searchPagination,
    groupPagination,
    selectedArticleIds,
    selectedArticle,
    isExtracting,
    extractionProgress,
    error,

    // Actions
    updateSearchQuery,
    updateSelectedProviders,
    updateSearchMode,
    updateSearchParams,
    performSearch,
    loadGroup,
    loadGroupList,
    saveCollection,
    addToExistingGroup,
    saveCollectionChanges,
    deleteCollection,
    addArticles,
    removeArticles,
    updateArticlePosition,
    addFeatureDefinitions,
    addFeatureDefinitionsAndExtract,
    removeFeatureDefinition,
    extractFeatures,
    updateFeatureValue,
    selectArticle,
    toggleArticleSelection,
    selectAllArticles,
    clearArticleSelection,
    exportCollection,
    clearError,
    resetWorkbench
  };

  return (
    <WorkbenchContext.Provider value={contextValue}>
      {children}
    </WorkbenchContext.Provider>
  );
}

// ================== HOOK ==================

export function useWorkbench() {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error('useWorkbench must be used within a WorkbenchProvider');
  }
  return context;
}
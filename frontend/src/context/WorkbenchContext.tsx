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
  // DUAL COLLECTION STATE
  searchCollection: ArticleCollection | null;   // Search results collection
  groupCollection: ArticleCollection | null;    // Loaded group collection
  collectionLoading: boolean;
  
  // GROUPS LIST STATE
  groupsList: any[];
  groupsListLoading: boolean;

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
  
  groupParams: {
    pageSize: number;
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
  loadGroup: (groupId: string, page?: number) => Promise<void>;
  loadGroupList: () => Promise<any[]>;
  saveCollection: (name: string, description?: string, collectionType?: 'search' | 'group', selectedArticleIds?: string[]) => Promise<string>;
  addToExistingGroup: (groupId: string, articleIds?: string[], collectionType?: 'search' | 'group') => Promise<void>;
  saveCollectionChanges: (collectionType?: 'search' | 'group') => Promise<void>;
  deleteCollection: (collectionType?: 'search' | 'group') => Promise<void>;
  deleteGroupById: (groupId: string) => Promise<void>;
  updateGroupInfo: (groupId: string, name: string, description?: string) => Promise<void>;
  
  // Collection Getters
  getCurrentCollection: (tab: 'search' | 'groups') => ArticleCollection | null;

  // Collection Modification
  addArticles: (articles: CanonicalResearchArticle[], collectionType?: 'search' | 'group') => void;
  removeArticles: (articleIds: string[], collectionType?: 'search' | 'group') => void;
  updateArticlePosition: (articleId: string, newPosition: number, collectionType?: 'search' | 'group') => void;

  // Feature Management
  addFeatureDefinitions: (features: FeatureDefinition[], collectionType?: 'search' | 'group') => void;
  addFeatureDefinitionsAndExtract: (features: FeatureDefinition[], collectionType?: 'search' | 'group') => Promise<void>;
  removeFeatureDefinition: (featureId: string, collectionType?: 'search' | 'group') => void;
  extractFeatures: (featureIds?: string[], collectionType?: 'search' | 'group') => Promise<void>;
  updateFeatureValue: (articleId: string, featureId: string, value: any, collectionType?: 'search' | 'group') => void;

  // Selection Management
  selectArticle: (article: CanonicalResearchArticle | null) => void;
  toggleArticleSelection: (articleId: string) => void;
  selectAllArticles: () => void;
  clearArticleSelection: () => void;

  // Utility Actions
  exportCollection: (format: 'csv' | 'json') => Promise<void>;
  clearError: () => void;
  resetWorkbench: () => void;
  resetSearchCollection: () => void;
  refreshGroupsList: () => Promise<void>;
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
  const [searchCollection, setSearchCollection] = useState<ArticleCollection | null>(null);
  const [groupCollection, setGroupCollection] = useState<ArticleCollection | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [groupsListLoading, setGroupsListLoading] = useState(false);
  
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
  
  const [groupParams, setGroupParams] = useState<WorkbenchState['groupParams']>({
    pageSize: 20
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
  
  const updateGroupParams = useCallback((params: Partial<WorkbenchState['groupParams']>) => {
    setGroupParams(prev => ({ ...prev, ...params }));
  }, []);

  // ================== COLLECTION GETTERS ==================
  
  const getCurrentCollection = useCallback((tab: 'search' | 'groups'): ArticleCollection | null => {
    if (tab === 'search') {
      return searchCollection;
    } else {
      return groupCollection;
    }
  }, [searchCollection, groupCollection]);

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
      setSearchCollection(collection);
      
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
      const pageSize = groupParams.pageSize; // Use group-specific page size
      const group = await workbenchApi.getGroupDetails(groupId, page, pageSize);
      const collection = createSavedGroupCollection(group);
      setGroupCollection(collection);
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
  }, [groupParams.pageSize]);

  const loadGroupList = useCallback(async () => {
    // Return cached groups list for backward compatibility
    return groupsList;
  }, [groupsList]);

  const refreshGroupsList = useCallback(async () => {
    setGroupsListLoading(true);
    try {
      const response = await workbenchApi.getGroups(1, 100); // Get first 100 groups
      setGroupsList(response.groups);
      return response.groups;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
      console.error('Load groups error:', err);
      return [];
    } finally {
      setGroupsListLoading(false);
    }
  }, []);

  const saveCollection = useCallback(async (name: string, description?: string, collectionType: 'search' | 'group' = 'search', selectedArticleIds?: string[]): Promise<string> => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
    if (!currentCollection) throw new Error('No collection to save');

    setCollectionLoading(true);
    setError(null);

    try {
      // Use selected articles if provided, otherwise use all articles
      let articlesToSave;
      if (selectedArticleIds && selectedArticleIds.length > 0) {
        articlesToSave = currentCollection.articles
          .filter(item => selectedArticleIds.includes(item.article.id))
          .map(item => item.article);
      } else {
        articlesToSave = currentCollection.articles.map(a => a.article);
      }

      const savedGroup = await workbenchApi.createGroup({
        name,
        description,
        articles: articlesToSave,
        feature_definitions: currentCollection.feature_definitions,
        search_context: {
          query: currentCollection.search_params?.query || '',
          provider: currentCollection.search_params?.provider || 'pubmed',
          parameters: currentCollection.search_params?.filters || {}
        }
      });

      // Update the appropriate collection to reflect saved state
      const updatedCollection = {
        ...currentCollection,
        id: savedGroup.id,
        source: CollectionSource.SAVED_GROUP,
        name: savedGroup.name,
        saved_group_id: savedGroup.id,
        is_saved: true,
        is_modified: false,
        updated_at: new Date().toISOString()
      };
      
      if (collectionType === 'search') {
        setSearchCollection(updatedCollection);
      } else {
        setGroupCollection(updatedCollection);
      }
      
      // Refresh groups list after successful save
      await refreshGroupsList();
      
      // Return the saved group ID
      return savedGroup.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save collection');
      console.error('Save collection error:', err);
      throw err;
    } finally {
      setCollectionLoading(false);
    }
  }, [searchCollection, groupCollection, refreshGroupsList]);

  const addToExistingGroup = useCallback(async (groupId: string, articleIds?: string[], collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
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
      
      // Refresh groups list to reflect updated article count
      await refreshGroupsList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to existing group');
      console.error('Add to group error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [searchCollection, groupCollection, loadGroup, refreshGroupsList]);

  const saveCollectionChanges = useCallback(async (collectionType: 'search' | 'group' = 'group') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
    if (!currentCollection || !currentCollection.saved_group_id) return;

    setCollectionLoading(true);
    setError(null);

    try {
      // Use the elegant unified update API - pass articles to trigger full state synchronization
      await workbenchApi.updateGroup(currentCollection.saved_group_id, {
        name: currentCollection.name,
        description: currentCollection.description,
        feature_definitions: currentCollection.feature_definitions,
        articles: currentCollection.articles.map(item => item.article),
        search_query: currentCollection.search_params?.query,
        search_provider: currentCollection.search_params?.provider,
        search_params: currentCollection.search_params?.filters || {}
      });

      const updatedCollection = {
        ...currentCollection,
        is_modified: false,
        updated_at: new Date().toISOString()
      };
      
      if (collectionType === 'search') {
        setSearchCollection(updatedCollection);
      } else {
        setGroupCollection(updatedCollection);
      }
      
      // Refresh groups list to reflect changes
      await refreshGroupsList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      console.error('Save changes error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [searchCollection, groupCollection, refreshGroupsList]);

  const deleteCollection = useCallback(async (collectionType: 'search' | 'group' = 'group') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
    if (!currentCollection || !currentCollection.saved_group_id) return;

    if (!confirm('Are you sure you want to delete this collection?')) return;

    setCollectionLoading(true);
    setError(null);

    try {
      await workbenchApi.deleteGroup(currentCollection.saved_group_id);
      
      if (collectionType === 'search') {
        setSearchCollection(null);
      } else {
        setGroupCollection(null);
      }
      
      setSelectedArticleIds(new Set());
      setSelectedArticle(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      console.error('Delete collection error:', err);
    } finally {
      setCollectionLoading(false);
    }
  }, [searchCollection, groupCollection]);

  const deleteGroupById = useCallback(async (groupId: string) => {
    setCollectionLoading(true);
    setError(null);

    try {
      await workbenchApi.deleteGroup(groupId);
      
      // Clear the group collection if it matches the deleted group
      if (groupCollection && groupCollection.saved_group_id === groupId) {
        setGroupCollection(null);
      }
      
      setSelectedArticleIds(new Set());
      setSelectedArticle(null);
      
      // Refresh groups list to reflect deletion
      await refreshGroupsList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
      console.error('Delete group error:', err);
      throw err; // Re-throw for caller to handle
    } finally {
      setCollectionLoading(false);
    }
  }, [groupCollection, refreshGroupsList]);

  const updateGroupInfo = useCallback(async (groupId: string, name: string, description?: string) => {
    setCollectionLoading(true);
    setError(null);

    try {
      await workbenchApi.updateGroup(groupId, {
        name,
        description
      });

      // Update the appropriate collection with new name/description
      const updateCollection = (collection: ArticleCollection | null): ArticleCollection | null => {
        if (collection && collection.saved_group_id === groupId) {
          return {
            ...collection,
            name,
            description,
            is_modified: false, // Reset modified flag after successful update
            updated_at: new Date().toISOString()
          };
        }
        return collection;
      };

      setSearchCollection(prevCollection => updateCollection(prevCollection));
      setGroupCollection(prevCollection => updateCollection(prevCollection));
      
      // Refresh groups list to reflect updated info
      await refreshGroupsList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group info');
      console.error('Update group info error:', err);
      throw err; // Re-throw for caller to handle
    } finally {
      setCollectionLoading(false);
    }
  }, [refreshGroupsList]);

  // ================== COLLECTION MODIFICATION ==================

  const addArticles = useCallback((articles: CanonicalResearchArticle[], collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
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

    const updatedCollection = {
      ...currentCollection,
      articles: [...currentCollection.articles, ...newArticleDetails],
      is_modified: true,
      updated_at: new Date().toISOString()
    };
    
    if (collectionType === 'search') {
      setSearchCollection(updatedCollection);
    } else {
      setGroupCollection(updatedCollection);
    }
  }, [searchCollection, groupCollection]);

  const removeArticles = useCallback((articleIds: string[], collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
    if (!currentCollection) return;

    const idSet = new Set(articleIds);
    const filteredArticles = currentCollection.articles.filter(
      a => !idSet.has(a.article_id)
    );

    const updatedCollection = {
      ...currentCollection,
      articles: filteredArticles,
      is_modified: true,
      updated_at: new Date().toISOString()
    };
    
    if (collectionType === 'search') {
      setSearchCollection(updatedCollection);
    } else {
      setGroupCollection(updatedCollection);
    }

    // Clear selection if needed
    setSelectedArticleIds(prev => {
      const newSet = new Set(prev);
      articleIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, [searchCollection, groupCollection]);

  const updateArticlePosition = useCallback((articleId: string, newPosition: number, collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
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

    const updatedCollection = {
      ...currentCollection,
      articles,
      is_modified: true,
      updated_at: new Date().toISOString()
    };
    
    if (collectionType === 'search') {
      setSearchCollection(updatedCollection);
    } else {
      setGroupCollection(updatedCollection);
    }
  }, [searchCollection, groupCollection]);

  // ================== FEATURE MANAGEMENT ==================

  const addFeatureDefinitions = useCallback((features: FeatureDefinition[], collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
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

    const updatedCollection = {
      ...currentCollection,
      feature_definitions: [...currentCollection.feature_definitions, ...uniqueNewFeatures],
      is_modified: true,
      updated_at: new Date().toISOString()
    };
    
    if (collectionType === 'search') {
      setSearchCollection(updatedCollection);
    } else {
      setGroupCollection(updatedCollection);
    }
  }, [searchCollection, groupCollection]);

  const addFeatureDefinitionsAndExtract = useCallback(async (features: FeatureDefinition[], collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
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
    if (collectionType === 'search') {
      setSearchCollection(updatedCollection);
    } else {
      setGroupCollection(updatedCollection);
    }

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

      const finalCollection = {
        ...updatedCollection,
        articles: updatedArticles,
        updated_at: new Date().toISOString()
      };
      
      if (collectionType === 'search') {
        setSearchCollection(finalCollection);
      } else {
        setGroupCollection(finalCollection);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feature extraction failed');
      console.error('Feature extraction error:', err);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(undefined);
    }
  }, [searchCollection, groupCollection]);

  const removeFeatureDefinition = useCallback((featureId: string, collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
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

    const updatedCollection = {
      ...currentCollection,
      feature_definitions: filteredDefinitions,
      articles: updatedArticles,
      is_modified: true,
      updated_at: new Date().toISOString()
    };
    
    if (collectionType === 'search') {
      setSearchCollection(updatedCollection);
    } else {
      setGroupCollection(updatedCollection);
    }
  }, [searchCollection, groupCollection]);

  const extractFeatures = useCallback(async (featureIds?: string[], collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
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

      const updatedCollection = {
        ...currentCollection,
        articles: updatedArticles,
        is_modified: true,
        updated_at: new Date().toISOString()
      };
      
      if (collectionType === 'search') {
        setSearchCollection(updatedCollection);
      } else {
        setGroupCollection(updatedCollection);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feature extraction failed');
      console.error('Feature extraction error:', err);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(undefined);
    }
  }, [searchCollection, groupCollection]);

  const updateFeatureValue = useCallback((articleId: string, featureId: string, value: any, collectionType: 'search' | 'group' = 'search') => {
    const currentCollection = collectionType === 'search' ? searchCollection : groupCollection;
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

    const updatedCollection = {
      ...currentCollection,
      articles: updatedArticles,
      is_modified: true,
      updated_at: new Date().toISOString()
    };
    
    if (collectionType === 'search') {
      setSearchCollection(updatedCollection);
    } else {
      setGroupCollection(updatedCollection);
    }
  }, [searchCollection, groupCollection]);

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
    // This function should be updated to use context from the calling component
    // For now, we'll leave it as is since it's not used much
    const currentCollection = searchCollection || groupCollection;
    if (!currentCollection) return;

    const allIds = new Set(currentCollection.articles.map(a => a.article_id));
    setSelectedArticleIds(allIds);
  }, [searchCollection, groupCollection]);

  const clearArticleSelection = useCallback(() => {
    setSelectedArticleIds(new Set());
  }, []);

  // ================== UTILITY ACTIONS ==================

  const exportCollection = useCallback(async (format: 'csv' | 'json') => {
    // TODO: Implement export functionality - would need collectionType parameter
    console.log('Export collection as', format);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetWorkbench = useCallback(() => {
    // Reset collection state
    setSearchCollection(null);
    setGroupCollection(null);
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
    setGroupParams({
      pageSize: 20
    });
  }, []);

  const resetSearchCollection = useCallback(() => {
    // Only reset search-related state
    setSearchCollection(null);
    setSearchPagination(null);
    setSelectedArticleIds(new Set());
    setSelectedArticle(null);
    setError(null);
  }, []);

  // ================== CONTEXT VALUE ==================

  const contextValue: WorkbenchContextType = {
    // State
    searchCollection,
    groupCollection,
    collectionLoading,
    groupsList,
    groupsListLoading,
    searchQuery,
    selectedProviders,
    searchMode,
    searchParams,
    groupParams,
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
    updateGroupParams,
    performSearch,
    loadGroup,
    loadGroupList,
    saveCollection,
    addToExistingGroup,
    saveCollectionChanges,
    deleteCollection,
    deleteGroupById,
    updateGroupInfo,
    getCurrentCollection,
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
    resetWorkbench,
    resetSearchCollection,
    refreshGroupsList
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
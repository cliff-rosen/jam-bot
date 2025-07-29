import { useState } from 'react';
import { Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Pagination } from '@/components/ui/pagination';

import { unifiedSearchApi } from '@/lib/api/unifiedSearchApi';
import { articleChatApi } from '@/lib/api/articleChatApi';
import { workbenchApi } from '@/lib/api/workbenchApi';

import { WorkbenchColumn, ArticleGroup } from '@/types/workbench';
import { CanonicalResearchArticle, UnifiedSearchParams, SearchProvider } from '@/types/unifiedSearch';

import { UnifiedSearchControls } from './search/UnifiedSearchControls';
import { WorkbenchTable } from './WorkbenchTable';
import { AddColumnModal } from './AddColumnModal';
import { ArticleWorkbenchModal } from './ArticleWorkbenchModal';
import { SaveGroupModal } from './SaveGroupModal';
import { LoadGroupModal } from './LoadGroupModal';

export function WorkbenchPage() {
  const [articles, setArticles] = useState<CanonicalResearchArticle[]>([]);
  const [columns, setColumns] = useState<WorkbenchColumn[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<CanonicalResearchArticle | null>(null);
  const [currentGroup, setCurrentGroup] = useState<ArticleGroup | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Track what type of data we're currently showing
  const [dataSource, setDataSource] = useState<'search' | 'group'>('search');

  // Search state for UnifiedSearchControls
  const [searchParams, setSearchParams] = useState<UnifiedSearchParams>({
    provider: 'pubmed',
    query: '',
    num_results: 20, // This becomes page_size
    sort_by: 'relevance',
    include_citations: false,
    include_pdf_links: false,
    page: 1,
    page_size: 20,
  });
  const [selectedProviders, setSelectedProviders] = useState<SearchProvider[]>(['pubmed']);
  const [searchMode, setSearchMode] = useState<'single' | 'multi'>('single');

  // Single pagination state for the table view
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalResults: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const { toast } = useToast();

  const handleSearch = async (page = 1) => {
    setIsSearching(true);
    setDataSource('search');

    try {
      // Use search parameters - num_results from user selection
      const paginatedParams = {
        ...searchParams,
        page,
        page_size: searchParams.num_results,
        num_results: searchParams.num_results,
        offset: (page - 1) * searchParams.num_results
      };

      const response = await unifiedSearchApi.search(paginatedParams);
      setArticles(response.articles);

      // Update pagination state
      const totalResults = response.metadata.total_results || 0;
      const totalPages = Math.ceil(totalResults / searchParams.num_results);

      setPagination(prev => ({
        ...prev,
        currentPage: page,
        pageSize: searchParams.num_results,
        totalResults,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }));

      // Clear columns and group only on new search (page 1)
      if (page === 1) {
        setColumns([]);
        setCurrentGroup(null);
      }

      toast({
        title: 'Search Complete',
        description: `Found ${totalResults.toLocaleString()} total results, showing page ${page} of ${totalPages}`,
      });
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Search Failed',
        description: 'Unable to search articles. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (dataSource === 'search') {
      handleSearch(page);
    } else if (dataSource === 'group' && currentGroup) {
      handleLoadGroup(currentGroup.id, page);
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId));
    toast({
      title: 'Column Deleted',
      description: 'Column has been removed from the table.',
    });
  };

  const handleDeleteArticle = async (articleId: string) => {
    // Remove the article from the current page view
    const updatedCurrentPageArticles = articles.filter(article => article.id !== articleId);

    // Also remove any extracted column data for this article
    const updatedColumns = columns.map(column => ({
      ...column,
      data: Object.fromEntries(
        Object.entries(column.data).filter(([id]) => id !== articleId)
      )
    }));
    setColumns(updatedColumns);

    if (dataSource === 'group' && currentGroup) {
      // For groups: Update pagination and potentially navigate pages
      const newTotalResults = pagination.totalResults - 1;
      const newTotalPages = Math.ceil(newTotalResults / pagination.pageSize);

      // If we deleted the last article on this page and it's not page 1, go to previous page
      if (updatedCurrentPageArticles.length === 0 && pagination.currentPage > 1) {
        const newPage = pagination.currentPage - 1;
        setPagination(prev => ({
          ...prev,
          currentPage: newPage,
          totalResults: newTotalResults,
          totalPages: newTotalPages,
          hasNextPage: newPage < newTotalPages,
          hasPrevPage: newPage > 1
        }));
        // Reload the group at the new page
        handleLoadGroup(currentGroup.id, newPage);
      } else {
        // Just update pagination state and current articles
        setPagination(prev => ({
          ...prev,
          totalResults: newTotalResults,
          totalPages: newTotalPages,
          hasNextPage: prev.currentPage < newTotalPages,
          hasPrevPage: prev.currentPage > 1
        }));
        setArticles(updatedCurrentPageArticles);
      }
    } else {
      // For search results: Simple removal (no pagination update needed)
      setArticles(updatedCurrentPageArticles);
    }

    toast({
      title: 'Article Removed',
      description: currentGroup
        ? 'Article removed locally. Save to update the group permanently.'
        : 'Article has been removed from the results.',
    });
  };

  const handleAddMultipleColumns = async (columnsConfig: Record<string, { description: string; type: 'boolean' | 'text' | 'score'; options?: { min?: number; max?: number; step?: number } }>) => {
    if (articles.length === 0) {
      toast({
        title: 'No Articles',
        description: 'Please search for articles first.',
        variant: 'destructive',
      });
      return;
    }

    // IMPORTANT: Column extraction should work on ALL articles, not just current page
    // For groups, we need to get all articles from the group
    let allArticles = articles;
    if (dataSource === 'group' && currentGroup) {
      // Get all group articles for extraction
      const groupDetailResponse = await workbenchApi.getGroupDetail(currentGroup.id);
      allArticles = groupDetailResponse.group.articles.map(item => item.article);
    }

    setIsExtracting(true);

    try {
      const response = await workbenchApi.extractMultipleColumns({
        articles: workbenchApi.convertArticlesForExtraction(allArticles),
        columns_config: columnsConfig,
      });

      // Convert multi-column response to individual columns
      const newColumns: WorkbenchColumn[] = [];
      const updatedExtractedFeatures: Record<string, Record<string, string>> = {};

      for (const [columnName, config] of Object.entries(columnsConfig)) {
        const columnData: Record<string, string> = {};
        for (const [articleId, articleResults] of Object.entries(response.results)) {
          const value = articleResults[columnName] || (config.type === 'boolean' ? 'no' : 'error');
          columnData[articleId] = value;

          // Track features for article updates
          if (!updatedExtractedFeatures[articleId]) {
            updatedExtractedFeatures[articleId] = {};
          }
          updatedExtractedFeatures[articleId][columnName] = value;
        }

        newColumns.push({
          id: `col_${Date.now()}_${columnName}`,
          name: columnName,
          description: config.description,
          type: config.type,
          data: columnData,
          options: config.options,
        });
      }

      setColumns([...columns, ...newColumns]);

      // Update ALL articles with extracted features (including those not on current page)
      const updatedAllArticles = allArticles.map(article => ({
        ...article,
        extracted_features: {
          ...article.extracted_features,
          ...updatedExtractedFeatures[article.id]
        }
      }));

      // Update only the articles currently displayed on this page
      const updatedCurrentPageArticles = articles.map(article => ({
        ...article,
        extracted_features: {
          ...article.extracted_features,
          ...updatedExtractedFeatures[article.id]
        }
      }));
      setArticles(updatedCurrentPageArticles);

      // For groups, we should save the updated articles back to the group
      // This will be handled when the user saves the group

      toast({
        title: 'Extraction Complete',
        description: `Added ${newColumns.length} columns`,
      });
    } catch (error) {
      console.error('Multi-column extraction failed:', error);
      toast({
        title: 'Extraction Failed',
        description: 'Unable to extract column data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddColumn = async (name: string, description: string, type: 'boolean' | 'text' | 'score', options?: { min?: number; max?: number; step?: number }) => {
    if (articles.length === 0) {
      toast({
        title: 'No Articles',
        description: 'Please search for articles first.',
        variant: 'destructive',
      });
      return;
    }

    // Get all articles for extraction (not just current page)
    let allArticles = articles;
    if (dataSource === 'group' && currentGroup) {
      const groupDetailResponse = await workbenchApi.getGroupDetail(currentGroup.id);
      allArticles = groupDetailResponse.group.articles.map(item => item.article);
    }

    setIsExtracting(true);
    setShowAddModal(false);

    try {
      const response = await workbenchApi.extractColumn({
        articles: workbenchApi.convertArticlesForExtraction(allArticles),
        column_name: name,
        column_description: description,
        column_type: type,
        column_options: options,
      });

      const newColumn: WorkbenchColumn = {
        id: `col_${Date.now()}`,
        name,
        description,
        type,
        data: response.results,
        options,
      };

      setColumns([...columns, newColumn]);

      // Update only the articles currently displayed on this page
      const updatedCurrentPageArticles = articles.map(article => ({
        ...article,
        extracted_features: {
          ...article.extracted_features,
          [name]: response.results[article.id]
        }
      }));
      setArticles(updatedCurrentPageArticles);

      toast({
        title: 'Extraction Complete',
        description: `Added column "${name}"`,
      });
    } catch (error) {
      console.error('Column extraction failed:', error);
      toast({
        title: 'Extraction Failed',
        description: 'Unable to extract column data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExport = async () => {
    try {
      const filename = `workbench_export_${new Date().toISOString().split('T')[0]}.csv`;
      workbenchApi.exportAsCSV(articles, columns, filename);

      toast({
        title: 'Export Complete',
        description: 'CSV file downloaded successfully.',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to export data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveGroup = async (
    mode: 'new' | 'existing' | 'add',
    groupId?: string,
    name?: string,
    description?: string
  ) => {
    try {
      // Prepare column metadata
      const columnMetadata = columns.map(col => ({
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
          articles,
          columns: columnMetadata,
          search_query: searchParams.query,
          search_provider: searchParams.provider,
          search_params: searchParams
        });
      } else if (mode === 'existing' && groupId) {
        // Replace existing group
        response = await workbenchApi.saveWorkbenchState(groupId, {
          group_name: name || currentGroup?.name || 'Untitled',
          group_description: description,
          articles,
          columns: columnMetadata,
          search_query: searchParams.query,
          search_provider: searchParams.provider,
          search_params: searchParams
        });
      } else if (mode === 'add' && groupId) {
        // Add to existing group (merge mode)
        response = await workbenchApi.addArticlesToGroup(groupId, {
          articles
        });
      } else {
        throw new Error('Invalid save parameters');
      }

      toast({
        title: 'Success',
        description: response.message
      });

      // Load the saved group to update current state
      if (response.group_id) {
        const groupDetailResponse = await workbenchApi.getGroupDetail(response.group_id);
        const group = groupDetailResponse.group;
        setCurrentGroup({
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
        });
      }
    } catch (error) {
      console.error('Save group failed:', error);
      toast({
        title: 'Save Failed',
        description: 'Unable to save group. Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleLoadGroup = async (groupId: string, page = 1) => {
    try {
      setDataSource('group');

      // Load group data using the unified workbench API
      const groupDetailResponse = await workbenchApi.getGroupDetail(groupId);
      const groupDetail = {
        ...groupDetailResponse.group,
        articles: groupDetailResponse.group.articles.map(item => item.article),
        columns: groupDetailResponse.group.columns.map(col => ({
          id: `col_${col.name}`,
          name: col.name,
          description: col.description,
          type: col.type,
          data: {},
          options: col.options
        }))
      };

      // Calculate pagination for group
      const totalArticles = groupDetail.articles.length;
      const pageSize = pagination.pageSize;
      const totalPages = Math.ceil(totalArticles / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      // Get articles for current page
      const paginatedArticles = groupDetail.articles.slice(startIndex, endIndex);

      // Set paginated articles
      setArticles(paginatedArticles);

      // Set columns
      setColumns(groupDetail.columns);

      // Update pagination
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalResults: totalArticles,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }));

      // Set current group  
      setCurrentGroup({
        id: groupDetailResponse.group.id,
        user_id: groupDetailResponse.group.user_id || 0,
        name: groupDetailResponse.group.name,
        description: groupDetailResponse.group.description,
        search_query: groupDetailResponse.group.search_context?.query,
        search_provider: groupDetailResponse.group.search_context?.provider,
        search_params: groupDetailResponse.group.search_context?.parameters,
        columns: groupDetailResponse.group.columns,
        created_at: groupDetailResponse.group.created_at,
        updated_at: groupDetailResponse.group.updated_at,
        article_count: groupDetailResponse.group.article_count
      });

      // Update search params if available
      if (groupDetailResponse.group.search_context?.query) {
        setSearchParams(prev => ({
          ...prev,
          query: groupDetailResponse.group.search_context.query || prev.query,
          provider: groupDetailResponse.group.search_context.provider as SearchProvider || prev.provider
        }));
      }

      toast({
        title: 'Group Loaded',
        description: `Loaded "${groupDetail.name}" with ${totalArticles} articles (page ${page} of ${totalPages})`
      });
    } catch (error) {
      console.error('Load group failed:', error);
      toast({
        title: 'Load Failed',
        description: 'Unable to load group. Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workbench</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create custom research tables with AI-powered data extraction
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentGroup && (
              <Badge variant="outline" className="text-sm">
                <FolderOpen className="w-3 h-3 mr-1" />
                {currentGroup.name}
              </Badge>
            )}
            <Button
              onClick={() => setShowLoadModal(true)}
              variant="outline"
              size="sm"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Group
            </Button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
        <UnifiedSearchControls
          searchParams={searchParams}
          selectedProviders={selectedProviders}
          searchMode={searchMode}
          isSearching={isSearching}
          onSearchParamsChange={setSearchParams}
          onSelectedProvidersChange={setSelectedProviders}
          onSearchModeChange={setSearchMode}
          onSearch={() => handleSearch(1)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {articles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">No articles yet</p>
              <p className="text-sm">Search for articles above or load a saved group</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
              <WorkbenchTable
                articles={articles}
                columns={columns}
                onAddColumn={() => setShowAddModal(true)}
                onDeleteColumn={handleDeleteColumn}
                onDeleteArticle={handleDeleteArticle}
                onExport={handleExport}
                isExtracting={isExtracting}
                onViewArticle={setSelectedArticle}
                onSaveGroup={() => setShowSaveModal(true)}
                onLoadGroup={() => setShowLoadModal(true)}
                currentGroup={currentGroup}
                displayDateType="publication"
              />
            </div>
            {pagination.totalPages > 1 && (
              <div className="border-t dark:border-gray-700">
                <div className="p-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  {dataSource === 'search' ? 'Search Results' : `Group: ${currentGroup?.name}`}
                </div>
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  totalResults={pagination.totalResults}
                  pageSize={pagination.pageSize}
                  disabled={isSearching}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isExtracting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-gray-900 dark:text-gray-100">Extracting column data...</span>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddModal && (
        <AddColumnModal
          onAdd={handleAddColumn}
          onAddMultiple={handleAddMultipleColumns}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Article Workbench Modal */}
      {selectedArticle && (
        <ArticleWorkbenchModal
          article={selectedArticle}
          currentGroup={currentGroup}
          onClose={() => setSelectedArticle(null)}
          onSendChatMessage={async (message, article, conversationHistory, onChunk, onComplete, onError) => {
            // Use the streaming article chat API
            await articleChatApi.sendMessageStream(
              message,
              article,
              conversationHistory as Array<{ role: 'user' | 'assistant'; content: string }>,
              onChunk,
              onComplete,
              onError
            );
          }}
          onFeatureAdded={(feature) => {
            // When a feature is added from the workbench, add it as a new column
            const newColumn: WorkbenchColumn = {
              id: `feature_${Date.now()}`,
              name: feature.name,
              description: `Extracted feature: ${feature.name}`,
              type: feature.type,
              data: { [selectedArticle.id]: feature.value },
              options: feature.type === 'score' ? { min: 1, max: 10 } : undefined
            };
            setColumns(prev => [...prev, newColumn]);
            toast({
              title: 'Feature Added',
              description: `"${feature.name}" has been added as a new column.`,
            });
          }}
          onArticleUpdated={(updatedArticle) => {
            // Update the article in the local state
            setArticles(prev => prev.map(article =>
              article.id === updatedArticle.id ? updatedArticle : article
            ));
          }}
        />
      )}

      {/* Save Group Modal */}
      {showSaveModal && (
        <SaveGroupModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSaveGroup}
          articleCount={articles.length}
          columnCount={columns.length}
        />
      )}

      {/* Load Group Modal */}
      {showLoadModal && (
        <LoadGroupModal
          isOpen={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          onLoad={handleLoadGroup}
          currentGroupId={currentGroup?.id}
        />
      )}
    </div>
  );
}
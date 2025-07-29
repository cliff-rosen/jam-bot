import { useState, useEffect } from 'react';
import { Loader2, FolderOpen, Cloud, CloudOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Pagination } from '@/components/ui/pagination';

import { articleChatApi } from '@/lib/api/articleChatApi';
import { useWorkbench } from '@/context/WorkbenchContext';

import { WorkbenchColumn } from '@/types/workbench';
import { SearchProvider } from '@/types/unifiedSearch';

import { UnifiedSearchControls } from './search/UnifiedSearchControls';
import { WorkbenchTable } from './WorkbenchTable';
import { AddColumnModal } from './AddColumnModal';
import { ArticleWorkbenchModal } from './ArticleWorkbenchModal';
import { SaveGroupModal } from './SaveGroupModal';
import { LoadGroupModal } from './LoadGroupModal';

export function WorkbenchPage() {
  const workbench = useWorkbench();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  const { toast } = useToast();

  // Initialize search params from workbench context if available
  useEffect(() => {
    if (workbench.searchContext) {
      workbench.updateSearchParams({
        query: workbench.searchContext.query,
        provider: workbench.searchContext.provider as SearchProvider
      });
    }
  }, [workbench.searchContext]);

  const handleNewSearch = async () => {
    try {
      await workbench.performNewSearch();
      toast({
        title: 'Search Complete',
        description: `Found ${workbench.pagination.totalResults.toLocaleString()} total results, showing page 1 of ${workbench.pagination.totalPages}`,
      });
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Search Failed',
        description: 'Unable to search articles. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePageChange = (page: number) => {
    if (workbench.source === 'search' || workbench.source === 'modified') {
      handleSearchPagination(page);
    } else if (workbench.source === 'group' && workbench.sourceGroup) {
      handleLoadGroup(workbench.sourceGroup.id, page);
    }
  };

  const handleSearchPagination = async (page: number) => {
    try {
      await workbench.performSearchPagination(page);
      toast({
        title: 'Page Changed',
        description: `Showing page ${page} of ${workbench.pagination.totalPages}`,
      });
    } catch (error) {
      console.error('Search pagination failed:', error);
      toast({
        title: 'Page Change Failed',
        description: 'Unable to change page. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    workbench.removeColumn(columnId);

    toast({
      title: 'Column Deleted',
      description: 'Column has been removed from the table.',
    });
  };

  const handleDeleteArticle = async (articleId: string) => {
    workbench.removeArticle(articleId);

    // Handle pagination updates for groups
    if (workbench.source === 'group' && workbench.sourceGroup) {
      const newTotalResults = workbench.pagination.totalResults - 1;
      const newTotalPages = Math.ceil(newTotalResults / workbench.pagination.pageSize);
      const currentPageArticles = workbench.articles.filter(article => article.id !== articleId);

      // If we deleted the last article on this page and it's not page 1, go to previous page
      if (currentPageArticles.length === 0 && workbench.pagination.currentPage > 1) {
        const newPage = workbench.pagination.currentPage - 1;
        workbench.updatePagination({
          currentPage: newPage,
          totalResults: newTotalResults,
          totalPages: newTotalPages,
          hasNextPage: newPage < newTotalPages,
          hasPrevPage: newPage > 1
        });
        // Reload the group at the new page
        handleLoadGroup(workbench.sourceGroup.id, newPage);
      } else {
        // Just update pagination state
        workbench.updatePagination({
          totalResults: newTotalResults,
          totalPages: newTotalPages,
          hasNextPage: workbench.pagination.currentPage < newTotalPages,
          hasPrevPage: workbench.pagination.currentPage > 1
        });
      }
    }

    toast({
      title: 'Article Removed',
      description: workbench.source === 'group' && workbench.hasModifications
        ? 'Article removed locally. Save to update the group permanently.'
        : 'Article has been removed.',
    });
  };

  const handleAddMultipleColumns = async (columnsConfig: Record<string, { description: string; type: 'boolean' | 'text' | 'score'; options?: { min?: number; max?: number; step?: number } }>) => {
    try {
      await workbench.extractMultipleColumns(columnsConfig);
      toast({
        title: 'Extraction Complete',
        description: `Added ${Object.keys(columnsConfig).length} columns`,
      });
    } catch (error) {
      console.error('Multi-column extraction failed:', error);
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Unable to extract column data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddColumn = async (name: string, description: string, type: 'boolean' | 'text' | 'score', options?: { min?: number; max?: number; step?: number }) => {
    setShowAddModal(false);

    try {
      await workbench.extractSingleColumn(name, description, type, options);
      toast({
        title: 'Extraction Complete',
        description: `Added column "${name}"`,
      });
    } catch (error) {
      console.error('Column extraction failed:', error);
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Unable to extract column data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    try {
      await workbench.exportWorkbenchData();
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
      const response = await workbench.saveWorkbenchGroup(mode, groupId, name, description);
      toast({
        title: 'Success',
        description: response.message
      });
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
      await workbench.loadWorkbenchGroup(groupId, page);
      toast({
        title: 'Group Loaded',
        description: `Loaded "${workbench.sourceGroup?.name}" with ${workbench.pagination.totalResults} articles (page ${page} of ${workbench.pagination.totalPages})`
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

  const handleResetAll = () => {
    workbench.clearWorkbench();
    toast({
      title: 'Workbench Reset',
      description: 'All data and search parameters have been cleared.'
    });
  };

  const handleClearResults = () => {
    workbench.clearResults();
    toast({
      title: 'Results Cleared',
      description: 'Articles and columns cleared. Search parameters preserved.'
    });
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
            {workbench.sourceGroup && (
              <Badge variant="outline" className="text-sm">
                <FolderOpen className="w-3 h-3 mr-1" />
                {workbench.sourceGroup.name}
              </Badge>
            )}
            {workbench.source !== 'group' && workbench.articles.length > 0 && (
              <Badge variant="outline" className="text-sm bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CloudOff className="w-3 h-3 mr-1" />
                Working Data
                {workbench.hasModifications && <span className="ml-1">*</span>}
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
            <Button
              onClick={handleResetAll}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
        <UnifiedSearchControls
          searchParams={workbench.currentSearchParams}
          selectedProviders={workbench.selectedProviders}
          searchMode={workbench.searchMode}
          isSearching={workbench.isSearching}
          onSearchParamsChange={workbench.updateSearchParams}
          onSelectedProvidersChange={workbench.updateSelectedProviders}
          onSearchModeChange={workbench.updateSearchMode}
          onSearch={handleNewSearch}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {workbench.articles.length === 0 ? (
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
                articles={workbench.articles}
                columns={workbench.columns}
                onAddColumn={() => setShowAddModal(true)}
                onDeleteColumn={handleDeleteColumn}
                onDeleteArticle={handleDeleteArticle}
                onExport={handleExport}
                onClearResults={handleClearResults}
                isExtracting={workbench.isExtracting}
                onViewArticle={workbench.setSelectedArticle}
                onSaveGroup={() => setShowSaveModal(true)}
                onLoadGroup={() => setShowLoadModal(true)}
                currentGroup={workbench.sourceGroup}
                displayDateType="publication"
              />
            </div>
            {workbench.pagination.totalPages > 1 && (
              <div className="border-t dark:border-gray-700">
                <div className="p-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  {workbench.source === 'search' ? 'Search Results' :
                    workbench.source === 'modified' ? 'Modified Data' :
                      `Group: ${workbench.sourceGroup?.name}`}
                </div>
                <Pagination
                  currentPage={workbench.pagination.currentPage}
                  totalPages={workbench.pagination.totalPages}
                  onPageChange={handlePageChange}
                  totalResults={workbench.pagination.totalResults}
                  pageSize={workbench.pagination.pageSize}
                  disabled={workbench.isSearching}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {workbench.isExtracting && (
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
      {workbench.selectedArticle && (
        <ArticleWorkbenchModal
          article={workbench.selectedArticle}
          currentGroup={workbench.sourceGroup}
          onClose={() => workbench.setSelectedArticle(null)}
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
              data: { [workbench.selectedArticle.id]: feature.value },
              options: feature.type === 'score' ? { min: 1, max: 10 } : undefined
            };
            workbench.addColumn(newColumn);
            toast({
              title: 'Feature Added',
              description: `"${feature.name}" has been added as a new column.`,
            });
          }}
          onArticleUpdated={(updatedArticle) => {
            // This will be handled by the workbench context automatically
            // since the article objects are references
          }}
        />
      )}

      {/* Save Group Modal */}
      {showSaveModal && (
        <SaveGroupModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSaveGroup}
          articleCount={workbench.articles.length}
          columnCount={workbench.columns.length}
        />
      )}

      {/* Load Group Modal */}
      {showLoadModal && (
        <LoadGroupModal
          isOpen={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          onLoad={handleLoadGroup}
          currentGroupId={workbench.sourceGroup?.id}
        />
      )}
    </div>
  );
}
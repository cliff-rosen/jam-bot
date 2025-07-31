import { useState, useEffect } from 'react';
import { Loader2, FolderOpen, Cloud, CloudOff, RotateCcw, Search, Folder } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';

import { useWorkbench } from '@/context/WorkbenchContext';

import { CollectionSource } from '@/types/articleCollection';
import { SearchProvider } from '@/types/unifiedSearch';

import { UnifiedSearchControls } from './search/UnifiedSearchControls';
import { WorkbenchTable } from './WorkbenchTable';
import { AddFeatureModal } from './AddFeatureModal';
import { ArticleWorkbenchModal } from './ArticleWorkbenchModal';
import { SaveGroupModal } from './SaveGroupModal';
import { LoadGroupModal } from './LoadGroupModal';
import { AddToGroupModal } from './AddToGroupModal';
import { ExtractionAnimation } from './ExtractionAnimation';
import { PaginationControls } from './PaginationControls';
import { CollectionHeader } from './CollectionHeader';

export function WorkbenchPage() {
  const workbench = useWorkbench();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [existingGroups, setExistingGroups] = useState<Array<{ id: string; name: string; description?: string; articleCount: number }>>([]);

  // Selection state
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);

  // Clear selection when collection changes
  useEffect(() => {
    setSelectedArticleIds([]);
  }, [workbench.currentCollection?.id]);

  const { toast } = useToast();

  const handleNewSearch = async (page: number = 1) => {
    if (!workbench.searchQuery.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }

    try {
      await workbench.performSearch(page);

      if (page === 1) {
        // Use a small delay to ensure pagination is updated, or use current collection count
        setTimeout(() => {
          const totalResults = workbench.searchPagination?.totalResults || workbench.currentCollection?.articles.length || 0;
          toast({
            title: 'Search Complete',
            description: `Found ${totalResults} articles`,
          });
        }, 100);
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleLoadGroup = async (groupId: string) => {
    try {
      await workbench.loadGroup(groupId);
      setShowLoadModal(false);
      toast({
        title: 'Group Loaded',
        description: `Loaded "${workbench.currentCollection?.name}" with ${workbench.currentCollection?.articles.length || 0} articles`,
      });
    } catch (error) {
      console.error('Load group failed:', error);
      toast({
        title: 'Load Failed',
        description: error instanceof Error ? error.message : 'Failed to load group',
        variant: 'destructive'
      });
    }
  };

  const handleSaveGroup = async (name: string, description?: string) => {
    try {
      await workbench.saveCollection(name, description);
      setShowSaveModal(false);
      toast({
        title: 'Group Saved',
        description: `Saved as "${name}"`,
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save group',
        variant: 'destructive'
      });
    }
  };

  const handleAddToGroup = async (groupId: string) => {
    try {
      await workbench.addToExistingGroup(groupId);
      setShowSaveModal(false);
      toast({
        title: 'Added to Group',
        description: 'Articles added to existing group successfully',
      });
    } catch (error) {
      console.error('Add to group failed:', error);
      toast({
        title: 'Add Failed',
        description: error instanceof Error ? error.message : 'Failed to add to group',
        variant: 'destructive'
      });
    }
  };

  const loadExistingGroups = async () => {
    try {
      const response = await workbench.loadGroupList();
      setExistingGroups(response.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        articleCount: group.article_count || 0
      })));
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  // Selection handlers
  const handleToggleArticleSelection = (articleId: string) => {
    setSelectedArticleIds(prev =>
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const handleSelectAll = () => {
    if (workbench.currentCollection) {
      const currentPageArticleIds = workbench.currentCollection.articles.map(item => item.article.id);
      setSelectedArticleIds(prev => {
        const newSelection = [...prev];
        currentPageArticleIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleSelectNone = () => {
    setSelectedArticleIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedArticleIds.length === 0) return;

    try {
      await workbench.removeArticles(selectedArticleIds);
      setSelectedArticleIds([]);
      toast({
        title: 'Articles Removed',
        description: `Removed ${selectedArticleIds.length} articles from the group`,
      });
    } catch (error) {
      console.error('Delete selected failed:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete articles',
        variant: 'destructive'
      });
    }
  };

  const handleAddSelectedToGroup = () => {
    setShowAddToGroupModal(true);
  };

  const handleAddToGroupAction = async (groupId: string, navigateToGroup: boolean) => {
    if (!workbench.currentCollection) return;

    try {
      // Get articles to add (selected or all visible)
      const articlesToAdd = selectedArticleIds.length > 0 
        ? workbench.currentCollection.articles.filter(item => selectedArticleIds.includes(item.article.id))
        : workbench.currentCollection.articles;

      const articleIds = articlesToAdd.map(item => item.article.id);

      // Always add articles to the group first
      await workbench.addToExistingGroup(groupId, articleIds);

      // Clear selection after successful addition
      setSelectedArticleIds([]);

      if (navigateToGroup) {
        // Navigate to the group and show navigation success message
        await workbench.loadGroup(groupId);
        
        toast({
          title: 'Switched to Group',
          description: `Added ${articlesToAdd.length} articles and switched to the group`,
        });
      } else {
        // Stay here and show add success message
        toast({
          title: 'Added to Group',
          description: `Added ${articlesToAdd.length} articles to the group`,
        });
      }

    } catch (error) {
      console.error('Add to group failed:', error);
      throw error; // Re-throw so modal can handle the error
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Research Workbench</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Search, analyze, and organize research articles with AI-powered insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowLoadModal(true)}
            variant="outline"
            size="sm"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load Group
          </Button>

          <Button
            onClick={() => workbench.resetWorkbench()}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-card rounded-lg border p-6">
        <UnifiedSearchControls
          query={workbench.searchQuery}
          onQueryChange={workbench.updateSearchQuery}
          selectedProviders={workbench.selectedProviders}
          onProvidersChange={workbench.updateSelectedProviders}
          searchMode={workbench.searchMode}
          onSearchModeChange={workbench.updateSearchMode}
          onSearch={() => handleNewSearch(1)}
          isSearching={workbench.collectionLoading}
          pageSize={workbench.searchParams.pageSize}
          onPageSizeChange={(pageSize) => workbench.updateSearchParams({ pageSize })}
          sortBy={workbench.searchParams.sortBy}
          onSortByChange={(sortBy) => workbench.updateSearchParams({ sortBy })}
          yearLow={workbench.searchParams.yearLow}
          onYearLowChange={(yearLow) => workbench.updateSearchParams({ yearLow })}
          yearHigh={workbench.searchParams.yearHigh}
          onYearHighChange={(yearHigh) => workbench.updateSearchParams({ yearHigh })}
          dateType={workbench.searchParams.dateType}
          onDateTypeChange={(dateType) => workbench.updateSearchParams({ dateType })}
          includeCitations={workbench.searchParams.includeCitations}
          onIncludeCitationsChange={(includeCitations) => workbench.updateSearchParams({ includeCitations })}
          includePdfLinks={workbench.searchParams.includePdfLinks}
          onIncludePdfLinksChange={(includePdfLinks) => workbench.updateSearchParams({ includePdfLinks })}
        />
      </div>

      {/* Error Display */}
      {workbench.error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-destructive">{workbench.error}</p>
            <Button
              onClick={workbench.clearError}
              variant="ghost"
              size="sm"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {workbench.currentCollection ? (
        <div className="space-y-4">
          {/* Collection Header with Branding and Actions */}
          <CollectionHeader
            collection={workbench.currentCollection}
            searchPagination={workbench.searchPagination}
            selectedArticleIds={selectedArticleIds}
            onLoadGroup={() => setShowLoadModal(true)}
            onAddFeatures={() => setShowAddModal(true)}
            onExtractFeatures={() => workbench.extractFeatures()}
            onSaveChanges={() => workbench.saveCollectionChanges()}
            onSaveAsGroup={() => setShowSaveModal(true)}
            onAddToGroup={handleAddSelectedToGroup}
            onDeleteSelected={handleDeleteSelected}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
            isExtracting={workbench.isExtracting}
            isLoading={workbench.collectionLoading}
          />

          {/* Table */}
          <WorkbenchTable
            collection={workbench.currentCollection}
            selectedArticleIds={selectedArticleIds}
            onDeleteFeature={(featureId) => workbench.removeFeatureDefinition(featureId)}
            onViewArticle={(article) => workbench.selectArticle(article)}
            onToggleArticleSelection={handleToggleArticleSelection}
            isExtracting={workbench.isExtracting}
          />

          {/* Pagination Controls - only show for search results */}
          {workbench.currentCollection.source === CollectionSource.SEARCH && workbench.searchPagination && (
            <PaginationControls
              currentPage={workbench.searchPagination.currentPage}
              totalPages={workbench.searchPagination.totalPages}
              totalResults={workbench.searchPagination.totalResults}
              pageSize={workbench.searchPagination.pageSize}
              onPageChange={(page) => handleNewSearch(page)}
              isLoading={workbench.collectionLoading}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Start by searching for articles or loading a saved group
          </p>
        </div>
      )}

      {/* Loading State */}
      {workbench.collectionLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 text-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-foreground" />
            <span>Loading...</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddFeatureModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={async (features, extractImmediately) => {
          if (extractImmediately) {
            await workbench.addFeatureDefinitionsAndExtract(features);
          } else {
            workbench.addFeatureDefinitions(features);
          }
        }}
      />

      <SaveGroupModal
        open={showSaveModal}
        onOpenChange={(open) => {
          if (open && existingGroups.length === 0) {
            loadExistingGroups();
          }
          setShowSaveModal(open);
        }}
        onSave={handleSaveGroup}
        onUpdateExisting={async () => {
          try {
            await workbench.saveCollectionChanges();
            setShowSaveModal(false);
            toast({
              title: 'Group Updated',
              description: `Updated "${workbench.currentCollection?.name}" successfully`,
            });
          } catch (error) {
            console.error('Update failed:', error);
            toast({
              title: 'Update Failed',
              description: error instanceof Error ? error.message : 'Failed to update group',
              variant: 'destructive'
            });
          }
        }}
        onAddToGroup={handleAddToGroup}
        defaultName={workbench.currentCollection?.name}
        existingGroups={existingGroups}
        collectionSource={workbench.currentCollection?.source === CollectionSource.SEARCH ? 'search' : 'saved_group'}
        isModified={workbench.currentCollection?.is_modified || false}
        currentGroupName={workbench.currentCollection?.name}
        canUpdateExisting={workbench.currentCollection?.source === CollectionSource.SAVED_GROUP && workbench.currentCollection?.saved_group_id != null}
      />

      <LoadGroupModal
        open={showLoadModal}
        onOpenChange={setShowLoadModal}
        onLoad={handleLoadGroup}
      />

      <AddToGroupModal
        open={showAddToGroupModal}
        onOpenChange={setShowAddToGroupModal}
        onAddToGroup={handleAddToGroupAction}
        articlesToAdd={
          workbench.currentCollection 
            ? (selectedArticleIds.length > 0 
                ? workbench.currentCollection.articles
                    .filter(item => selectedArticleIds.includes(item.article.id))
                    .map(item => ({ id: item.article.id, title: item.article.title }))
                : workbench.currentCollection.articles
                    .map(item => ({ id: item.article.id, title: item.article.title }))
              )
            : []
        }
        sourceCollectionName={workbench.currentCollection?.name || ''}
      />

      {workbench.selectedArticle && (
        <ArticleWorkbenchModal
          article={workbench.selectedArticle}
          collection={workbench.currentCollection}
          onClose={() => workbench.selectArticle(null)}
        />
      )}

      {/* Extraction Animation Overlay */}
      <ExtractionAnimation
        isVisible={workbench.isExtracting}
        featuresCount={workbench.currentCollection?.feature_definitions.length || 0}
        articlesCount={workbench.currentCollection?.articles.length || 0}
      />
    </div>
  );
}
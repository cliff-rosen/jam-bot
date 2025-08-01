import { useState, useEffect } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';

import { useWorkbench } from '@/context/WorkbenchContext';

import { CollectionSource } from '@/types/articleCollection';

import { TabbedWorkbenchInterface } from './TabbedWorkbenchInterface';
import { SearchTab } from './SearchTab';
import { GroupsTab } from './GroupsTab';
import { WorkbenchTable } from './WorkbenchTable';
import { AddFeatureModal } from './AddFeatureModal';
import { ArticleWorkbenchModal } from './ArticleWorkbenchModal';
import { SaveGroupModal } from './SaveGroupModal';
import { AddToGroupModal } from './AddToGroupModal';
import { ExtractionAnimation } from './ExtractionAnimation';
import { PaginationControls } from './PaginationControls';
import { CollectionHeader } from './CollectionHeader';

export function WorkbenchPage() {
  const workbench = useWorkbench();

  // Tab state
  const [activeTab, setActiveTab] = useState<'search' | 'groups'>('search');
  
  // Groups state - persist across tab switches
  const [groupsData, setGroupsData] = useState<Array<{ id: string; name: string; description?: string; article_count: number; updated_at: string; feature_definitions?: any[] }>>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [existingGroups, setExistingGroups] = useState<Array<{ id: string; name: string; description?: string; articleCount: number }>>([]);

  // Selection state
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);

  // Clear selection when collection changes
  useEffect(() => {
    setSelectedArticleIds([]);
  }, [workbench.searchCollection?.id, workbench.groupCollection?.id]);

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

      // Don't switch tabs automatically - let users navigate manually

      if (page === 1) {
        // Use a small delay to ensure pagination is updated, or use current collection count
        setTimeout(() => {
          const totalResults = workbench.searchPagination?.totalResults || workbench.searchCollection?.articles.length || 0;
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

  const handleLoadGroup = async (groupId: string, page: number = 1) => {
    try {
      await workbench.loadGroup(groupId, page);

      // Don't switch tabs automatically - let users navigate manually
      const totalArticles = workbench.groupPagination?.totalResults || workbench.groupCollection?.article_count || 0;
      if (page === 1) {
        toast({
          title: 'Group Loaded',
          description: `Loaded "${workbench.groupCollection?.name}" (${totalArticles} articles total)`,
        });
      }
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

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    try {
      await workbench.deleteGroupById(groupId);
      // Refresh groups data after deletion
      await loadGroupsData(true);
      toast({
        title: 'Group Deleted',
        description: `Deleted "${groupName}" successfully`,
      });
    } catch (error) {
      console.error('Delete group failed:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete group',
        variant: 'destructive'
      });
      throw error; // Re-throw so the GroupsTab can handle it
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
  
  const loadGroupsData = async (force = false) => {
    if (!force && groupsLoaded) return;
    
    setGroupsLoading(true);
    try {
      const response = await workbench.loadGroupList();
      setGroupsData(response);
      setGroupsLoaded(true);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setGroupsLoading(false);
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
    const currentCollection = activeTab === 'search' ? workbench.searchCollection : workbench.groupCollection;
    if (currentCollection) {
      const currentPageArticleIds = currentCollection.articles.map(item => item.article.id);
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
      const collectionType = activeTab === 'search' ? 'search' : 'group';
      await workbench.removeArticles(selectedArticleIds, collectionType);
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
    const currentCollection = activeTab === 'search' ? workbench.searchCollection : workbench.groupCollection;
    if (!currentCollection) return;

    try {
      // Get articles to add (selected or all visible)
      const articlesToAdd = selectedArticleIds.length > 0
        ? currentCollection.articles.filter(item => selectedArticleIds.includes(item.article.id))
        : currentCollection.articles;

      const articleIds = articlesToAdd.map(item => item.article.id);

      // Always add articles to the group first
      const collectionType = activeTab === 'search' ? 'search' : 'group';
      await workbench.addToExistingGroup(groupId, articleIds, collectionType);

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
            onClick={() => workbench.resetWorkbench()}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Tabbed Interface - Always visible */}
      <TabbedWorkbenchInterface
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchContent={
          <div className="space-y-4">
            {/* Search Controls */}
            <SearchTab onNewSearch={handleNewSearch} />

            {/* Group Controls - only show for saved groups */}
            {workbench.searchCollection && workbench.searchCollection.source === CollectionSource.SAVED_GROUP && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Group View Settings</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Articles per page:</label>
                      <select
                        value={workbench.groupParams.pageSize}
                        onChange={(e) => workbench.updateGroupParams({ pageSize: parseInt(e.target.value) })}
                        className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1 text-sm rounded-md"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Section - show when we have a search collection */}
            {workbench.searchCollection && (
              <div className="space-y-4">
                {/* Collection Header with Branding and Actions */}
                <CollectionHeader
                  collection={workbench.searchCollection}
                  searchPagination={workbench.searchPagination}
                  groupPagination={workbench.groupPagination}
                  selectedArticleIds={selectedArticleIds}
                  onLoadGroup={() => setActiveTab('groups')}
                  onAddFeatures={() => setShowAddModal(true)}
                  onExtractFeatures={() => workbench.extractFeatures(undefined, 'search')}
                  onSaveChanges={() => workbench.saveCollectionChanges('search')}
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
                  collection={workbench.searchCollection}
                  selectedArticleIds={selectedArticleIds}
                  onDeleteFeature={(featureId) => workbench.removeFeatureDefinition(featureId, 'search')}
                  onViewArticle={(article) => workbench.selectArticle(article)}
                  onToggleArticleSelection={handleToggleArticleSelection}
                  isExtracting={workbench.isExtracting}
                />

                {/* Pagination Controls */}
                {workbench.searchCollection.source === CollectionSource.SEARCH && workbench.searchPagination && (
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
            )}
          </div>
        }
        groupsContent={
          <div className="space-y-4">
            <GroupsTab 
              onLoadGroup={handleLoadGroup} 
              onDeleteGroup={handleDeleteGroup}
              groupsData={groupsData}
              groupsLoading={groupsLoading}
              onLoadGroupsData={loadGroupsData}
            />

            {/* Results Section - show when we have a group collection */}
            {workbench.groupCollection && (
              <div className="space-y-4">
                {/* Collection Header with Branding and Actions */}
                <CollectionHeader
                  collection={workbench.groupCollection}
                  searchPagination={workbench.searchPagination}
                  groupPagination={workbench.groupPagination}
                  selectedArticleIds={selectedArticleIds}
                  onLoadGroup={() => { }} // Groups tab doesn't need this
                  onAddFeatures={() => setShowAddModal(true)}
                  onExtractFeatures={() => workbench.extractFeatures(undefined, 'group')}
                  onSaveChanges={() => workbench.saveCollectionChanges('group')}
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
                  collection={workbench.groupCollection}
                  selectedArticleIds={selectedArticleIds}
                  onDeleteFeature={(featureId) => workbench.removeFeatureDefinition(featureId, 'group')}
                  onViewArticle={(article) => workbench.selectArticle(article)}
                  onToggleArticleSelection={handleToggleArticleSelection}
                  isExtracting={workbench.isExtracting}
                />

                {/* Pagination Controls */}
                {workbench.groupCollection.source === CollectionSource.SAVED_GROUP && workbench.groupPagination && (
                  <PaginationControls
                    currentPage={workbench.groupPagination.currentPage}
                    totalPages={workbench.groupPagination.totalPages}
                    totalResults={workbench.groupPagination.totalResults}
                    pageSize={workbench.groupPagination.pageSize}
                    onPageChange={(page) => handleLoadGroup(workbench.groupCollection?.saved_group_id || '', page)}
                    isLoading={workbench.collectionLoading}
                  />
                )}
              </div>
            )}
          </div>
        }
      />

      {/* Error Display */}
      {workbench.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800 dark:text-red-200">{workbench.error}</p>
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
            const collectionType = activeTab === 'search' ? 'search' : 'group';
            await workbench.saveCollectionChanges(collectionType);
            const currentCollection = activeTab === 'search' ? workbench.searchCollection : workbench.groupCollection;
            setShowSaveModal(false);
            toast({
              title: 'Group Updated',
              description: `Updated "${currentCollection?.name}" successfully`,
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
        defaultName={workbench.searchCollection?.name}
        existingGroups={existingGroups}
        collectionSource={workbench.searchCollection?.source === CollectionSource.SEARCH ? 'search' : 'saved_group'}
        isModified={workbench.searchCollection?.is_modified || false}
        currentGroupName={workbench.searchCollection?.name}
        canUpdateExisting={workbench.searchCollection?.source === CollectionSource.SAVED_GROUP && workbench.searchCollection?.saved_group_id != null}
      />


      <AddToGroupModal
        open={showAddToGroupModal}
        onOpenChange={setShowAddToGroupModal}
        onAddToGroup={handleAddToGroupAction}
        articlesToAdd={
          workbench.searchCollection
            ? (selectedArticleIds.length > 0
              ? workbench.searchCollection.articles
                .filter(item => selectedArticleIds.includes(item.article.id))
                .map(item => ({ id: item.article.id, title: item.article.title }))
              : workbench.searchCollection.articles
                .map(item => ({ id: item.article.id, title: item.article.title }))
            )
            : []
        }
        sourceCollectionName={workbench.searchCollection?.name || ''}
        currentGroupId={workbench.searchCollection?.saved_group_id}
      />

      {workbench.selectedArticle && (
        <ArticleWorkbenchModal
          article={workbench.selectedArticle}
          collection={workbench.searchCollection}
          onClose={() => workbench.selectArticle(null)}
        />
      )}

      {/* Extraction Animation Overlay */}
      <ExtractionAnimation
        isVisible={workbench.isExtracting}
        featuresCount={workbench.searchCollection?.feature_definitions.length || 0}
        articlesCount={workbench.searchCollection?.articles.length || 0}
      />
    </div>
  );
}
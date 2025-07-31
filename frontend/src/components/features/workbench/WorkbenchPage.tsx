import { useState, useEffect } from 'react';
import { Loader2, FolderOpen, Cloud, CloudOff, RotateCcw, Search, Folder } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useWorkbench } from '@/context/WorkbenchContext';

import { CollectionSource } from '@/types/articleCollection';
import { SearchProvider } from '@/types/unifiedSearch';

import { UnifiedSearchControls } from './search/UnifiedSearchControls';
import { WorkbenchTable } from './WorkbenchTable';
import { AddFeatureModal } from './AddFeatureModal';
import { ArticleWorkbenchModal } from './ArticleWorkbenchModal';
import { SaveGroupModal } from './SaveGroupModal';
import { LoadGroupModal } from './LoadGroupModal';
import { ExtractionAnimation } from './ExtractionAnimation';
import { PaginationControls } from './PaginationControls';
import { CollectionHeader } from './CollectionHeader';

export function WorkbenchPage() {
  const workbench = useWorkbench();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [existingGroups, setExistingGroups] = useState<Array<{ id: string; name: string; description?: string; articleCount: number }>>([]);

  // Local search state for the search controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<SearchProvider[]>(['pubmed']);
  const [searchMode, setSearchMode] = useState<'single' | 'multi'>('single');
  const [searchParams, setSearchParams] = useState({
    pageSize: 20,
    sortBy: 'relevance' as 'relevance' | 'date',
    yearLow: undefined as number | undefined,
    yearHigh: undefined as number | undefined,
    dateType: 'publication' as 'completion' | 'publication' | 'entry' | 'revised',
    includeCitations: false,
    includePdfLinks: false
  });

  const { toast } = useToast();

  const handleNewSearch = async (page: number = 1) => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }

    try {
      await workbench.performSearch(searchQuery, {
        query: searchQuery,
        filters: {},
        page: page,
        page_size: searchParams.pageSize,
        provider: selectedProviders[0], // Use first selected provider
        sort_by: searchParams.sortBy,
        year_low: searchParams.yearLow,
        year_high: searchParams.yearHigh,
        date_type: searchParams.dateType,
        include_citations: searchParams.includeCitations,
        include_pdf_links: searchParams.includePdfLinks
      });

      if (page === 1) {
        toast({
          title: 'Search Complete',
          description: `Found ${workbench.searchPagination?.totalResults || 0} articles`,
        });
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


  const canSave = workbench.currentCollection &&
    (workbench.currentCollection.source === CollectionSource.SEARCH ||
      (workbench.currentCollection.source === CollectionSource.SAVED_GROUP && workbench.currentCollection.is_modified));

  const canSaveChanges = workbench.currentCollection?.source === CollectionSource.SAVED_GROUP &&
    workbench.currentCollection.is_modified;

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
          query={searchQuery}
          onQueryChange={setSearchQuery}
          selectedProviders={selectedProviders}
          onProvidersChange={setSelectedProviders}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          onSearch={() => handleNewSearch(1)}
          isSearching={workbench.collectionLoading}
          pageSize={searchParams.pageSize}
          onPageSizeChange={(pageSize) => setSearchParams(prev => ({ ...prev, pageSize }))}
          sortBy={searchParams.sortBy}
          onSortByChange={(sortBy) => setSearchParams(prev => ({ ...prev, sortBy }))}
          yearLow={searchParams.yearLow}
          onYearLowChange={(yearLow) => setSearchParams(prev => ({ ...prev, yearLow }))}
          yearHigh={searchParams.yearHigh}
          onYearHighChange={(yearHigh) => setSearchParams(prev => ({ ...prev, yearHigh }))}
          dateType={searchParams.dateType}
          onDateTypeChange={(dateType) => setSearchParams(prev => ({ ...prev, dateType }))}
          includeCitations={searchParams.includeCitations}
          onIncludeCitationsChange={(includeCitations) => setSearchParams(prev => ({ ...prev, includeCitations }))}
          includePdfLinks={searchParams.includePdfLinks}
          onIncludePdfLinksChange={(includePdfLinks) => setSearchParams(prev => ({ ...prev, includePdfLinks }))}
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
            onLoadGroup={() => setShowLoadModal(true)}
            onAddFeatures={() => setShowAddModal(true)}
            onExtractFeatures={() => workbench.extractFeatures()}
            onSaveChanges={() => workbench.saveCollectionChanges()}
            onSaveAsGroup={() => setShowSaveModal(true)}
            canSaveChanges={canSaveChanges}
            canSave={canSave || false}
            isExtracting={workbench.isExtracting}
            isLoading={workbench.collectionLoading}
          />

          {/* Table */}
          <WorkbenchTable
            collection={workbench.currentCollection}
            onDeleteFeature={(featureId) => workbench.removeFeatureDefinition(featureId)}
            onDeleteArticle={(articleId) => workbench.removeArticles([articleId])}
            onViewArticle={(article) => workbench.selectArticle(article)}
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
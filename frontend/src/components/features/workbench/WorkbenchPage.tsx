import { useState, useEffect } from 'react';
import { Loader2, FolderOpen, Cloud, CloudOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

import { useWorkbench } from '@/context/WorkbenchContext';
import { CollectionSource } from '@/types/articleCollection';
import { SearchProvider } from '@/types/unifiedSearch';

import { UnifiedSearchControls } from './search/UnifiedSearchControls';
import { WorkbenchTable } from './WorkbenchTable';
import { AddFeatureModal } from './AddFeatureModal';
import { ArticleWorkbenchModal } from './ArticleWorkbenchModal';
import { SaveGroupModal } from './SaveGroupModal';
import { LoadGroupModal } from './LoadGroupModal';

export function WorkbenchPage() {
  const workbench = useWorkbench();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Local search state for the search controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<SearchProvider[]>(['pubmed']);
  const [searchMode, setSearchMode] = useState<'single' | 'multi'>('single');

  const { toast } = useToast();

  const handleNewSearch = async () => {
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
        page: 1,
        page_size: 20,
        provider: selectedProviders[0] // Use first selected provider
      });

      toast({
        title: 'Search Complete',
        description: `Found ${workbench.currentCollection?.articles.length || 0} articles`,
      });
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

  const getCollectionBadge = () => {
    if (!workbench.currentCollection) return null;

    const { source, name, is_saved, is_modified } = workbench.currentCollection;

    switch (source) {
      case CollectionSource.SEARCH:
        return (
          <Badge variant="outline" className="text-sm bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Cloud className="w-3 h-3 mr-1" />
            {name}
          </Badge>
        );

      case CollectionSource.SAVED_GROUP:
        return (
          <Badge variant="outline" className="text-sm bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <FolderOpen className="w-3 h-3 mr-1" />
            {name}
            {is_modified && <span className="ml-1">*</span>}
          </Badge>
        );

      case CollectionSource.MODIFIED:
        return (
          <Badge variant="outline" className="text-sm bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CloudOff className="w-3 h-3 mr-1" />
            {name}
          </Badge>
        );

      default:
        return null;
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
          <h1 className="text-2xl font-bold tracking-tight">Research Workbench</h1>
          <p className="text-muted-foreground">
            Search, analyze, and organize research articles with AI-powered insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          {getCollectionBadge()}

          <Button
            onClick={() => setShowLoadModal(true)}
            variant="outline"
            size="sm"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load Group
          </Button>

          {canSave && (
            <Button
              onClick={() => setShowSaveModal(true)}
              variant="outline"
              size="sm"
            >
              <Cloud className="w-4 h-4 mr-2" />
              {workbench.currentCollection?.source === CollectionSource.SEARCH ? 'Save as Group' : 'Save'}
            </Button>
          )}

          {canSaveChanges && (
            <Button
              onClick={() => workbench.saveCollectionChanges()}
              variant="default"
              size="sm"
              disabled={workbench.collectionLoading}
            >
              {workbench.collectionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          )}
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
          onSearch={handleNewSearch}
          isSearching={workbench.collectionLoading}
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
          {/* Collection Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">
                {workbench.currentCollection.name}
              </h2>
              <span className="text-sm text-muted-foreground">
                {workbench.currentCollection.articles.length} articles
              </span>
              {workbench.currentCollection.feature_definitions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  • {workbench.currentCollection.feature_definitions.length} features
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAddModal(true)}
                variant="outline"
                size="sm"
                disabled={workbench.currentCollection.articles.length === 0}
              >
                Add Features
              </Button>

              {workbench.currentCollection.feature_definitions.length > 0 && (
                <Button
                  onClick={() => workbench.extractFeatures()}
                  variant="default"
                  size="sm"
                  disabled={workbench.isExtracting}
                >
                  {workbench.isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Extract Features
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <WorkbenchTable articles={workbench.currentCollection.articles} features={workbench.currentCollection.feature_definitions} />
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
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddFeatureModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(features) => {
          workbench.addFeatureDefinitions(features);
          setShowAddModal(false);
        }}
      />

      <SaveGroupModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        onSave={handleSaveGroup}
        defaultName={workbench.currentCollection?.name}
      />

      <LoadGroupModal
        open={showLoadModal}
        onOpenChange={setShowLoadModal}
        onLoad={handleLoadGroup}
      />

      {workbench.selectedArticle && (
        <ArticleWorkbenchModal
          article={workbench.selectedArticle}
          onClose={() => workbench.selectArticle(null)}
        />
      )}
    </div>
  );
}
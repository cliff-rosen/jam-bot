import { useState } from 'react';
import { Loader2, FolderOpen, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

import { tabelizerApi } from './api/tabelizerApi';
import { unifiedSearchApi } from '@/lib/api/unifiedSearchApi';
import { articleChatApi } from '@/lib/api/articleChatApi';
import { articleGroupApi, ArticleGroup } from '@/lib/api/articleGroupApi';

import { TabelizerColumn } from './types';
import { CanonicalResearchArticle, UnifiedSearchParams, SearchProvider } from '@/types/unifiedSearch';

import { UnifiedSearchControls } from '@/components/features/workbench/search/UnifiedSearchControls';
import { TabelizerTable } from './TabelizerTable';
import { AddColumnModal } from './AddColumnModal';
import { ArticleDetailModal } from './ArticleDetailModal';
import { SaveGroupModal } from './SaveGroupModal';
import { LoadGroupModal } from './LoadGroupModal';

export function TabelizerPage() {
  const [articles, setArticles] = useState<CanonicalResearchArticle[]>([]);
  const [columns, setColumns] = useState<TabelizerColumn[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<CanonicalResearchArticle | null>(null);
  const [currentGroup, setCurrentGroup] = useState<ArticleGroup | null>(null);

  // Search state for UnifiedSearchControls
  const [searchParams, setSearchParams] = useState<UnifiedSearchParams>({
    provider: 'pubmed',
    query: '',
    num_results: 5,
    sort_by: 'relevance',
    include_citations: false,
    include_pdf_links: false,
  });
  const [selectedProviders, setSelectedProviders] = useState<SearchProvider[]>(['pubmed']);
  const [searchMode, setSearchMode] = useState<'single' | 'multi'>('single');

  const { toast } = useToast();

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // Limit to 50 results for MVP
      const limitedParams = { ...searchParams, num_results: Math.min(searchParams.num_results, 50) };
      const response = await unifiedSearchApi.search(limitedParams);
      setArticles(response.articles);
      setColumns([]); // Clear columns on new search
      setCurrentGroup(null); // Clear current group on new search

      toast({
        title: 'Search Complete',
        description: `Found ${response.articles.length} articles`,
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

  const handleDeleteColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId));
    toast({
      title: 'Column Deleted',
      description: 'Column has been removed from the table.',
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

    setIsExtracting(true);

    try {
      const response = await tabelizerApi.extractMultipleColumns({
        articles: articles.map(a => ({
          id: a.id,
          title: a.title,
          abstract: a.abstract || '',
        })),
        columns_config: columnsConfig,
      });

      // Convert multi-column response to individual columns
      const newColumns: TabelizerColumn[] = [];
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

      // Update articles with extracted features
      const updatedArticles = articles.map(article => ({
        ...article,
        extracted_features: {
          ...article.extracted_features,
          ...updatedExtractedFeatures[article.id]
        }
      }));
      setArticles(updatedArticles);

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

    setIsExtracting(true);
    setShowAddModal(false);

    try {
      const response = await tabelizerApi.extractColumn({
        articles: articles.map(a => ({
          id: a.id,
          title: a.title,
          abstract: a.abstract || '',
        })),
        column_name: name,
        column_description: description,
        column_type: type,
        column_options: options,
      });

      const newColumn: TabelizerColumn = {
        id: `col_${Date.now()}`,
        name,
        description,
        type,
        data: response.results,
        options,
      };

      setColumns([...columns, newColumn]);

      // Update articles with extracted features
      const updatedArticles = articles.map(article => ({
        ...article,
        extracted_features: {
          ...article.extracted_features,
          [name]: response.results[article.id]
        }
      }));
      setArticles(updatedArticles);

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
      const csv = await tabelizerApi.exportCsv(articles, columns);

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tabelizer_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

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
    mode: 'new' | 'existing',
    groupId?: string,
    name?: string,
    description?: string
  ) => {
    try {
      // Prepare column metadata
      const columnMetadata = columns.map(col => articleGroupApi.columnToMetadata(col));
      
      // Prepare save request
      const saveRequest = {
        articles,
        columns: columnMetadata,
        search_query: searchParams.query,
        search_provider: searchParams.provider,
        search_params: searchParams,
        overwrite: true
      };

      let response;
      if (mode === 'new' && name) {
        // Create new group and save
        response = await articleGroupApi.createAndSaveGroup(name, description, saveRequest);
      } else if (mode === 'existing' && groupId) {
        // Save to existing group
        response = await articleGroupApi.saveToGroup(groupId, saveRequest);
      } else {
        throw new Error('Invalid save parameters');
      }

      toast({
        title: 'Success',
        description: response.message
      });

      // Load the saved group to update current state
      if (response.group_id) {
        const group = await articleGroupApi.getGroup(response.group_id);
        setCurrentGroup({
          id: group.id,
          user_id: group.user_id,
          name: group.name,
          description: group.description,
          search_query: group.search_query,
          search_provider: group.search_provider,
          search_params: group.search_params,
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

  const handleLoadGroup = async (groupId: string) => {
    try {
      const groupDetail = await articleGroupApi.getGroup(groupId);
      
      // Set articles
      setArticles(groupDetail.articles);
      
      // Set columns
      setColumns(groupDetail.columns);
      
      // Set current group  
      setCurrentGroup({
        id: groupDetail.id,
        user_id: groupDetail.user_id,
        name: groupDetail.name,
        description: groupDetail.description,
        search_query: groupDetail.search_query,
        search_provider: groupDetail.search_provider,
        search_params: groupDetail.search_params,
        columns: groupDetail.columns,
        created_at: groupDetail.created_at,
        updated_at: groupDetail.updated_at,
        article_count: groupDetail.article_count
      });
      
      // Articles are now loaded and will show the table

      // Update search params if available
      if (groupDetail.search_query) {
        setSearchParams(prev => ({
          ...prev,
          query: groupDetail.search_query || prev.query,
          provider: groupDetail.search_provider as SearchProvider || prev.provider
        }));
      }

      toast({
        title: 'Group Loaded',
        description: `Loaded "${groupDetail.name}" with ${groupDetail.articles.length} articles and ${groupDetail.columns.length} columns`
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tabelizer</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create custom research tables with AI-powered data extraction
            </p>
          </div>
          {currentGroup && (
            <Badge variant="outline" className="text-sm">
              <Database className="w-3 h-3 mr-1" />
              {currentGroup.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {articles.length === 0 ? (
          /* When no articles are loaded, show the two paths */
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'groups')} className="flex-1 flex flex-col">
            <div className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="search" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 py-4"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Articles
                </TabsTrigger>
                <TabsTrigger 
                  value="groups"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 py-4"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  My Saved Groups
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="search" className="flex-1 mt-0">
              <div className="p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Search for Articles</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Find research articles from PubMed and Google Scholar
                  </p>
                </div>
                <UnifiedSearchControls
                  searchParams={searchParams}
                  selectedProviders={selectedProviders}
                  searchMode={searchMode}
                  isSearching={isSearching}
                  onSearchParamsChange={setSearchParams}
                  onSelectedProvidersChange={setSelectedProviders}
                  onSearchModeChange={setSearchMode}
                  onSearch={handleSearch}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="groups" className="flex-1 mt-0 flex items-center justify-center">
              <div className="text-center p-8">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Load a Saved Group
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                  Continue working with previously saved article collections and their custom columns
                </p>
                <Button
                  onClick={() => setShowLoadModal(true)}
                  size="lg"
                  className="gap-2"
                >
                  <FolderOpen className="w-5 h-5" />
                  Browse Saved Groups
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <TabelizerTable
            articles={articles}
            columns={columns}
            onAddColumn={() => setShowAddModal(true)}
            onDeleteColumn={handleDeleteColumn}
            onExport={handleExport}
            isExtracting={isExtracting}
            onViewArticle={setSelectedArticle}
            onSaveGroup={() => setShowSaveModal(true)}
            onLoadGroup={() => setShowLoadModal(true)}
            currentGroup={currentGroup}
          />
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

      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleDetailModal
          article={selectedArticle}
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
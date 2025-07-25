import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import { tabelizerApi } from './api/tabelizerApi';
import { unifiedSearchApi } from '@/lib/api/unifiedSearchApi';
import { articleChatApi } from '@/lib/api/articleChatApi';

import { TabelizerColumn } from './types';
import { CanonicalResearchArticle, UnifiedSearchParams, SearchProvider } from '@/types/unifiedSearch';

import { UnifiedSearchControls } from '@/components/features/workbench/search/UnifiedSearchControls';
import { TabelizerTable } from './TabelizerTable';
import { AddColumnModal } from './AddColumnModal';
import { ArticleDetailModal } from './ArticleDetailModal';

export function TabelizerPage() {
  const [articles, setArticles] = useState<CanonicalResearchArticle[]>([]);
  const [columns, setColumns] = useState<TabelizerColumn[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<CanonicalResearchArticle | null>(null);

  // Search state for UnifiedSearchControls
  const [searchParams, setSearchParams] = useState<UnifiedSearchParams>({
    provider: 'pubmed',
    query: '',
    num_results: 50,
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tabelizer</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Search articles and add custom columns with AI-powered extraction
        </p>
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
          onSearch={handleSearch}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {articles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">No articles yet</p>
              <p className="text-sm">Search for articles to get started</p>
            </div>
          </div>
        ) : (
          <TabelizerTable
            articles={articles}
            columns={columns}
            onAddColumn={() => setShowAddModal(true)}
            onDeleteColumn={handleDeleteColumn}
            onExport={handleExport}
            isExtracting={isExtracting}
            onViewArticle={setSelectedArticle}
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
            await articleChatApi.sendMessageStream(message, article, conversationHistory, onChunk, onComplete, onError);
          }}
        />
      )}
    </div>
  );
}
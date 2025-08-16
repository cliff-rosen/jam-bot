import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, ExternalLink, Filter, FileSearch, Database, Download, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import type { FilteredArticle } from '@/types/smart-search';

interface ResultsStepProps {
  filteredArticles: FilteredArticle[];
  originalQuery?: string;
  evidenceSpecification?: string;
  searchQuery?: string;
  totalAvailable?: number;
  totalFiltered?: number;
}

export function ResultsStep({ 
  filteredArticles,
  originalQuery,
  evidenceSpecification,
  searchQuery,
  totalAvailable,
  totalFiltered
}: ResultsStepProps) {
  const acceptedArticles = filteredArticles.filter(fa => fa.passed);
  const rejectedArticles = filteredArticles.filter(fa => !fa.passed);
  const { toast } = useToast();
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [isRejectedOpen, setIsRejectedOpen] = useState(false);

  const exportToCSV = () => {
    const csvContent = [
      ['Title', 'Authors', 'Year', 'Journal', 'Abstract', 'URL', 'DOI', 'PMID', 'Status', 'Confidence', 'Reasoning'].join(','),
      ...filteredArticles.map(item => [
        `"${item.article.title.replace(/"/g, '""')}"`,
        `"${item.article.authors.join('; ').replace(/"/g, '""')}"`,
        item.article.year || '',
        `"${(item.article.journal || '').replace(/"/g, '""')}"`,
        `"${(item.article.abstract || '').replace(/"/g, '""')}"`,
        item.article.url || '',
        item.article.doi || '',
        item.article.pmid || '',
        item.passed ? 'Accepted' : 'Rejected',
        Math.round(item.confidence * 100) + '%',
        `"${item.reasoning.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-search-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported to CSV',
      description: `Exported ${filteredArticles.length} articles to CSV file`
    });
  };

  const copyAcceptedTitles = () => {
    const titles = acceptedArticles.map(item => item.article.title).join('\n');
    navigator.clipboard.writeText(titles);
    toast({
      title: 'Copied to Clipboard',
      description: `Copied ${acceptedArticles.length} accepted article titles`
    });
  };

  return (
    <>
      {/* Workflow Summary Card */}
      <Card className="p-6 dark:bg-gray-800 border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <FileSearch className="w-5 h-5 mr-2" />
            Search Workflow Summary
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={copyAcceptedTitles}
              variant="outline"
              size="sm"
              disabled={acceptedArticles.length === 0}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Titles
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              disabled={filteredArticles.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <div>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">{acceptedArticles.length}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Accepted</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <div>
                <p className="text-lg font-bold text-red-800 dark:text-red-200">{rejectedArticles.length}</p>
                <p className="text-sm text-red-600 dark:text-red-400">Rejected</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{totalFiltered}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Filtered</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
              <div>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{totalAvailable?.toLocaleString()}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Details - Collapsible */}
        <Collapsible open={isWorkflowOpen} onOpenChange={setIsWorkflowOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center w-full justify-start p-0 h-auto">
              {isWorkflowOpen ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Workflow Details
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {/* Original Query */}
              {originalQuery && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Your Query
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    "{originalQuery}"
                  </p>
                </div>
              )}

              {/* Evidence Specification */}
              {evidenceSpecification && evidenceSpecification !== originalQuery && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Evidence Specification
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    "{evidenceSpecification}"
                  </p>
                </div>
              )}

              {/* Search Keywords */}
              {searchQuery && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Search Keywords
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                    {searchQuery}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {acceptedArticles.length > 0 && (
        <Card className="p-6 dark:bg-gray-800">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
            <Check className="w-5 h-5 text-green-600 mr-2" />
            Accepted Articles ({acceptedArticles.length})
          </h3>
          <div className="space-y-1">
            {acceptedArticles.map((item, idx) => (
              <div
                key={idx}
                className="p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {item.article.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {Math.round(item.confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span className="truncate">
                        {item.article.authors.slice(0, 2).join(', ')}
                        {item.article.authors.length > 2 && ' et al.'}
                        {item.article.year && ` (${item.article.year})`}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.article.source}
                      </Badge>
                      {item.article.url && (
                        <a
                          href={item.article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {rejectedArticles.length > 0 && (
        <Collapsible open={isRejectedOpen} onOpenChange={setIsRejectedOpen}>
          <CollapsibleTrigger asChild>
            <Card className="p-6 dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <X className="w-5 h-5 text-red-600 mr-2" />
                Rejected Articles ({rejectedArticles.length})
                {isRejectedOpen ? (
                  <ChevronDown className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 ml-2" />
                )}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (Click to expand)
                </span>
              </h3>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="p-6 dark:bg-gray-800 mt-2">
            <div className="space-y-1">
              {rejectedArticles.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate">
                          {item.article.title}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0 text-red-600">
                          {Math.round(item.confidence * 100)}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="truncate">
                          {item.article.authors.slice(0, 2).join(', ')}
                          {item.article.authors.length > 2 && ' et al.'}
                          {item.article.year && ` (${item.article.year})`}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.article.source}
                        </Badge>
                        {item.article.url && (
                          <a
                            href={item.article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                        Reason: {item.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
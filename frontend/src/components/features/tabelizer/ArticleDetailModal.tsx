import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, Users, BookOpen, MessageCircle, X } from 'lucide-react';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';
import { ChatPanel } from './chat/ChatPanel';

interface ArticleDetailModalProps {
  article: CanonicalResearchArticle;
  onClose: () => void;
  onSendChatMessage?: (message: string, article: CanonicalResearchArticle) => Promise<string>;
}

export function ArticleDetailModal({ article, onClose, onSendChatMessage }: ArticleDetailModalProps) {

  const getArticleUrl = (article: CanonicalResearchArticle) => {
    if (article.source === 'pubmed' && article.id.includes('pubmed_')) {
      const pmid = article.id.replace('pubmed_', '');
      return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
    }
    return article.url || null;
  };

  const getSourceBadge = (source: string) => {
    const config = source === 'pubmed' 
      ? { label: 'PubMed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
      : { label: 'Google Scholar', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-0">
        <DialogTitle className="sr-only">
          Article Analysis: {article.title}
        </DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold truncate">Article Analysis</h2>
            {getSourceBadge(article.source)}
          </div>
          <div className="flex items-center gap-2">
            {getArticleUrl(article) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getArticleUrl(article)!, '_blank')}
                className="gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                View Original
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex h-[calc(95vh-80px)]">
          {/* Left Side - Chat Panel */}
          <ChatPanel 
            article={article}
            onSendMessage={onSendChatMessage}
          />

          {/* Right Side - Article Details */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {article.title}
                </h1>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Authors</div>
                    <div className="text-sm font-medium">
                      {article.authors.length > 0 ? article.authors.join(', ') : 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Journal</div>
                    <div className="text-sm font-medium">
                      {article.journal || 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Year</div>
                    <div className="text-sm font-medium">
                      {article.publication_year || 'Not specified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Article ID */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Article ID</h3>
                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {article.id}
                </code>
              </div>

              {/* Abstract */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Abstract</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {article.abstract ? (
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {article.abstract}
                    </p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No abstract available for this article.
                    </p>
                  )}
                </div>
              </div>

              {/* Citations */}
              {article.citation_count !== undefined && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Citations</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Cited by {article.citation_count} publications
                  </div>
                </div>
              )}

              {/* Extracted Features */}
              {article.extracted_features && Object.keys(article.extracted_features).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Extracted Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(article.extracted_features).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize mb-1">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {value || 'Not specified'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional metadata if available */}
              {article.source_metadata && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Metadata</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 text-xs font-mono">
                      {JSON.stringify(article.source_metadata, null, 2)}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
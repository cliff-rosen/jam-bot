import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, Users, BookOpen } from 'lucide-react';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';

interface ArticleDetailModalProps {
  article: CanonicalResearchArticle;
  onClose: () => void;
}

export function ArticleDetailModal({ article, onClose }: ArticleDetailModalProps) {
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
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl leading-tight text-gray-900 dark:text-gray-100 flex-1">
              {article.title}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getSourceBadge(article.source)}
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
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
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
          {article.cited_by_count !== undefined && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Citations</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Cited by {article.cited_by_count} publications
              </div>
            </div>
          )}

          {/* Additional metadata if available */}
          {article.metadata && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Information</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {article.metadata.features && (
                  <div className="mt-2">
                    <span className="font-medium">Extracted Features: </span>
                    <span className="text-xs">
                      {Object.keys(article.metadata.features).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
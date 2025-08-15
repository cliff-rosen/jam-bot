import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import type { FilteringProgress, FilteredArticle } from '@/types/smart-search';

interface FilteringStepProps {
  filteringProgress: FilteringProgress;
  filteredArticles: FilteredArticle[];
}

export function FilteringStep({ filteringProgress, filteredArticles }: FilteringStepProps) {
  const acceptedArticles = filteredArticles.filter(article => article.passed);
  const rejectedArticles = filteredArticles.filter(article => !article.passed);

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="p-6 dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Applying Semantic Filter
        </h2>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>{filteringProgress.processed} / {filteringProgress.total}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(filteringProgress.processed / filteringProgress.total) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {filteringProgress.accepted}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {filteringProgress.rejected}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {filteringProgress.total - filteringProgress.processed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
          </div>
        </div>

        {filteringProgress.current_article && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Currently evaluating:</div>
            <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {filteringProgress.current_article}
            </div>
          </div>
        )}
      </Card>

      {/* Live Results */}
      {filteredArticles.length > 0 && (
        <Card className="p-6 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Filtered Results ({filteredArticles.length} processed)
            </h3>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700">
                {acceptedArticles.length} Accepted
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700">
                {rejectedArticles.length} Rejected
              </Badge>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3">
            {/* Show accepted articles first */}
            {acceptedArticles.map((filteredArticle, index) => (
              <div
                key={`accepted-${index}`}
                className="p-4 border border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {filteredArticle.article.title}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(filteredArticle.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span className="truncate">
                        {filteredArticle.article.authors.slice(0, 2).join(', ')}
                        {filteredArticle.article.authors.length > 2 && ' et al.'}
                        {filteredArticle.article.year && ` (${filteredArticle.article.year})`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {filteredArticle.article.source}
                      </Badge>
                      {filteredArticle.article.url && (
                        <a
                          href={filteredArticle.article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                      {filteredArticle.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Show rejected articles (collapsed by default) */}
            {rejectedArticles.map((filteredArticle, index) => (
              <div
                key={`rejected-${index}`}
                className="p-3 border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 rounded-lg opacity-60"
              >
                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-xs text-gray-700 dark:text-gray-300 truncate">
                        {filteredArticle.article.title}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(filteredArticle.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">
                      {filteredArticle.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
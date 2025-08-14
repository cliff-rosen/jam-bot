import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ExternalLink } from 'lucide-react';
import type { FilteredArticle } from '@/types/smart-search';

interface ResultsStepProps {
  filteredArticles: FilteredArticle[];
}

export function ResultsStep({ filteredArticles }: ResultsStepProps) {
  const acceptedArticles = filteredArticles.filter(fa => fa.passed);
  const rejectedArticles = filteredArticles.filter(fa => !fa.passed);

  return (
    <>
      <Card className="p-6 dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Filtering Complete
        </h2>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {filteredArticles.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {acceptedArticles.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {rejectedArticles.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {acceptedArticles.length > 0
                ? Math.round((acceptedArticles.reduce((sum, a) => sum + a.confidence, 0) / acceptedArticles.length) * 100)
                : 0}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</div>
          </div>
        </div>
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
        <details className="group">
          <summary className="cursor-pointer">
            <Card className="p-6 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <X className="w-5 h-5 text-red-600 mr-2" />
                Rejected Articles ({rejectedArticles.length})
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (Click to expand)
                </span>
              </h3>
            </Card>
          </summary>
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
        </details>
      )}
    </>
  );
}
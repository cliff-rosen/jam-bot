import { Card } from '@/components/ui/card';
import { CanonicalScholarArticle } from '@/types/canonical_types';
import ExtractedFeatures from './ExtractedFeatures';

interface ArticleCardProps {
    article: CanonicalScholarArticle;
}

export default function ArticleCard({ article }: ArticleCardProps) {
    return (
        <Card className="p-4 dark:bg-gray-800">
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg flex-1">
                    {article.link ? (
                        <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            {article.title}
                        </a>
                    ) : (
                        <span className="text-gray-900 dark:text-gray-100">{article.title}</span>
                    )}
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">#{article.position}</span>
            </div>

            {article.authors.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {article.authors.join(', ')}
                </p>
            )}

            {article.publication_info && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {article.publication_info}
                    {article.year && ` (${article.year})`}
                </p>
            )}

            {article.snippet && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{article.snippet}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
                {article.pdf_link && (
                    <a
                        href={article.pdf_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800"
                    >
                        PDF
                    </a>
                )}
                {article.cited_by_count !== undefined && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                        Cited by {article.cited_by_count}
                    </span>
                )}
                {article.cited_by_link && (
                    <a
                        href={article.cited_by_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        View Citations
                    </a>
                )}
                {article.related_pages_link && (
                    <a
                        href={article.related_pages_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        Related
                    </a>
                )}
            </div>

            {/* Display extracted features if available */}
            {article.metadata?.features && (
                <ExtractedFeatures features={article.metadata.features} />
            )}

            {/* Display extraction error if available */}
            {article.metadata?.feature_extraction_error && (
                <div className="mt-4 border-t pt-3 border-gray-200 dark:border-gray-600">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">Extraction Error: </span>
                        <span className="text-sm text-red-700 dark:text-red-300">{article.metadata.feature_extraction_error}</span>
                    </div>
                </div>
            )}
        </Card>
    );
} 
import { Button } from '@/components/ui/button';
import { CanonicalScholarArticle } from '@/types/canonical_types';
import ArticleCard from './ArticleCard';

interface ResultsListProps {
    articles: CanonicalScholarArticle[];
    extracting: boolean;
    onExtract: () => void;
}

export default function ResultsList({ articles, extracting, onExtract }: ResultsListProps) {
    if (articles.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                No results to display. Try searching for something!
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Results ({articles.length})</h3>
                <Button
                    onClick={onExtract}
                    disabled={extracting || articles.length === 0}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium"
                >
                    {extracting ? 'Extracting...' : 'Extract Features'}
                </Button>
            </div>
            {articles.map((article, index) => (
                <ArticleCard key={index} article={article} />
            ))}
        </div>
    );
} 
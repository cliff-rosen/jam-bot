import { CanonicalScholarArticle } from '@/types/canonical_types';
import { WorkbenchFilters, SortOption } from '../search/types';

export function filterArticles(
    articles: CanonicalScholarArticle[],
    filters: WorkbenchFilters
): CanonicalScholarArticle[] {
    return articles.filter(article => {
        // If no features extracted yet, show all articles
        if (!article.metadata?.features) {
            return true;
        }

        const features = article.metadata.features;

        // Apply filters
        if (filters.poi_relevance !== 'all' && features.poi_relevance !== filters.poi_relevance) {
            return false;
        }
        if (filters.doi_relevance !== 'all' && features.doi_relevance !== filters.doi_relevance) {
            return false;
        }
        if (filters.is_systematic !== 'all' && features.is_systematic !== filters.is_systematic) {
            return false;
        }
        if (filters.study_type !== 'all' && features.study_type !== filters.study_type) {
            return false;
        }
        if (filters.study_outcome !== 'all' && features.study_outcome !== filters.study_outcome) {
            return false;
        }
        if (features.confidence_score < filters.min_confidence / 100) {
            return false;
        }
        if (features.relevance_score < filters.min_relevance_score) {
            return false;
        }

        return true;
    });
}

export function sortArticles(
    articles: CanonicalScholarArticle[],
    sortBy: SortOption
): CanonicalScholarArticle[] {
    if (sortBy === 'none') return articles;

    return [...articles].sort((a, b) => {
        const aFeatures = a.metadata?.features;
        const bFeatures = b.metadata?.features;

        // Articles without features go to the end
        if (!aFeatures && !bFeatures) return 0;
        if (!aFeatures) return 1;
        if (!bFeatures) return -1;

        if (sortBy === 'relevance_score') {
            return (bFeatures.relevance_score || 0) - (aFeatures.relevance_score || 0);
        } else if (sortBy === 'confidence_score') {
            return (bFeatures.confidence_score || 0) - (aFeatures.confidence_score || 0);
        }

        return 0;
    });
}

export function countActiveFilters(filters: WorkbenchFilters): number {
    return Object.entries(filters).reduce((count, [key, value]) => {
        if (key === 'min_confidence' || key === 'min_relevance_score') {
            return Number(value) > 0 ? count + 1 : count;
        }
        return value !== 'all' ? count + 1 : count;
    }, 0);
} 
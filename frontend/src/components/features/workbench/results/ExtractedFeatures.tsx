import { ExtractedFeatures as ExtractedFeaturesType } from '@/types/unifiedSearch';

interface ExtractedFeaturesProps {
    features: ExtractedFeaturesType;
}

export default function ExtractedFeatures({ features }: ExtractedFeaturesProps) {
    if (!features) {
        return null;
    }

    const getRelevanceScoreColor = (score: number) => {
        if (score >= 8) return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600';
        if (score >= 5) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600';
        if (score >= 3) return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-600';
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600';
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 0.8) return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
        if (score >= 0.6) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300';
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
    };

    const getBooleanColor = (value: string) => {
        return value === 'yes'
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    };

    return (
        <div className="mt-4 border-t pt-3 border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Extracted Features</h5>
                {features.relevance_score !== undefined && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Relevance Score:</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${getRelevanceScoreColor(features.relevance_score)}`}>
                            {features.relevance_score}/10
                        </span>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">PoI Relevance: </span>
                        <span className={`px-1 py-0.5 rounded ${getBooleanColor(features.poi_relevance || 'no')}`}>
                            {features.poi_relevance || 'no'}
                        </span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">DoI Relevance: </span>
                        <span className={`px-1 py-0.5 rounded ${getBooleanColor(features.doi_relevance || 'no')}`}>
                            {features.doi_relevance || 'no'}
                        </span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Systematic: </span>
                        <span className={`px-1 py-0.5 rounded ${features.is_systematic === 'yes'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                            {features.is_systematic || 'no'}
                        </span>
                    </div>
                </div>
                <div className="space-y-1">
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Study Type: </span>
                        <span className="text-gray-700 dark:text-gray-300">{features.study_type || 'unknown'}</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Outcome: </span>
                        <span className="text-gray-700 dark:text-gray-300">{features.study_outcome || 'unknown'}</span>
                    </div>
                    {features.confidence_score !== undefined && (
                        <div>
                            <span className="font-medium text-gray-600 dark:text-gray-400">Confidence: </span>
                            <span className={`px-1 py-0.5 rounded ${getConfidenceColor(features.confidence_score)}`}>
                                {(features.confidence_score * 100).toFixed(0)}%
                            </span>
                        </div>
                    )}
                </div>
            </div>
            {features.extraction_notes && (
                <div className="mt-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Notes: </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{features.extraction_notes}</span>
                </div>
            )}
        </div>
    );
}
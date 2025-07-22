import { Card } from '@/components/ui/card';

interface MetadataDisplayProps {
    searchMetadata: Record<string, any>;
    extractionMetadata: Record<string, any> | null;
}

export default function MetadataDisplay({ searchMetadata, extractionMetadata }: MetadataDisplayProps) {
    if (Object.keys(searchMetadata).length === 0 && !extractionMetadata) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Search Metadata */}
            {Object.keys(searchMetadata).length > 0 && (
                <Card className="p-4 dark:bg-gray-800">
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Search Metadata</h3>
                    <pre className="text-sm bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded overflow-auto">
                        {JSON.stringify(searchMetadata, null, 2)}
                    </pre>
                </Card>
            )}

            {/* Extraction Metadata */}
            {extractionMetadata && (
                <Card className="p-4 dark:bg-gray-800">
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Feature Extraction Results</h3>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <p>Articles Processed: {extractionMetadata.articles_processed}</p>
                        <p>Successful Extractions: {extractionMetadata.successful_extractions}</p>
                        <p>Failed Extractions: {extractionMetadata.failed_extractions}</p>
                    </div>
                </Card>
            )}
        </div>
    );
} 
import { Asset } from './types';

export const getAssetIcon = (format: Asset['format']): string => {
    switch (format) {
        case 'text':
            return '📝';
        case 'json':
            return '📋';
        case 'pdf':
            return '📑';
        case 'image':
            return '🖼️';
        case 'email-list':
            return '📧';
        default:
            return '📁';
    }
};

export const getAssetColor = (type: Asset['type']): string => {
    switch (type) {
        case 'input':
            return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        case 'output':
            return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        case 'intermediate':
            return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
        default:
            return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
}; 
import { AssetType, Asset } from '@/types/asset';

export const getAssetColor = (type: AssetType, subtype?: string) => {
    switch (type) {
        case AssetType.FILE:
            // File type colors based on subtype
            switch (subtype?.toLowerCase()) {
                case 'pdf':
                    return 'text-red-500';
                case 'doc':
                case 'docx':
                    return 'text-blue-500';
                case 'txt':
                    return 'text-gray-500';
                case 'csv':
                case 'json':
                    return 'text-green-500';
                case 'png':
                case 'jpg':
                case 'jpeg':
                case 'gif':
                    return 'text-purple-500';
                default:
                    return 'text-gray-400';
            }
        case AssetType.PRIMITIVE:
            return 'text-yellow-500';
        case AssetType.OBJECT:
            return 'text-indigo-500';
        default:
            return 'text-gray-400';
    }
};

export const getFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
};

// content can be primitive, object, or array
// if object, return object[dataType]
// if array, return array
// if primitive, return primitive
// if null or undefined, return null
export const getAssetContent = (asset: Asset) => {
    // Handle null/undefined content
    if (!asset.content) {
        return null;
    }

    // If content is a primitive (string, number, etc.), return it directly
    if (typeof asset.content !== 'object') {
        return asset.content;
    }

    // If content is an object and has a property matching the subtype, return that property
    if (asset.subtype && Object.keys(asset.content).includes(asset.subtype)) {
        return asset.content[asset.subtype];
    }

    // If content is an object but doesn't have a matching subtype property, return the whole object
    return asset.content;
}; 
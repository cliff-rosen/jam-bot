import { FileType, DataType, Asset } from '@/types/asset';
import { EmailMessage } from '@/types/email';

export const getAssetColor = (fileType: FileType, dataType: DataType) => {
    // Prioritize data type for special cases
    if (dataType !== DataType.UNSTRUCTURED) {
        switch (dataType) {
            case DataType.EMAIL_LIST:
            case DataType.GENERIC_LIST:
            case DataType.EMAIL_SUMMARIES_LIST:
                return 'text-blue-500';
            case DataType.GENERIC_TABLE:
                return 'text-green-500';
            default:
                break;
        }
    }

    // Fall back to file type
    switch (fileType) {
        case FileType.TXT:
            return 'text-gray-500';
        case FileType.CSV:
        case FileType.JSON:
            return 'text-green-500';
        case FileType.PDF:
            return 'text-red-500';
        case FileType.PNG:
        case FileType.JPG:
        case FileType.JPEG:
        case FileType.GIF:
            return 'text-purple-500';
        case FileType.DOC:
        case FileType.DOCX:
            return 'text-blue-500';
        default:
            return 'text-gray-400';
    }
};

export const getFileType = (file: File): FileType => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf':
            return FileType.PDF;
        case 'doc':
            return FileType.DOC;
        case 'docx':
            return FileType.DOCX;
        case 'txt':
            return FileType.TXT;
        case 'csv':
            return FileType.CSV;
        case 'json':
            return FileType.JSON;
        case 'png':
            return FileType.PNG;
        case 'jpg':
        case 'jpeg':
            return FileType.JPG;
        case 'gif':
            return FileType.GIF;
        case 'mp3':
            return FileType.MP3;
        case 'mp4':
            return FileType.MP4;
        case 'wav':
            return FileType.WAV;
        default:
            return FileType.UNKNOWN;
    }
};

export const getDataType = (file: File): DataType => {
    // Check file extension first
    const extension = file.name.split('.').pop()?.toLowerCase();

    // If it's a JSON file, we'll need to check its content
    if (extension === 'json') {
        return DataType.GENERIC_LIST;
    }

    // For other file types, default to unstructured
    return DataType.UNSTRUCTURED;
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

    // If content is an object and has a property matching the dataType, return that property
    if (Object.keys(asset.content).includes(asset.dataType)) {
        console.log('getAssetContent: dataType: ', asset.dataType);
        console.log('getAssetContent: asset.content[asset.dataType]: ', asset.content[asset.dataType]);
        return asset.content[asset.dataType];
    }

    // If content is an object but doesn't have a matching dataType property, return the whole object
    return asset.content;
}; 
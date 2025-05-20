import { AssetType } from '@/types/asset';
import { DocumentIcon, DocumentTextIcon, ListBulletIcon, TableCellsIcon, PhotoIcon, MusicalNoteIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { getAssetColor } from './assetUtils';

export const getAssetIcon = (type: AssetType, subtype?: string) => {
    switch (type) {
        case AssetType.FILE:
            // File type icons based on subtype
            switch (subtype?.toLowerCase()) {
                case 'pdf':
                case 'doc':
                case 'docx':
                    return <DocumentIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
                case 'txt':
                    return <DocumentTextIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
                case 'csv':
                case 'json':
                    return <TableCellsIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
                case 'png':
                case 'jpg':
                case 'jpeg':
                case 'gif':
                    return <PhotoIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
                case 'mp3':
                case 'wav':
                    return <MusicalNoteIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
                case 'mp4':
                    return <VideoCameraIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
                default:
                    return <DocumentIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
            }
        case AssetType.PRIMITIVE:
            return <DocumentTextIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
        case AssetType.OBJECT:
            return <TableCellsIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
        default:
            return <DocumentIcon className={`h-6 w-6 ${getAssetColor(type, subtype)}`} />;
    }
}; 
import { FileType, DataType } from '@/types/asset';
import { DocumentIcon, DocumentTextIcon, ListBulletIcon, TableCellsIcon, PhotoIcon, MusicalNoteIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { getAssetColor } from './assetUtils';

export const getAssetIcon = (fileType: FileType, dataType: DataType) => {
    // Prioritize data type for special cases
    if (dataType !== DataType.UNSTRUCTURED) {
        switch (dataType) {
            case DataType.EMAIL_LIST:
            case DataType.GENERIC_LIST:
            case DataType.EMAIL_SUMMARIES_LIST:
                return <ListBulletIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
            case DataType.GENERIC_TABLE:
                return <TableCellsIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
            default:
                break;
        }
    }

    // Fall back to file type
    switch (fileType) {
        case FileType.TXT:
            return <DocumentTextIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
        case FileType.CSV:
        case FileType.JSON:
            return <TableCellsIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
        case FileType.PDF:
            return <DocumentIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
        case FileType.PNG:
        case FileType.JPG:
        case FileType.JPEG:
        case FileType.GIF:
            return <PhotoIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
        case FileType.DOC:
        case FileType.DOCX:
            return <DocumentTextIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
        case FileType.MP3:
        case FileType.WAV:
            return <MusicalNoteIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
        case FileType.MP4:
            return <VideoCameraIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
        default:
            return <DocumentIcon className={`h-6 w-6 ${getAssetColor(fileType, dataType)}`} />;
    }
}; 
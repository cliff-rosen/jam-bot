import React, { useState, useEffect } from 'react';
import { FileInfo, fileApi } from '../lib/api/fileApi';
import { Upload, Trash2, FileText, Download } from 'lucide-react';

interface FileLibraryProps {
    onFileSelect?: (fileId: string) => void;
    selectedFileId?: string;
}

const FileLibrary: React.FC<FileLibraryProps> = ({ onFileSelect, selectedFileId }) => {
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    console.log('FileLibrary component rendered');
    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            const files = await fileApi.getFiles();
            setFiles(files);
        } catch (err) {
            setError('Failed to load files');
            console.error('Error loading files:', err);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            await fileApi.uploadFile(file);
            await loadFiles();
        } catch (err) {
            setError('Failed to upload file');
            console.error('Error uploading file:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleFileDelete = async (fileId: string) => {
        try {
            await fileApi.deleteFile(fileId);
            await loadFiles();
        } catch (err) {
            setError('Failed to delete file');
            console.error('Error deleting file:', err);
        }
    };

    const handleFileDownload = async (fileId: string, fileName: string) => {
        try {
            const blob = await fileApi.downloadFile(fileId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError('Failed to download file');
            console.error('Error downloading file:', err);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">File Library</h3>
                <label className="cursor-pointer">
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 
                                  hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 
                                  rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </div>
                </label>
            </div>

            {error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                {files.map(file => (
                    <div
                        key={file.file_id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer
                            ${selectedFileId === file.file_id
                                ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600'
                                : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        onClick={() => onFileSelect?.(file.file_id)}
                    >
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {file.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {(file.size / 1024).toFixed(1)} KB • {file.mime_type}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileDownload(file.file_id, file.name);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 dark:text-gray-500 
                                         dark:hover:text-blue-400 rounded-full hover:bg-gray-100 
                                         dark:hover:bg-gray-700"
                                title="Download file"
                            >
                                <Download className="w-4 h-4" />
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileDelete(file.file_id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 dark:text-gray-500 
                                         dark:hover:text-red-400 rounded-full hover:bg-gray-100 
                                         dark:hover:bg-gray-700"
                                title="Delete file"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {files.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No files uploaded yet
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileLibrary; 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileApi } from '../lib/api/fileApi';
import AssetList from '../components/common/AssetList';

const FilesManager: React.FC = () => {
    const navigate = useNavigate();
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            setIsLoading(true);
            const files = await fileApi.getFiles();
            setFiles(files);
        } catch (err) {
            setError('Failed to load files');
            console.error('Error loading files:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateNew = () => {
        // Open file upload dialog
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                setIsLoading(true);
                await fileApi.uploadFile(file);
                await loadFiles();
            } catch (err) {
                setError('Failed to upload file');
                console.error('Error uploading file:', err);
            } finally {
                setIsLoading(false);
            }
        };
        input.click();
    };

    const handleEdit = async (fileId: string) => {
        try {
            const blob = await fileApi.downloadFile(fileId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const file = files.find(f => f.file_id === fileId);
            a.download = file?.name || 'download';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError('Failed to download file');
            console.error('Error downloading file:', err);
        }
    };

    const handleDelete = async (fileId: string) => {
        console.log('Deleting file:', fileId);
        try {
            await fileApi.deleteFile(fileId);
            await loadFiles();
        } catch (err) {
            setError('Failed to delete file');
            console.error('Error deleting file:', err);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const assets = files.map(file => ({
        id: file.file_id,
        name: file.name,
        description: file.description,
        metadata: [
            {
                label: 'size',
                value: formatFileSize(file.size)
            },
            {
                label: 'type',
                value: file.mime_type || 'unknown'
            }
        ]
    }));

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent dark:border-blue-400 dark:border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading files...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className="text-sm text-red-600 dark:text-red-400 mb-4">
                    {error}
                </div>
            )}
            <AssetList
                title="Files"
                subtitle="Upload and manage files to use in your workflows and prompts"
                assets={assets}
                onCreateNew={handleCreateNew}
                onEdit={handleEdit}
                onDelete={handleDelete}
                createButtonText="Upload File"
                emptyStateMessage="No files found. Upload one to get started."
            />
        </>
    );
};

export default FilesManager; 
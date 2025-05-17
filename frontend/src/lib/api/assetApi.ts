import { Asset, FileType, DataType } from '@/types/asset';
import { api } from '@/lib/api';

// Type for creating an asset
interface CreateAssetParams {
    name: string;
    description?: string;
    fileType: FileType;
    dataType: DataType;
    content?: any;
}

// Type for updating an asset
interface UpdateAssetParams {
    name?: string;
    description?: string;
    fileType?: FileType;
    dataType?: DataType;
    content?: any;
}

export const assetApi = {
    // Get all assets
    async getAssets(fileType?: FileType, dataType?: DataType): Promise<Asset[]> {
        const response = await api.get('/api/assets', {
            params: {
                type: fileType,
                subtype: dataType
            }
        });
        return response.data.map((asset: any) => ({
            ...asset,
            fileType: asset.fileType,
            dataType: asset.dataType,
            persistence: {
                isInDb: true,
                dbId: asset.asset_id,
                isDirty: false,
                lastSyncedAt: new Date().toISOString(),
                version: 1
            }
        }));
    },

    // Get a specific asset
    async getAsset(id: string): Promise<Asset> {
        const response = await api.get(`/api/assets/${id}`);
        return {
            ...response.data,
            fileType: response.data.type,
            dataType: response.data.subtype || DataType.UNSTRUCTURED,
            persistence: {
                isInDb: true,
                dbId: response.data.asset_id,
                isDirty: false,
                lastSyncedAt: new Date().toISOString(),
                version: 1
            }
        };
    },

    // Create a new asset
    async createAsset(params: CreateAssetParams): Promise<Asset> {
        // Map frontend types to backend format
        const backendParams = {
            name: params.name,
            fileType: params.fileType,
            dataType: params.dataType,
            description: params.description,
            content: params.content
        };

        const response = await api.post('/api/assets', backendParams);

        // Map backend response to frontend format
        return {
            ...response.data,
            fileType: response.data.type,
            dataType: response.data.subtype || DataType.UNSTRUCTURED,
            persistence: {
                isInDb: true,
                dbId: response.data.asset_id,
                isDirty: false,
                lastSyncedAt: new Date().toISOString(),
                version: 1
            }
        };
    },

    // Update an asset
    async updateAsset(id: string, updates: UpdateAssetParams): Promise<Asset> {
        // Map frontend types to backend format
        const backendUpdates = {
            name: updates.name,
            fileType: updates.fileType,
            dataType: updates.dataType,
            description: updates.description,
            content: updates.content
        };

        const response = await api.put(`/api/assets/${id}`, backendUpdates);

        // Map backend response to frontend format
        return {
            ...response.data,
            fileType: response.data.type,
            dataType: response.data.subtype || DataType.UNSTRUCTURED,
            persistence: {
                isInDb: true,
                dbId: response.data.asset_id,
                isDirty: false,
                lastSyncedAt: new Date().toISOString(),
                version: 1
            }
        };
    },

    async deleteAsset(id: string): Promise<void> {
        await api.delete(`/api/assets/${id}`);
    },

    // Upload a file as an asset
    async zzDELETEuploadFileAsset(
        file: File,
        options?: {
            name?: string;
            description?: string;
            subtype?: string;
        }
    ): Promise<Asset> {
        const formData = new FormData();
        formData.append('file', file);

        if (options?.name) formData.append('name', options.name);
        if (options?.description) formData.append('description', options.description);
        if (options?.subtype) formData.append('subtype', options.subtype);

        const response = await api.post('/api/assets/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        // Add persistence info to response
        return {
            ...response.data,
            persistence: {
                isInDb: true,
                dbId: response.data.asset_id,
                isDirty: false,
                lastSyncedAt: new Date().toISOString(),
                version: 1
            }
        };
    },

    // Download a file asset
    async zzDELETEdownloadFileAsset(assetId: string): Promise<Blob> {
        const response = await api.get(`/api/assets/${assetId}/download`, {
            responseType: 'blob'
        });
        return response.data;
    }
}; 
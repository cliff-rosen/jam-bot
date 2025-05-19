import { Asset, AssetType, CollectionType, AssetWithPersistence } from '@/types/asset';
import { api } from '@/lib/api';

// Type for creating an asset
interface CreateAssetParams {
    type: AssetType;
    subtype?: string;
    is_collection?: boolean;
    collection_type?: CollectionType;
    content?: any;
    metadata?: Record<string, any>;
}

// Type for updating an asset
interface UpdateAssetParams {
    type?: AssetType;
    subtype?: string;
    is_collection?: boolean;
    collection_type?: CollectionType;
    content?: any;
    metadata?: Record<string, any>;
}

export const assetApi = {
    // Get all assets
    async getAssets(): Promise<AssetWithPersistence[]> {
        const response = await api.get('/api/assets');
        return response.data.map((asset: any) => ({
            ...asset,
            persistence: {
                isInDb: true,
                dbId: asset.id,
                isDirty: false,
                lastSyncedAt: new Date().toISOString(),
                version: 1
            }
        }));
    },

    // Get a specific asset
    async getAsset(id: string): Promise<AssetWithPersistence> {
        const response = await api.get(`/api/assets/${id}`);
        return {
            ...response.data,
            persistence: {
                isInDb: true,
                dbId: response.data.id,
                isDirty: false,
                lastSyncedAt: new Date().toISOString(),
                version: 1
            }
        };
    },

    // Create a new asset
    async createAsset(params: CreateAssetParams): Promise<AssetWithPersistence> {
        const response = await api.post('/api/assets', params);
        return {
            ...response.data,
            persistence: {
                isInDb: true,
                dbId: response.data.id,
                isDirty: false,
                lastSyncedAt: new Date().toISOString(),
                version: 1
            }
        };
    },

    // Update an asset
    async updateAsset(id: string, updates: UpdateAssetParams): Promise<AssetWithPersistence> {
        const response = await api.put(`/api/assets/${id}`, updates);
        return {
            ...response.data,
            persistence: {
                isInDb: true,
                dbId: response.data.id,
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
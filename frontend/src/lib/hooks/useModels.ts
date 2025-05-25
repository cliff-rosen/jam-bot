import { useState, useEffect } from 'react';
import { modelApi } from '../api/modelApi';
import { ModelData } from '../types/models';

export function useModels() {
    const [modelData, setModelData] = useState<ModelData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const data = await modelApi.getModels();
                setModelData(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch models'));
            } finally {
                setLoading(false);
            }
        };

        fetchModels();
    }, []);

    const getModelByCategory = (category: keyof ModelData['openai']['categories']) => {
        if (!modelData) return [];
        return modelData.openai.categories[category];
    };

    const getModelByFamily = (family: keyof ModelData['openai']['families']) => {
        if (!modelData) return [];
        return modelData.openai.families[family];
    };

    const getModelConfig = (modelId: string) => {
        if (!modelData) return null;
        return modelData.openai.models[modelId] || modelData.anthropic.models[modelId];
    };

    const getModelFamilyConfig = (family: string) => {
        if (!modelData) return null;
        return modelData.openai.family_configs[family];
    };

    return {
        modelData,
        loading,
        error,
        getModelByCategory,
        getModelByFamily,
        getModelConfig,
        getModelFamilyConfig
    };
} 
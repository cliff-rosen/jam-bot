import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PromptTemplate, PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest } from '../types/prompts';
import { toolApi } from '../lib/api/toolApi';
import { ToolSignature } from '../types/tools';

interface PromptTemplateContextType {
    templates: PromptTemplate[];
    selectedTemplate: PromptTemplate | null;
    isEditing: boolean;
    // Actions
    createTemplate: (template: PromptTemplateCreate) => Promise<PromptTemplate>;
    updateTemplate: (templateId: string, template: PromptTemplateUpdate) => Promise<PromptTemplate>;
    deleteTemplate: (templateId: string) => Promise<void>;
    testTemplate: (templateId: string, testData: PromptTemplateTest) => Promise<any>;
    setSelectedTemplate: (template: PromptTemplate | null) => void;
    setIsEditing: (isEditing: boolean) => void;
    refreshTemplates: () => Promise<void>;
    createToolSignatureFromTemplate: (templateId: string) => Promise<ToolSignature>;
}

const PromptTemplateContext = createContext<PromptTemplateContextType | null>(null);

export const PromptTemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const refreshTemplates = useCallback(async () => {
        const fetchedTemplates = await toolApi.getPromptTemplates();
        setTemplates(fetchedTemplates);
    }, []);

    useEffect(() => {
        refreshTemplates();
    }, [refreshTemplates]);

    const createTemplate = async (template: PromptTemplateCreate) => {
        const newTemplate = await toolApi.createPromptTemplate(template);
        await refreshTemplates();
        return newTemplate;
    };

    const updateTemplate = async (templateId: string, template: PromptTemplateUpdate) => {
        const updatedTemplate = await toolApi.updatePromptTemplate(templateId, template);
        await refreshTemplates();
        return updatedTemplate;
    };

    const deleteTemplate = async (templateId: string) => {
        await toolApi.deletePromptTemplate(templateId);
        await refreshTemplates();
        setSelectedTemplate(null);
    };

    const testTemplate = async (templateId: string, testData: PromptTemplateTest) => {
        return await toolApi.testPromptTemplate(templateId, testData);
    };

    const createToolSignatureFromTemplate = async (templateId: string) => {
        return await toolApi.createToolSignatureFromTemplate(templateId);
    };

    return (
        <PromptTemplateContext.Provider value={{
            templates,
            selectedTemplate,
            isEditing,
            createTemplate,
            updateTemplate,
            deleteTemplate,
            testTemplate,
            setSelectedTemplate,
            setIsEditing,
            refreshTemplates,
            createToolSignatureFromTemplate
        }}>
            {children}
        </PromptTemplateContext.Provider>
    );
};

export const usePromptTemplates = () => {
    const context = useContext(PromptTemplateContext);
    if (!context) {
        throw new Error('usePromptTemplates must be used within a PromptTemplateProvider');
    }
    return context;
}; 
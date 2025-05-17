import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePromptTemplates } from '../context/PromptTemplateContext';
import AssetList from '../components/common/AssetList';

const PromptTemplateManager: React.FC = () => {
    const navigate = useNavigate();
    const {
        templates,
        selectedTemplate,
        setSelectedTemplate,
        deleteTemplate
    } = usePromptTemplates();
    const [error, setError] = useState<string | null>(null);

    // Clear selected template when component mounts
    useEffect(() => {
        setSelectedTemplate(null);
    }, [setSelectedTemplate]);

    // Redirect to template page if there's a selected template
    useEffect(() => {
        if (selectedTemplate) {
            console.log('selectedTemplate: ', selectedTemplate);
            navigate(`/prompt/${selectedTemplate.template_id}`);
        }
    }, [selectedTemplate, navigate]);

    const handleCreateNew = () => {
        navigate('/prompt/new');
    };

    const handleEdit = (templateId: string) => {
        console.log('Editing template:', templateId);
        navigate(`/prompt/${templateId}`);
    };

    const handleDelete = async (templateId: string) => {
        try {
            setError(null);
            await deleteTemplate(templateId);
        } catch (err) {
            console.error('Error deleting template:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete template');
        }
    };

    const assets = templates.map(template => ({
        id: template.template_id,
        name: template.name,
        description: template.description,
        metadata: [
            {
                label: 'variables',
                value: template.tokens?.length || 0
            },
            {
                label: template.output_schema.type === 'object' ? 'output fields' : 'text output',
                value: template.output_schema.type === 'object'
                    ? Object.keys(template.output_schema.fields || {}).length
                    : 1
            }
        ]
    }));

    return (
        <>
            {error && (
                <div className="container mx-auto px-4 mt-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <AssetList
                title="Prompt Templates"
                subtitle="Create and manage templates used to generate prompts in your workflows"
                assets={assets}
                onCreateNew={handleCreateNew}
                onEdit={handleEdit}
                onDelete={handleDelete}
                createButtonText="Create New Template"
                emptyStateMessage="No prompt templates found. Create one to get started."
            />
        </>
    );
};

export default PromptTemplateManager; 
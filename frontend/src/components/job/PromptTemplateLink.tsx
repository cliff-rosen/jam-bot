import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePromptTemplates } from '../../context/PromptTemplateContext';
import { PromptTemplate } from '../../types/prompts';

interface PromptTemplateLinkProps {
    templateId: string;
}

export const PromptTemplateLink: React.FC<PromptTemplateLinkProps> = ({ templateId }) => {
    const { templates } = usePromptTemplates();
    const [template, setTemplate] = useState<PromptTemplate | null>(null);

    useEffect(() => {
        const foundTemplate = templates.find(t => t.template_id === templateId);
        setTemplate(foundTemplate || null);
    }, [templateId, templates]);

    if (!template) return null;

    return (
        <>
            <Link
                to={`/prompt/${template.template_id}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
                {template.name}
            </Link>
            {template.description && (
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                    • {template.description}
                </span>
            )}
        </>
    );
}; 
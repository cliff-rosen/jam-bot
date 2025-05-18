import React from 'react';

interface CollabAreaProps {
    // We can add props here as needed for different types of content
    type?: 'default' | 'workflow' | 'document' | 'code';
    content?: any;
}

const CollabArea: React.FC<CollabAreaProps> = ({ type = 'default', content }) => {
    return (
        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {type === 'workflow' && 'Workflow'}
                    {type === 'document' && 'Document'}
                    {type === 'code' && 'Code Editor'}
                    {type === 'default' && 'Collaboration Area'}
                </h2>
            </div>

            {/* Main Content Section */}
            <div className="flex-1 p-4 overflow-auto">
                {/* Content will be rendered here based on type */}
                {type === 'default' && (
                    <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        Select a collaboration type to begin
                    </div>
                )}
                {type === 'workflow' && content && (
                    <div className="h-full">
                        {/* Workflow content will go here */}
                    </div>
                )}
                {type === 'document' && content && (
                    <div className="h-full">
                        {/* Document content will go here */}
                    </div>
                )}
                {type === 'code' && content && (
                    <div className="h-full">
                        {/* Code editor content will go here */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollabArea; 
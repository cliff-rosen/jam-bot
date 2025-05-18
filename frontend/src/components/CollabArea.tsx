import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollabAreaProps {
    // We can add props here as needed for different types of content
    type?: 'default' | 'workflow' | 'document' | 'code' | 'object-list';
    content?: any;
}

const CollabArea: React.FC<CollabAreaProps> = ({ type = 'default', content }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrevious = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        if (Array.isArray(content)) {
            setCurrentIndex(prev => Math.min(content.length - 1, prev + 1));
        }
    };

    const renderObjectList = () => {
        if (!Array.isArray(content) || content.length === 0) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No objects to display
                </div>
            );
        }

        const currentItem = content[currentIndex];

        return (
            <div className="h-full flex">
                {/* Object List Sidebar */}
                <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <div className="p-2">
                        {content.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${index === currentIndex
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                Item {index + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Object Viewer */}
                <div className="flex-1 flex flex-col">
                    {/* Navigation Controls */}
                    <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <button
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {currentIndex + 1} of {content.length}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === content.length - 1}
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* JSON Viewer */}
                    <div className="flex-1 p-4 overflow-auto">
                        <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-gray-900 dark:text-gray-100">
                            {JSON.stringify(currentItem, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {type === 'workflow' && 'Workflow'}
                    {type === 'document' && 'Document'}
                    {type === 'code' && 'Code Editor'}
                    {type === 'object-list' && 'Object List'}
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
                {type === 'object-list' && renderObjectList()}
            </div>
        </div>
    );
};

export default CollabArea; 
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { VariableRenderer } from './common/VariableRenderer';

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
        const showNavigation = content.length > 1;

        return (
            <div className="h-full flex flex-col">
                {/* Navigation controls - only show if there are multiple items */}
                {showNavigation && (
                    <div className="flex-none flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Item {currentIndex + 1} of {content.length}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === content.length - 1}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Content area */}
                <div className="flex-1 overflow-auto">
                    <div className="h-full p-6">
                        <VariableRenderer
                            value={currentItem}
                            useEnhancedJsonView={true}
                            maxTextLength={1000}
                            maxArrayItems={20}
                            maxArrayItemLength={500}
                            className="h-full"
                        />
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
            <div className="flex-1 overflow-hidden">
                {/* Content will be rendered here based on type */}
                {type === 'default' && (
                    <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        Select a collaboration type to begin
                    </div>
                )}
                {type === 'workflow' && content && (
                    <div className="h-full">
                        <VariableRenderer
                            value={content}
                            useEnhancedJsonView={true}
                            maxTextLength={1000}
                            maxArrayItems={20}
                            maxArrayItemLength={500}
                            className="h-full"
                        />
                    </div>
                )}
                {type === 'document' && content && (
                    <div className="h-full">
                        <VariableRenderer
                            value={content}
                            useEnhancedJsonView={true}
                            maxTextLength={1000}
                            maxArrayItems={20}
                            maxArrayItemLength={500}
                            className="h-full"
                        />
                    </div>
                )}
                {type === 'code' && content && (
                    <div className="h-full">
                        <VariableRenderer
                            value={content}
                            useEnhancedJsonView={true}
                            maxTextLength={1000}
                            maxArrayItems={20}
                            maxArrayItemLength={500}
                            className="h-full"
                        />
                    </div>
                )}
                {type === 'object-list' && renderObjectList()}
            </div>
        </div>
    );
};

export default CollabArea; 
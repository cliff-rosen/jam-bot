import React from 'react';
import { ToolBrowser } from '@/components/features/tools';
import Dialog from '@/components/common/Dialog';
import { ToolDefinition } from '@/types/tool';

interface ToolBrowserDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ToolBrowserDialog({ isOpen, onClose }: ToolBrowserDialogProps) {
    const handleSelectTool = (tool: ToolDefinition | null) => {
        // For now, just close the dialog when a tool is selected
        // In the future, this could trigger additional actions
        if (tool) {
            console.log('Selected tool:', tool);
            onClose();
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Tool Browser" maxWidth="6xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl h-[80vh] flex flex-col">
                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    <ToolBrowser onSelectTool={handleSelectTool} />
                </div>
            </div>
        </Dialog>
    );
} 
import React from 'react';
import { ToolBrowser } from './common/ToolBrowser';
import Dialog from './common/Dialog';

interface ToolBrowserDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ToolBrowserDialog({ isOpen, onClose }: ToolBrowserDialogProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Tool Browser" maxWidth="6xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl h-[80vh] flex flex-col">
                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    <ToolBrowser />
                </div>
            </div>
        </Dialog>
    );
} 
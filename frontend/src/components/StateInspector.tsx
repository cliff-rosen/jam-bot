import React from 'react';
import { useJamBot } from '@/context/JamBotContext';
import { VariableRenderer } from './common/VariableRenderer';
import Dialog from './common/Dialog';
import { X } from 'lucide-react';

interface StateInspectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function StateInspector({ isOpen, onClose }: StateInspectorProps) {
    const { state } = useJamBot();

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="JamBot State Inspector">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] max-w-4xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold">JamBot State Inspector</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 overflow-auto flex-1">
                    <VariableRenderer value={state} />
                </div>
            </div>
        </Dialog>
    );
} 
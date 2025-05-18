import React from 'react';
import { ItemView as ItemViewType, MissionProposal, Tool } from '../types/index';
import ToolItemView from './ToolItemView';
import ProposedMissionItem from './workspace/ProposedMissionItem';
interface ItemViewProps {
    itemView: ItemViewType;
    tools: Tool[];
    missionProposal: MissionProposal | null;
    onClose: () => void;
}

const ItemView: React.FC<ItemViewProps> = ({
    itemView,
    tools,
    missionProposal,
    onClose
}) => {
    if (!itemView.isOpen) return null;

    return (
        <div className="h-full bg-white dark:bg-[#1e2330] rounded-2xl shadow">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200">{itemView.title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="h-[calc(100vh-12rem)] overflow-y-auto">
                    {itemView.type === 'tools' && (
                        <ToolItemView tools={tools} />
                    )}
                    {itemView.type === 'proposedMission' && (
                        <ProposedMissionItem proposal={missionProposal} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ItemView; 
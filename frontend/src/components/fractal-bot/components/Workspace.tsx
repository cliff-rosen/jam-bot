import React from 'react';
import { FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { Workspace as WorkspaceType, Asset } from '../types';
import ProposedMission from './workspace/ProposedMission';
import ProposedWorkflow from './workspace/ProposedWorkflow';
import StepDetails from './workflow/StepDetails';
import ProgressUpdateView from './workspace/ProgressUpdateView';

interface WorkspaceProps {
    workspace: WorkspaceType;
}

const Workspace: React.FC<WorkspaceProps> = ({ workspace }) => {
    const getStatusIcon = (status: WorkspaceType['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'current':
                return <Clock className="w-5 h-5 text-blue-500" />;
            case 'failed':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <FileText className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusText = (status: WorkspaceType['status']) => {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            case 'current':
                return 'In Progress';
            default:
                return 'Unknown status';
        }
    };

    const getStatusColor = (status: WorkspaceType['status']) => {
        switch (status) {
            case 'completed':
                return 'text-emerald-700 bg-emerald-100';
            case 'failed':
                return 'text-red-700 bg-red-100';
            case 'current':
                return 'text-blue-700 bg-blue-100';
            default:
                return 'text-gray-700 bg-gray-100';
        }
    };

    const renderContent = () => {
        if (!workspace.content) return null;
        switch (workspace.type) {
            case 'proposedMission':
                if (workspace.content.mission) {
                    return <ProposedMission mission={workspace.content.mission} />;
                }
                break;
            case 'proposedWorkflowDesign':
                if (workspace.content.workflow) {
                    return <ProposedWorkflow workflow={workspace.content.workflow} />;
                }
                break;
            case 'stepDetails':
                if (workspace.content.step) {
                    return <StepDetails step={workspace.content.step} />;
                }
                break;
            case 'workflowStepStatus':
                if (workspace.content.text) {
                    return (
                        <div className="mb-4">
                            <p className="text-gray-600 whitespace-pre-wrap">{workspace.content.text}</p>
                        </div>
                    );
                }
                break;
            case 'progressUpdate':
                return (
                    <div className="p-6">
                        {workspace.content?.progressUpdates && (
                            <ProgressUpdateView updates={workspace.content.progressUpdates} />
                        )}
                    </div>
                );
            case 'text':
                if (workspace.content.text) {
                    return (
                        <div className="mb-4">
                            <p className="text-gray-600 whitespace-pre-wrap">{workspace.content.text}</p>
                        </div>
                    );
                }
                break;

            default:
                return <div>Unsupported workspace type</div>;
        }

        return null;
    };

    return (
        <div className="bg-white dark:bg-[#1e2330] rounded-2xl shadow">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Workspace</h2>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-1">{workspace.title}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                        {getStatusIcon(workspace.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(workspace.status)} dark:bg-opacity-20`}>
                            {getStatusText(workspace.status)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 dark:bg-[#1e2330]">
                {renderContent()}

                {workspace.content?.assets && workspace.content.assets.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        {workspace.content.assets.map(asset => (
                            <div key={asset.id} className="p-4 bg-gray-50 dark:bg-[#252b3b] rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">{asset.name}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{asset.type}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Workspace; 
import React from 'react';
import { Clock, CheckCircle, XCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { MissionStatus, HopStatus, ToolExecutionStatus } from '@/types/workflow';

/**
 * STATUS LEVELS - Simple and Clear:
 * 
 * 1. MISSION STATUS (MissionStatus)
 *    - Overall mission state: PENDING → ACTIVE → COMPLETE/FAILED
 *    - Shown as: "Mission: ACTIVE"
 * 
 * 2. HOP STATUS (HopStatus)
 *    - Hop lifecycle state: PROPOSED → READY_TO_RESOLVE → READY_TO_EXECUTE → RUNNING → ALL_HOPS_COMPLETE
 *    - Shown in hop list and details as status badge
 * 
 * 3. EXECUTION STATUS (ExecutionStatus)
 *    - Individual step state: PENDING → RUNNING → COMPLETED/FAILED  
 *    - Shown in step details as status badge
 */

export interface StatusDisplay {
    color: string;
    icon: React.ReactElement;
    text: string;
}

export function getMissionStatusDisplay(status: MissionStatus): StatusDisplay {
    switch (status) {
        case MissionStatus.PROPOSED:
            return {
                color: 'yellow',
                icon: React.createElement(Clock, { className: "w-4 h-4" }),
                text: 'Proposed'
            };
        case MissionStatus.READY_FOR_NEXT_HOP:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Ready for Next Hop'
            };
        case MissionStatus.BUILDING_HOP:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Building Hop'
            };
        case MissionStatus.EXECUTING_HOP:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Executing Hop'
            };
        case MissionStatus.COMPLETED:
            return {
                color: 'green',
                icon: React.createElement(CheckCircle, { className: "w-4 h-4" }),
                text: 'Complete'
            };
        case MissionStatus.FAILED:
            return {
                color: 'red',
                icon: React.createElement(XCircle, { className: "w-4 h-4" }),
                text: 'Failed'
            };
        case MissionStatus.CANCELLED:
            return {
                color: 'gray',
                icon: React.createElement(XCircle, { className: "w-4 h-4" }),
                text: 'Cancelled'
            };
        default:
            return {
                color: 'gray',
                icon: React.createElement(AlertCircle, { className: "w-4 h-4" }),
                text: 'Unknown'
            };
    }
}

export function getHopStatusDisplay(status: HopStatus): StatusDisplay {
    switch (status) {
        case HopStatus.PROPOSED:
            return {
                color: 'yellow',
                icon: React.createElement(Clock, { className: "w-4 h-4" }),
                text: 'Proposed'
            };
        case HopStatus.READY_TO_RESOLVE:
            return {
                color: 'blue',
                icon: React.createElement(AlertCircle, { className: "w-4 h-4" }),
                text: 'Ready to Resolve'
            };
        case HopStatus.READY_TO_EXECUTE:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Ready to Execute'
            };
        case HopStatus.EXECUTING:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Executing'
            };
        case HopStatus.COMPLETED:
            return {
                color: 'green',
                icon: React.createElement(CheckCircle, { className: "w-4 h-4" }),
                text: 'Complete'
            };
        case HopStatus.FAILED:
            return {
                color: 'red',
                icon: React.createElement(XCircle, { className: "w-4 h-4" }),
                text: 'Failed'
            };
        case HopStatus.CANCELLED:
            return {
                color: 'gray',
                icon: React.createElement(XCircle, { className: "w-4 h-4" }),
                text: 'Cancelled'
            };
        default:
            return {
                color: 'gray',
                icon: React.createElement(AlertCircle, { className: "w-4 h-4" }),
                text: 'Unknown'
            };
    }
}

export function getExecutionStatusDisplay(status: ToolExecutionStatus): StatusDisplay {
    switch (status) {
        case ToolExecutionStatus.PROPOSED:
            return {
                color: 'yellow',
                icon: React.createElement(Clock, { className: "w-4 h-4" }),
                text: 'Pending'
            };
        case ToolExecutionStatus.RUNNING:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Running'
            };
        case ToolExecutionStatus.COMPLETED:
            return {
                color: 'green',
                icon: React.createElement(CheckCircle, { className: "w-4 h-4" }),
                text: 'Completed'
            };
        case ToolExecutionStatus.FAILED:
            return {
                color: 'red',
                icon: React.createElement(XCircle, { className: "w-4 h-4" }),
                text: 'Failed'
            };
        default:
            return {
                color: 'gray',
                icon: React.createElement(AlertCircle, { className: "w-4 h-4" }),
                text: 'Unknown'
            };
    }
}

export function getStatusBadgeClass(color: string): string {
    const baseClasses = 'px-2 py-1 rounded text-xs font-medium flex items-center gap-1';
    switch (color) {
        case 'green':
            return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400`;
        case 'yellow':
            return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400`;
        case 'red':
            return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400`;
        case 'blue':
            return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400`;
        default:
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400`;
    }
} 
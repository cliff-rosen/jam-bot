import React from 'react';
import { Clock, CheckCircle, XCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { ExecutionStatus, MissionStatus, HopStatus } from '@/types/workflow';

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
                text: 'Pending'
            };
        case MissionStatus.ACTIVE:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Active'
            };
        case MissionStatus.COMPLETE:
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
        case HopStatus.HOP_PROPOSED:
            return {
                color: 'yellow',
                icon: React.createElement(Clock, { className: "w-4 h-4" }),
                text: 'Proposed'
            };
        case HopStatus.HOP_READY_TO_RESOLVE:
            return {
                color: 'blue',
                icon: React.createElement(AlertCircle, { className: "w-4 h-4" }),
                text: 'Ready to Resolve'
            };
        case HopStatus.HOP_READY_TO_EXECUTE:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Ready to Execute'
            };
        case HopStatus.HOP_RUNNING:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Running'
            };
        case HopStatus.ALL_HOPS_COMPLETE:
            return {
                color: 'green',
                icon: React.createElement(CheckCircle, { className: "w-4 h-4" }),
                text: 'Complete'
            };
        default:
            return {
                color: 'gray',
                icon: React.createElement(AlertCircle, { className: "w-4 h-4" }),
                text: 'Unknown'
            };
    }
}

export function getExecutionStatusDisplay(status: ExecutionStatus): StatusDisplay {
    switch (status) {
        case ExecutionStatus.PENDING:
            return {
                color: 'yellow',
                icon: React.createElement(Clock, { className: "w-4 h-4" }),
                text: 'Pending'
            };
        case ExecutionStatus.RUNNING:
            return {
                color: 'blue',
                icon: React.createElement(PlayCircle, { className: "w-4 h-4" }),
                text: 'Running'
            };
        case ExecutionStatus.COMPLETED:
            return {
                color: 'green',
                icon: React.createElement(CheckCircle, { className: "w-4 h-4" }),
                text: 'Completed'
            };
        case ExecutionStatus.FAILED:
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
import React from 'react';
import { Clock, CheckCircle, XCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { ExecutionStatus, MissionStatus, HopStatus } from '@/types/workflow';

/**
 * STATUS LEVELS - Simple and Clear:
 * 
 * 1. MISSION STATUS (MissionStatus)
 *    - Overall mission state: PENDING → ACTIVE → COMPLETE
 *    - Shown as: "Mission: ACTIVE"
 * 
 * 2. HOP STATUS (ExecutionStatus)
 *    - Individual hop state: PENDING → RUNNING → COMPLETED/FAILED
 *    - Shown in hop list and details directly as status badge
 * 
 * 3. STEP STATUS (ExecutionStatus)
 *    - Individual step state: PENDING → RUNNING → COMPLETED/FAILED  
 *    - Shown in step details as status badge
 * 
 * Note: HopStatus workflow enum is internal system state, not shown to users
 */

export interface StatusDisplay {
    color: string;
    icon: React.ReactElement;
    text: string;
}

// Centralized status display for ExecutionStatus (hops and steps)
export const getExecutionStatusDisplay = (status: ExecutionStatus): StatusDisplay => {
    switch (status) {
        case ExecutionStatus.PENDING:
            return {
                color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
                icon: React.createElement(Clock, { className: 'w-3 h-3' }),
                text: 'PENDING'
            };
        case ExecutionStatus.RUNNING:
            return {
                color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
                icon: React.createElement(PlayCircle, { className: 'w-3 h-3' }),
                text: 'RUNNING'
            };
        case ExecutionStatus.COMPLETED:
            return {
                color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
                icon: React.createElement(CheckCircle, { className: 'w-3 h-3' }),
                text: 'COMPLETED'
            };
        case ExecutionStatus.FAILED:
            return {
                color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
                icon: React.createElement(XCircle, { className: 'w-3 h-3' }),
                text: 'FAILED'
            };
        default:
            return {
                color: 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
                icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }),
                text: 'UNKNOWN'
            };
    }
};

// Centralized status display for MissionStatus
export const getMissionStatusDisplay = (status: MissionStatus): StatusDisplay => {
    switch (status) {
        case MissionStatus.PENDING:
            return {
                color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
                icon: React.createElement(Clock, { className: 'w-3 h-3' }),
                text: 'PENDING'
            };
        case MissionStatus.ACTIVE:
            return {
                color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
                icon: React.createElement(PlayCircle, { className: 'w-3 h-3' }),
                text: 'ACTIVE'
            };
        case MissionStatus.COMPLETE:
            return {
                color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
                icon: React.createElement(CheckCircle, { className: 'w-3 h-3' }),
                text: 'COMPLETE'
            };
        default:
            return {
                color: 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
                icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }),
                text: 'UNKNOWN'
            };
    }
};

// Centralized status display for HopStatus
export const getHopStatusDisplay = (status: HopStatus): StatusDisplay => {
    switch (status) {
        case HopStatus.READY_TO_DESIGN:
            return {
                color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
                icon: React.createElement(Clock, { className: 'w-3 h-3' }),
                text: 'READY TO DESIGN'
            };
        case HopStatus.HOP_PROPOSED:
            return {
                color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
                icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }),
                text: 'HOP PROPOSED'
            };
        case HopStatus.HOP_READY_TO_RESOLVE:
            return {
                color: 'text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
                icon: React.createElement(Clock, { className: 'w-3 h-3' }),
                text: 'READY TO RESOLVE'
            };
        case HopStatus.HOP_READY_TO_EXECUTE:
            return {
                color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
                icon: React.createElement(PlayCircle, { className: 'w-3 h-3' }),
                text: 'READY TO EXECUTE'
            };
        case HopStatus.HOP_RUNNING:
            return {
                color: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
                icon: React.createElement(PlayCircle, { className: 'w-3 h-3' }),
                text: 'RUNNING'
            };
        case HopStatus.ALL_HOPS_COMPLETE:
            return {
                color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
                icon: React.createElement(CheckCircle, { className: 'w-3 h-3' }),
                text: 'ALL COMPLETE'
            };
        default:
            return {
                color: 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
                icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }),
                text: 'UNKNOWN'
            };
    }
};

// Helper function to get simple status badge classes
export const getStatusBadgeClass = (color: string): string => {
    return `px-2 py-0.5 text-xs font-medium rounded-full ${color}`;
};

// Helper function to get status with icon
export const getStatusWithIcon = (color: string, icon: React.ReactElement, text: string): React.ReactElement => {
    return React.createElement('span', {
        className: `${getStatusBadgeClass(color)} flex items-center gap-1`
    }, [icon, text]);
}; 
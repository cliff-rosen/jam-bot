import React from 'react';
import { ProgressUpdate } from '../../types';
import { format } from 'date-fns';

interface ProgressUpdateViewProps {
    updates: ProgressUpdate[];
}

const ProgressUpdateView: React.FC<ProgressUpdateViewProps> = ({ updates }) => {

    return (
        <div className="space-y-4">
            {updates.map((update) => (
                <div
                    key={update.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                            {update.icon && (
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                    <span className="text-lg">{update.icon}</span>
                                </div>
                            )}
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                    {update.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {/* {format(new Date(update.timestamp), 'MMM d, yyyy HH:mm')} */}
                                </p>
                            </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${update.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            update.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                            {update.status}
                        </span>
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        {update.details}
                    </p>
                    {update.progress !== undefined && (
                        <div className="mt-3">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${update.progress}%` }}
                                />
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {update.progress}% complete
                            </p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ProgressUpdateView; 
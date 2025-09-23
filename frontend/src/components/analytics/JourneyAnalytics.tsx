/**
 * Journey Analytics Component
 *
 * Displays analytics data for user journeys and events
 */
import React, { useState, useEffect } from 'react';
import { useSmartSearch2 } from '@/context/SmartSearch2Context';
import { getJourneyAnalytics, type JourneyAnalyticsData } from '@/lib/api/smartSearch2Api';

export function JourneyAnalytics() {
    const { currentJourneyId, journeyStartTime } = useSmartSearch2();
    const [analyticsData, setAnalyticsData] = useState<JourneyAnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        if (!currentJourneyId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getJourneyAnalytics(currentJourneyId);
            setAnalyticsData(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
            setError(errorMessage);
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [currentJourneyId]);

    if (!currentJourneyId) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Journey Analytics</h3>
                <p className="text-gray-500 dark:text-gray-400">No active journey. Start a search to begin tracking.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Journey Analytics</h3>
                <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Journey Analytics</h3>
                <p className="text-red-600 dark:text-red-400">Error: {error}</p>
                <button
                    onClick={fetchAnalytics}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Current Journey Info */}
            <div className="mb-6">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Current Journey</h4>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-4 gap-6 text-sm">
                        <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Journey ID:</span>
                            <p className="text-gray-600 dark:text-gray-400 font-mono text-xs">{currentJourneyId}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Started:</span>
                            <p className="text-gray-600 dark:text-gray-400">{journeyStartTime ? new Date(journeyStartTime).toLocaleString() : 'Unknown'}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Total Events:</span>
                            <p className="text-gray-600 dark:text-gray-400">{analyticsData?.current_journey ? analyticsData.current_journey.event_count : 0}</p>
                        </div>
                        <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                            <p className="text-gray-600 dark:text-gray-400">{analyticsData?.current_journey ? analyticsData.current_journey.duration : '0s'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Events Table */}
            {analyticsData?.current_journey?.events && analyticsData.current_journey.events.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Journey Events</h4>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {analyticsData.current_journey.events.map((event, index) => (
                                        <tr key={`${event.event_id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                {new Date(event.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {event.event_type}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                                                {event.event_id.substring(0, 8)}...
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                {event.event_data && Object.keys(event.event_data).length > 0 ? (
                                                    <details>
                                                        <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                                            View Data ({Object.keys(event.event_data).length} fields)
                                                        </summary>
                                                        <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                                                            {JSON.stringify(event.event_data, null, 2)}
                                                        </pre>
                                                    </details>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">No data</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Journeys */}
            {analyticsData?.recent_journeys && analyticsData.recent_journeys.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Journeys</h4>
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        {analyticsData.recent_journeys.slice(0, 5).map((journey) => (
                            <div key={journey.journey_id} className="p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{journey.journey_id}</p>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">{journey.event_count} events • {journey.duration}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(journey.start_time).toLocaleDateString()}</p>
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{journey.last_event_type}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6 text-center">
                <button
                    onClick={fetchAnalytics}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                    Refresh Analytics
                </button>
            </div>
        </div>
    );
}
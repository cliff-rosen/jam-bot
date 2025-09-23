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
            <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Journey Analytics</h3>
                <p className="text-gray-500">No active journey. Start a search to begin tracking.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Journey Analytics</h3>
                <p className="text-gray-500">Loading analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 rounded-lg">
                <h3 className="text-lg font-semibold text-red-700 mb-2">Journey Analytics</h3>
                <p className="text-red-600">Error: {error}</p>
                <button
                    onClick={fetchAnalytics}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Journey Analytics</h3>

            {/* Current Journey Info */}
            <div className="mb-6">
                <h4 className="font-medium text-gray-600 mb-2">Current Journey</h4>
                <div className="bg-white p-4 rounded border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium">Journey ID:</span>
                            <p className="text-gray-600 font-mono text-xs">{currentJourneyId}</p>
                        </div>
                        <div>
                            <span className="font-medium">Started:</span>
                            <p className="text-gray-600">{journeyStartTime ? new Date(journeyStartTime).toLocaleString() : 'Unknown'}</p>
                        </div>
                        {analyticsData?.current_journey && (
                            <>
                                <div>
                                    <span className="font-medium">Events:</span>
                                    <p className="text-gray-600">{analyticsData.current_journey.event_count}</p>
                                </div>
                                <div>
                                    <span className="font-medium">Duration:</span>
                                    <p className="text-gray-600">{analyticsData.current_journey.duration}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Events */}
            {analyticsData?.current_journey?.events && analyticsData.current_journey.events.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-medium text-gray-600 mb-2">Recent Events</h4>
                    <div className="bg-white rounded border">
                        <div className="max-h-60 overflow-y-auto">
                            {analyticsData.current_journey.events.slice(-10).reverse().map((event, index) => (
                                <div key={`${event.event_id}-${index}`} className="p-3 border-b last:border-b-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-medium text-sm">{event.event_type}</span>
                                            <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                                        </div>
                                        {event.event_data && Object.keys(event.event_data).length > 0 && (
                                            <details className="text-xs">
                                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Data</summary>
                                                <pre className="mt-1 text-gray-600 whitespace-pre-wrap">{JSON.stringify(event.event_data, null, 2)}</pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Journeys */}
            {analyticsData?.recent_journeys && analyticsData.recent_journeys.length > 0 && (
                <div>
                    <h4 className="font-medium text-gray-600 mb-2">Recent Journeys</h4>
                    <div className="bg-white rounded border">
                        {analyticsData.recent_journeys.slice(0, 5).map((journey, index) => (
                            <div key={journey.journey_id} className="p-3 border-b last:border-b-0">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-mono text-xs text-gray-500">{journey.journey_id}</p>
                                        <p className="text-sm">{journey.event_count} events • {journey.duration}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">{new Date(journey.start_time).toLocaleDateString()}</p>
                                        <p className="text-xs font-medium">{journey.last_event_type}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-4 text-center">
                <button
                    onClick={fetchAnalytics}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Refresh Analytics
                </button>
            </div>
        </div>
    );
}
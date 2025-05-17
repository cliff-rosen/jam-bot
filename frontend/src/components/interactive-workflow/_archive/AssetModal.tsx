import React from 'react';
import { Asset } from './types';
import { SAMPLE_ASSET_DATA } from './workflow_data_sample';

interface AssetModalProps {
    asset: Asset | null;
    onClose: () => void;
}

const AssetContent: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case 'question':
            const questionData = SAMPLE_ASSET_DATA.question;
            return (
                <div className="space-y-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {questionData.question}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {questionData.clarification}
                        </p>
                    </div>
                </div>
            );

        case 'list':
            const songData = SAMPLE_ASSET_DATA.songList;
            return (
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                Beatles Songs
                            </h3>
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                                Total: {songData.totalSongs} songs
                            </span>
                        </div>
                        <div className="space-y-4">
                            {songData.albums.map(album => (
                                <div key={album.name} className="border-t border-blue-100 dark:border-blue-800 pt-4 first:border-0 first:pt-0">
                                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 flex justify-between">
                                        {album.name}
                                        <span className="text-gray-500 dark:text-gray-400">{album.year}</span>
                                    </h4>
                                    <ul className="mt-2 space-y-1">
                                        {album.songs.map(song => (
                                            <li key={song} className="text-sm text-gray-600 dark:text-gray-400">
                                                {song}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'database':
            const lyricsData = SAMPLE_ASSET_DATA.lyricsDatabase;
            return (
                <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                Lyrics Database
                            </h3>
                            <div className="text-sm">
                                <span className="text-green-600 dark:text-green-400">{lyricsData.totalProcessed} processed</span>
                                <span className="text-gray-400 dark:text-gray-500 mx-2">•</span>
                                <span className="text-gray-500 dark:text-gray-400">{lyricsData.remainingToProcess} remaining</span>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {lyricsData.sampleEntries.map(entry => (
                                <div key={entry.title} className="border-t border-green-100 dark:border-green-800 pt-4 first:border-0 first:pt-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {entry.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {entry.album} ({entry.year})
                                            </p>
                                        </div>
                                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                            {entry.loveCount} mentions
                                        </span>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded p-3 text-sm text-gray-600 dark:text-gray-400">
                                        {entry.lyrics.map((line, i) => (
                                            <p key={i} className="leading-relaxed">
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'analysis':
            const analysisData = SAMPLE_ASSET_DATA.analysis;
            return (
                <div className="space-y-4">
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                    {analysisData.songsWithLove}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Songs with "love"
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                    {Math.round(analysisData.songsWithLove / analysisData.totalSongs * 100)}%
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Of total songs
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                                    Top Songs
                                </h4>
                                <div className="space-y-2">
                                    {analysisData.topSongs.map(song => (
                                        <div
                                            key={song.title}
                                            className="flex justify-between items-center bg-white dark:bg-gray-800 rounded px-3 py-2"
                                        >
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {song.title}
                                            </span>
                                            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                                {song.count}×
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                                    Usage by Year
                                </h4>
                                <div className="relative h-32">
                                    {analysisData.byYear.map((year, i) => {
                                        const maxCount = Math.max(...analysisData.byYear.map(y => y.count));
                                        const height = (year.count / maxCount) * 100;
                                        return (
                                            <div
                                                key={year.year}
                                                className="absolute bottom-0 bg-orange-200 dark:bg-orange-700/50 rounded-t"
                                                style={{
                                                    left: `${(i / analysisData.byYear.length) * 100}%`,
                                                    width: `${90 / analysisData.byYear.length}%`,
                                                    height: `${height}%`
                                                }}
                                            >
                                                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400">
                                                    {year.count}
                                                </div>
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {year.year}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'result':
            const resultData = SAMPLE_ASSET_DATA.result;
            return (
                <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {resultData.summary}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                            {resultData.details}
                        </p>
                    </div>
                </div>
            );

        default:
            return null;
    }
};

export const AssetModal: React.FC<AssetModalProps> = ({ asset, onClose }) => {
    if (!asset) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl min-h-[60vh] max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className={`
                                flex-shrink-0 w-10 h-10 rounded-lg
                                flex items-center justify-center
                                ${asset.type === 'question' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                                    asset.type === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                        asset.type === 'database' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                            asset.type === 'result' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}
                            `}>
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={asset.icon}
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    {asset.title}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Inspect and interact with this asset
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <AssetContent type={asset.type} />
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 
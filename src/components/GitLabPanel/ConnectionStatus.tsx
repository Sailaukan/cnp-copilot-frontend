import React from 'react';
import { CheckCircle, RefreshCw, Download } from 'lucide-react';

interface ConnectionStatusProps {
    isLoading: boolean;
    importing: boolean;
    selectedFilesCount: number;
    onDisconnect: () => void;
    onRefresh: () => void;
    onImport: () => void;
}

export default function ConnectionStatus({
    isLoading,
    importing,
    selectedFilesCount,
    onDisconnect,
    onRefresh,
    onImport
}: ConnectionStatusProps) {
    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-700">GitLab Connected</span>
                </div>
                <button
                    onClick={onDisconnect}
                    className="px-3 py-1 text-sm text-gray-500 hover:text-red-800 bg-gray-100 hover:bg-red-100 rounded-lg transition-colors"
                >
                    Disconnect
                </button>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
                <button
                    onClick={onImport}
                    disabled={isLoading || importing || selectedFilesCount === 0}
                    className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                    <Download className={`h-4 w-4 ${importing ? 'animate-pulse' : ''}`} />
                    {importing ? 'Importing...' : `Import (${selectedFilesCount})`}
                </button>
            </div>
        </div>
    );
} 
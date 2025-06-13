'use client';

import { useState } from 'react';
import {
    GitBranch,
    Settings,
    RefreshCw,
    Download,
    FileText,
    Folder,
    ExternalLink,
    Loader2,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';

interface GitLabPanelProps {
    onConnect: (repoUrl: string, token: string) => void;
    onDisconnect: () => void;
    onImportFile: (file: FileItem) => void;
    isConnected: boolean;
    files: FileItem[];
    isLoading: boolean;
}

export default function GitLabPanel({
    onConnect,
    onDisconnect,
    onImportFile,
    isConnected,
    files,
    isLoading
}: GitLabPanelProps) {
    const [repoUrl, setRepoUrl] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        if (!repoUrl.trim() || !accessToken.trim()) return;

        setIsConnecting(true);
        try {
            await onConnect(repoUrl.trim(), accessToken.trim());
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        onDisconnect();
        setRepoUrl('');
        setAccessToken('');
    };

    const handleRefresh = () => {
        if (isConnected) {
            // Trigger a refresh of GitLab files
            console.log('Refreshing GitLab files...');
        }
    };

    return (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 h-16">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <GitBranch size={20} className="text-orange-500" />
                        <h2 className="font-semibold text-gray-900">GitLab</h2>
                    </div>
                    {isConnected && (
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh files"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>

            {/* Connection Status */}
            <div className="p-4">
                {isConnected ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-green-800">Connected</span>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            className="text-sm text-green-700 hover:text-green-800 font-medium"
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <AlertCircle size={16} className="text-gray-500" />
                            <span className="text-sm text-gray-600">Not connected</span>
                        </div>

                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Repository URL"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <input
                                type="password"
                                placeholder="Access Token"
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <button
                                onClick={handleConnect}
                                disabled={!repoUrl.trim() || !accessToken.trim() || isConnecting}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                            >
                                {isConnecting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Connecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <GitBranch size={16} />
                                        <span>Connect</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Files List */}
            {isConnected && (
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Repository Files</h3>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={24} className="animate-spin text-gray-400" />
                            </div>
                        ) : files.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm text-gray-500">No files found</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group"
                                    >
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            {file.type === 'folder' ? (
                                                <Folder size={16} className="text-blue-500 flex-shrink-0" />
                                            ) : (
                                                <FileText size={16} className="text-gray-500 flex-shrink-0" />
                                            )}
                                            <span className="text-sm text-gray-700 truncate">
                                                {file.name}
                                            </span>
                                        </div>

                                        {file.type === 'file' && (
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onImportFile(file)}
                                                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Import file"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    onClick={() => window.open(file.path, '_blank')}
                                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                                    title="View in GitLab"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="p-3 h-10 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                    {isConnected ? (
                        <span>Synced with GitLab</span>
                    ) : (
                        <span>Connect to sync files</span>
                    )}
                </div>
            </div>
        </div>
    );
} 
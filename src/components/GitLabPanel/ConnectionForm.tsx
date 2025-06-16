import React from 'react';
import { GitBranch, Loader2 } from 'lucide-react';

interface ConnectionFormProps {
    repoUrl: string;
    setRepoUrl: (url: string) => void;
    accessToken: string;
    setAccessToken: (token: string) => void;
    isConnecting: boolean;
    onConnect: () => void;
}

export default function ConnectionForm({
    repoUrl,
    setRepoUrl,
    accessToken,
    setAccessToken,
    isConnecting,
    onConnect
}: ConnectionFormProps) {
    return (
        <div className="p-4 space-y-3">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">GitLab Repository</span>
                </div>
                <input
                    type="text"
                    placeholder="GitLab Repository URL"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">Access Token</span>
                </div>
                <input
                    type="password"
                    placeholder="Access Token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                    onClick={onConnect}
                    disabled={!repoUrl.trim() || !accessToken.trim() || isConnecting}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                    {isConnecting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            <GitBranch className="h-4 w-4" />
                            Connect
                        </>
                    )}
                </button>
            </div>
        </div>
    );
} 
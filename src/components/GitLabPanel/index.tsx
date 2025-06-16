'use client';

import React, { useState, useEffect } from 'react';
import { GitBranch, X } from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';
import { motion } from 'framer-motion';

import ConnectionForm from './ConnectionForm';
import FileSelectionControls from './FileSelectionControls';
import FileTree from './FileTree';
import ImportProgress from './ImportProgress';
import ConnectionStatus from './ConnectionStatus';
import { useGitLabConnection } from './hooks/useGitLabConnection';
import { useFileSelection } from './hooks/useFileSelection';
import { useFileImport } from './hooks/useFileImport';

interface GitLabPanelProps {
    onConnect?: (repoUrl: string, token: string) => void;
    onDisconnect?: () => void;
    onImportFile: (file: FileItem) => void;
    onTogglePanel?: () => void;
}

export default function GitLabPanel({
    onConnect,
    onDisconnect,
    onImportFile,
    onTogglePanel
}: GitLabPanelProps) {
    const {
        repoUrl,
        setRepoUrl,
        accessToken,
        setAccessToken,
        isConnecting,
        isConnected,
        connectionError,
        files,
        isLoading,
        expandedFolders,
        setExpandedFolders,
        handleConnect,
        handleDisconnect,
        handleRefresh
    } = useGitLabConnection(onConnect, onDisconnect);

    const {
        selectedFiles,
        handleSelectAll,
        handleDeselectAll,
        toggleFileSelection,
        getSelectedFilesData,
        totalFiles,
        selectedCount
    } = useFileSelection(files);

    const {
        importing,
        importProgress,
        showImportProgress,
        handleImportFiles
    } = useFileImport(repoUrl, accessToken, getSelectedFilesData, onImportFile);

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 h-14">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-md font-semibold text-gray-900">
                        <GitBranch className="h-5 w-5" />
                        GitLab Repository
                    </h3>
                    {onTogglePanel && (
                        <button
                            onClick={onTogglePanel}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Hide GitLab Panel (Ctrl+G)"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Connection Error */}
                {connectionError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded-md mx-4 mt-4"
                    >
                        <p className="text-sm text-red-600">{connectionError}</p>
                    </motion.div>
                )}

                {/* File Selection Controls */}
                {isConnected && files.length > 0 && (
                    <FileSelectionControls
                        selectedCount={selectedCount}
                        totalFiles={totalFiles}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={handleDeselectAll}
                    />
                )}

                {/* Import Progress */}
                <ImportProgress
                    showImportProgress={showImportProgress}
                    importProgress={importProgress}
                />

                {/* Files List */}
                <FileTree
                    isConnected={isConnected}
                    isLoading={isLoading}
                    files={files}
                    expandedFolders={expandedFolders}
                    selectedFiles={selectedFiles}
                    onToggleFolder={(folderId: string) => {
                        const newExpanded = new Set(expandedFolders);
                        if (newExpanded.has(folderId)) {
                            newExpanded.delete(folderId);
                        } else {
                            newExpanded.add(folderId);
                        }
                        setExpandedFolders(newExpanded);
                    }}
                    onToggleFileSelection={toggleFileSelection}
                />
            </div>

            {/* Bottom Panel - Connection Controls */}
            <div className="flex-shrink-0 border-t border-gray-200">
                {!isConnected ? (
                    <ConnectionForm
                        repoUrl={repoUrl}
                        setRepoUrl={setRepoUrl}
                        accessToken={accessToken}
                        setAccessToken={setAccessToken}
                        isConnecting={isConnecting}
                        onConnect={handleConnect}
                    />
                ) : (
                    <ConnectionStatus
                        isLoading={isLoading}
                        importing={importing}
                        selectedFilesCount={selectedFiles.size}
                        onDisconnect={handleDisconnect}
                        onRefresh={handleRefresh}
                        onImport={handleImportFiles}
                    />
                )}

                {/* Footer */}
                <div className="text-xs text-gray-500 text-center py-2 border-t border-gray-200 bg-gray-50 h-12">
                    {files.length > 0 && (
                        <span>
                            {totalFiles} files available
                            {selectedFiles.size > 0 && ` • ${selectedFiles.size} selected`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
} 
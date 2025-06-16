'use client';

import React, { useState, useEffect } from 'react';
import {
    GitBranch,
    Settings,
    RefreshCw,
    Download,
    FileText,
    Folder,
    FolderOpen,
    ExternalLink,
    Loader2,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    ChevronDown,
    Plus,
    File
} from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';
import { motion, AnimatePresence } from 'framer-motion';

interface GitLabPanelProps {
    onConnect?: (repoUrl: string, token: string) => void;
    onDisconnect?: () => void;
    onImportFile: (file: FileItem) => void;
}

interface ImportStatus {
    fileName: string;
    status: 'pending' | 'importing' | 'success' | 'error';
    error?: string;
}

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function GitLabPanel({
    onConnect,
    onDisconnect,
    onImportFile
}: GitLabPanelProps) {
    const [repoUrl, setRepoUrl] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<ImportStatus[]>([]);
    const [showImportProgress, setShowImportProgress] = useState(false);

    // Fetch files when connected
    useEffect(() => {
        if (isConnected) {
            handleRefresh();
        }
    }, [isConnected]);

    // Transform flat file list to hierarchical structure
    const buildFileTree = (flatFiles: any[]): FileItem[] => {
        const tree: FileItem[] = [];
        const pathMap = new Map<string, FileItem>();

        // Sort files to ensure folders come before their contents
        const sortedFiles = flatFiles.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.path.localeCompare(b.path);
        });

        sortedFiles.forEach((file) => {
            const pathParts = file.path.split('/').filter(Boolean);
            const fileName = pathParts[pathParts.length - 1];

            const fileItem: FileItem = {
                id: file.id,
                name: fileName,
                path: file.path,
                type: file.type,
                size: file.size,
                children: file.type === 'folder' ? [] : undefined
            };

            pathMap.set(file.path, fileItem);

            if (pathParts.length === 1) {
                // Root level file/folder
                tree.push(fileItem);
            } else {
                // Find or create parent folders
                let currentPath = '';
                let currentLevel = tree;

                for (let i = 0; i < pathParts.length - 1; i++) {
                    currentPath += (currentPath ? '/' : '') + pathParts[i];

                    let parentFolder = pathMap.get(currentPath);
                    if (!parentFolder) {
                        // Create missing parent folder
                        parentFolder = {
                            id: `folder-${currentPath}`,
                            name: pathParts[i],
                            path: currentPath,
                            type: 'folder',
                            children: []
                        };
                        pathMap.set(currentPath, parentFolder);
                        currentLevel.push(parentFolder);
                    }

                    currentLevel = parentFolder.children!;
                }

                // Add the file to its parent folder
                currentLevel.push(fileItem);
            }
        });

        return tree;
    };

    const handleConnect = async () => {
        if (!repoUrl.trim() || !accessToken.trim()) return;

        setIsConnecting(true);
        setConnectionError(null);

        try {
            // For now, we'll just set connected state and let refresh handle the API call
            setIsConnected(true);
            console.log('✅ Connected to GitLab');

            // Call parent callback if provided (for backward compatibility)
            if (onConnect) {
                await onConnect(repoUrl.trim(), accessToken.trim());
            }
        } catch (error) {
            console.error('❌ GitLab connection failed:', error);
            setConnectionError(error instanceof Error ? error.message : 'Connection failed');
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setIsConnected(false);
            setRepoUrl('');
            setAccessToken('');
            setConnectionError(null);
            setFiles([]);
            setExpandedFolders(new Set());
            console.log('✅ Disconnected from GitLab');

            // Call parent callback if provided (for backward compatibility)
            if (onDisconnect) {
                onDisconnect();
            }
        } catch (error) {
            console.error('❌ GitLab disconnection failed:', error);
            setConnectionError(error instanceof Error ? error.message : 'Disconnection failed');
        }
    };

    const handleRefresh = async () => {
        if (!repoUrl || !accessToken) {
            setConnectionError('Please provide both repository URL and access token');
            return;
        }

        setIsLoading(true);
        setConnectionError(null);

        try {
            const response = await fetch('/api/gitlab/files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    repoUrl,
                    accessToken,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }

            const data = await response.json();
            const fileTree = buildFileTree(data.files);
            setFiles(fileTree);
        } catch (err) {
            setConnectionError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileImport = async (file: FileItem) => {
        if (file.type !== 'file') return;

        setIsImporting(file.id);
        try {
            // Create FileItem with content for backward compatibility
            const fileWithContent: FileItem = {
                ...file,
                content: file.content || ''
            };

            console.log(`✅ Successfully imported file: ${file.name}`);
            onImportFile(fileWithContent);
        } catch (error) {
            console.error('❌ Failed to import file:', error);
            setConnectionError(error instanceof Error ? error.message : 'Failed to import file');
        } finally {
            setIsImporting(null);
        }
    };

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const getFileIcon = (file: FileItem) => {
        if (file.type === 'folder') {
            return <Folder size={16} className="text-blue-500 flex-shrink-0" />;
        }

        // Different icons for different file types
        const extension = file.name.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'md':
                return <FileText size={16} className="text-green-600 flex-shrink-0" />;
            case 'js':
            case 'ts':
            case 'jsx':
            case 'tsx':
                return <FileText size={16} className="text-yellow-600 flex-shrink-0" />;
            case 'py':
                return <FileText size={16} className="text-blue-600 flex-shrink-0" />;
            case 'json':
                return <FileText size={16} className="text-orange-600 flex-shrink-0" />;
            case 'css':
            case 'scss':
            case 'sass':
                return <FileText size={16} className="text-pink-600 flex-shrink-0" />;
            case 'html':
            case 'htm':
                return <FileText size={16} className="text-red-600 flex-shrink-0" />;
            default:
                return <FileText size={16} className="text-gray-500 flex-shrink-0" />;
        }
    };

    const countAllFiles = (fileList: FileItem[]): number => {
        return fileList.reduce((count, file) => {
            if (file.type === 'file') {
                return count + 1;
            } else if (file.children) {
                return count + countAllFiles(file.children);
            }
            return count;
        }, 0);
    };

    const getAllFiles = (nodes: FileItem[]): FileItem[] => {
        const allFiles: FileItem[] = [];

        const traverse = (nodes: FileItem[]) => {
            for (const node of nodes) {
                if (node.type === 'file') {
                    allFiles.push(node);
                } else if (node.children) {
                    traverse(node.children);
                }
            }
        };

        traverse(nodes);
        return allFiles;
    };

    const extractRepoName = (url: string): string => {
        try {
            const match = url.match(/\/([^\/]+)(?:\.git)?$/);
            return match ? match[1] : 'imported-repo';
        } catch {
            return 'imported-repo';
        }
    };

    const handleImportFiles = async () => {
        if (files.length === 0) {
            setConnectionError('No files to import. Please refresh the file list first.');
            return;
        }

        setImporting(true);
        setShowImportProgress(true);
        setConnectionError(null);

        const allFiles = getAllFiles(files);
        const repoName = extractRepoName(repoUrl);

        // Initialize progress tracking
        const initialProgress: ImportStatus[] = allFiles.map(file => ({
            fileName: file.name,
            status: 'pending'
        }));
        setImportProgress(initialProgress);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];

            // Update status to importing
            setImportProgress(prev => prev.map((item, index) =>
                index === i ? { ...item, status: 'importing' } : item
            ));

            try {
                // Fetch file content if not already available
                let content = file.content;
                if (!content) {
                    const contentResponse = await fetch('/api/gitlab/file-content', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            repoUrl,
                            accessToken,
                            filePath: file.path,
                        }),
                    });

                    if (contentResponse.ok) {
                        const contentData = await contentResponse.json();
                        content = contentData.content;
                    }
                }

                // Import the file
                const importResponse = await fetch('/api/docs/import-gitlab', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileName: file.name,
                        filePath: file.path,
                        content: content || '',
                        repoName,
                    }),
                });

                if (importResponse.ok) {
                    setImportProgress(prev => prev.map((item, index) =>
                        index === i ? { ...item, status: 'success' } : item
                    ));
                    successCount++;
                } else {
                    const errorData = await importResponse.json();
                    setImportProgress(prev => prev.map((item, index) =>
                        index === i ? {
                            ...item,
                            status: 'error',
                            error: errorData.error || 'Import failed'
                        } : item
                    ));
                    errorCount++;
                }
            } catch (err) {
                setImportProgress(prev => prev.map((item, index) =>
                    index === i ? {
                        ...item,
                        status: 'error',
                        error: err instanceof Error ? err.message : 'Unknown error'
                    } : item
                ));
                errorCount++;
            }

            // Add a small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        setImporting(false);

        // Show completion message
        if (errorCount === 0) {
            setConnectionError(null);
        } else {
            setConnectionError(`Import completed with ${errorCount} errors out of ${allFiles.length} files.`);
        }

        // Auto-hide progress after 3 seconds if all successful
        if (errorCount === 0) {
            setTimeout(() => {
                setShowImportProgress(false);
                setImportProgress([]);
            }, 3000);
        }
    };

    const renderFileNode = (node: FileItem, depth = 0) => {
        const isExpanded = expandedFolders.has(node.id);
        const isImportingThis = isImporting === node.id;

        return (
            <div key={node.id}>
                <motion.div
                    className={`group flex items-center space-x-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-lg mx-2 transition-colors duration-150 text-gray-700`}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                    onClick={() => {
                        if (node.type === 'folder') {
                            toggleFolder(node.id);
                        }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {node.type === 'folder' ? (
                        <>
                            <motion.div
                                className="transform transition-transform duration-200 ease-in-out"
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronRight size={16} className="text-gray-400" />
                            </motion.div>
                            <div className="transition-colors duration-150">
                                {isExpanded ? (
                                    <FolderOpen size={16} className="text-blue-500" />
                                ) : (
                                    <Folder size={16} className="text-blue-500" />
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-4" />
                            {getFileIcon(node)}
                        </>
                    )}
                    <span className="flex-1 truncate" title={node.path}>
                        {node.name}
                    </span>
                    {node.size && node.type === 'file' && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full border">
                            {Math.round(node.size / 1024)}KB
                        </span>
                    )}

                    {/* Action buttons for files */}
                    {node.type === 'file' && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity duration-150">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileImport(node);
                                }}
                                disabled={isImportingThis}
                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                title="Import file"
                            >
                                {isImportingThis ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Download size={14} />
                                )}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const gitlabUrl = `${repoUrl}/-/blob/main/${node.path}`;
                                    window.open(gitlabUrl, '_blank');
                                }}
                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                title="View in GitLab"
                            >
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Animated folder content */}
                <AnimatePresence>
                    {node.type === 'folder' && node.children && isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                        >
                            {node.children.map(child => renderFileNode(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const getStatusIcon = (status: ImportStatus['status']) => {
        switch (status) {
            case 'pending':
                return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
            case 'importing':
                return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white">
            <div className="flex-shrink-0 p-4 border-b border-gray-200 h-16">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <GitBranch className="h-5 w-5" />
                    GitLab Repository
                </h3>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {connectionError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded-md mx-4 mt-4"
                    >
                        <p className="text-sm text-red-600">{connectionError}</p>
                    </motion.div>
                )}

                {/* Import Progress */}
                <AnimatePresence>
                    {showImportProgress && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border rounded-md p-3 bg-gray-50 mx-4 mt-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Download className="h-4 w-4" />
                                <span className="text-sm font-medium">Import Progress</span>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {importProgress.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center gap-2 text-xs"
                                    >
                                        {getStatusIcon(item.status)}
                                        <span className="flex-1 truncate">{item.fileName}</span>
                                        {item.error && (
                                            <span className="text-red-500 text-xs">{item.error}</span>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Files List */}
                <div className="flex-1 overflow-y-auto">
                    {isConnected ? (
                        isLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        ) : files.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-1 py-2"
                            >
                                {files.map(file => renderFileNode(file))}
                            </motion.div>
                        ) : (
                            <div className="flex items-center justify-center h-32 text-gray-500">
                                <p className="text-sm">No files loaded. Click refresh to load repository files.</p>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            <p className="text-sm">Connect to GitLab</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Panel - Connection Controls */}
            <div className="flex-shrink-0 border-t border-gray-200">
                {!isConnected ? (
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
                                onClick={handleConnect}
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
                ) : (
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <CheckCircle size={16} className="text-green-600" />
                                <span className="text-sm font-medium text-gray-700">Connected</span>
                            </div>
                            <button
                                onClick={handleDisconnect}
                                className="px-3 py-1 text-sm text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={isLoading || importing}
                                className="flex-1 flex items-center justify-center gap-2 p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <button
                                onClick={handleImportFiles}
                                disabled={isLoading || importing || files.length === 0}
                                className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                <Plus className={`h-4 w-4 ${importing ? 'animate-pulse' : ''}`} />
                                {importing ? 'Adding...' : 'Add to Docs'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-xs text-gray-500 text-center py-2 border-t border-gray-200 bg-gray-50">
                    {files.length > 0 && (
                        <span>{countAllFiles(files)} files available</span>
                    )}
                </div>
            </div>
        </div>
    );
} 
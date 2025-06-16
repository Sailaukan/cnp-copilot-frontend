import { useState, useEffect } from 'react';
import { FileItem } from '@/utils/fileSystem';

export function useGitLabConnection(
    onConnect?: (repoUrl: string, token: string) => void,
    onDisconnect?: () => void
) {
    const [repoUrl, setRepoUrl] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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

    return {
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
    };
} 
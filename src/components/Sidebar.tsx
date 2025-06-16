'use client';

import { useState, useEffect, useRef } from 'react';
import {
    FileText,
    Folder,
    FolderOpen,
    Plus,
    MoreHorizontal,
    ChevronRight,
    ChevronDown,
    Trash2
} from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';

interface SidebarProps {
    files: FileItem[];
    selectedFile: FileItem | null;
    onFileSelect: (file: FileItem) => void;
    onFileCreate: (name: string, type: 'file' | 'folder', parentPath?: string) => void;
    onFileDelete: (file: FileItem) => void;
    onFolderExpand?: (folderId: string) => void;
}

export default function Sidebar({
    files,
    selectedFile,
    onFileSelect,
    onFileCreate,
    onFileDelete,
    onFolderExpand
}: SidebarProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createType, setCreateType] = useState<'file' | 'folder'>('file');
    const [createName, setCreateName] = useState('');
    const [createParentPath, setCreateParentPath] = useState<string | undefined>();
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [showFolderCreateMenu, setShowFolderCreateMenu] = useState<string | null>(null);
    const createMenuRef = useRef<HTMLDivElement>(null);
    const folderCreateMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Function to count all files recursively
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
                setShowCreateMenu(false);
            }

            // Check if click is outside any folder dropdown
            if (showFolderCreateMenu) {
                const currentRef = folderCreateMenuRefs.current[showFolderCreateMenu];
                if (currentRef && !currentRef.contains(event.target as Node)) {
                    setShowFolderCreateMenu(null);
                }
            }
        };

        if (showCreateMenu || showFolderCreateMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showCreateMenu, showFolderCreateMenu]);

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const handleCreate = (type: 'file' | 'folder', parentPath?: string) => {
        setCreateParentPath(parentPath);
        setCreateType(type);
        setCreateName('');
        setShowCreateDialog(true);
    };

    const handleCreateSubmit = () => {
        if (createName.trim()) {
            const name = createType === 'file' && !createName.endsWith('.md')
                ? `${createName}.md`
                : createName;

            // If creating inside a folder, expand that folder
            if (createParentPath) {
                const findFolderIdByPath = (fileList: FileItem[], targetPath: string): string | null => {
                    for (const file of fileList) {
                        if (file.path === targetPath && file.type === 'folder') {
                            return file.id;
                        }
                        if (file.children) {
                            const found = findFolderIdByPath(file.children, targetPath);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const parentFolderId = findFolderIdByPath(files, createParentPath);
                if (parentFolderId) {
                    setExpandedFolders(prev => new Set([...Array.from(prev), parentFolderId]));
                    onFolderExpand?.(parentFolderId);
                }
            }

            onFileCreate(name, createType, createParentPath);
            setShowCreateDialog(false);
            setCreateName('');
        }
    };

    const handleDeleteFile = (file: FileItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
            onFileDelete(file);
        }
    };

    const getFileIcon = (file: FileItem) => {
        if (file.type === 'folder') {
            return null; // Folders are handled separately
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
            case 'mjs':
            case 'cjs':
                return <FileText size={16} className="text-yellow-500 flex-shrink-0" />;
            case 'txt':
            case 'log':
                return <FileText size={16} className="text-gray-600 flex-shrink-0" />;
            default:
                return <FileText size={16} className="text-gray-500 flex-shrink-0" />;
        }
    };

    const renderFileNode = (node: FileItem, depth = 0) => {
        const isExpanded = expandedFolders.has(node.id);
        const isSelected = selectedFile?.path === node.path;
        const isFolderMenuOpen = showFolderCreateMenu === node.id;

        return (
            <div key={node.id}>
                <div
                    className={`group flex items-center space-x-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-lg mx-2 transition-colors duration-150 ${isSelected ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-gray-700'
                        }`}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                    onClick={() => {
                        if (node.type === 'folder') {
                            toggleFolder(node.id);
                        } else {
                            onFileSelect(node);
                        }
                    }}
                >
                    {node.type === 'folder' ? (
                        <>
                            <div className={`transform transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                <ChevronRight size={16} className="text-gray-400" />
                            </div>
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
                    <span className="flex-1 truncate">{node.name}</span>

                    {/* Action buttons */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity duration-150">
                        {node.type === 'folder' && (
                            <div
                                className="relative"
                                ref={(el) => {
                                    folderCreateMenuRefs.current[node.id] = el;
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFolderCreateMenu(isFolderMenuOpen ? null : node.id);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors duration-150"
                                    title="Add item"
                                >
                                    <Plus size={12} />
                                </button>

                                {/* Folder Create Menu Dropdown */}
                                {isFolderMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[100px] animate-in fade-in-0 zoom-in-95 duration-100">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCreate('file', node.path);
                                                setShowFolderCreateMenu(null);
                                            }}
                                            className="w-full px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center space-x-1.5 first:rounded-t-lg transition-colors duration-150"
                                        >
                                            <FileText size={12} />
                                            <span>File</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCreate('folder', node.path);
                                                setShowFolderCreateMenu(null);
                                            }}
                                            className="w-full px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center space-x-1.5 last:rounded-b-lg border-t border-gray-100 transition-colors duration-150"
                                        >
                                            <Folder size={12} />
                                            <span>Folder</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={(e) => handleDeleteFile(node, e)}
                            className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600 transition-colors duration-150"
                            title="Delete"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>

                {/* Animated folder content */}
                {node.type === 'folder' && node.children && (
                    <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded
                            ? 'opacity-100'
                            : 'max-h-0 opacity-0'
                            }`}
                        style={{
                            transitionProperty: 'max-height, opacity',
                            maxHeight: isExpanded ? 'none' : '0'
                        }}
                    >
                        <div className={`transform transition-transform duration-300 ease-in-out ${isExpanded ? 'translate-y-0' : '-translate-y-2'
                            }`}>
                            {node.children.map(child => renderFileNode(child, depth + 1))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* File Tree */}
            <div className="flex-1 overflow-y-auto py-2">
                {files.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        <FileText size={48} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No documentation files</p>
                        <button
                            onClick={() => setShowCreateMenu(true)}
                            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-150 hover:underline"
                        >
                            Create your first document
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {files.map(file => renderFileNode(file))}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            {showCreateDialog && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-80">
                        <h3 className="text-lg font-semibold mb-4">
                            Create New {createType === 'file' ? 'File' : 'Folder'}
                        </h3>
                        <input
                            type="text"
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder={createType === 'file' ? 'Enter file name' : 'Enter folder name'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateSubmit()}
                            autoFocus
                        />
                        {createType === 'file' && (
                            <p className="text-xs text-gray-500 mt-1">
                                .md extension will be added automatically
                            </p>
                        )}
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => setShowCreateDialog(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"

                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={!createName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer with Add Button */}
            <div className="h-12 p-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                    <span>Files: {countAllFiles(files)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={createMenuRef}>
                        <button
                            onClick={() => setShowCreateMenu(!showCreateMenu)}
                            className="p-1.5 hover:text-blue-800 hover:bg-blue-200 rounded-lg transition-all duration-150 hover:scale-105 flex items-center gap-1 bg-blue-600 px-2 py-1 text-white"
                            title="Create new item"
                        >
                            <Plus size={18} />
                            <span className="text-sm">Create</span>
                        </button>

                        {/* Create Menu Dropdown */}
                        {showCreateMenu && (
                            <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px] animate-in fade-in-0 zoom-in-95 duration-150">
                                <button
                                    onClick={() => {
                                        handleCreate('file');
                                        setShowCreateMenu(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-md text-gray-700 hover:bg-gray-50 flex items-center space-x-2 first:rounded-t-lg transition-colors duration-150"
                                >
                                    <FileText size={14} />
                                    <span>File</span>
                                </button>
                                <button
                                    onClick={() => {
                                        handleCreate('folder');
                                        setShowCreateMenu(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-md text-gray-700 hover:bg-gray-50 flex items-center space-x-2 last:rounded-b-lg border-t border-gray-100 transition-colors duration-150"
                                >
                                    <Folder size={14} />
                                    <span>Folder</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
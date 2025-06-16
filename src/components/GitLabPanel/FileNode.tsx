import React from 'react';
import {
    FileText,
    Folder,
    FolderOpen,
    ChevronRight,
    Square,
    CheckSquare
} from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';
import { motion, AnimatePresence } from 'framer-motion';

interface FileNodeProps {
    node: FileItem;
    depth: number;
    expandedFolders: Set<string>;
    selectedFiles: Set<string>;
    onToggleFolder: (folderId: string) => void;
    onToggleFileSelection: (fileId: string, filePath: string, fileType: string) => void;
}

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

export default function FileNode({
    node,
    depth,
    expandedFolders,
    selectedFiles,
    onToggleFolder,
    onToggleFileSelection
}: FileNodeProps) {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedFiles.has(node.id);

    return (
        <div>
            <motion.div
                className={`group flex items-center space-x-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-lg mx-2 transition-colors duration-150 text-gray-700 ${isSelected && node.type === 'file' ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => {
                    if (node.type === 'folder') {
                        onToggleFolder(node.id);
                    } else {
                        onToggleFileSelection(node.id, node.path, node.type);
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
                        <div className="w-4 flex items-center justify-center">
                            {isSelected ? (
                                <CheckSquare size={16} className="text-blue-600" />
                            ) : (
                                <Square size={16} className="text-gray-400 hover:text-blue-600" />
                            )}
                        </div>
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
                        {node.children.map(child => (
                            <FileNode
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                expandedFolders={expandedFolders}
                                selectedFiles={selectedFiles}
                                onToggleFolder={onToggleFolder}
                                onToggleFileSelection={onToggleFileSelection}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 
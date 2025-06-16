import React from 'react';
import { Loader2 } from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';
import { motion } from 'framer-motion';
import FileNode from './FileNode';

interface FileTreeProps {
    isConnected: boolean;
    isLoading: boolean;
    files: FileItem[];
    expandedFolders: Set<string>;
    selectedFiles: Set<string>;
    onToggleFolder: (folderId: string) => void;
    onToggleFileSelection: (fileId: string, filePath: string, fileType: string) => void;
}

export default function FileTree({
    isConnected,
    isLoading,
    files,
    expandedFolders,
    selectedFiles,
    onToggleFolder,
    onToggleFileSelection
}: FileTreeProps) {
    if (!isConnected) {
        return (
            <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-center h-64 text-gray-500">
                    <p className="text-sm">Connect to GitLab</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-center h-32 text-gray-500">
                    <p className="text-sm">No files loaded. Click refresh to load repository files.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-1 py-2"
            >
                {files.map(file => (
                    <FileNode
                        key={file.id}
                        node={file}
                        depth={0}
                        expandedFolders={expandedFolders}
                        selectedFiles={selectedFiles}
                        onToggleFolder={onToggleFolder}
                        onToggleFileSelection={onToggleFileSelection}
                    />
                ))}
            </motion.div>
        </div>
    );
} 
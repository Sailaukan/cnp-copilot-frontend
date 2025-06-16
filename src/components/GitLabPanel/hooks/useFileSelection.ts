import { useState, useEffect, useMemo } from 'react';
import { FileItem } from '@/utils/fileSystem';

export function useFileSelection(files: FileItem[]) {
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

    // Clear selected files when files change
    useEffect(() => {
        setSelectedFiles(new Set());
    }, [files]);

    const toggleFileSelection = (fileId: string, filePath: string, fileType: string) => {
        if (fileType === 'folder') return; // Don't allow folder selection

        const newSelected = new Set(selectedFiles);
        if (newSelected.has(fileId)) {
            newSelected.delete(fileId);
        } else {
            newSelected.add(fileId);
        }
        setSelectedFiles(newSelected);
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

    const handleSelectAll = () => {
        const allFiles = getAllFiles(files);
        const allFileIds = allFiles.map(file => file.id);
        setSelectedFiles(new Set(allFileIds));
    };

    const handleDeselectAll = () => {
        setSelectedFiles(new Set());
    };

    const getSelectedFilesData = (): FileItem[] => {
        const allFiles = getAllFiles(files);
        return allFiles.filter(file => selectedFiles.has(file.id));
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

    const totalFiles = useMemo(() => countAllFiles(files), [files]);
    const selectedCount = selectedFiles.size;

    return {
        selectedFiles,
        handleSelectAll,
        handleDeselectAll,
        toggleFileSelection,
        getSelectedFilesData,
        totalFiles,
        selectedCount
    };
} 
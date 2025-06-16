import { useState } from 'react';
import { FileItem } from '@/utils/fileSystem';

interface ImportStatus {
    fileName: string;
    status: 'pending' | 'importing' | 'success' | 'error';
    error?: string;
}

export function useFileImport(
    repoUrl: string,
    accessToken: string,
    getSelectedFilesData: () => FileItem[],
    onImportFile: (file: FileItem) => void
) {
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<ImportStatus[]>([]);
    const [showImportProgress, setShowImportProgress] = useState(false);

    const extractRepoName = (url: string): string => {
        try {
            const match = url.match(/\/([^\/]+)(?:\.git)?$/);
            return match ? match[1] : 'imported-repo';
        } catch {
            return 'imported-repo';
        }
    };

    const handleImportFiles = async () => {
        const selectedFilesData = getSelectedFilesData();

        if (selectedFilesData.length === 0) {
            return;
        }

        setImporting(true);
        setShowImportProgress(true);

        const repoName = extractRepoName(repoUrl);

        // Initialize progress tracking
        const initialProgress: ImportStatus[] = selectedFilesData.map(file => ({
            fileName: file.name,
            status: 'pending'
        }));
        setImportProgress(initialProgress);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < selectedFilesData.length; i++) {
            const file = selectedFilesData[i];

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

        // Auto-hide progress after 3 seconds if all successful
        if (errorCount === 0) {
            setTimeout(() => {
                setShowImportProgress(false);
                setImportProgress([]);
            }, 3000);
        }

        // Trigger file list reload in parent component after import completion
        if (successCount > 0) {
            const dummyFile: FileItem = {
                id: 'import-complete',
                name: 'Import Complete',
                path: 'import-complete',
                type: 'file'
            };
            onImportFile(dummyFile);
        }
    };

    return {
        importing,
        importProgress,
        showImportProgress,
        handleImportFiles
    };
} 
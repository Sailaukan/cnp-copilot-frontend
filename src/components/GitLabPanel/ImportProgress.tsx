import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportStatus {
    fileName: string;
    status: 'pending' | 'importing' | 'success' | 'error';
    error?: string;
}

interface ImportProgressProps {
    showImportProgress: boolean;
    importProgress: ImportStatus[];
}

const getFileStatusIcon = (status: string) => {
    switch (status) {
        case 'imported':
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'error':
            return <AlertCircle className="w-4 h-4 text-red-500" />;
        case 'pending':
            return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
        case 'importing':
            return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
        case 'success':
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        default:
            return null;
    }
};

export default function ImportProgress({
    showImportProgress,
    importProgress
}: ImportProgressProps) {
    return (
        <AnimatePresence>
            {showImportProgress && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border rounded-md p-3 bg-gray-50 mx-4 mt-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-4" />
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
                                {getFileStatusIcon(item.status)}
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
    );
} 
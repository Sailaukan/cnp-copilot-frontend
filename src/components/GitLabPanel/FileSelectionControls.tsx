import React from 'react';

interface FileSelectionControlsProps {
    selectedCount: number;
    totalFiles: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}

export default function FileSelectionControls({
    selectedCount,
    totalFiles,
    onSelectAll,
    onDeselectAll
}: FileSelectionControlsProps) {
    return (
        <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                        {selectedCount} of {totalFiles} files selected
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={selectedCount === totalFiles ? onDeselectAll : onSelectAll}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                        {selectedCount === totalFiles ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            </div>
        </div>
    );
} 
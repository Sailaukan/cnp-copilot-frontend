'use client';

import { useState, useEffect } from 'react';
import { FileText, X, Hash } from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';

interface SearchMatch {
    type: 'filename' | 'content';
    line?: number;
    text?: string;
    context?: string;
}

interface SearchResult {
    file: FileItem;
    matches: SearchMatch[];
    score: number;
}

interface SearchResultsProps {
    query: string;
    isVisible: boolean;
    onClose: () => void;
    onFileSelect: (file: FileItem) => void;
}

export default function SearchResults({ query, isVisible, onClose, onFileSelect }: SearchResultsProps) {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (!query.trim() || !isVisible) {
            setResults([]);
            setSelectedIndex(0);
            return;
        }

        const searchFiles = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/docs/search?q=${encodeURIComponent(query)}`);
                if (response.ok) {
                    const searchResults = await response.json();
                    setResults(searchResults);
                    setSelectedIndex(0);
                } else {
                    setError('Failed to search files');
                }
            } catch (err) {
                setError('Error performing search');
                console.error('Search error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search requests
        const timeoutId = setTimeout(searchFiles, 300);
        return () => clearTimeout(timeoutId);
    }, [query, isVisible]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isVisible || results.length === 0) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (results[selectedIndex]) {
                        handleFileClick(results[selectedIndex].file);
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, results, selectedIndex]);

    if (!isVisible) return null;

    const handleFileClick = (file: FileItem) => {
        onFileSelect(file);
        onClose();
    };

    const highlightText = (text: string, searchTerm: string) => {
        if (!searchTerm) return text;

        const regex = new RegExp(`(${searchTerm})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} className="bg-yellow-200 px-1 rounded">
                    {part}
                </mark>
            ) : part
        );
    };

    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                        Search Results
                    </span>
                    {!isLoading && results.length > 0 && (
                        <span className="text-xs text-gray-500">
                            {results.length} result{results.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Searching...</span>
                    </div>
                ) : error ? (
                    <div className="p-4 text-center text-red-600">
                        <p className="text-sm">{error}</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        <p className="text-sm">
                            {query.trim() ? 'No results found' : 'Start typing to search...'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {results.map((result, index) => (
                            <div
                                key={`${result.file.path}-${index}`}
                                className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${selectedIndex === index ? 'bg-gray-100' : ''}`}
                                onClick={() => handleFileClick(result.file)}
                            >
                                {/* File header */}
                                <div className="flex items-center space-x-2 mb-2">
                                    <FileText size={16} className="text-gray-500 flex-shrink-0" />
                                    <span className="font-medium text-gray-900 truncate">
                                        {highlightText(result.file.name, query)}
                                    </span>
                                    <span className="text-xs text-gray-500 truncate">
                                        {result.file.path}
                                    </span>
                                </div>

                                {/* Matches */}
                                <div className="space-y-1">
                                    {result.matches.slice(0, 3).map((match, matchIndex) => (
                                        <div key={matchIndex} className="text-sm">
                                            {match.type === 'filename' ? (
                                                <div className="text-blue-600">
                                                    📄 Filename match
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2 text-gray-600">
                                                        <Hash size={12} />
                                                        <span className="text-xs">
                                                            Line {match.line}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-700 pl-4 border-l-2 border-gray-200">
                                                        {highlightText(match.text || '', query)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {result.matches.length > 3 && (
                                        <div className="text-xs text-gray-500 pl-4">
                                            +{result.matches.length - 3} more match{result.matches.length - 3 !== 1 ? 'es' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {results.length > 0 && (
                <div className="p-2 border-t border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500 text-center">
                        Press Enter to open first result • Click to open specific file
                    </p>
                </div>
            )}
        </div>
    );
} 
'use client';

import { GitBranch, Settings, User, Bell, Search, PanelLeft, PanelRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import SearchResults from './SearchResults';
import { FileItem } from '@/utils/fileSystem';

interface HeaderProps {
    gitlabConnected?: boolean;
    currentBranch?: string;
    onSettingsClick?: () => void;
    onFileSelect?: (file: FileItem) => void;
    isSidebarVisible?: boolean;
    isGitLabPanelVisible?: boolean;
    onToggleSidebar?: () => void;
    onToggleGitLabPanel?: () => void;
}

export default function Header({
    gitlabConnected = false,
    currentBranch,
    onSettingsClick,
    onFileSelect,
    isSidebarVisible = true,
    isGitLabPanelVisible = true,
    onToggleSidebar,
    onToggleGitLabPanel
}: HeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        };

        if (showSearchResults) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSearchResults]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl/Cmd + K to focus search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                searchInputRef.current?.focus();
                setShowSearchResults(true);
            }

            // Ctrl/Cmd + B to toggle sidebar
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                onToggleSidebar?.();
            }

            // Ctrl/Cmd + G to toggle GitLab panel
            if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
                event.preventDefault();
                onToggleGitLabPanel?.();
            }

            // Escape to close search results
            if (event.key === 'Escape' && showSearchResults) {
                setShowSearchResults(false);
                searchInputRef.current?.blur();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showSearchResults, onToggleSidebar, onToggleGitLabPanel]);

    const handleSettingsClick = () => {
        if (onSettingsClick) {
            onSettingsClick();
        } else {
            console.log('Settings clicked');
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        // Show results when user starts typing
        if (value.trim()) {
            setShowSearchResults(true);
        } else {
            setShowSearchResults(false);
        }
    };

    const handleSearchFocus = () => {
        if (searchQuery.trim()) {
            setShowSearchResults(true);
        }
    };

    const handleFileSelect = (file: FileItem) => {
        if (onFileSelect) {
            onFileSelect(file);
        }
        setShowSearchResults(false);
        setSearchQuery('');
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            // This will be handled by the SearchResults component
            // to select the first result
        }
    };

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Logo and Title */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-xl font-semibold text-gray-900">CNP Copilot</h1>
                    </div>

                    {/* GitLab Status */}
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${gitlabConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-gray-600">
                            {gitlabConnected ? 'GitLab Connected' : 'GitLab Disconnected'}
                        </span>
                        {currentBranch && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <GitBranch size={14} />
                                <span>{currentBranch}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-xl mx-8 relative" ref={searchContainerRef}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search documentation... (Ctrl+K)"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={handleSearchFocus}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Search Results */}
                    <SearchResults
                        query={searchQuery}
                        isVisible={showSearchResults}
                        onClose={() => setShowSearchResults(false)}
                        onFileSelect={handleFileSelect}
                    />
                </div>

                {/* Panel Toggle Buttons */}
                <div className="flex items-center space-x-2 mx-4">
                    <button
                        onClick={onToggleSidebar}
                        className={`p-2 rounded-lg transition-colors ${isSidebarVisible
                                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        title={`${isSidebarVisible ? 'Hide' : 'Show'} Sidebar (Ctrl+B)`}
                    >
                        <PanelLeft size={20} />
                    </button>
                    <button
                        onClick={onToggleGitLabPanel}
                        className={`p-2 rounded-lg transition-colors ${isGitLabPanelVisible
                                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        title={`${isGitLabPanelVisible ? 'Hide' : 'Show'} GitLab Panel (Ctrl+G)`}
                    >
                        <PanelRight size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
} 
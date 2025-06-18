'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Loader2, Bot, Eye, EyeOff, PanelLeftOpen, Maximize2, Minimize2, Settings, MoreHorizontal } from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';
import { useEditorLayout, LAYOUT_PRESETS } from '@/utils/useEditorLayout';
import AIChatModal from './AIChatModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface EditorProps {
    file: FileItem | null;
    onContentChange: (content: string) => void;
}

export default function Editor({ file, onContentChange }: EditorProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const [lastSavedContent, setLastSavedContent] = useState('');
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [showLayoutMenu, setShowLayoutMenu] = useState(false);

    // Use the custom layout hook
    const {
        isPreviewVisible,
        panelWidth,
        isDragging,
        isFullscreen,
        togglePreview,
        toggleFullscreen,
        resetLayout,
        setPanelWidth,
        setIsDragging,
    } = useEditorLayout();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const layoutMenuRef = useRef<HTMLDivElement>(null);

    const content = file?.content || '';

    // Check if current file is a markdown file
    const isMarkdownFile = file?.name.toLowerCase().endsWith('.md') || false;

    // Calculate editor statistics
    const getEditorStats = () => {
        const lines = content.split('\n');
        const lineCount = lines.length;
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        const charCount = content.length;
        const charCountNoSpaces = content.replace(/\s/g, '').length;

        return {
            lines: lineCount,
            words: wordCount,
            characters: charCount,
            charactersNoSpaces: charCountNoSpaces
        };
    };

    // Update cursor position
    const updateCursorPosition = () => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            const cursorPos = textarea.selectionStart;
            const textBeforeCursor = content.substring(0, cursorPos);
            const lines = textBeforeCursor.split('\n');
            const line = lines.length;
            const column = lines[lines.length - 1].length + 1;

            setCursorPosition({ line, column });
        }
    };

    // Handle panel resizing
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, [setIsDragging]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !editorContainerRef.current) return;

        const container = editorContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

        setPanelWidth(newWidth);
    }, [isDragging, setPanelWidth]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, [setIsDragging]);

    // Set up global mouse events for resizing
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Close layout menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (layoutMenuRef.current && !layoutMenuRef.current.contains(event.target as Node)) {
                setShowLayoutMenu(false);
            }
        };

        if (showLayoutMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showLayoutMenu]);

    // Update cursor position when content changes or cursor moves
    useEffect(() => {
        updateCursorPosition();
    }, [content]);

    // Initialize last saved content when file changes
    useEffect(() => {
        if (file) {
            setLastSavedContent(file.content || '');
        }
    }, [file]);

    // Autosave functionality - save every 2 minutes
    useEffect(() => {
        if (!file) return;

        const autoSaveInterval = setInterval(() => {
            // Only save if content has changed since last save
            if (content !== lastSavedContent && content.trim() !== '') {
                handleSave(true); // Pass true to indicate this is an autosave
            }
        }, 2 * 60 * 1000); // 2 minutes in milliseconds

        return () => clearInterval(autoSaveInterval);
    }, [file, content, lastSavedContent]);

    const handleContentChange = (newContent: string) => {
        onContentChange(newContent);
    };

    const handleTextareaClick = () => {
        updateCursorPosition();
    };

    const handleTextareaKeyUp = () => {
        updateCursorPosition();
    };

    const handleSave = async (isAutoSave = false) => {
        if (!file) return;

        setIsSaving(true);
        try {
            const response = await fetch('/api/docs/save', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: file.path,
                    content
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save file');
            }

            // Update last saved content on successful save
            setLastSavedContent(content);

            if (!isAutoSave) {
                console.log('File saved successfully');
            } else {
                console.log('File auto-saved successfully');
            }
        } catch (error) {
            console.error('Error saving file:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleApplyContent = (newContent: string) => {
        onContentChange(newContent);
    };

    const applyLayoutPreset = (preset: keyof typeof LAYOUT_PRESETS) => {
        const { panelWidth: newWidth, isPreviewVisible: newPreviewVisible } = LAYOUT_PRESETS[preset];
        setPanelWidth(newWidth);
        if (!newPreviewVisible) {
            // This will be handled by the layout hook
        }
        setShowLayoutMenu(false);
    };

    if (!file) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📄</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No file selected</h3>
                    <p className="text-gray-500">Select a file from the sidebar to start editing</p>
                </div>
            </div>
        );
    }

    const stats = getEditorStats();
    const hasUnsavedChanges = content !== lastSavedContent;

    return (
        <div className={`flex-1 flex flex-col bg-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
            {/* Header */}
            <div className="border-b border-gray-200 px-4 py-3 h-14 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {file.name}
                            {hasUnsavedChanges && <span className="text-orange-500 ml-1">•</span>}
                        </h2>
                        <p className="text-sm text-gray-500">{file.path}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Layout Controls */}
                        {isMarkdownFile && (
                            <div className="flex items-center space-x-1 border-r border-gray-200 pr-3 mr-3">
                                <button
                                    onClick={togglePreview}
                                    className={`p-2 rounded-lg transition-colors ${isPreviewVisible
                                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                        : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                    title={`${isPreviewVisible ? 'Hide' : 'Show'} Preview (⌘⇧P)`}
                                >
                                    {isPreviewVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>

                                <div className="relative" ref={layoutMenuRef}>
                                    <button
                                        onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Layout Options"
                                    >
                                        <Settings size={16} />
                                    </button>

                                    {/* Layout Presets Menu */}
                                    {showLayoutMenu && (
                                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-48">
                                            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                                                Layout Presets
                                            </div>
                                            <button
                                                onClick={() => applyLayoutPreset('SPLIT_50_50')}
                                                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <span>50/50 Split</span>
                                                <span className="text-xs text-gray-400">Balanced</span>
                                            </button>
                                            <button
                                                onClick={() => applyLayoutPreset('SPLIT_60_40')}
                                                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <span>60/40 Split</span>
                                                <span className="text-xs text-gray-400">Editor Focus</span>
                                            </button>
                                            <button
                                                onClick={() => applyLayoutPreset('SPLIT_70_30')}
                                                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <span>70/30 Split</span>
                                                <span className="text-xs text-gray-400">Writing Mode</span>
                                            </button>
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <button
                                                onClick={resetLayout}
                                                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <span>Reset Layout</span>
                                                <span className="text-xs text-gray-400">⌘⇧R</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={toggleFullscreen}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                    title={`${isFullscreen ? 'Exit' : 'Enter'} Fullscreen (⌘⇧F)`}
                                >
                                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {isMarkdownFile && (
                            <button
                                onClick={() => setIsAIChatOpen(true)}
                                className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
                            >
                                <Bot size={16} />
                                <span>Chat with AI</span>
                            </button>
                        )}
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                        >
                            {isSaving ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            <span>{isSaving ? 'Saving...' : 'Save'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Container */}
            <div
                ref={editorContainerRef}
                className="flex-1 flex overflow-hidden"
            >
                {/* Editor Panel */}
                <div
                    className="flex flex-col bg-white border-r border-gray-200"
                    style={{
                        width: isMarkdownFile && isPreviewVisible ? `${panelWidth}%` : '100%'
                    }}
                >
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        onClick={handleTextareaClick}
                        onKeyUp={handleTextareaKeyUp}
                        className="flex-1 p-6 font-mono text-sm resize-none border-0 outline-0 bg-white text-gray-900"
                        style={{
                            lineHeight: '1.5',
                            tabSize: 4,
                        }}
                        placeholder="Start writing your documentation..."
                        spellCheck={false}
                    />
                </div>

                {/* Resizer */}
                {isMarkdownFile && isPreviewVisible && (
                    <div
                        className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors relative group ${isDragging ? 'bg-blue-500' : ''
                            }`}
                        onMouseDown={handleMouseDown}
                        title="Drag to resize panels"
                    >
                        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-400/20" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}

                {/* Preview Panel */}
                {isMarkdownFile && isPreviewVisible && (
                    <div
                        className="flex flex-col bg-gray-50"
                        style={{ width: `${100 - panelWidth}%` }}
                    >
                        {/* Preview Header */}
                        <div className="bg-white border-b border-gray-200 px-4 py-2 h-10 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Preview</span>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live Preview" />
                                <span className="text-xs text-gray-500">Live</span>
                            </div>
                        </div>

                        {/* Preview Content */}
                        <div className="flex-1 overflow-auto p-6">
                            <div className="prose prose-gray max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <SyntaxHighlighter
                                                    style={tomorrow as any}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    {...props}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        // Enhanced table styling
                                        table({ children }) {
                                            return (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                                                        {children}
                                                    </table>
                                                </div>
                                            );
                                        },
                                        thead({ children }) {
                                            return <thead className="bg-gray-50">{children}</thead>;
                                        },
                                        th({ children }) {
                                            return (
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                                    {children}
                                                </th>
                                            );
                                        },
                                        td({ children }) {
                                            return (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100">
                                                    {children}
                                                </td>
                                            );
                                        },
                                        // Enhanced blockquote styling
                                        blockquote({ children }) {
                                            return (
                                                <blockquote className="border-l-4 border-blue-400 bg-blue-50 p-4 my-4 rounded-r-lg">
                                                    {children}
                                                </blockquote>
                                            );
                                        },
                                    }}
                                >
                                    {content || '*No content to preview*'}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="border-t border-gray-200 bg-gray-50 p-3 h-12 flex-shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center space-x-6">
                        <span>
                            Ln {cursorPosition.line}, Col {cursorPosition.column}
                        </span>
                        {hasUnsavedChanges && (
                            <span className="text-orange-600">
                                Unsaved changes • Auto-saves every 2 minutes
                            </span>
                        )}
                        {isMarkdownFile && isPreviewVisible && (
                            <span className="text-blue-600">
                                Split View ({Math.round(panelWidth)}% / {Math.round(100 - panelWidth)}%)
                            </span>
                        )}
                        {isFullscreen && (
                            <span className="text-purple-600">
                                Fullscreen Mode • Press Esc to exit
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <span>
                            {stats.lines} line{stats.lines !== 1 ? 's' : ''}
                        </span>
                        <span>
                            {stats.words} word{stats.words !== 1 ? 's' : ''}
                        </span>
                        <span>
                            {stats.characters} character{stats.characters !== 1 ? 's' : ''}
                        </span>
                        <span>
                            {stats.charactersNoSpaces} character{stats.charactersNoSpaces !== 1 ? 's' : ''} (no spaces)
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Chat Modal */}
            {isMarkdownFile && (
                <AIChatModal
                    isOpen={isAIChatOpen}
                    onClose={() => setIsAIChatOpen(false)}
                    currentContent={content}
                    filePath={file.path}
                    onApplyContent={handleApplyContent}
                />
            )}
        </div>
    );
} 
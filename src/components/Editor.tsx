'use client';

import { useState, useRef, useEffect } from 'react';
import { Save, Loader2, Bot } from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';
import AIChatModal from './AIChatModal';

interface EditorProps {
    file: FileItem | null;
    onContentChange: (content: string) => void;
}

export default function Editor({ file, onContentChange }: EditorProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const [lastSavedContent, setLastSavedContent] = useState('');
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="border-b border-gray-200 px-4 py-3 h-14">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {file.name}
                            {hasUnsavedChanges && <span className="text-orange-500 ml-1">•</span>}
                        </h2>
                        <p className="text-sm text-gray-500">{file.path}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {isMarkdownFile && (
                            <button
                                onClick={() => setIsAIChatOpen(true)}
                                className="flex items-center space-x-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
                            >
                                <Bot size={16} />
                                <span>Chat with AI</span>
                            </button>
                        )}
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
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

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onClick={handleTextareaClick}
                    onKeyUp={handleTextareaKeyUp}
                    className="w-full h-full p-6 font-mono text-sm resize-none border-0 outline-0 bg-white text-gray-900"
                    style={{
                        lineHeight: '1.5',
                        tabSize: 4,
                    }}
                    placeholder="Start writing your documentation..."
                    spellCheck={false}
                />
            </div>

            {/* Status Bar */}
            <div className="border-t border-gray-200 bg-gray-50 p-3 h-12">
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
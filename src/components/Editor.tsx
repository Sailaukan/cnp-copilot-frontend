'use client';

import { useState, useRef, useEffect } from 'react';
import { Save, Eye, Loader2 } from 'lucide-react';
import { FileItem } from '@/utils/fileSystem';

interface EditorProps {
    file: FileItem | null;
    onContentChange: (content: string) => void;
}

export default function Editor({ file, onContentChange }: EditorProps) {
    const [isPreview, setIsPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const content = file?.content || '';

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

    const handleContentChange = (newContent: string) => {
        onContentChange(newContent);
    };

    const handleTextareaClick = () => {
        updateCursorPosition();
    };

    const handleTextareaKeyUp = () => {
        updateCursorPosition();
    };

    const handleSave = async () => {
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
        } catch (error) {
            console.error('Error saving file:', error);
        } finally {
            setIsSaving(false);
        }
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

    return (
        <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 h-16">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">{file.name}</h2>
                        <p className="text-sm text-gray-500">{file.path}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setIsPreview(!isPreview)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isPreview
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Eye size={16} />
                            <span>{isPreview ? 'Edit' : 'Preview'}</span>
                        </button>
                        <button
                            onClick={handleSave}
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

            {/* Editor/Preview */}
            <div className="flex-1 overflow-hidden">
                {isPreview ? (
                    <div className="h-full overflow-y-auto p-6 prose prose-gray max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                ) : (
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
                )}
            </div>

            {/* Status Bar */}
            <div className="border-t border-gray-200 bg-gray-50 p-3 h-10">
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center space-x-6">
                        <span>
                            Ln {cursorPosition.line}, Col {cursorPosition.column}
                        </span>
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
        </div>
    );
} 
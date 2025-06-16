'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, FileText, Edit, Sparkles, CheckCircle, XCircle, File, Folder } from 'lucide-react';

interface Message {
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    suggestedContent?: string;
    action?: string;
    fileAnalysis?: FileAnalysis;
    needsUserConfirmation?: boolean;
}

interface FileAnalysis {
    relevantFiles: string[];
    reasoning: string;
    confidence: 'high' | 'medium' | 'low';
}

interface AIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentContent: string;
    filePath: string;
    onApplyContent: (content: string) => void;
}

export default function AIChatModal({
    isOpen,
    onClose,
    currentContent,
    filePath,
    onApplyContent
}: AIChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'chat' | 'edit' | 'generate'>('chat');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [pendingFileAnalysis, setPendingFileAnalysis] = useState<FileAnalysis | null>(null);
    const [showFileConfirmation, setShowFileConfirmation] = useState(false);
    const [pendingMessage, setPendingMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            // Add welcome message when modal opens
            const welcomeMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                content: `Hello! I'm here to help you create comprehensive technical documentation from your codebase. I can:

• **Chat** - Answer questions about your document or provide guidance
• **Edit** - Modify existing documentation based on your instructions  
• **Generate** - Create new technical documentation from scratch

For edit and generate actions, I will automatically analyze your codebase files to find the most relevant code and use it to create accurate, comprehensive documentation that reflects your actual implementation.

What kind of documentation would you like to create for "${filePath.split('/').pop()}"?`,
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);

            // Focus input after a short delay
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } else {
            // Clear messages when modal closes
            setMessages([]);
            setInputMessage('');
            setSelectedAction('chat');
            setSelectedFiles([]);
            setPendingFileAnalysis(null);
            setShowFileConfirmation(false);
            setPendingMessage('');
        }
    }, [isOpen, filePath]);

    const sendMessage = async (message?: string, action?: string, skipAnalysis?: boolean) => {
        const messageToSend = message || inputMessage;
        const actionToUse = action || selectedAction;

        if (!messageToSend.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: messageToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        if (!message) setInputMessage('');
        setIsLoading(true);

        try {
            // For edit/generate actions, first analyze codebase unless skipping
            if ((actionToUse === 'edit' || actionToUse === 'generate') && !skipAnalysis) {
                await analyzeCodebase(messageToSend);
                return;
            }

            // Regular chat or process with selected files
            const requestAction = selectedFiles.length > 0 ? 'process_with_files' : actionToUse;

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messageToSend,
                    currentContent,
                    filePath,
                    action: requestAction,
                    selectedFiles: selectedFiles.length > 0 ? selectedFiles : undefined
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();

            if (data.success) {
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'ai',
                    content: data.data.response,
                    timestamp: new Date(),
                    suggestedContent: data.data.suggestedContent,
                    action: data.data.action
                };

                setMessages(prev => [...prev, aiMessage]);

                // Clear selected files after processing
                if (selectedFiles.length > 0) {
                    setSelectedFiles([]);
                }
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: 'Sorry, I encountered an error while processing your request. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const analyzeCodebase = async (message: string) => {
        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    currentContent,
                    filePath,
                    action: 'analyze_codebase'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to analyze codebase');
            }

            const data = await response.json();

            if (data.success && data.data.fileAnalysis) {
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'ai',
                    content: data.data.response,
                    timestamp: new Date(),
                    fileAnalysis: data.data.fileAnalysis,
                    needsUserConfirmation: true
                };

                setMessages(prev => [...prev, aiMessage]);
                setPendingFileAnalysis(data.data.fileAnalysis);
                setSelectedFiles(data.data.fileAnalysis.relevantFiles);
                setShowFileConfirmation(true);
                setPendingMessage(message);
            } else {
                throw new Error(data.error || 'Failed to analyze codebase');
            }
        } catch (error) {
            console.error('Error analyzing codebase:', error);
            // Fall back to regular processing without codebase analysis
            await sendMessage(message, selectedAction, true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileConfirmation = async (confirmed: boolean) => {
        setShowFileConfirmation(false);

        if (confirmed) {
            // Proceed with selected files
            await sendMessage(pendingMessage, selectedAction, true);
        } else {
            // User rejected, ask for manual selection or proceed without files
            const aiMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                content: 'No problem! You can either:\n\n1. Manually select different files from the list above\n2. Or I can proceed without analyzing specific code files\n\nWhat would you prefer?',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        }

        setPendingFileAnalysis(null);
        setPendingMessage('');
    };

    const toggleFileSelection = (filePath: string) => {
        setSelectedFiles(prev =>
            prev.includes(filePath)
                ? prev.filter(f => f !== filePath)
                : [...prev, filePath]
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const applyContent = (content: string) => {
        onApplyContent(content);
        onClose();
    };

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'high': return 'text-green-600 bg-green-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'low': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Bot size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Chat with AI</h2>
                            <p className="text-sm text-gray-500">{filePath}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Action Selector */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex space-x-2 mb-3">
                        <button
                            onClick={() => setSelectedAction('chat')}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedAction === 'chat'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <Bot size={16} />
                            <span>Chat</span>
                        </button>
                        <button
                            onClick={() => setSelectedAction('edit')}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedAction === 'edit'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <Edit size={16} />
                            <span>Edit</span>
                        </button>
                        <button
                            onClick={() => setSelectedAction('generate')}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedAction === 'generate'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <Sparkles size={16} />
                            <span>Generate</span>
                        </button>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">{selectedFiles.length} files selected</span>
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Will be used for context
                            </span>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-lg p-3 ${message.type === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                    }`}
                            >
                                <div className="flex items-start space-x-2">
                                    {message.type === 'ai' && (
                                        <Bot size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    )}
                                    {message.type === 'user' && (
                                        <User size={16} className="text-white mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1">
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                            {message.content}
                                        </div>

                                        {/* File Analysis Results */}
                                        {message.fileAnalysis && (
                                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                                        Codebase Analysis
                                                    </span>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(message.fileAnalysis.confidence)}`}>
                                                        {message.fileAnalysis.confidence} confidence
                                                    </span>
                                                </div>

                                                <div className="mb-3">
                                                    <p className="text-sm text-gray-700 mb-2">{message.fileAnalysis.reasoning}</p>
                                                </div>

                                                <div className="mb-3">
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Files ({message.fileAnalysis.relevantFiles.length}):</h4>
                                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                                        {message.fileAnalysis.relevantFiles.map((file, index) => (
                                                            <div key={index} className="flex items-center space-x-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`file-${index}`}
                                                                    checked={selectedFiles.includes(file)}
                                                                    onChange={() => toggleFileSelection(file)}
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                />
                                                                <label htmlFor={`file-${index}`} className="flex items-center space-x-1 text-sm text-gray-600 cursor-pointer">
                                                                    <File size={14} />
                                                                    <span>{file}</span>
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {message.needsUserConfirmation && showFileConfirmation && (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleFileConfirmation(true)}
                                                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                                                        >
                                                            <CheckCircle size={14} />
                                                            <span>Proceed with Selected Files</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleFileConfirmation(false)}
                                                            className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                                                        >
                                                            <XCircle size={14} />
                                                            <span>Skip Files</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Suggested Content */}
                                        {message.suggestedContent && (
                                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                                        Suggested Content
                                                    </span>
                                                    <button
                                                        onClick={() => applyContent(message.suggestedContent!)}
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                                    >
                                                        Apply to Document
                                                    </button>
                                                </div>
                                                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded border max-h-40 overflow-y-auto">
                                                    {message.suggestedContent}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg p-3">
                                <div className="flex items-center space-x-2">
                                    <Bot size={16} className="text-blue-600" />
                                    <Loader2 size={16} className="animate-spin text-gray-500" />
                                    <span className="text-sm text-gray-500">AI is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-4">
                    <div className="flex space-x-3">
                        <textarea
                            ref={inputRef}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={selectedAction === 'chat'
                                ? 'Ask a question about your documentation...'
                                : selectedAction === 'edit'
                                    ? 'Describe what you want to update in the documentation...'
                                    : 'Describe what technical documentation you want to create...'}
                            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!inputMessage.trim() || isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Press Enter to send, Shift+Enter for new line
                        {(selectedAction === 'edit' || selectedAction === 'generate') && (
                            <span className="ml-2 text-blue-600">• Will analyze codebase files for accurate documentation</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 
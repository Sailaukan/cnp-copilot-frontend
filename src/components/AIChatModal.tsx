'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, FileText, Edit, Sparkles, CheckCircle, XCircle, File, Folder, MessageCircle, Zap, Wand2 } from 'lucide-react';

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
                content: `👋 Hello! I'm your AI documentation assistant. I can help you create comprehensive technical documentation from your codebase.

**What I can do:**
• **Chat** - Answer questions and provide guidance
• **Edit** - Modify existing documentation with precision  
• **Generate** - Create new documentation from scratch

I'll analyze your codebase files automatically to ensure accurate, comprehensive documentation that reflects your actual implementation.

What would you like to create for **${filePath.split('/').pop()}**?`,
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
                content: '⚠️ Sorry, I encountered an error while processing your request. Please try again.',
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
                content: '🤔 No problem! You can either:\n\n1. **Manually select** different files from the list above\n2. **Proceed without** analyzing specific code files\n\nWhat would you prefer?',
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
            case 'high': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
            case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200';
            case 'low': return 'text-red-700 bg-red-50 border-red-200';
            default: return 'text-gray-700 bg-gray-50 border-gray-200';
        }
    };

    const getActionConfig = (action: string) => {
        switch (action) {
            case 'chat':
                return {
                    icon: MessageCircle,
                    label: 'Chat',
                    description: 'Ask questions and get guidance',
                    color: 'blue',
                    gradient: 'from-blue-500 to-blue-600'
                };
            case 'edit':
                return {
                    icon: Edit,
                    label: 'Edit',
                    description: 'Modify existing documentation',
                    color: 'emerald',
                    gradient: 'from-emerald-500 to-emerald-600'
                };
            case 'generate':
                return {
                    icon: Wand2,
                    label: 'Generate',
                    description: 'Create new documentation',
                    color: 'purple',
                    gradient: 'from-purple-500 to-purple-600'
                };
            default:
                return {
                    icon: MessageCircle,
                    label: 'Chat',
                    description: 'Ask questions and get guidance',
                    color: 'blue',
                    gradient: 'from-blue-500 to-blue-600'
                };
        }
    };

    // Extend supported file types
    const supportedTypes = [
        '.md', '.mdx', '.txt', '.rst', '.adoc',
        '.json', '.yaml', '.toml', '.xml'
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-xl transition-colors bg-white shadow-lg"
                >
                    <X size={24} className="text-gray-600" />
                </button>

                {/* Quick Actions */}
                <div className="p-6 bg-gray-50 border-b border-gray-100">
                    <div className="grid grid-cols-3 gap-4">
                        {['chat', 'edit', 'generate'].map((action) => {
                            const config = getActionConfig(action);
                            const isSelected = selectedAction === action;
                            const Icon = config.icon;

                            return (
                                <button
                                    key={action}
                                    onClick={() => setSelectedAction(action as any)}
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 group ${isSelected
                                        ? `border-${config.color}-200 bg-${config.color}-50 shadow-lg shadow-${config.color}-100`
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected
                                            ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                                            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                            }`}>
                                            <Icon size={20} />
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-semibold ${isSelected ? `text-${config.color}-700` : 'text-gray-700'
                                                }`}>
                                                {config.label}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {config.description}
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${config.gradient} opacity-5`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <File size={16} className="text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">
                                    {selectedFiles.length} files selected for context
                                </span>
                                <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    Active
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                                <div className={`rounded-2xl px-5 py-4 shadow-sm ${message.type === 'user'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-12'
                                    : 'bg-white border border-gray-200 mr-12'
                                    }`}>
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm leading-relaxed ${message.type === 'user' ? 'text-white' : 'text-gray-800'
                                                }`}>
                                                {message.content.split('\n').map((line, i) => (
                                                    <div key={i} className={line.startsWith('**') && line.endsWith('**') ? 'font-semibold mt-2 mb-1' : ''}>
                                                        {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* File Analysis Results */}
                                            {message.fileAnalysis && (
                                                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center space-x-2">
                                                            <Zap size={16} className="text-blue-600" />
                                                            <span className="text-sm font-semibold text-gray-700">
                                                                Codebase Analysis
                                                            </span>
                                                        </div>
                                                        <span className={`text-xs px-3 py-1 rounded-full border ${getConfidenceColor(message.fileAnalysis.confidence)}`}>
                                                            {message.fileAnalysis.confidence} confidence
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                                        {message.fileAnalysis.reasoning}
                                                    </p>

                                                    <div className="mb-4">
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                                            📁 Suggested Files ({message.fileAnalysis.relevantFiles.length})
                                                        </h4>
                                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                                            {message.fileAnalysis.relevantFiles.map((file, index) => (
                                                                <label
                                                                    key={index}
                                                                    className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedFiles.includes(file)}
                                                                        onChange={() => toggleFileSelection(file)}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                                                                    />
                                                                    <File size={16} className="text-gray-500" />
                                                                    <span className="text-sm text-gray-700 font-mono">
                                                                        {file}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {message.needsUserConfirmation && showFileConfirmation && (
                                                        <div className="flex space-x-3">
                                                            <button
                                                                onClick={() => handleFileConfirmation(true)}
                                                                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                                            >
                                                                <CheckCircle size={16} />
                                                                <span>Proceed with Selected</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleFileConfirmation(false)}
                                                                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                                                            >
                                                                <XCircle size={16} />
                                                                <span>Skip Analysis</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Suggested Content */}
                                            {message.suggestedContent && (
                                                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center space-x-2">
                                                            <Sparkles size={16} className="text-emerald-600" />
                                                            <span className="text-sm font-semibold text-emerald-700">
                                                                ✨ Generated Content
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => applyContent(message.suggestedContent!)}
                                                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-sm"
                                                        >
                                                            Apply to Document
                                                        </button>
                                                    </div>
                                                    <div className="bg-white border border-green-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                                                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                                            {message.suggestedContent}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-xs text-gray-500 mt-2 ${message.type === 'user' ? 'text-right' : 'text-left ml-11'
                                    }`}>
                                    {message.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mr-12">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                        <Bot size={16} className="text-white" />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Loader2 size={16} className="animate-spin text-blue-600" />
                                        <span className="text-sm text-gray-600">AI is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="bg-white border-t border-gray-200 p-6">
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <textarea
                                ref={inputRef}
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={selectedAction === 'chat'
                                    ? '💬 Ask a question about your documentation...'
                                    : selectedAction === 'edit'
                                        ? '✏️ Describe what you want to update...'
                                        : '✨ Describe what documentation you want to create...'}
                                className="w-full resize-none border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                rows={3}
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            onClick={() => sendMessage()}
                            disabled={!inputMessage.trim() || isLoading}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
                        >
                            {isLoading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>Press Enter to send • Shift+Enter for new line</span>
                        {(selectedAction === 'edit' || selectedAction === 'generate') && (
                            <span className="text-blue-600 font-medium">🔍 Will analyze codebase for context</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 
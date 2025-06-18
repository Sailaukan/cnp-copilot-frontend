import { useState, useEffect, useCallback } from 'react';

export interface EditorLayoutState {
    isPreviewVisible: boolean;
    panelWidth: number;
    isDragging: boolean;
    isFullscreen: boolean;
    previewMode: 'side' | 'tab';
}

export function useEditorLayout() {
    const [layoutState, setLayoutState] = useState<EditorLayoutState>({
        isPreviewVisible: true,
        panelWidth: 50,
        isDragging: false,
        isFullscreen: false,
        previewMode: 'side',
    });

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + Shift + P: Toggle preview
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                togglePreview();
            }

            // Cmd/Ctrl + Shift + F: Toggle fullscreen
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                toggleFullscreen();
            }

            // Cmd/Ctrl + Shift + R: Reset layout
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                resetLayout();
            }

            // Escape: Exit fullscreen
            if (e.key === 'Escape' && layoutState.isFullscreen) {
                e.preventDefault();
                setLayoutState(prev => ({ ...prev, isFullscreen: false }));
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [layoutState.isFullscreen]);

    // Save layout preferences to localStorage
    useEffect(() => {
        const savedLayout = localStorage.getItem('editorLayout');
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                setLayoutState(prev => ({
                    ...prev,
                    ...parsed,
                    isDragging: false, // Never restore dragging state
                    isFullscreen: false, // Never restore fullscreen state
                }));
            } catch (error) {
                console.warn('Failed to parse saved layout preferences:', error);
            }
        }
    }, []);

    // Save layout preferences when they change
    useEffect(() => {
        const { isDragging, isFullscreen, ...persistentState } = layoutState;
        localStorage.setItem('editorLayout', JSON.stringify(persistentState));
    }, [layoutState]);

    const togglePreview = useCallback(() => {
        setLayoutState(prev => ({
            ...prev,
            isPreviewVisible: !prev.isPreviewVisible,
            panelWidth: !prev.isPreviewVisible ? 50 : prev.panelWidth,
        }));
    }, []);

    const toggleFullscreen = useCallback(() => {
        setLayoutState(prev => ({
            ...prev,
            isFullscreen: !prev.isFullscreen,
        }));
    }, []);

    const resetLayout = useCallback(() => {
        setLayoutState(prev => ({
            ...prev,
            panelWidth: 50,
            isPreviewVisible: true,
            previewMode: 'side',
            isFullscreen: false,
        }));
    }, []);

    const setPanelWidth = useCallback((width: number) => {
        setLayoutState(prev => ({
            ...prev,
            panelWidth: Math.min(Math.max(width, 20), 80),
        }));
    }, []);

    const setIsDragging = useCallback((dragging: boolean) => {
        setLayoutState(prev => ({
            ...prev,
            isDragging: dragging,
        }));
    }, []);

    const setPreviewMode = useCallback((mode: 'side' | 'tab') => {
        setLayoutState(prev => ({
            ...prev,
            previewMode: mode,
        }));
    }, []);

    return {
        ...layoutState,
        togglePreview,
        toggleFullscreen,
        resetLayout,
        setPanelWidth,
        setIsDragging,
        setPreviewMode,
    };
}

// Predefined layout presets
export const LAYOUT_PRESETS = {
    SPLIT_50_50: { panelWidth: 50, isPreviewVisible: true },
    SPLIT_60_40: { panelWidth: 60, isPreviewVisible: true },
    SPLIT_70_30: { panelWidth: 70, isPreviewVisible: true },
    EDITOR_ONLY: { panelWidth: 100, isPreviewVisible: false },
    PREVIEW_ONLY: { panelWidth: 0, isPreviewVisible: true },
} as const; 
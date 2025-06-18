# Docs Copilot

A modern documentation editor with AI assistance and real-time collaboration features.

## Features

### 📝 Split-Screen Editor

- **Side-by-side markdown preview**: Real-time preview alongside your editor
- **Resizable panels**: Drag the divider to adjust editor/preview ratio
- **Layout presets**: Quick access to common layouts (50/50, 60/40, 70/30)
- **Fullscreen mode**: Distraction-free editing experience
- **Collapsible sections**: Hide/show preview panel as needed

### ⌨️ Keyboard Shortcuts

- `⌘⇧P` (Mac) / `Ctrl⇧P` (Windows/Linux): Toggle preview panel
- `⌘⇧F` (Mac) / `Ctrl⇧F` (Windows/Linux): Toggle fullscreen mode
- `⌘⇧R` (Mac) / `Ctrl⇧R` (Windows/Linux): Reset layout to default
- `Esc`: Exit fullscreen mode

### 🎨 Layout Options

- **50/50 Split**: Balanced view for editing and previewing
- **60/40 Split**: Editor-focused layout for heavy writing
- **70/30 Split**: Writing mode with minimal preview
- **Editor Only**: Full-width editor without preview
- **Custom Resize**: Drag the divider to any position (20-80% range)

### 🤖 AI Integration

- AI-powered content suggestions
- Context-aware editing assistance
- Smart formatting and structure recommendations

### 💾 Auto-Save

- Automatic saving every 2 minutes
- Visual indicators for unsaved changes
- Manual save with keyboard shortcuts

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser to `http://localhost:3000`

## Usage

1. **Select a file** from the sidebar to start editing
2. **Toggle preview** using the eye icon or `⌘⇧P`
3. **Resize panels** by dragging the divider between editor and preview
4. **Use layout presets** via the settings icon for quick layout changes
5. **Enter fullscreen** for distraction-free editing

## Architecture

The split-screen editor is built with:

- **React hooks** for state management
- **Custom layout hook** (`useEditorLayout`) for reusable layout logic
- **Local storage persistence** for layout preferences
- **Responsive design** that adapts to different screen sizes
- **TypeScript** for type safety and better development experience

## Customization

Layout preferences are automatically saved to local storage and restored on next visit. The editor supports:

- Custom panel widths (20-80% range)
- Preview visibility preferences
- Layout mode preferences
- Fullscreen state management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the split-screen functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

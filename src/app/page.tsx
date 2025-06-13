'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import GitLabPanel from '@/components/GitLabPanel';
import { FileItem } from '@/utils/fileSystem';

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [gitlabFiles, setGitlabFiles] = useState<FileItem[]>([]);
  const [isGitlabConnected, setIsGitlabConnected] = useState(false);
  const [gitlabRepo, setGitlabRepo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load files from the docs folder
  useEffect(() => {
    loadDocsFiles();
  }, []);

  const loadDocsFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/docs/files');
      if (response.ok) {
        const docsFiles = await response.json();
        setFiles(docsFiles);

        // Auto-select README.md if it exists
        const readme = findFileByName(docsFiles, 'README.md');
        if (readme) {
          await handleFileSelect(readme);
        }
      } else {
        console.error('Failed to load docs files');
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading docs files:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const findFileByName = (fileList: FileItem[], name: string): FileItem | null => {
    for (const file of fileList) {
      if (file.name === name && file.type === 'file') {
        return file;
      }
      if (file.children) {
        const found = findFileByName(file.children, name);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFileSelect = async (file: FileItem) => {
    if (file.type === 'file') {
      try {
        // Load content from API if not already loaded
        if (!file.content) {
          const response = await fetch(`/api/docs/content?path=${encodeURIComponent(file.path)}`);
          if (response.ok) {
            const content = await response.text();
            file.content = content;
          }
        }
        setSelectedFile(file);
      } catch (error) {
        console.error('Error loading file content:', error);
        setSelectedFile(file);
      }
    }
  };

  const handleFileCreate = async (name: string, type: 'file' | 'folder', parentPath?: string) => {
    const newPath = parentPath ? `${parentPath}/${name}` : name;

    // Check if file/folder already exists
    const existingItem = findFileByPath(files, newPath);
    if (existingItem) {
      alert(`A ${type} with the name "${name}" already exists in this location.`);
      return;
    }

    try {
      // Create file/folder via API
      const response = await fetch('/api/docs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: newPath,
          type,
          content: type === 'file' ? '# New Document\n\nStart writing your content here...' : undefined
        })
      });

      if (response.ok) {
        // Create the new file/folder object
        const newItem: FileItem = {
          id: Date.now().toString(),
          name,
          path: newPath,
          type,
          content: type === 'file' ? '# New Document\n\nStart writing your content here...' : undefined,
          children: type === 'folder' ? [] : undefined
        };

        // Update files state incrementally instead of reloading
        setFiles(prevFiles => {
          if (!parentPath) {
            // Add to root level
            return [...prevFiles, newItem];
          } else {
            // Add to specific parent folder
            const updateFilesRecursively = (fileList: FileItem[]): FileItem[] => {
              return fileList.map(file => {
                if (file.path === parentPath && file.type === 'folder') {
                  return {
                    ...file,
                    children: [...(file.children || []), newItem]
                  };
                }
                if (file.children) {
                  return {
                    ...file,
                    children: updateFilesRecursively(file.children)
                  };
                }
                return file;
              });
            };
            return updateFilesRecursively(prevFiles);
          }
        });

        // If it's a file, select it
        if (type === 'file') {
          await handleFileSelect(newItem);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to create ${type}: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating file/folder:', error);
      alert(`Error creating ${type}. Please try again.`);
    }
  };

  const findFileByPath = (fileList: FileItem[], targetPath: string): FileItem | null => {
    for (const file of fileList) {
      if (file.path === targetPath) {
        return file;
      }
      if (file.children) {
        const found = findFileByPath(file.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFileDelete = async (file: FileItem) => {
    try {
      const response = await fetch('/api/docs/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path })
      });

      if (response.ok) {
        // Update files state incrementally instead of reloading
        setFiles(prevFiles => {
          const removeFileRecursively = (fileList: FileItem[]): FileItem[] => {
            return fileList
              .filter(f => f.path !== file.path)
              .map(f => ({
                ...f,
                children: f.children ? removeFileRecursively(f.children) : undefined
              }));
          };
          return removeFileRecursively(prevFiles);
        });

        // Clear selection if deleted file was selected
        if (selectedFile?.path === file.path) {
          setSelectedFile(null);
        }
      } else {
        console.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleContentChange = async (content: string) => {
    if (selectedFile) {
      const updatedFile = { ...selectedFile, content };
      setSelectedFile(updatedFile);

      // Update the file in the files array
      const updateFiles = (fileList: FileItem[]): FileItem[] => {
        return fileList.map(file => {
          if (file.path === selectedFile.path) {
            return updatedFile;
          }
          if (file.children) {
            return {
              ...file,
              children: updateFiles(file.children)
            };
          }
          return file;
        });
      };
      setFiles(updateFiles(files));

      // Auto-save to API
      try {
        await fetch('/api/docs/save', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: selectedFile.path,
            content
          })
        });
      } catch (error) {
        console.error('Error saving file:', error);
      }
    }
  };

  const handleGitlabConnect = (repoUrl: string, token: string) => {
    setGitlabRepo(repoUrl);
    setIsGitlabConnected(true);

    // Mock GitLab files converted to FileItem format
    setGitlabFiles([
      { id: '1', name: 'src', path: 'src/', type: 'folder' },
      { id: '2', name: 'README.md', path: 'README.md', type: 'file' },
      { id: '3', name: 'package.json', path: 'package.json', type: 'file' },
      { id: '4', name: 'components', path: 'src/components/', type: 'folder' },
      { id: '5', name: 'utils', path: 'src/utils/', type: 'folder' }
    ]);
  };

  const handleGitlabDisconnect = () => {
    setIsGitlabConnected(false);
    setGitlabRepo('');
    setGitlabFiles([]);
  };

  const handleGitlabFileImport = (gitlabFile: FileItem) => {
    // Convert GitLab file to local file
    const newFile: FileItem = {
      id: Date.now().toString(),
      name: gitlabFile.name,
      path: gitlabFile.name,
      type: 'file',
      content: `# ${gitlabFile.name}\n\nImported from GitLab: ${gitlabFile.path}\n\nContent will be loaded here...`
    };

    setFiles([...files, newFile]);
    setSelectedFile(newFile);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header
        gitlabConnected={isGitlabConnected}
        currentBranch={gitlabRepo ? 'main' : undefined}
        onFileSelect={handleFileSelect}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <Sidebar
            files={files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFolderExpand={(folderId) => {
              // Optional: Add any parent-level folder expansion logic here
              console.log('Folder expanded:', folderId);
            }}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col">
            <Editor
              file={selectedFile}
              onContentChange={handleContentChange}
            />
          </div>

          {/* GitLab Panel */}
          <div className="w-80 bg-white border-l border-gray-200">
            <GitLabPanel
              onConnect={handleGitlabConnect}
              onDisconnect={handleGitlabDisconnect}
              onImportFile={handleGitlabFileImport}
              isConnected={isGitlabConnected}
              files={gitlabFiles}
              isLoading={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
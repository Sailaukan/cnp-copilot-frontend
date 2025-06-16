'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import GitLabPanel from '@/components/GitLabPanel';
import { FileItem } from '@/utils/fileSystem';
import { FileText, Code } from 'lucide-react';

export default function Home() {
  const [docsFiles, setDocsFiles] = useState<FileItem[]>([]);
  const [codebaseFiles, setCodebaseFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'codebase'>('docs');
  const [gitlabFiles, setGitlabFiles] = useState<FileItem[]>([]);
  const [isGitlabConnected, setIsGitlabConnected] = useState(false);
  const [gitlabRepo, setGitlabRepo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load files from the docs folder
  useEffect(() => {
    loadAllFiles();
  }, []);

  const loadAllFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/docs/files');
      if (response.ok) {
        const allFiles = await response.json();

        // Separate documentation files from codebase files
        const { docs, codebase } = separateFilesByType(allFiles);
        setDocsFiles(docs);
        setCodebaseFiles(codebase);

        // Auto-select README.md if it exists in docs
        const readme = findFileByName(docs, 'README.md');
        if (readme) {
          await handleFileSelect(readme);
          setActiveTab('docs');
        } else {
          // If no README in docs, try to find any markdown file in docs
          const firstDoc = findFirstFileOfType(docs, ['.md', '.txt']);
          if (firstDoc) {
            await handleFileSelect(firstDoc);
            setActiveTab('docs');
          }
        }
      } else {
        console.error('Failed to load docs files');
        setDocsFiles([]);
        setCodebaseFiles([]);
      }
    } catch (error) {
      console.error('Error loading docs files:', error);
      setDocsFiles([]);
      setCodebaseFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const separateFilesByType = (files: FileItem[]): { docs: FileItem[], codebase: FileItem[] } => {
    const docs: FileItem[] = [];
    const codebase: FileItem[] = [];

    const processFiles = (fileList: FileItem[], targetArray: FileItem[]) => {
      fileList.forEach(file => {
        if (file.type === 'folder') {
          // Check if this is the codebase folder
          if (file.name === 'codebase') {
            // Add all contents to codebase
            if (file.children) {
              codebase.push(...file.children);
            }
          } else {
            // Regular folder - add to current target with processed children
            const processedFolder = {
              ...file,
              children: file.children ? [] as FileItem[] : undefined
            };

            if (file.children) {
              const { docs: childDocs, codebase: childCodebase } = separateFilesByType(file.children);
              if (childDocs.length > 0) {
                processedFolder.children = childDocs;
                targetArray.push(processedFolder);
              }
              if (childCodebase.length > 0) {
                codebase.push(...childCodebase);
              }
            } else {
              targetArray.push(processedFolder);
            }
          }
        } else {
          // Regular file - add to current target
          targetArray.push(file);
        }
      });
    };

    processFiles(files, docs);
    return { docs, codebase };
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

  const findFirstFileOfType = (fileList: FileItem[], extensions: string[]): FileItem | null => {
    for (const file of fileList) {
      if (file.type === 'file') {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (extensions.includes(ext)) {
          return file;
        }
      }
      if (file.children) {
        const found = findFirstFileOfType(file.children, extensions);
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

        // Switch to appropriate tab based on file location
        if (file.path.startsWith('codebase/')) {
          setActiveTab('codebase');
        } else {
          setActiveTab('docs');
        }
      } catch (error) {
        console.error('Error loading file content:', error);
        setSelectedFile(file);
      }
    }
  };

  const handleFileCreate = async (name: string, type: 'file' | 'folder', parentPath?: string) => {
    const newPath = parentPath ? `${parentPath}/${name}` : name;

    // Check if file/folder already exists
    const allFiles = [...docsFiles, ...codebaseFiles];
    const existingItem = findFileByPath(allFiles, newPath);
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

        // Determine if this should go to docs or codebase
        const isCodebaseFile = newPath.startsWith('codebase/');
        const targetFiles = isCodebaseFile ? codebaseFiles : docsFiles;
        const setTargetFiles = isCodebaseFile ? setCodebaseFiles : setDocsFiles;

        // Update files state incrementally instead of reloading
        setTargetFiles(prevFiles => {
          if (!parentPath || (isCodebaseFile && parentPath === 'codebase')) {
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

        // If it's a file, select it and switch to appropriate tab
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
        // Determine which file list to update
        const isCodebaseFile = file.path.startsWith('codebase/');
        const setTargetFiles = isCodebaseFile ? setCodebaseFiles : setDocsFiles;

        // Update files state incrementally instead of reloading
        setTargetFiles(prevFiles => {
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

      // Update the file in the appropriate files array
      const isCodebaseFile = selectedFile.path.startsWith('codebase/');
      const targetFiles = isCodebaseFile ? codebaseFiles : docsFiles;
      const setTargetFiles = isCodebaseFile ? setCodebaseFiles : setDocsFiles;

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
      setTargetFiles(updateFiles(targetFiles));

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
  };

  const handleGitlabDisconnect = () => {
    setIsGitlabConnected(false);
    setGitlabRepo('');
    setGitlabFiles([]);
  };

  const handleGitlabFileImport = (gitlabFile: FileItem) => {
    // This is now handled by the new import functionality
    // Refresh files to show newly imported files
    loadAllFiles();
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
        {/* Sidebar with Custom Tabs */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Custom Tab Headers */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'docs'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <FileText className="h-4 w-4" />
              Documentation
            </button>
            <button
              onClick={() => setActiveTab('codebase')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'codebase'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Code className="h-4 w-4" />
              Codebase
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'docs' ? (
              <Sidebar
                files={docsFiles}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                onFolderExpand={(folderId) => {
                  console.log('Docs folder expanded:', folderId);
                }}
              />
            ) : (
              <Sidebar
                files={codebaseFiles}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                onFolderExpand={(folderId) => {
                  console.log('Codebase folder expanded:', folderId);
                }}
              />
            )}
          </div>
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
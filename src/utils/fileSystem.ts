import fs from 'fs';
import path from 'path';

export interface FileItem {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: FileItem[];
    content?: string;
    size?: number; // Optional size property for GitLab files
}

// Get the docs directory path relative to the project root
const getDocsPath = () => {
    // In Next.js, we need to go up from the frontend directory to the project root
    return path.join(process.cwd(), '..', 'docs');
};

export const readDocsStructure = async (): Promise<FileItem[]> => {
    const docsPath = getDocsPath();

    if (!fs.existsSync(docsPath)) {
        console.warn('Docs directory not found at:', docsPath);
        return [];
    }

    const readDirectory = (dirPath: string, relativePath: string = ''): FileItem[] => {
        const items: FileItem[] = [];

        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                // Skip hidden files and system files
                if (entry.name.startsWith('.')) continue;

                const fullPath = path.join(dirPath, entry.name);
                const itemPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
                const id = itemPath.replace(/[^a-zA-Z0-9]/g, '_');

                if (entry.isDirectory()) {
                    const children = readDirectory(fullPath, itemPath);
                    items.push({
                        id,
                        name: entry.name,
                        path: itemPath,
                        type: 'folder',
                        children
                    });
                } else if (entry.isFile()) {
                    // Include all file types, not just .md files
                    items.push({
                        id,
                        name: entry.name,
                        path: itemPath,
                        type: 'file'
                    });
                }
            }
        } catch (error) {
            console.error('Error reading directory:', dirPath, error);
        }

        return items.sort((a, b) => {
            // Folders first, then files, both alphabetically
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    };

    return readDirectory(docsPath);
};

export const readFileContent = async (filePath: string): Promise<string> => {
    const docsPath = getDocsPath();
    const fullPath = path.join(docsPath, filePath);

    try {
        if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath, 'utf-8');
        }
    } catch (error) {
        console.error('Error reading file:', fullPath, error);
    }

    return '';
};

export const writeFileContent = async (filePath: string, content: string): Promise<boolean> => {
    const docsPath = getDocsPath();
    const fullPath = path.join(docsPath, filePath);

    try {
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf-8');
        return true;
    } catch (error) {
        console.error('Error writing file:', fullPath, error);
        return false;
    }
};

export const deleteFile = async (filePath: string): Promise<boolean> => {
    const docsPath = getDocsPath();
    const fullPath = path.join(docsPath, filePath);

    try {
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true });
            } else {
                fs.unlinkSync(fullPath);
            }
            return true;
        }
    } catch (error) {
        console.error('Error deleting file:', fullPath, error);
    }

    return false;
};

export const createFile = async (filePath: string, content: string = ''): Promise<boolean> => {
    return writeFileContent(filePath, content);
};

export const createFolder = async (folderPath: string): Promise<boolean> => {
    const docsPath = getDocsPath();
    const fullPath = path.join(docsPath, folderPath);

    try {
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            return true;
        }
    } catch (error) {
        console.error('Error creating folder:', fullPath, error);
    }

    return false;
}; 
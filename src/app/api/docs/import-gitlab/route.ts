import { NextRequest, NextResponse } from 'next/server';
import { writeFileContent } from '@/utils/fileSystem';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fileName, filePath, content, repoName } = body;

        if (!fileName || !filePath || content === undefined) {
            return NextResponse.json(
                { error: 'File name, path, and content are required' },
                { status: 400 }
            );
        }

        // Create a codebase folder structure
        const codebaseFolder = 'codebase';
        const repoFolder = repoName ? repoName.replace(/[^a-zA-Z0-9-_]/g, '_') : 'imported';

        // Preserve the original file structure within the codebase folder
        const importPath = path.join(codebaseFolder, repoFolder, filePath);

        // Add metadata header to imported files
        const fileExtension = path.extname(fileName).toLowerCase();
        let processedContent = content;

        // Add metadata header for documentation files
        if (['.md', '.txt', '.rst'].includes(fileExtension)) {
            const metadata = `<!-- 
Imported from GitLab Repository
Original Path: ${filePath}
Import Date: ${new Date().toISOString()}
-->

`;
            processedContent = metadata + content;
        } else if (['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs'].includes(fileExtension)) {
            // Add comment header for code files
            const commentStyle = getCommentStyle(fileExtension);
            const metadata = `${commentStyle.start}
Imported from GitLab Repository
Original Path: ${filePath}
Import Date: ${new Date().toISOString()}
${commentStyle.end}

`;
            processedContent = metadata + content;
        }

        const success = await writeFileContent(importPath, processedContent);

        if (success) {
            return NextResponse.json({
                message: 'File imported successfully',
                importPath,
                originalPath: filePath,
                size: processedContent.length
            });
        } else {
            return NextResponse.json(
                { error: 'Failed to import file' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error importing GitLab file:', error);
        return NextResponse.json(
            { error: 'Failed to import file' },
            { status: 500 }
        );
    }
}

function getCommentStyle(extension: string): { start: string; end: string } {
    switch (extension) {
        case '.js':
        case '.ts':
        case '.java':
        case '.cpp':
        case '.c':
        case '.go':
        case '.rs':
            return { start: '/*', end: '*/' };
        case '.py':
            return { start: '"""', end: '"""' };
        default:
            return { start: '/*', end: '*/' };
    }
} 
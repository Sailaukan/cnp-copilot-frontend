import { NextRequest, NextResponse } from 'next/server';
import { createFile, createFolder } from '@/utils/fileSystem';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { path: filePath, content, type = 'file' } = body;

        if (!filePath) {
            return NextResponse.json(
                { error: 'File path is required' },
                { status: 400 }
            );
        }

        let success = false;

        if (type === 'folder') {
            success = await createFolder(filePath);
        } else {
            success = await createFile(filePath, content || '# New Document\n\nStart writing your content here...');
        }

        if (success) {
            return NextResponse.json({
                message: `${type === 'folder' ? 'Folder' : 'File'} created successfully`,
                path: filePath
            });
        } else {
            return NextResponse.json(
                { error: `Failed to create ${type}` },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error creating file/folder:', error);
        return NextResponse.json(
            { error: 'Failed to create file/folder' },
            { status: 500 }
        );
    }
} 
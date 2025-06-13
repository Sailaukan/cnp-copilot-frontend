import { NextRequest, NextResponse } from 'next/server';
import { deleteFile } from '@/utils/fileSystem';

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { path: filePath } = body;

        if (!filePath) {
            return NextResponse.json(
                { error: 'File path is required' },
                { status: 400 }
            );
        }

        const success = await deleteFile(filePath);

        if (success) {
            return NextResponse.json({ message: 'File deleted successfully' });
        } else {
            return NextResponse.json(
                { error: 'Failed to delete file' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        return NextResponse.json(
            { error: 'Failed to delete file' },
            { status: 500 }
        );
    }
} 
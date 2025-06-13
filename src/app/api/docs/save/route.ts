import { NextRequest, NextResponse } from 'next/server';
import { writeFileContent } from '@/utils/fileSystem';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { path: filePath, content } = body;

        if (!filePath || content === undefined) {
            return NextResponse.json(
                { error: 'File path and content are required' },
                { status: 400 }
            );
        }

        const success = await writeFileContent(filePath, content);

        if (success) {
            return NextResponse.json({ message: 'File saved successfully' });
        } else {
            return NextResponse.json(
                { error: 'Failed to save file' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json(
            { error: 'Failed to save file' },
            { status: 500 }
        );
    }
} 
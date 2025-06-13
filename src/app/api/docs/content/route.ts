import { NextRequest, NextResponse } from 'next/server';
import { readFileContent } from '@/utils/fileSystem';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json(
                { error: 'File path is required' },
                { status: 400 }
            );
        }

        const content = await readFileContent(filePath);
        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    } catch (error) {
        console.error('Error reading file content:', error);
        return NextResponse.json(
            { error: 'Failed to read file content' },
            { status: 500 }
        );
    }
} 
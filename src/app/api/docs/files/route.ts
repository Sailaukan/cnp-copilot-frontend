import { NextResponse } from 'next/server';
import { readDocsStructure } from '@/utils/fileSystem';

export async function GET() {
    try {
        const files = await readDocsStructure();
        return NextResponse.json(files);
    } catch (error) {
        console.error('Error reading docs structure:', error);
        return NextResponse.json(
            { error: 'Failed to read documentation files' },
            { status: 500 }
        );
    }
} 
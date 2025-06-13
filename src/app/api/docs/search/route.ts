import { NextRequest, NextResponse } from 'next/server';
import { readDocsStructure, readFileContent } from '@/utils/fileSystem';
import { FileItem } from '@/utils/fileSystem';

interface SearchResult {
    file: FileItem;
    matches: {
        type: 'filename' | 'content';
        line?: number;
        text?: string;
        context?: string;
    }[];
    score: number;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.trim().length === 0) {
            return NextResponse.json([]);
        }

        const searchTerm = query.trim().toLowerCase();
        const files = await readDocsStructure();
        const results: SearchResult[] = [];

        // Helper function to search through all files recursively
        const searchFiles = async (fileList: FileItem[]): Promise<void> => {
            for (const file of fileList) {
                if (file.type === 'folder' && file.children) {
                    await searchFiles(file.children);
                } else if (file.type === 'file') {
                    const matches: SearchResult['matches'] = [];
                    let score = 0;

                    // Search in filename
                    if (file.name.toLowerCase().includes(searchTerm)) {
                        matches.push({
                            type: 'filename',
                            text: file.name
                        });
                        score += 10; // Higher score for filename matches
                    }

                    // Search in file content
                    try {
                        const content = await readFileContent(file.path);
                        if (content) {
                            const lines = content.split('\n');
                            lines.forEach((line, index) => {
                                if (line.toLowerCase().includes(searchTerm)) {
                                    matches.push({
                                        type: 'content',
                                        line: index + 1,
                                        text: line.trim(),
                                        context: getContextAroundMatch(lines, index, searchTerm)
                                    });
                                    score += 1; // Lower score for content matches
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Error reading file content for search:', file.path, error);
                    }

                    // Add to results if there are matches
                    if (matches.length > 0) {
                        results.push({
                            file,
                            matches,
                            score
                        });
                    }
                }
            }
        };

        await searchFiles(files);

        // Sort results by score (highest first) and limit to top 20
        const sortedResults = results
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

        return NextResponse.json(sortedResults);
    } catch (error) {
        console.error('Error performing search:', error);
        return NextResponse.json(
            { error: 'Failed to perform search' },
            { status: 500 }
        );
    }
}

// Helper function to get context around a match
function getContextAroundMatch(lines: string[], matchIndex: number, searchTerm: string): string {
    const contextLines = 2;
    const start = Math.max(0, matchIndex - contextLines);
    const end = Math.min(lines.length - 1, matchIndex + contextLines);

    const contextArray = [];
    for (let i = start; i <= end; i++) {
        const line = lines[i].trim();
        if (i === matchIndex) {
            // Highlight the search term in the matching line
            const highlightedLine = line.replace(
                new RegExp(searchTerm, 'gi'),
                `**${searchTerm}**`
            );
            contextArray.push(`> ${highlightedLine}`);
        } else if (line) {
            contextArray.push(line);
        }
    }

    return contextArray.join('\n');
} 
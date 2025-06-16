import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { repoUrl, accessToken, filePath } = body;

        if (!repoUrl || !accessToken || !filePath) {
            return NextResponse.json(
                { error: 'Repository URL, access token, and file path are required' },
                { status: 400 }
            );
        }

        // Extract project info from GitLab URL
        const urlMatch = repoUrl.match(/gitlab\.com\/(.+?)(?:\.git)?$/);
        if (!urlMatch) {
            return NextResponse.json(
                { error: 'Invalid GitLab repository URL' },
                { status: 400 }
            );
        }

        const projectPath = encodeURIComponent(urlMatch[1]);
        const encodedFilePath = encodeURIComponent(filePath);
        const gitlabApiUrl = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodedFilePath}/raw?ref=main`;

        const response = await fetch(gitlabApiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GitLab API error:', response.status, errorText);
            return NextResponse.json(
                { error: `GitLab API error: ${response.status}` },
                { status: response.status }
            );
        }

        const content = await response.text();

        return NextResponse.json({
            content,
            message: 'File content fetched successfully'
        });
    } catch (error) {
        console.error('Error fetching GitLab file content:', error);
        return NextResponse.json(
            { error: 'Failed to fetch file content from GitLab' },
            { status: 500 }
        );
    }
} 
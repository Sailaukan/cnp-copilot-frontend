import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { repoUrl, accessToken } = body;

        if (!repoUrl || !accessToken) {
            return NextResponse.json(
                { error: 'Repository URL and access token are required' },
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
        const gitlabApiUrl = `https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?recursive=true&per_page=100`;

        const response = await fetch(gitlabApiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
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

        const files = await response.json();

        // Transform GitLab API response to our format
        const transformedFiles = files.map((file: any) => ({
            id: file.id,
            name: file.name,
            path: file.path,
            type: file.type === 'tree' ? 'folder' : 'file',
            size: file.type === 'blob' ? undefined : undefined // Size not provided in tree API
        }));

        return NextResponse.json({
            files: transformedFiles,
            message: 'Files fetched successfully'
        });
    } catch (error) {
        console.error('Error fetching GitLab files:', error);
        return NextResponse.json(
            { error: 'Failed to fetch files from GitLab' },
            { status: 500 }
        );
    }
} 
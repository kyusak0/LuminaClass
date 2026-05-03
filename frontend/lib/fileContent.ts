import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const filePath = path.join(process.env.UPLOAD_DIR, `${params.id}.json`);
        const content = await fs.readFile(filePath, 'utf-8');

        return NextResponse.json({ content: JSON.parse(content) });
    } catch (error) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content } = await request.json();
        const filePath = path.join(process.env.UPLOAD_DIR, `${params.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(content));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
}
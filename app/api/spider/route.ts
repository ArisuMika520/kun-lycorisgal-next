import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie';
import { NextRequest, NextResponse } from 'next/server';
import { NextMoeError } from './lib/api/nextmoe';
import { fetchGameMetadata } from './lib/spider-service';

const INVALID_ID = { error: '请提供有效的 VNDB ID，例如 v19658' };

export const POST = async (req: NextRequest) => {
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
        return NextResponse.json({ error: '用户未登录' }, { status: 401 })
    }
    if (payload.role < 3) {
        return NextResponse.json({ error: '本页面仅管理员可访问' }, { status: 403 })
    }

    try {
        let body: unknown = null;
        try {
            body = await req.json();
        } catch {
            body = null;
        }

        const vndbId =
            body && typeof body === 'object' && 'vndbId' in body
                ? body.vndbId
                : undefined;

        if (typeof vndbId !== 'string' || !vndbId.trim()) {
            return NextResponse.json(INVALID_ID, { status: 400 });
        }

        console.log('[API/Spider] Received request:', { vndbId });
        const data = await fetchGameMetadata(vndbId);
        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof NextMoeError) {
            return NextResponse.json(error.body, { status: error.status });
        }
        console.error('[API/Spider] Error:', error);
        return NextResponse.json({ error: 'NextMoe 暂时不可用' }, { status: 502 });
    }
};

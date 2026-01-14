import { NextRequest, NextResponse } from 'next/server';
import { fetchGameMetadata } from './lib/spider-service';

export const POST = async (req: NextRequest) => {
    try {
        const { vndbId, dlsiteId, touchgalUrl } = await req.json();

        if (!vndbId && !dlsiteId && !touchgalUrl) {
            return NextResponse.json({ error: 'Please provide at least one source (VNDB ID, DLsite ID, or TouchGal URL)' }, { status: 400 });
        }

        console.log('[API/Spider] Received request:', { vndbId, dlsiteId, touchgalUrl });

        const data = await fetchGameMetadata(vndbId, dlsiteId, touchgalUrl);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[API/Spider] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
};

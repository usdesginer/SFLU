import { NextRequest, NextResponse } from 'next/server';
import { sflFetch } from '@/lib/sflFetch';

interface CacheEntry {
  data: any;
  timestamp: number;
}

let listCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute cache for farm list

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '10';
  const cursor = searchParams.get('cursor') || '';

  const apiKey = 
    request.headers.get('x-api-key') || 
    process.env.SFL_COMMUNITY_API_KEY || 
    '';
  const baseUrl = process.env.SFL_API_BASE_URL || 'https://api.sunflower-land.com';

  const now = Date.now();
  if (!cursor && listCache && (now - listCache.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json({ ...listCache.data, _cached: true });
  }

  try {
    const url = new URL(`${baseUrl}/community/farms`);
    url.searchParams.set('limit', limit);
    if (cursor) url.searchParams.set('cursor', cursor);

    const sflResponse = await sflFetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
        'User-Agent': 'FarmIQ/1.0',
        'Accept': 'application/json',
      },
      timeoutMs: 10000,
      retries: 1,
      cache: 'no-store',
    });

    if (sflResponse.status === 429) {
      if (listCache) {
        return NextResponse.json({ ...listCache.data, _rateLimited: true, _cached: true });
      }
      return NextResponse.json({ 
        error: 'Sunflower Land API rate limit reached. Please back off.',
        status: 429 
      }, { status: 429 });
    }

    if (!sflResponse.ok) {
      const errText = await sflResponse.text();
      return NextResponse.json({ error: 'SFL API returned error', details: errText }, { status: sflResponse.status });
    }

    const data = await sflResponse.json();

    if (!cursor) {
      listCache = { data, timestamp: now };
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.warn(`[SFL API] List farms unreachable (${err.message}); serving fallback.`);
    if (listCache) {
      return NextResponse.json({ ...listCache.data, _fallbackFromError: true });
    }
    return NextResponse.json({ farms: [], _fallbackFromError: true });
  }
}


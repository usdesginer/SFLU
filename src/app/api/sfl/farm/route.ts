import { NextRequest, NextResponse } from 'next/server';
import { sflFetch } from '@/lib/sflFetch';

// Server-side in-memory cache to respect Sunflower Land 5s/req per-IP rate limit
interface CacheEntry {
  data: any;
  timestamp: number;
}

const farmCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds cache

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
  }

  // Check custom key from header or fallback to server env
  const apiKey = 
    request.headers.get('x-api-key') || 
    process.env.SFL_COMMUNITY_API_KEY || 
    '';
  const baseUrl = process.env.SFL_API_BASE_URL || 'https://api.sunflower-land.com';

  const cleanId = id.trim();
  const cacheKey = `${baseUrl}:${cleanId}`;
  const now = Date.now();
  const cached = farmCache.get(cacheKey);

  // Return cached response if fresh (under 30s)
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json({ ...cached.data, _cached: true, _cacheAgeMs: now - cached.timestamp });
  }

  try {
    const sflResponse = await sflFetch(`${baseUrl}/community/farms/${encodeURIComponent(cleanId)}`, {
      headers: {
        'x-api-key': apiKey,
        'User-Agent': 'FarmIQ/1.0',
        'Accept': 'application/json',
      },
      timeoutMs: 12000,
      retries: 1,
      cache: 'no-store',
    });

    if (sflResponse.status === 404) {
      return NextResponse.json({ 
        error: `No farm matches identifier "${cleanId}". (Verified: NFT IDs ≤ 1B, Account IDs > 1B, or 0x wallet addresses)`,
        notFound: true,
        id: cleanId 
      }, { status: 404 });
    }

    if (sflResponse.status === 429) {
      console.warn(`[SFL API] 429 Rate limited for farm #${id}. Serving stale cache if available.`);
      if (cached) {
        return NextResponse.json({ ...cached.data, _rateLimited: true, _cached: true });
      }
      return NextResponse.json({ 
        error: 'Sunflower Land API rate limit reached (roughly 1 req per 5s). Please wait a moment.',
        status: 429 
      }, { status: 429 });
    }

    if (!sflResponse.ok) {
      const errText = await sflResponse.text();
      return NextResponse.json({ 
        error: `Sunflower Land API error: ${sflResponse.status} ${sflResponse.statusText}`,
        details: errText 
      }, { status: sflResponse.status });
    }

    const liveData = await sflResponse.json();

    // Cache valid response
    farmCache.set(cacheKey, {
      data: liveData,
      timestamp: now,
    });

    return NextResponse.json(liveData);
  } catch (err: any) {
    console.error(`[SFL API] Fetch exception for farm #${id}:`, err);
    if (cached) {
      return NextResponse.json({ ...cached.data, _fallbackFromError: true });
    }
    return NextResponse.json({ error: 'Failed to communicate with Sunflower Land API', message: err.message }, { status: 500 });
  }
}


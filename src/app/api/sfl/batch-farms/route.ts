import { NextRequest, NextResponse } from 'next/server';
import { normalizeSFLFarm } from '@/lib/farmService';
import { sflFetch } from '@/lib/sflFetch';

// Server-side in-memory cache for batch farms (60s TTL)
interface CacheEntry {
  data: any;
  timestamp: number;
}

const batchFarmCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

async function fetchFromSFL(ids: number[], apiKey: string, baseUrl: string): Promise<{ farms: Record<string, any>; skipped: number[] }> {
  const payload = JSON.stringify({ ids });

  const response = await sflFetch(`${baseUrl}/community/getFarms`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'User-Agent': 'FarmIQ/1.0',
      'content-type': 'application/json',
    },
    body: payload,
    timeoutMs: 15000,
    retries: 1,
    cache: 'no-store',
  });

  if (response.status === 429) {
    console.warn('[SFL Batch API] 429 Rate limited. Waiting 6s before retry...');
    await new Promise((r) => setTimeout(r, 6000));
    return fetchFromSFL(ids, apiKey, baseUrl);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SFL getFarms HTTP ${response.status}: ${errText}`);
  }

  const { farms = {}, skipped = [] } = await response.json();

  // If items were skipped due to 5.5MB payload cap and we requested > 1 id, retry in halves
  if (skipped.length > 0 && ids.length > 1) {
    const half = Math.ceil(skipped.length / 2);
    const firstHalf = skipped.slice(0, half);
    const secondHalf = skipped.slice(half);

    for (const batch of [firstHalf, secondHalf]) {
      if (batch.length > 0) {
        try {
          const retried = await fetchFromSFL(batch, apiKey, baseUrl);
          Object.assign(farms, retried.farms);
        } catch (e) {
          console.warn('[SFL Batch API] Retry partition failed:', e);
        }
      }
    }
  }

  return { farms, skipped };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: number[] = Array.isArray(body?.ids) 
      ? body.ids.map((id: any) => parseInt(id, 10)).filter((n: number) => !isNaN(n) && n > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Body must include ids: number[] with 1 to 100 entries' }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 farm IDs per batch request' }, { status: 400 });
    }

    const apiKey = 
      request.headers.get('x-api-key') || 
      process.env.SFL_COMMUNITY_API_KEY || 
      '';
    const baseUrl = process.env.SFL_API_BASE_URL || 'https://api.sunflower-land.com';

    const now = Date.now();
    const resultFarms: Record<string, any> = {};
    const idsToFetch: number[] = [];
    let cachedCount = 0;

    // 1. Check cache first
    ids.forEach((id) => {
      const cacheKey = `${baseUrl}:${id}`;
      const cached = batchFarmCache.get(cacheKey);
      if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        resultFarms[String(id)] = cached.data;
        cachedCount++;
      } else {
        idsToFetch.push(id);
      }
    });

    // 2. Fetch uncached IDs via POST /community/getFarms
    let skippedIds: number[] = [];
    if (idsToFetch.length > 0) {
      const { farms: fetchedFarms, skipped } = await fetchFromSFL(idsToFetch, apiKey, baseUrl);
      skippedIds = skipped;

      Object.entries(fetchedFarms).forEach(([strId, rawFarm]) => {
        const normalized = normalizeSFLFarm({ id: strId, farm: rawFarm, updatedAt: (rawFarm as any)?.updatedAt }, strId);
        resultFarms[strId] = normalized;

        // Cache for future requests
        batchFarmCache.set(`${baseUrl}:${strId}`, {
          data: normalized,
          timestamp: now,
        });
      });
    }

    return NextResponse.json({
      farms: resultFarms,
      skipped: skippedIds,
      totalRequested: ids.length,
      cachedCount,
      freshFetchedCount: idsToFetch.length - skippedIds.length,
      warning: 'Powered by official Sunflower Land POST /community/getFarms batch API',
    });
  } catch (err: any) {
    console.error('[SFL Batch API] Exception:', err);
    return NextResponse.json({ error: 'Failed to process batch farms lookup', message: err.message }, { status: 500 });
  }
}


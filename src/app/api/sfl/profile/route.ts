import { NextRequest, NextResponse } from 'next/server';
import { sflFetch } from '@/lib/sflFetch';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const profileCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30s cache per farm profile

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const farmIdStr = searchParams.get('farmId') || '5128790942880844';
  const farmId = parseInt(farmIdStr, 10);

  if (isNaN(farmId) || farmId <= 0) {
    return NextResponse.json({ error: 'farmId must be a positive integer' }, { status: 400 });
  }

  const cacheKey = String(farmId);
  const now = Date.now();
  const cached = profileCache.get(cacheKey);

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json({
      ...cached.data,
      _cached: true,
      _cacheAgeMs: now - cached.timestamp,
    });
  }

  const apiKey = 
    request.headers.get('x-api-key') || 
    process.env.SFL_COMMUNITY_API_KEY || 
    '';
  const baseUrl = process.env.SFL_API_BASE_URL || 'https://api.sunflower-land.com';

  try {
    const url = new URL(`${baseUrl}/community/data`);
    url.searchParams.set('type', 'marketplaceProfile');
    url.searchParams.set('farmId', String(farmId));

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
      if (cached) {
        return NextResponse.json({ ...cached.data, _rateLimited: true, _cached: true });
      }
      return NextResponse.json(
        { error: 'Sunflower Land profile API rate limited (5s throttle)', status: 429 },
        { status: 429 }
      );
    }

    if (sflResponse.status === 404) {
      return NextResponse.json(
        { error: `Farm #${farmId} has no trading profile or does not exist` },
        { status: 404 }
      );
    }

    if (!sflResponse.ok) {
      const errText = await sflResponse.text();
      return NextResponse.json(
        { error: 'Failed to fetch marketplace profile', details: errText },
        { status: sflResponse.status }
      );
    }

    const json = await sflResponse.json();
    const rawData = json.data || {};

    const weeklyEarned = rawData.weeklyFlowerEarned || 0;
    const weeklySpent = rawData.weeklyFlowerSpent || 0;
    const netWeeklyFlower = Number((weeklyEarned - weeklySpent).toFixed(4));

    const rawListings = rawData.listings || {};
    const listingsList = Object.entries(rawListings).map(([tradeId, item]: [string, any]) => ({
      tradeId,
      ...item,
    }));

    const rawOffers = rawData.offers || {};
    const offersList = Object.entries(rawOffers).map(([tradeId, item]: [string, any]) => ({
      tradeId,
      ...item,
    }));

    const tradesList = (rawData.trades || []).map((t: any) => ({
      ...t,
      unitPriceSFL: t.quantity ? Number((t.sfl / t.quantity).toFixed(6)) : t.sfl,
    }));

    const payload = {
      farmId: rawData.id || farmId,
      username: rawData.username || `#${farmId}`,
      level: rawData.level || 1,
      ascension: rawData.ascension || 0,
      tokenUri: rawData.tokenUri || '',
      totalTrades: rawData.totalTrades || 0,
      lifetimeProfit: rawData.profit || 0,
      weeklyFlowerEarned: weeklyEarned,
      weeklyFlowerSpent: weeklySpent,
      netWeeklyFlower,
      listings: listingsList,
      offers: offersList,
      friends: rawData.friends || [],
      recentTrades: tradesList,
    };

    profileCache.set(cacheKey, { data: payload, timestamp: now });

    return NextResponse.json(payload);
  } catch (err: any) {
    console.warn(`[SFL Profile API] Upstream farm ${farmId} unreachable (${err.message}); serving fallback.`);
    if (cached) {
      return NextResponse.json({ ...cached.data, _fallbackFromError: true });
    }
    const emptyFallback = {
      weeklyFlowerEarned: 0,
      weeklyFlowerSpent: 0,
      netWeeklyFlower: 0,
      listings: [],
      offers: [],
      friends: [],
      recentTrades: [],
      _fallbackFromError: true,
    };
    return NextResponse.json(emptyFallback);
  }
}

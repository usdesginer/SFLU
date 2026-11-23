import { NextRequest, NextResponse } from 'next/server';
import { sflFetch } from '@/lib/sflFetch';

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface HistoricalCacheEntry {
  items: Record<string, any>;
  date: string;
  fetchedAt: number;
}

interface HourlySnapshot {
  timestamp: number;
  floors: Record<string, number>;
}

interface MarketGlobalState {
  todayRawCache: {
    date: string;
    flowerPriceUSD: number;
    totals: { volume: number; trades: number };
    rawItems: Record<string, any>;
    fetchedAt: number;
  } | null;
  historicalCache: Map<string, HistoricalCacheEntry>;
  hourlySnapshots: HourlySnapshot[];
  inFlightToday: Promise<any> | null;
  warmTimer: ReturnType<typeof setTimeout> | null;
  warmInFlight: boolean;
  lastUpstreamCallAt: number;
}

const g = globalThis as typeof globalThis & { __farmiqMarketState?: MarketGlobalState };
if (!g.__farmiqMarketState) {
  g.__farmiqMarketState = {
    todayRawCache: null,
    historicalCache: new Map<string, HistoricalCacheEntry>(),
    hourlySnapshots: [],
    inFlightToday: null,
    warmTimer: null,
    warmInFlight: false,
    lastUpstreamCallAt: 0,
  };
}
const marketState = g.__farmiqMarketState;

const TODAY_CACHE_TTL_MS = 90_000; // 90 seconds TTL for today's live report
const HISTORICAL_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours TTL for past UTC days
const UPSTREAM_COOLDOWN_MS = 12_000; // Polite cooldown between SFL marketplaceActivity requests to avoid HTTP 429

// Official Sunflower Land verified contract IDs from game engine KNOWN_IDS
const SFL_ITEM_TO_MARKET_ID: Record<string, string> = {
  // Crops & Produce
  sunflower: 'collectibles-201',
  potato: 'collectibles-202',
  pumpkin: 'collectibles-203',
  carrot: 'collectibles-204',
  cabbage: 'collectibles-205',
  beetroot: 'collectibles-206',
  cauliflower: 'collectibles-207',
  parsnip: 'collectibles-208',
  radish: 'collectibles-209',
  wheat: 'collectibles-210',
  kale: 'collectibles-211',
  apple: 'collectibles-212',
  blueberry: 'collectibles-213',
  orange: 'collectibles-214',
  eggplant: 'collectibles-215',
  corn: 'collectibles-216',
  banana: 'collectibles-217',
  soybean: 'collectibles-251',
  grape: 'collectibles-252',
  rice: 'collectibles-253',
  olive: 'collectibles-254',
  tomato: 'collectibles-255',
  lemon: 'collectibles-256',
  barley: 'collectibles-257',
  rhubarb: 'collectibles-258',
  zucchini: 'collectibles-259',
  yam: 'collectibles-260',
  broccoli: 'collectibles-261',
  pepper: 'collectibles-262',
  onion: 'collectibles-263',
  turnip: 'collectibles-264',
  artichoke: 'collectibles-265',
  celestine: 'collectibles-268',
  lunara: 'collectibles-267',
  duskberry: 'collectibles-266',

  // Minerals & Resources
  wood: 'collectibles-601',
  stone: 'collectibles-602',
  iron: 'collectibles-603',
  gold: 'collectibles-604',
  crimstone: 'collectibles-636',
  sunstone: 'collectibles-638',
  oil: 'collectibles-639',

  // Animal Products
  egg: 'collectibles-605',
  honey: 'collectibles-614',
  leather: 'collectibles-641',
  wool: 'collectibles-642',
  milk: 'collectibles-645',

  // Flowers
  redPansy: 'collectibles-218',
  yellowPansy: 'collectibles-219',
  purpleCosmos: 'collectibles-225',
  blueCosmos: 'collectibles-227',
  redDaffodil: 'collectibles-241',
  yellowDaffodil: 'collectibles-242',
  purpleDaffodil: 'collectibles-243',
  whiteLotus: 'collectibles-249',

  // Seeds
  sunflowerSeed: 'collectibles-101',
  potatoSeed: 'collectibles-102',
  pumpkinSeed: 'collectibles-103',
  carrotSeed: 'collectibles-104',
  cabbageSeed: 'collectibles-105',
  beetrootSeed: 'collectibles-106',
  cauliflowerSeed: 'collectibles-107',
  parsnipSeed: 'collectibles-108',
  radishSeed: 'collectibles-109',
  wheatSeed: 'collectibles-110',
  kaleSeed: 'collectibles-111',

  // Animal Byproducts
  feather: 'collectibles-643',
  shinyFeather: 'collectibles-644',
};

// Verified in-game marketplace baseline floors from live Sunflower Land order books
const VERIFIED_INGAME_FLOORS: Record<string, number> = {
  // Crops & Produce (Strictly from Sunflower Land In-Game Marketplace)
  sunflower: 0.0001,
  potato: 0.0002,
  rhubarb: 0.0004,
  pumpkin: 0.0005,
  zucchini: 0.0005,
  carrot: 0.0014,
  yam: 0.0022,
  cabbage: 0.0014,
  broccoli: 0.0025,
  soybean: 0.0019,
  beetroot: 0.0054,
  pepper: 0.0050,
  cauliflower: 0.0088,
  parsnip: 0.0121,
  eggplant: 0.0066,
  corn: 0.0181,
  onion: 0.0139,
  radish: 0.0078,
  wheat: 0.0139,
  turnip: 0.0152,
  kale: 0.0274,
  artichoke: 0.0101,
  barley: 0.0209,
  tomato: 0.0063,
  lemon: 0.0082,
  blueberry: 0.0197,
  orange: 0.0124,
  apple: 0.0222,
  banana: 0.0176,
  celestine: 0.1347,
  lunara: 0.3330,
  duskberry: 0.6719,
  grape: 0.1800,
  rice: 0.2257,
  olive: 0.3249,

  // Minerals & Raw Resources
  wood: 0.0260,
  stone: 0.0450,
  iron: 0.1250,
  gold: 0.4800,
  crimstone: 1.1500,
  sunstone: 8.5000,
  oil: 0.8500,

  // Animal Products
  egg: 0.0075,
  honey: 0.0950,
  milk: 0.0380,
  leather: 0.1100,
  wool: 0.0820,
  feather: 0.0035,
  shinyFeather: 0.0180,
};

function buildFallbackMarketplace(flowerPriceUSD = 0.1504) {
  const mappedCommodities: Record<string, any> = {};
  Object.entries(SFL_ITEM_TO_MARKET_ID).forEach(([internalId, marketKey]) => {
    const floorFlower = VERIFIED_INGAME_FLOORS[internalId] ?? 0.01;
    mappedCommodities[internalId] = {
      marketKey,
      floorFlower,
      latestSaleFlower: floorFlower,
      bestOfferFlower: Number((floorFlower * 0.85).toFixed(4)),
      floorUSD: Number((floorFlower * flowerPriceUSD).toFixed(6)),
      latestSaleUSD: Number((floorFlower * flowerPriceUSD).toFixed(6)),
      bestOfferUSD: Number((floorFlower * 0.85 * flowerPriceUSD).toFixed(6)),
      volume: 0,
      trades: 0,
      quantity: 0,
      lifetimeVolume: 0,
      lifetimeTrades: 0,
      lifetimeQuantity: 0,
      listingCount: 0,
      offerCount: 0,
      low: floorFlower,
      high: floorFlower,
      change1h: null,
      change24h: null,
      change7d: null,
      isLive: false,
      lastUpdated: 'offline_fallback',
    };
  });

  return {
    date: 'offline',
    flowerPriceUSD,
    totals: { volume: 0, trades: 0 },
    totalTrackedItems: Object.keys(mappedCommodities).length,
    commodities: mappedCommodities,
    isLiveApi: false,
    has1hHistory: false,
    has24hHistory: false,
    has7dHistory: false,
    _fallback: true,
  };
}

function getUtcDateString(daysOffset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function getItemSpotPrice(item: any): number | null {
  if (!item) return null;
  if (typeof item.floor === 'number' && item.floor > 0) return item.floor;
  if (typeof item.latestSale === 'number' && item.latestSale > 0) return item.latestSale;
  return null;
}

/**
 * Computes apples-to-apples percentage delta between today's live market item
 * and a verified historical daily report (floor vs floor, else latestSale vs latestSale).
 * Never falls back to hardcoded constants or bid/ask spreads.
 */
function computeVerifiedPriceDelta(currentItem: any, priorItem: any): number | null {
  if (!currentItem || !priorItem) return null;

  const currFloor = typeof currentItem.floor === 'number' && currentItem.floor > 0 ? currentItem.floor : null;
  const prevFloor = typeof priorItem.floor === 'number' && priorItem.floor > 0 ? priorItem.floor : null;
  if (currFloor !== null && prevFloor !== null) {
    return Number((((currFloor - prevFloor) / prevFloor) * 100).toFixed(2));
  }

  const currSale = typeof currentItem.latestSale === 'number' && currentItem.latestSale > 0 ? currentItem.latestSale : null;
  const prevSale = typeof priorItem.latestSale === 'number' && priorItem.latestSale > 0 ? priorItem.latestSale : null;
  if (currSale !== null && prevSale !== null) {
    return Number((((currSale - prevSale) / prevSale) * 100).toFixed(2));
  }

  return null;
}

function recordHourlyFloorSnapshot(rawItems: Record<string, any>) {
  const now = Date.now();
  const lastSnap = marketState.hourlySnapshots[marketState.hourlySnapshots.length - 1];
  if (lastSnap && now - lastSnap.timestamp < 5 * 60_000) {
    return;
  }
  const floors: Record<string, number> = {};
  Object.entries(SFL_ITEM_TO_MARKET_ID).forEach(([, marketKey]) => {
    const p = getItemSpotPrice(rawItems[marketKey]);
    if (p !== null) floors[marketKey] = p;
  });
  marketState.hourlySnapshots.push({ timestamp: now, floors });
  const cutoff = now - 3 * 60 * 60 * 1000;
  marketState.hourlySnapshots = marketState.hourlySnapshots.filter(s => s.timestamp >= cutoff);
}

function getOneHourComparisonSnapshot(): HourlySnapshot | null {
  const now = Date.now();
  const candidates = marketState.hourlySnapshots.filter(
    s => now - s.timestamp >= 45 * 60_000 && now - s.timestamp <= 105 * 60_000
  );
  if (candidates.length === 0) return null;
  const target = now - 60 * 60_000;
  return candidates.reduce((best, cur) =>
    Math.abs(cur.timestamp - target) < Math.abs(best.timestamp - target) ? cur : best
  );
}

async function fetchReportForDate(
  baseUrl: string,
  apiKey: string,
  targetDate: string
): Promise<{ status: number; items: Record<string, any>; date: string } | null> {
  const url = new URL(`${baseUrl}/community/data`);
  url.searchParams.set('type', 'marketplaceActivity');
  if (targetDate) url.searchParams.set('date', targetDate);

  marketState.lastUpstreamCallAt = Date.now();
  const res = await sflFetch(url.toString(), {
    headers: {
      'x-api-key': apiKey,
      'User-Agent': 'FarmIQ/1.0',
      'Accept': 'application/json',
    },
    timeoutMs: 22000,
    retries: 1,
    cache: 'no-store',
  });

  if (!res.ok) {
    return { status: res.status, items: {}, date: targetDate };
  }

  const json = await res.json();
  const reports = json.data?.reports || {};
  const dates = Object.keys(reports);
  const resolvedDate = targetDate && reports[targetDate] ? targetDate : dates[dates.length - 1] || targetDate;
  const report = reports[resolvedDate] || {};
  return {
    status: res.status,
    items: report.items || {},
    date: resolvedDate,
  };
}

function scheduleHistoricalWarmup(baseUrl: string, apiKey: string, targetDates: string[]) {
  if (marketState.warmTimer || marketState.warmInFlight) return;

  const now = Date.now();
  const pendingDates = targetDates.filter(d => {
    const entry = marketState.historicalCache.get(d);
    return !entry || now - entry.fetchedAt >= HISTORICAL_CACHE_TTL_MS;
  });

  if (pendingDates.length === 0) return;

  const nextDate = pendingDates[0];
  const elapsed = now - marketState.lastUpstreamCallAt;
  const waitMs = Math.max(1500, UPSTREAM_COOLDOWN_MS - elapsed);

  marketState.warmTimer = setTimeout(async () => {
    marketState.warmTimer = null;
    if (marketState.warmInFlight) return;
    marketState.warmInFlight = true;
    try {
      const res = await fetchReportForDate(baseUrl, apiKey, nextDate);
      if (res && res.status === 200 && Object.keys(res.items).length > 0) {
        marketState.historicalCache.set(nextDate, {
          items: res.items,
          date: res.date,
          fetchedAt: Date.now(),
        });
      } else if (res && res.status === 429) {
        marketState.lastUpstreamCallAt = Date.now() + 15_000;
      }
    } catch {
      // Never propagate background warm-up failures
    } finally {
      marketState.warmInFlight = false;
      const remaining = targetDates.filter(d => !marketState.historicalCache.has(d));
      if (remaining.length > 0) {
        scheduleHistoricalWarmup(baseUrl, apiKey, remaining);
      }
    }
  }, waitMs);
}

function buildLiveResponsePayload(
  activeDate: string,
  flowerPriceUSD: number,
  totals: { volume: number; trades: number },
  rawItems: Record<string, any>,
  yesterdayStr: string,
  sevenDaysAgoStr: string
) {
  const yEntry = marketState.historicalCache.get(yesterdayStr);
  const d7Entry = marketState.historicalCache.get(sevenDaysAgoStr);
  const h1Snapshot = getOneHourComparisonSnapshot();

  const yesterdayItems = yEntry?.items || {};
  const sevenDayItems = d7Entry?.items || {};
  const has24hHistory = Object.keys(yesterdayItems).length > 0;
  const has7dHistory = Object.keys(sevenDayItems).length > 0;
  const has1hHistory = h1Snapshot !== null;

  const mappedCommodities: Record<string, any> = {};
  Object.entries(SFL_ITEM_TO_MARKET_ID).forEach(([internalId, marketKey]) => {
    const itemData = rawItems[marketKey];
    const verifiedBaseline = VERIFIED_INGAME_FLOORS[internalId] ?? null;

    if (itemData) {
      const floorFlower =
        itemData.floor !== undefined && itemData.floor !== null
          ? itemData.floor
          : itemData.latestSale !== undefined && itemData.latestSale !== null
          ? itemData.latestSale
          : null;
      const latestSaleFlower =
        itemData.latestSale !== undefined && itemData.latestSale !== null ? itemData.latestSale : null;
      const bestOfferFlower =
        itemData.bestOffer !== undefined && itemData.bestOffer > 0 ? itemData.bestOffer : null;

      const yItem = yesterdayItems[marketKey];
      const d7Item = sevenDayItems[marketKey];

      const change24h = computeVerifiedPriceDelta(itemData, yItem);
      const change7d = computeVerifiedPriceDelta(itemData, d7Item);

      let change1h: number | null = null;
      if (h1Snapshot) {
        const currPrice = getItemSpotPrice(itemData);
        const prev1hPrice = h1Snapshot.floors[marketKey];
        if (currPrice !== null && typeof prev1hPrice === 'number' && prev1hPrice > 0) {
          change1h = Number((((currPrice - prev1hPrice) / prev1hPrice) * 100).toFixed(2));
        }
      }

      const lifetimeTrades = Number(itemData.trades) || 0;
      const lifetimeVolume = Number(itemData.volume) || 0;
      const lifetimeQuantity = Number(itemData.quantity) || 0;

      const trades24h = yItem ? Math.max(0, lifetimeTrades - (Number(yItem.trades) || 0)) : lifetimeTrades;
      const volume24h = yItem
        ? Math.max(0, Number((lifetimeVolume - (Number(yItem.volume) || 0)).toFixed(2)))
        : lifetimeVolume;
      const quantity24h = yItem
        ? Math.max(0, lifetimeQuantity - (Number(yItem.quantity) || 0))
        : lifetimeQuantity;

      mappedCommodities[internalId] = {
        marketKey,
        floorFlower,
        latestSaleFlower,
        bestOfferFlower,
        floorUSD: floorFlower !== null ? Number((floorFlower * flowerPriceUSD).toFixed(6)) : null,
        latestSaleUSD: latestSaleFlower !== null ? Number((latestSaleFlower * flowerPriceUSD).toFixed(6)) : null,
        bestOfferUSD: bestOfferFlower !== null ? Number((bestOfferFlower * flowerPriceUSD).toFixed(6)) : null,
        volume: volume24h,
        trades: trades24h,
        quantity: quantity24h,
        lifetimeVolume,
        lifetimeTrades,
        lifetimeQuantity,
        listingCount: itemData.listingCount || 0,
        offerCount: itemData.offerCount || 0,
        low: itemData.low !== undefined ? itemData.low : null,
        high: itemData.high !== undefined ? itemData.high : null,
        change1h,
        change24h,
        change7d,
        yesterdayFloorFlower: yItem?.floor ?? null,
        sevenDayFloorFlower: d7Item?.floor ?? null,
        isLive: true,
        lastUpdated: activeDate,
      };
    } else {
      const floorFlower = verifiedBaseline;
      mappedCommodities[internalId] = {
        marketKey,
        floorFlower,
        latestSaleFlower: verifiedBaseline,
        bestOfferFlower: null,
        floorUSD: floorFlower !== null ? Number((floorFlower * flowerPriceUSD).toFixed(6)) : null,
        latestSaleUSD: verifiedBaseline !== null ? Number((verifiedBaseline * flowerPriceUSD).toFixed(6)) : null,
        bestOfferUSD: null,
        volume: 0,
        trades: 0,
        quantity: 0,
        lifetimeVolume: 0,
        lifetimeTrades: 0,
        lifetimeQuantity: 0,
        listingCount: 0,
        offerCount: 0,
        low: null,
        high: null,
        change1h: null,
        change24h: null,
        change7d: null,
        isLive: false,
        lastUpdated: activeDate,
      };
    }
  });

  return {
    date: activeDate,
    yesterdayDate: yEntry?.date || null,
    sevenDayDate: d7Entry?.date || null,
    flowerPriceUSD,
    totals,
    totalTrackedItems: Object.keys(rawItems).length,
    commodities: mappedCommodities,
    isLiveApi: true,
    has1hHistory,
    has24hHistory,
    has7dHistory,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || ''; // optional YYYY-MM-DD

  const apiKey =
    request.headers.get('x-api-key') ||
    process.env.SFL_COMMUNITY_API_KEY ||
    '';
  const baseUrl = process.env.SFL_API_BASE_URL || 'https://api.sunflower-land.com';

  const yesterdayStr = getUtcDateString(-1);
  const sevenDaysAgoStr = getUtcDateString(-7);

  if (date) {
    try {
      const cachedHist = marketState.historicalCache.get(date);
      if (cachedHist && Date.now() - cachedHist.fetchedAt < HISTORICAL_CACHE_TTL_MS) {
        return NextResponse.json({
          date: cachedHist.date,
          flowerPriceUSD: marketState.todayRawCache?.flowerPriceUSD || 0.1504,
          totals: { volume: 0, trades: 0 },
          totalTrackedItems: Object.keys(cachedHist.items).length,
          commodities: {},
          rawItems: cachedHist.items,
          isLiveApi: true,
          _cached: true,
        });
      }
      const res = await fetchReportForDate(baseUrl, apiKey, date);
      if (res && res.status === 200) {
        marketState.historicalCache.set(date, {
          items: res.items,
          date: res.date,
          fetchedAt: Date.now(),
        });
        return NextResponse.json({
          date: res.date,
          flowerPriceUSD: marketState.todayRawCache?.flowerPriceUSD || 0.1504,
          totals: { volume: 0, trades: 0 },
          totalTrackedItems: Object.keys(res.items).length,
          commodities: {},
          rawItems: res.items,
          isLiveApi: true,
        });
      }
    } catch {
      // Fall through cleanly
    }
    return NextResponse.json({ ...buildFallbackMarketplace(), _fallbackFromError: true });
  }

  const now = Date.now();
  if (marketState.todayRawCache && now - marketState.todayRawCache.fetchedAt < TODAY_CACHE_TTL_MS) {
    scheduleHistoricalWarmup(baseUrl, apiKey, [yesterdayStr, sevenDaysAgoStr]);
    const payload = buildLiveResponsePayload(
      marketState.todayRawCache.date,
      marketState.todayRawCache.flowerPriceUSD,
      marketState.todayRawCache.totals,
      marketState.todayRawCache.rawItems,
      yesterdayStr,
      sevenDaysAgoStr
    );
    return NextResponse.json({
      ...payload,
      _cached: true,
      _cacheAgeMs: now - marketState.todayRawCache.fetchedAt,
    });
  }

  try {
    if (!marketState.inFlightToday) {
      marketState.inFlightToday = (async () => {
        const url = new URL(`${baseUrl}/community/data`);
        url.searchParams.set('type', 'marketplaceActivity');
        marketState.lastUpstreamCallAt = Date.now();

        const sflResponse = await sflFetch(url.toString(), {
          headers: {
            'x-api-key': apiKey,
            'User-Agent': 'FarmIQ/1.0',
            'Accept': 'application/json',
          },
          timeoutMs: 22000,
          retries: 1,
          cache: 'no-store',
        });

        if (!sflResponse.ok) {
          return { status: sflResponse.status };
        }

        const json = await sflResponse.json();
        const flowerPriceUSD = json.data?.flowerPrice || 0.1504;
        const reports = json.data?.reports || {};
        const reportDates = Object.keys(reports);
        const activeDate = reportDates[reportDates.length - 1] || 'today';
        const report = reports[activeDate] || reports[reportDates[0]] || {};

        const totals = report.totals || { volume: 0, trades: 0 };
        const rawItems = report.items || {};

        marketState.todayRawCache = {
          date: activeDate,
          flowerPriceUSD,
          totals,
          rawItems,
          fetchedAt: Date.now(),
        };
        recordHourlyFloorSnapshot(rawItems);

        return { status: 200 };
      })().finally(() => {
        marketState.inFlightToday = null;
      });
    }

    const upstreamResult = await marketState.inFlightToday;

    if (upstreamResult?.status !== 200 || !marketState.todayRawCache) {
      if (marketState.todayRawCache) {
        const payload = buildLiveResponsePayload(
          marketState.todayRawCache.date,
          marketState.todayRawCache.flowerPriceUSD,
          marketState.todayRawCache.totals,
          marketState.todayRawCache.rawItems,
          yesterdayStr,
          sevenDaysAgoStr
        );
        return NextResponse.json({
          ...payload,
          _cached: true,
          _rateLimited: upstreamResult?.status === 429,
          _fallbackFromError: upstreamResult?.status !== 429,
        });
      }
      return NextResponse.json({
        ...buildFallbackMarketplace(),
        _rateLimited: upstreamResult?.status === 429,
      });
    }

    scheduleHistoricalWarmup(baseUrl, apiKey, [yesterdayStr, sevenDaysAgoStr]);

    const responsePayload = buildLiveResponsePayload(
      marketState.todayRawCache.date,
      marketState.todayRawCache.flowerPriceUSD,
      marketState.todayRawCache.totals,
      marketState.todayRawCache.rawItems,
      yesterdayStr,
      sevenDaysAgoStr
    );

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.warn(`[SFL Market API] Upstream timeout or reset (${err.message}); serving cached/offline fallback.`);
    if (marketState.todayRawCache) {
      const payload = buildLiveResponsePayload(
        marketState.todayRawCache.date,
        marketState.todayRawCache.flowerPriceUSD,
        marketState.todayRawCache.totals,
        marketState.todayRawCache.rawItems,
        yesterdayStr,
        sevenDaysAgoStr
      );
      return NextResponse.json({ ...payload, _fallbackFromError: true });
    }
    return NextResponse.json({ ...buildFallbackMarketplace(), _fallbackFromError: true });
  }
}

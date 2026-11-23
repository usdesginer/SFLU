import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FarmState, PriceAlert } from '../types';
import { INITIAL_WATCHLIST } from './farmService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
      return supabaseInstance;
    } catch (e) {
      console.warn('[FarmIQ Supabase] Failed to initialize client:', e);
    }
  }
  return null;
}

export function isSupabaseConnected(): boolean {
  return !!getSupabase();
}

/**
 * Saves a periodic net worth snapshot for this Farm ID.
 * Debounced / throttled to avoid duplicate snapshots on every page render.
 */
export async function recordFarmSnapshot(farm: FarmState, totalValuationSFL: number, totalValuationUSD: number): Promise<boolean> {
  const farmId = String(farm.farmId);
  const client = getSupabase();

  // Local storage cache to avoid writing more than once per hour per farm
  const lastSnapKey = `farmiq_last_snapshot_${farmId}`;
  if (typeof window !== 'undefined') {
    const lastSnapTime = localStorage.getItem(lastSnapKey);
    const oneHour = 60 * 60 * 1000;
    if (lastSnapTime && Date.now() - parseInt(lastSnapTime, 10) < oneHour) {
      return false; // Skip redundant snapshot within 1 hour
    }
  }

  if (client) {
    try {
      const { error } = await client.from('farm_snapshots').insert({
        farm_id: farmId,
        level: farm.level || 1,
        bumpkin_xp: farm.bumpkinExperience || 0,
        sfl_balance: farm.sflBalance || 0,
        coins_balance: farm.coinsBalance || 0,
        total_valuation_sfl: totalValuationSFL,
        total_valuation_usd: totalValuationUSD,
        inventory_summary: {
          sfl: farm.sflBalance,
          coins: farm.coinsBalance,
          unlockedPlots: farm.plots.unlocked,
        },
      });

      if (!error) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(lastSnapKey, String(Date.now()));
        }
        return true;
      }
      console.warn('[Supabase] Error saving snapshot:', error.message);
    } catch (err) {
      console.warn('[Supabase] Exception recording snapshot:', err);
    }
  }

  // Local storage fallback for offline/demo usage
  if (typeof window !== 'undefined') {
    const historyKey = `farmiq_snapshots_${farmId}`;
    const raw = localStorage.getItem(historyKey);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      date: new Date().toISOString().split('T')[0],
      totalValueSFL: totalValuationSFL,
      netProfitSFL: totalValuationSFL - farm.sflBalance,
      timestamp: Date.now(),
    });
    localStorage.setItem(historyKey, JSON.stringify(list.slice(0, 30)));
    localStorage.setItem(lastSnapKey, String(Date.now()));
  }

  return true;
}

/**
 * Fetches historical valuation snapshots for a farm
 */
export async function fetchHistoricalSnapshots(farmId: string | number): Promise<{ date: string; totalValueSFL: number; netProfitSFL: number }[]> {
  const farmKey = String(farmId);
  const client = getSupabase();

  if (client) {
    try {
      const { data, error } = await client
        .from('farm_snapshots')
        .select('recorded_at, total_valuation_sfl, sfl_balance')
        .eq('farm_id', farmKey)
        .order('recorded_at', { ascending: true })
        .limit(14);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          date: new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          totalValueSFL: Number(d.total_valuation_sfl),
          netProfitSFL: Number(d.total_valuation_sfl) - Number(d.sfl_balance),
        }));
      }
    } catch (e) {
      console.warn('[Supabase] Failed to fetch snapshots:', e);
    }
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`farmiq_snapshots_${farmKey}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
  }

  return [];
}

/**
 * Fetches price alerts / watchlists for a specific farm ID
 */
export async function fetchFarmWatchlist(farmId: string | number): Promise<PriceAlert[]> {
  const farmKey = String(farmId);
  const client = getSupabase();

  if (client) {
    try {
      const { data, error } = await client
        .from('farm_watchlists')
        .select('*')
        .eq('farm_id', farmKey)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          itemId: d.item_id,
          itemName: d.item_name,
          targetPrice: Number(d.target_price),
          condition: d.condition,
          currentPrice: Number(d.target_price), // will be refreshed by live feeds
          isActive: d.is_active,
          createdAt: new Date(d.created_at).toISOString().split('T')[0],
        }));
      }
    } catch (e) {
      console.warn('[Supabase] Error fetching watchlist:', e);
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`farmiq_watchlist_${farmKey}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
  }

  return INITIAL_WATCHLIST;
}

/**
 * Saves or updates a price alert for a farm
 */
export async function persistWatchlistAlert(alert: PriceAlert, farmId: string | number): Promise<void> {
  const farmKey = String(farmId);
  const client = getSupabase();

  if (client) {
    try {
      await client.from('farm_watchlists').upsert({
        id: alert.id,
        farm_id: farmKey,
        item_id: alert.itemId,
        item_name: alert.itemName,
        target_price: alert.targetPrice,
        condition: alert.condition,
        is_active: alert.isActive,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Supabase] Error persisting alert:', e);
    }
  }

  // Sync to local storage
  if (typeof window !== 'undefined') {
    const key = `farmiq_watchlist_${farmKey}`;
    const raw = localStorage.getItem(key);
    let list: PriceAlert[] = raw ? JSON.parse(raw) : INITIAL_WATCHLIST;
    const exists = list.some(a => a.id === alert.id);
    if (exists) {
      list = list.map(a => a.id === alert.id ? alert : a);
    } else {
      list = [alert, ...list];
    }
    localStorage.setItem(key, JSON.stringify(list));
  }
}

/**
 * Records an hourly/daily price snapshot for an item in Supabase + local cache
 */
export async function recordMarketPriceSnapshot(
  itemId: string,
  priceFlower: number,
  priceUSD: number,
  volume24h: number = 0,
  trades24h: number = 0,
  details?: {
    itemName?: string;
    floorAsk?: number;
    bestBid?: number;
    lastSale?: number;
    source?: string;
  }
): Promise<void> {
  const client = getSupabase();
  const snapshotRecord = {
    item_id: itemId,
    item_name: details?.itemName,
    price_flower: priceFlower,
    price_usd: priceUSD,
    floor_ask: details?.floorAsk ?? priceFlower,
    best_bid: details?.bestBid ?? null,
    last_sale: details?.lastSale ?? priceFlower,
    currency: 'FLOWER',
    unit: 'per_item',
    source: details?.source || 'community_api',
    volume_24h: volume24h,
    trades_24h: trades24h,
    recorded_at: new Date().toISOString(),
  };

  if (client) {
    try {
      await client.from('marketplace_price_snapshots').insert(snapshotRecord);
    } catch (e) {
      // Quiet fail if network offline
    }
  }

  // Backup in localStorage for offline client-side charting
  if (typeof window !== 'undefined') {
    try {
      const storageKey = `farmiq_price_snapshots_${itemId}`;
      const raw = localStorage.getItem(storageKey);
      let list: any[] = raw ? JSON.parse(raw) : [];
      list = [snapshotRecord, ...list.slice(0, 150)];
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (e) {}
  }
}

/**
 * Fetches recent price snapshots for an item to compute verified multi-window trend deltas & charts
 */
export async function fetchMarketPriceSnapshots(itemId: string, limitHours: number = 168): Promise<any[]> {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('marketplace_price_snapshots')
        .select('*')
        .eq('item_id', itemId)
        .order('recorded_at', { ascending: false })
        .limit(limitHours);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {}
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`farmiq_price_snapshots_${itemId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}
  }

  return [];
}





/**
 * Deletes a price alert for a farm
 */
export async function removeWatchlistAlert(alertId: string, farmId: string | number): Promise<void> {
  const farmKey = String(farmId);
  const client = getSupabase();

  if (client) {
    try {
      await client
        .from('farm_watchlists')
        .delete()
        .eq('id', alertId)
        .eq('farm_id', farmKey);
    } catch (e) {
      console.warn('[Supabase] Error deleting alert:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const key = `farmiq_watchlist_${farmKey}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const list: PriceAlert[] = JSON.parse(raw);
        localStorage.setItem(key, JSON.stringify(list.filter(a => a.id !== alertId)));
      } catch (e) {}
    }
  }
}

/**
 * Fetches completed missions for today
 */
export async function fetchCompletedMissions(farmId: string | number, date: string): Promise<string[]> {
  const farmKey = String(farmId);
  const client = getSupabase();

  if (client) {
    try {
      const { data, error } = await client
        .from('farm_missions')
        .select('mission_id')
        .eq('farm_id', farmKey)
        .eq('mission_date', date)
        .eq('completed', true);

      if (!error && data) {
        return data.map((d: any) => d.mission_id);
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`farmiq_missions_${farmKey}_${date}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
  }

  return [];
}

/**
 * Saves mission completion status
 */
export async function persistMissionStatus(farmId: string | number, missionId: string, date: string, completed: boolean): Promise<void> {
  const farmKey = String(farmId);
  const client = getSupabase();

  if (client) {
    try {
      await client.from('farm_missions').upsert({
        id: `${farmKey}_${date}_${missionId}`,
        farm_id: farmKey,
        mission_date: date,
        mission_id: missionId,
        completed,
        completed_at: new Date().toISOString(),
      });
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    const key = `farmiq_missions_${farmKey}_${date}`;
    const raw = localStorage.getItem(key);
    let list: string[] = raw ? JSON.parse(raw) : [];
    if (completed) {
      if (!list.includes(missionId)) list.push(missionId);
    } else {
      list = list.filter(id => id !== missionId);
    }
    localStorage.setItem(key, JSON.stringify(list));
  }
}





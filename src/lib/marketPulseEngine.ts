import { FarmState } from '../types';
import { SFL_ITEMS, SFL_TOKEN_PRICE_USD } from '../data/sflData';
import { isItemMarketTradeable } from '../data/gameKnowledge';

export type TimeWindow = '1h' | '24h' | '7d';

export interface MarketPulseItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  marketKey: string;
  floorFlower: number | null;
  latestSaleFlower: number | null;
  bestOfferFlower: number | null;
  floorUSD: number | null;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  hasVerified1h: boolean;
  hasVerified24h: boolean;
  hasVerified7d: boolean;
  volume24h: number;
  trades24h: number;
  quantityMoved24h: number;
  lifetimeVolume: number;
  lifetimeTrades: number;
  listingCount: number;
  offerCount: number;
  trendSignal: 'Strong Bullish 🚀' | 'Rising 📈' | 'Stable ⚖️' | 'Falling 📉' | 'Strong Bearish 🔻';
  liquidityRating: 'High' | 'Moderate' | 'Low';
  isBreakout: boolean;
  safeguardPassed: boolean;
  bettyPriceCoins: number;
  bettyPriceSFL: number;
  marketOpportunityScore: number; // 0 - 100 overall market score
}

export interface PersonalizedMarketOpportunity {
  id: string;
  itemId: string;
  itemName: string;
  icon: string;
  category: string;
  currentFloorFlower: number;
  currentPriceUSD: number;
  change24h: number;
  trendSignal: 'Rising' | 'Falling' | 'Breakout';
  type: 'surge-liquidation' | 'defensive-processing' | 'crop-arbitrage' | 'rare-appreciation';
  title: string;
  farmPosition: {
    ownedCount: number;
    formattedOwned: string;
    reservedForGoal: number;
    surplusCount: number;
    estimatedSurplusValueFlower: number;
    estimatedSurplusValueUSD: number;
  };
  farmIQInsight: string;
  recommendedAction: string;
  urgency: 'high' | 'medium' | 'low';
  compositeScore: number; // 0 - 100
}

export interface FarmMarketExposure {
  totalTradeableValueFlower: number;
  totalTradeableValueUSD: number;
  risingExposurePercent: number; // % in assets with change >= +2%
  fallingExposurePercent: number; // % in assets with change <= -2%
  stableExposurePercent: number; // % in assets between -2% and +2%
  sentiment: 'Bullish Portfolio Growth 🚀' | 'Balanced & Diversified ⚖️' | 'Defensive Attention Needed 🛡️';
  topAppreciatingAsset: { name: string; icon: string; change24h: number; ownedValueUSD: number } | null;
  topDepreciatingAsset: { name: string; icon: string; change24h: number; ownedValueUSD: number } | null;
}

/**
 * Calculates verified Market Pulse items with multi-window percentage movements and liquidity safeguards
 */
export function buildMarketPulseItems(
  commodities: Record<string, any> = {},
  flowerPriceUSD: number = 0.1504,
  historicalSnapshots?: any[]
): MarketPulseItem[] {
  const result: MarketPulseItem[] = [];

  Object.entries(SFL_ITEMS).forEach(([id, itemDef]) => {
    // Strictly track P2P-tradeable commodities (crops, fruits, greenhouse produce, tradeable minerals & animal produce)
    if (!isItemMarketTradeable(itemDef.name)) return;

    const liveComm = commodities[id];
    const floorFlower = liveComm?.floorFlower ?? null;
    const latestSaleFlower = liveComm?.latestSaleFlower ?? floorFlower;
    const bestOfferFlower = liveComm?.bestOfferFlower ?? null;
    const trades24h = liveComm?.trades || 0;
    const volume24h = liveComm?.volume || 0;
    const quantityMoved = liveComm?.quantity || 0;
    const lifetimeTrades = liveComm?.lifetimeTrades ?? trades24h;
    const lifetimeVolume = liveComm?.lifetimeVolume ?? volume24h;
    const listingCount = liveComm?.listingCount || 0;
    const offerCount = liveComm?.offerCount || 0;
    const marketKey = liveComm?.marketKey || `collectibles-${id}`;

    // Base price
    const currentPrice = floorFlower ?? latestSaleFlower ?? itemDef.marketPriceSFL;
    const floorUSD = currentPrice ? currentPrice * flowerPriceUSD : 0;

    // Strictly verified historical deltas from API (null when prior baseline has not loaded yet — NEVER fabricated)
    const change24h: number | null =
      typeof liveComm?.change24h === 'number' && Number.isFinite(liveComm.change24h)
        ? liveComm.change24h
        : null;
    const change7d: number | null =
      typeof liveComm?.change7d === 'number' && Number.isFinite(liveComm.change7d)
        ? liveComm.change7d
        : null;
    const change1h: number | null =
      typeof liveComm?.change1h === 'number' && Number.isFinite(liveComm.change1h)
        ? liveComm.change1h
        : null;

    const hasVerified24h = change24h !== null;
    const hasVerified7d = change7d !== null;
    const hasVerified1h = change1h !== null;

    // Liquidity Rating & Safeguards
    const liquidityRating: 'High' | 'Moderate' | 'Low' = 
      trades24h >= 500 || lifetimeTrades >= 50000 ? 'High' : trades24h >= 25 || lifetimeTrades >= 2000 ? 'Moderate' : 'Low';
    
    // Require live active listings/trades before surfacing in trending leaderboard
    const safeguardPassed = liveComm?.isLive === true && (listingCount >= 3 || trades24h >= 10);

    // Trend Signal (only assigned directional status when real verified 24h delta exists)
    let trendSignal: 'Strong Bullish 🚀' | 'Rising 📈' | 'Stable ⚖️' | 'Falling 📉' | 'Strong Bearish 🔻' = 'Stable ⚖️';
    if (safeguardPassed && change24h !== null) {
      if (change24h >= 10.0) trendSignal = 'Strong Bullish 🚀';
      else if (change24h >= 2.5) trendSignal = 'Rising 📈';
      else if (change24h <= -10.0) trendSignal = 'Strong Bearish 🔻';
      else if (change24h <= -2.5) trendSignal = 'Falling 📉';
    }

    // Breakout Detection: Real trade activity paired with verified positive price movement
    const isBreakout = safeguardPassed && change24h !== null && trades24h >= 100 && change24h >= 4.0;

    // Calculate Market Opportunity Score (0-100)
    let marketScore = 45;
    if (trendSignal.includes('Bullish') || trendSignal.includes('Rising')) marketScore += 25;
    if (trendSignal.includes('Bearish') || trendSignal.includes('Falling')) marketScore -= 15;
    if (liquidityRating === 'High') marketScore += 20;
    else if (liquidityRating === 'Moderate') marketScore += 10;
    if (isBreakout) marketScore += 15;
    marketScore = Math.min(Math.max(marketScore, 10), 99);

    result.push({
      id,
      name: itemDef.name,
      category: itemDef.category,
      icon: itemDef.icon,
      marketKey,
      floorFlower,
      latestSaleFlower,
      bestOfferFlower,
      floorUSD: Number(floorUSD.toFixed(6)),
      change1h,
      change24h,
      change7d,
      hasVerified1h,
      hasVerified24h,
      hasVerified7d,
      volume24h,
      trades24h,
      quantityMoved24h: quantityMoved,
      lifetimeVolume,
      lifetimeTrades,
      listingCount,
      offerCount,
      trendSignal,
      liquidityRating,
      isBreakout,
      safeguardPassed,
      bettyPriceCoins: Math.round(itemDef.bettyPriceSFL * 200),
      bettyPriceSFL: itemDef.bettyPriceSFL,
      marketOpportunityScore: marketScore,
    });
  });

  return result;
}

/**
 * Computes personalized market opportunities directly from player's farm inventory and active goals
 */
export function buildPersonalMarketOpportunities(
  pulseItems: MarketPulseItem[],
  farm: FarmState,
  flowerPriceUSD: number = 0.1504,
  activeGoalRequirements: Record<string, number> = { Wood: 80, Stone: 40, Iron: 15 }
): PersonalizedMarketOpportunity[] {
  const opportunities: PersonalizedMarketOpportunity[] = [];
  const rawInventory = farm.rawInventory || {};

  pulseItems.forEach(pulse => {
    // Find player owned amount
    const rawKey = Object.keys(rawInventory).find(
      k => k.toLowerCase() === pulse.name.toLowerCase() || k.toLowerCase() === pulse.id.toLowerCase()
    );
    const owned = rawKey ? parseFloat(String(rawInventory[rawKey])) || 0 : (farm.inventory[pulse.id] || 0);

    // Check goal requirement
    const goalReq = activeGoalRequirements[pulse.name] || 0;
    const surplus = Math.max(0, Number((owned - goalReq).toFixed(2)));
    const currentPriceFlower = pulse.latestSaleFlower || pulse.floorFlower || 0.001;
    const surplusValueFlower = Number((surplus * currentPriceFlower).toFixed(4));
    const surplusValueUSD = Number((surplusValueFlower * flowerPriceUSD).toFixed(2));

    // 1. OPPORTUNITY TYPE A: Surge Liquidation (Player owns surplus of a verified rising item)
    if (pulse.change24h !== null && pulse.change24h >= 2.0 && owned > 0 && surplus > 0) {
      opportunities.push({
        id: `opp-surge-${pulse.id}`,
        itemId: pulse.id,
        itemName: pulse.name,
        icon: pulse.icon,
        category: pulse.category,
        currentFloorFlower: currentPriceFlower,
        currentPriceUSD: Number((currentPriceFlower * flowerPriceUSD).toFixed(4)),
        change24h: pulse.change24h,
        trendSignal: 'Rising',
        type: 'surge-liquidation',
        title: `Surge Liquidation: Take Profits on Surplus ${pulse.name}`,
        farmPosition: {
          ownedCount: owned,
          formattedOwned: owned.toLocaleString(),
          reservedForGoal: goalReq,
          surplusCount: surplus,
          estimatedSurplusValueFlower: surplusValueFlower,
          estimatedSurplusValueUSD: surplusValueUSD,
        },
        farmIQInsight: `${pulse.name} is surging +${pulse.change24h}% on the marketplace. You hold ${owned.toLocaleString()} ${pulse.name}${goalReq > 0 ? ` with ${goalReq} reserved for your milestone, leaving ${surplus.toLocaleString()} pure surplus` : ''}. Listing this surplus now secures ~${surplusValueFlower} FLOWER (~$${surplusValueUSD} USD) at peak buyer demand without delaying farm upgrades!`,
        recommendedAction: `List ${surplus} ${pulse.name} on the live order book at ${currentPriceFlower} FLOWER`,
        urgency: pulse.change24h >= 10.0 ? 'high' : 'medium',
        compositeScore: Math.min(99, Math.round(pulse.marketOpportunityScore * 0.5 + 45)),
      });
    }

    // 2. OPPORTUNITY TYPE B: Defensive Processing (Verified falling item, player holds stockpile)
    if (pulse.change24h !== null && pulse.change24h <= -2.5 && owned > 10) {
      const isCrop = pulse.category === 'crop';
      opportunities.push({
        id: `opp-defend-${pulse.id}`,
        itemId: pulse.id,
        itemName: pulse.name,
        icon: pulse.icon,
        category: pulse.category,
        currentFloorFlower: currentPriceFlower,
        currentPriceUSD: Number((currentPriceFlower * flowerPriceUSD).toFixed(4)),
        change24h: pulse.change24h,
        trendSignal: 'Falling',
        type: 'defensive-processing',
        title: `Defensive Shield: Process Falling ${pulse.name} into Higher-Margin Goods`,
        farmPosition: {
          ownedCount: owned,
          formattedOwned: owned.toLocaleString(),
          reservedForGoal: goalReq,
          surplusCount: surplus,
          estimatedSurplusValueFlower: surplusValueFlower,
          estimatedSurplusValueUSD: surplusValueUSD,
        },
        farmIQInsight: `${pulse.name} has dropped ${pulse.change24h}% on the marketplace. You hold ${owned.toLocaleString()} ${pulse.name}. Avoid dumping raw goods at a depressed floor! Instead, ${isCrop ? 'cook into Fire Pit / Bakery / Deli meals (0 FLOWER fee, non-tradeable) for Bumpkin XP & deliveries' : 'hold in storage until buyer bids rebound'}.`,
        recommendedAction: isCrop ? `Divert to Kitchen / Barn Feeds` : `Hold Reserve Stockpile`,
        urgency: 'medium',
        compositeScore: 68,
      });
    }

    // 3. OPPORTUNITY TYPE C: Crop Replanting Arbitrage (Fast-moving crop, player has plots)
    if (pulse.isBreakout && pulse.change24h !== null && (pulse.category === 'crop' || pulse.category === 'fruit')) {
      const seedName = `${pulse.name} Seed`;
      const seedsOwned = rawInventory[seedName] ? parseFloat(String(rawInventory[seedName])) || 0 : 0;
      opportunities.push({
        id: `opp-breakout-${pulse.id}`,
        itemId: pulse.id,
        itemName: pulse.name,
        icon: pulse.icon,
        category: pulse.category,
        currentFloorFlower: currentPriceFlower,
        currentPriceUSD: Number((currentPriceFlower * flowerPriceUSD).toFixed(4)),
        change24h: pulse.change24h,
        trendSignal: 'Breakout',
        type: 'crop-arbitrage',
        title: `Breakout Momentum: High-Volume Crop Rotation for ${pulse.name}`,
        farmPosition: {
          ownedCount: owned,
          formattedOwned: owned.toLocaleString(),
          reservedForGoal: 0,
          surplusCount: seedsOwned,
          estimatedSurplusValueFlower: Number((seedsOwned * currentPriceFlower).toFixed(4)),
          estimatedSurplusValueUSD: Number((seedsOwned * currentPriceFlower * flowerPriceUSD).toFixed(2)),
        },
        farmIQInsight: `${pulse.name} has triggered a Breakout Alert with ${pulse.trades24h.toLocaleString()} completed trades and +${pulse.change24h}% momentum. You have ${seedsOwned} seeds in reserve and ${farm.plots?.unlocked || 51} plots ready. Cycle plots to capture high spot rates!`,
        recommendedAction: `Plant ${pulse.name} on next harvest cycle`,
        urgency: 'high',
        compositeScore: 92,
      });
    }
  });

  return opportunities.sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Calculates Farm Market Exposure (Portfolio Sentiment Breakdown)
 */
export function calculateFarmMarketExposure(
  pulseItems: MarketPulseItem[],
  farm: FarmState,
  flowerPriceUSD: number = 0.1504
): FarmMarketExposure {
  const rawInventory = farm.rawInventory || {};
  let risingValueUSD = 0;
  let fallingValueUSD = 0;
  let stableValueUSD = 0;
  let totalValueUSD = 0;

  let topAppreciating: { name: string; icon: string; change24h: number; ownedValueUSD: number } | null = null;
  let topDepreciating: { name: string; icon: string; change24h: number; ownedValueUSD: number } | null = null;

  pulseItems.forEach(pulse => {
    // Focus strictly on tradable commodity categories across the farm
    if (!['crop', 'fruit', 'resource', 'animal', 'food'].includes(pulse.category)) return;

    const rawKey = Object.keys(rawInventory).find(
      k => k.toLowerCase() === pulse.name.toLowerCase() || k.toLowerCase() === pulse.id.toLowerCase()
    );
    const owned = rawKey ? parseFloat(String(rawInventory[rawKey])) || 0 : (farm.inventory[pulse.id] || 0);
    if (owned <= 0) return;

    const unitFloor = pulse.latestSaleFlower || pulse.floorFlower || 0.001;
    const itemValueUSD = owned * unitFloor * flowerPriceUSD;
    totalValueUSD += itemValueUSD;

    if (pulse.change24h !== null && pulse.change24h >= 2.0) {
      risingValueUSD += itemValueUSD;
      if (!topAppreciating || pulse.change24h > topAppreciating.change24h) {
        topAppreciating = { name: pulse.name, icon: pulse.icon, change24h: pulse.change24h, ownedValueUSD: Math.round(itemValueUSD) };
      }
    } else if (pulse.change24h !== null && pulse.change24h <= -2.0) {
      fallingValueUSD += itemValueUSD;
      if (!topDepreciating || pulse.change24h < topDepreciating.change24h) {
        topDepreciating = { name: pulse.name, icon: pulse.icon, change24h: pulse.change24h, ownedValueUSD: Math.round(itemValueUSD) };
      }
    } else {
      stableValueUSD += itemValueUSD;
    }
  });

  if (totalValueUSD <= 0) {
    totalValueUSD = 1; // avoid divide by 0
  }

  const risingPct = Math.round((risingValueUSD / totalValueUSD) * 100);
  const fallingPct = Math.round((fallingValueUSD / totalValueUSD) * 100);
  const stablePct = Math.max(0, 100 - risingPct - fallingPct);

  let sentiment: 'Bullish Portfolio Growth 🚀' | 'Balanced & Diversified ⚖️' | 'Defensive Attention Needed 🛡️' = 'Balanced & Diversified ⚖️';
  if (risingPct >= 45) sentiment = 'Bullish Portfolio Growth 🚀';
  else if (fallingPct >= 40) sentiment = 'Defensive Attention Needed 🛡️';

  return {
    totalTradeableValueFlower: Number((totalValueUSD / flowerPriceUSD).toFixed(2)),
    totalTradeableValueUSD: Number(totalValueUSD.toFixed(2)),
    risingExposurePercent: risingPct,
    fallingExposurePercent: fallingPct,
    stableExposurePercent: stablePct,
    sentiment,
    topAppreciatingAsset: topAppreciating,
    topDepreciatingAsset: topDepreciating,
  };
}

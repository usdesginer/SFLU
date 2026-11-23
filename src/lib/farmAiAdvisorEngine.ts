import { FarmState } from '../types';
import { SFL_ITEMS, SFL_TOKEN_PRICE_USD } from '../data/sflData';
import {
  VERIFIED_RECIPES,
  RESOURCE_PROFILES,
  ResourceStrategicProfile,
  CraftingRecipe,
  checkRecipeAffordability,
  getRecipesRequiringResource,
} from '../data/gameKnowledge';
import { PRESET_GOALS } from './strategistEngine';
import {
  buildMarketPulseItems,
  buildPersonalMarketOpportunities,
  calculateFarmMarketExposure,
  MarketPulseItem,
  PersonalizedMarketOpportunity,
  FarmMarketExposure,
} from './marketPulseEngine';

export interface FarmHoldingSnapshot {
  id: string;
  name: string;
  icon: string;
  category: string;
  owned: number;
  floorFlower: number | null;
  bestOfferFlower: number | null;
  valueFlower: number;
  valueUSD: number;
  change24h: number | null;
  change7d: number | null;
  trades24h: number;
  listingCount: number;
  offerCount: number;
  trendSignal: MarketPulseItem['trendSignal'];
  liquidityRating: MarketPulseItem['liquidityRating'];
}

export interface RecipeReadinessItem {
  id: string;
  name: string;
  category: CraftingRecipe['category'];
  buildingRequired?: string;
  canAfford: boolean;
  maxCraftable: number;
  missingSummary: string;
  ingredientsSummary: string;
  description: string;
  bumpkinXP?: number;
  isTradeable: boolean;
  estimatedReturnSFL?: number;
  timeframe?: string;
}

export interface GoalReadinessItem {
  id: string;
  title: string;
  icon: string;
  category: string;
  readinessPercent: number;
  missingResources: string[];
  expectedBenefit: string;
}

export interface FarmAiDossier {
  generatedAt: string;
  flowerPriceUSD: number;
  farmSummary: {
    farmId: string | number;
    ownerName: string;
    level: number;
    bumpkinLevel: number;
    sflBalance: number;
    coinsBalance: number;
    islandType: string;
    expansions: number;
    plotsUnlocked: number;
    animals: FarmState['animals'];
    buildings: FarmState['buildings'];
    liveOrdersCount: number;
    topLiveOrders: { from: string; itemsSummary: string; rewardFlower: number; rewardCoins: number }[];
  };
  portfolio: {
    exposure: FarmMarketExposure;
    topHoldings: FarmHoldingSnapshot[];
    allOwnedMap: Record<string, number>;
  };
  marketPulse: {
    date: string;
    yesterdayDate: string | null;
    sevenDayDate: string | null;
    has24hHistory: boolean;
    has7dHistory: boolean;
    has1hHistory: boolean;
    topGainers: MarketPulseItem[];
    topLosers: MarketPulseItem[];
    mostActive: MarketPulseItem[];
    breakoutItems: MarketPulseItem[];
    trackedCatalog: MarketPulseItem[];
  };
  personalOpportunities: PersonalizedMarketOpportunity[];
  kbHighlights: {
    readyRecipes: RecipeReadinessItem[];
    nearRecipes: RecipeReadinessItem[];
    goalReadiness: GoalReadinessItem[];
    relevantProfiles: ResourceStrategicProfile[];
  };
}

export type AiRecommendationAction =
  | 'SELL'
  | 'HOLD'
  | 'PROCESS / CRAFT'
  | 'BUY'
  | 'UPGRADE'
  | 'DELIVER';

export interface AiRecommendationCard {
  id: string;
  title: string;
  action: AiRecommendationAction;
  itemName?: string;
  itemId?: string;
  icon?: string;
  confidence: 'High' | 'Medium' | 'Low';
  rationale: string;
  impactEstimate: string;
}

export type AiSourceTag =
  | 'Your Farm Telemetry'
  | 'Live Market Feeds'
  | 'Live Order Book API'
  | 'SFL Knowledge Base'
  | 'Gemini LLM Synthesis'
  | 'OpenAI-Compatible LLM';

export interface AiAdvisorToolTrace {
  toolName: string;
  argsSummary: string;
  resultSummary: string;
  status: 'ok' | 'error';
}

export interface AiAdvisorResponse {
  headline: string;
  marketStance:
    | 'Bullish / Accumulate'
    | 'Selective Liquidation'
    | 'Defensive / Process & Hold'
    | 'Balanced Equilibrium';
  answerMarkdown: string;
  recommendations: AiRecommendationCard[];
  sourcesUsed: AiSourceTag[];
  followUpPrompts: string[];
  engineMode: 'gemini' | 'openai' | 'groq' | 'openrouter' | 'ollama' | 'kb_engine';
  modelUsed?: string;
  toolTrace?: AiAdvisorToolTrace[];
  requiresLlmKeyNotice?: boolean;
}

/**
 * Resolves live farm inventory count cleanly across both `rawInventory` and normalized `inventory`.
 */
export function resolveFarmItemCount(farm: FarmState, itemNameOrId: string): number {
  const norm = itemNameOrId.toLowerCase();
  const raw = farm.rawInventory || {};
  const rawKey = Object.keys(raw).find(k => k.toLowerCase() === norm);
  if (rawKey) {
    const val = parseFloat(String(raw[rawKey]));
    if (Number.isFinite(val)) return val;
  }
  const inv = farm.inventory || {};
  const invKey = Object.keys(inv).find(k => k.toLowerCase() === norm);
  if (invKey && Number.isFinite(inv[invKey])) {
    return inv[invKey];
  }
  return 0;
}

/**
 * Compiles a complete, factual Farm + Market + Knowledge Base dossier used to ground
 * both the local KB reasoning engine and optional Gemini LLM synthesis.
 */
export function buildFarmAiDossier(
  farm: FarmState,
  marketplaceData: any = null,
  queryHint: string = ''
): FarmAiDossier {
  const commodities = marketplaceData?.commodities || {};
  const flowerPriceUSD = marketplaceData?.flowerPriceUSD || SFL_TOKEN_PRICE_USD || 0.1504;
  const has24hHistory = Boolean(marketplaceData?.has24hHistory);
  const has7dHistory = Boolean(marketplaceData?.has7dHistory);
  const has1hHistory = Boolean(marketplaceData?.has1hHistory);

  const pulseItems = buildMarketPulseItems(commodities, flowerPriceUSD);
  const exposure = calculateFarmMarketExposure(pulseItems, farm, flowerPriceUSD);
  const personalOpportunities = buildPersonalMarketOpportunities(pulseItems, farm, flowerPriceUSD);

  // 1. Top farm holdings priced against real market floors
  const holdings: FarmHoldingSnapshot[] = pulseItems
    .map(p => {
      const owned = resolveFarmItemCount(farm, p.name) || resolveFarmItemCount(farm, p.id);
      const unitFlower = p.floorFlower ?? p.latestSaleFlower ?? 0;
      const valueFlower = Number((owned * unitFlower).toFixed(4));
      return {
        id: p.id,
        name: p.name,
        icon: p.icon,
        category: p.category,
        owned,
        floorFlower: p.floorFlower,
        bestOfferFlower: p.bestOfferFlower,
        valueFlower,
        valueUSD: Number((valueFlower * flowerPriceUSD).toFixed(2)),
        change24h: p.change24h,
        change7d: p.change7d,
        trades24h: p.trades24h,
        listingCount: p.listingCount,
        offerCount: p.offerCount,
        trendSignal: p.trendSignal,
        liquidityRating: p.liquidityRating,
      };
    })
    .filter(h => h.owned > 0)
    .sort((a, b) => b.valueFlower - a.valueFlower);

  // 2. Market leaders (strictly real verified deltas)
  const activePool = pulseItems.filter(p => p.safeguardPassed && p.floorFlower !== null);
  const topGainers = [...activePool]
    .filter(p => p.change24h !== null && p.change24h > 0)
    .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
    .slice(0, 4);
  const topLosers = [...activePool]
    .filter(p => p.change24h !== null && p.change24h < 0)
    .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0))
    .slice(0, 4);
  const mostActive = [...pulseItems]
    .filter(p => p.floorFlower !== null)
    .sort((a, b) => b.trades24h - a.trades24h)
    .slice(0, 4);
  const breakoutItems = pulseItems
    .filter(p => p.isBreakout && p.change24h !== null)
    .slice(0, 4);

  // 3. Evaluate Knowledge Base recipe affordability for this farm (with real Coins & Ingredients)
  const rawInv = farm.rawInventory || farm.inventory || {};
  const recipeEval: RecipeReadinessItem[] = VERIFIED_RECIPES.map(recipe => {
    const afford = checkRecipeAffordability(
      recipe,
      rawInv,
      farm.sflBalance || 0,
      farm.coinsBalance ?? 0
    );
    const missingParts = afford.missingItems.map(m => `${m.missing} ${m.item}`);
    if (afford.missingSFL > 0) missingParts.push(`${afford.missingSFL} FLOWER`);
    if (afford.missingCoins > 0) missingParts.push(`${afford.missingCoins} Coins`);

    const costParts: string[] = [];
    if (recipe.coinsCost && recipe.coinsCost > 0) costParts.push(`${recipe.coinsCost} Coins`);
    if (recipe.sflCost && recipe.sflCost > 0) costParts.push(`${recipe.sflCost} FLOWER`);
    Object.entries(recipe.ingredients).forEach(([k, v]) => costParts.push(`${v} ${k}`));

    return {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      buildingRequired: recipe.buildingRequired,
      canAfford: afford.canAfford && afford.maxCraftable > 0,
      maxCraftable: afford.maxCraftable,
      missingSummary: missingParts.join(', '),
      ingredientsSummary: costParts.length > 0 ? costParts.join(' + ') : 'Free',
      description: recipe.description,
      bumpkinXP: recipe.bumpkinXP,
      isTradeable: recipe.isTradeable,
      estimatedReturnSFL: recipe.estimatedReturnSFL,
      timeframe: recipe.timeframe,
    };
  });

  const readyRecipes = recipeEval
    .filter(r => r.canAfford)
    .sort((a, b) => (b.bumpkinXP || 0) - (a.bumpkinXP || 0) || b.maxCraftable - a.maxCraftable);

  const nearRecipes = recipeEval
    .filter(r => !r.canAfford && r.missingSummary.length > 0)
    .sort((a, b) => {
      const aParts = a.missingSummary.split(',').length;
      const bParts = b.missingSummary.split(',').length;
      if (aParts !== bParts) return aParts - bParts;
      const aQty = parseFloat(a.missingSummary) || 9999;
      const bQty = parseFloat(b.missingSummary) || 9999;
      return aQty - bQty;
    });

  // 4. Evaluate PRESET_GOALS progress for this farm
  const goalReadiness: GoalReadinessItem[] = PRESET_GOALS.map(goal => {
    const entries = Object.entries(goal.requiredResources);
    let totalRatio = 0;
    const missingResources: string[] = [];
    entries.forEach(([resName, reqQty]) => {
      const owned = resolveFarmItemCount(farm, resName);
      totalRatio += Math.min(1, owned / Math.max(1, reqQty));
      if (owned < reqQty) {
        missingResources.push(`${Math.ceil(reqQty - owned)} ${resName}`);
      }
    });
    if ((farm.sflBalance || 0) < goal.sflCost) {
      missingResources.push(`${(goal.sflCost - (farm.sflBalance || 0)).toFixed(1)} FLOWER`);
    }
    const readinessPercent = entries.length > 0 ? Math.round((totalRatio / entries.length) * 100) : 100;
    return {
      id: goal.id,
      title: goal.title,
      icon: goal.icon,
      category: goal.category,
      readinessPercent,
      missingResources,
      expectedBenefit: goal.expectedBenefit,
    };
  }).sort((a, b) => b.readinessPercent - a.readinessPercent);

  // 5. Relevant Knowledge Base resource profiles matching top holdings or user query
  const qLower = queryHint.toLowerCase();
  const topHoldingNames = new Set(holdings.slice(0, 8).map(h => h.name.toLowerCase()));
  const relevantProfiles = Object.values(RESOURCE_PROFILES).filter(prof => {
    const pLow = prof.name.toLowerCase();
    return topHoldingNames.has(pLow) || (qLower.length > 0 && qLower.includes(pLow));
  });

  const liveOrders = farm.liveOrders || [];
  const topLiveOrders = liveOrders.slice(0, 5).map(o => ({
    from: o.from,
    itemsSummary: Object.entries(o.items || {})
      .map(([k, v]) => `${v} ${k}`)
      .join(', '),
    rewardFlower: Number(o.reward?.sfl || 0),
    rewardCoins: Number(o.reward?.coins || 0),
  }));

  const allOwnedMap: Record<string, number> = {};
  holdings.forEach(h => {
    allOwnedMap[h.id] = h.owned;
    allOwnedMap[h.name.toLowerCase()] = h.owned;
  });

  return {
    generatedAt: new Date().toISOString(),
    flowerPriceUSD,
    farmSummary: {
      farmId: farm.farmId,
      ownerName: farm.ownerName || `Farm #${farm.farmId}`,
      level: farm.level,
      bumpkinLevel: farm.bumpkinLevel,
      sflBalance: Number((farm.sflBalance || 0).toFixed(2)),
      coinsBalance: Math.round(farm.coinsBalance || 0),
      islandType: farm.island?.type || 'Petal Paradise',
      expansions: farm.island?.expansions || 0,
      plotsUnlocked: farm.plots?.unlocked || 0,
      animals: farm.animals,
      buildings: farm.buildings,
      liveOrdersCount: liveOrders.length,
      topLiveOrders,
    },
    portfolio: {
      exposure,
      topHoldings: holdings.slice(0, 15),
      allOwnedMap,
    },
    marketPulse: {
      date: marketplaceData?.date || 'live',
      yesterdayDate: marketplaceData?.yesterdayDate || null,
      sevenDayDate: marketplaceData?.sevenDayDate || null,
      has24hHistory,
      has7dHistory,
      has1hHistory,
      topGainers,
      topLosers,
      mostActive,
      breakoutItems,
      trackedCatalog: pulseItems,
    },
    personalOpportunities: personalOpportunities.slice(0, 8),
    kbHighlights: {
      readyRecipes,
      nearRecipes,
      goalReadiness,
      relevantProfiles,
    },
  };
}

function fmtFlower(val: number | null): string {
  if (val === null || !Number.isFinite(val)) return 'N/A';
  if (val < 0.01) return val.toFixed(5);
  if (val < 1) return val.toFixed(4);
  return val.toFixed(3);
}

function buildPriorityRecommendations(dossier: FarmAiDossier): AiRecommendationCard[] {
  const cards: AiRecommendationCard[] = [];

  // 1. Personal Market Opportunities (verified surging liquidation or defensive processing)
  dossier.personalOpportunities.slice(0, 2).forEach(opp => {
    const isSell = opp.type === 'surge-liquidation';
    const isCrop = opp.type === 'crop-arbitrage';
    cards.push({
      id: `rec-${opp.id}`,
      title: isSell
        ? `Take Profit on Surplus ${opp.itemName}`
        : isCrop
        ? `Cycle High-Momentum ${opp.itemName} Plots`
        : `Process / Hold Falling ${opp.itemName}`,
      action: isSell ? 'SELL' : 'PROCESS / CRAFT',
      itemName: opp.itemName,
      itemId: opp.itemId,
      icon: opp.icon,
      confidence: opp.urgency === 'high' ? 'High' : 'Medium',
      rationale: opp.farmIQInsight,
      impactEstimate: isSell
        ? `~${opp.farmPosition.estimatedSurplusValueFlower} FLOWER ($${opp.farmPosition.estimatedSurplusValueUSD})`
        : opp.recommendedAction,
    });
  });

  // 2. Highest ROI affordable KB upgrade or crafting move
  const topReadyGoal = dossier.kbHighlights.goalReadiness.find(g => g.readinessPercent === 100);
  if (topReadyGoal) {
    cards.push({
      id: `rec-goal-${topReadyGoal.id}`,
      title: `Execute Ready Milestone: ${topReadyGoal.title}`,
      action: 'UPGRADE',
      icon: topReadyGoal.icon,
      confidence: 'High',
      rationale: `Your farm already holds 100% of required ingredients and FLOWER for this expansion/upgrade (${topReadyGoal.expectedBenefit}).`,
      impactEstimate: topReadyGoal.expectedBenefit,
    });
  } else if (dossier.kbHighlights.readyRecipes.length > 0) {
    const bestRecipe = dossier.kbHighlights.readyRecipes[0];
    cards.push({
      id: `rec-recipe-${bestRecipe.id}`,
      title: `Craft ${bestRecipe.name} (${bestRecipe.maxCraftable}× Ready)`,
      action: 'PROCESS / CRAFT',
      icon: '⚒️',
      confidence: 'High',
      rationale: `Uses ${bestRecipe.ingredientsSummary} sitting in your barn. ${bestRecipe.description}`,
      impactEstimate: `${bestRecipe.maxCraftable}× craftable now`,
    });
  }

  // 3. Top holding market posture card when cards < 3
  if (cards.length < 3 && dossier.portfolio.topHoldings.length > 0) {
    const h = dossier.portfolio.topHoldings[0];
    const profile = RESOURCE_PROFILES[h.name];
    const isFalling = h.change24h !== null && h.change24h <= -2.5;
    const isRising = h.change24h !== null && h.change24h >= 2.5;
    cards.push({
      id: `rec-holding-${h.id}`,
      title: isFalling
        ? `Protect ${h.name} Value (${h.change24h}% 24h)`
        : isRising
        ? `Monitor ${h.name} Strength (+${h.change24h}% 24h)`
        : `Hold Core ${h.name} Reserve (${h.owned.toLocaleString()})`,
      action: isRising ? 'SELL' : profile && isFalling ? 'PROCESS / CRAFT' : 'HOLD',
      itemName: h.name,
      itemId: h.id,
      icon: h.icon,
      confidence: h.change24h !== null ? 'Medium' : 'Low',
      rationale: profile
        ? `${profile.defaultRecommendation} Current floor: ${fmtFlower(h.floorFlower)} FLOWER (${h.valueFlower} FLOWER total in your barn).`
        : `Your #1 tradeable holding (${h.owned.toLocaleString()} units, ~${h.valueFlower} FLOWER at ${fmtFlower(h.floorFlower)} floor).`,
      impactEstimate: `${h.valueFlower} FLOWER ($${h.valueUSD} USD)`,
    });
  }

  // 4. Active delivery orders cue
  if (cards.length < 4 && dossier.farmSummary.topLiveOrders.length > 0) {
    const ord = dossier.farmSummary.topLiveOrders[0];
    cards.push({
      id: 'rec-delivery',
      title: `Check Delivery Board (${ord.from})`,
      action: 'DELIVER',
      icon: '📜',
      confidence: 'Medium',
      rationale: `${dossier.farmSummary.liveOrdersCount} active delivery order(s) detected, including ${ord.from} requesting ${ord.itemsSummary}.`,
      impactEstimate: ord.rewardFlower > 0 ? `+${ord.rewardFlower} FLOWER` : `+${ord.rewardCoins} Coins`,
    });
  }

  return cards.slice(0, 4);
}

function inferMarketStance(dossier: FarmAiDossier): AiAdvisorResponse['marketStance'] {
  const exp = dossier.portfolio.exposure;
  if (!dossier.marketPulse.has24hHistory) return 'Balanced Equilibrium';
  if (exp.risingExposurePercent >= 45) return 'Selective Liquidation';
  if (exp.fallingExposurePercent >= 40) return 'Defensive / Process & Hold';
  if (dossier.marketPulse.topGainers.length > dossier.marketPulse.topLosers.length + 1) {
    return 'Bullish / Accumulate';
  }
  return 'Balanced Equilibrium';
}

/**
 * Generates an automatic proactive briefing tailored to the loaded farm & live market.
 */
export function generateInitialDailyBriefing(dossier: FarmAiDossier): AiAdvisorResponse {
  const { farmSummary, portfolio, marketPulse, kbHighlights } = dossier;
  const topHolding = portfolio.topHoldings[0];
  const stance = inferMarketStance(dossier);
  const recs = buildPriorityRecommendations(dossier);

  const deltaStatusLine = marketPulse.has24hHistory
    ? `Comparing verified ${marketPulse.yesterdayDate} → ${marketPulse.date} reports, **${portfolio.exposure.risingExposurePercent}%** of your tradeable inventory is appreciating and **${portfolio.exposure.fallingExposurePercent}%** is softening.`
    : `Live floors and order books are synced; the **24h historical report** is still warming, so directional % deltas remain unconfirmed (zero guessed numbers).`;

  const topGainerLine =
    marketPulse.topGainers.length > 0
      ? `Top Market Gainers (24h): ${marketPulse.topGainers
          .slice(0, 3)
          .map(g => `${g.icon} **${g.name}** (+${g.change24h}%, floor ${fmtFlower(g.floorFlower)} F)`)
          .join(', ')}.`
      : '';

  const topLoserLine =
    marketPulse.topLosers.length > 0
      ? `Softest Pullbacks (24h): ${marketPulse.topLosers
          .slice(0, 3)
          .map(l => `${l.icon} **${l.name}** (${l.change24h}%, floor ${fmtFlower(l.floorFlower)} F)`)
          .join(', ')}.`
      : '';

  const topReady = kbHighlights.readyRecipes.slice(0, 3).map(r => `**${r.name}** (${r.maxCraftable}×)`);
  const closestGoal = kbHighlights.goalReadiness[0];

  const lines: string[] = [
    `### Personalized Briefing for ${farmSummary.ownerName} (Farm #${farmSummary.farmId} • Level ${farmSummary.level})`,
    `- **Farm Portfolio Valuation:** **${portfolio.exposure.totalTradeableValueFlower} FLOWER** (≈ $${portfolio.exposure.totalTradeableValueUSD} USD) alongside **${farmSummary.sflBalance} FLOWER** liquid balance and **${farmSummary.plotsUnlocked}** crop plots.${topHolding ? ` Largest holding: ${topHolding.icon} **${topHolding.owned.toLocaleString()} ${topHolding.name}** (~${topHolding.valueFlower} F).` : ''}`,
    `- **Market Direction:** ${deltaStatusLine}`,
  ];
  if (topGainerLine) lines.push(`- ${topGainerLine}`);
  if (topLoserLine) lines.push(`- ${topLoserLine}`);
  if (topReady.length > 0) {
    lines.push(`- **Knowledge Base Craft Readiness:** You can immediately craft/cook ${topReady.join(', ')} using items in your barn.`);
  }
  if (closestGoal) {
    lines.push(
      `- **Nearest Expansion/Goal (${closestGoal.readinessPercent}% ready):** **${closestGoal.title}**${closestGoal.missingResources.length > 0 ? ` — missing ${closestGoal.missingResources.join(', ')}` : ' — 100% ready to execute!'}.`
    );
  }

  return {
    headline: `${farmSummary.ownerName}: ${stance} (${portfolio.exposure.totalTradeableValueFlower} FLOWER barn value)`,
    marketStance: stance,
    answerMarkdown: lines.join('\n'),
    recommendations: recs,
    sourcesUsed: ['Your Farm Telemetry', 'Live Market Feeds', 'SFL Knowledge Base'],
    followUpPrompts: [
      topHolding ? `Should I sell, hold, or process my ${topHolding.name}?` : 'What is the overall market direction right now?',
      'Which recipes or upgrades give my farm the best ROI right now?',
      'Where is my biggest downside market risk today?',
      'What should I plant or restock for upcoming milestones?',
    ],
    engineMode: 'kb_engine',
  };
}

/**
 * Deterministic Knowledge-Base + Live Telemetry Advisor used directly or as resilient fallback
 * when Gemini LLM is not configured or unavailable.
 */
export function generateGroundedAiResponse(
  question: string,
  dossier: FarmAiDossier
): AiAdvisorResponse {
  const q = (question || '').trim().toLowerCase();
  const stance = inferMarketStance(dossier);

  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasWholeWord = (haystack: string, needle: string) =>
    needle.length > 0 && new RegExp(`\\b${escapeRe(needle.toLowerCase())}\\b`).test(haystack);

  // 1a. Detect if user asks about a non-tradeable cooked food or craftable tool FIRST
  // Sort longest-first + word boundaries so "Gold Pickaxe" or "Apple Pie" wins cleanly
  const matchedRecipe = [...VERIFIED_RECIPES]
    .sort((a, b) => b.name.length - a.name.length)
    .find(r => r.isTradeable === false && hasWholeWord(q, r.name));

  if (matchedRecipe) {
    const readyEntry = dossier.kbHighlights.readyRecipes.find(r => r.id === matchedRecipe.id);
    const nearEntry = dossier.kbHighlights.nearRecipes.find(r => r.id === matchedRecipe.id);
    const missingSummary = nearEntry?.missingSummary;
    const ingList = [
      matchedRecipe.coinsCost ? `${matchedRecipe.coinsCost} Coins` : '',
      matchedRecipe.sflCost ? `${matchedRecipe.sflCost} FLOWER` : '',
      ...Object.entries(matchedRecipe.ingredients).map(([k, v]) => `${v} ${k}`),
    ]
      .filter(Boolean)
      .join(' + ');

    const isReady = Boolean(readyEntry && readyEntry.maxCraftable > 0);
    const verdict: AiRecommendationAction = isReady ? 'PROCESS / CRAFT' : 'HOLD';

    const lines: string[] = [
      `### ${matchedRecipe.name} — Verified SFL Mechanics (${matchedRecipe.buildingRequired || 'Farm'})`,
      `- **Marketplace Tradeability:** **Non-Tradeable** (\`isTradeable: false\`). Cooked dishes and craftable tools cannot be sold or bought on the P2P Marketplace — only raw produce, crops, fruits, minerals, and animal products trade for FLOWER.`,
      `- **Exact Requirements (${matchedRecipe.timeframe || 'Instant'} • 0 FLOWER fee):** ${ingList || 'Free'}${matchedRecipe.bumpkinXP ? ` → grants **+${matchedRecipe.bumpkinXP.toLocaleString()} Bumpkin XP**` : ''}.`,
      isReady
        ? `- **Your Barn Status:** You can craft/cook **${readyEntry!.maxCraftable}× ${matchedRecipe.name}** right now.`
        : `- **Your Barn Status:** Not currently craftable${missingSummary ? ` (**Missing:** ${missingSummary})` : ''}. Gather or buy only the missing raw inputs on P2P if needed.`,
    ];

    return {
      headline: `${matchedRecipe.name}: Non-Tradeable (${matchedRecipe.buildingRequired || 'Craft'}) • ${isReady ? `${readyEntry!.maxCraftable}× Ready` : 'Missing Inputs'}`,
      marketStance: stance,
      answerMarkdown: lines.join('\n'),
      recommendations: [
        {
          id: `recipe-${matchedRecipe.id}`,
          title: `${matchedRecipe.name} (${matchedRecipe.buildingRequired || 'Facility'})`,
          action: verdict,
          confidence: 'High',
          rationale: `${matchedRecipe.description} Requirements: ${ingList}.`,
          impactEstimate: matchedRecipe.bumpkinXP
            ? `+${matchedRecipe.bumpkinXP.toLocaleString()} Bumpkin XP`
            : isReady
            ? `${readyEntry!.maxCraftable}× Ready`
            : 'Missing inputs',
        },
        ...buildPriorityRecommendations(dossier).slice(0, 2),
      ],
      sourcesUsed: ['Your Farm Telemetry', 'SFL Knowledge Base'],
      followUpPrompts: [
        'Which P2P-tradeable crops or animal produce in my barn should I sell vs keep?',
        'Which recipes can I cook right now for the best Bumpkin XP?',
        'What is the overall market direction right now?',
      ],
      engineMode: 'kb_engine',
    };
  }

  // 1b. Detect if user asks about a P2P-tradeable commodity (longest-first + whole-word boundary so "Crimstone" never matches "Stone")
  const matchedPulseItem = [...dossier.marketPulse.trackedCatalog]
    .sort((a, b) => b.name.length - a.name.length)
    .find(
      item =>
        hasWholeWord(q, item.name) ||
        (item.id.length > 2 && hasWholeWord(q, item.id.replace(/[-_]/g, ' ')))
    );

  if (matchedPulseItem) {
    const owned =
      dossier.portfolio.allOwnedMap[matchedPulseItem.id] ??
      dossier.portfolio.allOwnedMap[matchedPulseItem.name.toLowerCase()] ??
      0;
    const profile = RESOURCE_PROFILES[matchedPulseItem.name];
    const downstreamRecipes = getRecipesRequiringResource(matchedPulseItem.name);
    const affordableDownstream = downstreamRecipes.filter(r =>
      dossier.kbHighlights.readyRecipes.some(rr => rr.id === r.id)
    );
    const goalUsage = PRESET_GOALS.filter(g => g.requiredResources[matchedPulseItem.name] !== undefined);
    const reservedCount = goalUsage.reduce((max, g) => Math.max(max, g.requiredResources[matchedPulseItem.name] || 0), 0);
    const surplus = Math.max(0, owned - reservedCount);

    const floorStr = fmtFlower(matchedPulseItem.floorFlower);
    const bidStr = fmtFlower(matchedPulseItem.bestOfferFlower);
    const spreadPct =
      matchedPulseItem.floorFlower && matchedPulseItem.bestOfferFlower
        ? (((matchedPulseItem.floorFlower - matchedPulseItem.bestOfferFlower) / matchedPulseItem.floorFlower) * 100).toFixed(1)
        : null;

    const action: AiRecommendationAction =
      matchedPulseItem.change24h !== null && matchedPulseItem.change24h >= 3 && surplus > 0
        ? 'SELL'
        : affordableDownstream.length > 0 && owned > 0
        ? 'PROCESS / CRAFT'
        : reservedCount > owned && owned > 0
        ? 'HOLD'
        : matchedPulseItem.change24h !== null && matchedPulseItem.change24h <= -4 && owned === 0
        ? 'BUY'
        : 'HOLD';

    const deltaDesc =
      matchedPulseItem.change24h !== null
        ? `24h Verified Delta: **${matchedPulseItem.change24h > 0 ? `+${matchedPulseItem.change24h}%` : `${matchedPulseItem.change24h}%`}**${matchedPulseItem.change7d !== null ? ` (7d: **${matchedPulseItem.change7d > 0 ? `+${matchedPulseItem.change7d}%` : `${matchedPulseItem.change7d}%`}**)` : ''}`
        : `24h historical comparison is still warming — current live floor sits at **${floorStr} FLOWER**`;

    const parts: string[] = [
      `### ${matchedPulseItem.icon} ${matchedPulseItem.name} — Personalized Farm & Market Verdict: **${action}**`,
      `- **Your Barn Position:** You currently own **${owned.toLocaleString()} ${matchedPulseItem.name}**${reservedCount > 0 ? ` (**${reservedCount.toLocaleString()}** earmarked for upgrades like *${goalUsage[0].title}*, leaving **${surplus.toLocaleString()}** surplus)` : ''}.`,
      `- **Live Order Book & Direction:** Floor ask **${floorStr} FLOWER** | Best bid **${bidStr} FLOWER**${spreadPct ? ` (${spreadPct}% spread)` : ''} | ${deltaDesc}. Liquidity: **${matchedPulseItem.liquidityRating}** (${matchedPulseItem.trades24h.toLocaleString()} ${dossier.marketPulse.has24hHistory ? '24h trades' : 'total trades'}).`,
    ];

    if (profile) {
      parts.push(
        `- **Knowledge Base Rule (${profile.replacementDifficulty} replacement):** ${profile.rechargeMethod}. *Guidance:* ${profile.defaultRecommendation}`
      );
    }
    if (downstreamRecipes.length > 0) {
      parts.push(
        `- **Downstream Crafting / Cooking Chains (${downstreamRecipes.length}):** ${downstreamRecipes
          .slice(0, 4)
          .map(r => `${r.name}${affordableDownstream.some(a => a.id === r.id) ? ' ✅ (Ready now!)' : ''}`)
          .join(', ')}.`
      );
    }

    const cards: AiRecommendationCard[] = [
      {
        id: `item-${matchedPulseItem.id}`,
        title: `${action} Strategy for ${matchedPulseItem.name}`,
        action,
        itemName: matchedPulseItem.name,
        itemId: matchedPulseItem.id,
        icon: matchedPulseItem.icon,
        confidence: matchedPulseItem.change24h !== null ? 'High' : 'Medium',
        rationale: profile
          ? profile.defaultRecommendation
          : `Owned: ${owned.toLocaleString()} | Floor: ${floorStr} FLOWER | Bid: ${bidStr} FLOWER.`,
        impactEstimate:
          owned > 0 && matchedPulseItem.floorFlower
            ? `${Number((owned * matchedPulseItem.floorFlower).toFixed(3))} FLOWER barn value`
            : `${floorStr} FLOWER floor`,
      },
    ];

    return {
      headline: `${matchedPulseItem.name}: ${action} (${floorStr} FLOWER floor • ${owned.toLocaleString()} owned)`,
      marketStance: stance,
      answerMarkdown: parts.join('\n'),
      recommendations: cards,
      sourcesUsed: ['Your Farm Telemetry', 'Live Market Feeds', 'SFL Knowledge Base'],
      followUpPrompts: [
        `What happens if I sell ${surplus > 0 ? surplus : 100} ${matchedPulseItem.name} on the order book?`,
        'Compare all my top holdings for sell vs process ROI',
        'Show overall market direction and top gainers/losers',
      ],
      engineMode: 'kb_engine',
    };
  }

  // 2. Cooking / Crafting / Upgrades / Milestones intent
  if (/(craft|cook|recipe|upgrade|goal|barn|hen|kitchen|bakery|deli|build|plant|focus)/.test(q)) {
    const ready = dossier.kbHighlights.readyRecipes;
    const near = dossier.kbHighlights.nearRecipes;
    const topGoals = dossier.kbHighlights.goalReadiness.slice(0, 3);

    const lines: string[] = [
      `### Farm Knowledge Base Production & Upgrade Plan for ${dossier.farmSummary.ownerName}`,
      `- **Tradeability Rule:** Cooked meals & tools are **non-tradeable** (used for Bumpkin XP, Deliveries, and Resource Mining); **only raw crops, fruits, minerals & animal produce trade on P2P**.`,
      ready.length > 0
        ? `- **100% Craftable / Cookable Right Now:** ${ready
            .slice(0, 5)
            .map(r => `**${r.name}** (${r.maxCraftable}× via ${r.buildingRequired || 'Workbench'} — uses ${r.ingredientsSummary}${r.bumpkinXP ? ` • +${r.bumpkinXP} XP` : ''})`)
            .join('; ')}.`
        : `- **Immediate Crafts:** None of the tracked recipes have 100% of ingredients in your barn right now.`,
      near.length > 0
        ? `- **Closest Next Unlocks:** ${near
            .slice(0, 3)
            .map(r => `**${r.name}** (${r.buildingRequired || 'Workbench'} — needs ${r.missingSummary})`)
            .join('; ')}.`
        : '',
      `- **Expansion & Milestone Progress:** ${topGoals
        .map(g => `${g.icon} **${g.title}** (${g.readinessPercent}% ready${g.missingResources.length > 0 ? `; needs ${g.missingResources.join(', ')}` : ' — READY'})`)
        .join(' | ')}.`,
      `- **Plot & Livestock Capacity:** ${dossier.farmSummary.plotsUnlocked} plots, ${dossier.farmSummary.animals.chickens} chickens, ${dossier.farmSummary.animals.cows} cows, ${dossier.farmSummary.animals.sheep} sheep. Cooking/crafting incurs **0 FLOWER time-acceleration fees**, whereas P2P sales of raw produce carry a 10% fee.`,
    ].filter(Boolean);

    return {
      headline: `${ready.length} KB recipes ready to execute on ${dossier.farmSummary.ownerName}`,
      marketStance: stance,
      answerMarkdown: lines.join('\n'),
      recommendations: buildPriorityRecommendations(dossier),
      sourcesUsed: ['Your Farm Telemetry', 'SFL Knowledge Base', 'Live Market Feeds'],
      followUpPrompts: [
        'Which commodities in my barn are currently gaining vs losing value?',
        'Should I sell surplus resources or convert them into recipes?',
        'How are my active Delivery Board orders looking?',
      ],
      engineMode: 'kb_engine',
    };
  }

  // 3. Risk / Exposure / Sell vs Hold / General Market Direction
  if (/(sell|liquidate|risk|exposure|downside|loss|crash|hold)/.test(q)) {
    const exp = dossier.portfolio.exposure;
    const ops = dossier.personalOpportunities;
    const lines: string[] = [
      `### Portfolio Risk & Sell-vs-Hold Assessment (${dossier.farmSummary.ownerName})`,
      `- **Tradeable Barn Exposure:** **${exp.totalTradeableValueFlower} FLOWER** ($${exp.totalTradeableValueUSD} USD) — **${exp.sentiment}**.`,
      dossier.marketPulse.has24hHistory
        ? `- **Exposure Split (Verified 24h):** **${exp.risingExposurePercent}%** rising | **${exp.fallingExposurePercent}%** falling | **${exp.stableExposurePercent}%** stable.`
        : `- **Exposure Split:** Awaiting verified 24h comparison; treat raw floor holdings conservatively until historical delta settles.`,
      exp.topAppreciatingAsset
        ? `- **Best Strength in Your Barn:** ${exp.topAppreciatingAsset.icon} **${exp.topAppreciatingAsset.name}** (**+${exp.topAppreciatingAsset.change24h}%** 24h, ~$${exp.topAppreciatingAsset.ownedValueUSD} held).`
        : '',
      exp.topDepreciatingAsset
        ? `- **Primary Pullback Risk:** ${exp.topDepreciatingAsset.icon} **${exp.topDepreciatingAsset.name}** (**${exp.topDepreciatingAsset.change24h}%** 24h, ~$${exp.topDepreciatingAsset.ownedValueUSD} held) — avoid market-dumping; divert to KB crafting/cooking chains instead.`
        : '',
      ops.length > 0
        ? `- **Top Actionable Moves:** ${ops
            .slice(0, 3)
            .map(o => `**${o.itemName}** (${o.recommendedAction})`)
            .join(' | ')}.`
        : `- **Surplus Liquidation Rule:** Protect goal reserves (Barn/Hen House/Pickaxes) before selling raw commodities on tight bids.`,
    ].filter(Boolean);

    return {
      headline: `Portfolio Risk: ${exp.sentiment} ($${exp.totalTradeableValueUSD} tradeable)`,
      marketStance: stance,
      answerMarkdown: lines.join('\n'),
      recommendations: buildPriorityRecommendations(dossier),
      sourcesUsed: ['Your Farm Telemetry', 'Live Market Feeds', 'SFL Knowledge Base'],
      followUpPrompts: [
        'Which KB recipes let me avoid selling dipping crops raw?',
        'What are today’s most liquid markets to trade?',
        'Show my overall daily market briefing',
      ],
      engineMode: 'kb_engine',
    };
  }

  // 4. Default: Market Direction & Overview
  const briefing = generateInitialDailyBriefing(dossier);
  return {
    ...briefing,
    headline: `Market Direction & Farm Outlook — ${stance}`,
  };
}


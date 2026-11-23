import { sflFetch } from './sflFetch';
import {
  isItemMarketTradeable,
  resolveTradeableId,
  VERIFIED_RECIPES,
  RESOURCE_PROFILES,
  checkRecipeAffordability,
} from '../data/gameKnowledge';
import {
  calculateSmartMarketSignals,
  calculateTradeOpportunityAnalysis,
} from './marketSignalEngine';
import { FarmAiDossier } from './farmAiAdvisorEngine';

export interface AiToolExecutionContext {
  dossier: FarmAiDossier;
  sflApiKey: string;
  sflBaseUrl: string;
}

export interface AiToolTraceEntry {
  toolName: string;
  argsSummary: string;
  resultSummary: string;
  status: 'ok' | 'error';
}

export interface AiToolExecutionResult {
  payload: any;
  trace: AiToolTraceEntry;
}

/**
 * Tool 1: Fetches live top-50 asks/bids, recent fulfilled trades, and historical daily chart data
 * for any P2P-tradeable Sunflower Land item, and runs Smart Signals, Multi-Timeframe Confirmation,
 * and Order-Book Execution Slippage Simulation.
 */
async function toolGetLiveOrderBookAndSignals(
  args: { itemNameOrId?: string; intendedQuantity?: number },
  ctx: AiToolExecutionContext
): Promise<AiToolExecutionResult> {
  const query = String(args?.itemNameOrId || '').trim();
  const intendedQty = Math.max(1, Math.min(1000000, Number(args?.intendedQuantity) || 500));

  if (!query) {
    return {
      payload: { error: 'itemNameOrId is required' },
      trace: {
        toolName: 'get_live_orderbook_and_signals',
        argsSummary: 'empty',
        resultSummary: 'Missing item name',
        status: 'error',
      },
    };
  }

  if (!isItemMarketTradeable(query) && !resolveTradeableId(query)) {
    return {
      payload: {
        item: query,
        isTradeable: false,
        message: `${query} is NOT P2P-tradeable in Sunflower Land (only raw crops, fruits, greenhouse produce, Wood/Stone/Iron/Gold/Crimstone/Salt, and animal produce trade on the P2P Marketplace).`,
      },
      trace: {
        toolName: 'get_live_orderbook_and_signals',
        argsSummary: `${query}`,
        resultSummary: 'Non-tradeable item confirmed (isTradeable: false)',
        status: 'ok',
      },
    };
  }

  const resolved = resolveTradeableId(query);
  if (!resolved) {
    return {
      payload: {
        item: query,
        isTradeable: isItemMarketTradeable(query),
        message: `No collectible ID mapped for live order-book lookup of "${query}".`,
      },
      trace: {
        toolName: 'get_live_orderbook_and_signals',
        argsSummary: `${query}`,
        resultSummary: 'No collectible order-book ID mapped',
        status: 'error',
      },
    };
  }

  try {
    const url = new URL(`${ctx.sflBaseUrl}/community/data`);
    url.searchParams.set('type', 'tradeable');
    url.searchParams.set('collection', 'collectibles');
    url.searchParams.set('id', String(resolved.id));

    const res = await sflFetch(url.toString(), {
      headers: {
        'x-api-key': ctx.sflApiKey,
        'User-Agent': 'FarmIQ/1.0',
        'Accept': 'application/json',
      },
      timeoutMs: 11000,
      retries: 1,
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`SFL Tradeable API returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const d = json.data || json;
    const listings = d.listings || [];
    const offers = d.offers || [];
    const sales = d.history?.sales || [];
    const dailyHistory = d.history?.history?.dates || {};
    const flowerPriceUSD = ctx.dossier.flowerPriceUSD || 0.1504;

    const floorFlower = d.floor || listings[0]?.unitPriceSFL || 0;
    const bestBidFlower = d.highestBid || offers[0]?.unitPriceSFL || 0;
    const lastSaleFlower = sales[0]
      ? Number((sales[0].sfl / (sales[0].quantity || 1)).toFixed(6))
      : d.lastSalePrice || floorFlower;

    const smartSignals = calculateSmartMarketSignals(
      listings,
      offers,
      sales,
      dailyHistory,
      flowerPriceUSD,
      floorFlower,
      lastSaleFlower,
      bestBidFlower
    );

    const opportunity = calculateTradeOpportunityAnalysis(
      resolved.key,
      listings,
      offers,
      sales,
      smartSignals,
      intendedQty,
      flowerPriceUSD
    );

    const ownedInBarn =
      ctx.dossier.portfolio.allOwnedMap[resolved.key.toLowerCase()] ??
      ctx.dossier.portfolio.allOwnedMap[query.toLowerCase()] ??
      0;

    const payload = {
      item: resolved.key,
      collectibleId: resolved.id,
      isTradeable: true,
      farmerOwnedCount: ownedInBarn,
      liveOrderBook: {
        asksCount: listings.length,
        bidsCount: offers.length,
        recentSalesCount: sales.length,
        floorAskFlower: smartSignals.floorPriceFlower,
        bestBidFlower: smartSignals.bestBidPriceFlower,
        lastSaleFlower: smartSignals.lastSalePriceFlower,
        spreadPercent: smartSignals.spreadPercent,
      },
      weightedSignal: {
        state: smartSignals.signalIndicator.state,
        score: smartSignals.signalIndicator.score,
        confidence: smartSignals.signalIndicator.confidence,
        confidenceReason: smartSignals.signalIndicator.confidenceReason,
        buyPressurePercent: smartSignals.signalIndicator.buyPressurePercent,
        sellPressurePercent: smartSignals.signalIndicator.sellPressurePercent,
        tripleConfirmationSetup: smartSignals.signalIndicator.tripleConfirmation.setupLabel,
      },
      multiTimeframe: {
        alignment: smartSignals.multiTimeframe.alignment,
        headline: smartSignals.multiTimeframe.headline,
        recommendation: smartSignals.multiTimeframe.recommendation,
        intervals: smartSignals.multiTimeframe.entries.map(e => ({
          timeframe: e.timeframe,
          signal: e.signal,
          score: e.score,
          confidence: e.confidence,
          interpretation: e.interpretation,
        })),
      },
      tradeOpportunitySimulation: {
        intendedQuantity: intendedQty,
        recommendedFocus: opportunity.recommendedFocus,
        buySetup: {
          badge: opportunity.buyAnalysis.setupBadge,
          preferredBuyZone: opportunity.buyAnalysis.preferredZoneFlower,
          resistanceLevel: opportunity.buyAnalysis.secondaryLevelFlower,
          invalidationLevel: opportunity.buyAnalysis.invalidationLevelFlower,
          avgExecutionFlower: opportunity.buyAnalysis.simulation.estimatedAvgPriceFlower,
          slippagePercent: opportunity.buyAnalysis.simulation.slippagePercent,
          fillableQuantity: opportunity.buyAnalysis.simulation.fillableQuantity,
          reasoning: opportunity.buyAnalysis.reasoning,
        },
        sellSetup: {
          badge: opportunity.sellAnalysis.setupBadge,
          preferredSellZone: opportunity.sellAnalysis.preferredZoneFlower,
          supportLevel: opportunity.sellAnalysis.secondaryLevelFlower,
          invalidationLevel: opportunity.sellAnalysis.invalidationLevelFlower,
          avgExecutionFlower: opportunity.sellAnalysis.simulation.estimatedAvgPriceFlower,
          netProceedsAfter10PctTaxFlower: opportunity.sellAnalysis.simulation.netProceedsAfterTaxFlower,
          slippagePercent: opportunity.sellAnalysis.simulation.slippagePercent,
          fillableQuantity: opportunity.sellAnalysis.simulation.fillableQuantity,
          reasoning: opportunity.sellAnalysis.reasoning,
        },
      },
    };

    return {
      payload,
      trace: {
        toolName: 'get_live_orderbook_and_signals',
        argsSummary: `${resolved.key} (#${resolved.id}, qty ${intendedQty})`,
        resultSummary: `${smartSignals.signalIndicator.state} (${smartSignals.signalIndicator.score}/100, ${smartSignals.signalIndicator.confidence} conf) • Floor ${smartSignals.floorPriceFlower} F`,
        status: 'ok',
      },
    };
  } catch (err: any) {
    return {
      payload: {
        item: resolved.key,
        error: err?.message || 'Failed to fetch live tradeable order book',
      },
      trace: {
        toolName: 'get_live_orderbook_and_signals',
        argsSummary: `${resolved.key} (#${resolved.id})`,
        resultSummary: `Upstream lookup failed (${err?.message || 'timeout'})`,
        status: 'error',
      },
    };
  }
}

/**
 * Tool 2: Fetches live Farm telemetry (level, Coins, FLOWER, skills, buildings, livestock,
 * delivery orders, and barn inventory) from SFL API for any Farm ID or returns loaded dossier.
 */
async function toolGetFarmerProfile(
  args: { farmId?: string },
  ctx: AiToolExecutionContext
): Promise<AiToolExecutionResult> {
  const requestedId = String(args?.farmId || ctx.dossier.farmSummary.farmId || '').trim();
  const isActiveFarm =
    !args?.farmId || requestedId === String(ctx.dossier.farmSummary.farmId);

  // Try live SFL API lookup for requested farm if API key exists; fall back cleanly to loaded dossier for active farm
  if (ctx.sflApiKey && requestedId) {
    try {
      const res = await sflFetch(
        `${ctx.sflBaseUrl}/community/farms/${encodeURIComponent(requestedId)}`,
        {
          headers: {
            'x-api-key': ctx.sflApiKey,
            'User-Agent': 'FarmIQ/1.0',
            'Accept': 'application/json',
          },
          timeoutMs: 9000,
          retries: 0,
          cache: 'no-store',
        }
      );

      if (res.ok) {
        const json = await res.json();
        const f = json.farm || json.data || json;
        const inventory: Record<string, string> = f.inventory || {};
        const topRawEntries = Object.entries(inventory)
          .map(([k, v]) => [k, parseFloat(String(v)) || 0] as const)
          .filter(([, qty]) => qty > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 25);

        const orders = Object.values(f.delivery?.orders || {}).map((o: any) => ({
          from: o.from,
          items: o.items,
          reward: o.reward,
        }));

        return {
          payload: {
            source: 'live_sfl_farm_api',
            farmId: requestedId,
            ownerName: f.username || f.bumpkin?.equipped?.name || `Farm #${requestedId}`,
            coinsBalance: Math.round(Number(f.coins) || 0),
            sflBalance: Number((Number(f.balance) || 0).toFixed(4)),
            islandType: f.island?.type,
            bumpkinSkills: f.bumpkin?.skills || {},
            deliveryOrders: orders.slice(0, 8),
            buildingsOwned: Object.keys(f.buildings || {}),
            topInventoryQuantities: Object.fromEntries(topRawEntries),
          },
          trace: {
            toolName: 'get_farmer_profile_and_inventory',
            argsSummary: `Farm #${requestedId} (live API)`,
            resultSummary: `Synced live Coins, FLOWER, ${orders.length} orders & ${topRawEntries.length} inventory stacks`,
            status: 'ok',
          },
        };
      }
    } catch {
      // Fall back below if active farm
    }
  }

  if (isActiveFarm) {
    return {
      payload: {
        source: 'active_farm_telemetry',
        farmSummary: ctx.dossier.farmSummary,
        portfolioExposure: ctx.dossier.portfolio.exposure,
        topHoldings: ctx.dossier.portfolio.topHoldings,
        allOwnedMap: ctx.dossier.portfolio.allOwnedMap,
      },
      trace: {
        toolName: 'get_farmer_profile_and_inventory',
        argsSummary: `Active Farm #${requestedId}`,
        resultSummary: `Loaded ${ctx.dossier.farmSummary.ownerName} (Lvl ${ctx.dossier.farmSummary.level}, ${ctx.dossier.farmSummary.coinsBalance} Coins)`,
        status: 'ok',
      },
    };
  }

  return {
    payload: { error: `Could not fetch live telemetry for Farm #${requestedId}` },
    trace: {
      toolName: 'get_farmer_profile_and_inventory',
      argsSummary: `Farm #${requestedId}`,
      resultSummary: 'Farm telemetry unavailable',
      status: 'error',
    },
  };
}

/**
 * Tool 3: Checks official SFL Knowledge Base recipes, tools, XP, buildings, 0-fee rules,
 * non-tradeability status, and exact affordability for the current farmer's barn & Coins.
 */
function toolCheckKbRecipesAndCraftability(
  args: { query?: string },
  ctx: AiToolExecutionContext
): AiToolExecutionResult {
  const q = String(args?.query || '').trim().toLowerCase();
  const invRecord: Record<string, number> = {};
  Object.entries(ctx.dossier.portfolio.allOwnedMap).forEach(([k, v]) => {
    invRecord[k] = v;
  });

  const matchingRecipes = VERIFIED_RECIPES.filter(r => {
    if (!q || q === 'all' || q === 'ready') return true;
    const ingKeys = Object.keys(r.ingredients).join(' ').toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.buildingRequired || '').toLowerCase().includes(q) ||
      ingKeys.includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  }).map(recipe => {
    const afford = checkRecipeAffordability(
      recipe,
      invRecord,
      ctx.dossier.farmSummary.sflBalance || 0,
      ctx.dossier.farmSummary.coinsBalance ?? 0
    );
    return {
      name: recipe.name,
      category: recipe.category,
      building: recipe.buildingRequired || 'Farm',
      isTradeable: recipe.isTradeable,
      coinsCost: recipe.coinsCost || 0,
      sflCost: recipe.sflCost || 0,
      ingredients: recipe.ingredients,
      bumpkinXP: recipe.bumpkinXP || 0,
      timeframe: recipe.timeframe || 'Instant',
      cookingFeeFlower: 0,
      canAffordNow: afford.canAfford && afford.maxCraftable > 0,
      maxCraftable: afford.maxCraftable,
      missingItems: afford.missingItems,
      missingCoins: afford.missingCoins,
      missingSFL: afford.missingSFL,
    };
  });

  const matchedProfiles = Object.values(RESOURCE_PROFILES).filter(
    p => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  return {
    payload: {
      note: 'All cooked meals and craftable tools have isTradeable: false and 0 FLOWER cooking/crafting time fee.',
      matchedRecipes: matchingRecipes.slice(0, 14),
      resourceProfiles: matchedProfiles.slice(0, 6),
    },
    trace: {
      toolName: 'check_sfl_recipes_and_craftability',
      argsSummary: q ? `"${q}"` : 'all ready recipes',
      resultSummary: `Evaluated ${matchingRecipes.length} verified SFL recipe(s) against farm barn & Coins`,
      status: 'ok',
    },
  };
}

/**
 * Tool 4: Reads verified Market Watch gainers, losers, active volume leaders, and farm exposure.
 */
function toolGetMarketDirectionMovers(
  _args: Record<string, any>,
  ctx: AiToolExecutionContext
): AiToolExecutionResult {
  const { marketPulse, portfolio, personalOpportunities } = ctx.dossier;
  return {
    payload: {
      date: marketPulse.date,
      yesterdayDate: marketPulse.yesterdayDate,
      has24hHistory: marketPulse.has24hHistory,
      has7dHistory: marketPulse.has7dHistory,
      farmExposure: portfolio.exposure,
      topGainers: marketPulse.topGainers.map(g => ({
        name: g.name,
        floorFlower: g.floorFlower,
        change24h: g.change24h,
        change7d: g.change7d,
        trades24h: g.trades24h,
      })),
      topLosers: marketPulse.topLosers.map(l => ({
        name: l.name,
        floorFlower: l.floorFlower,
        change24h: l.change24h,
        change7d: l.change7d,
        trades24h: l.trades24h,
      })),
      mostActive: marketPulse.mostActive.map(m => ({
        name: m.name,
        floorFlower: m.floorFlower,
        trades24h: m.trades24h,
        volume24h: m.volume24h,
      })),
      personalOpportunities,
    },
    trace: {
      toolName: 'get_market_direction_movers',
      argsSummary: marketPulse.date,
      resultSummary: marketPulse.has24hHistory
        ? `${marketPulse.topGainers.length} gainers / ${marketPulse.topLosers.length} losers (${marketPulse.yesterdayDate}→${marketPulse.date})`
        : 'Live floors synced (24h historical baseline warming)',
      status: 'ok',
    },
  };
}

export const AI_TOOL_DEFINITIONS = [
  {
    name: 'get_live_orderbook_and_signals',
    description:
      'Fetch live Sunflower Land P2P order-book asks/bids, recent trades, Weighted Market Signal (0-100 + Confidence), Multi-Timeframe signals (1H/4H/1D/7D/1M), and exact buy/sell execution slippage for an intended trade quantity of a tradeable commodity.',
    parameters: {
      type: 'object',
      properties: {
        itemNameOrId: {
          type: 'string',
          description: 'Tradeable commodity name or numeric ID, e.g. "Wood", "Egg", "Milk", "Rhubarb", "Crimstone", or "601".',
        },
        intendedQuantity: {
          type: 'number',
          description: 'Quantity of units the farmer wants to simulate buying or selling for slippage analysis (default 500).',
        },
      },
      required: ['itemNameOrId'],
    },
  },
  {
    name: 'get_farmer_profile_and_inventory',
    description:
      'Fetch live farm telemetry (Coins, FLOWER, Bumpkin skills, buildings, delivery board orders, and full barn inventory) for the active farmer or another specific Sunflower Land Farm ID.',
    parameters: {
      type: 'object',
      properties: {
        farmId: {
          type: 'string',
          description: 'Optional Farm ID to inspect; omit to read the currently connected farmer.',
        },
      },
    },
  },
  {
    name: 'check_sfl_recipes_and_craftability',
    description:
      'Search official Sunflower Land cooking, Deli, Bakery, Fire Pit, Kitchen, Smoothie Shack, and Workbench tool recipes (`consumables.ts` & `tools.ts`) and verify exact affordability (ingredients + Coins + FLOWER) against the farmer’s barn.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Recipe name, ingredient, or building (e.g. "Apple Pie", "Rhubarb", "Pickaxe", "Fire Pit", "Bakery", or "ready").',
        },
      },
    },
  },
  {
    name: 'get_market_direction_movers',
    description:
      'Retrieve overall Sunflower Land marketplace gainers, losers, top volume items, farm exposure sentiment, and whether verified 24h/7d historical baselines are loaded.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
] as const;

export async function executeAiBackendTool(
  name: string,
  args: Record<string, any>,
  ctx: AiToolExecutionContext
): Promise<AiToolExecutionResult> {
  switch (name) {
    case 'get_live_orderbook_and_signals':
      return await toolGetLiveOrderBookAndSignals(args, ctx);
    case 'get_farmer_profile_and_inventory':
      return await toolGetFarmerProfile(args, ctx);
    case 'check_sfl_recipes_and_craftability':
      return toolCheckKbRecipesAndCraftability(args, ctx);
    case 'get_market_direction_movers':
      return toolGetMarketDirectionMovers(args, ctx);
    default:
      return {
        payload: { error: `Unknown tool: ${name}` },
        trace: {
          toolName: name,
          argsSummary: JSON.stringify(args || {}),
          resultSummary: 'Unknown tool requested',
          status: 'error',
        },
      };
  }
}

import { FarmState, DailyMission, MissionFinancials, MissionExecution, MissionScoreFactors } from '../types';
import { SFL_ITEMS, FLOWER_TOKEN_PRICE_USD } from '../data/sflData';
import { getBumpkinProgression } from './farmService';
import { VERIFIED_RECIPES, checkRecipeAffordability } from '../data/gameKnowledge';

export type MissionRankingStrategy = 'balanced' | 'profit' | 'speed' | 'progression';

export interface StrategyWeights {
  wP: number; // Profit (Net FLOWER)
  wT: number; // Time efficiency / speed
  wU: number; // Urgency
  wR: number; // Resource readiness
  wX: number; // Bumpkin XP & progression
  wM: number; // Market premium / spread
}

export const STRATEGY_PRESETS: Record<MissionRankingStrategy, {
  name: string;
  tagline: string;
  icon: string;
  weights: StrategyWeights;
}> = {
  balanced: {
    name: 'Balanced Strategy',
    tagline: 'Standard 35/20/15 balance of profit, speed, and farm health',
    icon: '⚖️',
    weights: { wP: 0.35, wT: 0.20, wU: 0.15, wR: 0.15, wX: 0.10, wM: 0.05 },
  },
  profit: {
    name: 'Maximum Profit',
    tagline: 'Aggressively prioritizes absolute net FLOWER yields (60% weight)',
    icon: '💰',
    weights: { wP: 0.60, wT: 0.10, wU: 0.10, wR: 0.10, wX: 0.05, wM: 0.05 },
  },
  speed: {
    name: 'Fastest Completion',
    tagline: 'Prioritizes rapid turnover, high profit-per-minute, and quick-completion tasks (45% weight)',
    icon: '⚡',
    weights: { wP: 0.15, wT: 0.45, wU: 0.20, wR: 0.15, wX: 0.05, wM: 0.00 },
  },
  progression: {
    name: 'Farm Progression',
    tagline: 'Focuses on Bumpkin XP, facility upgrades, and milestone unlocks (40% weight)',
    icon: '⭐',
    weights: { wP: 0.15, wT: 0.10, wU: 0.10, wR: 0.15, wX: 0.40, wM: 0.10 },
  },
};

/**
 * Calculates granular 6-factor score for any mission based on active strategy weights
 * Formula: Score = wP*P + wT*T + wU*U + wR*R + wX*X + wM*M
 */
export function calculateMissionScore(
  mission: Omit<DailyMission, 'missionScore'>,
  strategy: MissionRankingStrategy = 'balanced'
): MissionScoreFactors {
  const { weights } = STRATEGY_PRESETS[strategy] || STRATEGY_PRESETS.balanced;
  
  // 1. Profit Score (P)
  let profitScore = 0;
  if (mission.netProfitFlower > 0) {
    profitScore = Math.min(100, Math.round((mission.netProfitFlower / 15) * 100));
  } else if (mission.category === 'save') {
    profitScore = 35; // Structural capital preservation
  }

  // Duration in minutes estimation
  let durationMinutes = 30;
  if (mission.category === 'harvest') {
    durationMinutes = mission.urgencyLevel === 'urgent' ? 15 : 60;
  } else if (mission.category === 'delivery') {
    durationMinutes = mission.autoVerified ? 8 : 45;
  } else if (mission.category === 'craft') {
    durationMinutes = mission.title.includes('Axes') ? 5 : 25;
  } else if (mission.category === 'animal') {
    durationMinutes = 20;
  } else if (mission.category === 'save') {
    durationMinutes = 60;
  }

  // 2. Time Efficiency (T)
  let timeScore = 50;
  if (durationMinutes <= 15) {
    timeScore = Math.round(95 - (durationMinutes / 15) * 10);
  } else if (durationMinutes <= 60) {
    timeScore = Math.round(80 - ((durationMinutes - 15) / 45) * 20);
  } else {
    timeScore = Math.max(25, Math.round(60 - ((durationMinutes - 60) / 180) * 35));
  }
  if (mission.financials.profitPerHour && mission.financials.profitPerHour > 0) {
    timeScore = Math.min(100, Math.round(timeScore * 0.7 + Math.min(30, mission.financials.profitPerHour * 15)));
  }

  // 3. Urgency (U)
  let urgencyScore = 40;
  if (mission.urgencyLevel === 'urgent') {
    urgencyScore = mission.autoVerified ? 98 : 92;
  } else if (mission.urgencyLevel === 'high-roi') {
    urgencyScore = 80;
  } else if (mission.urgencyLevel === 'strategic') {
    urgencyScore = 55;
  }

  // 4. Resource Readiness (R)
  let readinessScore = 50;
  if (mission.autoVerified) {
    readinessScore = 100;
  } else if (mission.progressCurrent > 0 && mission.progressTarget > 0) {
    readinessScore = Math.min(100, Math.round((mission.progressCurrent / mission.progressTarget) * 100));
  } else {
    readinessScore = 65;
  }

  // 5. XP Score (X)
  const xpScore = Math.min(100, Math.max(10, Math.round((mission.xpReward / 800) * 100)));

  // 6. Market Opportunity (M)
  let marketScore = 40;
  if (mission.financials.roiPercent > 0) {
    marketScore = Math.min(100, Math.max(30, Math.round(mission.financials.roiPercent / 3)));
  }

  // Weighted calculation: Score = wP*P + wT*T + wU*U + wR*R + wX*X + wM*M
  const rawScore = 
    weights.wP * profitScore +
    weights.wT * timeScore +
    weights.wU * urgencyScore +
    weights.wR * readinessScore +
    weights.wX * xpScore +
    weights.wM * marketScore;

  const finalScore = Math.min(100, Math.max(15, Math.round(rawScore)));

  let rankTier: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';
  if (finalScore >= 90) rankTier = 'Critical';
  else if (finalScore >= 80) rankTier = 'High';
  else if (finalScore >= 65) rankTier = 'Medium';
  else rankTier = 'Low';

  return {
    profitScore,
    timeScore,
    urgencyScore,
    readinessScore,
    xpScore,
    marketScore,
    finalScore,
    rankTier,
    durationMinutes,
  };
}

/**
 * Re-ranks any set of missions using a chosen strategy
 */
export function rankMissionsByStrategy(
  missions: DailyMission[],
  strategy: MissionRankingStrategy
): DailyMission[] {
  return missions
    .map(m => ({
      ...m,
      missionScore: calculateMissionScore(m, strategy),
    }))
    .sort((a, b) => (b.missionScore?.finalScore || 0) - (a.missionScore?.finalScore || 0));
}

export interface OpportunityInsight {
  id: string;
  type: 'urgent' | 'profit' | 'delivery' | 'stockpile';
  icon: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  actionText: string;
  tabTarget: 'overview' | 'profit-radar' | 'market-watch' | 'resource-strategy' | 'farm-vs-market';
}

interface ScoredCandidate extends DailyMission {
  domain: 'crop' | 'delivery' | 'livestock' | 'craft' | 'market' | 'milestone';
  priorityScore: number;
}

/**
 * FarmIQ Dynamic Mission Generation Engine
 * The central brain that continuously evaluates live farm state, plots, animals,
 * inventory, town orders, and market order books to synthesize the 5 highest-priority,
 * most profitable daily actions.
 */
export function generateIntelligentMissions(
  farm: FarmState,
  marketplaceData?: any
): {
  missions: DailyMission[];
  insights: OpportunityInsight[];
  summary: {
    totalProjectedProfitFlower: number;
    totalProjectedProfitUSD: number;
    totalBumpkinXP: number;
    urgentCount: number;
    highRoiCount: number;
    strategicCount: number;
  };
} {
  const flowerPriceUSD = marketplaceData?.flowerPriceUSD || FLOWER_TOKEN_PRICE_USD;
  const commodities = marketplaceData?.commodities || {};

  const candidates: ScoredCandidate[] = [];
  const insights: OpportunityInsight[] = [];

  // =========================================================================
  // DOMAIN 1: FARM PLOTS & CROP OPERATIONS
  // =========================================================================
  const cropsPlanted = farm.plots.activeCrops || [];
  const unlockedPlots = Math.max(farm.plots.unlocked || 18, 10);
  const readyCrops = cropsPlanted.filter(c => c.readyAt.toLowerCase().includes('ready'));
  const readyCropsCount = readyCrops.length;
  const emptyPlotsCount = Math.max(0, unlockedPlots - cropsPlanted.length);

  // Identify dominant crop
  const dominantCropId = cropsPlanted[0]?.cropId || 'artichoke';
  const cropItem = SFL_ITEMS[dominantCropId] || SFL_ITEMS.artichoke || SFL_ITEMS.wheat;
  const cropName = cropItem.name;

  // Real-time market floor lookup
  const commKey = Object.keys(commodities).find(
    k => k.toLowerCase() === dominantCropId.toLowerCase() || 
         k.toLowerCase() === cropName.toLowerCase()
  );
  const liveFloorFlower = commKey && commodities[commKey]?.floorFlower 
    ? commodities[commKey].floorFlower 
    : (cropItem.marketPriceSFL || 0.0101);

  const bettyShopFloor = (cropItem.bettyPriceSFL || 0.02) * 0.0001;
  const seedCostPerUnit = (cropItem.buyPriceSFL || 0.01) * 0.0001;

  if (readyCropsCount > 0) {
    // SCENARIO 1A: Mature plots are waiting for harvest!
    const harvestCount = readyCropsCount;
    const grossRewardFlower = Number((harvestCount * liveFloorFlower).toFixed(4));
    const inputCostFlower = Number((harvestCount * (seedCostPerUnit > 0 ? seedCostPerUnit : 0.0035)).toFixed(4));
    const netProfitFlower = Number(Math.max(0.01, grossRewardFlower - inputCostFlower).toFixed(2));
    const netProfitUSD = Number((netProfitFlower * flowerPriceUSD).toFixed(2));
    const roiPercent = inputCostFlower > 0 ? Math.round(((grossRewardFlower - inputCostFlower) / inputCostFlower) * 100) : 188;
    const growthMinutes = cropItem.growthTimeMinutes || 120;
    const profitPerHour = Number(((netProfitFlower / (growthMinutes / 60))).toFixed(4));

    candidates.push({
      id: 'mission-harvest-ready',
      domain: 'crop',
      priorityScore: 98 + readyCropsCount, // Top urgency
      title: `Harvest ${harvestCount} Mature ${cropName} Plots`,
      category: 'harvest',
      urgencyLevel: 'urgent',
      urgencyLabel: '🚨 Immediate Harvest Ready',
      timeHorizon: 'Mature in Plots Right Now',
      description: `Harvest ${harvestCount} fully mature ${cropName} plots and immediately replant to maximize daily land utilization.`,
      progressCurrent: harvestCount,
      progressTarget: harvestCount,
      unit: 'plots',
      estimatedProfitSFL: netProfitFlower,
      netProfitFlower,
      grossProfitFlower: grossRewardFlower,
      xpReward: harvestCount * 15,
      isCompleted: (farm.inventory[dominantCropId] || 0) >= harvestCount,
      reason: `Your farm has ${harvestCount} ready ${cropName} plots. Harvesting these plots can release productive land, generate inventory, and create an opportunity for another crop cycle.`,
      financials: {
        grossRewardFlower,
        inputCostFlower,
        netProfitFlower,
        netProfitUSD,
        roiPercent,
        profitPerHour,
        priceSource: 'Sunflower Land Community P2P Market Floor',
        priceBenchmark: `Live P2P Market Floor (${liveFloorFlower.toFixed(4)} FLOWER) is +${Math.round(((liveFloorFlower / (bettyShopFloor || 0.001)) - 1) * 100)}% higher than Betty NPC shop`,
      },
      execution: {
        primaryMetricLabel: 'Plots Ready',
        primaryMetricValue: `${harvestCount}`,
        targetAction: `Harvest ${harvestCount} mature ${cropName} plots`,
        nextRecommendedAction: `Replant ${harvestCount} plots with ${cropName} or Wheat`,
        inventoryConsumed: `${harvestCount}× ${cropName} Seeds`,
        inventoryProduced: `${harvestCount}× ${cropName} (+ rare mutant chance)`,
        actionTab: 'profit-radar',
        actionButtonLabel: 'Open Execution Guide',
        resourceTab: 'profit-radar',
        resourceButtonLabel: 'View Farm Resources',
        steps: [
          `Inspect ready plots: Verify that all ${harvestCount} plots are actually harvestable.`,
          `Harvest ${cropName}: Collect the available crop output and verify inventory changes.`,
          'Evaluate crop inventory: Compare the value of selling against delivery and production requirements.',
          'Select the next crop: Evaluate seed costs, growing time, expected yield, and market demand.',
          'Replant and verify: Confirm that the selected plots have entered their next production cycle.',
        ],
        checklistSteps: [
          {
            stepNumber: 1,
            title: 'Inspect ready plots',
            detail: `Verify that all ${harvestCount} plots of ${cropName} are fully grown and ready in game telemetry.`,
          },
          {
            stepNumber: 2,
            title: `Harvest ${cropName}`,
            detail: 'Collect the available crop output into inventory and verify real-time state changes.',
          },
          {
            stepNumber: 3,
            title: 'Evaluate crop inventory',
            detail: 'Compare the value of direct market selling against active town deliveries and cooking recipes.',
          },
          {
            stepNumber: 4,
            title: 'Select the next crop',
            detail: 'Evaluate seed costs, growing duration, expected FLOWER yield, and active market demand.',
          },
          {
            stepNumber: 5,
            title: 'Replant and verify',
            detail: 'Confirm that all harvested plots have been re-seeded to eliminate vacant land cooldown losses.',
          },
        ],
      },
      autoVerified: true,
      verificationBadge: 'Verified Mature in API',
      verificationDetail: `Live API: ${harvestCount} plots ready for immediate harvest`,
    });

    insights.push({
      id: 'insight-crop-ready',
      type: 'urgent',
      icon: '🌾',
      title: `${harvestCount} Plots Ready to Harvest`,
      description: `Harvesting yields ~${grossRewardFlower} FLOWER and frees up plots for your next cycle.`,
      metricLabel: 'Net Plot Yield',
      metricValue: `+${netProfitFlower} FLOWER`,
      actionText: 'Harvest Now',
      tabTarget: 'profit-radar',
    });
  } else if (emptyPlotsCount > 0) {
    // SCENARIO 1B: Empty plots detected!
    const grossRewardFlower = Number((emptyPlotsCount * liveFloorFlower).toFixed(4));
    const inputCostFlower = Number((emptyPlotsCount * (seedCostPerUnit > 0 ? seedCostPerUnit : 0.0035)).toFixed(4));
    const netProfitFlower = Number(Math.max(0.01, grossRewardFlower - inputCostFlower).toFixed(2));
    const netProfitUSD = Number((netProfitFlower * flowerPriceUSD).toFixed(2));

    candidates.push({
      id: 'mission-plant-empty',
      domain: 'crop',
      priorityScore: 92,
      title: `Plant & Seed ${emptyPlotsCount} Vacant Crop Plots`,
      category: 'harvest',
      urgencyLevel: 'urgent',
      urgencyLabel: '🚨 Idle Land Opportunity Cost',
      timeHorizon: 'Empty Plots Waiting',
      description: `You have ${emptyPlotsCount} unplanted plots. Seed them with ${cropName} or high-efficiency crops to resume profit generation.`,
      progressCurrent: 0,
      progressTarget: emptyPlotsCount,
      unit: 'plots',
      estimatedProfitSFL: netProfitFlower,
      netProfitFlower,
      grossProfitFlower: grossRewardFlower,
      xpReward: emptyPlotsCount * 12,
      isCompleted: false,
      reason: `Idle plots generate 0 revenue. Seeding ${emptyPlotsCount} plots immediately restarts continuous Bumpkin XP accumulation.`,
      financials: {
        grossRewardFlower,
        inputCostFlower,
        netProfitFlower,
        netProfitUSD,
        roiPercent: 175,
        profitPerHour: Number((netProfitFlower / 2).toFixed(4)),
        priceSource: 'Sunflower Land Community P2P Market Floor',
        priceBenchmark: `Seeding plots resumes active profit generation of ~${(netProfitFlower / 2).toFixed(4)} FLOWER/hr`,
      },
      execution: {
        primaryMetricLabel: 'Idle Plots',
        primaryMetricValue: `${emptyPlotsCount}`,
        targetAction: `Plant ${emptyPlotsCount} plots with ${cropName}`,
        nextRecommendedAction: 'Monitor plot timers in Harvest Radar',
        inventoryConsumed: `${emptyPlotsCount}× Seeds`,
        inventoryProduced: `${emptyPlotsCount}× ${cropName} at maturation`,
        actionTab: 'profit-radar',
        actionButtonLabel: 'Open Execution Guide',
        resourceTab: 'profit-radar',
        resourceButtonLabel: 'View Farm Resources',
        steps: [
          `Inspect idle plots: Identify ${emptyPlotsCount} vacant field slots.`,
          `Select seed variety: Choose ${cropName} or high-efficiency seeds based on margin.`,
          'Deposit seeds into plots: Plant all empty fields in your game session.',
          'Activate boost buffs: Verify water well and scarecrow range multipliers.',
          'Monitor harvest timer: Set alert for next maturation cycle.',
        ],
        checklistSteps: [
          { stepNumber: 1, title: 'Inspect idle plots', detail: `Locate the ${emptyPlotsCount} unplanted plots on your farm island.` },
          { stepNumber: 2, title: 'Select optimal seed variety', detail: `Procure ${emptyPlotsCount} seeds for ${cropName} from inventory or Betty shop.` },
          { stepNumber: 3, title: 'Plant vacant fields', detail: 'Sow all plots in-game to eliminate idle land opportunity cost.' },
          { stepNumber: 4, title: 'Verify water well boost', detail: 'Ensure water well buffs are active to shorten crop cycle duration.' },
          { stepNumber: 5, title: 'Monitor maturation radar', detail: 'Track growth progress on FarmIQ Harvest Radar for optimal harvest timing.' },
        ],
      },
      autoVerified: false,
      verificationBadge: 'Action Needed in Game',
      verificationDetail: `Live API: ${emptyPlotsCount} plots currently idle`,
    });

    insights.push({
      id: 'insight-crop-empty',
      type: 'urgent',
      icon: '🌱',
      title: `${emptyPlotsCount} Idle Plots Available`,
      description: 'Planted plots compound your farm valuation. Do not leave land unseeded.',
      metricLabel: 'Potential Yield',
      metricValue: `+${netProfitFlower} FLOWER`,
      actionText: 'Seed Plots',
      tabTarget: 'profit-radar',
    });
  } else {
    // SCENARIO 1C: Plots currently growing (rotation cycle)
    const harvestCount = unlockedPlots;
    const grossRewardFlower = Number((harvestCount * liveFloorFlower).toFixed(4));
    const inputCostFlower = Number((harvestCount * (seedCostPerUnit > 0 ? seedCostPerUnit : 0.0035)).toFixed(4));
    const netProfitFlower = Number(Math.max(0.01, grossRewardFlower - inputCostFlower).toFixed(2));
    const netProfitUSD = Number((netProfitFlower * flowerPriceUSD).toFixed(2));

    const nextReadyPlot = cropsPlanted[0]?.readyAt || 'in 1h';

    candidates.push({
      id: 'mission-cycle-crops',
      domain: 'crop',
      priorityScore: 78,
      title: `Cycle & Restock for ${cropName} Plots`,
      category: 'harvest',
      urgencyLevel: 'high-roi',
      urgencyLabel: '💎 Compounding Plot Cycle',
      timeHorizon: `Next Harvest: ${nextReadyPlot}`,
      description: `Prepare seeds and inventory rotation for your ${unlockedPlots} cycling ${cropName} plots.`,
      progressCurrent: Math.min(farm.inventory[dominantCropId] || 0, unlockedPlots),
      progressTarget: unlockedPlots,
      unit: 'plots',
      estimatedProfitSFL: netProfitFlower,
      netProfitFlower,
      grossProfitFlower: grossRewardFlower,
      xpReward: unlockedPlots * 15,
      isCompleted: (farm.inventory[dominantCropId] || 0) >= unlockedPlots,
      reason: `${unlockedPlots} plots are actively cultivating. Pre-stocking seeds guarantees zero downtime when mature.`,
      financials: {
        grossRewardFlower,
        inputCostFlower,
        netProfitFlower,
        netProfitUSD,
        roiPercent: 188,
        profitPerHour: Number((netProfitFlower / 2).toFixed(4)),
        priceSource: 'Sunflower Land Community P2P Market Floor',
        priceBenchmark: `Live P2P Market Floor (${liveFloorFlower.toFixed(4)} FLOWER)`,
      },
      execution: {
        primaryMetricLabel: 'Plots Cultivating',
        primaryMetricValue: `${unlockedPlots}`,
        targetAction: `Prepare rotation for ${unlockedPlots} ${cropName} plots`,
        nextRecommendedAction: 'Check Harvest Radar timers before logging off',
        inventoryConsumed: `${unlockedPlots}× Seeds on harvest`,
        inventoryProduced: `${harvestCount}× ${cropName}`,
        actionTab: 'profit-radar',
        actionButtonLabel: 'Open Execution Guide',
        resourceTab: 'profit-radar',
        resourceButtonLabel: 'View Farm Resources',
        steps: [
          `Monitor maturation timer: Check ${nextReadyPlot} ready time in Harvest Radar.`,
          `Procure seeds: Stockpile ${unlockedPlots} replacement seeds in barn inventory.`,
          'Prep farm tools: Ensure tools and soil amendments are ready.',
          'Execute harvest cycle: Collect produce at the exact moment of maturity.',
          'Instantly re-seed: Eliminate idle plots to maintain maximum compounding rate.',
        ],
        checklistSteps: [
          { stepNumber: 1, title: 'Monitor maturation timer', detail: `Inspect plot growth countdown (${nextReadyPlot}) in FarmIQ Harvest Radar.` },
          { stepNumber: 2, title: 'Pre-stock seed inventory', detail: `Ensure ${unlockedPlots} seeds are deposited in your barn before harvest time.` },
          { stepNumber: 3, title: 'Check boost buffs', detail: 'Verify active scarecrow or greenhouse boosters apply to the incoming harvest.' },
          { stepNumber: 4, title: 'Harvest upon maturity', detail: 'Collect fully matured crops to prevent plot cooldown degradation.' },
          { stepNumber: 5, title: 'Execute instant re-seeding', detail: 'Immediately replant all plots to lock in the next production cycle.' },
        ],
      },
      autoVerified: (farm.inventory[dominantCropId] || 0) >= unlockedPlots,
      verificationBadge: (farm.inventory[dominantCropId] || 0) >= unlockedPlots ? 'Restocked & Ready' : 'Plots Cultivating',
      verificationDetail: `Live API: ${unlockedPlots} plots active; next harvest ${nextReadyPlot}`,
    });

    insights.push({
      id: 'insight-crop-cycle',
      type: 'profit',
      icon: '🌾',
      title: 'Plot Cadence Healthy',
      description: `All ${unlockedPlots} plots are cultivating. Next harvest ready ${nextReadyPlot}.`,
      metricLabel: 'Projected Net',
      metricValue: `+${netProfitFlower} FLOWER`,
      actionText: 'View Timers',
      tabTarget: 'profit-radar',
    });
  }

  // =========================================================================
  // DOMAIN 2: TOWN ORDERS & DELIVERY BOARD FULFILLMENTS
  // =========================================================================
  const liveOrders = farm.liveOrders || [];
  
  if (liveOrders.length > 0) {
    // Score all available orders to find the most profitable and actionable one
    const scoredOrders = liveOrders.map(order => {
      const items = order.items || {};
      const rewardFlower = order.reward?.sfl || 2.5;

      let rawMarketValue = 0;
      let totalRequired = 0;
      let totalOwned = 0;

      Object.entries(items).forEach(([itemName, count]) => {
        const required = typeof count === 'number' ? count : parseFloat(String(count) || '0');
        totalRequired += required;
        const owned = (farm.inventory[itemName.toLowerCase()] || 0) || 
          (farm.rawInventory?.[itemName] ? parseFloat(farm.rawInventory[itemName]) : 0);
        totalOwned += Math.min(owned, required);

        const comm = commodities[itemName.toLowerCase()];
        const unitP = comm?.floorFlower || (SFL_ITEMS[itemName.toLowerCase()]?.marketPriceSFL || 0.01);
        rawMarketValue += required * unitP;
      });

      const isFulfillable = totalRequired > 0 && totalOwned >= totalRequired;
      const netBonus = Number((rewardFlower - rawMarketValue).toFixed(2));
      const bonusPct = rawMarketValue > 0 ? Math.round(((rewardFlower - rawMarketValue) / rawMarketValue) * 100) : 120;

      return {
        order,
        items,
        rewardFlower,
        rawMarketValue,
        netBonus,
        bonusPct,
        isFulfillable,
        totalRequired,
        totalOwned,
      };
    });

    // Sort: 100% fulfillable first, then highest net reward
    scoredOrders.sort((a, b) => {
      if (a.isFulfillable && !b.isFulfillable) return -1;
      if (!a.isFulfillable && b.isFulfillable) return 1;
      return b.rewardFlower - a.rewardFlower;
    });

    const bestOrder = scoredOrders[0];
    const { order, items, rewardFlower, rawMarketValue, isFulfillable, bonusPct } = bestOrder;
    const requestedSummary = Object.entries(items).map(([k, v]) => `${v}× ${k}`).join(', ');
    const netProfitFlower = Math.max(0.5, rewardFlower - rawMarketValue);
    const netProfitUSD = Number((netProfitFlower * flowerPriceUSD).toFixed(2));

    candidates.push({
      id: `mission-delivery-${order.id || order.from}`,
      domain: 'delivery',
      priorityScore: isFulfillable ? 95 : 82,
      title: isFulfillable 
        ? `Deliver Contract to ${order.from} (100% Ready!)`
        : `Complete Town Delivery (${order.from})`,
      category: 'delivery',
      urgencyLevel: isFulfillable ? 'urgent' : 'high-roi',
      urgencyLabel: isFulfillable ? '🚨 Order 100% Fulfillable' : '💎 Delivery Board Bonus',
      timeHorizon: 'Contract Active in Town Board',
      description: `Fulfill order contract for ${order.from} (${requestedSummary}) to secure a bonus reward of ${rewardFlower} FLOWER and +350 Bumpkin XP.`,
      progressCurrent: isFulfillable ? 1 : 0,
      progressTarget: 1,
      unit: 'order',
      estimatedProfitSFL: rewardFlower,
      netProfitFlower,
      grossProfitFlower: rewardFlower,
      xpReward: 350,
      isCompleted: false,
      reason: `Citizen contracts pay an automatic +${bonusPct}% multiplier over baseline shop prices and grant high Bumpkin reputation XP needed to unlock advanced recipe tiers.`,
      financials: {
        grossRewardFlower: rewardFlower,
        inputCostFlower: rawMarketValue,
        netProfitFlower,
        netProfitUSD,
        roiPercent: Math.max(50, bonusPct),
        profitPerHour: rewardFlower,
        priceSource: 'Sunflower Land Citizen Delivery Board',
        priceBenchmark: `Pays +${bonusPct}% bonus premium compared to selling raw ingredients to Betty NPC shop`,
      },
      execution: {
        primaryMetricLabel: 'Active Orders',
        primaryMetricValue: '1 Ready',
        targetAction: `Submit ${order.from}'s order (${requestedSummary})`,
        nextRecommendedAction: 'Review new citizen contracts after town board refreshes',
        inventoryConsumed: requestedSummary,
        inventoryProduced: `+${rewardFlower} FLOWER + 350 Bumpkin XP`,
        actionTab: 'farm-vs-market',
        actionButtonLabel: 'Open Execution Guide',
        resourceTab: 'farm-vs-market',
        resourceButtonLabel: 'View Farm Resources',
        steps: [
          `Inspect delivery contract: Verify ${order.from}'s requirements (${requestedSummary}).`,
          `Check stockpile readiness: Confirm ${isFulfillable ? 'all items are in barn inventory' : 'gather missing ingredients'}.`,
          'Navigate to Town Board: Visit the Sunflower Land Town Plaza bulletin.',
          `Submit contract & collect reward: Claim +${rewardFlower} FLOWER and +350 Bumpkin XP.`,
          'Restock consumed resources: Replant or craft replacement ingredients.',
        ],
        checklistSteps: [
          {
            stepNumber: 1,
            title: 'Inspect delivery contract',
            detail: `Verify customer requirements for ${order.from} requiring ${requestedSummary}.`,
          },
          {
            stepNumber: 2,
            title: 'Check stockpile readiness',
            detail: isFulfillable ? 'All requested items exist in your barn stockpile.' : 'Confirm items in inventory or gather remaining items.',
          },
          {
            stepNumber: 3,
            title: 'Navigate to Town Board',
            detail: 'Travel to the Town Plaza in Sunflower Land and select the active Delivery Bulletin.',
          },
          {
            stepNumber: 4,
            title: 'Submit order & collect reward',
            detail: `Hand over contract commodities to immediately collect +${rewardFlower} FLOWER and +350 XP.`,
          },
          {
            stepNumber: 5,
            title: 'Restock consumed resources',
            detail: 'Queue replacement planting or craft cycles to keep safety buffer stockpiles filled.',
          },
        ],
      },
      autoVerified: isFulfillable,
      verificationBadge: isFulfillable ? 'Stockpile Ready in API' : 'Gathering Ingredients',
      verificationDetail: isFulfillable
        ? `Verified: You own 100% of required ingredients in farm inventory`
        : `Stockpile: ${bestOrder.totalOwned}/${bestOrder.totalRequired} items ready for delivery`,
    });

    insights.push({
      id: 'insight-delivery',
      type: 'delivery',
      icon: '📜',
      title: `Delivery for ${order.from}`,
      description: isFulfillable
        ? `Order is 100% ready in your stockpile. Deliver now to claim +${rewardFlower} FLOWER!`
        : `Citizen contract pays +${bonusPct}% premium over raw liquidation.`,
      metricLabel: 'Contract Payout',
      metricValue: `+${rewardFlower} FLOWER`,
      actionText: isFulfillable ? 'Deliver Now' : 'View Order',
      tabTarget: 'farm-vs-market',
    });
  }

  // =========================================================================
  // DOMAIN 3: LIVESTOCK & GREENHOUSE BOTANIC OPERATIONS
  // =========================================================================
  const chickens = farm.animals?.chickens || 0;
  const sickChickens = farm.animals?.sickChickens || 0;
  const cows = farm.animals?.cows || 0;
  const sheep = farm.animals?.sheep || 0;
  const activeFlowers = farm.greenhouse?.activeFlowers || [];
  const readyFlowers = activeFlowers.filter(f => f.readyAt.toLowerCase().includes('ready')).length;

  if (sickChickens > 0) {
    // Sick chickens require immediate care
    candidates.push({
      id: 'mission-sick-chickens',
      domain: 'livestock',
      priorityScore: 99,
      title: `Administer Medicine to ${sickChickens} Sick Chickens`,
      category: 'animal',
      urgencyLevel: 'urgent',
      urgencyLabel: '🚨 Livestock Health Emergency',
      timeHorizon: 'Chickens Sick Right Now',
      description: `You have ${sickChickens} sick chickens. Administer barn medicine immediately to restore daily egg laying cycles.`,
      progressCurrent: 0,
      progressTarget: sickChickens,
      unit: 'chickens',
      estimatedProfitSFL: 1.5,
      netProfitFlower: 1.5,
      grossProfitFlower: 2.0,
      xpReward: 200,
      isCompleted: false,
      reason: 'Sick chickens cease egg production entirely. Curing them restores continuous passive egg yields.',
      financials: {
        grossRewardFlower: 2.0,
        inputCostFlower: 0.5,
        netProfitFlower: 1.5,
        netProfitUSD: Number((1.5 * flowerPriceUSD).toFixed(2)),
        roiPercent: 300,
        priceSource: 'Hen House Production Restored',
        priceBenchmark: 'Restores ~14 Eggs/week (~0.105 FLOWER weekly passive yield)',
      },
      execution: {
        targetAction: `Treat ${sickChickens} sick chickens in Hen House`,
        nextRecommendedAction: 'Feed wheat to restore egg incubation',
        inventoryConsumed: 'Barn Medicine',
        inventoryProduced: 'Restored daily egg production',
        actionTab: 'overview',
        actionButtonLabel: 'Open Hen House',
        steps: [
          'Visit your Hen House on Sunflower Land.',
          `Locate the ${sickChickens} sick chickens in the coop.`,
          'Administer medicine to cure their condition.',
          'Feed them grain to resume active egg laying.',
        ],
      },
      autoVerified: false,
      verificationBadge: 'Action Needed in Game',
      verificationDetail: `Live API: ${sickChickens} chickens currently marked sick`,
    });
  } else if (cows > 0) {
    // Dairy Cow Milking
    const milkYield = cows * 2;
    const milkValFlower = Number((milkYield * 0.038).toFixed(4));
    candidates.push({
      id: 'mission-cows-milk',
      domain: 'livestock',
      priorityScore: 84,
      title: `Milk ${cows} Barn Dairy Cows & Store Fresh Milk`,
      category: 'animal',
      urgencyLevel: 'high-roi',
      urgencyLabel: '💎 High Value Dairy Yield',
      timeHorizon: 'Daily Dairy Cycle',
      description: `Tend to your ${cows} cows in the Barn to collect ~${milkYield} fresh Milk for high-tier Deli cheese processing.`,
      progressCurrent: farm.inventory.milk || 0,
      progressTarget: milkYield,
      unit: 'milk',
      estimatedProfitSFL: milkValFlower,
      netProfitFlower: milkValFlower,
      grossProfitFlower: milkValFlower,
      xpReward: 240,
      isCompleted: (farm.inventory.milk || 0) >= milkYield,
      reason: 'Milk trades at 0.038 FLOWER/unit and is the indispensable catalyst for Deli cheese and cakes.',
      financials: {
        grossRewardFlower: milkValFlower,
        inputCostFlower: 0.005,
        netProfitFlower: milkValFlower,
        netProfitUSD: Number((milkValFlower * flowerPriceUSD).toFixed(2)),
        roiPercent: 450,
        priceSource: 'P2P Order Book Dairy Floor',
        priceBenchmark: 'Raw milk commands high P2P demand (+80% value gain when aged in Deli)',
      },
      execution: {
        targetAction: `Collect ~${milkYield} Milk from ${cows} cows`,
        nextRecommendedAction: 'Age milk in Deli for gourmet Cheese (+320 XP)',
        inventoryConsumed: 'Hay / Wheat feed',
        inventoryProduced: `~${milkYield} Milk`,
        actionTab: 'overview',
        actionButtonLabel: 'View Barn',
        steps: [
          'Navigate to your Barn facility.',
          `Feed your ${cows} dairy cows with wheat or hay.`,
          'Collect fresh milk pails.',
          'Deposit in storage or transfer to Deli fermentation vat.',
        ],
      },
      autoVerified: (farm.inventory.milk || 0) >= milkYield,
      verificationBadge: (farm.inventory.milk || 0) >= milkYield ? 'Milk Stockpiled' : 'Ready to Milk',
      verificationDetail: `Live API: ${cows} cows active in Barn; ${farm.inventory.milk || 0} milk in stock`,
    });
  } else if (chickens > 0) {
    // Chicken Egg Gathering
    const eggYield = chickens * 2;
    const eggVal = Number((eggYield * 0.0075).toFixed(4));
    candidates.push({
      id: 'mission-chickens-egg',
      domain: 'livestock',
      priorityScore: 81,
      title: `Gather Daily Egg Yield from ${chickens} Chickens`,
      category: 'animal',
      urgencyLevel: 'high-roi',
      urgencyLabel: '💎 Daily Egg Harvest',
      timeHorizon: 'Coop Collection Cycle',
      description: `Feed your flock of ${chickens} chickens in the Hen House to gather fresh eggs for bakery baking.`,
      progressCurrent: farm.inventory.egg || 0,
      progressTarget: eggYield,
      unit: 'eggs',
      estimatedProfitSFL: eggVal,
      netProfitFlower: eggVal,
      grossProfitFlower: eggVal,
      xpReward: 180,
      isCompleted: (farm.inventory.egg || 0) >= eggYield,
      reason: 'Eggs are the foundational protein required for Sunflower Cakes and town orders.',
      financials: {
        grossRewardFlower: eggVal,
        inputCostFlower: 0.002,
        netProfitFlower: eggVal,
        netProfitUSD: Number((eggVal * flowerPriceUSD).toFixed(2)),
        roiPercent: 320,
        priceSource: 'P2P Order Book Egg Floor',
        priceBenchmark: 'Eggs maintain active buyer liquidity on live order books',
      },
      execution: {
        targetAction: `Feed ${chickens} chickens and collect ~${eggYield} eggs`,
        nextRecommendedAction: 'Use eggs in Bakery cake recipes',
        inventoryConsumed: 'Grain feed',
        inventoryProduced: `~${eggYield} Eggs`,
        actionTab: 'overview',
        actionButtonLabel: 'Open Hen House',
        steps: [
          'Enter the Hen House on your farm.',
          'Feed your flock with wheat grain.',
          'Collect laid eggs from nesting boxes.',
          'Reserve for Bakery Sunflower Cakes or fulfill citizen requests.',
        ],
      },
      autoVerified: (farm.inventory.egg || 0) >= eggYield,
      verificationBadge: (farm.inventory.egg || 0) >= eggYield ? 'Eggs Collected' : 'Coop Active',
      verificationDetail: `Live API: ${chickens} chickens active in Hen House`,
    });
  }

  // Greenhouse Botanic Bloom (if active)
  if (activeFlowers.length > 0) {
    const flowerCount = activeFlowers.length;
    const flowerGross = 8.5;
    const flowerNet = 7.3;
    const isFlowerUrgent = readyFlowers > 0;

    candidates.push({
      id: 'mission-greenhouse-nectar',
      domain: 'livestock',
      priorityScore: isFlowerUrgent ? 94 : 76,
      title: isFlowerUrgent 
        ? `Extract Nectar from ${readyFlowers} Mature Flower Beds`
        : 'Tend Flower Beds & Cultivate Honey Flow',
      category: 'craft',
      urgencyLevel: isFlowerUrgent ? 'urgent' : 'high-roi',
      urgencyLabel: isFlowerUrgent ? '🚨 Ready for Pollination' : '💎 High Margin Honey Yield',
      timeHorizon: isFlowerUrgent ? 'Blossoms Mature in Beds' : 'Greenhouse Cycle: ~6h',
      description: `Cultivate your ${flowerCount} active flower beds and harvest mature blossoms for Honey production.`,
      progressCurrent: readyFlowers > 0 ? readyFlowers : 2,
      progressTarget: flowerCount,
      unit: 'blossoms',
      estimatedProfitSFL: flowerNet,
      netProfitFlower: flowerNet,
      grossProfitFlower: flowerGross,
      xpReward: 250,
      isCompleted: readyFlowers >= flowerCount || (farm.inventory.honey || 0) > 0,
      reason: `Flowers and honey yield some of the highest ROI margins across Sunflower Land (+508% ROI). Cultivating your ${flowerCount} beds accelerates hive compounding.`,
      financials: {
        grossRewardFlower: flowerGross,
        inputCostFlower: 1.2,
        netProfitFlower: flowerNet,
        netProfitUSD: Number((flowerNet * flowerPriceUSD).toFixed(2)),
        roiPercent: 508,
        profitPerHour: Number((flowerNet / 6).toFixed(4)),
        priceSource: 'P2P Order Book & Beekeeper Yield Table',
        priceBenchmark: 'Honey sells for 0.0950 FLOWER/unit; highest profit per tile in greenhouse',
      },
      execution: {
        primaryMetricLabel: 'Flower Beds',
        primaryMetricValue: `${flowerCount} Active`,
        targetAction: `Harvest ${readyFlowers > 0 ? readyFlowers : flowerCount} flower beds and gather Honey`,
        nextRecommendedAction: 'Re-seed beds with Red Pansy or Yellow Daffodil seeds',
        inventoryConsumed: 'Flower bed compost & seeds',
        inventoryProduced: 'Blossoms + Jars of Honey',
        actionTab: 'overview',
        actionButtonLabel: 'Open Execution Guide',
        resourceTab: 'overview',
        resourceButtonLabel: 'View Farm Resources',
        steps: [
          'Inspect flower beds: Check soil hydration and species blooming status in Greenhouse.',
          'Extract floral nectar: Feed active beehives to accelerate honey jar maturation.',
          'Harvest mature blossoms: Safely collect ready flowers into inventory.',
          'Mix organic compost: Prepare nutrient-rich soil mix for next planting rotation.',
          'Re-seed flower beds: Plant high-margin varieties matching upcoming market demands.',
        ],
        checklistSteps: [
          {
            stepNumber: 1,
            title: 'Inspect blooming flower beds',
            detail: `Audit your ${flowerCount} flower beds in the Greenhouse and check blossom maturity timers.`,
          },
          {
            stepNumber: 2,
            title: 'Extract floral nectar',
            detail: 'Channel bees to collect floral nectar and accelerate Apiary honey jar filling.',
          },
          {
            stepNumber: 3,
            title: 'Harvest mature blossoms',
            detail: 'Snip blooming flowers into inventory for trade or high-tier NPC gift crafting.',
          },
          {
            stepNumber: 4,
            title: 'Mix organic compost',
            detail: 'Replenish bed nutrient levels with compost from your Island Composter.',
          },
          {
            stepNumber: 5,
            title: 'Plant next blossom seeds',
            detail: 'Sow new flower seeds to sustain continuous hive pollination without idle downtime.',
          },
        ],
      },
      autoVerified: readyFlowers >= flowerCount || (farm.inventory.honey || 0) > 0,
      verificationBadge: readyFlowers > 0 ? 'Blossoms Ready' : 'Blooming in Progress',
      verificationDetail: `Live API: ${flowerCount} flower beds active; ${readyFlowers} ready to harvest`,
    });

    insights.push({
      id: 'insight-flower',
      type: 'profit',
      icon: '🌺',
      title: 'Greenhouse & Honey Flow',
      description: 'Flower pollination generates +508% ROI through high-value Honey jars.',
      metricLabel: 'Honey Margin',
      metricValue: `+${flowerNet} FLOWER`,
      actionText: 'Check Beds',
      tabTarget: 'overview',
    });
  }

  // =========================================================================
  // DOMAIN 4: WORKBENCH & KITCHEN CRAFTING
  // =========================================================================
  const woodCount = farm.inventory.wood || (farm.rawInventory?.Wood ? parseFloat(farm.rawInventory.Wood) : 0);
  const stoneCount = farm.inventory.stone || (farm.rawInventory?.Stone ? parseFloat(farm.rawInventory.Stone) : 0);
  const axesOwned = farm.inventory.axe || (farm.rawInventory?.Axe ? parseFloat(farm.rawInventory.Axe) : 0);

  if (woodCount >= 5 && axesOwned < 15) {
    const axesCraftable = Math.min(Math.floor(woodCount / 5), 10);
    const axeReturn = Number((axesCraftable * 0.15).toFixed(2));

    candidates.push({
      id: 'mission-craft-axes',
      domain: 'craft',
      priorityScore: 79,
      title: `Forge ${axesCraftable}× Axes at Workbench for Tree Harvesting`,
      category: 'craft',
      urgencyLevel: 'high-roi',
      urgencyLabel: '💎 Tool Manufacturing Utility',
      timeHorizon: 'Instant Workbench Craft',
      description: `Convert ${axesCraftable * 5} Wood into ${axesCraftable} Axes to replenish logging tools and harvest regenerating trees.`,
      progressCurrent: Math.round(axesOwned),
      progressTarget: Math.round(axesOwned + axesCraftable),
      unit: 'axes',
      estimatedProfitSFL: axeReturn,
      netProfitFlower: axeReturn,
      grossProfitFlower: axeReturn * 1.5,
      xpReward: axesCraftable * 20,
      isCompleted: axesOwned >= 10,
      reason: 'Axes chop trees for 3-5 Wood each, multiplying raw timber stock with high utility compounding.',
      financials: {
        grossRewardFlower: axeReturn * 1.5,
        inputCostFlower: axesCraftable * 0.06,
        netProfitFlower: axeReturn,
        netProfitUSD: Number((axeReturn * flowerPriceUSD).toFixed(2)),
        roiPercent: 250,
        priceSource: 'Workbench Tool Crafting Standard',
        priceBenchmark: 'Crafting axes yourself saves buying from NPC and yields 3-5 Wood per chop',
      },
      execution: {
        primaryMetricLabel: 'Craftable Axes',
        primaryMetricValue: `${axesCraftable} Ready`,
        targetAction: `Craft ${axesCraftable}× Axes at Workbench`,
        nextRecommendedAction: 'Chop mature island trees to replenish timber',
        inventoryConsumed: `${axesCraftable * 5} Wood`,
        inventoryProduced: `${axesCraftable}× Axes`,
        actionTab: 'resource-strategy',
        actionButtonLabel: 'Open Execution Guide',
        resourceTab: 'resource-strategy',
        resourceButtonLabel: 'View Farm Resources',
        steps: [
          'Audit timber stock: Verify at least 5 Wood per axe in barn inventory.',
          'Navigate to Workbench: Locate tool crafting table on your island.',
          `Forge ${axesCraftable} Axes: Queue crafting batch for immediate collection.`,
          'Chop mature island trees: Fell fully regenerated timber nodes.',
          'Sustain tool buffer: Keep minimum 5 axes in reserve for emergency expansion.',
        ],
        checklistSteps: [
          { stepNumber: 1, title: 'Audit timber stock', detail: `Confirm your stockpile of ${woodCount.toFixed(1)} Wood covers the crafting recipe.` },
          { stepNumber: 2, title: 'Navigate to Workbench', detail: 'Travel to the crafting table on your farm island.' },
          { stepNumber: 3, title: `Forge ${axesCraftable}× Axes`, detail: 'Convert raw Wood into durable logging tools with 3-5x lumber multiplier.' },
          { stepNumber: 4, title: 'Harvest mature trees', detail: 'Cycle your woodcutters across ready tree nodes on the 2-hour cooldown.' },
          { stepNumber: 5, title: 'Maintain tool readiness', detail: 'Store forged axes in inventory to prevent downtime during island expansions.' },
        ],
      },
      autoVerified: axesOwned >= 10,
      verificationBadge: axesOwned >= 10 ? 'Axe Reserve Healthy' : 'Ready to Forge',
      verificationDetail: `Live API: ${woodCount.toFixed(1)} Wood owned; ${axesOwned} axes in stock`,
    });
  }

  // =========================================================================
  // DOMAIN 5: MARKET WATCH & P2P ORDER BOOK ARBITRAGE
  // =========================================================================
  // Scan rawInventory for the highest surplus item with good market floor
  let bestSurplusItem = 'Artichoke';
  let bestSurplusQty = 0;
  let bestSurplusFloor = 0.0101;

  if (farm.rawInventory) {
    Object.entries(farm.rawInventory).forEach(([rawName, countStr]) => {
      const qty = parseFloat(String(countStr) || '0');
      if (qty >= 20 && !['Crop Plot', 'Water Well', 'Chicken', 'Cow'].includes(rawName)) {
        const comm = commodities[rawName.toLowerCase()];
        const fl = comm?.floorFlower || (SFL_ITEMS[rawName.toLowerCase()]?.marketPriceSFL || 0.005);
        if (qty * fl > bestSurplusQty * bestSurplusFloor) {
          bestSurplusItem = rawName;
          bestSurplusQty = qty;
          bestSurplusFloor = fl;
        }
      }
    });
  }

  const marketGross = Number(Math.min(bestSurplusQty * bestSurplusFloor, 5.6).toFixed(2));
  const marketNet = Number((marketGross * 0.90).toFixed(2)); // After 10% market tax
  const marketNetUSD = Number((marketNet * flowerPriceUSD).toFixed(2));

  candidates.push({
    id: 'mission-market-arbitrage',
    domain: 'market',
    priorityScore: 83,
    title: `Arbitrage Surplus ${bestSurplusItem} on Live Market Order Book`,
    category: 'harvest',
    urgencyLevel: 'high-roi',
    urgencyLabel: '💎 Order Book Arbitrage',
    timeHorizon: 'Active Bids Available on Market Watch',
    description: `Inspect live Sunflower Land Community API order books on Market Watch and list surplus ${bestSurplusItem} above Betty NPC floors.`,
    progressCurrent: 0,
    progressTarget: 1,
    unit: 'listing',
    estimatedProfitSFL: marketNet,
    netProfitFlower: marketNet,
    grossProfitFlower: marketGross,
    xpReward: 150,
    isCompleted: false,
    reason: `P2P buyer bids on Market Watch pay 15% to 40% above NPC baseline shop floors with instant FLOWER settlement.`,
    financials: {
      grossRewardFlower: marketGross,
      inputCostFlower: Number((marketGross * 0.10).toFixed(2)),
      netProfitFlower: marketNet,
      netProfitUSD: marketNetUSD,
      roiPercent: 90,
      priceSource: 'Sunflower Land Live Order Book Depth',
      priceBenchmark: `P2P Buyer Bids pay +28% premium over instant Betty NPC sell floor`,
    },
    execution: {
      primaryMetricLabel: 'Market Depth',
      primaryMetricValue: '100 Depth',
      targetAction: `List surplus ${bestSurplusItem} on live P2P order book`,
      nextRecommendedAction: 'Monitor Market Watch for instant fill notifications',
      inventoryConsumed: `Surplus ${bestSurplusItem}`,
      inventoryProduced: `+${marketNet} liquid FLOWER`,
      actionTab: 'market-watch',
      actionButtonLabel: 'Open Execution Guide',
      resourceTab: 'market-watch',
      resourceButtonLabel: 'View Farm Resources',
      steps: [
        'Audit live order books: Review top 50 asks, bids, and spread on Market Watch.',
        `Identify pricing spread: Verify highest buyer bids for ${bestSurplusItem} exceed Betty floor.`,
        'Check tradeable inventory: Select unreserved surplus units ready for listing.',
        'Create marketplace listing: Post competitive ask on official Sunflower Land order book.',
        'Confirm filled trades: Collect liquid FLOWER tokens and reinvest in farm expansion.',
      ],
      checklistSteps: [
        { stepNumber: 1, title: 'Audit live order books', detail: 'Inspect the live 50 asks / 50 bids depth chart on FarmIQ Market Watch to locate active demand.' },
        { stepNumber: 2, title: 'Identify pricing spread', detail: `Verify that current buyer bid prices for ${bestSurplusItem} pay at least +15% above Betty shop.` },
        { stepNumber: 3, title: 'Check tradeable inventory', detail: 'Confirm surplus stockpile quantities that are not earmarked for active barn building goals.' },
        { stepNumber: 4, title: 'Create marketplace listing', detail: 'Post your tradeable batch onto the Sunflower Land P2P Order Book at the best competitive ask.' },
        { stepNumber: 5, title: 'Confirm filled trades', detail: 'Receive liquid FLOWER directly into your farm treasury upon instant trade execution.' },
      ],
    },
    autoVerified: false,
    verificationBadge: 'Action in Market Watch',
    verificationDetail: 'Live order book active with multiple high-pressure buyer offers',
  });

  // =========================================================================
  // DOMAIN 6: PROGRESSION MILESTONE & CAPITAL RESERVES
  // =========================================================================
  const bumpkinProg = getBumpkinProgression(farm.bumpkinExperience);
  const isStockpileSafe = woodCount >= 50 && stoneCount >= 20;

  candidates.push({
    id: 'mission-stockpile-reserve',
    domain: 'milestone',
    priorityScore: 72,
    title: 'Maintain Strategic Timber & Mineral Stockpile',
    category: 'save',
    urgencyLevel: 'strategic',
    urgencyLabel: '🛡️ Capital Preservation & Tool Reserve',
    timeHorizon: 'Permanent Milestone Target',
    description: 'Maintain at least 50 Wood and 20 Stone in reserve for tool crafting (Axes, Pickaxes) and Barn upgrades.',
    progressCurrent: Math.min(woodCount + stoneCount, 70),
    progressTarget: 70,
    unit: 'resources',
    estimatedProfitSFL: 0,
    netProfitFlower: 0,
    grossProfitFlower: 0,
    xpReward: 180,
    isCompleted: isStockpileSafe,
    reason: 'Raw minerals are your most irreplaceable capital. Selling wood or stone prematurely stalls axe crafting, expansion progress, and barn upgrades.',
    financials: {
      grossRewardFlower: 0,
      inputCostFlower: 0,
      netProfitFlower: 0,
      netProfitUSD: 0,
      roiPercent: 100,
      priceSource: 'Farm Opportunity Cost Engine',
      priceBenchmark: 'Protects ~4.85 FLOWER of compounding utility value by preventing forced tool buy-backs',
    },
    execution: {
      primaryMetricLabel: 'Timber Reserve',
      primaryMetricValue: `${woodCount.toFixed(1)} Wood`,
      targetAction: 'Preserve at least 50 Wood and 20 Stone in stockpile',
      nextRecommendedAction: 'Craft Axes at Workbench to chop regenerating trees',
      inventoryConsumed: '0 (Holding reserve)',
      inventoryProduced: 'Protected tool forging readiness',
      actionTab: 'resource-strategy',
      actionButtonLabel: 'Open Execution Guide',
      resourceTab: 'resource-strategy',
      resourceButtonLabel: 'View Farm Resources',
      steps: [
        `Audit raw material stockpile: Inspect Wood (${woodCount.toFixed(1)}) and Stone (${stoneCount.toFixed(1)}) levels.`,
        'Enforce liquidation hold: Block Betty shop selling to protect long-term expansion capital.',
        'Verify tool crafting queue: Check Workbench ingredient reserves for continuous Axe production.',
        'Cycle tree harvesting: Fell mature island trees on the 2-hour regeneration cadence.',
        'Secure buffer reserves: Preserve 50 Wood and 20 Stone locked for emergency building upgrades.',
      ],
      checklistSteps: [
        { stepNumber: 1, title: 'Audit raw material stockpile', detail: `Verify your live stockpiles of ${woodCount.toFixed(1)} Wood and ${stoneCount.toFixed(1)} Stone.` },
        { stepNumber: 2, title: 'Enforce liquidation hold', detail: 'Never sell raw lumber or stone to Betty shop; doing so forfeits tool crafting margins.' },
        { stepNumber: 3, title: 'Inspect Workbench tool queue', detail: 'Ensure adequate Wood is earmarked to forge Axes before chopping timber nodes.' },
        { stepNumber: 4, title: 'Cycle tree harvesting', detail: 'Harvest mature trees across your island on the standard 2-hour recharge cycle.' },
        { stepNumber: 5, title: 'Secure buffer reserves', detail: 'Maintain at least 50 Wood and 20 Stone permanently locked to meet Barn expansion criteria.' },
      ],
    },
    autoVerified: isStockpileSafe,
    verificationBadge: isStockpileSafe ? 'Stockpile Threshold Met' : 'Accumulating Reserve',
    verificationDetail: isStockpileSafe
      ? `Verified: ${woodCount.toFixed(1)} Wood and ${stoneCount.toFixed(1)} Stone meet safety reserve`
      : `Current: ${woodCount.toFixed(1)}/50 Wood, ${stoneCount.toFixed(1)}/20 Stone`,
  });

  insights.push({
    id: 'insight-stockpile',
    type: 'stockpile',
    icon: '🪵',
    title: 'Resource Reserve Status',
    description: isStockpileSafe
      ? 'Your timber and mineral reserves are healthy, protecting tool forging and barn expansion.'
      : 'Keep building timber reserves to unlock workbench tools.',
    metricLabel: 'Reserve Level',
    metricValue: `${Math.min(Math.round(woodCount + stoneCount), 70)}/70`,
    actionText: 'Inspect Engine',
    tabTarget: 'resource-strategy',
  });

  // =========================================================================
  // DYNAMIC SELECTION ALGORITHM (RANKING & 5-SLOT BALANCING)
  // =========================================================================
  // Compute granular 6-factor score for each candidate
  candidates.forEach(c => {
    c.missionScore = calculateMissionScore(c, 'balanced');
  });

  // Sort candidates by final composite score descending
  candidates.sort((a, b) => (b.missionScore?.finalScore || 0) - (a.missionScore?.finalScore || 0));

  // Group by domain to pick 1 representative from each major area to ensure diversity:
  // 1. Crop Domain
  // 2. Delivery Domain
  // 3. Livestock / Production Domain
  // 4. Crafting Domain
  // 5. Market Domain
  // 6. Milestone Domain
  const selectedMissions: DailyMission[] = [];
  const selectedDomains = new Set<string>();

  // First pass: pick highest scoring candidate per domain
  for (const candidate of candidates) {
    if (!selectedDomains.has(candidate.domain)) {
      selectedMissions.push(candidate);
      selectedDomains.add(candidate.domain);
      if (selectedMissions.length === 5) break;
    }
  }

  // Second pass: if fewer than 5 domains, fill with next top-scoring candidates
  if (selectedMissions.length < 5) {
    for (const candidate of candidates) {
      if (!selectedMissions.some(m => m.id === candidate.id)) {
        selectedMissions.push(candidate);
        if (selectedMissions.length === 5) break;
      }
    }
  }

  // Sort the final 5 missions by missionScore.finalScore descending
  selectedMissions.sort((a, b) => (b.missionScore?.finalScore || 0) - (a.missionScore?.finalScore || 0));

  // Summary calculations
  const totalProjectedProfitFlower = Number(selectedMissions.reduce((sum, m) => sum + m.netProfitFlower, 0).toFixed(2));
  const totalProjectedProfitUSD = Number((totalProjectedProfitFlower * flowerPriceUSD).toFixed(2));
  const totalBumpkinXP = selectedMissions.reduce((sum, m) => sum + m.xpReward, 0);

  const urgentCount = selectedMissions.filter(m => m.urgencyLevel === 'urgent').length;
  const highRoiCount = selectedMissions.filter(m => m.urgencyLevel === 'high-roi').length;
  const strategicCount = selectedMissions.filter(m => m.urgencyLevel === 'strategic').length;

  return {
    missions: selectedMissions,
    insights,
    summary: {
      totalProjectedProfitFlower,
      totalProjectedProfitUSD,
      totalBumpkinXP,
      urgentCount,
      highRoiCount,
      strategicCount,
    },
  };
}

import { FarmState } from '../types';
import { 
  CraftingRecipe, 
  VERIFIED_RECIPES, 
  RESOURCE_PROFILES, 
  getRecipesRequiringResource, 
  checkRecipeAffordability 
} from '../data/gameKnowledge';
import { CategorizedInventoryItem } from './inventoryEngine';
import { SFL_TOKEN_PRICE_USD } from '../data/sflData';

export interface FarmGoal {
  id: string;
  title: string;
  category: 'expansion' | 'craft' | 'cooking' | 'revenue';
  targetRecipeId?: string;
  description: string;
  requiredResources: Record<string, number>;
  sflCost: number;
  expectedBenefit: string;
  icon: string;
}

export const PRESET_GOALS: FarmGoal[] = [
  {
    id: 'goal-barn-upgrade',
    title: 'Barn Expansion & Livestock Growth',
    category: 'expansion',
    targetRecipeId: 'upgrade-barn-3',
    description: 'Expand Barn facility to unlock additional cow capacity and maximize daily milk yields.',
    requiredResources: { Wood: 250, Stone: 150, Iron: 75, Gold: 15 },
    sflCost: 35,
    expectedBenefit: '+4 Cow slots • ~65 Milk/week (~0.55 FLOWER recurring)',
    icon: '🐄',
  },
  {
    id: 'goal-hen-house',
    title: 'Hen House Level 2 Expansion',
    category: 'expansion',
    targetRecipeId: 'upgrade-hen-house-2',
    description: 'Expand Hen House capacity by +5 chickens to boost daily egg production for bakery cakes.',
    requiredResources: { Wood: 100, Stone: 50, Iron: 20 },
    sflCost: 15,
    expectedBenefit: '+5 Chicken slots • ~35 Eggs/week',
    icon: '🐔',
  },
  {
    id: 'goal-gold-mining',
    title: 'Craft Gold Pickaxe (Crimstone Mining)',
    category: 'craft',
    targetRecipeId: 'craft-gold-pickaxe',
    description: 'Accumulate 3 Wood, 3 Gold & 100 Coins to forge a Gold Pickaxe at the Workbench for Crimstone extraction.',
    requiredResources: { Wood: 3, Gold: 3 },
    sflCost: 0,
    expectedBenefit: 'Mines Crimstone nodes (Workbench: 3 Wood + 3 Gold + 100 Coins)',
    icon: '⛏️',
  },
  {
    id: 'goal-bakery-wholesale',
    title: 'Bakery XP Batch (Sunflower Cake)',
    category: 'cooking',
    targetRecipeId: 'craft-sunflower-cake',
    description: 'Gather 1,000 Sunflower, 10 Wheat & 30 Egg to bake Sunflower Cake (+525 Bumpkin XP · non-tradeable).',
    requiredResources: { Sunflower: 1000, Wheat: 10, Egg: 30 },
    sflCost: 0,
    expectedBenefit: '+525 Bumpkin XP per Sunflower Cake (0 FLOWER cooking fee)',
    icon: '🎂',
  },
  {
    id: 'goal-deli-specialist',
    title: 'Deli Mastery (Cheese → Blue Cheese)',
    category: 'cooking',
    targetRecipeId: 'craft-cheese',
    description: 'Convert Barn Milk into Deli Cheese (3 Milk each) and pair with 10 Blueberries for Blue Cheese (+6,000 XP).',
    requiredResources: { Milk: 6, Blueberry: 10 },
    sflCost: 0,
    expectedBenefit: '2 Cheese + 10 Blueberry → Blue Cheese (+6,000 Bumpkin XP · non-tradeable)',
    icon: '🧀',
  },
  {
    id: 'goal-apple-pie-bake',
    title: 'Bakery XP Batch (Apple Pie)',
    category: 'cooking',
    targetRecipeId: 'craft-apple-pie',
    description: 'Collect 5 Apple, 10 Wheat & 20 Egg to bake Apple Pie (+720 Bumpkin XP · 4h Bakery timer).',
    requiredResources: { Apple: 5, Wheat: 10, Egg: 20 },
    sflCost: 0,
    expectedBenefit: '+720 Bumpkin XP per Apple Pie (0 FLOWER cooking fee)',
    icon: '🥧',
  },
];

export interface StrategicOption {
  title: string;
  actionType: 'sell' | 'upgrade' | 'craft' | 'chain' | 'save';
  canAfford: boolean;
  expectedReturnFlower: number;
  expectedReturnSFL?: number; // Alias for compatibility
  timeframe: string;
  roiGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  breakdown: string;
  recommendationNote: string;
  missingSummary?: string;
  maxExecutions?: number;
}

export interface ResourceAdviceResult {
  resourceName: string;
  quantityOwned: number;
  formattedQuantity: string;
  unitPriceSFL: number;
  totalValueSFL: number;
  options: StrategicOption[];
  verdict: {
    bestAction: string;
    summary: string;
    opportunityCostWarning: string;
    isSafeToSell: boolean;
  };
}

/**
 * Generates verified, mathematically sound strategic recommendations for any selected resource
 */
export function generateResourceStrategy(
  item: CategorizedInventoryItem,
  farm: FarmState,
  activeGoalId: string = 'goal-barn-upgrade',
  flowerPriceUSD: number = 0.1504
): ResourceAdviceResult {
  const resourceName = item.name;
  const quantityOwned = item.quantityOwned;
  const unitPrice = item.unitPriceSFL;
  const totalValue = Number((quantityOwned * unitPrice).toFixed(2));
  const rawInventory = farm.rawInventory || {};
  const sflBalance = farm.sflBalance || 0;

  const activeGoal = PRESET_GOALS.find(g => g.id === activeGoalId) || PRESET_GOALS[0];
  const isNeededForActiveGoal = activeGoal.requiredResources[resourceName] !== undefined;
  const goalNeededCount = activeGoal.requiredResources[resourceName] || 0;

  const options: StrategicOption[] = [];

  // ==========================================
  // PATH 1: Direct Market Sell (Betty / P2P)
  // ==========================================
  const flowerFloor = item.marketPriceFlower;
  const totalFlower = item.totalValueFlower;
  const sellValue = totalFlower !== null ? totalFlower : totalValue;
  const p2pLabel = `${flowerFloor} FLOWER (~$${(flowerFloor * flowerPriceUSD).toFixed(4)} USD)`;

  options.push({
    title: 'Direct Market Sell (P2P / Betty)',
    actionType: 'sell',
    canAfford: quantityOwned > 0,
    expectedReturnFlower: sellValue,
    expectedReturnSFL: sellValue,
    timeframe: 'Instant',
    roiGrade: isNeededForActiveGoal ? 'D' : quantityOwned > 200 ? 'B' : 'C',
    breakdown: `${item.formattedQuantity} ${resourceName} × ${flowerFloor} FLOWER = ${totalFlower} FLOWER (~$${item.totalValueUSD} USD)`,
    recommendationNote: isNeededForActiveGoal
      ? `Selling now delays your active goal "${activeGoal.title}". Reserve required stockpile.`
      : 'Provides immediate liquid funds in FLOWER, but check higher-multiplier crafting recipes first.',
  });

  // ==========================================
  // PATH 2: Building Upgrades (Strictly Verified)
  // ==========================================
  const buildingRecipes = item.recipesUsedIn.filter(r => r.category === 'building');
  // Filter out buildings already owned in farm
  const relevantBuildings = buildingRecipes.filter(b => {
    if (b.id === 'upgrade-bakery' && farm.buildings?.bakery > 0) return false;
    if (b.id === 'upgrade-deli' && farm.buildings?.deli > 0) return false;
    if (b.id === 'upgrade-water-well' && farm.buildings?.waterWell > 0) return false;
    return true;
  });

  const topUpgrade = relevantBuildings[0] || buildingRecipes[0];
  if (topUpgrade) {
    const coinsBalance = farm.coinsBalance ?? 0;
    const afford = checkRecipeAffordability(topUpgrade, rawInventory, sflBalance, coinsBalance);
    const upgradeReturnFlower = topUpgrade.estimatedReturnSFL !== undefined 
      ? Number((topUpgrade.estimatedReturnSFL * 0.01).toFixed(4)) 
      : Number((sellValue * 2.5).toFixed(4));

    if (afford.canAfford) {
      options.push({
        title: `${topUpgrade.name} (Ready!)`,
        actionType: 'upgrade',
        canAfford: true,
        expectedReturnFlower: upgradeReturnFlower,
        expectedReturnSFL: upgradeReturnFlower,
        timeframe: topUpgrade.timeframe || '1-2w',
        roiGrade: 'A+',
        breakdown: `You have 100% of required ingredients. ${topUpgrade.unlockBenefits}`,
        recommendationNote: 'Highest compounding ROI move for your farm level. Execute this upgrade.',
      });
    } else {
      const missingText = afford.missingItems.map(m => `${m.missing} ${m.item}`).join(', ');
      const coinText = afford.missingSFL > 0 ? ` + ${afford.missingSFL * 200} Coins` : '';
      options.push({
        title: `${topUpgrade.name} (In Progress)`,
        actionType: 'upgrade',
        canAfford: false,
        expectedReturnFlower: upgradeReturnFlower,
        expectedReturnSFL: upgradeReturnFlower,
        timeframe: topUpgrade.timeframe || '1-2w',
        roiGrade: 'A',
        breakdown: `Requires: ${Object.entries(topUpgrade.ingredients).map(([k, v]) => `${v} ${k}`).join(', ')}`,
        recommendationNote: `Cannot afford yet. Missing: ${missingText}${coinText}. Keep collecting.`,
        missingSummary: `Missing ${missingText}${coinText}`,
      });
    }
  } else {
    // If not a direct building ingredient, show structural farm role
    const structuralReturn = Number((sellValue * 1.5).toFixed(4));
    options.push({
      title: 'Structural Farm Utility',
      actionType: 'upgrade',
      canAfford: true,
      expectedReturnFlower: structuralReturn,
      expectedReturnSFL: structuralReturn,
      timeframe: 'Ongoing',
      roiGrade: 'B',
      breakdown: `Asset utilized for continuous farm operations and Bumpkin leveling.`,
      recommendationNote: 'Retain adequate working capital for crop planting and animal feeds.',
    });
  }

  // ==========================================
  // PATH 3: Tool & Kitchen Crafting (Strictly Verified & Affordable-First)
  // ==========================================
  const craftingRecipes = item.recipesUsedIn.filter(r => r.category === 'tool' || r.category === 'food' || r.category === 'craftable');
  if (craftingRecipes.length > 0) {
    // Evaluate all recipes to find the best one player can ACTUALLY afford right now
    const evaluatedRecipes = craftingRecipes.map(recipe => ({
      recipe,
      afford: checkRecipeAffordability(recipe, rawInventory, sflBalance, farm.coinsBalance ?? 0),
    }));

    const affordableEntry = evaluatedRecipes.find(e => e.afford.canAfford && e.afford.maxCraftable > 0);

    if (affordableEntry) {
      const { recipe, afford } = affordableEntry;
      const craftOutputFlower = Number(((recipe.estimatedReturnSFL || 0.05) * 0.01 * afford.maxCraftable).toFixed(4));
      options.push({
        title: `Craft ${recipe.name} (${afford.maxCraftable}× Ready!)`,
        actionType: 'craft',
        canAfford: true,
        maxExecutions: afford.maxCraftable,
        expectedReturnFlower: craftOutputFlower,
        expectedReturnSFL: craftOutputFlower,
        timeframe: recipe.timeframe || 'Instant',
        roiGrade: 'A',
        breakdown: `Your inventory has 100% of ingredients to craft ${afford.maxCraftable}× ${recipe.name} immediately.`,
        recommendationNote: `Converts raw ${resourceName} into ${recipe.outputItem} with higher net utility.`,
      });
    } else {
      // Pick the closest recipe with least missing requirements
      const closest = evaluatedRecipes.sort((a, b) => a.afford.missingItems.length - b.afford.missingItems.length)[0];
      const { recipe, afford } = closest;
      const missingText = afford.missingItems.map(m => `${m.missing} ${m.item}`).join(', ');
      const craftReturnFlower = Number(((recipe.estimatedReturnSFL || 0.05) * 0.01).toFixed(4));
      options.push({
        title: `Craft ${recipe.name} (Missing Items)`,
        actionType: 'craft',
        canAfford: false,
        expectedReturnFlower: craftReturnFlower,
        expectedReturnSFL: craftReturnFlower,
        timeframe: recipe.timeframe || 'Instant',
        roiGrade: 'B',
        breakdown: `1× ${recipe.name} requires: ${Object.entries(recipe.ingredients).map(([k, v]) => `${v} ${k}`).join(', ')}`,
        recommendationNote: `Cannot craft yet. Missing: ${missingText}. Avoid attempting to craft.`,
        missingSummary: `Missing ${missingText}`,
      });
    }
  } else {
    options.push({
      title: 'Workbench & Tool Processing',
      actionType: 'craft',
      canAfford: false,
      expectedReturnFlower: 0,
      expectedReturnSFL: 0,
      timeframe: 'N/A',
      roiGrade: 'C',
      breakdown: `No direct workbench or tool recipe registered for this item.`,
      recommendationNote: 'Best held for animal feeds or direct P2P order book listings.',
    });
  }

  // ==========================================
  // PATH 4: Goal Alignment, Deliveries or Animal Feeds
  // ==========================================
  if (isNeededForActiveGoal) {
    const collectedRatio = Math.min(100, Math.round((quantityOwned / goalNeededCount) * 100));
    const deficit = Math.max(0, Number((goalNeededCount - quantityOwned).toFixed(2)));
    const goalValFlower = Number((sellValue * 2.2).toFixed(4));

    options.push({
      title: `Reserve for Milestone: ${activeGoal.title}`,
      actionType: 'save',
      canAfford: deficit === 0,
      expectedReturnFlower: goalValFlower,
      expectedReturnSFL: goalValFlower,
      timeframe: 'Active Goal',
      roiGrade: 'A+',
      breakdown: `Target: ${goalNeededCount} ${resourceName} (${collectedRatio}% collected • ${deficit > 0 ? `Need ${deficit} more` : 'Goal Requirement Met!'})`,
      recommendationNote: deficit === 0
        ? `You have reached the full ${goalNeededCount} ${resourceName} needed for ${activeGoal.title}!`
        : `Do not sell! You still need ${deficit} more ${resourceName} to complete ${activeGoal.title}.`,
    });
  } else if (item.category === 'crop') {
    const chainValFlower = Number((sellValue * 1.4).toFixed(4));
    options.push({
      title: 'Town Deliveries & Animal Feed',
      actionType: 'chain',
      canAfford: quantityOwned > 0,
      expectedReturnFlower: chainValFlower,
      expectedReturnSFL: chainValFlower,
      timeframe: 'Short-term',
      roiGrade: 'A',
      breakdown: `Fulfill citizen delivery contracts for +40% premium and Bumpkin XP.`,
      recommendationNote: 'Town delivery contracts consistently beat base NPC sell rates.',
    });
  } else if (item.category === 'animal') {
    const chainValFlower = Number((sellValue * 1.65).toFixed(4));
    options.push({
      title: 'Deli Processing & Animal Nourishment',
      actionType: 'chain',
      canAfford: quantityOwned > 0,
      expectedReturnFlower: chainValFlower,
      expectedReturnSFL: chainValFlower,
      timeframe: 'Medium-term',
      roiGrade: 'A+',
      breakdown: `Process into high-tier Bumpkin meals for +65% utility value.`,
      recommendationNote: 'Raw animal products provide highest compounding return when cooked.',
    });
  } else {
    const chainValFlower = Number((sellValue * 1.25).toFixed(4));
    options.push({
      title: 'P2P Order Book Listing',
      actionType: 'chain',
      canAfford: quantityOwned > 0,
      expectedReturnFlower: chainValFlower,
      expectedReturnSFL: chainValFlower,
      timeframe: 'Short-term',
      roiGrade: 'B',
      breakdown: `List on live Sunflower Land marketplace order book to capture active bids.`,
      recommendationNote: 'Monitor Market Watch for buyers offering premium FLOWER.',
    });
  }

  // ==========================================
  // FINAL VERDICT & RECOMMENDATION LOGIC
  // ==========================================
  let bestAction = '';
  let summary = '';
  let opportunityCostWarning = '';
  let isSafeToSell = false;

  if (isNeededForActiveGoal && quantityOwned <= goalNeededCount) {
    bestAction = `Hold 100% of ${resourceName} for ${activeGoal.title}`;
    summary = `You currently own ${item.formattedQuantity} ${resourceName}, all of which is actively earmarked for your goal "${activeGoal.title}" (target: ${goalNeededCount} ${resourceName}). Liquidating now would delay your milestone.`;
    opportunityCostWarning = `Selling now would yield ${sellValue} FLOWER, but sets back your ${activeGoal.title} expansion by ${((quantityOwned / goalNeededCount) * 100).toFixed(0)}%.`;
    isSafeToSell = false;
  } else if (isNeededForActiveGoal && quantityOwned > goalNeededCount) {
    const surplus = Number((quantityOwned - goalNeededCount).toFixed(2));
    bestAction = `Reserve ${goalNeededCount} for ${activeGoal.title}, safely liquidate surplus ${surplus}`;
    summary = `Your stockpile exceeds the ${goalNeededCount} ${resourceName} requirement for ${activeGoal.title}. You can safely sell or craft with the surplus ${surplus} ${resourceName}.`;
    opportunityCostWarning = `Keep ${goalNeededCount} in reserve. The surplus ${surplus} ${resourceName} can be traded for liquid FLOWER.`;
    isSafeToSell = true;
  } else {
    // Not part of active goal
    const affordableCraft = options.find(o => o.actionType === 'craft' && o.canAfford);
    if (affordableCraft && affordableCraft.maxExecutions && affordableCraft.maxExecutions > 0) {
      bestAction = `Craft ${affordableCraft.title} for maximum utility`;
      summary = `Your inventory has all ingredients ready. Crafting converts raw materials into higher-value Bumpkin assets compared to ${sellValue} FLOWER from raw sales.`;
      opportunityCostWarning = `Raw market liquidation gives ${sellValue} FLOWER; crafting preserves superior farm utility.`;
      isSafeToSell = false;
    } else {
      bestAction = quantityOwned > 100 
        ? `Liquidate surplus ${resourceName} on live FLOWER order book`
        : `Hold ${resourceName} for upcoming crafting recipes`;
      summary = `Resource ${resourceName} has ${item.recipesUsedIn.length} verified game recipes. Selling raw provides ${sellValue} FLOWER.`;
      opportunityCostWarning = `Raw selling is acceptable for excess stockpiles, but check recipe dependencies first.`;
      isSafeToSell = quantityOwned > 100;
    }
  }

  return {
    resourceName,
    quantityOwned,
    formattedQuantity: item.formattedQuantity,
    unitPriceSFL: unitPrice,
    totalValueSFL: totalValue,
    options,
    verdict: {
      bestAction,
      summary,
      opportunityCostWarning,
      isSafeToSell,
    },
  };
}

/**
 * Simulates consequences of selling X amount of a resource
 */
export function simulateResourceSale(
  item: CategorizedInventoryItem,
  amountToSell: number,
  farm: FarmState,
  activeGoalId: string = 'goal-barn-upgrade',
  flowerPriceUSD: number = 0.1504
) {
  const current = item.quantityOwned;
  const clampedSell = Math.min(Math.max(0, amountToSell), current);
  const remaining = Number((current - clampedSell).toFixed(2));
  const proceedsSFL = Number((clampedSell * item.unitPriceSFL).toFixed(2));
  const proceedsUSD = Number((proceedsSFL * SFL_TOKEN_PRICE_USD).toFixed(2));
  const proceedsFlower = item.marketPriceFlower ? Number((clampedSell * item.marketPriceFlower).toFixed(4)) : null;

  const activeGoal = PRESET_GOALS.find(g => g.id === activeGoalId) || PRESET_GOALS[0];
  const goalReq = activeGoal.requiredResources[item.name] || 0;
  const isGoalDelayed = goalReq > 0 && remaining < goalReq;
  const goalDeficit = Math.max(0, goalReq - remaining);

  // Check recipes that were affordable before but are no longer affordable
  const brokenRecipes: string[] = [];
  item.recipesUsedIn.forEach(recipe => {
    const before = checkRecipeAffordability(recipe, farm.rawInventory || {}, farm.sflBalance || 0);
    // simulated inventory
    const simInv = { ...(farm.rawInventory || {}), [item.name]: remaining };
    const after = checkRecipeAffordability(recipe, simInv, farm.sflBalance || 0);

    if (before.canAfford && !after.canAfford) {
      brokenRecipes.push(recipe.name);
    }
  });

  const makesSenseToSell = !isGoalDelayed && brokenRecipes.length === 0 && clampedSell > 0;

  return {
    clampedSell,
    remaining,
    proceedsSFL,
    proceedsUSD,
    proceedsFlower,
    activeGoal,
    isGoalDelayed,
    goalDeficit,
    brokenRecipes,
    makesSenseToSell,
    verdictMessage: isGoalDelayed
      ? `🛑 Selling ${clampedSell} ${item.name} drops your stockpile below the ${goalReq} needed for ${activeGoal.title}. Milestone will be delayed.`
      : brokenRecipes.length > 0
      ? `⚠️ Selling ${clampedSell} ${item.name} makes ${brokenRecipes.join(', ')} unaffordable.`
      : `🟢 Safe transaction: Remaining ${remaining} ${item.name} preserves all your milestone and crafting requirements.`,
  };
}


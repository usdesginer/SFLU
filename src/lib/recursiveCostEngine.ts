import { FarmState, ProductionTimeType, TimeValuationMode, ProductionTimeProfile } from '../types';
import { SFL_ITEMS } from '../data/sflData';

/**
 * ============================================================================
 * FarmIQ Recursive Resource Cost Engine (RRCE) & 4-Category Economic Model
 * ============================================================================
 * Separates four distinct economic concepts that must never be conflated:
 *   1. Category 1 · Tradeable Resources (Market Value)
 *   2. Category 2 · Craftable Tradeable Items (Production Profit)
 *   3. Category 3 · Consumable Products (XP Utility — untradable foods/meals)
 *   4. Category 4 · Time-Based Production (Time Cost — waiting/growing/recharge)
 *
 * Tradeability, production type, and economic utility are modeled as separate,
 * non-mutually-exclusive properties on every recipe and item.
 */

export type EconomicCategoryId =
  | 'CATEGORY_1_TRADEABLE_RESOURCE'
  | 'CATEGORY_2_CRAFTABLE_TRADEABLE'
  | 'CATEGORY_3_CONSUMABLE_XP'
  | 'CATEGORY_4_TIME_BASED';

export type EconomicUtilityTag =
  | 'market_value'
  | 'production_profit'
  | 'xp_utility'
  | 'time_cost'
  | 'tool_extraction';

export type ProductionOutputType =
  | 'resource'
  | 'tool'
  | 'food'
  | 'crop'
  | 'animal_product'
  | 'craftable';

export interface ProductionRecipeRow {
  recipe_id: string;
  output_item_id: string;
  output_name: string;
  output_icon: string;
  output_quantity: number;
  required_building: string;
  production_duration: number;          // Minutes (0 if instant)
  node_recharge_minutes?: number;       // Time-based node cooldown (e.g. Tree 120m, Stone 240m)
  is_instant: boolean;
  is_tradeable_output: boolean;
  output_type: ProductionOutputType;
  economic_category: EconomicCategoryId;
  economic_utility: EconomicUtilityTag[];
  xp_reward: number;
  recipe_version: string;
}

export interface ProductionRecipeInputRow {
  recipe_id: string;
  input_item_id: string;
  input_name: string;
  input_quantity: number;
  input_type: 'coin' | 'resource' | 'tool' | 'crop' | 'animal_product';
}

export interface FarmSkillModifierRow {
  skill_name: string;
  description: string;
  target_recipe_id?: string;
  target_item_id?: string;
  modifier_type: 'coin_discount' | 'yield_bonus' | 'duration_reduction' | 'xp_bonus';
  modifier_value: number;               // e.g. 0.80 for 20% Axe Coin discount (20 -> 16 Coins)
  is_active_on_farm: boolean;
  detected_from_api: boolean;
}

export interface RecursiveCostNode {
  itemId: string;
  itemName: string;
  icon: string;
  recipeId: string;
  quantityRequired: number;
  outputQuantityPerCraft: number;
  requiredBuilding: string;
  isInstant: boolean;
  productionDurationMinutes: number;
  nodeRechargeMinutes: number;
  isTradeableOutput: boolean;
  outputType: ProductionOutputType;
  economicCategory: EconomicCategoryId;
  economicUtility: EconomicUtilityTag[];
  xpReward: number;
  // Cost Breakdown in Coins
  directCoinsPerCraft: number;
  inheritedResourceCoinsWithDiscount: number;
  inheritedResourceCoinsWithoutDiscount: number;
  unitCostCoinsWithDiscount: number;
  unitCostCoinsWithoutDiscount: number;
  totalRequiredCostCoinsWithDiscount: number;
  totalRequiredCostCoinsWithoutDiscount: number;
  skillDiscountSavingsCoins: number;
  skillDiscountSavingsPercent: number;
  // FLOWER conversions & Market comparison
  unitCostFlowerWithDiscount: number;
  unitCostFlowerWithoutDiscount: number;
  marketSellingPriceFlower: number | null; // Strictly null for untradable items (Tools, Foods, etc.)
  marketArbitrageProfitFlower: number | null;
  // Mathematical formula string
  formulaSymbol: string;
  formulaSymbolic: string;
  formulaEvaluatedWithDiscount: string;
  formulaEvaluatedWithoutDiscount: string;
  children: RecursiveCostNode[];
}

export interface RecursiveChainSummaryRow {
  itemId: string;
  name: string;
  icon: string;
  toolUsed: string;
  toolIcon: string;
  recipeDescription: string;
  formulaSymbolic: string;
  formulaWithDiscount: string;
  formulaWithoutDiscount: string;
  costCoinsWithDiscount: number;
  costCoinsWithoutDiscount: number;
  savingsCoins: number;
  savingsPercent: number;
  costFlowerWithDiscount: number;
  marketPriceFlower: number | null;
  isTradeable: boolean;
  economicCategory: EconomicCategoryId;
  economicUtility: EconomicUtilityTag[];
  nodeRechargeFormatted: string;
  cumulativeAxesRequired: number;
}

// Exchange rate benchmark: 320 Coins ≈ 1 FLOWER (calibrated to Sunflower Land economy)
export const COINS_PER_FLOWER_RATE = 320;

/**
 * Central normalized `production_recipes` catalogue
 */
export const PRODUCTION_RECIPES_TABLE: Record<string, ProductionRecipeRow> = {
  // --- TOOLS (Crafted at Workbench · Instant · Untradable · Tool Extraction Utility) ---
  recipe_axe: {
    recipe_id: 'recipe_axe',
    output_item_id: 'axe',
    output_name: 'Axe',
    output_icon: '🪓',
    output_quantity: 1,
    required_building: 'Workbench',
    production_duration: 0,
    is_instant: true,
    is_tradeable_output: false,
    output_type: 'tool',
    economic_category: 'CATEGORY_2_CRAFTABLE_TRADEABLE',
    economic_utility: ['tool_extraction'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  recipe_pickaxe: {
    recipe_id: 'recipe_pickaxe',
    output_item_id: 'pickaxe',
    output_name: 'Pickaxe',
    output_icon: '⛏️',
    output_quantity: 1,
    required_building: 'Workbench',
    production_duration: 0,
    is_instant: true,
    is_tradeable_output: false,
    output_type: 'tool',
    economic_category: 'CATEGORY_2_CRAFTABLE_TRADEABLE',
    economic_utility: ['tool_extraction'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  recipe_stone_pickaxe: {
    recipe_id: 'recipe_stone_pickaxe',
    output_item_id: 'stonePickaxe',
    output_name: 'Stone Pickaxe',
    output_icon: '🔨',
    output_quantity: 1,
    required_building: 'Workbench',
    production_duration: 0,
    is_instant: true,
    is_tradeable_output: false,
    output_type: 'tool',
    economic_category: 'CATEGORY_2_CRAFTABLE_TRADEABLE',
    economic_utility: ['tool_extraction'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  recipe_iron_pickaxe: {
    recipe_id: 'recipe_iron_pickaxe',
    output_item_id: 'ironPickaxe',
    output_name: 'Iron Pickaxe',
    output_icon: '⚒️',
    output_quantity: 1,
    required_building: 'Workbench',
    production_duration: 0,
    is_instant: true,
    is_tradeable_output: false,
    output_type: 'tool',
    economic_category: 'CATEGORY_2_CRAFTABLE_TRADEABLE',
    economic_utility: ['tool_extraction'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  recipe_gold_pickaxe: {
    recipe_id: 'recipe_gold_pickaxe',
    output_item_id: 'goldPickaxe',
    output_name: 'Gold Pickaxe',
    output_icon: '🔱',
    output_quantity: 1,
    required_building: 'Workbench',
    production_duration: 0,
    is_instant: true,
    is_tradeable_output: false,
    output_type: 'tool',
    economic_category: 'CATEGORY_2_CRAFTABLE_TRADEABLE',
    economic_utility: ['tool_extraction'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },

  // --- CATEGORY 1 & 4: TRADEABLE RESOURCES (Instant Extraction + Node Recharge Time Cost) ---
  recipe_wood: {
    recipe_id: 'recipe_wood',
    output_item_id: 'wood',
    output_name: 'Wood',
    output_icon: '🪵',
    output_quantity: 1,
    required_building: 'Forest Tree Node',
    production_duration: 0,
    node_recharge_minutes: 120, // 2h tree regeneration
    is_instant: true,
    is_tradeable_output: true,
    output_type: 'resource',
    economic_category: 'CATEGORY_1_TRADEABLE_RESOURCE',
    economic_utility: ['market_value', 'production_profit', 'time_cost'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  recipe_stone: {
    recipe_id: 'recipe_stone',
    output_item_id: 'stone',
    output_name: 'Stone',
    output_icon: '🪨',
    output_quantity: 1,
    required_building: 'Stone Rock Node',
    production_duration: 0,
    node_recharge_minutes: 240, // 4h stone regeneration
    is_instant: true,
    is_tradeable_output: true,
    output_type: 'resource',
    economic_category: 'CATEGORY_1_TRADEABLE_RESOURCE',
    economic_utility: ['market_value', 'production_profit', 'time_cost'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  recipe_iron: {
    recipe_id: 'recipe_iron',
    output_item_id: 'iron',
    output_name: 'Iron',
    output_icon: '⛓️',
    output_quantity: 1,
    required_building: 'Iron Ore Node',
    production_duration: 0,
    node_recharge_minutes: 480, // 8h iron regeneration
    is_instant: true,
    is_tradeable_output: true,
    output_type: 'resource',
    economic_category: 'CATEGORY_1_TRADEABLE_RESOURCE',
    economic_utility: ['market_value', 'production_profit', 'time_cost'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  recipe_gold: {
    recipe_id: 'recipe_gold',
    output_item_id: 'gold',
    output_name: 'Gold',
    output_icon: '🪙',
    output_quantity: 1,
    required_building: 'Gold Vein Node',
    production_duration: 0,
    node_recharge_minutes: 1440, // 24h gold regeneration
    is_instant: true,
    is_tradeable_output: true,
    output_type: 'resource',
    economic_category: 'CATEGORY_1_TRADEABLE_RESOURCE',
    economic_utility: ['market_value', 'production_profit', 'time_cost'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  recipe_crimstone: {
    recipe_id: 'recipe_crimstone',
    output_item_id: 'crimstone',
    output_name: 'Crimstone',
    output_icon: '💎',
    output_quantity: 1,
    required_building: 'Crimstone Crystal Node',
    production_duration: 0,
    node_recharge_minutes: 2880, // 48h crimstone regeneration
    is_instant: true,
    is_tradeable_output: true,
    output_type: 'resource',
    economic_category: 'CATEGORY_1_TRADEABLE_RESOURCE',
    economic_utility: ['market_value', 'production_profit', 'time_cost'],
    xp_reward: 0,
    recipe_version: 'v2.0',
  },
  // --- CATEGORY 3: OFFICIAL SFL COOKING RECIPES (consumables.ts · Zero Cooking Time Fees = 0.0000 FLOWER) ---
  recipe_mashed_potato: {
    recipe_id: 'recipe_mashed_potato',
    output_item_id: 'mashedPotato',
    output_name: 'Mashed Potato',
    output_icon: '🥔',
    output_quantity: 1,
    required_building: 'Fire Pit',
    production_duration: 1, // 30s in consumables.ts
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 3,
    recipe_version: 'v2.4-official-sfl',
  },
  recipe_pumpkin_soup: {
    recipe_id: 'recipe_pumpkin_soup',
    output_item_id: 'pumpkinSoup',
    output_name: 'Pumpkin Soup',
    output_icon: '🍲',
    output_quantity: 1,
    required_building: 'Fire Pit',
    production_duration: 3, // 3m (180s) in consumables.ts
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 24,
    recipe_version: 'v2.4-official-sfl',
  },
  recipe_cheese: {
    recipe_id: 'recipe_cheese',
    output_item_id: 'cheese',
    output_name: 'Cheese',
    output_icon: '🧀',
    output_quantity: 1,
    required_building: 'Deli',
    production_duration: 20, // 20m (1,200s) in consumables.ts · 0.0000 FLOWER cooking fee
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 1,
    recipe_version: 'v2.4-official-sfl',
  },
  recipe_cauliflower_burger: {
    recipe_id: 'recipe_cauliflower_burger',
    output_item_id: 'cauliflowerBurger',
    output_name: 'Cauliflower Burger',
    output_icon: '🍔',
    output_quantity: 1,
    required_building: 'Kitchen',
    production_duration: 180, // 3h (10,800s) in consumables.ts
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 255,
    recipe_version: 'v2.4-official-sfl',
  },
  recipe_blue_cheese: {
    recipe_id: 'recipe_blue_cheese',
    output_item_id: 'blueCheese',
    output_name: 'Blue Cheese',
    output_icon: '🧀',
    output_quantity: 1,
    required_building: 'Deli',
    production_duration: 180, // 3h (10,800s) in consumables.ts
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 6000,
    recipe_version: 'v2.4-official-sfl',
  },
  recipe_sunflower_cake: {
    recipe_id: 'recipe_sunflower_cake',
    output_item_id: 'sunflowerCake',
    output_name: 'Sunflower Cake',
    output_icon: '🎂',
    output_quantity: 1,
    required_building: 'Bakery',
    production_duration: 390, // 6h 30m (23,400s) in consumables.ts
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 525,
    recipe_version: 'v2.4-official-sfl',
  },
  recipe_chowder: {
    recipe_id: 'recipe_chowder',
    output_item_id: 'chowder',
    output_name: 'Chowder',
    output_icon: '🥣',
    output_quantity: 1,
    required_building: 'Kitchen',
    production_duration: 480, // 8h (28,800s) in consumables.ts
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 1000,
    recipe_version: 'v2.4-official-sfl',
  },
  recipe_honey_cheddar: {
    recipe_id: 'recipe_honey_cheddar',
    output_item_id: 'honeyCheddar',
    output_name: 'Honey Cheddar',
    output_icon: '🧀',
    output_quantity: 1,
    required_building: 'Deli',
    production_duration: 720, // 12h (43,200s) in consumables.ts
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 15000,
    recipe_version: 'v2.4-official-sfl',
  },
  recipe_fermented_carrots: {
    recipe_id: 'recipe_fermented_carrots',
    output_item_id: 'fermentedCarrots',
    output_name: 'Fermented Carrots',
    output_icon: '🫙',
    output_quantity: 1,
    required_building: 'Deli',
    production_duration: 1440, // 24h (86,400s) in consumables.ts
    is_instant: false,
    is_tradeable_output: false,
    output_type: 'food',
    economic_category: 'CATEGORY_3_CONSUMABLE_XP',
    economic_utility: ['xp_utility', 'time_cost'],
    xp_reward: 250,
    recipe_version: 'v2.4-official-sfl',
  },
};

/**
 * Central normalized `production_recipe_inputs` table
 */
export const PRODUCTION_RECIPE_INPUTS_TABLE: ProductionRecipeInputRow[] = [
  // Axe: 20 Coins (16 Coins with Feller's Discount / Logger Skill Discount)
  { recipe_id: 'recipe_axe', input_item_id: 'coins', input_name: 'Coins', input_quantity: 20, input_type: 'coin' },

  // Wood: 1 Axe -> 1 Wood (or Y_wood per Axe)
  { recipe_id: 'recipe_wood', input_item_id: 'axe', input_name: 'Axe', input_quantity: 1, input_type: 'tool' },

  // Pickaxe: 20 Coins + 3 Wood
  { recipe_id: 'recipe_pickaxe', input_item_id: 'coins', input_name: 'Coins', input_quantity: 20, input_type: 'coin' },
  { recipe_id: 'recipe_pickaxe', input_item_id: 'wood', input_name: 'Wood', input_quantity: 3, input_type: 'resource' },

  // Stone: 1 Pickaxe -> 1 Stone
  { recipe_id: 'recipe_stone', input_item_id: 'pickaxe', input_name: 'Pickaxe', input_quantity: 1, input_type: 'tool' },

  // Stone Pickaxe: 20 Coins + 5 Stone
  { recipe_id: 'recipe_stone_pickaxe', input_item_id: 'coins', input_name: 'Coins', input_quantity: 20, input_type: 'coin' },
  { recipe_id: 'recipe_stone_pickaxe', input_item_id: 'stone', input_name: 'Stone', input_quantity: 5, input_type: 'resource' },

  // Iron: 1 Stone Pickaxe -> 1 Iron
  { recipe_id: 'recipe_iron', input_item_id: 'stonePickaxe', input_name: 'Stone Pickaxe', input_quantity: 1, input_type: 'tool' },

  // Iron Pickaxe: 80 Coins + 5 Iron
  { recipe_id: 'recipe_iron_pickaxe', input_item_id: 'coins', input_name: 'Coins', input_quantity: 80, input_type: 'coin' },
  { recipe_id: 'recipe_iron_pickaxe', input_item_id: 'iron', input_name: 'Iron', input_quantity: 5, input_type: 'resource' },

  // Gold: 1 Iron Pickaxe -> 1 Gold
  { recipe_id: 'recipe_gold', input_item_id: 'ironPickaxe', input_name: 'Iron Pickaxe', input_quantity: 1, input_type: 'tool' },

  // Gold Pickaxe: 100 Coins + 3 Gold
  { recipe_id: 'recipe_gold_pickaxe', input_item_id: 'coins', input_name: 'Coins', input_quantity: 100, input_type: 'coin' },
  { recipe_id: 'recipe_gold_pickaxe', input_item_id: 'gold', input_name: 'Gold', input_quantity: 3, input_type: 'resource' },

  // Crimstone: 1 Gold Pickaxe -> 1 Crimstone
  { recipe_id: 'recipe_crimstone', input_item_id: 'goldPickaxe', input_name: 'Gold Pickaxe', input_quantity: 1, input_type: 'tool' },

  // --- OFFICIAL SFL COOKING RECIPE INPUTS (consumables.ts · Zero Cooking Time Fees) ---
  { recipe_id: 'recipe_mashed_potato', input_item_id: 'potato', input_name: 'Potato', input_quantity: 8, input_type: 'crop' },
  { recipe_id: 'recipe_pumpkin_soup', input_item_id: 'pumpkin', input_name: 'Pumpkin', input_quantity: 10, input_type: 'crop' },
  { recipe_id: 'recipe_cheese', input_item_id: 'milk', input_name: 'Milk', input_quantity: 3, input_type: 'animal_product' },
  { recipe_id: 'recipe_cauliflower_burger', input_item_id: 'cauliflower', input_name: 'Cauliflower', input_quantity: 15, input_type: 'crop' },
  { recipe_id: 'recipe_cauliflower_burger', input_item_id: 'wheat', input_name: 'Wheat', input_quantity: 5, input_type: 'crop' },
  { recipe_id: 'recipe_blue_cheese', input_item_id: 'cheese', input_name: 'Cheese', input_quantity: 2, input_type: 'animal_product' },
  { recipe_id: 'recipe_blue_cheese', input_item_id: 'blueberry', input_name: 'Blueberry', input_quantity: 10, input_type: 'crop' },
  { recipe_id: 'recipe_sunflower_cake', input_item_id: 'sunflower', input_name: 'Sunflower', input_quantity: 1000, input_type: 'crop' },
  { recipe_id: 'recipe_sunflower_cake', input_item_id: 'wheat', input_name: 'Wheat', input_quantity: 10, input_type: 'crop' },
  { recipe_id: 'recipe_sunflower_cake', input_item_id: 'egg', input_name: 'Egg', input_quantity: 30, input_type: 'animal_product' },
  { recipe_id: 'recipe_chowder', input_item_id: 'beetroot', input_name: 'Beetroot', input_quantity: 10, input_type: 'crop' },
  { recipe_id: 'recipe_chowder', input_item_id: 'wheat', input_name: 'Wheat', input_quantity: 10, input_type: 'crop' },
  { recipe_id: 'recipe_chowder', input_item_id: 'parsnip', input_name: 'Parsnip', input_quantity: 5, input_type: 'crop' },
  { recipe_id: 'recipe_chowder', input_item_id: 'anchovy', input_name: 'Anchovy', input_quantity: 3, input_type: 'animal_product' },
  { recipe_id: 'recipe_honey_cheddar', input_item_id: 'cheese', input_name: 'Cheese', input_quantity: 3, input_type: 'animal_product' },
  { recipe_id: 'recipe_honey_cheddar', input_item_id: 'honey', input_name: 'Honey', input_quantity: 5, input_type: 'animal_product' },
  { recipe_id: 'recipe_fermented_carrots', input_item_id: 'carrot', input_name: 'Carrot', input_quantity: 20, input_type: 'crop' },
];

/**
 * Extracts verified Bumpkin skills from the live Sunflower Land API (`farm.bumpkinSkills`)
 * and maps them to concrete `farm_skill_modifiers` records using official `bumpkinSkills.ts` mechanics.
 */
export function extractFarmSkillModifiers(farm: FarmState): FarmSkillModifierRow[] {
  const rawSkills = farm.bumpkinSkills || {};
  const skillKeys = Object.keys(rawSkills);

  // Official Sunflower Land `bumpkinSkills.ts` skill detection
  const hasAxeDiscountSkillInApi = skillKeys.some((k) =>
    ["feller's discount", 'logger', 'lumberjack', 'frugal logger', 'woodworker', 'tree hugger', 'tough tree'].includes(
      k.toLowerCase()
    )
  );

  const hasCookingSpeedSkillInApi = skillKeys.some((k) =>
    ['fast feasts', 'rush hour', 'kitchen hand', 'curd curer', 'swift sizzle', 'frosted', 'juicy boost'].includes(
      k.toLowerCase()
    )
  );

  const hasXpBoostSkillInApi = skillKeys.some((k) =>
    ['munching mastery', 'drive-through deli', 'michelin stars', 'master chef', 'golden spatula'].includes(
      k.toLowerCase()
    )
  );

  const hasMiningSkillInApi = skillKeys.some((k) =>
    ["rock'n'roll", 'iron bumpkin', 'prospector', 'rock golem', 'gold rush', 'coal face'].includes(
      k.toLowerCase()
    )
  );

  const munchingRank = Number(rawSkills['Munching Mastery'] || 2);
  const deliDriveThroughRank = Number(rawSkills['Drive-Through Deli'] || 1);
  const lumberjackExtraRank = Number(rawSkills["Lumberjack's Extra"] || 2);

  const modifiers: FarmSkillModifierRow[] = [
    {
      skill_name: "Feller's Discount (Axe Crafting Coin Discount)",
      description: 'Official SFL Skill: Reduces Axe crafting cost by 20% (from 20 Coins to 16 Coins), cascading savings across Wood, Stone, Iron, Gold, and Crimstone.',
      target_recipe_id: 'recipe_axe',
      target_item_id: 'axe',
      modifier_type: 'coin_discount',
      modifier_value: 0.8, // 20 * 0.8 = 16 Coins
      is_active_on_farm: hasAxeDiscountSkillInApi || (farm.bumpkinLevel || 51) >= 10,
      detected_from_api: hasAxeDiscountSkillInApi,
    },
    {
      skill_name: 'Fast Feasts (Fire Pit & Kitchen Speed)',
      description: 'Official SFL Skill: Reduces Fire Pit & Kitchen cooking duration by 10% (zero FLOWER cooking time fee).',
      modifier_type: 'duration_reduction',
      modifier_value: 0.9,
      is_active_on_farm: hasCookingSpeedSkillInApi || (farm.bumpkinLevel || 51) >= 20,
      detected_from_api: hasCookingSpeedSkillInApi,
    },
    {
      skill_name: `Munching Mastery (Rank ${munchingRank})`,
      description: `Official SFL Skill: Increases Bumpkin XP gained from consuming all cooked foods by +${munchingRank >= 2 ? '7.5%' : '5%'}.`,
      modifier_type: 'xp_bonus',
      modifier_value: munchingRank >= 2 ? 1.075 : 1.05,
      is_active_on_farm: hasXpBoostSkillInApi || (farm.bumpkinLevel || 51) >= 30,
      detected_from_api: Boolean(rawSkills['Munching Mastery']),
    },
    {
      skill_name: `Drive-Through Deli (Rank ${deliDriveThroughRank})`,
      description: 'Official SFL Skill: Increases Bumpkin XP gained from consuming Deli foods (Fermented Carrots, Blueberry Jam, Cheese, Blue Cheese, Honey Cheddar) by +15%.',
      modifier_type: 'xp_bonus',
      modifier_value: 1.15,
      is_active_on_farm: Boolean(rawSkills['Drive-Through Deli']) || (farm.bumpkinLevel || 51) >= 25,
      detected_from_api: Boolean(rawSkills['Drive-Through Deli']),
    },
    {
      skill_name: `Lumberjack's Extra (Rank ${lumberjackExtraRank}) & Rock'N'Roll / Iron Bumpkin`,
      description: `Official SFL Skills: +${lumberjackExtraRank >= 2 ? '0.15' : '0.10'} Wood yield per tree, +0.10 Stone per stone rock, and +0.10 Iron per iron rock.`,
      modifier_type: 'yield_bonus',
      modifier_value: 1.15,
      is_active_on_farm: hasMiningSkillInApi || (farm.bumpkinLevel || 51) >= 25,
      detected_from_api: hasMiningSkillInApi,
    },
  ];

  // Also append any additional raw skills returned directly from the farm's API payload
  skillKeys.forEach((rawSkillName) => {
    const alreadyMapped = modifiers.some((m) =>
      m.skill_name.toLowerCase().includes(rawSkillName.toLowerCase())
    );
    if (!alreadyMapped) {
      const rank = rawSkills[rawSkillName];
      modifiers.push({
        skill_name: `${rawSkillName}${rank && rank > 1 ? ` (Rank ${rank})` : ''}`,
        description: `Verified Bumpkin skill active on Farm #${farm.farmId} (pulled live from Sunflower Land API).`,
        modifier_type: 'yield_bonus',
        modifier_value: Number(rank || 1),
        is_active_on_farm: true,
        detected_from_api: true,
      });
    }
  });

  return modifiers;
}

/**
 * Recursively traverses `PRODUCTION_RECIPES_TABLE` and `PRODUCTION_RECIPE_INPUTS_TABLE`
 * to compute the exact cumulative Coin & FLOWER cost of any resource or tool.
 *
 * @param targetItemId  e.g. 'wood' | 'stone' | 'iron' | 'gold' | 'crimstone' | 'axe' | 'pickaxe' | ...
 * @param options.applyAxeSkillDiscount  Whether the 16-Coin Axe skill discount is active (vs. 20 Coins)
 * @param options.woodYieldPerAxe        Y_wood: Wood units obtained per 1 Axe (1 for 1:1 unit benchmark, or e.g. 3 for multi-yield amortization)
 */
export function calculateRecursiveResourceCost(
  targetItemId: string,
  options: {
    applyAxeSkillDiscount?: boolean;
    woodYieldPerAxe?: number;
    quantityRequired?: number;
    commodities?: Record<string, any>;
  } = {}
): RecursiveCostNode | null {
  const {
    applyAxeSkillDiscount = true,
    woodYieldPerAxe = 1,
    quantityRequired = 1,
    commodities,
  } = options;

  const recipe = Object.values(PRODUCTION_RECIPES_TABLE).find(
    (r) => r.output_item_id === targetItemId
  );
  if (!recipe) return null;

  const inputs = PRODUCTION_RECIPE_INPUTS_TABLE.filter(
    (inp) => inp.recipe_id === recipe.recipe_id
  );

  // Determine effective output yield per craft/extraction
  const effectiveOutputQty =
    targetItemId === 'wood' ? Math.max(1, woodYieldPerAxe) : recipe.output_quantity;

  let directCoinsBase = 0;
  let inheritedWithDiscount = 0;
  let inheritedWithoutDiscount = 0;
  const children: RecursiveCostNode[] = [];

  inputs.forEach((inp) => {
    if (inp.input_type === 'coin' || inp.input_item_id === 'coins') {
      directCoinsBase += inp.input_quantity;
    } else {
      const childNode = calculateRecursiveResourceCost(inp.input_item_id, {
        applyAxeSkillDiscount,
        woodYieldPerAxe,
        quantityRequired: inp.input_quantity,
        commodities,
      });
      if (childNode) {
        children.push(childNode);
        inheritedWithDiscount += childNode.unitCostCoinsWithDiscount * inp.input_quantity;
        inheritedWithoutDiscount += childNode.unitCostCoinsWithoutDiscount * inp.input_quantity;
      }
    }
  });

  // Apply Axe skill discount (20 Coins -> 16 Coins) at the root Axe recipe
  const directCoinsWithDiscount =
    targetItemId === 'axe' ? Number((directCoinsBase * 0.8).toFixed(2)) : directCoinsBase;
  const directCoinsWithoutDiscount = directCoinsBase;

  const craftCostWithDiscount = directCoinsWithDiscount + inheritedWithDiscount;
  const craftCostWithoutDiscount = directCoinsWithoutDiscount + inheritedWithoutDiscount;

  const unitCostCoinsWithDiscount = Number(
    (craftCostWithDiscount / effectiveOutputQty).toFixed(2)
  );
  const unitCostCoinsWithoutDiscount = Number(
    (craftCostWithoutDiscount / effectiveOutputQty).toFixed(2)
  );

  // If the caller toggled `applyAxeSkillDiscount = false`, the active unit cost is `unitCostCoinsWithoutDiscount`
  const totalRequiredCostCoinsWithDiscount = Number(
    (unitCostCoinsWithDiscount * quantityRequired).toFixed(2)
  );
  const totalRequiredCostCoinsWithoutDiscount = Number(
    (unitCostCoinsWithoutDiscount * quantityRequired).toFixed(2)
  );

  const skillDiscountSavingsCoins = Number(
    (unitCostCoinsWithoutDiscount - unitCostCoinsWithDiscount).toFixed(2)
  );
  const skillDiscountSavingsPercent =
    unitCostCoinsWithoutDiscount > 0
      ? Number(((skillDiscountSavingsCoins / unitCostCoinsWithoutDiscount) * 100).toFixed(1))
      : 0;

  const unitCostFlowerWithDiscount = Number(
    (unitCostCoinsWithDiscount / COINS_PER_FLOWER_RATE).toFixed(4)
  );
  const unitCostFlowerWithoutDiscount = Number(
    (unitCostCoinsWithoutDiscount / COINS_PER_FLOWER_RATE).toFixed(4)
  );

  // Market Selling Price in FLOWER (Strictly null if untradable)
  let marketSellingPriceFlower: number | null = null;
  let marketArbitrageProfitFlower: number | null = null;
  if (recipe.is_tradeable_output) {
    const comm = commodities?.[targetItemId];
    const liveFloor = comm?.floorFlower ?? comm?.latestSaleFlower;
    marketSellingPriceFlower = Number(
      (liveFloor && liveFloor > 0 ? liveFloor : SFL_ITEMS[targetItemId]?.marketPriceSFL || 0.05).toFixed(4)
    );
    const activeUnitFlowerCost = applyAxeSkillDiscount
      ? unitCostFlowerWithDiscount
      : unitCostFlowerWithoutDiscount;
    marketArbitrageProfitFlower = Number(
      (marketSellingPriceFlower - activeUnitFlowerCost).toFixed(4)
    );
  }

  // Build explicit mathematical formulas matching the user's specification
  let formulaSymbol = `C_${targetItemId}`;
  let formulaSymbolic = '';
  let formulaEvaluatedWithDiscount = '';
  let formulaEvaluatedWithoutDiscount = '';

  if (targetItemId === 'axe') {
    formulaSymbolic = 'C_axe = BaseCoins × SkillMultiplier';
    formulaEvaluatedWithDiscount = '20 × 0.80 = 16 Coins';
    formulaEvaluatedWithoutDiscount = '20 × 1.00 = 20 Coins';
  } else if (targetItemId === 'wood') {
    formulaSymbolic = 'C_wood = C_axe / Y_wood';
    formulaEvaluatedWithDiscount = `16 / ${effectiveOutputQty} = ${unitCostCoinsWithDiscount} Coins`;
    formulaEvaluatedWithoutDiscount = `20 / ${effectiveOutputQty} = ${unitCostCoinsWithoutDiscount} Coins`;
  } else if (targetItemId === 'stone' || targetItemId === 'pickaxe') {
    const wChild = children[0]?.children?.[0] || children[0];
    const wWith = wChild?.unitCostCoinsWithDiscount ?? Number((16 / effectiveOutputQty).toFixed(2));
    const wWithout = wChild?.unitCostCoinsWithoutDiscount ?? Number((20 / effectiveOutputQty).toFixed(2));
    formulaSymbolic = 'C_stone = 20 + 3(C_wood)';
    formulaEvaluatedWithDiscount = `20 + (3 × ${wWith}) = ${unitCostCoinsWithDiscount} Coins`;
    formulaEvaluatedWithoutDiscount = `20 + (3 × ${wWithout}) = ${unitCostCoinsWithoutDiscount} Coins`;
  } else if (targetItemId === 'iron' || targetItemId === 'stonePickaxe') {
    const sWith = Number((20 + 3 * (16 / effectiveOutputQty)).toFixed(2));
    const sWithout = Number((20 + 3 * (20 / effectiveOutputQty)).toFixed(2));
    formulaSymbolic = 'C_iron = 20 + 5(C_stone)';
    formulaEvaluatedWithDiscount = `20 + (5 × ${sWith}) = ${unitCostCoinsWithDiscount} Coins`;
    formulaEvaluatedWithoutDiscount = `20 + (5 × ${sWithout}) = ${unitCostCoinsWithoutDiscount} Coins`;
  } else if (targetItemId === 'gold' || targetItemId === 'ironPickaxe') {
    const iWith = Number((20 + 5 * (20 + 3 * (16 / effectiveOutputQty))).toFixed(2));
    const iWithout = Number((20 + 5 * (20 + 3 * (20 / effectiveOutputQty))).toFixed(2));
    formulaSymbolic = 'C_gold = 80 + 5(C_iron)';
    formulaEvaluatedWithDiscount = `80 + (5 × ${iWith}) = ${unitCostCoinsWithDiscount.toLocaleString()} Coins`;
    formulaEvaluatedWithoutDiscount = `80 + (5 × ${iWithout}) = ${unitCostCoinsWithoutDiscount.toLocaleString()} Coins`;
  } else if (targetItemId === 'crimstone' || targetItemId === 'goldPickaxe') {
    const gWith = Number((80 + 5 * (20 + 5 * (20 + 3 * (16 / effectiveOutputQty)))).toFixed(2));
    const gWithout = Number((80 + 5 * (20 + 5 * (20 + 3 * (20 / effectiveOutputQty)))).toFixed(2));
    formulaSymbolic = 'C_crimstone = 100 + 3(C_gold)';
    formulaEvaluatedWithDiscount = `100 + (3 × ${gWith.toLocaleString()}) = ${unitCostCoinsWithDiscount.toLocaleString()} Coins`;
    formulaEvaluatedWithoutDiscount = `100 + (3 × ${gWithout.toLocaleString()}) = ${unitCostCoinsWithoutDiscount.toLocaleString()} Coins`;
  }

  return {
    itemId: targetItemId,
    itemName: recipe.output_name,
    icon: recipe.output_icon,
    recipeId: recipe.recipe_id,
    quantityRequired,
    outputQuantityPerCraft: effectiveOutputQty,
    requiredBuilding: recipe.required_building,
    isInstant: recipe.is_instant,
    productionDurationMinutes: recipe.production_duration,
    nodeRechargeMinutes: recipe.node_recharge_minutes || 0,
    isTradeableOutput: recipe.is_tradeable_output,
    outputType: recipe.output_type,
    economicCategory: recipe.economic_category,
    economicUtility: recipe.economic_utility,
    xpReward: recipe.xp_reward,
    directCoinsPerCraft: applyAxeSkillDiscount ? directCoinsWithDiscount : directCoinsWithoutDiscount,
    inheritedResourceCoinsWithDiscount: Number(inheritedWithDiscount.toFixed(2)),
    inheritedResourceCoinsWithoutDiscount: Number(inheritedWithoutDiscount.toFixed(2)),
    unitCostCoinsWithDiscount,
    unitCostCoinsWithoutDiscount,
    totalRequiredCostCoinsWithDiscount,
    totalRequiredCostCoinsWithoutDiscount,
    skillDiscountSavingsCoins,
    skillDiscountSavingsPercent,
    unitCostFlowerWithDiscount,
    unitCostFlowerWithoutDiscount,
    marketSellingPriceFlower,
    marketArbitrageProfitFlower,
    formulaSymbol,
    formulaSymbolic,
    formulaEvaluatedWithDiscount,
    formulaEvaluatedWithoutDiscount,
    children,
  };
}

/**
 * Generates the complete 5-tier Recursive Resource Acquisition Cost Table
 * (Wood -> Stone -> Iron -> Gold -> Crimstone) dynamically via the RRCE.
 */
export function getCompleteRecursiveResourceTable(options: {
  applyAxeSkillDiscount?: boolean;
  woodYieldPerAxe?: number;
  commodities?: Record<string, any>;
} = {}): RecursiveChainSummaryRow[] {
  const { applyAxeSkillDiscount = true, woodYieldPerAxe = 1, commodities } = options;

  const chainConfigs = [
    {
      itemId: 'wood',
      toolUsed: 'Axe',
      toolIcon: '🪓',
      recipeDescription: '1 Axe (16 Coins w/ skill, 20 Coins normal)',
      rechargeFormatted: 'Instant chop · 2h tree recharge',
      cumulativeAxes: Number((1 / Math.max(1, woodYieldPerAxe)).toFixed(2)),
    },
    {
      itemId: 'stone',
      toolUsed: 'Pickaxe',
      toolIcon: '⛏️',
      recipeDescription: '20 Coins + 3 Wood',
      rechargeFormatted: 'Instant mine · 4h stone recharge',
      cumulativeAxes: Number((3 / Math.max(1, woodYieldPerAxe)).toFixed(2)),
    },
    {
      itemId: 'iron',
      toolUsed: 'Stone Pickaxe',
      toolIcon: '🔨',
      recipeDescription: '20 Coins + 5 Stone',
      rechargeFormatted: 'Instant mine · 8h iron recharge',
      cumulativeAxes: Number((15 / Math.max(1, woodYieldPerAxe)).toFixed(2)),
    },
    {
      itemId: 'gold',
      toolUsed: 'Iron Pickaxe',
      toolIcon: '⚒️',
      recipeDescription: '80 Coins + 5 Iron',
      rechargeFormatted: 'Instant mine · 24h gold recharge',
      cumulativeAxes: Number((75 / Math.max(1, woodYieldPerAxe)).toFixed(2)),
    },
    {
      itemId: 'crimstone',
      toolUsed: 'Gold Pickaxe',
      toolIcon: '🔱',
      recipeDescription: '100 Coins + 3 Gold',
      rechargeFormatted: 'Instant mine · 48h crystal recharge',
      cumulativeAxes: Number((225 / Math.max(1, woodYieldPerAxe)).toFixed(2)),
    },
  ];

  return chainConfigs
    .map((cfg) => {
      const node = calculateRecursiveResourceCost(cfg.itemId, {
        applyAxeSkillDiscount,
        woodYieldPerAxe,
        commodities,
      });
      if (!node) return null;
      return {
        itemId: node.itemId,
        name: node.itemName,
        icon: node.icon,
        toolUsed: cfg.toolUsed,
        toolIcon: cfg.toolIcon,
        recipeDescription: cfg.recipeDescription,
        formulaSymbolic: node.formulaSymbolic,
        formulaWithDiscount: node.formulaEvaluatedWithDiscount,
        formulaWithoutDiscount: node.formulaEvaluatedWithoutDiscount,
        costCoinsWithDiscount: node.unitCostCoinsWithDiscount,
        costCoinsWithoutDiscount: node.unitCostCoinsWithoutDiscount,
        savingsCoins: node.skillDiscountSavingsCoins,
        savingsPercent: node.skillDiscountSavingsPercent,
        costFlowerWithDiscount: node.unitCostFlowerWithDiscount,
        marketPriceFlower: node.marketSellingPriceFlower,
        isTradeable: node.isTradeableOutput,
        economicCategory: node.economicCategory,
        economicUtility: node.economicUtility,
        nodeRechargeFormatted: cfg.rechargeFormatted,
        cumulativeAxesRequired: cfg.cumulativeAxes,
      };
    })
    .filter((r): r is RecursiveChainSummaryRow => r !== null);
}

/**
 * ============================================================================
 * 4. Time Opportunity Cost Engine (Active vs. Elapsed Time & Configurable R)
 * ============================================================================
 * A. Separates active player interaction time from elapsed production time:
 *    - Instant:    No waiting time (Axe, Pickaxe, and tool strikes -> C_time = 0)
 *    - Active:     Requires player interaction (hands-on clicks/queuing)
 *    - Processing: Building is occupied while processing (e.g. Cheese 2h in Deli)
 *    - Passive:    Time passes without continuous interaction (e.g. Crops/Flowers)
 *    - Cooldown:   A facility or resource node must recover (e.g. Tree/Stone node)
 *
 * B. Configurable Time Valuation Formula:
 *    C_time = T * R
 *    Where:
 *      - T = production duration in hours (0 for Instant actions)
 *      - R = user's chosen value of one production hour in FLOWER
 *
 * C. Three Time-Cost Settings:
 *    - 'zero':              Zero time valuation (only material costs counted)
 *    - 'facility_capacity': Production capacity valuation (values occupied facility hours)
 *    - 'custom_hourly':     Custom hourly valuation (user chooses R in FLOWER/hr)
 */

export const TIME_TYPE_DEFINITIONS: {
  type: ProductionTimeType;
  meaning: string;
  example: string;
  defaultTimeCostTreatment: string;
  badgeColor: string;
}[] = [
  {
    type: 'Instant',
    meaning: 'No waiting time',
    example: 'Axe, Pickaxe, Gold Pickaxe crafting & immediate node strikes',
    defaultTimeCostTreatment: 'Zero (0.0000 FLOWER) — genuinely instantaneous actions incur no time cost',
    badgeColor: 'emerald',
  },
  {
    type: 'Active',
    meaning: 'Requires player interaction',
    example: 'Hands-on queuing, harvesting & order fulfillment clicks (2–6 min)',
    defaultTimeCostTreatment: 'Tracked separately as active player interaction time',
    badgeColor: 'amber',
  },
  {
    type: 'Processing',
    meaning: 'Building is occupied while processing (Zero FLOWER cooking time fee in SFL)',
    example: 'Cheese (20m Deli), Pumpkin Soup (3m Fire Pit), Cauliflower Burger (3h Kitchen), Sunflower Cake (6h 30m Bakery)',
    defaultTimeCostTreatment: 'Zero cooking fee in SFL (0.0000 FLOWER); optional user planning rate C_time = T_processing × R',
    badgeColor: 'sky',
  },
  {
    type: 'Passive',
    meaning: 'Time passes without continuous interaction',
    example: 'Greenhouse Royal Bouquet blossoms & multi-plot field crops',
    defaultTimeCostTreatment: 'Parallel passive growth; zero fee in SFL or optional custom hourly rate',
    badgeColor: 'purple',
  },
  {
    type: 'Cooldown',
    meaning: 'A facility or resource must recover',
    example: 'Forest Tree (2h), Stone (4h), Iron (8h), Gold (24h), Crimstone (48h)',
    defaultTimeCostTreatment: 'Node regeneration window (does not block farmer or building queue)',
    badgeColor: 'rose',
  },
];

export const TIME_VALUATION_SETTINGS: {
  id: TimeValuationMode;
  label: string;
  shortLabel: string;
  description: string;
  formulaNote: string;
}[] = [
  {
    id: 'zero',
    label: 'Zero Time Valuation (SFL Default)',
    shortLabel: 'Zero Cooking Fee (0.0000)',
    description: 'Official SFL Mechanics: Cooking & crafting charge zero FLOWER fees for time (C_time = 0.0000 FLOWER). Only verified ingredient costs are incurred.',
    formulaNote: 'C_total = C_inputs (0.0000 Fee)',
  },
  {
    id: 'facility_capacity',
    label: 'Production Capacity Valuation',
    shortLabel: 'Facility Capacity',
    description:
      'Optional shadow valuation for occupied production facilities (Deli, Kitchen, Bakery). Official SFL cooking fee remains 0.0000 FLOWER.',
    formulaNote: 'C_time = T_facility × R_capacity',
  },
  {
    id: 'custom_hourly',
    label: 'Custom Hourly Valuation',
    shortLabel: 'Custom Hourly (T × R)',
    description:
      'Let the farmer choose an optional shadow planning value R of one production hour in FLOWER (C_time = T × R).',
    formulaNote: 'C_time = T × R',
  },
];

export interface TimeCostEvaluationResult {
  mode: TimeValuationMode;
  durationHours: number;                  // T (in hours)
  hourlyRateFlower: number;               // R (in FLOWER/hr)
  timeOpportunityCostFlower: number;      // C_time = T * R
  ingredientCostFlower: number;           // C_inputs (e.g. 3 * 0.1220 = 0.3660 FLOWER for Cheese)
  combinedMaterialAndTimeCostFlower: number; // C_inputs + C_time
  fullEconomicCostFlower: number;         // C_inputs + C_time + C_production + C_tx
  formulaSymbolic: string;
  formulaEvaluated: string;
  combinedFormulaEvaluated: string;
  isInstantZeroCost: boolean;
}

export function calculateTimeOpportunityCost(params: {
  timeProfile?: ProductionTimeProfile;
  ingredientCostFlower: number;
  productionFeeFlower?: number;
  marketFeeFlower?: number;
  mode: TimeValuationMode;
  customHourlyRateFlower: number;
  batchMultiplier?: number;
}): TimeCostEvaluationResult {
  const {
    timeProfile,
    ingredientCostFlower,
    productionFeeFlower = 0,
    marketFeeFlower = 0,
    mode,
    customHourlyRateFlower,
    batchMultiplier = 1,
  } = params;

  const isInstant = timeProfile?.isInstant || timeProfile?.primaryTimeType === 'Instant';
  const rawHours = isInstant ? 0 : (timeProfile?.billableFacilityHours ?? 0) * batchMultiplier;
  const durationHours = Number(rawHours.toFixed(2));

  let effectiveRate = 0;
  if (isInstant || mode === 'zero') {
    effectiveRate = 0;
  } else if (mode === 'facility_capacity') {
    effectiveRate = timeProfile?.facilityCapacityRateFlowerPerHr ?? 0;
  } else {
    // custom_hourly
    effectiveRate = Math.max(0, customHourlyRateFlower);
  }

  const timeOpportunityCostFlower = Number((durationHours * effectiveRate).toFixed(4));
  const scaledIngredientCost = Number(ingredientCostFlower.toFixed(4));
  const combinedMaterialAndTimeCostFlower = Number(
    (scaledIngredientCost + timeOpportunityCostFlower).toFixed(4)
  );
  const fullEconomicCostFlower = Number(
    (
      scaledIngredientCost +
      timeOpportunityCostFlower +
      productionFeeFlower +
      marketFeeFlower
    ).toFixed(4)
  );

  const formulaSymbolic = isInstant
    ? 'C_time = 0 × R (Instant operation — zero waiting time)'
    : 'C_time = T × R';

  const formulaEvaluated = isInstant
    ? '0.00 hr × ' + effectiveRate.toFixed(2) + ' = 0.0000 FLOWER'
    : `${durationHours.toFixed(2)} hr × ${effectiveRate.toFixed(2)} FLOWER/hr = ${timeOpportunityCostFlower.toFixed(4)} FLOWER`;

  const combinedFormulaEvaluated = `${scaledIngredientCost.toFixed(4)} + ${timeOpportunityCostFlower.toFixed(4)} = ${combinedMaterialAndTimeCostFlower.toFixed(4)} FLOWER`;

  return {
    mode,
    durationHours,
    hourlyRateFlower: effectiveRate,
    timeOpportunityCostFlower,
    ingredientCostFlower: scaledIngredientCost,
    combinedMaterialAndTimeCostFlower,
    fullEconomicCostFlower,
    formulaSymbolic,
    formulaEvaluated,
    combinedFormulaEvaluated,
    isInstantZeroCost: Boolean(isInstant),
  };
}



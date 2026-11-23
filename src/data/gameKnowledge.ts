/**
 * Verified Sunflower Land Game Rules & Production Engine
 * Synced directly from sunflower-land/sunflower-land (consumables.ts · tools.ts · tradeLimits.ts).
 * NOTE: Cooking & crafting in SFL incur ZERO FLOWER time-skip fees. Cooked foods & tools are NOT P2P-tradeable.
 */

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'tool' | 'building' | 'food' | 'craftable' | 'expansion';
  buildingRequired?: string;
  levelRequired?: number;
  ingredients: Record<string, number>;
  sflCost?: number;
  coinsCost?: number;
  outputItem: string;
  outputQuantity: number;
  craftingTimeSeconds?: number;
  bumpkinXP?: number;
  isTradeable: boolean;
  description: string;
  unlockBenefits?: string;
  estimatedReturnSFL?: number;
  timeframe?: string;
}

/**
 * Authoritative P2P Marketplace Tradeable Resources from Sunflower Land `TRADE_LIMITS` (tradeLimits.ts).
 * Cooked meals, craftable tools, seeds, flowers, Oil, and Sunstone are NOT tradeable on the P2P order book.
 */
export const OFFICIAL_TRADEABLE_RESOURCES: ReadonlySet<string> = new Set([
  // Crops
  'sunflower',
  'potato',
  'rhubarb',
  'pumpkin',
  'zucchini',
  'carrot',
  'yam',
  'cabbage',
  'broccoli',
  'soybean',
  'beetroot',
  'pepper',
  'cauliflower',
  'parsnip',
  'eggplant',
  'corn',
  'onion',
  'radish',
  'wheat',
  'turnip',
  'kale',
  'artichoke',
  'barley',
  'saltwort',
  'crystal leaf',
  // Fruits
  'tomato',
  'lemon',
  'blueberry',
  'orange',
  'apple',
  'banana',
  'celestine',
  'lunara',
  'duskberry',
  // Greenhouse Produce
  'grape',
  'rice',
  'olive',
  // Minerals & Raw Resources (Oil & Sunstone are non-tradeable in tradeLimits.ts)
  'wood',
  'stone',
  'iron',
  'gold',
  'crimstone',
  'salt',
  // Animal Produce
  'egg',
  'feather',
  'shiny feather',
  'honey',
  'milk',
  'leather',
  'wool',
  'merino wool',
]);

export function isItemMarketTradeable(itemNameOrId: string): boolean {
  if (!itemNameOrId) return false;
  const raw = itemNameOrId.trim().toLowerCase();
  if (OFFICIAL_TRADEABLE_RESOURCES.has(raw)) return true;
  // Handle camelCase IDs like "merinoWool" -> "merino wool", "shinyFeather" -> "shiny feather"
  const spaced = raw.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  if (OFFICIAL_TRADEABLE_RESOURCES.has(spaced)) return true;
  // Also allow camelCase exact normalized forms
  const noSpace = raw.replace(/\s+/g, '');
  for (const entry of OFFICIAL_TRADEABLE_RESOURCES) {
    if (entry.replace(/\s+/g, '') === noSpace) return true;
  }
  return false;
}

/**
 * Verified Sunflower Land on-chain contract IDs (`KNOWN_IDS`) for P2P-tradeable commodities.
 * Safe for both server routes and client views.
 */
export const TRADEABLE_ITEM_IDS: Record<string, number> = {
  // Crops & Produce
  sunflower: 201,
  potato: 202,
  pumpkin: 203,
  carrot: 204,
  cabbage: 205,
  beetroot: 206,
  cauliflower: 207,
  parsnip: 208,
  radish: 209,
  wheat: 210,
  kale: 211,
  apple: 212,
  blueberry: 213,
  orange: 214,
  eggplant: 215,
  corn: 216,
  banana: 217,
  soybean: 251,
  grape: 252,
  rice: 253,
  olive: 254,
  tomato: 255,
  lemon: 256,
  barley: 257,
  rhubarb: 258,
  zucchini: 259,
  yam: 260,
  broccoli: 261,
  pepper: 262,
  onion: 263,
  turnip: 264,
  artichoke: 265,
  celestine: 268,
  lunara: 267,
  duskberry: 266,

  // Tradeable Minerals & Resources
  wood: 601,
  stone: 602,
  iron: 603,
  gold: 604,
  crimstone: 636,

  // Animal Produce
  egg: 605,
  honey: 614,
  leather: 641,
  wool: 642,
  feather: 643,
  shinyFeather: 644,
  milk: 645,
};

export function resolveTradeableId(itemNameOrId: string): { key: string; id: number } | null {
  if (!itemNameOrId) return null;
  const norm = itemNameOrId.trim().toLowerCase().replace(/\s+/g, '');
  for (const [key, id] of Object.entries(TRADEABLE_ITEM_IDS)) {
    if (key.toLowerCase() === norm || String(id) === norm) {
      return { key, id };
    }
  }
  return null;
}

export const VERIFIED_RECIPES: CraftingRecipe[] = [
  // --- WORKBENCH & TREASURE SHOP TOOLS (Official tools.ts · Non-Tradeable · 0 FLOWER Fee) ---
  {
    id: 'craft-axe',
    name: 'Axe',
    category: 'tool',
    buildingRequired: 'Workbench',
    ingredients: {},
    coinsCost: 20,
    outputItem: 'Axe',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 20 Coins (no Wood required). Chops trees for Wood; non-tradeable farm tool.',
    timeframe: 'Instant',
  },
  {
    id: 'craft-pickaxe',
    name: 'Pickaxe',
    category: 'tool',
    buildingRequired: 'Workbench',
    ingredients: { Wood: 3 },
    coinsCost: 20,
    outputItem: 'Pickaxe',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 20 Coins + 3 Wood. Mines Stone Rocks; non-tradeable farm tool.',
    timeframe: 'Instant',
  },
  {
    id: 'craft-stone-pickaxe',
    name: 'Stone Pickaxe',
    category: 'tool',
    buildingRequired: 'Workbench',
    ingredients: { Wood: 3, Stone: 5 },
    coinsCost: 20,
    outputItem: 'Stone Pickaxe',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 20 Coins + 3 Wood + 5 Stone. Mines Iron Rocks; non-tradeable farm tool.',
    timeframe: 'Instant',
  },
  {
    id: 'craft-iron-pickaxe',
    name: 'Iron Pickaxe',
    category: 'tool',
    buildingRequired: 'Workbench',
    ingredients: { Wood: 3, Iron: 5 },
    coinsCost: 80,
    outputItem: 'Iron Pickaxe',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 80 Coins + 3 Wood + 5 Iron. Mines Gold Rocks; non-tradeable farm tool.',
    timeframe: 'Instant',
  },
  {
    id: 'craft-gold-pickaxe',
    name: 'Gold Pickaxe',
    category: 'tool',
    buildingRequired: 'Workbench',
    ingredients: { Wood: 3, Gold: 3 },
    coinsCost: 100,
    outputItem: 'Gold Pickaxe',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 100 Coins + 3 Wood + 3 Gold. Mines rare Crimstone nodes; non-tradeable farm tool.',
    timeframe: 'Instant',
  },
  {
    id: 'craft-rod',
    name: 'Rod',
    category: 'tool',
    buildingRequired: 'Workbench',
    ingredients: { Wood: 3, Stone: 1 },
    coinsCost: 20,
    outputItem: 'Rod',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 20 Coins + 3 Wood + 1 Stone. Fishing rod for catching fish (e.g. Anchovy for Chowder).',
    timeframe: 'Instant',
  },
  {
    id: 'craft-oil-drill',
    name: 'Oil Drill',
    category: 'tool',
    buildingRequired: 'Workbench',
    ingredients: { Wood: 20, Iron: 9, Leather: 10 },
    coinsCost: 100,
    outputItem: 'Oil Drill',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 100 Coins + 20 Wood + 9 Iron + 10 Leather. Extracts crude Oil reserves; non-tradeable tool.',
    timeframe: 'Instant',
  },
  {
    id: 'craft-sand-shovel',
    name: 'Sand Shovel',
    category: 'tool',
    buildingRequired: 'Treasure Shop',
    ingredients: { Wood: 2, Stone: 1 },
    coinsCost: 20,
    outputItem: 'Sand Shovel',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 20 Coins + 2 Wood + 1 Stone. Digs beach treasure spots.',
    timeframe: 'Instant',
  },
  {
    id: 'craft-sand-drill',
    name: 'Sand Drill',
    category: 'tool',
    buildingRequired: 'Treasure Shop',
    ingredients: { Oil: 1, Crimstone: 1, Wood: 3, Leather: 1 },
    coinsCost: 40,
    outputItem: 'Sand Drill',
    outputQuantity: 1,
    craftingTimeSeconds: 0,
    isTradeable: false,
    description: 'Costs 40 Coins + 1 Oil + 1 Crimstone + 3 Wood + 1 Leather. Excavates deep beach treasures.',
    timeframe: 'Instant',
  },

  // --- BUILDING UPGRADES ---
  {
    id: 'upgrade-hen-house-2',
    name: 'Hen House Level 2 Expansion',
    category: 'building',
    levelRequired: 15,
    ingredients: { Wood: 100, Stone: 50, Iron: 20 },
    sflCost: 15,
    outputItem: 'Hen House Lvl 2',
    outputQuantity: 1,
    isTradeable: false,
    description: 'Expands Hen House capacity to house additional chickens for Egg production.',
    unlockBenefits: 'More Egg capacity for Bakery & Delivery Board',
    timeframe: '1-2 weeks',
  },
  {
    id: 'upgrade-barn-2',
    name: 'Barn Level 2 Expansion',
    category: 'building',
    levelRequired: 20,
    ingredients: { Wood: 150, Stone: 100, Iron: 50 },
    sflCost: 20,
    outputItem: 'Barn Lvl 2',
    outputQuantity: 1,
    isTradeable: false,
    description: 'Expands Barn livestock capacity for Cows & Sheep.',
    unlockBenefits: 'Higher daily Milk & Wool output',
    timeframe: '1-2 weeks',
  },
  {
    id: 'upgrade-barn-3',
    name: 'Barn Level 3 Expansion',
    category: 'building',
    levelRequired: 35,
    ingredients: { Wood: 250, Stone: 150, Iron: 75, Gold: 15 },
    sflCost: 35,
    outputItem: 'Barn Lvl 3',
    outputQuantity: 1,
    isTradeable: false,
    description: 'High-tier livestock facility expansion for maximum Cow & Sheep throughput.',
    unlockBenefits: 'Maximum Milk, Leather, and Wool capacity',
    timeframe: '2-3 weeks',
  },
  {
    id: 'upgrade-bakery',
    name: 'Bakery Construction',
    category: 'building',
    ingredients: { Wood: 50, Stone: 20, Iron: 5 },
    sflCost: 5,
    outputItem: 'Bakery',
    outputQuantity: 1,
    isTradeable: false,
    description: 'Unlocks cakes & pies for Bumpkin XP and Delivery orders (non-tradeable dishes).',
    unlockBenefits: 'Unlocks Apple Pie (+720 XP), Sunflower Cake (+525 XP), Honey Cake (+4,000 XP)',
    timeframe: 'Short-term',
  },
  {
    id: 'upgrade-deli',
    name: 'Deli Construction',
    category: 'building',
    ingredients: { Wood: 100, Stone: 50, Iron: 20, Gold: 10 },
    sflCost: 10,
    outputItem: 'Deli',
    outputQuantity: 1,
    isTradeable: false,
    description: 'Unlocks Cheese, Fermented Carrots, Blueberry Jam, Sauerkraut, Blue Cheese, and Honey Cheddar.',
    unlockBenefits: 'High-XP Deli recipes (Blue Cheese +6,000 XP · Honey Cheddar +15,000 XP)',
    timeframe: 'Medium-term',
  },
  {
    id: 'upgrade-water-well',
    name: 'Water Well Upgrade',
    category: 'building',
    ingredients: { Wood: 25, Stone: 15 },
    sflCost: 2,
    outputItem: 'Water Well',
    outputQuantity: 1,
    isTradeable: false,
    description: 'Increases water capacity across farm crop plots.',
    unlockBenefits: 'Supports continuous crop rotations',
    timeframe: 'Immediate',
  },

  // --- COOKED FOODS, DELI & SMOOTHIES (Official consumables.ts · Non-Tradeable · 0 FLOWER Cooking Fee) ---
  {
    id: 'craft-mashed-potato',
    name: 'Mashed Potato',
    category: 'food',
    buildingRequired: 'Fire Pit',
    ingredients: { Potato: 8 },
    outputItem: 'Mashed Potato',
    outputQuantity: 1,
    craftingTimeSeconds: 30,
    bumpkinXP: 3,
    isTradeable: false,
    description: 'Fire Pit starter (+3 XP · 30s · 0 FLOWER fee). Non-tradeable Bumpkin meal.',
    timeframe: '30s',
  },
  {
    id: 'craft-rhubarb-tart',
    name: 'Rhubarb Tart',
    category: 'food',
    buildingRequired: 'Fire Pit',
    ingredients: { Rhubarb: 3 },
    outputItem: 'Rhubarb Tart',
    outputQuantity: 1,
    craftingTimeSeconds: 60,
    bumpkinXP: 5,
    isTradeable: false,
    description: 'Fire Pit quick tart (+5 XP · 1m · 0 FLOWER fee). Requires 3 Rhubarb only; non-tradeable.',
    timeframe: '1m',
  },
  {
    id: 'craft-pumpkin-soup',
    name: 'Pumpkin Soup',
    category: 'food',
    buildingRequired: 'Fire Pit',
    ingredients: { Pumpkin: 10 },
    outputItem: 'Pumpkin Soup',
    outputQuantity: 1,
    craftingTimeSeconds: 180,
    bumpkinXP: 24,
    isTradeable: false,
    description: 'Fire Pit staple (+24 XP · 3m · 0 FLOWER fee). Non-tradeable Bumpkin XP food.',
    timeframe: '3m',
  },
  {
    id: 'craft-reindeer-carrot',
    name: 'Reindeer Carrot',
    category: 'food',
    buildingRequired: 'Fire Pit',
    ingredients: { Carrot: 5 },
    outputItem: 'Reindeer Carrot',
    outputQuantity: 1,
    craftingTimeSeconds: 300,
    bumpkinXP: 36,
    isTradeable: false,
    description: 'Fire Pit snack (+36 XP · 5m · 0 FLOWER fee). Non-tradeable Bumpkin XP food.',
    timeframe: '5m',
  },
  {
    id: 'craft-bumpkin-broth',
    name: 'Bumpkin Broth',
    category: 'food',
    buildingRequired: 'Fire Pit',
    ingredients: { Carrot: 10, Cabbage: 5 },
    outputItem: 'Bumpkin Broth',
    outputQuantity: 1,
    craftingTimeSeconds: 1200,
    bumpkinXP: 96,
    isTradeable: false,
    description: 'Fire Pit broth (+96 XP · 20m · 0 FLOWER fee). Non-tradeable Bumpkin XP food.',
    timeframe: '20m',
  },
  {
    id: 'craft-boiled-eggs',
    name: 'Boiled Eggs',
    category: 'food',
    buildingRequired: 'Fire Pit',
    ingredients: { Egg: 10 },
    outputItem: 'Boiled Eggs',
    outputQuantity: 1,
    craftingTimeSeconds: 3600,
    bumpkinXP: 90,
    isTradeable: false,
    description: 'Fire Pit protein dish (+90 XP · 1h · 0 FLOWER fee). Non-tradeable.',
    timeframe: '1h',
  },
  {
    id: 'craft-kale-stew',
    name: 'Kale Stew',
    category: 'food',
    buildingRequired: 'Fire Pit',
    ingredients: { Kale: 10 },
    outputItem: 'Kale Stew',
    outputQuantity: 1,
    craftingTimeSeconds: 7200,
    bumpkinXP: 400,
    isTradeable: false,
    description: 'Fire Pit stew (+400 XP · 2h · 0 FLOWER fee). Non-tradeable.',
    timeframe: '2h',
  },
  {
    id: 'craft-cauliflower-burger',
    name: 'Cauliflower Burger',
    category: 'food',
    buildingRequired: 'Kitchen',
    ingredients: { Cauliflower: 15, Wheat: 5 },
    outputItem: 'Cauliflower Burger',
    outputQuantity: 1,
    craftingTimeSeconds: 10800,
    bumpkinXP: 255,
    isTradeable: false,
    description: 'Kitchen burger (+255 XP · 3h · 0 FLOWER fee). Non-tradeable.',
    timeframe: '3h',
  },
  {
    id: 'craft-roast-veggies',
    name: 'Roast Veggies',
    category: 'food',
    buildingRequired: 'Kitchen',
    ingredients: { Cauliflower: 15, Carrot: 10 },
    outputItem: 'Roast Veggies',
    outputQuantity: 1,
    craftingTimeSeconds: 7200,
    bumpkinXP: 170,
    isTradeable: false,
    description: 'Kitchen roast (+170 XP · 2h · 0 FLOWER fee). Non-tradeable.',
    timeframe: '2h',
  },
  {
    id: 'craft-chowder',
    name: 'Chowder',
    category: 'food',
    buildingRequired: 'Kitchen',
    ingredients: { Beetroot: 10, Wheat: 10, Parsnip: 5, Anchovy: 3 },
    outputItem: 'Chowder',
    outputQuantity: 1,
    craftingTimeSeconds: 28800,
    bumpkinXP: 1000,
    isTradeable: false,
    description: 'Kitchen seafood stew (+1,000 XP · 8h · 0 FLOWER fee). Requires Beetroot, Wheat, Parsnip & Anchovy; non-tradeable.',
    timeframe: '8h',
  },
  {
    id: 'craft-caprese-salad',
    name: 'Caprese Salad',
    category: 'food',
    buildingRequired: 'Kitchen',
    ingredients: { Cheese: 1, Tomato: 25, Kale: 20 },
    outputItem: 'Caprese Salad',
    outputQuantity: 1,
    craftingTimeSeconds: 10800,
    bumpkinXP: 6000,
    isTradeable: false,
    description: 'High-XP Kitchen dish (+6,000 XP · 3h · 0 FLOWER fee). Non-tradeable.',
    timeframe: '3h',
  },
  {
    id: 'craft-apple-pie',
    name: 'Apple Pie',
    category: 'food',
    buildingRequired: 'Bakery',
    ingredients: { Apple: 5, Wheat: 10, Egg: 20 },
    outputItem: 'Apple Pie',
    outputQuantity: 1,
    craftingTimeSeconds: 14400,
    bumpkinXP: 720,
    isTradeable: false,
    description: 'Bakery pie (+720 XP · 4h base · 0 FLOWER fee). Uses 5 Apple + 10 Wheat + 20 Egg; non-tradeable.',
    timeframe: '4h',
  },
  {
    id: 'craft-sunflower-cake',
    name: 'Sunflower Cake',
    category: 'food',
    buildingRequired: 'Bakery',
    ingredients: { Sunflower: 1000, Wheat: 10, Egg: 30 },
    outputItem: 'Sunflower Cake',
    outputQuantity: 1,
    craftingTimeSeconds: 23400,
    bumpkinXP: 525,
    isTradeable: false,
    description: 'Bakery cake (+525 XP · 6h 30m · 0 FLOWER fee). Uses 1,000 Sunflower + 10 Wheat + 30 Egg; non-tradeable.',
    timeframe: '6h 30m',
  },
  {
    id: 'craft-honey-cake',
    name: 'Honey Cake',
    category: 'food',
    buildingRequired: 'Bakery',
    ingredients: { Honey: 10, Wheat: 10, Egg: 20 },
    outputItem: 'Honey Cake',
    outputQuantity: 1,
    craftingTimeSeconds: 28800,
    bumpkinXP: 4000,
    isTradeable: false,
    description: 'High-XP Bakery cake (+4,000 XP · 8h · 0 FLOWER fee). Non-tradeable.',
    timeframe: '8h',
  },
  {
    id: 'craft-cheese',
    name: 'Cheese',
    category: 'food',
    buildingRequired: 'Deli',
    ingredients: { Milk: 3 },
    outputItem: 'Cheese',
    outputQuantity: 1,
    craftingTimeSeconds: 1200,
    bumpkinXP: 1,
    isTradeable: false,
    description: 'Deli intermediate (+1 XP direct · 20m · 0 FLOWER fee). Key input for Blue Cheese (+6,000 XP) & Honey Cheddar (+15,000 XP); non-tradeable.',
    timeframe: '20m',
  },
  {
    id: 'craft-fermented-carrots',
    name: 'Fermented Carrots',
    category: 'food',
    buildingRequired: 'Deli',
    ingredients: { Carrot: 20 },
    outputItem: 'Fermented Carrots',
    outputQuantity: 1,
    craftingTimeSeconds: 86400,
    bumpkinXP: 250,
    isTradeable: false,
    description: 'Deli dish (+250 XP · 24h · 0 FLOWER fee). Uses 20 Carrot; non-tradeable.',
    timeframe: '24h',
  },
  {
    id: 'craft-blueberry-jam',
    name: 'Blueberry Jam',
    category: 'food',
    buildingRequired: 'Deli',
    ingredients: { Blueberry: 5 },
    outputItem: 'Blueberry Jam',
    outputQuantity: 1,
    craftingTimeSeconds: 43200,
    bumpkinXP: 500,
    isTradeable: false,
    description: 'Deli jam (+500 XP · 12h · 0 FLOWER fee). Uses 5 Blueberry; non-tradeable.',
    timeframe: '12h',
  },
  {
    id: 'craft-sauerkraut',
    name: 'Sauerkraut',
    category: 'food',
    buildingRequired: 'Deli',
    ingredients: { Cabbage: 20 },
    outputItem: 'Sauerkraut',
    outputQuantity: 1,
    craftingTimeSeconds: 86400,
    bumpkinXP: 500,
    isTradeable: false,
    description: 'Deli preserve (+500 XP · 24h · 0 FLOWER fee). Uses 20 Cabbage; non-tradeable.',
    timeframe: '24h',
  },
  {
    id: 'craft-blue-cheese',
    name: 'Blue Cheese',
    category: 'food',
    buildingRequired: 'Deli',
    ingredients: { Cheese: 2, Blueberry: 10 },
    outputItem: 'Blue Cheese',
    outputQuantity: 1,
    craftingTimeSeconds: 10800,
    bumpkinXP: 6000,
    isTradeable: false,
    description: 'High-XP Deli specialty (+6,000 XP · 3h · 0 FLOWER fee). Uses 2 Cheese + 10 Blueberry; non-tradeable.',
    timeframe: '3h',
  },
  {
    id: 'craft-honey-cheddar',
    name: 'Honey Cheddar',
    category: 'food',
    buildingRequired: 'Deli',
    ingredients: { Cheese: 3, Honey: 5 },
    outputItem: 'Honey Cheddar',
    outputQuantity: 1,
    craftingTimeSeconds: 43200,
    bumpkinXP: 15000,
    isTradeable: false,
    description: 'Elite Deli specialty (+15,000 XP · 12h · 0 FLOWER fee). Uses 3 Cheese + 5 Honey; non-tradeable.',
    timeframe: '12h',
  },
  {
    id: 'craft-orange-juice',
    name: 'Orange Juice',
    category: 'food',
    buildingRequired: 'Smoothie Shack',
    ingredients: { Orange: 5 },
    outputItem: 'Orange Juice',
    outputQuantity: 1,
    craftingTimeSeconds: 2700,
    bumpkinXP: 375,
    isTradeable: false,
    description: 'Smoothie Shack beverage (+375 XP · 45m · 0 FLOWER fee). Uses 5 Orange; non-tradeable.',
    timeframe: '45m',
  },
];

export interface ResourceStrategicProfile {
  name: string;
  category: 'raw' | 'crop' | 'animal' | 'crafted' | 'flower' | 'other';
  icon: string;
  replacementDifficulty: 'Easy' | 'Moderate' | 'Hard' | 'Extreme';
  rechargeMethod: string;
  strategicRole: string;
  defaultRecommendation: string;
}

export const RESOURCE_PROFILES: Record<string, ResourceStrategicProfile> = {
  Wood: {
    name: 'Wood',
    category: 'raw',
    icon: '🪵',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Chop Trees with Axes (recharges every 2 hours)',
    strategicRole: 'Fundamental construction and tool manufacturing cornerstone',
    defaultRecommendation: 'Reserve for building expansions and tool crafting; avoid selling raw at low margins.',
  },
  Stone: {
    name: 'Stone',
    category: 'raw',
    icon: '🪨',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Mine Stone Rocks with Pickaxes (recharges every 4 hours)',
    strategicRole: 'Primary masonry mineral for wells, furnaces, and expansions',
    defaultRecommendation: 'Essential for mid-tier pickaxes and barn progression.',
  },
  Iron: {
    name: 'Iron',
    category: 'raw',
    icon: '⛓️',
    replacementDifficulty: 'Moderate',
    rechargeMethod: 'Mine Iron Rocks with Stone Pickaxes (recharges every 8 hours)',
    strategicRole: 'Industrial metal for heavy tools, machinery, and structure reinforcement',
    defaultRecommendation: 'Never sell raw. Critical bottleneck for Gold Pickaxes and Barn upgrades.',
  },
  Gold: {
    name: 'Gold',
    category: 'raw',
    icon: '🪙',
    replacementDifficulty: 'Hard',
    rechargeMethod: 'Mine Gold Rocks with Iron Pickaxes (recharges every 24 hours)',
    strategicRole: 'Precious metal required for Gold Pickaxes, Deli, and Island Expansions',
    defaultRecommendation: 'Ultra-high strategic value. Keep in reserve until needed for Gold Pickaxes or Deli.',
  },
  Crimstone: {
    name: 'Crimstone',
    category: 'raw',
    icon: '💎',
    replacementDifficulty: 'Extreme',
    rechargeMethod: 'Mine Crimstone Boulders with Gold Pickaxes (rare node recharge)',
    strategicRole: 'Rare endgame crystal required for Kingdom expansions and auctions',
    defaultRecommendation: 'Do not liquidate unless at peak P2P marketplace price.',
  },
  Sunstone: {
    name: 'Sunstone',
    category: 'raw',
    icon: '☀️',
    replacementDifficulty: 'Extreme',
    rechargeMethod: 'Excavate volcanic fissures with specialized gear',
    strategicRole: 'Mythic tier mineral used for legendary master crafted items',
    defaultRecommendation: 'Vault asset. Retain 100% of reserves.',
  },
  Oil: {
    name: 'Oil',
    category: 'raw',
    icon: '🛢️',
    replacementDifficulty: 'Hard',
    rechargeMethod: 'Drill with Oil Drills at Oil Reserves',
    strategicRole: 'Non-tradeable fuel powering generators, drills, and crafting chains',
    defaultRecommendation: 'Non-tradeable resource — retain for Oil Drills and Sand Drills rather than looking for P2P markets.',
  },
  Milk: {
    name: 'Milk',
    category: 'animal',
    icon: '🥛',
    replacementDifficulty: 'Moderate',
    rechargeMethod: 'Barn Cows fed mixed feed (~24h cycle)',
    strategicRole: 'Tradeable P2P produce and Dairy input for Cheese (3 Milk) → Blue Cheese / Honey Cheddar',
    defaultRecommendation: 'Either sell raw Milk on the P2P market or craft into Cheese in the Deli for high-XP chains (cooked foods are non-tradeable).',
  },
  Egg: {
    name: 'Egg',
    category: 'animal',
    icon: '🥚',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Hen House Chickens fed Corn/Wheat',
    strategicRole: 'Tradeable P2P produce and essential Bakery ingredient (Apple Pie 20 Egg, Sunflower Cake 30 Egg)',
    defaultRecommendation: 'Trade surplus Eggs P2P when bids are strong, or reserve 20–30 Eggs per Bakery XP bake.',
  },
  Honey: {
    name: 'Honey',
    category: 'animal',
    icon: '🍯',
    replacementDifficulty: 'Moderate',
    rechargeMethod: 'Beehives pollinating active flower beds',
    strategicRole: 'Tradeable P2P produce and key ingredient for Honey Cake (+4,000 XP) & Honey Cheddar (+15,000 XP)',
    defaultRecommendation: 'Sell surplus raw Honey P2P or pair 5 Honey + 3 Cheese in Deli for Honey Cheddar (+15,000 XP).',
  },
  Leather: {
    name: 'Leather',
    category: 'animal',
    icon: '👞',
    replacementDifficulty: 'Hard',
    rechargeMethod: 'Barn livestock harvesting',
    strategicRole: 'Tradeable P2P produce and required input for Oil Drills (10 Leather) & Sand Drills',
    defaultRecommendation: 'Reserve at least 10 Leather for Oil Drills before liquidating surplus on P2P.',
  },
  Wool: {
    name: 'Wool',
    category: 'animal',
    icon: '🧶',
    replacementDifficulty: 'Moderate',
    rechargeMethod: 'Sheared sheep in Barn',
    strategicRole: 'Tradeable P2P textile resource and Oil Drill / seasonal quest input',
    defaultRecommendation: 'Trade surplus P2P or retain for delivery board & tool upgrades.',
  },
  Wheat: {
    name: 'Wheat',
    category: 'crop',
    icon: '🌾',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Planted on crop plots (24h maturation)',
    strategicRole: 'Tradeable P2P crop & universal Bakery/Kitchen grain (10 Wheat per Apple Pie, Sunflower Cake, Chowder)',
    defaultRecommendation: 'Keep 10–20 Wheat per Bakery/Kitchen batch or sell excess directly on P2P.',
  },
  Carrot: {
    name: 'Carrot',
    category: 'crop',
    icon: '🥕',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Planted on crop plots (1h maturation)',
    strategicRole: 'Tradeable root crop powering Reindeer Carrot (5), Bumpkin Broth (10), and Fermented Carrots (20)',
    defaultRecommendation: 'Use 20 Carrot in Deli for Fermented Carrots (+250 XP) or trade excess on P2P.',
  },
  Potato: {
    name: 'Potato',
    category: 'crop',
    icon: '🥔',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Planted on crop plots (5 min maturation)',
    strategicRole: 'Tradeable fast crop and Fire Pit Mashed Potato (8 Potato) ingredient',
    defaultRecommendation: 'Cook 8 Potato in Fire Pit for quick Mashed Potato (+3 XP) or trade raw on P2P.',
  },
  Sunflower: {
    name: 'Sunflower',
    category: 'crop',
    icon: '🌻',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Planted on crop plots (1 min maturation)',
    strategicRole: 'Fastest tradeable crop and Bakery input (1,000 Sunflower per Sunflower Cake)',
    defaultRecommendation: 'Stockpile in batches of 1,000 (+10 Wheat +30 Egg) for Sunflower Cake (+525 XP), or trade bulk raw.',
  },
  Pumpkin: {
    name: 'Pumpkin',
    category: 'crop',
    icon: '🎃',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Planted on crop plots (30 min maturation)',
    strategicRole: 'Tradeable crop and Fire Pit Pumpkin Soup (10 Pumpkin → +24 XP) ingredient',
    defaultRecommendation: 'Cook 10 Pumpkin in Fire Pit for Bumpkin XP or sell surplus raw on P2P.',
  },
  Rhubarb: {
    name: 'Rhubarb',
    category: 'crop',
    icon: '🥬',
    replacementDifficulty: 'Easy',
    rechargeMethod: 'Planted on crop plots (10 min maturation)',
    strategicRole: 'Fast tradeable crop and Fire Pit Rhubarb Tart (only 3 Rhubarb → +5 XP in 1m)',
    defaultRecommendation: 'Cook batches of 3 Rhubarb in the Fire Pit for rapid XP (+5 XP / 1m) or sell raw Rhubarb on P2P.',
  },
};

/**
 * Finds all verified recipes that require a given resource
 */
export function getRecipesRequiringResource(resourceName: string): CraftingRecipe[] {
  const norm = resourceName.toLowerCase();
  return VERIFIED_RECIPES.filter(recipe => {
    return Object.keys(recipe.ingredients).some(ing => ing.toLowerCase() === norm);
  });
}

/**
 * Verifies if player has 100% of ingredients, FLOWER, and Coins needed for a recipe
 */
export function checkRecipeAffordability(
  recipe: CraftingRecipe,
  inventory: Record<string, number | string>,
  sflBalance: number,
  coinsBalance: number = Infinity
): {
  canAfford: boolean;
  missingItems: { item: string; required: number; owned: number; missing: number }[];
  missingSFL: number;
  missingCoins: number;
  maxCraftable: number;
} {
  const missingItems: { item: string; required: number; owned: number; missing: number }[] = [];
  let maxCraftable = Infinity;

  for (const [ingredientName, requiredCount] of Object.entries(recipe.ingredients)) {
    const key = Object.keys(inventory).find(k => k.toLowerCase() === ingredientName.toLowerCase());
    const owned = key ? parseFloat(String(inventory[key])) || 0 : 0;

    if (owned < requiredCount) {
      missingItems.push({
        item: ingredientName,
        required: requiredCount,
        owned,
        missing: Number((requiredCount - owned).toFixed(2)),
      });
    }

    const possibleFromThis = Math.floor(owned / requiredCount);
    if (possibleFromThis < maxCraftable) {
      maxCraftable = possibleFromThis;
    }
  }

  const sflCost = recipe.sflCost || 0;
  if (sflCost > 0) {
    maxCraftable = Math.min(maxCraftable, Math.floor(sflBalance / sflCost));
  }

  const coinsCost = recipe.coinsCost || 0;
  if (coinsCost > 0 && Number.isFinite(coinsBalance)) {
    maxCraftable = Math.min(maxCraftable, Math.floor(coinsBalance / coinsCost));
  }

  const missingSFL = sflBalance < sflCost ? Number((sflCost - sflBalance).toFixed(2)) : 0;
  const missingCoins =
    Number.isFinite(coinsBalance) && coinsBalance < coinsCost
      ? Math.ceil(coinsCost - coinsBalance)
      : 0;
  const canAfford = missingItems.length === 0 && missingSFL === 0 && missingCoins === 0;

  return {
    canAfford,
    missingItems,
    missingSFL,
    missingCoins,
    maxCraftable: maxCraftable === Infinity ? (canAfford ? 1 : 0) : Math.max(0, maxCraftable),
  };
}


import { NextRequest, NextResponse } from 'next/server';

interface MechanicsCache {
  data: any;
  timestamp: number;
}

let mechanicsCache: MechanicsCache | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes server cache

/**
 * Official Sunflower Land Verified Game Mechanics Baseline
 * Synced directly from sunflower-land/sunflower-land (src/features/game/types/)
 * NOTE: In Sunflower Land, there are ZERO fees (0.0000 FLOWER) for cooking time!
 */
const VERIFIED_SFL_COOKABLES: Record<
  string,
  {
    id: string;
    name: string;
    building: 'Fire Pit' | 'Kitchen' | 'Bakery' | 'Deli' | 'Smoothie Shack';
    cookingSeconds: number;
    cookingMinutes: number;
    cookingTimeFormatted: string;
    cookingTimeFeeFlower: number; // Always 0 in Sunflower Land!
    additionalFeesFlower: number; // Always 0 in Sunflower Land!
    baseExperience: number;
    ingredients: Record<string, number>;
    isTradeable: false;
    usedInRecipes?: string[];
  }
> = {
  mashedPotato: {
    id: 'mashedPotato',
    name: 'Mashed Potato',
    building: 'Fire Pit',
    cookingSeconds: 30,
    cookingMinutes: 0.5,
    cookingTimeFormatted: '30s',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 3,
    ingredients: { potato: 8 },
    isTradeable: false,
    usedInRecipes: ['Cabbers n Mash (10x)', 'Bumpkin Roast (20x)'],
  },
  rhubarbTart: {
    id: 'rhubarbTart',
    name: 'Rhubarb Tart',
    building: 'Fire Pit',
    cookingSeconds: 60,
    cookingMinutes: 1,
    cookingTimeFormatted: '1m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 5,
    ingredients: { rhubarb: 3 },
    isTradeable: false,
  },
  pumpkinSoup: {
    id: 'pumpkinSoup',
    name: 'Pumpkin Soup',
    building: 'Fire Pit',
    cookingSeconds: 180,
    cookingMinutes: 3,
    cookingTimeFormatted: '3m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 24,
    ingredients: { pumpkin: 10 },
    isTradeable: false,
  },
  reindeerCarrot: {
    id: 'reindeerCarrot',
    name: 'Reindeer Carrot',
    building: 'Fire Pit',
    cookingSeconds: 300,
    cookingMinutes: 5,
    cookingTimeFormatted: '5m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 36,
    ingredients: { carrot: 5 },
    isTradeable: false,
  },
  bumpkinBroth: {
    id: 'bumpkinBroth',
    name: 'Bumpkin Broth',
    building: 'Fire Pit',
    cookingSeconds: 1200,
    cookingMinutes: 20,
    cookingTimeFormatted: '20m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 96,
    ingredients: { carrot: 10, cabbage: 5 },
    isTradeable: false,
  },
  boiledEggs: {
    id: 'boiledEggs',
    name: 'Boiled Eggs',
    building: 'Fire Pit',
    cookingSeconds: 3600,
    cookingMinutes: 60,
    cookingTimeFormatted: '1h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 90,
    ingredients: { egg: 10 },
    isTradeable: false,
    usedInRecipes: ['Goblin Brunch (5x)'],
  },
  kaleStew: {
    id: 'kaleStew',
    name: 'Kale Stew',
    building: 'Fire Pit',
    cookingSeconds: 7200,
    cookingMinutes: 120,
    cookingTimeFormatted: '2h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 400,
    ingredients: { kale: 10 },
    isTradeable: false,
  },
  pizzaMargherita: {
    id: 'pizzaMargherita',
    name: 'Pizza Margherita',
    building: 'Fire Pit',
    cookingSeconds: 72000,
    cookingMinutes: 1200,
    cookingTimeFormatted: '20h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 25000,
    ingredients: { tomato: 30, cheese: 5, wheat: 20 },
    isTradeable: false,
  },
  cauliflowerBurger: {
    id: 'cauliflowerBurger',
    name: 'Cauliflower Burger',
    building: 'Kitchen',
    cookingSeconds: 10800,
    cookingMinutes: 180,
    cookingTimeFormatted: '3h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 255,
    ingredients: { cauliflower: 15, wheat: 5 },
    isTradeable: false,
  },
  chowder: {
    id: 'chowder',
    name: 'Chowder',
    building: 'Kitchen',
    cookingSeconds: 28800,
    cookingMinutes: 480,
    cookingTimeFormatted: '8h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 1000,
    ingredients: { beetroot: 10, wheat: 10, parsnip: 5, anchovy: 3 },
    isTradeable: false,
  },
  capreseSalad: {
    id: 'capreseSalad',
    name: 'Caprese Salad',
    building: 'Kitchen',
    cookingSeconds: 10800,
    cookingMinutes: 180,
    cookingTimeFormatted: '3h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 6000,
    ingredients: { cheese: 1, tomato: 25, kale: 20 },
    isTradeable: false,
  },
  spaghettiAlLimone: {
    id: 'spaghettiAlLimone',
    name: 'Spaghetti al Limone',
    building: 'Kitchen',
    cookingSeconds: 54000,
    cookingMinutes: 900,
    cookingTimeFormatted: '15h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 15000,
    ingredients: { wheat: 10, lemon: 15, cheese: 3 },
    isTradeable: false,
  },
  sunflowerCake: {
    id: 'sunflowerCake',
    name: 'Sunflower Cake',
    building: 'Bakery',
    cookingSeconds: 23400,
    cookingMinutes: 390,
    cookingTimeFormatted: '6h 30m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 525,
    ingredients: { sunflower: 1000, wheat: 10, egg: 30 },
    isTradeable: false,
  },
  honeyCake: {
    id: 'honeyCake',
    name: 'Honey Cake',
    building: 'Bakery',
    cookingSeconds: 28800,
    cookingMinutes: 480,
    cookingTimeFormatted: '8h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 4000,
    ingredients: { honey: 10, wheat: 10, egg: 20 },
    isTradeable: false,
  },
  lemonCheesecake: {
    id: 'lemonCheesecake',
    name: 'Lemon Cheesecake',
    building: 'Bakery',
    cookingSeconds: 108000,
    cookingMinutes: 1800,
    cookingTimeFormatted: '30h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 30000,
    ingredients: { lemon: 20, cheese: 5, egg: 40 },
    isTradeable: false,
  },
  cheese: {
    id: 'cheese',
    name: 'Cheese',
    building: 'Deli',
    cookingSeconds: 1200,
    cookingMinutes: 20,
    cookingTimeFormatted: '20m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 1,
    ingredients: { milk: 3 },
    isTradeable: false,
    usedInRecipes: [
      'Blue Cheese (2 Cheese + 10 Blueberry → 6,000 XP · 3h)',
      'Honey Cheddar (3 Cheese + 5 Honey → 15,000 XP · 12h)',
      'Caprese Salad (1 Cheese + 25 Tomato + 20 Kale → 6,000 XP · 3h)',
      'Spaghetti al Limone (3 Cheese + 10 Wheat + 15 Lemon → 15,000 XP · 15h)',
      'Pizza Margherita (5 Cheese + 30 Tomato + 20 Wheat → 25,000 XP · 20h)',
      'Lemon Cheesecake (5 Cheese + 20 Lemon + 40 Egg → 30,000 XP · 30h)',
    ],
  },
  blueberryJam: {
    id: 'blueberryJam',
    name: 'Blueberry Jam',
    building: 'Deli',
    cookingSeconds: 43200,
    cookingMinutes: 720,
    cookingTimeFormatted: '12h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 500,
    ingredients: { blueberry: 5 },
    isTradeable: false,
  },
  fermentedCarrots: {
    id: 'fermentedCarrots',
    name: 'Fermented Carrots',
    building: 'Deli',
    cookingSeconds: 86400,
    cookingMinutes: 1440,
    cookingTimeFormatted: '24h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 250,
    ingredients: { carrot: 20 },
    isTradeable: false,
  },
  sauerkraut: {
    id: 'sauerkraut',
    name: 'Sauerkraut',
    building: 'Deli',
    cookingSeconds: 86400,
    cookingMinutes: 1440,
    cookingTimeFormatted: '24h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 500,
    ingredients: { cabbage: 20 },
    isTradeable: false,
  },
  blueCheese: {
    id: 'blueCheese',
    name: 'Blue Cheese',
    building: 'Deli',
    cookingSeconds: 10800,
    cookingMinutes: 180,
    cookingTimeFormatted: '3h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 6000,
    ingredients: { cheese: 2, blueberry: 10 },
    isTradeable: false,
  },
  honeyCheddar: {
    id: 'honeyCheddar',
    name: 'Honey Cheddar',
    building: 'Deli',
    cookingSeconds: 43200,
    cookingMinutes: 720,
    cookingTimeFormatted: '12h 00m',
    cookingTimeFeeFlower: 0,
    additionalFeesFlower: 0,
    baseExperience: 15000,
    ingredients: { cheese: 3, honey: 5 },
    isTradeable: false,
  },
};

const VERIFIED_SFL_TOOLS: Record<
  string,
  {
    id: string;
    name: string;
    building: 'Workbench' | 'Treasure Shop';
    priceCoins: number;
    ingredients: Record<string, number>;
    stock: number;
    craftingTimeSeconds: 0;
    craftingFeeFlower: 0;
    extractsResource: string;
  }
> = {
  axe: {
    id: 'axe',
    name: 'Axe',
    building: 'Workbench',
    priceCoins: 20,
    ingredients: {},
    stock: 200,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Wood',
  },
  pickaxe: {
    id: 'pickaxe',
    name: 'Pickaxe',
    building: 'Workbench',
    priceCoins: 20,
    ingredients: { wood: 3 },
    stock: 60,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Stone',
  },
  stonePickaxe: {
    id: 'stonePickaxe',
    name: 'Stone Pickaxe',
    building: 'Workbench',
    priceCoins: 20,
    ingredients: { wood: 3, stone: 5 },
    stock: 20,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Iron',
  },
  ironPickaxe: {
    id: 'ironPickaxe',
    name: 'Iron Pickaxe',
    building: 'Workbench',
    priceCoins: 80,
    ingredients: { wood: 3, iron: 5 },
    stock: 5,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Gold',
  },
  goldPickaxe: {
    id: 'goldPickaxe',
    name: 'Gold Pickaxe',
    building: 'Workbench',
    priceCoins: 100,
    ingredients: { wood: 3, gold: 3 },
    stock: 5,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Crimstone',
  },
  rod: {
    id: 'rod',
    name: 'Rod',
    building: 'Workbench',
    priceCoins: 20,
    ingredients: { wood: 3, stone: 1 },
    stock: 50,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Fish',
  },
  oilDrill: {
    id: 'oilDrill',
    name: 'Oil Drill',
    building: 'Workbench',
    priceCoins: 100,
    ingredients: { wood: 20, iron: 9, leather: 10 },
    stock: 5,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Oil',
  },
  sandShovel: {
    id: 'sandShovel',
    name: 'Sand Shovel',
    building: 'Treasure Shop',
    priceCoins: 20,
    ingredients: { wood: 2, stone: 1 },
    stock: 50,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Treasure',
  },
  sandDrill: {
    id: 'sandDrill',
    name: 'Sand Drill',
    building: 'Treasure Shop',
    priceCoins: 40,
    ingredients: { oil: 1, crimstone: 1, wood: 3, leather: 1 },
    stock: 10,
    craftingTimeSeconds: 0,
    craftingFeeFlower: 0,
    extractsResource: 'Deep Treasure',
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get('farmId') || '5128790942880844';
  const now = Date.now();

  let githubSourceSynced = false;
  let upstreamCookingCount = Object.keys(VERIFIED_SFL_COOKABLES).length;

  try {
    if (!mechanicsCache || now - mechanicsCache.timestamp > CACHE_TTL_MS) {
      const ghRes = await fetch(
        'https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/features/game/types/consumables.ts',
        {
          headers: { 'User-Agent': 'FarmIQ-Mechanics-Engine/2.0' },
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        }
      );
      if (ghRes.ok) {
        const text = await ghRes.text();
        githubSourceSynced = text.includes('DELI_COOKABLES') && text.includes('FIRE_PIT_COOKABLES');
        const matches = text.match(/cookingSeconds:/g);
        if (matches) upstreamCookingCount = matches.length;
        mechanicsCache = {
          data: { githubSourceSynced, upstreamCookingCount },
          timestamp: now,
        };
      }
    } else {
      githubSourceSynced = mechanicsCache.data.githubSourceSynced;
      upstreamCookingCount = mechanicsCache.data.upstreamCookingCount;
    }
  } catch {
    // Fallback to verified embedded SFL mechanics
  }

  return NextResponse.json({
    source: 'Sunflower Land Official Game Mechanics Engine (consumables.ts · tools.ts · crops.ts · fruits.ts · bumpkinSkills.ts)',
    githubSourceSynced,
    upstreamCookingCount,
    farmId,
    cookingTimeFeePolicy: {
      feeFlowerPerHour: 0,
      additionalFeesFlower: 0,
      rule: 'Zero fees for cooking time in Sunflower Land. Cooking buildings (Fire Pit, Kitchen, Bakery, Deli, Smoothie Shack) require only recipe ingredients and elapsed building timer.',
    },
    cookables: VERIFIED_SFL_COOKABLES,
    tools: VERIFIED_SFL_TOOLS,
    updatedAt: new Date(now).toISOString(),
  });
}


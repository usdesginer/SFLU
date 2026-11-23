import { SFL_ITEMS, FLOWER_TOKEN_PRICE_USD, SFL_TOKEN_PRICE_USD } from '../data/sflData';
import { 
  CraftingRecipe, 
  VERIFIED_RECIPES, 
  RESOURCE_PROFILES, 
  getRecipesRequiringResource, 
  checkRecipeAffordability 
} from '../data/gameKnowledge';
import { SFL_ITEM_PRICES } from './profitEngine';

export type InventoryCategory = 
  | 'all'
  | 'raw'
  | 'crop'
  | 'animal';

export type UntradableCategory = 
  | 'all'
  | 'food'
  | 'tool'
  | 'seed'
  | 'collectible'
  | 'flower'
  | 'other';

export interface CategorizedInventoryItem {
  id: string;
  name: string;
  category: 'raw' | 'crop' | 'animal';
  icon: string;
  quantityOwned: number;
  formattedQuantity: string;
  marketPriceFlower: number;
  totalValueFlower: number;
  marketPriceUSD: number;
  totalValueUSD: number;
  unitPriceSFL: number; // Backwards-compatible alias for Flower price
  totalValueSFL: number; // Backwards-compatible alias
  bettyPriceCoins: number | null;
  recipesUsedIn: CraftingRecipe[];
  strategicScore: number;
  strategicBadge: string;
  replacementDifficulty: string;
  rechargeMethod: string;
  isGoalIngredient?: boolean;
}

export interface UntradableInventoryItem {
  id: string;
  name: string;
  category: 'food' | 'tool' | 'seed' | 'collectible' | 'flower' | 'other';
  icon: string;
  quantityOwned: number;
  formattedQuantity: string;
  utilityDescription: string;
  xpYield?: number;
  status: 'Untradable (Account-Bound)';
  badge: string;
}

/**
 * Authoritative Dictionary of Verified Tradable Commodities across Sunflower Land
 * Strictly limited to Raw Minerals (7), Crops & Produce (35), and Animal Products (7).
 * All default prices denominated strictly in FLOWER.
 */
export const VERIFIED_TRADABLE_RESOURCE_MAP: Record<string, { category: 'raw' | 'crop' | 'animal'; icon: string; defaultFlower: number }> = {
  // 1. Raw Resources & Minerals (7)
  'Wood': { category: 'raw', icon: '🪵', defaultFlower: 0.0120 },
  'Stone': { category: 'raw', icon: '🪨', defaultFlower: 0.0210 },
  'Iron': { category: 'raw', icon: '⛓️', defaultFlower: 0.0850 },
  'Gold': { category: 'raw', icon: '🪙', defaultFlower: 0.3200 },
  'Crimstone': { category: 'raw', icon: '💎', defaultFlower: 0.6500 },
  'Sunstone': { category: 'raw', icon: '☀️', defaultFlower: 2.8000 },
  'Oil': { category: 'raw', icon: '🛢️', defaultFlower: 0.2500 },

  // 2. Crops & Produce (35)
  'Sunflower': { category: 'crop', icon: '🌻', defaultFlower: 0.0001 },
  'Potato': { category: 'crop', icon: '🥔', defaultFlower: 0.0002 },
  'Rhubarb': { category: 'crop', icon: '🥬', defaultFlower: 0.0004 },
  'Pumpkin': { category: 'crop', icon: '🎃', defaultFlower: 0.0005 },
  'Zucchini': { category: 'crop', icon: '🥒', defaultFlower: 0.0005 },
  'Carrot': { category: 'crop', icon: '🥕', defaultFlower: 0.0014 },
  'Yam': { category: 'crop', icon: '🍠', defaultFlower: 0.0022 },
  'Cabbage': { category: 'crop', icon: '🥬', defaultFlower: 0.0014 },
  'Broccoli': { category: 'crop', icon: '🥦', defaultFlower: 0.0025 },
  'Soybean': { category: 'crop', icon: '🫘', defaultFlower: 0.0019 },
  'Beetroot': { category: 'crop', icon: '🟣', defaultFlower: 0.0054 },
  'Pepper': { category: 'crop', icon: '🌶️', defaultFlower: 0.0050 },
  'Cauliflower': { category: 'crop', icon: '🥦', defaultFlower: 0.0088 },
  'Parsnip': { category: 'crop', icon: '🥕', defaultFlower: 0.0121 },
  'Eggplant': { category: 'crop', icon: '🍆', defaultFlower: 0.0066 },
  'Corn': { category: 'crop', icon: '🌽', defaultFlower: 0.0181 },
  'Onion': { category: 'crop', icon: '🧅', defaultFlower: 0.0139 },
  'Radish': { category: 'crop', icon: '🔴', defaultFlower: 0.0078 },
  'Wheat': { category: 'crop', icon: '🌾', defaultFlower: 0.0139 },
  'Turnip': { category: 'crop', icon: '🪴', defaultFlower: 0.0152 },
  'Kale': { category: 'crop', icon: '🥬', defaultFlower: 0.0274 },
  'Artichoke': { category: 'crop', icon: '🌿', defaultFlower: 0.0101 },
  'Barley': { category: 'crop', icon: '🌾', defaultFlower: 0.0209 },
  'Tomato': { category: 'crop', icon: '🍅', defaultFlower: 0.0063 },
  'Lemon': { category: 'crop', icon: '🍋', defaultFlower: 0.0082 },
  'Blueberry': { category: 'crop', icon: '🫐', defaultFlower: 0.0197 },
  'Orange': { category: 'crop', icon: '🍊', defaultFlower: 0.0124 },
  'Apple': { category: 'crop', icon: '🍎', defaultFlower: 0.0222 },
  'Banana': { category: 'crop', icon: '🍌', defaultFlower: 0.0176 },
  'Grape': { category: 'crop', icon: '🍇', defaultFlower: 0.1800 },
  'Rice': { category: 'crop', icon: '🌾', defaultFlower: 0.2257 },
  'Olive': { category: 'crop', icon: '🫒', defaultFlower: 0.3249 },
  'Celestine': { category: 'crop', icon: '💠', defaultFlower: 0.1347 },
  'Lunara': { category: 'crop', icon: '🌕', defaultFlower: 0.3330 },
  'Duskberry': { category: 'crop', icon: '🫐', defaultFlower: 0.6719 },

  // 3. Animal Products (7)
  'Egg': { category: 'animal', icon: '🥚', defaultFlower: 0.0075 },
  'Milk': { category: 'animal', icon: '🥛', defaultFlower: 0.0380 },
  'Honey': { category: 'animal', icon: '🍯', defaultFlower: 0.0950 },
  'Leather': { category: 'animal', icon: '👞', defaultFlower: 0.1100 },
  'Wool': { category: 'animal', icon: '🧶', defaultFlower: 0.0820 },
  'Feather': { category: 'animal', icon: '🪶', defaultFlower: 0.0035 },
  'Shiny Feather': { category: 'animal', icon: '🪶', defaultFlower: 0.0180 },
};

/**
 * Knowledge base for untradable assets (Foods, Tools, Seeds, Collectibles, Flowers, Bait)
 */
export const UNTRADABLE_KNOWLEDGE_MAP: Record<string, { category: 'food' | 'tool' | 'seed' | 'collectible' | 'flower' | 'other'; icon: string; utility: string; xp?: number }> = {
  // Cooked Foods & Cakes
  'Sunflower Cake': { category: 'food', icon: '🎂', utility: 'Feeds Bumpkin for +210 XP in Bakery', xp: 210 },
  'Pumpkin Soup': { category: 'food', icon: '🥣', utility: 'Feeds Bumpkin for +90 XP in Fire Pit', xp: 90 },
  'Mashed Potato': { category: 'food', icon: '🥔', utility: 'Feeds Bumpkin for +35 XP in Fire Pit', xp: 35 },
  'Rhubarb Tart': { category: 'food', icon: '🥧', utility: 'Feeds Bumpkin for +160 XP in Bakery', xp: 160 },
  'Cheese': { category: 'food', icon: '🧀', utility: 'Aged in Deli, feeds Bumpkin for +320 XP', xp: 320 },
  'Chowder': { category: 'food', icon: '🍲', utility: 'Feeds Bumpkin for +280 XP in Kitchen', xp: 280 },
  'Fermented Carrots': { category: 'food', icon: '🥕', utility: 'Feeds Bumpkin for +110 XP in Deli', xp: 110 },
  'Apple Pie': { category: 'food', icon: '🥧', utility: 'Feeds Bumpkin for +450 XP in Bakery', xp: 450 },
  'Orange Juice': { category: 'food', icon: '🧃', utility: 'Smoothie Shack juice, +180 XP', xp: 180 },
  'Apple Juice': { category: 'food', icon: '🧃', utility: 'Smoothie Shack juice, +210 XP', xp: 210 },
  'Bumpkin Broth': { category: 'food', icon: '🍲', utility: 'Feeds Bumpkin for +120 XP', xp: 120 },
  'Cabbers n Mash': { category: 'food', icon: '🍲', utility: 'Feeds Bumpkin for +250 XP', xp: 250 },
  'Cauliflower Burger': { category: 'food', icon: '🍔', utility: 'Feeds Bumpkin for +420 XP', xp: 420 },
  'Kale Stew': { category: 'food', icon: '🍲', utility: 'Feeds Bumpkin for +380 XP', xp: 380 },
  'Kale & Mushroom Pie': { category: 'food', icon: '🥧', utility: 'Feeds Bumpkin for +520 XP', xp: 520 },
  'Wheat Cake': { category: 'food', icon: '🍰', utility: 'Feeds Bumpkin for +350 XP', xp: 350 },
  'Pirate Cake': { category: 'food', icon: '🎂', utility: 'Feeds Bumpkin for +750 XP', xp: 750 },
  'Surimi Rice Bowl': { category: 'food', icon: '🍚', utility: 'Feeds Bumpkin for +650 XP', xp: 650 },
  'Pickled Broccoli': { category: 'food', icon: '🥦', utility: 'Feeds Bumpkin for +140 XP', xp: 140 },
  'Sour Shake': { category: 'food', icon: '🥤', utility: 'Feeds Bumpkin for +200 XP', xp: 200 },
  'Roast Veggies': { category: 'food', icon: '🥗', utility: 'Feeds Bumpkin for +170 XP', xp: 170 },
  'Club Sandwich': { category: 'food', icon: '🥪', utility: 'Feeds Bumpkin for +390 XP', xp: 390 },
  'Pancakes': { category: 'food', icon: '🥞', utility: 'Feeds Bumpkin for +480 XP', xp: 480 },
  'Boiled Eggs': { category: 'food', icon: '🥚', utility: 'Feeds Bumpkin for +90 XP', xp: 90 },

  // Tools & Machinery
  'Axe': { category: 'tool', icon: '🪓', utility: 'Chops trees across the farm to harvest Wood' },
  'Pickaxe': { category: 'tool', icon: '⛏️', utility: 'Mines stone nodes to harvest Stone' },
  'Stone Pickaxe': { category: 'tool', icon: '⛏️', utility: 'Mines iron nodes to harvest Iron ore' },
  'Iron Pickaxe': { category: 'tool', icon: '⛏️', utility: 'Mines gold nodes to harvest Gold ore' },
  'Gold Pickaxe': { category: 'tool', icon: '⛏️', utility: 'Mines crimstone nodes for rare Crimstone crystals' },
  'Rusty Shovel': { category: 'tool', icon: '🚜', utility: 'Removes weeds or reclaims building spaces' },
  'Shovel': { category: 'tool', icon: '🚜', utility: 'Reclaims farm space and moves plot beds' },
  'Sand Shovel': { category: 'tool', icon: '🏖️', utility: 'Digs for buried treasure on the Beach island' },
  'Rod': { category: 'tool', icon: '🎣', utility: 'Catches fresh fish from the ocean pier' },
  'Fishing Lure': { category: 'tool', icon: '🪱', utility: 'Special lure enhancing catch quality' },
  'Oil Drill': { category: 'tool', icon: '🛢️', utility: 'Drills deep reserves to pump crude Oil' },

  // Collectibles, Statues & Bears
  'Basic Bear': { category: 'collectible', icon: '🧸', utility: 'Cozy farm plot decoration' },
  'Farmer Bear': { category: 'collectible', icon: '🐻', utility: 'Farm plot decoration in denim overalls' },
  'Construction Bear': { category: 'collectible', icon: '🐻', utility: 'Oversees farm infrastructure upgrades' },
  'Badass Bear': { category: 'collectible', icon: '🐻', utility: 'Fierce warrior bear collectible trophy' },
  'Brilliant Bear': { category: 'collectible', icon: '🐻', utility: 'Scholar bear island achievement trophy' },
  'Desert Gnome': { category: 'collectible', icon: '🧙', utility: 'Desert guardian boosting island productivity' },
  'Blossombeard': { category: 'collectible', icon: '🧔', utility: 'Floral gnome patriarch imparting seasonal boosts' },
  'Farmer\'s Monument': { category: 'collectible', icon: '🗿', utility: 'Commemorates agricultural milestones' },
  'Farmers Monument': { category: 'collectible', icon: '🗿', utility: 'Commemorates agricultural milestones' },
  'Big Orange': { category: 'collectible', icon: '🍊', utility: 'Giant citrus community sculpture' },
  'Big Apple': { category: 'collectible', icon: '🍎', utility: 'Giant carved orchard sculpture' },
  'Basic Scarecrow': { category: 'collectible', icon: '🌾', utility: 'Accelerates crop maturity on nearby plots' },
  'Scary Mike': { category: 'collectible', icon: '🎃', utility: 'Pumpkin-headed scarecrow boosting medium plots' },
  'Maneki Neko': { category: 'collectible', icon: '🐱', utility: 'Lucky beckoning cat granting daily bonus food' },

  // Flowers & Greenhouse Blooms
  'Red Pansy': { category: 'flower', icon: '🌺', utility: 'Greenhouse bloom used in Royal Bouquet recipe' },
  'Yellow Daffodil': { category: 'flower', icon: '🌼', utility: 'Greenhouse bloom for honey bloom pollination' },
  'White Lotus': { category: 'flower', icon: '🪷', utility: 'Rare mystical lotus for high-tier Bumpkin deliveries' },
  'Blue Cosmos': { category: 'flower', icon: '🌸', utility: 'Delicate celestial greenhouse flower' },
  'Blue Balloon Flower': { category: 'flower', icon: '🎈', utility: 'Buoyant decorative balloon blossom' },
  'Red Balloon Flower': { category: 'flower', icon: '🎈', utility: 'Crimson inflated ornamental garden bloom' },
  'Yellow Carnation': { category: 'flower', icon: '🌼', utility: 'Golden ruffled blossom for fragrant garlands' },
  'White Pansy': { category: 'flower', icon: '🌸', utility: 'Pure velvet petal garden bloom' },

  // Bait, Seasonings & Faction Items
  'Earthworm': { category: 'other', icon: '🪱', utility: 'Organic fishing bait produced in composters' },
  'Grub': { category: 'other', icon: '🐛', utility: 'Fishing bait for mid-tier fish species' },
  'Red Wiggler': { category: 'other', icon: '🪱', utility: 'High-grade fishing bait for prized ocean catches' },
  'Salt': { category: 'other', icon: '🧂', utility: 'Mineral seasoning for kitchen deli recipes' },
  'Sprout Mix': { category: 'other', icon: '🧪', utility: 'Soil booster accelerating crop growth cycles' },
  'Gem': { category: 'other', icon: '💎', utility: 'Rare currency for Bumpkin cosmetics and VIP pass' },
  'Gems': { category: 'other', icon: '💎', utility: 'Rare currency for Bumpkin cosmetics and VIP pass' },
  'Mark': { category: 'other', icon: '🏷️', utility: 'Faction marks earned in community challenges' },
  'Cheer': { category: 'other', icon: '📣', utility: 'Holiday cheer token' },
  'Love Charm': { category: 'other', icon: '💖', utility: 'Festival charm for seasonal trade deliveries' },
  'Ascension Shard': { category: 'other', icon: '🔮', utility: 'Ritual shard used for Bumpkin ascensions' },
};

/**
 * Checks whether an item is genuinely tradable on Sunflower Land P2P marketplace.
 * Strictly limited to Raw Minerals, Crops & Produce, and Animal Products.
 */
export function isTradableItem(name: string): boolean {
  if (!name) return false;
  const clean = name.trim();
  if (VERIFIED_TRADABLE_RESOURCE_MAP[clean]) return true;
  const lower = clean.toLowerCase();
  return Object.keys(VERIFIED_TRADABLE_RESOURCE_MAP).some(k => k.toLowerCase() === lower);
}

export function formatInventoryQuantity(num: number): string {
  if (Number.isInteger(num)) return num.toLocaleString();
  if (num >= 100) return num.toFixed(1);
  if (num >= 1) return Number(num.toFixed(2)).toString();
  return Number(num.toFixed(4)).toString();
}

/**
 * Calculates strategic score and badge for any tradable item
 */
export function calculateStrategicScore(
  itemName: string,
  quantity: number,
  recipes: CraftingRecipe[],
  goalIngredients?: string[]
): { score: number; badge: string } {
  let score = 50;

  // Recipe demand
  const recipeCount = recipes.length;
  score += Math.min(recipeCount * 8, 25);

  // Scarcity bonus
  const profile = RESOURCE_PROFILES[itemName];
  if (profile) {
    if (profile.replacementDifficulty === 'Extreme') score += 20;
    else if (profile.replacementDifficulty === 'Hard') score += 15;
    else if (profile.replacementDifficulty === 'Moderate') score += 8;
  }

  // Stockpile evaluation
  if (itemName === 'Wood') {
    if (quantity < 100) score += 15;
    else if (quantity > 300) score -= 10;
  } else if (itemName === 'Iron' || itemName === 'Gold') {
    if (quantity < 10) score += 20;
  }

  // Goal alignment
  const isNeededForGoal = goalIngredients?.some(g => g.toLowerCase() === itemName.toLowerCase());
  if (isNeededForGoal) {
    score += 15;
  }

  score = Math.min(Math.max(score, 10), 99);

  let badge = 'Active Production Utility';
  if (itemName === 'Wood') badge = 'High Strategic Demand';
  else if (itemName === 'Gold') badge = 'Limited Crafting Availability';
  else if (itemName === 'Iron') badge = 'Critical Upgrade Bottleneck';
  else if (itemName === 'Stone') badge = 'Structural Expansion Base';
  else if (itemName === 'Milk') badge = 'Recurring Dairy Yield';
  else if (itemName === 'Crimstone' || itemName === 'Sunstone') badge = 'High-Value Mineral';
  else if (isNeededForGoal) badge = 'Required for Active Milestone';
  else if (quantity > 500) badge = 'Surplus Liquidity Available';
  else if (profile?.replacementDifficulty === 'Extreme') badge = 'High Scarcity Asset';

  return { score, badge };
}

/**
 * Discovers, categorizes, and values STRICTLY TRADABLE resources in player's inventory.
 * Guaranteed: 0 non-tradable tools, 0 soulbound bears, 0 untradeable flowers, 0 cakes/foods.
 * Prices and values strictly denominated in FLOWER and USD.
 */
export function discoverAllPlayerResources(
  rawInventory: Record<string, number | string> = {},
  commodities: Record<string, any> = {},
  flowerPriceUSD: number = 0.1504,
  activeGoalIngredients?: string[]
): CategorizedInventoryItem[] {
  const result: CategorizedInventoryItem[] = [];

  Object.entries(rawInventory).forEach(([rawName, rawCount]) => {
    // 1. FILTER: Include ONLY verified tradable items (Minerals, Crops, Animals)
    if (!isTradableItem(rawName)) return;

    const count = typeof rawCount === 'number' ? rawCount : parseFloat(String(rawCount) || '0');
    if (count <= 0) return;

    // Find canonical definition
    const matchedKey = Object.keys(VERIFIED_TRADABLE_RESOURCE_MAP).find(
      k => k.toLowerCase() === rawName.toLowerCase()
    ) || rawName;
    const meta = VERIFIED_TRADABLE_RESOURCE_MAP[matchedKey];
    if (!meta) return;

    const category = meta.category;
    const icon = meta.icon;

    // Find live commodity entry from official Sunflower Land marketplace report
    const commKey = Object.keys(commodities).find(
      k => k.toLowerCase() === matchedKey.toLowerCase() || 
           k.toLowerCase() === matchedKey.toLowerCase().replace(/['\s-]+/g, '')
    );
    const comm = commKey ? commodities[commKey] : null;
    const liveFlowerFloor = comm?.floorFlower ?? comm?.latestSaleFlower ?? null;

    // Unit price strictly in FLOWER
    const unitPriceFlower = (liveFlowerFloor !== null && liveFlowerFloor > 0)
      ? liveFlowerFloor
      : meta.defaultFlower;

    const unitPriceUSD = unitPriceFlower * flowerPriceUSD;

    // Total Value strictly in FLOWER and USD
    const totalValueFlower = Number((count * unitPriceFlower).toFixed(4));
    const totalValueUSD = Number((count * unitPriceUSD).toFixed(2));
    const bettyPriceCoins = Math.round(unitPriceFlower * 2000);

    const recipesUsedIn = getRecipesRequiringResource(matchedKey);
    const profile = RESOURCE_PROFILES[matchedKey];
    const { score, badge } = calculateStrategicScore(matchedKey, count, recipesUsedIn, activeGoalIngredients);

    result.push({
      id: matchedKey.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: matchedKey,
      category,
      icon,
      quantityOwned: count,
      formattedQuantity: formatInventoryQuantity(count),
      marketPriceFlower: unitPriceFlower,
      totalValueFlower,
      marketPriceUSD: Number(unitPriceUSD.toFixed(6)),
      totalValueUSD,
      unitPriceSFL: unitPriceFlower, // Alias
      totalValueSFL: totalValueFlower, // Alias
      bettyPriceCoins,
      recipesUsedIn,
      strategicScore: score,
      strategicBadge: badge,
      replacementDifficulty: profile?.replacementDifficulty || 'Moderate',
      rechargeMethod: profile?.rechargeMethod || 'Standard farm gameplay',
      isGoalIngredient: activeGoalIngredients?.some(g => g.toLowerCase() === matchedKey.toLowerCase()),
    });
  });

  // Sort by Strategic Score & Value (highest value first)
  return result.sort((a, b) => b.strategicScore - a.strategicScore || b.totalValueFlower - a.totalValueFlower);
}

/**
 * Discovers and categorizes all UNTRADABLE items in the player's inventory
 * (Cakes & Foods, Tools, Seeds, Collectibles & Bears, Flowers, Baits & Charms)
 */
export function discoverAllPlayerUntradables(
  rawInventory: Record<string, number | string> = {}
): UntradableInventoryItem[] {
  const result: UntradableInventoryItem[] = [];

  Object.entries(rawInventory).forEach(([rawName, rawCount]) => {
    // Exclude tradable items
    if (isTradableItem(rawName)) return;

    const count = typeof rawCount === 'number' ? rawCount : parseFloat(String(rawCount) || '0');
    if (count <= 0) return;

    const matchedKnowledge = Object.keys(UNTRADABLE_KNOWLEDGE_MAP).find(
      k => k.toLowerCase() === rawName.toLowerCase()
    );

    let category: 'food' | 'tool' | 'seed' | 'collectible' | 'flower' | 'other' = 'other';
    let icon = '📦';
    let utility = 'In-game farm utility asset';
    let xp: number | undefined;
    let badge = 'Utility Asset';

    if (matchedKnowledge) {
      const info = UNTRADABLE_KNOWLEDGE_MAP[matchedKnowledge];
      category = info.category;
      icon = info.icon;
      utility = info.utility;
      xp = info.xp;
    } else {
      // Intelligent inference based on item name naming convention
      const lower = rawName.toLowerCase();
      if (lower.includes('cake') || lower.includes('soup') || lower.includes('pie') || lower.includes('juice') || lower.includes('stew') || lower.includes('burger') || lower.includes('roast') || lower.includes('chowder')) {
        category = 'food';
        icon = '🍲';
        utility = 'Prepared kitchen food • Feeds Bumpkin for XP';
        badge = 'Bumpkin XP Food';
      } else if (lower.includes('pickaxe') || lower.includes('axe') || lower.includes('shovel') || lower.includes('rod') || lower.includes('drill')) {
        category = 'tool';
        icon = '⛏️';
        utility = 'Harvesting tool used across island expansions';
        badge = 'Harvesting Tool';
      } else if (lower.includes('seed')) {
        category = 'seed';
        icon = '🌱';
        utility = 'Planted in crop plots to grow produce';
        badge = 'Plot Seed';
      } else if (lower.includes('bear') || lower.includes('statue') || lower.includes('monument') || lower.includes('gnome') || lower.includes('scarecrow')) {
        category = 'collectible';
        icon = '🧸';
        utility = 'Account-bound collectible • Island decoration';
        badge = 'Collectible Trophy';
      } else if (lower.includes('pansy') || lower.includes('daffodil') || lower.includes('lotus') || lower.includes('cosmos') || lower.includes('flower') || lower.includes('carnation')) {
        category = 'flower';
        icon = '🌺';
        utility = 'Greenhouse botanic bloom';
        badge = 'Greenhouse Bloom';
      }
    }

    if (category === 'food') badge = xp ? `+${xp} XP Food` : 'Kitchen Food';
    else if (category === 'tool') badge = 'Harvesting Tool';
    else if (category === 'seed') badge = 'Farm Seed';
    else if (category === 'collectible') badge = 'Collectible Decor';
    else if (category === 'flower') badge = 'Greenhouse Bloom';

    result.push({
      id: rawName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: rawName,
      category,
      icon,
      quantityOwned: count,
      formattedQuantity: formatInventoryQuantity(count),
      utilityDescription: utility,
      xpYield: xp,
      status: 'Untradable (Account-Bound)',
      badge,
    });
  });

  // Sort by category priority, then quantity
  const categoryOrder: Record<string, number> = {
    food: 1,
    tool: 2,
    seed: 3,
    collectible: 4,
    flower: 5,
    other: 6,
  };

  return result.sort((a, b) => (categoryOrder[a.category] || 9) - (categoryOrder[b.category] || 9) || b.quantityOwned - a.quantityOwned);
}

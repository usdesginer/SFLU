export type ItemCategory = 
  | 'crop' 
  | 'fruit' 
  | 'flower' 
  | 'resource' 
  | 'animal' 
  | 'craftable' 
  | 'food' 
  | 'tool';

export interface SFLItem {
  id: string;
  name: string;
  category: ItemCategory;
  icon: string; // Emoji or asset symbol
  description: string;
  buyPriceSFL?: number; // seed / tool cost in SFL
  buyPriceCoins?: number; // cost in Coins if applicable
  bettyPriceSFL: number; // base NPC shop sell price
  marketPriceSFL: number; // dynamic / P2P market price
  marketPriceChange24h: number; // percentage change, e.g. +4.5%
  trend: 'rising' | 'falling' | 'stable';
  growthTimeMinutes?: number; // for crops, trees, flowers
  bumpkinXP?: number; // XP granted on harvest/craft
  inputRequirements?: Record<string, number>; // items needed to produce
  energyCost?: number; // stamina or tool wear
  seasonalPopularity?: 'hot' | 'normal' | 'cool';
}

export interface FarmInventory {
  [itemId: string]: number;
}

export interface FarmState {
  farmId: number | string;
  ownerName: string;
  level: number;
  bumpkinExperience: number;
  bumpkinLevel: number;
  sflBalance: number;
  coinsBalance: number;
  inventory: FarmInventory;
  plots: {
    total: number;
    unlocked: number;
    activeCrops: { cropId: string; readyAt: string }[];
  };
  greenhouse: {
    unlocked: boolean;
    activeFlowers: { flowerId: string; readyAt: string }[];
  };
  animals: {
    chickens: number;
    cows: number;
    sheep: number;
    pigs?: number;
    sickChickens?: number;
    fedState: boolean;
    henHouseLevel?: number;
    barnLevel?: number;
  };
  buildings: {
    waterWell: number;
    barn: number;
    henHouse: number;
    bakery: number;
    deli: number;
    smoothieShack: number;
    composter?: number;
    manor?: number;
  };
  craftingQueue?: {
    id: string;
    building: string;
    name: string;
    readyAt: number;
    readyTimeText?: string;
  }[];
  island?: {
    type: string;
    expansions: number;
    sunstones: number;
  };
  collectibles?: Record<string, number>;
  historicalValueGrowth: {
    date: string;
    totalValueSFL: number;
    netProfitSFL: number;
  }[];
  isLiveApi?: boolean;
  updatedAt?: number;
  nftId?: number;
  isBlacklisted?: boolean;
  walletAddress?: string;
  bumpkinSkills?: Record<string, number>;
  liveOrders?: {
    id: string;
    from: string;
    items: Record<string, number>;
    reward: { sfl?: number; coins?: number };
    readyAt: number;
  }[];
  rawInventory?: Record<string, string>;
}

export interface ProfitRankedItem extends SFLItem {
  netProfitPerUnit: number;
  profitPerHour: number;
  roiPercentage: number;
  profitPerPlot: number;
  profitEfficiencyScore: number; // 0-100 rating
}

export type ProfitValuationPreference =
  | 'best_bid'
  | 'completed_sales'
  | 'npc_baseline'
  | 'lowest_ask'
  | 'weighted_blended';

export interface MultiSourceValuation {
  bestBidFlower: number;
  completedSalesFlower: number;
  npcBaselineFlower: number;
  lowestAskFlower: number;
  historicalAvgFlower: number;
  userAcquisitionCostFlower: number;
  weightedBlendedFlower: number;
}

export interface ValuationSourceSnapshot {
  finishedPriceFlower: number;            // V_p
  netProceedsFlower: number;              // P_net = V_p - C_tx
  inputCostFlower: number;                // C_inputs = sum(Q_i * V_i)
  productionCostFlower: number;           // C_production
  transactionCostFlower: number;          // C_tx
  valueAddedFlower: number;               // VA = V_p - sum(Q_i * V_i)
  netProfitFlower: number;                // NP = P_net - C_inputs - C_production
  roiPercent: number;                     // ROI = (NP / (C_inputs + C_production)) * 100
  profitPerHourFlower: number;            // PPH = NP / EffectiveProductionTimeHours
}

export interface ProductLiquidityInfo {
  liquidityStatus:
    | 'High Liquidity · Instant Execution'
    | 'Active Order Book · Tight Spread'
    | 'Thin Liquidity · Wide Spread'
    | 'Internal Farm Utility';
  bidAskSpreadPercent: number;
  dailyVolumeUnits: number;
  canRealisticallySell: boolean;
  liquidityNote: string;
}

export interface ProductXPAnalytics {
  bumpkinXP: number;
  flowerNetReturn: number;
  flowerPerXP: number;
  xpPerHour: number;
  estimatedTimeFormatted: string;
  progressionRelevance: string;
  levelProgressPercent: number;
}

export interface IngredientCostDetail {
  itemId: string;
  name: string;
  icon: string;
  needed: number;
  have: number;
  missing: number;
  unitPriceFlower: number;
  totalOpportunityCostFlower: number;
  missingAcquisitionCostFlower: number;
  isSatisfied: boolean;
  isReservedForMilestone?: boolean;
  milestoneNote?: string;
  valuations?: MultiSourceValuation;
}

export type ProductionTimeType = 'Instant' | 'Active' | 'Processing' | 'Passive' | 'Cooldown';

export type TimeValuationMode = 'zero' | 'facility_capacity' | 'custom_hourly';

export type EconomicEngineType = 'TRADEABLE_PROFIT_ENGINE' | 'CONSUMABLE_XP_ENGINE';

export type XPRankingCriterion =
  | 'lowest_cost_per_xp'
  | 'highest_xp_per_flower'
  | 'highest_xp_per_hour'
  | 'lowest_missing_acquisition'
  | 'best_inventory_utilization';

export interface ConsumableEconomicsModel {
  isNonTradeableConsumable: boolean;
  ingredientCostFlower: number;             // e.g. 0.3660 FLOWER for Cheese (3 × 0.1220 Milk)
  additionalFeesFlower: number;             // C_fees (0.0000 FLOWER if no direct fee)
  processingDurationHours: number;          // T in hours (e.g. 2.0h for Cheese)
  verifiedXpReward: number;                 // XP_gained (verified game reward)
  costPerXpMaterialOnly: number;            // C_inputs / XP_gained
  xpPerFlowerMaterialOnly: number;          // XP_gained / C_inputs
  xpPerProductionHour: number;              // XP_gained / T
  missingAcquisitionCostFlower: number;     // Cost to acquire missing inputs
  inventoryUtilizationPercent: number;      // R_i %
  marketSellingValueStatus: string;         // 'Non-tradeable · Not applicable'
  farmIqInterpretation: string;             // Exact progression interpretation
  distinctionSummary: string;               // "A production investment for Bumpkin progression, not a market-selling profit opportunity."
}

export interface ProductionTimeProfile {
  primaryTimeType: ProductionTimeType;
  timeTypeMeaning: string;
  isInstant: boolean;
  activeInteractionMinutes: number;         // Requires player interaction (queuing, collecting)
  processingDurationMinutes: number;        // Building is occupied while processing (e.g. Cheese 120m in Deli)
  passiveDurationMinutes: number;           // Time passes without continuous interaction (e.g. Greenhouse / Plots)
  cooldownDurationMinutes: number;          // A facility or resource node must recover (e.g. Tree 120m, Stone 240m)
  totalElapsedMinutes: number;              // Wall-clock duration
  billableFacilityHours: number;            // T (in hours) used for C_time = T * R (0 for Instant)
  facilityCapacityRateFlowerPerHr: number;  // Default facility capacity shadow rate (e.g. 0.10 FLOWER/hr)
  defaultCustomRateFlowerPerHr: number;     // Default custom hourly planning rate (0.10 FLOWER/hr)
  economicDistinctionNote: string;          // Explains why elapsed processing time is occupied capacity, not cash expense
}

export interface ProductionFinancials {
  grossProductValueFlower: number;        // V_p (Finished product value)
  grossProductValueUSD: number;
  netProceedsFlower?: number;             // P_net = V_p - MarketTransactionCost
  inputOpportunityCostFlower: number;     // C_inputs = sum(Q_i * V_i) (4-decimal precision available)
  inputOpportunityCostExactFlower?: number; // Exact 4-decimal ingredient cost (e.g. 0.3660 FLOWER for 3 Milk)
  ownedInputsValueFlower: number;         // Value of inputs already owned by farmer
  missingInputsCostFlower: number;        // Market cost to purchase missing ingredients
  valueAddedFlower: number;               // VA = V_p - sum(Q_i * V_i)
  productionFeeFlower: number;            // C_production (Additional production/building cost)
  marketFeeFlower: number;                // C_tx (Market transaction cost)
  totalEconomicCostFlower: number;        // C_inputs + C_production + C_tx
  estimatedNetProfitFlower: number;       // NP = P_net - C_inputs - C_production
  estimatedNetProfitUSD: number;
  roiPercent?: number;                    // ROI = (NP / (C_inputs + C_production)) * 100
  netMarginPercent: number;               // (NP / V_p) * 100
  valueAddedMultiplier: number;           // V_p / C_inputs
  profitPerHourFlower: number;            // PPH = NP / EffectiveProductionTimeHours
  passiveTimeMinutes?: number;
  activeInteractionMinutes?: number;
  effectiveProductionTimeMinutes?: number;
  timeProfile?: ProductionTimeProfile;
  economicEngine?: EconomicEngineType;
  consumableModel?: ConsumableEconomicsModel;
  productValuations?: MultiSourceValuation;
  valuationsBySource?: Record<ProfitValuationPreference, ValuationSourceSnapshot>;
  liquidityInfo?: ProductLiquidityInfo;
  xpAnalytics?: ProductXPAnalytics;
  // Missing Resource Margin Preservation Analysis
  netProfitAfterAcquisitionFlower?: number;
  marginPreservedPercent?: number;
  isAcquisitionProfitable?: boolean;
  marginPreservationVerdict?: string;
}

export type OpportunityGroupType = 'READY_TO_PRODUCE' | 'ALMOST_READY' | 'STRATEGIC_OPPORTUNITY';

export type ExecutionReadinessStatus =
  | 'FULLY_EXECUTABLE'
  | 'INGREDIENTS_READY_FACILITY_BLOCKED'
  | 'FACILITY_READY_MISSING_INGREDIENTS'
  | 'BLOCKED';

export interface ProductionReadinessChecks {
  buildingUnlocked: boolean;
  buildingAvailable: boolean;
  recipeVerified: boolean;
  capacityAvailable: boolean;
  prerequisitesSatisfied: boolean;
  prerequisiteNote?: string;
}

export interface ProductionExecutionIntel {
  buildingRequired: string;
  isBuildingUnlocked: boolean;
  levelRequired: number;
  isLevelMet: boolean;
  productionTimeMinutes: number;
  productionTimeFormatted: string;
  maxCraftableBatches: number;
  realizationChannel: string;
  demandLevel: 'Very High' | 'High' | 'Moderate' | 'Low';
  saleConfidencePercent: number;
  decisionVerdict: 'PRODUCE_NOW' | 'GATHER_MISSING' | 'SELL_RAW_INSTEAD' | 'HOLD_FOR_MILESTONE';
  decisionVerdictLabel: string;
  decisionReason: string;
  opportunityScore: number;               // 0-100 composite production score
  // Feature One: Intelligent Product Discovery Engine fields
  opportunityGroup: OpportunityGroupType;
  strategicCategoryReason?: string;
  ingredientReadinessPercent: number;     // R_i = (Available required / Total required) * 100
  availableRequiredQuantity: number;
  totalRequiredQuantity: number;
  satisfiedIngredientCount: number;
  totalIngredientCount: number;
  productionReadinessPercent: number;     // R_p = % of 5 facility/prerequisite checks passed
  productionChecks: ProductionReadinessChecks;
  executionStatus: ExecutionReadinessStatus;
  executionStatusLabel: string;
  // 4-Category Economic Model & Non-Mutually-Exclusive Properties
  economicEngine?: EconomicEngineType;
  isTradeableOutput?: boolean;
  outputType?: 'resource' | 'tool' | 'food' | 'crop' | 'animal_product' | 'craftable';
  economicCategory?:
    | 'CATEGORY_1_TRADEABLE_RESOURCE'
    | 'CATEGORY_2_CRAFTABLE_TRADEABLE'
    | 'CATEGORY_3_CONSUMABLE_XP'
    | 'CATEGORY_4_TIME_BASED';
  economicCategoryLabel?: string;
  economicUtility?: ('market_value' | 'production_profit' | 'xp_utility' | 'time_cost' | 'tool_extraction')[];
  recursiveCostCoinsWithDiscount?: number;
  recursiveCostCoinsWithoutDiscount?: number;
}

export interface PersonalOpportunity {
  id: string;
  targetItem: SFLItem;
  readinessPercentage: number;
  missingRequirements: { itemId: string; name: string; needed: number; have: number }[];
  currentEstimatedValue: number;          // Input opportunity cost (V_inputs)
  potentialMarketValue: number;           // Gross product value (V_finished)
  netValueGain: number;                   // Value Added (V_finished - V_inputs)
  estimatedNetProfit?: number;            // True Net Production Profit after all costs
  ingredientLedger?: IngredientCostDetail[];
  financials?: ProductionFinancials;
  executionIntel?: ProductionExecutionIntel;
  alternativeOptions: {
    action: string;
    immediateValueSFL: number;
    netProfitFlower?: number;
    timeframe?: string;
    pros: string;
    cons: string;
    isRecommended?: boolean;
  }[];
  recommendation: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface MissionFinancials {
  grossRewardFlower: number;
  inputCostFlower: number;
  netProfitFlower: number;
  netProfitUSD: number;
  roiPercent: number;
  profitPerHour?: number;
  priceSource: string;
  priceBenchmark: string;
}

export interface ChecklistStep {
  stepNumber: number;
  title: string;
  detail: string;
  isCompleted?: boolean;
}

export interface MissionExecution {
  steps: string[];
  checklistSteps?: ChecklistStep[];
  primaryMetricLabel?: string;
  primaryMetricValue?: string;
  targetAction: string;
  nextRecommendedAction: string;
  inventoryConsumed: string;
  inventoryProduced: string;
  actionTab?: 'overview' | 'profit-radar' | 'market-watch' | 'resource-strategy' | 'farm-vs-market';
  actionButtonLabel?: string;
  resourceTab?: 'overview' | 'profit-radar' | 'market-watch' | 'resource-strategy' | 'farm-vs-market';
  resourceButtonLabel?: string;
}

export interface MissionScoreFactors {
  profitScore: number;       // P (0-100)
  timeScore: number;         // T (0-100)
  urgencyScore: number;      // U (0-100)
  readinessScore: number;    // R (0-100)
  xpScore: number;           // X (0-100)
  marketScore: number;       // M (0-100)
  finalScore: number;        // Composite Score (0-100)
  rankTier: 'Critical' | 'High' | 'Medium' | 'Low';
  durationMinutes: number;   // Estimated completion time
}

export interface DailyMission {
  id: string;
  title: string;
  category: 'harvest' | 'delivery' | 'craft' | 'animal' | 'save';
  urgencyLevel: 'urgent' | 'high-roi' | 'strategic' | 'optional';
  urgencyLabel: string;
  timeHorizon: string;
  description: string;
  progressCurrent: number;
  progressTarget: number;
  unit: string;
  estimatedProfitSFL: number;
  netProfitFlower: number;
  grossProfitFlower?: number;
  xpReward: number;
  isCompleted: boolean;
  reason: string;
  financials: MissionFinancials;
  execution: MissionExecution;
  autoVerified: boolean;
  verificationBadge: string;
  verificationDetail: string;
  missionScore?: MissionScoreFactors;
}

export interface PriceAlert {
  id: string;
  itemId: string;
  itemName: string;
  targetPrice: number;
  condition: 'above' | 'below';
  currentPrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface ResourceAdvice {
  resourceId: string;
  resourceName: string;
  currentAmount: number;
  options: {
    title: string;
    actionType: 'sell' | 'expand' | 'craft' | 'chain';
    expectedReturnSFL: number;
    timeframe: 'Instant' | 'Short-term (1-2d)' | 'Long-term (1-2w)';
    roiGrade: 'A+' | 'A' | 'B' | 'C';
    breakdown: string;
    recommendationNote: string;
  }[];
  verdict: {
    bestAction: string;
    summary: string;
    opportunityCostWarning?: string;
  };
}

export interface BenchmarkComparison {
  playerFarmId: string | number;
  playerLevel: number;
  peerCohort: string; // e.g. "Level 40-45 Farmers"
  weeklyProfitGrowth: number; // percentage
  peerMedianProfitGrowth: number; // percentage
  percentileRank: number; // e.g. Top 22%
  efficiencyScore: number; // 0 - 100
  topStrength: string;
  biggestMissedOpportunity: string;
  potentialMissedSFL: number;
  actionableTip: string;
}

export interface SimulationResult {
  strategyName: string;
  durationDays: number;
  initialInvestmentSFL: number;
  totalGrossYieldSFL: number;
  netProfitSFL: number;
  roiPercentage: number;
  hourlyEfficiency: number;
  riskRating: 'Low' | 'Medium' | 'High';
  timelineData: { day: string; invested: number; returnCumulative: number; netProfit: number }[];
  resourceConsumptionSummary: { itemName: string; amount: number }[];
  keyAdvice: string;
}


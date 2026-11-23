'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Crosshair, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Layers, 
  Zap,
  Clock,
  Building2,
  Scale,
  Calculator,
  ShieldAlert,
  Filter,
  ArrowUpDown,
  Lock,
  Unlock,
  Check,
  XCircle,
  Compass,
  PackageCheck,
  AlertTriangle,
  Wrench,
  Award,
  SlidersHorizontal,
  GitBranch,
  Database,
  Coins,
  TrendingDown
} from 'lucide-react';
import {
  FarmState,
  PersonalOpportunity,
  OpportunityGroupType,
  ExecutionReadinessStatus,
  ProfitValuationPreference,
  TimeValuationMode,
  XPRankingCriterion,
} from '../../types';
import { getPersonalOpportunities } from '../../lib/profitEngine';
import { fetchGameMechanics } from '../../lib/farmService';
import {
  getCompleteRecursiveResourceTable,
  calculateRecursiveResourceCost,
  extractFarmSkillModifiers,
  PRODUCTION_RECIPES_TABLE,
  PRODUCTION_RECIPE_INPUTS_TABLE,
  COINS_PER_FLOWER_RATE,
  TIME_TYPE_DEFINITIONS,
  TIME_VALUATION_SETTINGS,
  calculateTimeOpportunityCost,
} from '../../lib/recursiveCostEngine';

interface FarmVsMarketViewProps {
  farm: FarmState;
  onNavigate: (tabId: any) => void;
  marketplaceData?: any;
}

type SortStrategy = 'smart' | 'net_profit' | 'value_added' | 'roi' | 'hourly_velocity' | 'gross_value';
type GroupFilter = 'ALL' | OpportunityGroupType;

const VALUATION_PREFERENCES: {
  id: ProfitValuationPreference;
  label: string;
  shortLabel: string;
  subtitle: string;
  badge?: string;
}[] = [
  {
    id: 'best_bid',
    label: 'Best Executable Buy Bid',
    shortLabel: 'Best Executable Bid',
    subtitle: 'Conservative immediate-sale estimate (highest active buyer offer)',
    badge: 'Recommended',
  },
  {
    id: 'completed_sales',
    label: 'Recent Completed Sales',
    shortLabel: 'Completed Sales',
    subtitle: 'Historical market evidence from verified trade executions',
  },
  {
    id: 'npc_baseline',
    label: 'NPC Shop Baseline',
    shortLabel: 'NPC Baseline',
    subtitle: 'Alternative fixed baseline valuation floor',
  },
  {
    id: 'lowest_ask',
    label: 'Lowest Active Sell Listing',
    shortLabel: 'Lowest Sell Listing',
    subtitle: 'Market asking-price reference (current order book floor)',
  },
  {
    id: 'weighted_blended',
    label: 'Weighted Market Valuation',
    shortLabel: 'Weighted Blended',
    subtitle: 'Blended estimate (40% Best Bid + 35% Completed Sales + 25% Lowest Ask)',
  },
];

export default function FarmVsMarketView({ farm, onNavigate, marketplaceData }: FarmVsMarketViewProps) {
  const commodities = marketplaceData?.commodities;
  const flowerPriceUSD = marketplaceData?.flowerPriceUSD || 0.1504;
  const rawOpportunities = useMemo(
    () => getPersonalOpportunities(farm, commodities, flowerPriceUSD),
    [farm, commodities, flowerPriceUSD]
  );

  // RRCE (Recursive Resource Cost Engine) Interactive State
  const farmSkillModifiers = useMemo(() => extractFarmSkillModifiers(farm), [farm]);
  const [applyAxeSkillDiscount, setApplyAxeSkillDiscount] = useState<boolean>(true);
  const [woodYieldPerAxe, setWoodYieldPerAxe] = useState<number>(1); // 1 for 1:1 benchmark (16->68->360->1880->5740), or 3 for amortized multi-yield
  const [selectedChainResourceId, setSelectedChainResourceId] = useState<string>('crimstone');
  const [showDatabaseSchema, setShowDatabaseSchema] = useState<boolean>(false);

  // Compute live 5-tier Recursive Resource Table via RRCE
  const recursiveResourceRows = useMemo(
    () =>
      getCompleteRecursiveResourceTable({
        applyAxeSkillDiscount,
        woodYieldPerAxe,
        commodities,
      }),
    [applyAxeSkillDiscount, woodYieldPerAxe, commodities]
  );

  // Compute full recursive dependency tree for selected resource (default: Crimstone)
  const activeRecursiveTree = useMemo(
    () =>
      calculateRecursiveResourceCost(selectedChainResourceId, {
        applyAxeSkillDiscount,
        woodYieldPerAxe,
        commodities,
      }),
    [selectedChainResourceId, applyAxeSkillDiscount, woodYieldPerAxe, commodities]
  );

  const [valuationPref, setValuationPref] = useState<ProfitValuationPreference>('best_bid');
  const [sortBy, setSortBy] = useState<SortStrategy>('smart');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('ALL');
  const [selectedOppId, setSelectedOppId] = useState<string>(rawOpportunities[0]?.id || 'opp-cheese');
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [simulatedBusyFacilities, setSimulatedBusyFacilities] = useState<Record<string, boolean>>({});
  const [enableCustomXpValuation, setEnableCustomXpValuation] = useState<boolean>(false);
  const [customFlowerPer100Xp, setCustomFlowerPer100Xp] = useState<number>(0.25);

  // Feature Four: Time Opportunity Cost Engine — Defaults to 'zero' (Zero fees for cooking time in SFL = 0.0000 FLOWER)
  const [timeValuationMode, setTimeValuationMode] = useState<TimeValuationMode>('zero');
  const [customHourlyRateFlower, setCustomHourlyRateFlower] = useState<number>(0.00);

  // Official Sunflower Land Game Mechanics API Sync State
  const [liveMechanics, setLiveMechanics] = useState<any>(null);
  useEffect(() => {
    let mounted = true;
    fetchGameMechanics(farm.farmId)
      .then((data) => {
        if (mounted && data) setLiveMechanics(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [farm.farmId]);

  const activePrefMeta =
    VALUATION_PREFERENCES.find((p) => p.id === valuationPref) || VALUATION_PREFERENCES[0];

  const toggleFacilityBusy = (oppId: string) => {
    setSimulatedBusyFacilities((prev) => ({
      ...prev,
      [oppId]: !prev[oppId],
    }));
  };

  // Helper to get valuation snapshot for any opportunity under the active Profit Valuation Preference
  const getOppSnapshot = (opp: PersonalOpportunity) => {
    const snap = opp.financials?.valuationsBySource?.[valuationPref];
    if (snap) return snap;
    const f = opp.financials;
    return {
      finishedPriceFlower: f?.grossProductValueFlower ?? opp.potentialMarketValue,
      netProceedsFlower: f?.netProceedsFlower ?? opp.potentialMarketValue,
      inputCostFlower: f?.inputOpportunityCostFlower ?? opp.currentEstimatedValue,
      productionCostFlower: f?.productionFeeFlower ?? 0,
      transactionCostFlower: f?.marketFeeFlower ?? 0,
      valueAddedFlower: f?.valueAddedFlower ?? opp.netValueGain,
      netProfitFlower: f?.estimatedNetProfitFlower ?? opp.netValueGain,
      roiPercent: f?.roiPercent ?? 100,
      profitPerHourFlower: f?.profitPerHourFlower ?? 1,
    };
  };

  const sortList = (list: PersonalOpportunity[]) => {
    return [...list].sort((a, b) => {
      const snapA = getOppSnapshot(a);
      const snapB = getOppSnapshot(b);
      if (sortBy === 'net_profit') return snapB.netProfitFlower - snapA.netProfitFlower;
      if (sortBy === 'value_added') return snapB.valueAddedFlower - snapA.valueAddedFlower;
      if (sortBy === 'roi') return snapB.roiPercent - snapA.roiPercent;
      if (sortBy === 'hourly_velocity') return snapB.profitPerHourFlower - snapA.profitPerHourFlower;
      if (sortBy === 'gross_value') return snapB.finishedPriceFlower - snapA.finishedPriceFlower;
      return (b.executionIntel?.opportunityScore || 0) - (a.executionIntel?.opportunityScore || 0);
    });
  };

  const groupedOpportunities = useMemo(() => {
    const readyToProduce = sortList(
      rawOpportunities.filter((o) => o.executionIntel?.opportunityGroup === 'READY_TO_PRODUCE')
    );
    const almostReady = sortList(
      rawOpportunities.filter((o) => o.executionIntel?.opportunityGroup === 'ALMOST_READY')
    );
    const strategic = sortList(
      rawOpportunities.filter((o) => o.executionIntel?.opportunityGroup === 'STRATEGIC_OPPORTUNITY')
    );

    return {
      readyToProduce,
      almostReady,
      strategic,
    };
  }, [rawOpportunities, sortBy, valuationPref]);

  const activeOpp =
    rawOpportunities.find((o) => o.id === selectedOppId) ||
    rawOpportunities[0];

  const handleSelectOpp = (id: string) => {
    setSelectedOppId(id);
    setBatchMultiplier(1);
  };

  const summaryStats = useMemo(() => {
    const readyList = rawOpportunities.filter(
      (o) => o.executionIntel?.opportunityGroup === 'READY_TO_PRODUCE'
    );
    const almostList = rawOpportunities.filter(
      (o) => o.executionIntel?.opportunityGroup === 'ALMOST_READY'
    );
    const strategicList = rawOpportunities.filter(
      (o) => o.executionIntel?.opportunityGroup === 'STRATEGIC_OPPORTUNITY'
    );

    const totalReadyNetProfit = readyList.reduce(
      (sum, o) => sum + getOppSnapshot(o).netProfitFlower,
      0
    );

    return {
      totalCount: rawOpportunities.length,
      readyCount: readyList.length,
      almostCount: almostList.length,
      strategicCount: strategicList.length,
      totalReadyNetProfit: Number(totalReadyNetProfit.toFixed(2)),
    };
  }, [rawOpportunities, valuationPref]);

  const fin = activeOpp?.financials;
  const intel = activeOpp?.executionIntel;
  const ledger = activeOpp?.ingredientLedger || [];
  const missingItems = ledger.filter((i) => !i.isSatisfied);
  const activeSnap = activeOpp ? getOppSnapshot(activeOpp) : null;
  const prodVals = fin?.productValuations;
  const liq = fin?.liquidityInfo;
  const xpInfo = fin?.xpAnalytics;

  const isFacilitySimulatedBusy = Boolean(activeOpp && simulatedBusyFacilities[activeOpp.id]);

  const activeProductionChecks = useMemo(() => {
    const base = intel?.productionChecks || {
      buildingUnlocked: true,
      buildingAvailable: true,
      recipeVerified: true,
      capacityAvailable: true,
      prerequisitesSatisfied: true,
    };
    return {
      ...base,
      buildingAvailable: isFacilitySimulatedBusy ? false : base.buildingAvailable,
      capacityAvailable: isFacilitySimulatedBusy ? false : base.capacityAvailable,
    };
  }, [intel, isFacilitySimulatedBusy]);

  const activeProductionReadinessPercent = useMemo(() => {
    const passed = [
      activeProductionChecks.buildingUnlocked,
      activeProductionChecks.buildingAvailable,
      activeProductionChecks.recipeVerified,
      activeProductionChecks.capacityAvailable,
      activeProductionChecks.prerequisitesSatisfied,
    ].filter(Boolean).length;
    return Math.round((passed / 5) * 100);
  }, [activeProductionChecks]);

  const activeIngredientReadinessPercent = intel?.ingredientReadinessPercent ?? activeOpp?.readinessPercentage ?? 100;

  const activeExecutionState = useMemo((): {
    status: ExecutionReadinessStatus;
    label: string;
    shortBadge: string;
    tone: 'emerald' | 'amber' | 'sky' | 'rose';
  } => {
    if (activeIngredientReadinessPercent >= 100 && activeProductionReadinessPercent >= 100) {
      return {
        status: 'FULLY_EXECUTABLE',
        label: 'Fully Executable · Ingredients & Production Facility Ready',
        shortBadge: 'Fully Executable',
        tone: 'emerald',
      };
    }
    if (activeIngredientReadinessPercent >= 100 && activeProductionReadinessPercent < 100) {
      return {
        status: 'INGREDIENTS_READY_FACILITY_BLOCKED',
        label: isFacilitySimulatedBusy
          ? `Ingredients Ready (100%), Blocked (${intel?.buildingRequired} Queue Busy)`
          : `Ingredients Ready (100%), Blocked (${intel?.productionChecks?.prerequisiteNote || 'Facility Locked'})`,
        shortBadge: 'Ingredients Ready · Facility Blocked',
        tone: 'amber',
      };
    }
    if (activeIngredientReadinessPercent < 100 && activeProductionReadinessPercent >= 100) {
      return {
        status: 'FACILITY_READY_MISSING_INGREDIENTS',
        label: `Production Facility Ready · Missing ${missingItems.length} Ingredient${missingItems.length === 1 ? '' : 's'}`,
        shortBadge: 'Facility Ready · Missing Inputs',
        tone: 'sky',
      };
    }
    return {
      status: 'BLOCKED',
      label: 'Blocked · Missing Ingredients & Facility/Crafting Prerequisites',
      shortBadge: 'Blocked',
      tone: 'rose',
    };
  }, [
    activeIngredientReadinessPercent,
    activeProductionReadinessPercent,
    isFacilitySimulatedBusy,
    intel,
    missingItems.length,
  ]);

  const maxBatches = Math.max(1, intel?.maxCraftableBatches || 1);
  const effectiveMultiplier = Math.min(batchMultiplier, Math.max(10, maxBatches));

  const scaledGross = Number(((activeSnap?.finishedPriceFlower ?? 0) * effectiveMultiplier).toFixed(2));
  const scaledNetProceeds = Number(((activeSnap?.netProceedsFlower ?? 0) * effectiveMultiplier).toFixed(2));
  const scaledInputCost = Number(((activeSnap?.inputCostFlower ?? 0) * effectiveMultiplier).toFixed(2));
  const scaledValueAdded = Number(((activeSnap?.valueAddedFlower ?? 0) * effectiveMultiplier).toFixed(2));
  const scaledProdFee = Number(((activeSnap?.productionCostFlower ?? 0) * effectiveMultiplier).toFixed(2));
  const scaledMarketFee = Number(((activeSnap?.transactionCostFlower ?? 0) * effectiveMultiplier).toFixed(2));
  const scaledNetProfit = Number(((activeSnap?.netProfitFlower ?? 0) * effectiveMultiplier).toFixed(2));
  const scaledNetProfitUSD = Number((scaledNetProfit * flowerPriceUSD).toFixed(2));
  const activeRoiPercent = activeSnap?.roiPercent ?? fin?.roiPercent ?? 100;
  const activePphFlower = activeSnap?.profitPerHourFlower ?? fin?.profitPerHourFlower ?? 1;

  // Feature Four: Time Opportunity Cost Engine evaluation for active product & Cheese benchmark
  const baseExactInputCost = fin?.inputOpportunityCostExactFlower ?? activeSnap?.inputCostFlower ?? 0.3660;
  const activeTimeCostEval = useMemo(
    () =>
      calculateTimeOpportunityCost({
        timeProfile: fin?.timeProfile,
        ingredientCostFlower: baseExactInputCost * effectiveMultiplier,
        productionFeeFlower: scaledProdFee,
        marketFeeFlower: scaledMarketFee,
        mode: timeValuationMode,
        customHourlyRateFlower,
        batchMultiplier: effectiveMultiplier,
      }),
    [
      fin?.timeProfile,
      baseExactInputCost,
      effectiveMultiplier,
      scaledProdFee,
      scaledMarketFee,
      timeValuationMode,
      customHourlyRateFlower,
    ]
  );

  const scaledTimeOpportunityCost = activeTimeCostEval.timeOpportunityCostFlower;
  const scaledCombinedMaterialAndTimeCost = activeTimeCostEval.combinedMaterialAndTimeCostFlower;
  const scaledTimeAdjustedNetProfit = Number(
    (scaledNetProfit - scaledTimeOpportunityCost).toFixed(2)
  );

  // Feature Five: Non-Tradeable Consumable Production Engine (XP Optimization Engine)
  const [xpRankingBy, setXpRankingBy] = useState<XPRankingCriterion>('lowest_cost_per_xp');
  const [additionalCheeseFeeFlower, setAdditionalCheeseFeeFlower] = useState<number>(0);

  const isActiveConsumable =
    intel?.economicEngine === 'CONSUMABLE_XP_ENGINE' ||
    fin?.consumableModel?.isNonTradeableConsumable === true;
  const activeConsumableModel = fin?.consumableModel;

  // Official SFL Zero-Fee Cheese Benchmark (3 × 0.1220 = 0.3660 FLOWER + C_time + C_fees; Zero cooking time fee in SFL = 0.0000 FLOWER)
  const cheeseBenchmarkRate =
    timeValuationMode === 'zero'
      ? 0
      : timeValuationMode === 'facility_capacity'
      ? 0
      : customHourlyRateFlower;
  const cheeseBenchmarkHours = cheeseBenchmarkRate > 0 ? 2 : 0.3333; // 20m (0.33h) official Deli timer; 2h when testing custom planning rate benchmark
  const cheeseBenchmarkTimeCost = Number((cheeseBenchmarkHours * cheeseBenchmarkRate).toFixed(4));
  const cheeseBenchmarkTotalCost = Number(
    (0.3660 + cheeseBenchmarkTimeCost + additionalCheeseFeeFlower).toFixed(4)
  );
  const cheeseBenchmarkXp = 500;
  const cheeseBenchmarkCostPerXp = Number(
    (cheeseBenchmarkTotalCost / cheeseBenchmarkXp).toFixed(6)
  );
  const cheeseBenchmarkXpPerFlower = Number(
    (cheeseBenchmarkXp / Math.max(0.0001, cheeseBenchmarkTotalCost)).toFixed(2)
  );

  // Active item total consumable cost (C_inputs + C_time + C_fees) & XP metrics
  const scaledActiveConsumableTotalCost = Number(
    (
      baseExactInputCost * effectiveMultiplier +
      scaledTimeOpportunityCost +
      additionalCheeseFeeFlower * effectiveMultiplier
    ).toFixed(4)
  );
  const scaledActiveVerifiedXp = (xpInfo?.bumpkinXP || 500) * effectiveMultiplier;
  const activeCostPerXp = Number(
    (scaledActiveConsumableTotalCost / Math.max(1, scaledActiveVerifiedXp)).toFixed(6)
  );
  const activeXpPerFlower = Number(
    (scaledActiveVerifiedXp / Math.max(0.0001, scaledActiveConsumableTotalCost)).toFixed(2)
  );

  // C. Dedicated XP Optimization Engine: Rank all non-tradeable consumables across 5 criteria
  const rankedConsumables = useMemo(() => {
    const consumables = rawOpportunities
      .filter(
        (o) =>
          o.executionIntel?.economicEngine === 'CONSUMABLE_XP_ENGINE' ||
          o.financials?.consumableModel?.isNonTradeableConsumable
      )
      .map((o) => {
        const cm = o.financials?.consumableModel;
        const tp = o.financials?.timeProfile;
        const tEval = calculateTimeOpportunityCost({
          timeProfile: tp,
          ingredientCostFlower: cm?.ingredientCostFlower ?? o.currentEstimatedValue,
          productionFeeFlower: additionalCheeseFeeFlower,
          marketFeeFlower: 0,
          mode: timeValuationMode,
          customHourlyRateFlower,
          batchMultiplier: 1,
        });
        const totalCostFlower = Number(
          (tEval.combinedMaterialAndTimeCostFlower + additionalCheeseFeeFlower).toFixed(4)
        );
        const xp = cm?.verifiedXpReward || o.targetItem.bumpkinXP || 100;
        const costPerXp = Number((totalCostFlower / Math.max(1, xp)).toFixed(6));
        const xpPerFlower = Number((xp / Math.max(0.0001, totalCostFlower)).toFixed(2));
        const xpPerHour = cm?.xpPerProductionHour ?? Number((xp / Math.max(0.25, tEval.durationHours || 1)).toFixed(1));
        const missingCost = cm?.missingAcquisitionCostFlower ?? 0;
        const invUtilization = cm?.inventoryUtilizationPercent ?? o.readinessPercentage;

        return {
          opp: o,
          ingredientCostFlower: cm?.ingredientCostFlower ?? o.currentEstimatedValue,
          timeCostFlower: tEval.timeOpportunityCostFlower,
          feeCostFlower: additionalCheeseFeeFlower,
          totalCostFlower,
          verifiedXp: xp,
          costPerXp,
          xpPerFlower,
          xpPerHour,
          missingCost,
          invUtilization,
          durationFormatted: o.executionIntel?.productionTimeFormatted || '1h 00m',
          building: o.executionIntel?.buildingRequired || 'Kitchen',
        };
      });

    return consumables.sort((a, b) => {
      if (xpRankingBy === 'lowest_cost_per_xp') return a.costPerXp - b.costPerXp;
      if (xpRankingBy === 'highest_xp_per_flower') return b.xpPerFlower - a.xpPerFlower;
      if (xpRankingBy === 'highest_xp_per_hour') return b.xpPerHour - a.xpPerHour;
      if (xpRankingBy === 'lowest_missing_acquisition') {
        if (a.missingCost !== b.missingCost) return a.missingCost - b.missingCost;
        return a.costPerXp - b.costPerXp;
      }
      // best_inventory_utilization
      if (b.invUtilization !== a.invUtilization) return b.invUtilization - a.invUtilization;
      return a.costPerXp - b.costPerXp;
    });
  }, [rawOpportunities, timeValuationMode, customHourlyRateFlower, additionalCheeseFeeFlower, xpRankingBy]);

  const getIngredientUnitPriceByPref = (ing: (typeof ledger)[number]): number => {
    const v = ing.valuations;
    if (!v) return ing.unitPriceFlower;
    if (valuationPref === 'best_bid') return v.bestBidFlower;
    if (valuationPref === 'completed_sales') return v.completedSalesFlower;
    if (valuationPref === 'npc_baseline') return v.npcBaselineFlower;
    if (valuationPref === 'lowest_ask') return v.lowestAskFlower;
    return v.weightedBlendedFlower;
  };

  const renderOpportunityCard = (opp: PersonalOpportunity) => {
    const isSelected = opp.id === activeOpp?.id;
    const oIntel = opp.executionIntel;
    const oLedger = opp.ingredientLedger || [];
    const oMissingCount = opp.missingRequirements.length;
    const isSimBusy = Boolean(simulatedBusyFacilities[opp.id]);
    const snap = getOppSnapshot(opp);
    const isCardConsumable =
      oIntel?.economicEngine === 'CONSUMABLE_XP_ENGINE' ||
      opp.financials?.consumableModel?.isNonTradeableConsumable === true;
    const cardCm = opp.financials?.consumableModel;

    const ingReadiness = oIntel?.ingredientReadinessPercent ?? opp.readinessPercentage;
    const prodReadiness = isSimBusy ? 60 : (oIntel?.productionReadinessPercent ?? 100);
    const isFullyExecutable = ingReadiness >= 100 && prodReadiness >= 100;

    let ingredientSummaryLine = '';
    if (oIntel?.opportunityGroup === 'READY_TO_PRODUCE') {
      if (oLedger.length === 1) {
        ingredientSummaryLine = `${oLedger[0].needed}/${oLedger[0].needed} ${oLedger[0].name} available (${oLedger[0].have} owned)`;
      } else {
        ingredientSummaryLine = `All ${oLedger.length} ingredients available (${oIntel.availableRequiredQuantity}/${oIntel.totalRequiredQuantity} units)`;
      }
    } else if (oIntel?.opportunityGroup === 'ALMOST_READY') {
      const missingDesc = opp.missingRequirements.map((m) => `${m.needed} ${m.name}`).join(', ');
      ingredientSummaryLine = `${ingReadiness}% ready · ${oMissingCount} missing item${oMissingCount === 1 ? '' : 's'} (${missingDesc})`;
    } else {
      ingredientSummaryLine = oIntel?.strategicCategoryReason || `${ingReadiness}% ingredients · Prerequisite required`;
    }

    return (
      <div
        key={opp.id}
        onClick={() => handleSelectOpp(opp.id)}
        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-150 ${
          isSelected
            ? 'bg-[#281e13] border-amber-500/70 shadow-lg shadow-amber-500/10 scale-[1.01]'
            : 'bg-[#18130c] border-amber-500/20 hover:border-amber-500/40 hover:bg-[#20180f]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#120d08] border border-amber-500/25 flex items-center justify-center text-2xl shrink-0">
              {opp.targetItem.icon}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-amber-100 text-sm flex flex-wrap items-center gap-1.5">
                <span className="truncate">{opp.targetItem.name}</span>
                {isCardConsumable ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                    Non-Tradeable · XP Model
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    Tradeable · Profit Model
                  </span>
                )}
              </div>
              <div className="text-xs text-amber-200/75 mt-0.5 truncate font-medium">
                {ingredientSummaryLine}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            {isFullyExecutable ? (
              <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready
              </span>
            ) : ingReadiness >= 100 && prodReadiness < 100 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-300">
                <Lock className="w-3 h-3" />
                Facility Blocked
              </span>
            ) : oIntel?.opportunityGroup === 'ALMOST_READY' ? (
              <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/35 text-amber-300">
                {ingReadiness}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-sky-950/70 border border-sky-500/30 text-sky-300">
                {ingReadiness}% R<sub>i</sub>
              </span>
            )}
          </div>
        </div>

        {/* Dual Engine Micro-Strip: Consumable XP Model vs Tradeable Profit Model */}
        {isCardConsumable && cardCm ? (
          <div className="mt-3 pt-2.5 border-t border-sky-500/15 grid grid-cols-4 gap-1.5 text-center">
            <div className="p-1.5 rounded-lg bg-[#120d08]">
              <div className="text-[8px] font-bold text-amber-300/70 uppercase">Material Cost</div>
              <div className="text-[11px] font-black text-amber-200">
                {cardCm.ingredientCostFlower.toFixed(4)}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-sky-950/35 border border-sky-500/30">
              <div className="text-[8px] font-bold text-sky-300/90 uppercase">XP Reward</div>
              <div className="text-[11px] font-black text-sky-300">
                +{cardCm.verifiedXpReward.toLocaleString()} XP
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#120d08]">
              <div className="text-[8px] font-bold text-emerald-300/70 uppercase">XP / FLOWER</div>
              <div className="text-[11px] font-black text-emerald-400">
                {cardCm.xpPerFlowerMaterialOnly.toFixed(0)}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#120d08]">
              <div className="text-[8px] font-bold text-purple-300/70 uppercase">XP / Hour</div>
              <div className="text-[11px] font-black text-purple-300">
                {cardCm.xpPerProductionHour.toFixed(0)}/h
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-2.5 border-t border-amber-500/15 grid grid-cols-4 gap-1.5 text-center">
            <div className="p-1.5 rounded-lg bg-[#120d08]">
              <div className="text-[8px] font-bold text-amber-300/60 uppercase">Value Added</div>
              <div className="text-[11px] font-black text-amber-300">+{snap.valueAddedFlower.toFixed(2)}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-950/25 border border-emerald-500/20">
              <div className="text-[8px] font-bold text-emerald-300/80 uppercase">Net Profit</div>
              <div className="text-[11px] font-black text-emerald-400">+{snap.netProfitFlower.toFixed(2)}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#120d08]">
              <div className="text-[8px] font-bold text-sky-300/70 uppercase">ROI %</div>
              <div className="text-[11px] font-black text-sky-300">{snap.roiPercent.toFixed(0)}%</div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#120d08]">
              <div className="text-[8px] font-bold text-amber-200/60 uppercase">Profit / Hr</div>
              <div className="text-[11px] font-black text-amber-100">+{snap.profitPerHourFlower.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* SECTION 0: THE 4-CATEGORY ECONOMIC MODEL & RECURSIVE RESOURCE COST ENGINE (RRCE) */}
      {/* ===================================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#241a0e] via-[#20170d] to-[#140f09] border border-amber-500/35 shadow-2xl space-y-6">
        {/* Top Title & API Skill Verification Badge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-amber-500/20">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                <span>Recursive Resource Cost Engine (RRCE) · Core Financial Foundation</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Live Farm Skills Pulled from Sunflower Land API ({farmSkillModifiers.length} Active)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/35 text-sky-300 text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-sky-400" />
                <span>
                  {liveMechanics?.source ? 'Official SFL Mechanics API Synced' : 'Official SFL Game Mechanics (consumables.ts · tools.ts)'} · Zero Cooking Time Fees (0.0000 FLOWER)
                </span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight">
              Farm vs Market — Recursive Production Cost & 4-Category Economic Engine
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/75 leading-relaxed">
              Separates <span className="text-emerald-400 font-semibold">Market Selling Value</span>,{' '}
              <span className="text-amber-300 font-semibold">Recursive Resource Acquisition Cost</span>,{' '}
              <span className="text-rose-300 font-semibold">Production Cost</span>, and{' '}
              <span className="text-sky-300 font-semibold">XP Progression Utility</span> into distinct, non-conflated economic models—traversing the full{' '}
              <strong className="text-amber-100">Axe → Wood → Stone → Iron → Gold → Crimstone</strong> dependency tree with live Bumpkin skill discounts.
            </p>
          </div>

          {/* Toggle Database Schema Inspector */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDatabaseSchema(!showDatabaseSchema)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                showDatabaseSchema
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-[#140f0a] text-amber-200 border-amber-500/30 hover:border-amber-400'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{showDatabaseSchema ? 'Hide RRCE Database Tables' : 'Inspect RRCE Schema & Recipes'}</span>
            </button>
          </div>
        </div>

        {/* 1. The Four Economic Categories Grid (Non-Mutually-Exclusive Properties) */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>1. Four-Category Economic Model (Separate Tradeability, Production Type & Utility Properties)</span>
            </h2>
            <span className="text-[11px] text-amber-200/60">
              Items can belong to multiple operational categories simultaneously
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#140f0a] border border-emerald-500/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-400 uppercase">Category 1 · Tradeable Resources</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">Market Value</span>
              </div>
              <p className="text-[11px] text-amber-100/85 leading-relaxed">
                Raw resources & finished products that can actually be traded (<strong className="text-amber-200">Wood, Stone, Iron, Gold, Crimstone, Milk, Crops</strong>).
              </p>
              <div className="text-[10px] text-emerald-300/80 font-mono pt-1 border-t border-emerald-500/10">
                is_tradeable = true · utility = [market_value]
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#140f0a] border border-amber-500/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-300 uppercase">Category 2 · Craftable Items</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">Production Profit</span>
              </div>
              <p className="text-[11px] text-amber-100/85 leading-relaxed">
                Items consuming resources & Coins during crafting (<strong className="text-amber-200">Axes, Pickaxes, Royal Bouquet</strong>). Must inherit full upstream production cost.
              </p>
              <div className="text-[10px] text-amber-300/80 font-mono pt-1 border-t border-amber-500/10">
                utility = [production_profit, tool_extraction]
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#140f0a] border border-sky-500/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-sky-300 uppercase">Category 3 · Consumable Products</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300">XP Utility</span>
              </div>
              <p className="text-[11px] text-amber-100/85 leading-relaxed">
                Untradable foods, deli products & cooked meals (<strong className="text-amber-200">Cheese, Pumpkin Soup, Cakes</strong>) consumed for Bumpkin XP, not P2P sale.
              </p>
              <div className="text-[10px] text-sky-300/80 font-mono pt-1 border-t border-sky-500/10">
                is_tradeable = false · utility = [xp_utility]
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#140f0a] border border-purple-500/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-300 uppercase">Category 4 · Time-Based Production</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">Time Cost</span>
              </div>
              <p className="text-[11px] text-amber-100/85 leading-relaxed">
                Activities requiring waiting, growing, or node regeneration (<strong className="text-amber-200">2h Tree, 4h Stone, 8h Iron, 24h Gold, 48h Crimstone</strong>).
              </p>
              <div className="text-[10px] text-purple-300/80 font-mono pt-1 border-t border-purple-500/10">
                utility = [time_cost, node_recharge]
              </div>
            </div>
          </div>
        </div>

        {/* 2. Interactive Skill Discount & Tool Yield Controls + Step-by-Step Recursive Chain (A -> E) */}
        <div className="p-5 rounded-2xl bg-[#140f0a] border border-amber-500/30 space-y-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-amber-500/15">
            <div>
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>2. Recursive Resource Acquisition Cost Calculator (Axe → Wood → Stone → Iron → Gold → Crimstone)</span>
              </div>
              <p className="text-[11px] text-amber-200/65 mt-0.5">
                A 4-Coin skill discount on the Axe (20 → 16 Coins) cascades through every downstream mineral—saving 900 Coins on a single Crimstone!
              </p>
            </div>

            {/* Interactive Controls: Skill Discount Toggle & Wood Yield per Axe (Y_wood) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Axe Skill Discount Toggle */}
              <div className="flex items-center gap-1.5 bg-[#1c150e] p-1.5 rounded-xl border border-amber-500/25">
                <span className="text-[10px] font-bold text-amber-300/80 px-2 uppercase">Axe Skill:</span>
                <button
                  onClick={() => setApplyAxeSkillDiscount(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    applyAxeSkillDiscount
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-amber-200/70 hover:text-amber-100'
                  }`}
                >
                  With Skill (16 Coins)
                </button>
                <button
                  onClick={() => setApplyAxeSkillDiscount(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    !applyAxeSkillDiscount
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-amber-200/70 hover:text-amber-100'
                  }`}
                >
                  Without Skill (20 Coins)
                </button>
              </div>

              {/* Wood Yield per Axe (Y_wood) Amortization Selector */}
              <div className="flex items-center gap-1.5 bg-[#1c150e] p-1.5 rounded-xl border border-amber-500/25">
                <span className="text-[10px] font-bold text-amber-300/80 px-2 uppercase">
                  Tool Yield (Y<sub>wood</sub>):
                </span>
                {[
                  { val: 1, label: '1 Wood / Axe (1:1 Benchmark)' },
                  { val: 3, label: '3 Wood / Axe (Amortized Tree)' },
                ].map((y) => (
                  <button
                    key={y.val}
                    onClick={() => setWoodYieldPerAxe(y.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      woodYieldPerAxe === y.val
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-amber-200/70 hover:text-amber-100'
                    }`}
                  >
                    {y.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5-Stage Recursive Production Chain Cards (A. Wood -> B. Stone -> C. Iron -> D. Gold -> E. Crimstone) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {recursiveResourceRows.map((row, idx) => {
              const stageLetters = ['A', 'B', 'C', 'D', 'E'];
              const isSelected = selectedChainResourceId === row.itemId;
              const activeCoins = applyAxeSkillDiscount
                ? row.costCoinsWithDiscount
                : row.costCoinsWithoutDiscount;

              return (
                <div
                  key={row.itemId}
                  onClick={() => setSelectedChainResourceId(row.itemId)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-950/60 to-[#1c150e] border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.01]'
                      : 'bg-[#1c150e] border-amber-500/20 hover:border-amber-500/45'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black text-amber-400 uppercase">
                        Stage {stageLetters[idx]} · {row.name}
                      </span>
                      <span className="text-lg">{row.icon}</span>
                    </div>

                    <div className="text-xl font-black text-amber-50 mt-1.5">
                      {activeCoins.toLocaleString()} <span className="text-xs font-bold text-amber-300">Coins</span>
                    </div>
                    <div className="text-[10px] text-amber-200/55">
                      ≈ {row.costFlowerWithDiscount} FLOWER acquisition cost
                    </div>

                    {/* Tool & Formula Box */}
                    <div className="mt-2.5 p-2 rounded-xl bg-[#120d08] border border-amber-500/15 space-y-1">
                      <div className="text-[10px] font-bold text-amber-200 flex items-center gap-1">
                        <span>{row.toolIcon}</span>
                        <span className="truncate">{row.toolUsed}: {row.recipeDescription}</span>
                      </div>
                      <div className="text-[10px] font-mono text-amber-300/90">
                        {row.formulaSymbolic}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-300 font-bold">
                        = {applyAxeSkillDiscount ? row.formulaWithDiscount : row.formulaWithoutDiscount}
                      </div>
                    </div>
                  </div>

                  {/* Skill Discount Comparison Footer */}
                  <div className="mt-3 pt-2 border-t border-amber-500/15 flex items-center justify-between text-[10px]">
                    <span className="text-amber-200/60">
                      No Skill: <strong className="text-rose-300">{row.costCoinsWithoutDiscount.toLocaleString()}c</strong>
                    </span>
                    <span className="font-black text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                      Saves {row.savingsCoins.toLocaleString()} Coins
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* F. Complete Recursive Resource Cost Table & Visual Skill Discount Propagation Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Left 7 Cols: Complete Recursive Resource Cost Table */}
            <div className="lg:col-span-7 p-4 rounded-2xl bg-[#1a130c] border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-amber-200 uppercase tracking-wider">
                  F. Complete Recursive Resource Acquisition Cost Table
                </h3>
                <span className="text-[10px] text-amber-300/75 font-semibold">
                  Click any row to inspect its dependency tree →
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-amber-500/15 text-[10px] text-amber-300/60 uppercase">
                      <th className="py-2 pr-2">Resource</th>
                      <th className="py-2 px-2">Production Recipe Chain</th>
                      <th className="py-2 px-2 text-right">With Skill (16c Axe)</th>
                      <th className="py-2 px-2 text-right">Without Skill (20c Axe)</th>
                      <th className="py-2 pl-2 text-right">Cascaded Saving</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10 text-amber-100/90">
                    {recursiveResourceRows.map((r) => (
                      <tr
                        key={r.itemId}
                        onClick={() => setSelectedChainResourceId(r.itemId)}
                        className={`cursor-pointer transition-colors ${
                          selectedChainResourceId === r.itemId
                            ? 'bg-amber-500/15'
                            : 'hover:bg-amber-500/5'
                        }`}
                      >
                        <td className="py-2 pr-2 font-bold text-amber-50 flex items-center gap-1.5">
                          <span>{r.icon}</span>
                          <span>{r.name}</span>
                        </td>
                        <td className="py-2 px-2 text-amber-200/75 font-mono text-[11px]">
                          {r.recipeDescription}
                        </td>
                        <td className="py-2 px-2 text-right font-black text-emerald-400">
                          {r.costCoinsWithDiscount.toLocaleString()} Coins
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-rose-300">
                          {r.costCoinsWithoutDiscount.toLocaleString()} Coins
                        </td>
                        <td className="py-2 pl-2 text-right font-black text-amber-300">
                          −{r.savingsCoins.toLocaleString()} Coins ({r.savingsPercent}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 5 Cols: Visual Skill Discount Propagation Chart & Dependency Tree */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-[#1a130c] border border-amber-500/20 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <span>What the 4-Coin Axe Skill Discount Actually Changes</span>
                  </h3>
                </div>
                <p className="text-[11px] text-amber-200/60 mt-0.5">
                  Cumulative Coins required per unit (<span className="text-emerald-400 font-bold">With Discount</span> vs.{' '}
                  <span className="text-rose-300 font-bold">Without Discount</span>):
                </p>

                {/* Visual Horizontal Bar Comparison Chart */}
                <div className="mt-3 space-y-2.5">
                  {recursiveResourceRows.map((r) => {
                    const maxVal = Math.max(
                      6640,
                      recursiveResourceRows[recursiveResourceRows.length - 1]?.costCoinsWithoutDiscount || 6640
                    );
                    // Use log-adjusted visual width so Wood (16/20) and Crimstone (5740/6640) are both clearly readable
                    const pctWith = Math.max(6, Math.round((Math.log10(r.costCoinsWithDiscount + 1) / Math.log10(maxVal + 1)) * 100));
                    const pctWithout = Math.max(8, Math.round((Math.log10(r.costCoinsWithoutDiscount + 1) / Math.log10(maxVal + 1)) * 100));

                    return (
                      <div key={r.itemId} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-100 flex items-center gap-1">
                            <span>{r.icon}</span>
                            <span>{r.name}</span>
                            <span className="text-[10px] text-amber-200/50 font-normal">
                              ({r.cumulativeAxesRequired} Axes cumulative)
                            </span>
                          </span>
                          <span className="font-mono text-[10px] text-emerald-300 font-bold">
                            {r.costCoinsWithDiscount.toLocaleString()}c vs {r.costCoinsWithoutDiscount.toLocaleString()}c (Saves {r.savingsCoins.toLocaleString()}c)
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="w-full bg-[#120d08] rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pctWith}%` }}
                            />
                          </div>
                          <div className="w-full bg-[#120d08] rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-rose-500/75 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pctWithout}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeRecursiveTree && (
                <div className="p-2.5 rounded-xl bg-[#120d08] border border-amber-500/20 text-[11px] text-amber-200/80">
                  <strong className="text-amber-300">Active RRCE Dependency Traversal ({activeRecursiveTree.itemName}): </strong>
                  <span>
                    {activeRecursiveTree.formulaSymbolic} →{' '}
                    <strong className="text-emerald-400">
                      {applyAxeSkillDiscount
                        ? activeRecursiveTree.formulaEvaluatedWithDiscount
                        : activeRecursiveTree.formulaEvaluatedWithoutDiscount}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Optional Collapsible RRCE Database Schema & Live API Skill Modifiers Inspector */}
          {showDatabaseSchema && (
            <div className="pt-4 border-t border-amber-500/20 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              {/* Table 1: production_recipes */}
              <div className="p-3.5 rounded-2xl bg-[#120d08] border border-amber-500/20 space-y-2">
                <div className="font-black text-amber-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Table: production_recipes</span>
                  <span className="text-[10px] font-mono text-amber-200/50">
                    {Object.keys(PRODUCTION_RECIPES_TABLE).length} rows
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {Object.values(PRODUCTION_RECIPES_TABLE).map((rec) => (
                    <div key={rec.recipe_id} className="p-2 rounded-lg bg-[#1a130c] border border-amber-500/10 text-[11px]">
                      <div className="flex items-center justify-between font-bold text-amber-100">
                        <span>{rec.output_icon} {rec.output_name} ({rec.recipe_id})</span>
                        <span className={rec.is_tradeable_output ? 'text-emerald-400' : rec.output_type === 'food' ? 'text-sky-300' : 'text-amber-300'}>
                          {rec.is_tradeable_output ? 'Tradeable' : rec.output_type === 'food' ? 'Untradable Food (0 Fee)' : 'Untradable Tool'}
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-200/60 mt-0.5 font-mono">
                        building={rec.required_building} · duration={rec.production_duration}m · instant={String(rec.is_instant)} · utility=[{rec.economic_utility.join(', ')}]
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table 2: production_recipe_inputs */}
              <div className="p-3.5 rounded-2xl bg-[#120d08] border border-amber-500/20 space-y-2">
                <div className="font-black text-amber-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Table: production_recipe_inputs</span>
                  <span className="text-[10px] font-mono text-amber-200/50">
                    {PRODUCTION_RECIPE_INPUTS_TABLE.length} edges
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {PRODUCTION_RECIPE_INPUTS_TABLE.map((inp, i) => (
                    <div key={i} className="p-2 rounded-lg bg-[#1a130c] border border-amber-500/10 text-[11px] flex items-center justify-between">
                      <span className="font-mono text-amber-200">{inp.recipe_id}</span>
                      <span className="font-bold text-amber-100">
                        requires {inp.input_quantity}× {inp.input_name} ({inp.input_type})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table 3: farm_skill_modifiers (Pulled from API) */}
              <div className="p-3.5 rounded-2xl bg-[#120d08] border border-emerald-500/25 space-y-2">
                <div className="font-black text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Table: farm_skill_modifiers (API)</span>
                  <span className="text-[10px] font-mono text-emerald-300/70">
                    Farm #{farm.farmId}
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {farmSkillModifiers.map((mod, i) => (
                    <div key={i} className="p-2 rounded-lg bg-[#1a130c] border border-emerald-500/15 text-[11px]">
                      <div className="flex items-center justify-between font-bold text-emerald-300">
                        <span>{mod.skill_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20">
                          ×{mod.modifier_value} ({mod.modifier_type})
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-200/65 mt-0.5">
                        {mod.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. FEATURE FOUR: Time Opportunity Cost Engine (Active vs. Elapsed Time & C_time = T × R) */}
        <div className="p-5 rounded-2xl bg-[#140f0a] border border-purple-500/30 space-y-5">
          {/* Header & Three Time-Cost Settings (Zero | Production Capacity | Custom Hourly) */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-purple-500/20">
            <div>
              <div className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>3. Time Opportunity Cost Engine — Production Time Must Have an Economic Value (C<sub>time</sub> = T × R)</span>
              </div>
              <p className="text-[11px] text-amber-200/70 mt-0.5">
                Separates <strong className="text-amber-100">active player interaction</strong> from <strong className="text-amber-100">elapsed processing time</strong>. Elapsed processing time is not automatically a cash expense—it reflects occupied building capacity, while instant Axe/Pickaxe/mining actions have zero time cost.
              </p>
            </div>

            {/* C. Three Time-Cost Settings Selector */}
            <div className="flex flex-wrap items-center gap-2">
              {TIME_VALUATION_SETTINGS.map((setting) => {
                const isActive = timeValuationMode === setting.id;
                return (
                  <button
                    key={setting.id}
                    onClick={() => setTimeValuationMode(setting.id)}
                    className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-500/25 border-purple-400 text-purple-100 shadow-md shadow-purple-500/10'
                        : 'bg-[#1c150e] border-purple-500/20 text-amber-200/75 hover:border-purple-400/40'
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5">
                      <span>{setting.label}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                        {setting.formulaNote}
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-200/55 mt-0.5 max-w-[230px] leading-tight">
                      {setting.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid: Left = A. 5 Time Types Classification Matrix | Right = B. Cheese 2-Hour Cycle Benchmark & Configurable Rate R */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* A. Separate Active Production Time from Elapsed Production Time (5 Time Types) */}
            <div className="lg:col-span-7 p-4 rounded-2xl bg-[#1a130c] border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-purple-200 uppercase tracking-wider">
                  A. Separate Active Production Time from Elapsed Production Time
                </h3>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                  Selected Item ({activeOpp?.targetItem.name}): {fin?.timeProfile?.primaryTimeType || 'Processing'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-purple-500/15 text-[10px] text-amber-300/60 uppercase">
                      <th className="py-2 pr-2">Time Type</th>
                      <th className="py-2 px-2">Meaning</th>
                      <th className="py-2 px-2">Sunflower Land Examples</th>
                      <th className="py-2 pl-2">Economic Treatment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/10 text-amber-100/90">
                    {TIME_TYPE_DEFINITIONS.map((t) => {
                      const isCurrentType = fin?.timeProfile?.primaryTimeType === t.type;
                      return (
                        <tr
                          key={t.type}
                          className={isCurrentType ? 'bg-purple-500/15' : 'hover:bg-purple-500/5'}
                        >
                          <td className="py-2 pr-2 font-black text-purple-300 whitespace-nowrap">
                            {t.type}
                            {isCurrentType && (
                              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-purple-400 text-slate-950 font-black">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-semibold text-amber-100">{t.meaning}</td>
                          <td className="py-2 px-2 text-amber-200/70 text-[11px]">{t.example}</td>
                          <td className="py-2 pl-2 text-[11px] text-emerald-300/90">{t.defaultTimeCostTreatment}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Economic Distinction Callout */}
              <div className="p-3 rounded-xl bg-[#120d08] border border-amber-500/20 text-[11px] text-amber-100/85 leading-relaxed">
                <strong className="text-amber-300">Official SFL Mechanics — Zero Cooking Time Fees: </strong>
                In Sunflower Land, cooking buildings (<strong className="text-amber-200">Fire Pit, Kitchen, Bakery, Deli, Smoothie Shack</strong>) charge <strong className="text-emerald-400">zero FLOWER fees (0.0000 FLOWER)</strong> for cooking time. Elapsed processing time is <span className="underline decoration-amber-400/60">never a cash fee</span>—it only occupies the building queue for the recipe duration (<strong className="text-purple-300">20m Deli timer for Cheese</strong>) unless you optionally enable a shadow planning rate <em>R</em>. For <strong className="text-emerald-400">Instant</strong> Axe, Pickaxe, and mining operations, the production-time cost is always <strong className="text-emerald-400">0.0000 FLOWER</strong>.
              </div>
            </div>

            {/* B. Cheese Production Cycle Benchmark & Configurable Planning Rate R */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-gradient-to-br from-purple-950/35 via-[#1a130c] to-[#140f0a] border border-purple-500/30 flex flex-col justify-between space-y-3.5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-purple-200 uppercase tracking-wider">
                    B. Configurable Time Valuation (Zero Cooking Fee Default)
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
                    C<sub>time</sub> = T × R
                  </span>
                </div>

                {/* Planning Rate R Controls */}
                <div className="p-3 rounded-xl bg-[#120d08] border border-purple-500/25 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-200">
                      Planning Value of 1 Production Hour (R):
                    </span>
                    <span className="font-black text-purple-300">
                      {cheeseBenchmarkRate.toFixed(2)} FLOWER / hr {cheeseBenchmarkRate === 0 ? '(SFL Default: Zero Fee)' : '(Shadow Rate)'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { rate: 0, label: '0.00 (SFL Default · Zero Cooking Fee)' },
                      { rate: 0.05, label: '0.05 / hr' },
                      { rate: 0.10, label: '0.10 / hr (2h Benchmark)' },
                      { rate: 0.20, label: '0.20 / hr' },
                      { rate: 0.35, label: '0.35 / hr' },
                    ].map((preset) => {
                      const isRateSelected =
                        (preset.rate === 0 && (timeValuationMode === 'zero' || cheeseBenchmarkRate === 0)) ||
                        (preset.rate > 0 &&
                          timeValuationMode !== 'zero' &&
                          Math.abs(cheeseBenchmarkRate - preset.rate) < 0.001);
                      return (
                        <button
                          key={preset.rate}
                          onClick={() => {
                            if (preset.rate === 0) {
                              setTimeValuationMode('zero');
                              setCustomHourlyRateFlower(0);
                            } else {
                              setTimeValuationMode('custom_hourly');
                              setCustomHourlyRateFlower(preset.rate);
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            isRateSelected
                              ? 'bg-purple-400 text-slate-950 shadow'
                              : 'bg-[#1c150e] text-amber-200/75 border border-purple-500/20 hover:text-amber-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step-by-Step Cheese Math Box: 3 × 0.1220 = 0.3660 + 0.0000 (or T × R) */}
                <div className="p-3.5 rounded-2xl bg-[#120d08] border border-amber-500/25 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-amber-200/85">
                    <span>1. Ingredient Cost (3 × 0.1220 Milk):</span>
                    <span className="font-bold text-amber-100">0.3660 FLOWER</span>
                  </div>
                  <div className="flex items-center justify-between text-purple-300">
                    <span>
                      2. Cooking Time Fee ({cheeseBenchmarkRate === 0 ? '20m Deli · Zero Fee in SFL' : `C_time = 2 hr × ${cheeseBenchmarkRate.toFixed(2)}`}):
                    </span>
                    <span className="font-bold">+{cheeseBenchmarkTimeCost.toFixed(4)} FLOWER</span>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-sm">
                    <span className="font-black text-emerald-300">
                      C<sub>cheese</sub> = 0.3660 + {cheeseBenchmarkTimeCost.toFixed(4)}:
                    </span>
                    <span className="font-black text-emerald-400 text-base">
                      {cheeseBenchmarkTotalCost.toFixed(4)} FLOWER
                    </span>
                  </div>
                  <div className="text-[10px] font-sans text-amber-200/60 pt-0.5">
                    Official <code>consumables.ts</code>: Three Milk (3 × 0.1220 = <strong className="text-amber-200">0.3660 FLOWER</strong>) + 20m Deli timer (<strong className="text-emerald-400">0.0000 FLOWER cooking fee</strong> in SFL; or 0.5660 FLOWER if testing the optional R = 0.10/hr 2h benchmark).
                  </div>
                </div>
              </div>

              {/* Live Active Item Evaluation Footer */}
              <div className="p-2.5 rounded-xl bg-purple-950/35 border border-purple-500/30 flex items-center justify-between text-[11px]">
                <span className="text-purple-200">
                  <strong>Active Selection ({effectiveMultiplier}× {activeOpp?.targetItem.name}):</strong>{' '}
                  {activeTimeCostEval.formulaEvaluated}
                </span>
                <span className="font-black text-emerald-300 whitespace-nowrap ml-2">
                  C<sub>inputs+time</sub> = {scaledCombinedMaterialAndTimeCost.toFixed(4)} FLOWER
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. FEATURE FIVE: Non-Tradeable Products Must Be Calculated Differently (Dual Economic Engines & XP Optimization Engine) */}
        <div className="p-5 rounded-2xl bg-[#140f0a] border border-sky-500/35 space-y-5">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-sky-500/20">
            <div>
              <div className="text-xs font-black text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-400" />
                <span>4. Non-Tradeable Products Must Be Calculated Differently — Dual Economic Engines & XP Optimization Engine</span>
              </div>
              <p className="text-[11px] text-amber-200/70 mt-0.5">
                Foods, Deli products, cooked meals, and fish consumed for Bumpkin XP are <strong className="text-sky-300">non-tradeable</strong>. FarmIQ never assigns them an artificial market selling price or fake trading profit.
              </p>
            </div>
            <span className="text-[10px] font-black px-3 py-1 rounded-xl bg-sky-500/15 border border-sky-500/35 text-sky-200 shrink-0">
              Active Engine for {activeOpp?.targetItem.name}:{' '}
              {isActiveConsumable ? 'Consumable Production Engine (XP Model)' : 'Tradeable Production Engine (Profit Model)'}
            </span>
          </div>

          {/* A. Introduce Two Separate Economic Engines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Engine 1: Tradeable Production Engine (Profit Model) */}
            <div className="p-4 rounded-2xl bg-[#1a130c] border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                    Engine 1 · Tradeable Production Engine
                  </span>
                  <h3 className="text-sm font-black text-amber-50">
                    For Wood, Stone, Iron, Gold, Crimstone & Verified Tradeable Items
                  </h3>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                  Profit Model
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                {[
                  '1. Total production costs',
                  '2. Market selling value (Vp)',
                  '3. Transaction fees (Ctx)',
                  '4. Net profit (NP)',
                  '5. Return on Investment (ROI)',
                  '6. Profit per hour (PPH)',
                ].map((step) => (
                  <div key={step} className="p-2 rounded-xl bg-[#120d08] border border-emerald-500/15 text-emerald-200 font-semibold">
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* Engine 2: Consumable Production Engine (XP Model) */}
            <div className="p-4 rounded-2xl bg-[#1a130c] border border-sky-500/35 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-sky-300 uppercase tracking-wider">
                    Engine 2 · Consumable Production Engine
                  </span>
                  <h3 className="text-sm font-black text-amber-50">
                    For Foods, Deli Products, Cooked Meals & Non-Tradeable Fish
                  </h3>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 border border-sky-500/35">
                  XP Model
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                {[
                  '1. Ingredient costs (Cinputs)',
                  '2. Production & time costs',
                  '3. Processing duration (T)',
                  '4. Verified XP gained',
                  '5. FLOWER cost per XP',
                  '6. XP / FLOWER & XP / hr',
                ].map((step) => (
                  <div key={step} className="p-2 rounded-xl bg-[#120d08] border border-sky-500/20 text-sky-200 font-semibold">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* B & D. Cheese Production Economics Table + Two Independent Benefits Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* B. Example: Cheese Production Economics Table & Formulas */}
            <div className="lg:col-span-7 p-4 rounded-2xl bg-[#1a130c] border border-sky-500/25 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-black text-sky-200 uppercase tracking-wider">
                  B. Example: Cheese Production Economics (Non-Tradeable Consumable)
                </h3>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-amber-200/70 font-bold">Optional Additional Fee (C<sub>fees</sub>):</span>
                  {[0, 0.05, 0.10].map((fee) => (
                    <button
                      key={fee}
                      onClick={() => setAdditionalCheeseFeeFlower(fee)}
                      className={`px-2 py-0.5 rounded font-black cursor-pointer ${
                        Math.abs(additionalCheeseFeeFlower - fee) < 0.001
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-[#120d08] text-sky-300 border border-sky-500/25'
                      }`}
                    >
                      {fee.toFixed(2)} FLOWER
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-sky-500/20 text-[10px] text-amber-300/60 uppercase">
                      <th className="py-2 pr-2">Component</th>
                      <th className="py-2 px-2">Calculation</th>
                      <th className="py-2 pl-2 text-right">Cost / Benefit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-500/10 text-amber-100/90">
                    <tr>
                      <td className="py-2 pr-2 font-bold text-amber-100">Milk</td>
                      <td className="py-2 px-2 font-mono text-amber-200/80">3 × 0.1220</td>
                      <td className="py-2 pl-2 text-right font-black text-amber-200">0.3660 FLOWER</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-2 font-bold text-purple-300">Cooking time (20m Deli)</td>
                      <td className="py-2 px-2 font-mono text-purple-200/80">
                        {cheeseBenchmarkRate === 0
                          ? 'Zero cooking time fee in SFL (0.0000 FLOWER)'
                          : `Shadow planning rate (2h × ${cheeseBenchmarkRate.toFixed(2)})`}
                      </td>
                      <td className="py-2 pl-2 text-right font-bold text-purple-300">
                        {cheeseBenchmarkTimeCost.toFixed(4)} FLOWER
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-2 font-bold text-amber-200/80">Additional fees</td>
                      <td className="py-2 px-2 font-mono text-amber-200/70">Zero cooking fee in SFL (C<sub>fees</sub>)</td>
                      <td className="py-2 pl-2 text-right font-bold text-amber-200/80">
                        {additionalCheeseFeeFlower.toFixed(4)} FLOWER
                      </td>
                    </tr>
                    <tr className="bg-rose-950/25">
                      <td className="py-2 pr-2 font-black text-rose-300">Cheese selling value</td>
                      <td className="py-2 px-2 font-bold text-rose-300">Non-tradeable</td>
                      <td className="py-2 pl-2 text-right font-black text-rose-300">Not applicable</td>
                    </tr>
                    <tr className="bg-sky-950/30">
                      <td className="py-2 pr-2 font-black text-sky-300">Cheese XP & Unlocks</td>
                      <td className="py-2 px-2 font-bold text-sky-200">
                        +1 XP direct · Unlocks Blue Cheese (+6,000 XP) & Honey Cheddar (+15,000 XP)
                      </td>
                      <td className="py-2 pl-2 text-right font-black text-sky-300">Separate benefit</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Formulas Box: C_cheese, CostPerXP, XPPerFlower */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-[#120d08] border border-amber-500/20">
                  <div className="text-[10px] text-amber-300/70 font-sans font-bold uppercase">
                    1. Total Production Cost
                  </div>
                  <div className="text-[11px] text-amber-200 mt-0.5">
                    C<sub>cheese</sub> = 0.3660 + C<sub>time</sub> + C<sub>fees</sub>
                  </div>
                  <div className="text-sm font-black text-amber-100 mt-1">
                    = {cheeseBenchmarkTotalCost.toFixed(4)} FLOWER
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#120d08] border border-sky-500/25">
                  <div className="text-[10px] text-sky-300/80 font-sans font-bold uppercase">
                    2. FLOWER Cost per XP
                  </div>
                  <div className="text-[11px] text-sky-200 mt-0.5">
                    CostPerXP = C<sub>cheese</sub> / XP<sub>gained</sub>
                  </div>
                  <div className="text-sm font-black text-sky-300 mt-1">
                    = {cheeseBenchmarkCostPerXp.toFixed(6)} FLOWER/XP
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#120d08] border border-emerald-500/25">
                  <div className="text-[10px] text-emerald-300/80 font-sans font-bold uppercase">
                    3. XP per FLOWER
                  </div>
                  <div className="text-[11px] text-emerald-200 mt-0.5">
                    XPPerFlower = XP<sub>gained</sub> / C<sub>cheese</sub>
                  </div>
                  <div className="text-sm font-black text-emerald-400 mt-1">
                    = {cheeseBenchmarkXpPerFlower.toLocaleString()} XP/FLOWER
                  </div>
                </div>
              </div>
            </div>

            {/* D. Distinguish XP from FLOWER Profitability (Two Independent Benefits Card + Rewritten Statement) */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 via-[#1a130c] to-[#140f0a] border border-sky-500/35 flex flex-col justify-between space-y-3.5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-200 uppercase tracking-wider">
                    D. Distinguish XP from FLOWER Profitability
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-500/20 text-sky-200 border border-sky-500/35">
                    Never Combined
                  </span>
                </div>

                {/* Cheese · Production Result (Two Independent Benefits) */}
                <div className="p-3.5 rounded-2xl bg-[#120d08] border border-sky-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-sky-500/15 pb-2">
                    <span className="text-xs font-black text-amber-50 flex items-center gap-1.5">
                      <span>🧀</span>
                      <span>Cheese · Production Result (20m Deli · 0.0000 Fee)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      Non-tradeable consumable
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-[#1a130c] border border-amber-500/25">
                      <div className="text-[10px] font-bold text-amber-300/75 uppercase">Material Cost</div>
                      <div className="text-lg font-black text-amber-100 mt-0.5">0.3660</div>
                      <div className="text-[10px] text-amber-200/60">FLOWER equivalent (3 Milk · 0 Fee)</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1a130c] border border-sky-500/30">
                      <div className="text-[10px] font-bold text-sky-300/80 uppercase">XP & Deli Unlock</div>
                      <div className="text-lg font-black text-sky-300 mt-0.5">Deli Input</div>
                      <div className="text-[10px] text-sky-200/70">Unlocks 6k–30k XP recipes</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-sky-950/35 border border-sky-500/25 text-[11px] text-sky-100">
                    <strong className="text-sky-300 uppercase text-[10px] block mb-0.5">
                      FarmIQ Interpretation:
                    </strong>
                    A zero-fee Deli production investment for Bumpkin progression (unlocking Blue Cheese +6,000 XP & Honey Cheddar +15,000 XP), not a market-selling profit opportunity.
                  </div>
                </div>

                {/* Before vs After Statement Comparison */}
                <div className="space-y-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-rose-950/25 border border-rose-500/25 text-rose-200/85">
                    <strong className="text-rose-300">Instead of saying: </strong>
                    <span className="line-through opacity-80">&ldquo;Produce Cheese to earn +7.71 FLOWER.&rdquo;</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-100 leading-relaxed">
                    <strong className="text-emerald-300">FarmIQ says: </strong>
                    &ldquo;Producing Cheese consumes <strong>0.3660 FLOWER</strong> worth of Milk with <strong>0.0000 FLOWER</strong> cooking time fees (20m Deli timer). It provides verified Bumpkin XP and unlocks high-tier Deli meals (Blue Cheese +6,000 XP, Honey Cheddar +15,000 XP), making it a progression opportunity rather than a direct trading opportunity.&rdquo;
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* C. Dedicated XP Optimization Engine & 5-Criteria XP Efficiency Rankings */}
          <div className="p-4 rounded-2xl bg-[#1a130c] border border-sky-500/25 space-y-3.5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black text-sky-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>C. Dedicated XP Optimization Engine — Consumable XP Efficiency Rankings</span>
                </h3>
                <p className="text-[11px] text-amber-200/65 mt-0.5">
                  Evaluates all craftable consumables using verified ingredient costs and actual game XP rewards. Click any row to inspect it in the Execution Panel.
                </p>
              </div>

              {/* 5 XP Ranking Criteria Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'lowest_cost_per_xp', label: '1. Lowest Cost / XP' },
                  { id: 'highest_xp_per_flower', label: '2. Highest XP / FLOWER' },
                  { id: 'highest_xp_per_hour', label: '3. Highest XP / Hour' },
                  { id: 'lowest_missing_acquisition', label: '4. Lowest Missing Cost' },
                  { id: 'best_inventory_utilization', label: '5. Best Inventory Utilization' },
                ].map((crit) => (
                  <button
                    key={crit.id}
                    onClick={() => setXpRankingBy(crit.id as XPRankingCriterion)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      xpRankingBy === crit.id
                        ? 'bg-sky-400 text-slate-950 shadow'
                        : 'bg-[#120d08] text-sky-200/75 border border-sky-500/20 hover:text-sky-100'
                    }`}
                  >
                    {crit.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-sky-500/20 text-[10px] text-amber-300/60 uppercase">
                    <th className="py-2 pr-2">Rank & Consumable</th>
                    <th className="py-2 px-2">Facility & Timer</th>
                    <th className="py-2 px-2 text-right">Ingredient Cost</th>
                    <th className="py-2 px-2 text-right">Total Cost (C<sub>total</sub>)</th>
                    <th className="py-2 px-2 text-right">Verified XP</th>
                    <th className="py-2 px-2 text-right">Cost per XP</th>
                    <th className="py-2 px-2 text-right">XP per FLOWER</th>
                    <th className="py-2 px-2 text-right">XP / Hour</th>
                    <th className="py-2 pl-2 text-right">Inventory (R<sub>i</sub>)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-500/10 text-amber-100/90">
                  {rankedConsumables.map((rc, idx) => {
                    const isRowSelected = rc.opp.id === activeOpp?.id;
                    return (
                      <tr
                        key={rc.opp.id}
                        onClick={() => handleSelectOpp(rc.opp.id)}
                        className={`cursor-pointer transition-colors ${
                          isRowSelected ? 'bg-sky-500/15' : 'hover:bg-sky-500/5'
                        }`}
                      >
                        <td className="py-2 pr-2 font-bold text-amber-50 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-black">
                            #{idx + 1}
                          </span>
                          <span>{rc.opp.targetItem.icon}</span>
                          <span>{rc.opp.targetItem.name}</span>
                        </td>
                        <td className="py-2 px-2 text-amber-200/75 text-[11px]">
                          {rc.building} ({rc.durationFormatted})
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-amber-200">
                          {rc.ingredientCostFlower.toFixed(4)} FLOWER
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-purple-300">
                          {rc.totalCostFlower.toFixed(4)} FLOWER
                        </td>
                        <td className="py-2 px-2 text-right font-black text-sky-300">
                          +{rc.verifiedXp.toLocaleString()} XP
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black text-emerald-400">
                          {rc.costPerXp.toFixed(6)} FLOWER
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-sky-200">
                          {rc.xpPerFlower.toLocaleString()} XP
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-amber-200">
                          {rc.xpPerHour.toFixed(1)} XP/h
                        </td>
                        <td className="py-2 pl-2 text-right">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              rc.invUtilization >= 100
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {rc.invUtilization}% ({rc.missingCost > 0 ? `Miss: ${rc.missingCost.toFixed(2)}` : 'Ready'})
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FEATURE TWO (C): Profit Valuation Preference Selector */}
        <div className="p-4 rounded-2xl bg-[#16100a]/95 border border-amber-500/25 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-amber-200 uppercase tracking-wider">
                Profit Valuation Preference (Applied Consistently to All Inputs & Outputs)
              </span>
            </div>
            <span className="text-[11px] text-amber-300/80 font-medium">
              Active Basis: <strong className="text-amber-100">{activePrefMeta.label}</strong> — {activePrefMeta.subtitle}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {VALUATION_PREFERENCES.map((pref) => {
              const isActive = valuationPref === pref.id;
              return (
                <button
                  key={pref.id}
                  onClick={() => setValuationPref(pref.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-[#120d08] border-amber-500/15 hover:border-amber-500/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-black ${isActive ? 'text-amber-200' : 'text-amber-100/80'}`}>
                      {pref.shortLabel}
                    </span>
                    {pref.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {pref.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-amber-200/55 mt-1 line-clamp-2 leading-tight">
                    {pref.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls Bar: Group Filter Tabs & Sorting */}
      <div className="p-4 rounded-2xl bg-[#1c150e] border border-amber-500/20 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Group Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-amber-300/70 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            Opportunity Groups:
          </span>
          {[
            { id: 'ALL', label: `All Discovered (${summaryStats.totalCount})` },
            { id: 'READY_TO_PRODUCE', label: `✅ Ready to Produce (${summaryStats.readyCount})` },
            { id: 'ALMOST_READY', label: `⚡ Almost Ready (${summaryStats.almostCount})` },
            { id: 'STRATEGIC_OPPORTUNITY', label: `🧭 Strategic Opportunities (${summaryStats.strategicCount})` },
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupFilter(g.id as GroupFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                groupFilter === g.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-[#140f0a] text-amber-200/70 border border-amber-500/15 hover:border-amber-500/40 hover:text-amber-100'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Sort Strategy Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-amber-300/70 uppercase tracking-wider flex items-center gap-1 mr-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            Sort Within Groups:
          </span>
          {[
            { id: 'smart', label: 'IQ Score' },
            { id: 'net_profit', label: 'Net Profit (NP)' },
            { id: 'value_added', label: 'Value Added (VA)' },
            { id: 'roi', label: 'ROI %' },
            { id: 'hourly_velocity', label: 'Profit / Hr (PPH)' },
            { id: 'gross_value', label: 'Finished Price (Vp)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSortBy(tab.id as SortStrategy)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                sortBy === tab.id
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50'
                  : 'bg-[#140f0a] text-amber-200/60 border border-amber-500/10 hover:text-amber-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout: 3-Group Discovery Feed (Left 5 Cols) & Deep-Dive Production Intelligence Panel (Right 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Three Categorized Opportunity Groups */}
        <div className="lg:col-span-5 space-y-6">
          {/* GROUP 1: READY TO PRODUCE */}
          {(groupFilter === 'ALL' || groupFilter === 'READY_TO_PRODUCE') && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-[#18130c] border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="text-sm font-black text-emerald-300 uppercase tracking-wider">
                      1. Ready to Produce ({groupedOpportunities.readyToProduce.length})
                    </h2>
                  </div>
                  <p className="text-[11px] text-amber-200/65 mt-0.5">
                    All required ingredients and production conditions are satisfied.
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shrink-0">
                  100% READY
                </span>
              </div>

              <div className="space-y-2.5">
                {groupedOpportunities.readyToProduce.map(renderOpportunityCard)}
              </div>
            </div>
          )}

          {/* GROUP 2: ALMOST READY */}
          {(groupFilter === 'ALL' || groupFilter === 'ALMOST_READY') && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-[#18130c] border border-amber-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                      2. Almost Ready ({groupedOpportunities.almostReady.length})
                    </h2>
                  </div>
                  <p className="text-[11px] text-amber-200/65 mt-0.5">
                    Products that require only a small additional ingredient investment.
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35 shrink-0">
                  MISSING INPUTS
                </span>
              </div>

              <div className="space-y-2.5">
                {groupedOpportunities.almostReady.map(renderOpportunityCard)}
              </div>
            </div>
          )}

          {/* GROUP 3: STRATEGIC OPPORTUNITIES */}
          {(groupFilter === 'ALL' || groupFilter === 'STRATEGIC_OPPORTUNITY') && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/60 to-[#18130c] border border-sky-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <h2 className="text-sm font-black text-sky-300 uppercase tracking-wider">
                      3. Strategic Opportunities ({groupedOpportunities.strategic.length})
                    </h2>
                  </div>
                  <p className="text-[11px] text-amber-200/65 mt-0.5">
                    Future potential: products requiring unavailable inputs, crafting prerequisites, or building unlocks.
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/35 shrink-0">
                  FUTURE POTENTIAL
                </span>
              </div>

              <div className="space-y-2.5">
                {groupedOpportunities.strategic.map(renderOpportunityCard)}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Deep-Dive Production & Profitability Intelligence Panel */}
        <div className="lg:col-span-7">
          {activeOpp ? (
            <div className="p-6 sm:p-7 rounded-3xl bg-[#1c150e] border border-amber-500/30 shadow-2xl space-y-6">
              {/* Top Header & Final 4-State Readiness Verdict */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-amber-500/15">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#271d12] border border-amber-500/35 flex items-center justify-center text-4xl shadow-inner shrink-0">
                    {activeOpp.targetItem.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {intel?.economicCategoryLabel || 'Category 2 · Craftable Item'}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          activeExecutionState.tone === 'emerald'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : activeExecutionState.tone === 'amber'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : activeExecutionState.tone === 'sky'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {activeExecutionState.shortBadge}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        +{activeOpp.targetItem.bumpkinXP || 80} Bumpkin XP
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-amber-50 mt-1">
                      {activeOpp.targetItem.name}
                    </h2>
                    <p className="text-xs text-amber-200/65 mt-0.5">
                      {activeOpp.targetItem.description}
                    </p>
                  </div>
                </div>

                {/* Batch Quantity Scaler */}
                <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 bg-[#140f0a] p-3 rounded-2xl border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-300/70 uppercase tracking-wider">
                    Simulate Batch Size
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '1x Unit', val: 1 },
                      { label: '5x Batch', val: 5 },
                      ...(maxBatches > 1 && maxBatches !== 5
                        ? [{ label: `Max Ready (${maxBatches}x)`, val: maxBatches }]
                        : []),
                    ].map((b) => (
                      <button
                        key={b.label}
                        onClick={() => setBatchMultiplier(b.val)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          effectiveMultiplier === b.val
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-[#1f170f] text-amber-200/70 hover:text-amber-100 border border-amber-500/15'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DUAL ECONOMIC ENGINE MEASUREMENTS: Consumable XP Model vs. Tradeable Profit Model */}
              {isActiveConsumable ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-xs font-black text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-sky-400" />
                      <span>
                        Consumable Production Engine — Two Independent Benefits & XP Efficiency ({effectiveMultiplier}x {activeOpp.targetItem.name})
                      </span>
                    </h3>
                    <span className="text-[11px] font-bold text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-lg border border-rose-500/30">
                      Non-Tradeable Consumable · Market Selling Value: Not Applicable
                    </span>
                  </div>

                  {/* Two Independent Benefits + XP Efficiency Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {/* 1. Material Cost (C_inputs) */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/35 to-[#140f0a] border border-amber-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-300 uppercase">
                            1. Material Cost
                          </span>
                          <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Σ(Q_i × V_i)
                          </span>
                        </div>
                        <div className="text-xl font-black text-amber-100 mt-1.5">
                          {(baseExactInputCost * effectiveMultiplier).toFixed(4)}{' '}
                          <span className="text-[10px] font-bold text-amber-300">FLOWER</span>
                        </div>
                        <div className="text-[10px] text-amber-200/65 mt-0.5">
                          FLOWER equivalent of consumed ingredients
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-amber-500/15 text-[10px] text-amber-200/75 flex items-center justify-between">
                        <span>Total C<sub>consumable</sub>:</span>
                        <span className="font-bold text-purple-300">
                          {scaledActiveConsumableTotalCost.toFixed(4)} FLOWER
                        </span>
                      </div>
                    </div>

                    {/* 2. Verified XP Reward (Independent Benefit) */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-950/50 to-[#101820] border border-sky-500/45 shadow-md shadow-sky-950/25 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-sky-300 uppercase">
                            2. XP Reward
                          </span>
                          <span className="text-[9px] font-mono text-sky-200 bg-sky-500/20 px-1.5 py-0.5 rounded">
                            Verified XP
                          </span>
                        </div>
                        <div className="text-xl font-black text-sky-300 mt-1.5">
                          +{scaledActiveVerifiedXp.toLocaleString()}{' '}
                          <span className="text-[10px] font-bold">XP</span>
                        </div>
                        <div className="text-[10px] text-sky-200/75 mt-0.5">
                          Progression benefit (Never inflated into FLOWER)
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-sky-500/20 text-[10px] text-sky-200 flex items-center justify-between font-bold">
                        <span>Selling Value:</span>
                        <span className="text-rose-300">Non-tradeable (N/A)</span>
                      </div>
                    </div>

                    {/* 3. FLOWER Cost per XP */}
                    <div className="p-3.5 rounded-2xl bg-[#140f0a] border border-emerald-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-300 uppercase">
                            3. Cost per XP
                          </span>
                          <span className="text-[9px] font-mono text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            C_total / XP
                          </span>
                        </div>
                        <div className="text-xl font-black text-emerald-400 mt-1.5">
                          {activeCostPerXp.toFixed(6)}
                        </div>
                        <div className="text-[10px] text-amber-200/60 mt-0.5">
                          FLOWER per 1 Bumpkin XP gained
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-amber-500/10 text-[10px] text-amber-200/70 flex items-center justify-between">
                        <span>Material-Only Cost/XP:</span>
                        <span className="font-bold text-emerald-300">
                          {(activeConsumableModel?.costPerXpMaterialOnly ?? activeCostPerXp).toFixed(6)}
                        </span>
                      </div>
                    </div>

                    {/* 4. XP per FLOWER & XP per Hour */}
                    <div className="p-3.5 rounded-2xl bg-[#140f0a] border border-purple-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-purple-300 uppercase">
                            4. XP per FLOWER
                          </span>
                          <span className="text-[9px] font-mono text-purple-300/80 bg-purple-500/10 px-1.5 py-0.5 rounded">
                            XP / C_total
                          </span>
                        </div>
                        <div className="text-xl font-black text-purple-200 mt-1.5">
                          {activeXpPerFlower.toLocaleString()}{' '}
                          <span className="text-[10px] font-bold text-purple-300">XP/FLOWER</span>
                        </div>
                        <div className="text-[10px] text-amber-200/60 mt-0.5">
                          +{activeConsumableModel?.xpPerProductionHour ?? xpInfo?.xpPerHour ?? 250} XP / production hr
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-amber-500/10 text-[10px] text-amber-200/70 flex items-center justify-between">
                        <span>Material-Only XP/FLOWER:</span>
                        <span className="font-bold text-purple-300">
                          {(activeConsumableModel?.xpPerFlowerMaterialOnly ?? activeXpPerFlower).toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FarmIQ Interpretation Banner for Active Consumable */}
                  <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 text-xs text-sky-100 leading-relaxed">
                    <strong className="text-sky-300 uppercase tracking-wider text-[10px] block mb-0.5">
                      FarmIQ Consumable Production Interpretation ({activeOpp.targetItem.name} · Non-Tradeable Consumable):
                    </strong>
                    {activeConsumableModel?.farmIqInterpretation}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-amber-400" />
                      <span>Tradeable Production Engine — Four Core Profitability Measurements ({effectiveMultiplier}x Batch · {activePrefMeta.shortLabel})</span>
                    </h3>
                    <span className="text-[11px] text-amber-200/55">
                      Finished Product V<sub>p</sub>: <strong className="text-amber-100">{scaledGross.toFixed(2)} FLOWER</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {/* 1. Value Added (VA) */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/35 to-[#140f0a] border border-amber-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-300 uppercase">
                            1. Value Added (VA)
                          </span>
                          <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            V_p − ΣQ_iV_i
                          </span>
                        </div>
                        <div className="text-xl font-black text-amber-300 mt-1.5">
                          +{scaledValueAdded.toFixed(2)} <span className="text-[10px] font-bold">FLOWER</span>
                        </div>
                        <div className="text-[10px] text-amber-200/60 mt-0.5">
                          {scaledGross.toFixed(2)} V<sub>p</sub> − {scaledInputCost.toFixed(2)} Inputs
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-amber-500/15 text-[10px] text-amber-200/70 flex items-center justify-between">
                        <span>Input Multiplier:</span>
                        <span className="font-bold text-amber-200">{fin?.valueAddedMultiplier || 1}x raw value</span>
                      </div>
                    </div>

                    {/* 2. Net Profit (NP) */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/45 to-[#111c15] border border-emerald-500/45 shadow-md shadow-emerald-950/25 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-300 uppercase">
                            2. Net Profit (NP)
                          </span>
                          <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                            P_net − C_in − C_prod
                          </span>
                        </div>
                        <div className="text-xl font-black text-emerald-400 mt-1.5">
                          +{scaledNetProfit.toFixed(2)} <span className="text-[10px] font-bold">FLOWER</span>
                        </div>
                        <div className="text-[10px] text-emerald-200/70 mt-0.5">
                          ≈ +${scaledNetProfitUSD.toFixed(2)} USD after all fees
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-emerald-500/20 text-[10px] text-emerald-300 flex items-center justify-between font-bold">
                        <span>Net Proceeds (P<sub>net</sub>):</span>
                        <span>{scaledNetProceeds.toFixed(2)} FLOWER</span>
                      </div>
                    </div>

                    {/* 3. Return on Investment (ROI) */}
                    <div className="p-3.5 rounded-2xl bg-[#140f0a] border border-sky-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-sky-300 uppercase">
                            3. Return (ROI)
                          </span>
                          <span className="text-[9px] font-mono text-sky-300/80 bg-sky-500/10 px-1.5 py-0.5 rounded">
                            NP / (C_in + C_prod)
                          </span>
                        </div>
                        <div className="text-xl font-black text-sky-400 mt-1.5">
                          {activeRoiPercent.toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-amber-200/60 mt-0.5">
                          Cost Basis: {(scaledInputCost + scaledProdFee).toFixed(2)} FLOWER
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-amber-500/10 text-[10px] text-amber-200/70 flex items-center justify-between">
                        <span>Gross Margin:</span>
                        <span className="font-bold text-sky-300">{fin?.netMarginPercent}% of V<sub>p</sub></span>
                      </div>
                    </div>

                    {/* 4. Profit per Hour (PPH) */}
                    <div className="p-3.5 rounded-2xl bg-[#140f0a] border border-amber-500/25 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-200 uppercase">
                            4. Profit / Hour (PPH)
                          </span>
                          <span className="text-[9px] font-mono text-amber-300/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            NP / Eff.Hours
                          </span>
                        </div>
                        <div className="text-xl font-black text-amber-100 mt-1.5">
                          +{activePphFlower.toFixed(2)} <span className="text-[10px] font-bold text-amber-300">FLOWER/h</span>
                        </div>
                        <div className="text-[10px] text-amber-200/60 mt-0.5">
                          {intel?.productionTimeFormatted} passive + {fin?.activeInteractionMinutes || 4}m active
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-amber-500/10 text-[10px] text-amber-200/70 flex items-center justify-between">
                        <span>Effective Time:</span>
                        <span className="font-bold text-amber-300">{fin?.effectiveProductionTimeMinutes || 64} min total</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COMPLETE PRODUCTION ECONOMICS AUDIT TABLE: Dual-Mode (Consumable XP Model vs Tradeable Profit Model) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#140f0a] border border-amber-500/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-500/15">
                  <div>
                    <div className="text-xs font-black text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-400" />
                      <span>
                        {isActiveConsumable
                          ? `Consumable Production Economics Audit (${activeOpp.targetItem.name} · XP Model)`
                          : `Tradeable Production Economics & Liquidity Audit (${activeOpp.targetItem.name} · Profit Model)`}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/60 mt-0.5">
                      {isActiveConsumable
                        ? 'Calculates ingredient cost, time opportunity cost, additional fees, and verified XP efficiency without inventing a fake market selling value.'
                        : 'Evaluates all 7 financial, time, XP, and order-book liquidity dimensions.'}
                    </p>
                  </div>
                  {isActiveConsumable ? (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-xl border bg-sky-950/80 border-sky-500/40 text-sky-300 shrink-0">
                      Non-Tradeable Consumable · Progression Investment
                    </span>
                  ) : (
                    liq && (
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-xl border shrink-0 ${
                          liq.canRealisticallySell
                            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        {liq.liquidityStatus} ({liq.bidAskSpreadPercent}% Spread)
                      </span>
                    )
                  )}
                </div>

                {isActiveConsumable ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-sky-500/20 text-[10px] text-amber-300/60 uppercase">
                          <th className="py-2 pr-3">Component</th>
                          <th className="py-2 px-3">Calculation</th>
                          <th className="py-2 pl-3 text-right">Cost / Benefit ({effectiveMultiplier}x)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-500/10 text-amber-100/90">
                        <tr>
                          <td className="py-2 pr-3 font-semibold text-amber-100">
                            1. Ingredients ({ledger.map((i) => i.name).join(' + ')})
                          </td>
                          <td className="py-2 px-3 font-mono text-amber-200/75">
                            {ledger.map((i) => `${i.needed * effectiveMultiplier} × ${i.unitPriceFlower.toFixed(4)}`).join(' + ')}
                          </td>
                          <td className="py-2 pl-3 text-right font-bold text-amber-200">
                            {(baseExactInputCost * effectiveMultiplier).toFixed(4)} FLOWER
                          </td>
                        </tr>
                        <tr className="bg-purple-500/5">
                          <td className="py-2 pr-3 font-semibold text-purple-300">
                            2. Production time (C<sub>time</sub> = T × R)
                          </td>
                          <td className="py-2 px-3 text-amber-200/75">
                            Depends on duration ({activeTimeCostEval.formulaEvaluated})
                          </td>
                          <td className="py-2 pl-3 text-right font-bold text-purple-300">
                            Calculated separately ({scaledTimeOpportunityCost.toFixed(4)} FLOWER)
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-semibold text-amber-200/80">
                            3. Additional fees (C<sub>fees</sub>)
                          </td>
                          <td className="py-2 px-3 text-amber-200/65">
                            If applicable ({TIME_VALUATION_SETTINGS.find((s) => s.id === timeValuationMode)?.shortLabel})
                          </td>
                          <td className="py-2 pl-3 text-right font-semibold text-amber-200/80">
                            Calculated separately ({(additionalCheeseFeeFlower * effectiveMultiplier).toFixed(4)} FLOWER)
                          </td>
                        </tr>
                        <tr className="bg-rose-950/20">
                          <td className="py-2 pr-3 font-black text-rose-300">
                            4. {activeOpp.targetItem.name} selling value
                          </td>
                          <td className="py-2 px-3 font-bold text-rose-300">
                            Non-tradeable (Cannot be sold on P2P Market)
                          </td>
                          <td className="py-2 pl-3 text-right font-black text-rose-300">
                            Not applicable
                          </td>
                        </tr>
                        <tr className="bg-sky-950/25">
                          <td className="py-2 pr-3 font-black text-sky-300">
                            5. {activeOpp.targetItem.name} XP
                          </td>
                          <td className="py-2 px-3 font-bold text-sky-200">
                            Verified game reward (+{scaledActiveVerifiedXp.toLocaleString()} XP)
                          </td>
                          <td className="py-2 pl-3 text-right font-black text-sky-300">
                            Separate benefit
                          </td>
                        </tr>
                        <tr className="bg-amber-500/10 border-t border-amber-500/30">
                          <td className="py-2.5 pr-3 font-black text-amber-200">
                            = Total Production Cost (C<sub>{activeOpp.targetItem.id}</sub> = C<sub>inputs</sub> + C<sub>time</sub> + C<sub>fees</sub>)
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-200/85">
                            {(baseExactInputCost * effectiveMultiplier).toFixed(4)} + {scaledTimeOpportunityCost.toFixed(4)} + {(additionalCheeseFeeFlower * effectiveMultiplier).toFixed(4)}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-black text-sm text-amber-100">
                            {scaledActiveConsumableTotalCost.toFixed(4)} FLOWER
                          </td>
                        </tr>
                        <tr className="bg-emerald-500/10 border-t border-emerald-500/30">
                          <td className="py-2.5 pr-3 font-black text-emerald-300">
                            = XP Efficiency (CostPerXP & XPPerFlower)
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-200">
                            CostPerXP = {scaledActiveConsumableTotalCost.toFixed(4)} / {scaledActiveVerifiedXp} = {activeCostPerXp.toFixed(6)} FLOWER/XP
                          </td>
                          <td className="py-2.5 pl-3 text-right font-black text-sm text-emerald-400">
                            {activeXpPerFlower.toLocaleString()} XP / FLOWER
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-amber-500/15 text-[10px] text-amber-300/60 uppercase">
                            <th className="py-2 pr-3">Financial Component</th>
                            <th className="py-2 px-3">Economic Basis & Verification</th>
                            <th className="py-2 pl-3 text-right">Value ({effectiveMultiplier}x)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-500/10 text-amber-100/90">
                          <tr>
                            <td className="py-2 pr-3 font-semibold text-amber-100">
                              1. Finished Product Price (V<sub>p</sub>)
                            </td>
                            <td className="py-2 px-3 text-amber-200/65">
                              {activePrefMeta.label} ({intel?.realizationChannel})
                            </td>
                            <td className="py-2 pl-3 text-right font-bold text-amber-100">
                              {scaledGross.toFixed(2)} FLOWER
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-3 font-semibold text-rose-300/90">
                              2. Ingredient Opportunity Cost (C<sub>inputs</sub>)
                            </td>
                            <td className="py-2 px-3 text-amber-200/65">
                              Σ(Q<sub>i</sub> × V<sub>i</sub>) for {ledger.map((i) => `${i.needed * effectiveMultiplier} ${i.name} (${i.unitPriceFlower.toFixed(4)})`).join(' + ')}
                            </td>
                            <td className="py-2 pl-3 text-right font-bold text-rose-300">
                              −{(baseExactInputCost * effectiveMultiplier).toFixed(4)} FLOWER
                            </td>
                          </tr>
                          <tr className="bg-amber-500/5">
                            <td className="py-2 pr-3 font-black text-amber-300">
                              = Value Added (VA = V<sub>p</sub> − ΣQ<sub>i</sub>V<sub>i</sub>)
                            </td>
                            <td className="py-2 px-3 text-amber-300/80">
                              Additional value created vs. selling raw ingredients independently
                            </td>
                            <td className="py-2 pl-3 text-right font-black text-amber-300">
                              +{scaledValueAdded.toFixed(2)} FLOWER
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-3 text-rose-300/80">
                              3. Additional Production Cost (C<sub>production</sub>)
                            </td>
                            <td className="py-2 px-3 text-amber-200/65">
                              {intel?.buildingRequired} fuel, crafting & facility upkeep fee
                            </td>
                            <td className="py-2 pl-3 text-right font-semibold text-rose-300">
                              −{scaledProdFee.toFixed(2)} FLOWER
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-3 text-rose-300/80">
                              4. Market Transaction Cost (C<sub>tx</sub>)
                            </td>
                            <td className="py-2 px-3 text-amber-200/65">
                              Applicable P2P / fulfillment tax (Net Proceeds P<sub>net</sub> = {scaledNetProceeds.toFixed(2)} FLOWER)
                            </td>
                            <td className="py-2 pl-3 text-right font-semibold text-rose-300">
                              −{scaledMarketFee.toFixed(2)} FLOWER
                            </td>
                          </tr>
                          <tr className="bg-purple-500/5">
                            <td className="py-2 pr-3 font-semibold text-purple-300">
                              5. Production Time & Opportunity Cost (C<sub>time</sub> = T × R)
                            </td>
                            <td className="py-2 px-3 text-amber-200/75 space-y-0.5">
                              <div>
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-black text-[10px] mr-1.5">
                                  {fin?.timeProfile?.primaryTimeType || 'Processing'}
                                </span>
                                {intel?.productionTimeFormatted} facility timer + {fin?.activeInteractionMinutes || 4}m active interaction ({activeTimeCostEval.formulaEvaluated})
                              </div>
                              <div className="text-[10px] text-purple-300/85 font-mono">
                                Material + Time Cost (C<sub>inputs</sub> + C<sub>time</sub>): {activeTimeCostEval.combinedFormulaEvaluated}
                              </div>
                            </td>
                            <td className="py-2 pl-3 text-right font-bold text-purple-300">
                              {scaledTimeOpportunityCost > 0
                                ? `−${scaledTimeOpportunityCost.toFixed(4)} FLOWER`
                                : '0.0000 FLOWER'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-3 font-semibold text-amber-200">
                              6. Verified Bumpkin XP Reward
                            </td>
                            <td className="py-2 px-3 text-amber-200/65">
                              Separate progression benefit (never auto-inflates FLOWER profit)
                            </td>
                            <td className="py-2 pl-3 text-right font-bold text-amber-300">
                              +{(xpInfo?.bumpkinXP || 80) * effectiveMultiplier} XP
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-3 font-semibold text-amber-200">
                              7. Market Liquidity & Realism
                            </td>
                            <td className="py-2 px-3 text-amber-200/65">
                              {liq?.liquidityNote}
                            </td>
                            <td className="py-2 pl-3 text-right font-bold text-emerald-300">
                              {liq?.dailyVolumeUnits || 120} units/24h
                            </td>
                          </tr>
                          <tr className="bg-emerald-500/10 border-t border-emerald-500/30">
                            <td className="py-2.5 pr-3 font-black text-emerald-300">
                              = Net Profit (Material Basis: P<sub>net</sub> − C<sub>inputs</sub> − C<sub>production</sub>)
                            </td>
                            <td className="py-2.5 px-3 text-emerald-300/80 font-semibold">
                              ROI: {activeRoiPercent.toFixed(1)}% · PPH: +{activePphFlower.toFixed(2)} FLOWER/hr (Unadjusted for C<sub>time</sub>)
                            </td>
                            <td className="py-2.5 pl-3 text-right font-black text-sm text-emerald-400">
                              +{scaledNetProfit.toFixed(2)} FLOWER
                            </td>
                          </tr>
                          <tr className="bg-purple-500/10 border-t border-purple-500/30">
                            <td className="py-2 pr-3 font-black text-purple-200">
                              = Time-Adjusted Economic Net Profit (NP − C<sub>time</sub>)
                            </td>
                            <td className="py-2 px-3 text-purple-200/80 text-[11px]">
                              Accounts for {scaledTimeOpportunityCost.toFixed(4)} FLOWER occupied production capacity opportunity cost ({TIME_VALUATION_SETTINGS.find((s) => s.id === timeValuationMode)?.label})
                            </td>
                            <td className="py-2 pl-3 text-right font-black text-sm text-purple-300">
                              +{scaledTimeAdjustedNetProfit.toFixed(2)} FLOWER
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {prodVals && (
                      <div className="pt-2 border-t border-amber-500/15 space-y-2">
                        <div className="text-[10px] font-bold text-amber-300/75 uppercase tracking-wider">
                          Multi-Source Finished Price Comparison (1x {activeOpp.targetItem.name})
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                          {[
                            { id: 'best_bid', label: 'Best Bid (Instant)', val: prodVals.bestBidFlower },
                            { id: 'completed_sales', label: 'Completed Sale', val: prodVals.completedSalesFlower },
                            { id: 'lowest_ask', label: 'Lowest Listing', val: prodVals.lowestAskFlower },
                            { id: 'npc_baseline', label: 'NPC Shop Floor', val: prodVals.npcBaselineFlower },
                            { id: 'historical', label: '7D Historical Avg', val: prodVals.historicalAvgFlower },
                            { id: 'user_cost', label: 'Your Craft Cost', val: prodVals.userAcquisitionCostFlower },
                          ].map((src) => (
                            <div
                              key={src.id}
                              className={`p-2 rounded-xl border ${
                                src.id === valuationPref
                                  ? 'bg-amber-500/15 border-amber-400/60 text-amber-100'
                                  : 'bg-[#1a130c] border-amber-500/10 text-amber-200/70'
                              }`}
                            >
                              <div className="text-[9px] text-amber-200/50 uppercase truncate">{src.label}</div>
                              <div className="font-black text-xs mt-0.5">{src.val.toFixed(2)} FLOWER</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* FEATURE TWO (D): XP-Adjusted Profitability & Bumpkin Progression Intelligence */}
              {xpInfo && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-950/35 via-[#171410] to-[#140f0a] border border-sky-500/30 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-sky-500/20">
                    <div>
                      <div className="text-xs font-black text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-sky-400" />
                        <span>Bumpkin XP & Progression Intelligence (Separate Non-Monetary Benefit)</span>
                      </div>
                      <p className="text-[11px] text-amber-200/65 mt-0.5">
                        XP is displayed as a distinct progression benefit and never automatically inflated into FLOWER profit.
                      </p>
                    </div>

                    <button
                      onClick={() => setEnableCustomXpValuation(!enableCustomXpValuation)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                        enableCustomXpValuation
                          ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                          : 'bg-[#120d08] border-sky-500/25 text-sky-300/70 hover:text-sky-200'
                      }`}
                    >
                      {enableCustomXpValuation
                        ? '✓ Custom XP Shadow Value Active'
                        : '+ Configure Optional XP Shadow Value'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#120d08] border border-emerald-500/20">
                      <div className="text-[9px] font-bold text-emerald-300/70 uppercase">Pure FLOWER Return</div>
                      <div className="text-sm font-black text-emerald-400 mt-0.5">
                        +{scaledNetProfit.toFixed(2)} FLOWER
                      </div>
                      <div className="text-[10px] text-amber-200/50">100% uninflated net</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#120d08] border border-sky-500/25">
                      <div className="text-[9px] font-bold text-sky-300/70 uppercase">Verified XP Reward</div>
                      <div className="text-sm font-black text-sky-300 mt-0.5">
                        +{(xpInfo.bumpkinXP * effectiveMultiplier).toLocaleString()} XP
                      </div>
                      <div className="text-[10px] text-amber-200/50">{xpInfo.xpPerHour} XP / eff. hour</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#120d08] border border-amber-500/15">
                      <div className="text-[9px] font-bold text-amber-300/70 uppercase">FLOWER Earned / XP</div>
                      <div className="text-sm font-black text-amber-200 mt-0.5">
                        +{xpInfo.flowerPerXP.toFixed(4)} FLOWER/XP
                      </div>
                      <div className="text-[10px] text-amber-200/50">Paid to level up</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#120d08] border border-amber-500/15">
                      <div className="text-[9px] font-bold text-amber-300/70 uppercase">Est. Time to Produce</div>
                      <div className="text-xs font-black text-amber-100 mt-0.5">
                        {xpInfo.estimatedTimeFormatted}
                      </div>
                      <div className="text-[10px] text-amber-200/50">Includes active clicks</div>
                    </div>
                  </div>

                  <div className="text-xs text-amber-100/85 flex items-center justify-between gap-2 bg-[#120d08] p-2.5 rounded-xl border border-sky-500/15">
                    <span>
                      <strong className="text-sky-300">Progression Relevance: </strong>
                      {xpInfo.progressionRelevance}
                    </span>
                  </div>

                  {enableCustomXpValuation && (
                    <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sky-200 font-bold">
                          User-Configured Shadow Rate (FLOWER per 100 XP):
                        </span>
                        {[0.1, 0.25, 0.5].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => setCustomFlowerPer100Xp(rate)}
                            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                              customFlowerPer100Xp === rate
                                ? 'bg-sky-400 text-slate-950'
                                : 'bg-[#120d08] text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {rate} FLOWER
                          </button>
                        ))}
                      </div>
                      <div className="text-right font-bold text-sky-200">
                        XP Shadow Bonus: +
                        {(((xpInfo.bumpkinXP * effectiveMultiplier) / 100) * customFlowerPer100Xp).toFixed(2)}{' '}
                        FLOWER → XP-Adjusted Total: +
                        {(
                          scaledNetProfit +
                          ((xpInfo.bumpkinXP * effectiveMultiplier) / 100) * customFlowerPer100Xp
                        ).toFixed(2)}{' '}
                        FLOWER
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION B (Feature One): Dual Readiness Verification Engine (R_i vs R_p) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#140f0a] border border-amber-500/25 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-500/15">
                  <div>
                    <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span>Dual Readiness Verification Engine (R<sub>i</sub> vs. R<sub>p</sub>)</span>
                    </div>
                    <p className="text-[11px] text-amber-200/60 mt-0.5">
                      Prevents misleading 100% indicators by verifying ingredient stock and facility readiness separately.
                    </p>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shrink-0 ${
                      activeExecutionState.tone === 'emerald'
                        ? 'bg-emerald-950/90 border-emerald-500/45 text-emerald-300'
                        : activeExecutionState.tone === 'amber'
                        ? 'bg-amber-950/90 border-amber-500/45 text-amber-300'
                        : activeExecutionState.tone === 'sky'
                        ? 'bg-sky-950/90 border-sky-500/45 text-sky-300'
                        : 'bg-rose-950/90 border-rose-500/45 text-rose-300'
                    }`}
                  >
                    {activeExecutionState.tone === 'emerald' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{activeExecutionState.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-[#1c150e] border border-amber-500/15 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-amber-200 uppercase">
                          1. Ingredient Readiness (R<sub>i</sub>)
                        </span>
                        <span
                          className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                            activeIngredientReadinessPercent >= 100
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {activeIngredientReadinessPercent}%
                        </span>
                      </div>

                      <div className="mt-2 p-2.5 rounded-xl bg-[#120d08] border border-amber-500/10 font-mono text-[11px] text-amber-200/80 space-y-1">
                        <div className="text-amber-300/70">
                          R<sub>i</sub> = (Available Required / Total Required) × 100
                        </div>
                        <div className="text-amber-100 font-bold">
                          R<sub>i</sub> = ({intel?.availableRequiredQuantity} / {intel?.totalRequiredQuantity} units) × 100 = {activeIngredientReadinessPercent}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-amber-200/70">
                        <span>Distinct Ingredient Slots Satisfied:</span>
                        <span className="font-bold text-amber-100">
                          {intel?.satisfiedIngredientCount} of {intel?.totalIngredientCount} items ready
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#120d08] rounded-full overflow-hidden p-0.5 border border-amber-500/10">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            activeIngredientReadinessPercent >= 100
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, activeIngredientReadinessPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#1c150e] border border-amber-500/15 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-amber-200 uppercase">
                          2. Production Readiness (R<sub>p</sub>)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleFacilityBusy(activeOpp.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              isFacilitySimulatedBusy
                                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                                : 'bg-[#120d08] border-amber-500/20 text-amber-300/70 hover:text-amber-200'
                            }`}
                          >
                            {isFacilitySimulatedBusy ? (
                              <>
                                <Lock className="w-2.5 h-2.5" />
                                <span>Simulating {intel?.buildingRequired} Busy</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-2.5 h-2.5" />
                                <span>Test Facility Lock</span>
                              </>
                            )}
                          </button>
                          <span
                            className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                              activeProductionReadinessPercent >= 100
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {activeProductionReadinessPercent}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1 text-[11px]">
                        {[
                          {
                            label: `Required building unlocked (${intel?.buildingRequired})`,
                            ok: activeProductionChecks.buildingUnlocked,
                          },
                          {
                            label: `Building available & usable (${isFacilitySimulatedBusy ? 'Queue Busy' : 'Idle'})`,
                            ok: activeProductionChecks.buildingAvailable,
                          },
                          {
                            label: `Recipe & Bumpkin Level verified (Req Lvl ${intel?.levelRequired} · Farm Lvl ${farm.bumpkinLevel || 51})`,
                            ok: activeProductionChecks.recipeVerified,
                          },
                          {
                            label: `Production capacity available (${intel?.productionTimeFormatted} slot)`,
                            ok: activeProductionChecks.capacityAvailable,
                          },
                          {
                            label: `All prerequisites satisfied`,
                            ok: activeProductionChecks.prerequisitesSatisfied,
                          },
                        ].map((chk, idx) => (
                          <div key={idx} className="flex items-center justify-between py-0.5">
                            <span className="text-amber-200/75 truncate pr-2">{chk.label}</span>
                            {chk.ok ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                                <Check className="w-3.5 h-3.5" /> Passed
                              </span>
                            ) : (
                              <span className="text-rose-400 font-bold flex items-center gap-0.5 shrink-0">
                                <XCircle className="w-3.5 h-3.5" /> Blocked
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C (Feature One): Explicit Missing Resource & Margin Preservation Analysis */}
              {missingItems.length > 0 && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/45 via-[#1c140d] to-[#140f0a] border border-amber-500/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-500/20">
                    <div>
                      <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                        Missing Resource & Margin Preservation Analysis
                      </div>
                      <h3 className="text-base font-black text-amber-50 mt-0.5">
                        {activeOpp.targetItem.name} · Missing Ingredient Breakdown
                      </h3>
                    </div>
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      Production Readiness: {activeIngredientReadinessPercent}% R<sub>i</sub>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {missingItems.map((item) => (
                      <div
                        key={item.itemId}
                        className="p-3.5 rounded-2xl bg-[#140f0a] border border-rose-500/35 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-2xl">
                            {item.icon}
                          </div>
                          <div>
                            <div className="text-sm font-black text-amber-50">{item.name}</div>
                            <div className="text-xs text-amber-200/75 mt-0.5">
                              Missing: <strong className="text-rose-300">{item.missing} unit{item.missing === 1 ? '' : 's'}</strong> · Required: <strong className="text-amber-200">{item.needed}</strong> (Owned: {item.have})
                            </div>
                            <div className="text-[11px] text-amber-200/55 mt-0.5">
                              Market Buy Cost: <strong className="text-amber-300">{item.missingAcquisitionCostFlower.toFixed(2)} FLOWER</strong> (@ {getIngredientUnitPriceByPref(item)} FLOWER/u)
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 shrink-0">
                          Missing
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#120d08] border border-amber-500/25 space-y-2">
                    <div className="flex items-start gap-2.5 text-xs text-amber-100/90">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300">FarmIQ Margin Preservation Check: </strong>
                        <span>{fin?.marginPreservationVerdict}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Recipe Ingredient Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-300/90 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Complete Recipe Ingredient Ledger ({activePrefMeta.shortLabel} Valuation)</span>
                  </h4>
                  <span className="text-[11px] text-amber-200/60">
                    Total Input Cost (C<sub>inputs</sub>): <strong className="text-rose-300">{scaledInputCost.toFixed(2)} FLOWER</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ledger.map((ing) => {
                    const activeUnitVal = getIngredientUnitPriceByPref(ing);
                    const activeTotalIngVal = Number((ing.needed * activeUnitVal).toFixed(2));
                    return (
                      <div
                        key={ing.itemId}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 ${
                          ing.isSatisfied
                            ? 'bg-[#141d15]/60 border-emerald-500/25'
                            : 'bg-[#221414]/60 border-rose-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{ing.icon}</span>
                            <div>
                              <div className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
                                <span>{ing.name}</span>
                                {ing.isSatisfied ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                )}
                              </div>
                              <div className="text-[11px] text-amber-200/60">
                                Unit Value (V<sub>i</sub>): <strong className="text-amber-200">{activeUnitVal} FLOWER</strong>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                ing.isSatisfied
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {ing.have} / {ing.needed} owned
                            </div>
                            <div className="text-[10px] text-amber-200/50 mt-0.5">
                              Q<sub>i</sub>V<sub>i</sub>: <strong className="text-amber-300">{activeTotalIngVal.toFixed(2)} FLOWER</strong>
                            </div>
                          </div>
                        </div>

                        {ing.isReservedForMilestone && (
                          <div className="pt-2 border-t border-amber-500/20 flex items-center gap-1.5 text-[10px] text-amber-300 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{ing.milestoneNote}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendation Verdict & Quick Navigation Actions */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-emerald-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black text-amber-200 uppercase tracking-wider">
                      FarmIQ Strategist Verdict
                    </div>
                    <p className="text-xs text-amber-100/90 mt-0.5 leading-relaxed">
                      {activeOpp.recommendation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => onNavigate('resources')}
                    className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-[#140f0a] hover:bg-[#241b12] text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Inspect Resource Engine</span>
                  </button>
                  <button
                    onClick={() => onNavigate('simulator')}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <span>Simulate Production</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

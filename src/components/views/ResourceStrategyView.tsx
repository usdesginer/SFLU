'use client';

import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Coins, 
  Clock, 
  Award,
  TrendingUp,
  Compass,
  Search,
  Sliders,
  Target,
  GitBranch,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info,
  DollarSign,
  Package,
  Wrench,
  Flame,
  Check,
  X,
  Lock,
  Unlock,
  EyeOff
} from 'lucide-react';
import { FarmState } from '../../types';
import { 
  discoverAllPlayerResources, 
  discoverAllPlayerUntradables,
  CategorizedInventoryItem, 
  UntradableInventoryItem,
  InventoryCategory,
  UntradableCategory
} from '../../lib/inventoryEngine';
import { 
  PRESET_GOALS, 
  FarmGoal, 
  generateResourceStrategy, 
  simulateResourceSale 
} from '../../lib/strategistEngine';
import { FLOWER_TOKEN_PRICE_USD } from '../../data/sflData';

interface ResourceStrategyViewProps {
  farm: FarmState;
  onNavigate: (tabId: any) => void;
  marketplaceData?: any;
}

type StrategistSubTab = 
  | 'scanner' 
  | 'inventory' 
  | 'untradable'
  | 'simulator' 
  | 'goals' 
  | 'chains';

export default function ResourceStrategyView({ 
  farm, 
  onNavigate, 
  marketplaceData 
}: ResourceStrategyViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<StrategistSubTab>('scanner');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>('all');
  const [untradableCategory, setUntradableCategory] = useState<UntradableCategory>('all');
  const [scannerCategory, setScannerCategory] = useState<InventoryCategory>('all');
  const [scannerSearch, setScannerSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [untradableSearch, setUntradableSearch] = useState<string>('');
  const [activeGoalId, setActiveGoalId] = useState<string>('goal-barn-upgrade');
  const [selectedItemName, setSelectedItemName] = useState<string>('Wood');
  const [simulateAmount, setSimulateAmount] = useState<number>(50);

  const commodities = marketplaceData?.commodities || {};
  const flowerPriceUSD = marketplaceData?.flowerPriceUSD || FLOWER_TOKEN_PRICE_USD;

  const activeGoal = useMemo(() => {
    return PRESET_GOALS.find(g => g.id === activeGoalId) || PRESET_GOALS[0];
  }, [activeGoalId]);

  const activeGoalIngredients = useMemo(() => {
    return Object.keys(activeGoal.requiredResources);
  }, [activeGoal]);

  // 1. Discover all verified TRADABLE resources
  const allResources = useMemo(() => {
    return discoverAllPlayerResources(
      farm.rawInventory,
      commodities,
      flowerPriceUSD,
      activeGoalIngredients
    );
  }, [farm.rawInventory, commodities, flowerPriceUSD, activeGoalIngredients]);

  // 2. Discover all UNTRADABLE account-bound items (Cakes, Tools, Seeds, Collectibles, Flowers)
  const allUntradables = useMemo(() => {
    return discoverAllPlayerUntradables(farm.rawInventory);
  }, [farm.rawInventory]);

  // Group untradables by category for count tabs
  const untradablesCount = useMemo(() => {
    return {
      all: allUntradables.length,
      food: allUntradables.filter(u => u.category === 'food').length,
      tool: allUntradables.filter(u => u.category === 'tool').length,
      seed: allUntradables.filter(u => u.category === 'seed').length,
      collectible: allUntradables.filter(u => u.category === 'collectible').length,
      flower: allUntradables.filter(u => u.category === 'flower').length,
      other: allUntradables.filter(u => u.category === 'other').length,
    };
  }, [allUntradables]);

  // Total tradable stockpile valuation in FLOWER and USD
  const totalStockpileValueFlower = useMemo(() => {
    return Number(allResources.reduce((sum, it) => sum + (it.totalValueFlower || 0), 0).toFixed(4));
  }, [allResources]);

  const totalStockpileValueUSD = useMemo(() => {
    return Number((totalStockpileValueFlower * flowerPriceUSD).toFixed(2));
  }, [totalStockpileValueFlower, flowerPriceUSD]);

  // Filtered tradable resources for inventory browser
  const filteredResources = useMemo(() => {
    return allResources.filter(it => {
      const matchesSearch = it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (selectedCategory === 'all') return true;
      return it.category === selectedCategory;
    });
  }, [allResources, searchQuery, selectedCategory]);

  // Filtered untradable items for untradable browser
  const filteredUntradables = useMemo(() => {
    return allUntradables.filter(it => {
      const matchesSearch = it.name.toLowerCase().includes(untradableSearch.toLowerCase()) ||
        it.utilityDescription.toLowerCase().includes(untradableSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (untradableCategory === 'all') return true;
      return it.category === untradableCategory;
    });
  }, [allUntradables, untradableSearch, untradableCategory]);

  // Filtered resources specifically for Scanner Quick Switcher
  const scannerItems = useMemo(() => {
    return allResources.filter(it => {
      const matchQuery = it.name.toLowerCase().includes(scannerSearch.toLowerCase());
      if (!matchQuery) return false;
      if (scannerCategory === 'all') return true;
      return it.category === scannerCategory;
    });
  }, [allResources, scannerSearch, scannerCategory]);

  // Selected item object for Strategist deep dive
  const activeItem = useMemo(() => {
    return allResources.find(r => r.name.toLowerCase() === selectedItemName.toLowerCase()) || 
      allResources[0] || {
        id: 'wood',
        name: 'Wood',
        category: 'raw' as const,
        icon: '🪵',
        quantityOwned: 124.2,
        formattedQuantity: '124.2',
        unitPriceSFL: 0.0120,
        totalValueSFL: 1.4899,
        marketPriceFlower: 0.0120,
        totalValueFlower: 1.4899,
        marketPriceUSD: 0.0018,
        totalValueUSD: 0.22,
        bettyPriceCoins: 3,
        recipesUsedIn: [],
        strategicScore: 90,
        strategicBadge: 'High Strategic Demand',
        replacementDifficulty: 'Easy',
        rechargeMethod: 'Chop Trees with Axes (recharges every 2 hours)',
      };
  }, [allResources, selectedItemName]);

  // Strategic Strategy Generator
  const strategyResult = useMemo(() => {
    return generateResourceStrategy(activeItem, farm, activeGoalId, flowerPriceUSD);
  }, [activeItem, farm, activeGoalId, flowerPriceUSD]);

  // Consequence Simulator
  const simulationResult = useMemo(() => {
    return simulateResourceSale(activeItem, simulateAmount, farm, activeGoalId, flowerPriceUSD);
  }, [activeItem, simulateAmount, farm, activeGoalId, flowerPriceUSD]);

  // Handlers
  const handleSelectItem = (name: string) => {
    setSelectedItemName(name);
    const it = allResources.find(r => r.name.toLowerCase() === name.toLowerCase());
    if (it) {
      setSimulateAmount(Math.round(it.quantityOwned * 0.25) || 1);
    }
    setActiveSubTab('scanner');
  };

  return (
    <div className="space-y-6">
      {/* ==================================================== */}
      {/* 1. HERO HEADER: FarmIQ Personal Farm Strategist      */}
      {/* ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#281c0f] via-[#352514] to-[#1c140c] border border-amber-500/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>FarmIQ Personal Farm Strategist</span>
              <span className="text-amber-200/50">•</span>
              <span className="text-emerald-400 font-bold">{allResources.length} Tradables</span>
              <span className="text-amber-200/50">•</span>
              <span className="text-amber-300 font-bold">{allUntradables.length} Account-Bound Items</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight">
              Know what you own. Understand what it can do. Make your next move count.
            </h1>
            
            <p className="text-xs sm:text-sm text-amber-200/70 leading-relaxed">
              Focuses strictly on <span className="text-amber-300 font-semibold">verified market commodities</span> denominated in <span className="text-pink-400 font-bold">FLOWER</span>. Non-tradable items (cakes, tools, seeds, and collectibles) are segregated into dedicated tabs with zero market valuation markup.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#19130b] border border-amber-500/30 text-right shadow-lg">
              <div className="text-[11px] font-bold text-amber-300/70 uppercase tracking-wider">
                Total Tradable Stockpile Worth
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-100 mt-0.5">
                {totalStockpileValueFlower.toLocaleString()} <span className="text-amber-400 text-lg font-bold">FLOWER</span>
              </div>
              <div className="text-xs text-amber-200/60 font-mono mt-0.5">
                ≈ ${totalStockpileValueUSD.toLocaleString()} USD (@ ${flowerPriceUSD.toFixed(4)})
              </div>
              <div className="text-[10px] text-emerald-400/90 mt-1 font-semibold flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Verified Tradeable Commodities Only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs within Personal Strategist */}
        <div className="mt-6 pt-5 border-t border-amber-900/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'scanner', label: '🎯 Opportunity Scanner', desc: 'Verified paths for selected item' },
            { id: 'inventory', label: `📦 Tradable Stockpile (${allResources.length})`, desc: 'Live market commodities' },
            { id: 'untradable', label: `🔒 Untradable Inventory (${allUntradables.length})`, desc: 'Cakes, Tools, Seeds & Collectibles' },
            { id: 'simulator', label: '⚡ Decision Simulator', desc: 'Test selling X units' },
            { id: 'goals', label: `🏆 Personal Goals (${activeGoal.title.split(' ')[0]})`, desc: 'Select farm milestone' },
            { id: 'chains', label: '⛓️ Production Chains', desc: 'Visual resource workflows' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as StrategistSubTab)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSubTab === tab.id
                  ? 'bg-amber-500 text-stone-950 font-black shadow-lg shadow-amber-500/25 scale-[1.02]'
                  : 'bg-[#1b150d] hover:bg-[#251d13] text-amber-200/80 hover:text-amber-100 border border-amber-500/20'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. SUBTAB: OPPORTUNITY SCANNER (Deep Dive on Item)   */}
      {/* ==================================================== */}
      {activeSubTab === 'scanner' && (
        <div className="space-y-6">
          {/* Quick Item Switcher Bar with Categories & Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: `All Tradables (${allResources.length})` },
                  { id: 'raw', label: '🪵 Raw Minerals (7)' },
                  { id: 'crop', label: '🌾 Crops & Produce (35)' },
                  { id: 'animal', label: '🥚 Livestock Yields (7)' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setScannerCategory(tab.id as InventoryCategory)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      scannerCategory === tab.id
                        ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                        : 'bg-[#18130c] text-amber-200/70 hover:text-amber-100 hover:bg-[#20180f] border border-amber-500/15'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/50" />
                <input
                  type="text"
                  placeholder="Filter resources..."
                  value={scannerSearch}
                  onChange={(e) => setScannerSearch(e.target.value)}
                  className="w-full bg-[#110d08] border border-amber-500/20 pl-8 pr-3 py-1 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {scannerItems.slice(0, 36).map(res => {
                const isSelected = res.name.toLowerCase() === activeItem.name.toLowerCase();
                return (
                  <button
                    key={res.name}
                    onClick={() => handleSelectItem(res.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-105 font-black'
                        : 'bg-[#18130c] border-amber-500/20 text-amber-200/80 hover:bg-[#221a10] hover:text-amber-100'
                    }`}
                  >
                    <span className="text-base">{res.icon}</span>
                    <span>{res.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-stone-900/40 text-stone-100' : 'bg-amber-950/80 text-amber-300'}`}>
                      {res.formattedQuantity}
                    </span>
                  </button>
                );
              })}
              {scannerItems.length === 0 && (
                <div className="text-xs text-amber-200/50 italic py-1 px-2">No matching items found</div>
              )}
            </div>
          </div>

          {/* Active Item Deep Dive Header */}
          <div className="p-6 rounded-3xl bg-[#17120a] border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-900/30">
              <div className="flex items-center gap-3.5">
                <span className="text-4xl p-2.5 rounded-2xl bg-[#22180e] border border-amber-500/20">{activeItem.icon}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-black text-amber-100">{activeItem.name}</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold capitalize">
                      {activeItem.category} Resource
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-semibold">
                      {activeItem.strategicBadge}
                    </span>
                  </div>
                  <div className="text-xs text-amber-200/60 mt-1">
                    Stockpile: <span className="font-bold text-amber-100">{activeItem.formattedQuantity} owned</span> • 
                    Unit: <span className="font-semibold text-amber-300">{activeItem.marketPriceFlower} FLOWER</span> (~${activeItem.marketPriceUSD < 0.0001 ? activeItem.marketPriceUSD.toFixed(6) : activeItem.marketPriceUSD.toFixed(4)} USD) • 
                    Total Worth: <span className="font-bold text-emerald-400">{activeItem.totalValueFlower} FLOWER</span> (~${activeItem.totalValueUSD} USD)
                  </div>
                </div>
              </div>

              {/* Strategic Priority Gauge & Simulate Button */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-amber-300/70 uppercase">Strategic Priority</div>
                  <div className="text-2xl font-black text-amber-400">
                    {activeItem.strategicScore} <span className="text-xs font-normal text-amber-200/50">/ 100</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSubTab('simulator')}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#241c12] hover:bg-[#2e2316] text-amber-300 border border-amber-500/25 text-xs font-bold transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Simulate Sale</span>
                </button>
              </div>
            </div>

            {/* Strategic Optimal Path Verdict */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-[#2a1e12] to-[#1c140c] border border-amber-500/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Strategist Optimal Verdict for {activeItem.formattedQuantity} {activeItem.name}</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-100">
                👉 {strategyResult.verdict.bestAction}
              </div>
              <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed font-medium">
                {strategyResult.verdict.summary}
              </p>
              {strategyResult.verdict.opportunityCostWarning && (
                <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Opportunity Cost Alert: </span>
                    {strategyResult.verdict.opportunityCostWarning}
                  </div>
                </div>
              )}
            </div>

            {/* Verified Strategic Paths Matrix (4 Paths Evaluated) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300/80 uppercase tracking-wider">
                <span>Verified Strategic Paths for {activeItem.name}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">All 4 Checks Passed (Affordability Verified)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {strategyResult.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                      opt.canAfford 
                        ? 'bg-[#1b150d] border-amber-500/30 hover:border-amber-400 hover:bg-[#241c12]' 
                        : 'bg-[#130e08] border-amber-900/20 opacity-80'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          opt.actionType === 'save' ? 'bg-amber-500 text-stone-950 font-black' :
                          opt.actionType === 'upgrade' ? 'bg-purple-950 text-purple-300 border border-purple-500/30' :
                          opt.actionType === 'craft' ? 'bg-blue-950 text-blue-300 border border-blue-500/30' :
                          'bg-stone-800 text-amber-200'
                        }`}>
                          {opt.actionType}
                        </span>

                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            opt.canAfford 
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}>
                            {opt.canAfford ? '✓ Affordable' : '✕ Missing'}
                          </span>
                          <span className="text-xs font-black text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded">
                            {opt.roiGrade}
                          </span>
                        </div>
                      </div>

                      <div className="font-extrabold text-sm text-amber-100">
                        {opt.title}
                      </div>

                      <div className="text-xs font-black text-emerald-400">
                        Est. Return: ~{opt.expectedReturnFlower} FLOWER
                        <span className="text-[10px] font-normal text-amber-200/50 ml-1">({opt.timeframe})</span>
                      </div>

                      <p className="text-[11px] text-amber-200/70 leading-relaxed font-medium">
                        {opt.breakdown}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-amber-900/30 text-[10px] text-amber-200/60 italic">
                      "{opt.recommendationNote}"
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Replenish & Production Strategy Footer */}
            <div className="pt-3 border-t border-amber-900/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#140f09] border border-amber-500/15">
                <span className="font-bold text-amber-300">Recharge Method:</span>{' '}
                <span className="text-amber-200/80">{activeItem.rechargeMethod}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#140f09] border border-amber-500/15">
                <span className="font-bold text-amber-300">Replacement Difficulty:</span>{' '}
                <span className={`font-semibold ${
                  activeItem.replacementDifficulty === 'Extreme' ? 'text-rose-400' :
                  activeItem.replacementDifficulty === 'Hard' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {activeItem.replacementDifficulty}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. SUBTAB: TRADABLE INVENTORY (Commodity Browser)    */}
      {/* ==================================================== */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: `All Tradables (${allResources.length})` },
                { id: 'raw', label: '🪵 Raw Minerals (7)' },
                { id: 'crop', label: '🌾 Crops & Produce (35)' },
                { id: 'animal', label: '🥚 Livestock Yields (7)' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as InventoryCategory)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === tab.id
                      ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-[#17120a] hover:bg-[#22190f] text-amber-200/70 hover:text-amber-100 border border-amber-500/15'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/50" />
              <input
                type="text"
                placeholder="Search tradable commodity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#110d08] border border-amber-500/20 pl-8 pr-3 py-1.5 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Tradables Table */}
          <div className="overflow-hidden rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#1f170e] text-amber-300/70 border-b border-amber-900/30 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Commodity</th>
                    <th className="py-3 px-3">Stockpile</th>
                    <th className="py-3 px-3">Spot Price</th>
                    <th className="py-3 px-3">Total Value</th>
                    <th className="py-3 px-3">Strategic Role</th>
                    <th className="py-3 px-3">Verified Recipes</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-950/40 text-amber-100">
                  {filteredResources.map((res) => (
                    <tr 
                      key={res.name}
                      onClick={() => handleSelectItem(res.name)}
                      className="hover:bg-[#20180f]/70 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{res.icon}</span>
                          <div>
                            <div className="font-bold text-amber-100 flex items-center gap-1.5">
                              {res.name}
                              {res.isGoalIngredient && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                  GOAL
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-amber-200/50 capitalize">
                              {res.category} Resource
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-extrabold text-amber-100 font-mono">
                        {res.formattedQuantity}
                      </td>

                      <td className="py-3 px-3 text-amber-200/80">
                        <div className="font-semibold text-xs text-amber-100">
                          {res.marketPriceFlower} FLOWER
                        </div>
                        <div className="text-[10px] text-amber-200/50 font-mono">
                          ~${res.marketPriceUSD < 0.0001 ? res.marketPriceUSD.toFixed(6) : res.marketPriceUSD.toFixed(4)} USD
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-extrabold text-emerald-400 text-xs">
                          {res.totalValueFlower.toLocaleString()} FLOWER
                        </div>
                        <div className="text-[10px] text-amber-200/60 font-mono">
                          ≈ ${res.totalValueUSD.toLocaleString()} USD
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25">
                          {res.strategicBadge}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-amber-200/60 text-[11px]">
                        {res.recipesUsedIn.length > 0 
                          ? `${res.recipesUsedIn.length} recipes (${res.recipesUsedIn.map(r => r.name).slice(0, 2).join(', ')}${res.recipesUsedIn.length > 2 ? '...' : ''})` 
                          : 'Liquidate or hold'}
                      </td>

                      <td className="py-3 px-4 sm:px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectItem(res.name);
                          }}
                          className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
                        >
                          Analyze
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. SUBTAB: UNTRADABLE ITEMS (Cakes, Tools, Seeds)    */}
      {/* ==================================================== */}
      {activeSubTab === 'untradable' && (
        <div className="space-y-4">
          {/* Informative Banner */}
          <div className="p-4 rounded-2xl bg-[#19140d] border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-100 flex items-center gap-2">
                  <span>Untradable Farm Inventory</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    {allUntradables.length} Items Owned
                  </span>
                </div>
                <div className="text-xs text-amber-200/60">
                  Account-bound assets designed for Bumpkin XP, tool harvesting, and plot seeding. Safely excluded from P2P market valuation.
                </div>
              </div>
            </div>

            <div className="text-xs text-amber-300/80 font-mono bg-[#120e08] px-3 py-1.5 rounded-xl border border-amber-500/15">
              Market Value: <span className="font-bold text-emerald-400">0 FLOWER</span> (Utility Only)
            </div>
          </div>

          {/* Category Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: `All Untradables (${untradablesCount.all})` },
                { id: 'food', label: `🎂 Foods & Cakes (${untradablesCount.food})` },
                { id: 'tool', label: `⛏️ Tools (${untradablesCount.tool})` },
                { id: 'seed', label: `🌱 Seeds (${untradablesCount.seed})` },
                { id: 'collectible', label: `🧸 Collectibles (${untradablesCount.collectible})` },
                { id: 'flower', label: `🌺 Flowers (${untradablesCount.flower})` },
                { id: 'other', label: `📦 Other (${untradablesCount.other})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setUntradableCategory(tab.id as UntradableCategory)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    untradableCategory === tab.id
                      ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-[#17120a] hover:bg-[#22190f] text-amber-200/70 hover:text-amber-100 border border-amber-500/15'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/50" />
              <input
                type="text"
                placeholder="Search untradable items..."
                value={untradableSearch}
                onChange={(e) => setUntradableSearch(e.target.value)}
                className="w-full bg-[#110d08] border border-amber-500/20 pl-8 pr-3 py-1.5 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Untradables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUntradables.map((item) => (
              <div 
                key={item.name}
                className="p-4 rounded-2xl bg-[#16120b] border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl p-2 rounded-xl bg-[#20180f] border border-amber-500/15">{item.icon}</span>
                    <div>
                      <div className="font-extrabold text-sm text-amber-100">{item.name}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {item.badge}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-amber-100 font-mono">
                      {item.formattedQuantity}
                    </div>
                    <div className="text-[10px] text-amber-200/50 font-semibold uppercase">
                      Owned
                    </div>
                  </div>
                </div>

                <div className="text-xs text-amber-200/70 bg-[#120e08] p-2.5 rounded-xl border border-amber-500/10">
                  <span className="font-bold text-amber-300">Utility: </span>
                  {item.utilityDescription}
                </div>

                <div className="flex items-center justify-between text-[10px] text-amber-200/50 pt-1 border-t border-amber-900/30 font-medium">
                  <span className="flex items-center gap-1 text-amber-400/80">
                    <Lock className="w-3 h-3" />
                    <span>Account-Bound</span>
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {item.xpYield ? `+${item.xpYield} XP Yield` : 'In-Game Farm Utility'}
                  </span>
                </div>
              </div>
            ))}

            {filteredUntradables.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-amber-200/50 italic bg-[#151009] rounded-2xl border border-amber-500/15">
                No untradable items found matching your filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. SUBTAB: DECISION SIMULATOR (Consequence Engine)   */}
      {/* ==================================================== */}
      {activeSubTab === 'simulator' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#17120a] border border-amber-500/30 shadow-xl space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Interactive Consequence Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-amber-100">
              What happens if I sell {activeItem.name}?
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/70">
              Slide the quantity to see how selling will affect your active milestones, recipes, and future capacity.
            </p>
          </div>

          {/* Slider and Input Controls */}
          <div className="p-5 rounded-2xl bg-[#1f170e] border border-amber-500/20 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-amber-200">
              <span>Amount of {activeItem.name} to Liquidate:</span>
              <span className="text-amber-400 text-base">{simulateAmount} / {activeItem.formattedQuantity}</span>
            </div>

            <input
              type="range"
              min="0"
              max={Math.ceil(activeItem.quantityOwned)}
              value={simulateAmount}
              onChange={(e) => setSimulateAmount(parseFloat(e.target.value) || 0)}
              className="w-full accent-amber-500 h-2 bg-stone-900 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-amber-200/50">
              <span>0 (Keep All)</span>
              <span>25% ({Math.round(activeItem.quantityOwned * 0.25)})</span>
              <span>50% ({Math.round(activeItem.quantityOwned * 0.5)})</span>
              <span>100% (Liquidate All)</span>
            </div>
          </div>

          {/* Simulation Output Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#1c150c] border border-amber-500/20">
              <div className="text-[11px] font-bold text-amber-300/70 uppercase">Immediate Proceeds</div>
              <div className="text-2xl font-black text-emerald-400">
                +{simulationResult.proceedsFlower || (simulationResult.clampedSell * activeItem.marketPriceFlower).toFixed(4)} FLOWER
              </div>
              <div className="text-[10px] text-amber-200/50 font-mono mt-0.5">
                ≈ ${simulationResult.proceedsUSD} USD (@ ${flowerPriceUSD.toFixed(4)})
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1c150c] border border-amber-500/20">
              <div className="text-[11px] font-bold text-amber-300/70 uppercase">Remaining Stockpile</div>
              <div className="text-2xl font-black text-amber-100">
                {simulationResult.remaining} <span className="text-sm font-semibold text-amber-400">{activeItem.name}</span>
              </div>
              <div className="text-[10px] text-amber-200/50 mt-0.5">
                {activeItem.quantityOwned} starting balance
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#1c150c] border border-amber-500/20">
              <div className="text-[11px] font-bold text-amber-300/70 uppercase">Milestone Impact</div>
              <div className={`text-base font-black ${simulationResult.isGoalDelayed ? 'text-rose-400' : 'text-emerald-400'}`}>
                {simulationResult.isGoalDelayed ? '⚠️ Milestone Delayed' : '✓ Safe for Milestone'}
              </div>
              <div className="text-[10px] text-amber-200/50 mt-0.5">
                Goal: {activeGoal.title}
              </div>
            </div>
          </div>

          {/* Impact Verdict Box */}
          <div className={`p-4 rounded-2xl border ${
            simulationResult.isGoalDelayed 
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200' 
              : simulationResult.brokenRecipes.length > 0 
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' 
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
          }`}>
            <div className="font-bold text-sm">
              {simulationResult.verdictMessage}
            </div>
            {simulationResult.brokenRecipes.length > 0 && (
              <div className="text-xs mt-1.5 text-amber-300/80">
                Recipes affected: <span className="font-bold">{simulationResult.brokenRecipes.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. SUBTAB: PERSONAL GOALS TRACKER                    */}
      {/* ==================================================== */}
      {activeSubTab === 'goals' && (
        <div className="space-y-6">
          <div className="space-y-1 px-1">
            <h2 className="text-xl sm:text-2xl font-black text-amber-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <span>Personal Farm Goals & Milestones</span>
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/70">
              Select your current focus. FarmIQ will adapt all resource recommendations to prioritize your target milestone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRESET_GOALS.map((goal) => {
              const isSelected = goal.id === activeGoalId;
              const rawInventory = farm.rawInventory || {};

              // Calculate overall completion %
              let totalRequired = 0;
              let totalOwned = 0;
              const checklist = Object.entries(goal.requiredResources).map(([resName, reqCount]) => {
                const key = Object.keys(rawInventory).find(k => k.toLowerCase() === resName.toLowerCase());
                const owned = key ? parseFloat(String(rawInventory[key])) || 0 : 0;
                totalRequired += reqCount;
                totalOwned += Math.min(owned, reqCount);
                return {
                  name: resName,
                  required: reqCount,
                  owned,
                  isReady: owned >= reqCount,
                };
              });

              const progressPct = Math.min(100, Math.round((totalOwned / totalRequired) * 100));
              const isFullyReady = checklist.every(c => c.isReady) && (farm.sflBalance >= (goal.sflCost * 0.1));

              return (
                <div
                  key={goal.id}
                  onClick={() => setActiveGoalId(goal.id)}
                  className={`p-5 rounded-3xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-[#251b10] border-amber-500 shadow-xl shadow-amber-500/15 scale-[1.02]'
                      : 'bg-[#16120b] border-amber-500/20 hover:border-amber-500/40 hover:bg-[#1d160e]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{goal.icon}</span>
                        <div>
                          <div className="font-extrabold text-sm text-amber-100">{goal.title}</div>
                          <div className="text-[10px] text-amber-200/50">{goal.description}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isFullyReady 
                          ? 'bg-emerald-500 text-stone-950 font-black' 
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                      }`}>
                        {progressPct}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-[#110d08] overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFullyReady ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Ingredient Checklist */}
                    <div className="space-y-1.5 pt-1">
                      {checklist.map(c => (
                        <div key={c.name} className="flex items-center justify-between text-xs">
                          <span className={c.isReady ? 'text-amber-200' : 'text-amber-200/60'}>
                            {c.name}:
                          </span>
                          <span className={`font-mono text-[11px] ${c.isReady ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                            {c.owned.toFixed(1)} / {c.required} {c.isReady ? '✓' : `(need ${(c.required - c.owned).toFixed(1)})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-900/30 flex items-center justify-between text-[11px]">
                    <span className="text-amber-300 font-semibold">{goal.expectedBenefit}</span>
                    <button className={`font-bold px-2.5 py-1 rounded-lg ${isSelected ? 'bg-amber-500 text-stone-950' : 'bg-[#20180f] text-amber-300'}`}>
                      {isSelected ? 'Active' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. SUBTAB: PRODUCTION CHAINS (Visual Roadmap)        */}
      {/* ==================================================== */}
      {activeSubTab === 'chains' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#17120a] border border-amber-500/30 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-amber-100 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-amber-400" />
              <span>Sunflower Land Verified Production Chains</span>
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/70">
              How raw materials compound into high-value dairy, tools, and farm infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chain 1: Dairy & Cheese */}
            <div className="p-5 rounded-2xl bg-[#1f170e] border border-amber-500/20 space-y-3">
              <div className="font-extrabold text-sm text-amber-100 flex items-center gap-2">
                <span>🌾 Wheat Feed</span>
                <span>➡️</span>
                <span>🐄 Barn Cows</span>
                <span>➡️</span>
                <span>🥛 Raw Milk</span>
                <span>➡️</span>
                <span>🧀 Deli Cheese</span>
              </div>
              <p className="text-xs text-amber-200/70">
                1 Barn Cow generates ~2 Milk per day. 3 Milk crafted at the Deli yields 1 Cheese (+320 Bumpkin XP).
              </p>
              <div className="text-[11px] text-emerald-400 font-bold">
                Value Added: Converts low-margin wheat into high-tier Bumpkin leveling XP.
              </div>
            </div>

            {/* Chain 2: Timber to Mining */}
            <div className="p-5 rounded-2xl bg-[#1f170e] border border-amber-500/20 space-y-3">
              <div className="font-extrabold text-sm text-amber-100 flex items-center gap-2">
                <span>🪵 Wood</span>
                <span>➡️</span>
                <span>🪓 Tools</span>
                <span>➡️</span>
                <span>⛓️ Iron & Gold</span>
                <span>➡️</span>
                <span>⛏️ Gold Pickaxe</span>
                <span>➡️</span>
                <span>💎 Crimstone</span>
              </div>
              <p className="text-xs text-amber-200/70">
                Wood crafts Pickaxes, which mine Iron and Gold, forging Gold Pickaxes to harvest rare Crimstone (0.65 FLOWER floor).
              </p>
              <div className="text-[11px] text-emerald-400 font-bold">
                Value Added: Converts basic timber into peak endgame crypto assets.
              </div>
            </div>

            {/* Chain 3: Poultry & Bakery Cakes */}
            <div className="p-5 rounded-2xl bg-[#1f170e] border border-amber-500/20 space-y-3">
              <div className="font-extrabold text-sm text-amber-100 flex items-center gap-2">
                <span>🌾 Wheat Feed</span>
                <span>➡️</span>
                <span>🐔 Chickens</span>
                <span>➡️</span>
                <span>🥚 Fresh Eggs</span>
                <span>➡️</span>
                <span>🌻 Sunflowers</span>
                <span>➡️</span>
                <span>🎂 Sunflower Cake</span>
              </div>
              <p className="text-xs text-amber-200/70">
                100 Sunflowers + 5 Wheat + 4 Eggs bake into a Sunflower Cake granting +210 Bumpkin XP.
              </p>
              <div className="text-[11px] text-emerald-400 font-bold">
                Value Added: Primary food item to level Bumpkins for Master Farmer unlocks.
              </div>
            </div>

            {/* Chain 4: Floral & Honey */}
            <div className="p-5 rounded-2xl bg-[#1f170e] border border-amber-500/20 space-y-3">
              <div className="font-extrabold text-sm text-amber-100 flex items-center gap-2">
                <span>🌺 Greenhouse Beds</span>
                <span>➡️</span>
                <span>🐝 Beehives</span>
                <span>➡️</span>
                <span>🍯 Honey</span>
                <span>➡️</span>
                <span>💐 Royal Bouquet</span>
              </div>
              <p className="text-xs text-amber-200/70">
                Red Pansies, Yellow Daffodils, White Lotus, and Honey craft into Royal Bouquets for elite delivery rewards.
              </p>
              <div className="text-[11px] text-emerald-400 font-bold">
                Value Added: Highest single delivery payout and Bumpkin XP multiplier.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

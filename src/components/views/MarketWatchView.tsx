'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Clock, 
  Sparkles,
  ArrowUpDown,
  Coins,
  Activity,
  Layers,
  ArrowRightLeft,
  Info,
  ExternalLink,
  ShieldCheck,
  Flame,
  Zap,
  Target,
  PieChart,
  HelpCircle,
  Filter,
  ChevronRight,
  TrendingUp as GainersIcon,
  ShoppingBag,
  Award
} from 'lucide-react';
import { PriceAlert, FarmState } from '../../types';
import { SFL_ITEMS, SFL_TOKEN_PRICE_USD } from '../../data/sflData';
import { INITIAL_WATCHLIST, fetchLiveMarketplaceActivity } from '../../lib/farmService';
import TradeableOrderBookModal from '../TradeableOrderBookModal';
import { isItemMarketTradeable, TRADEABLE_ITEM_IDS } from '../../data/gameKnowledge';
import { fetchFarmWatchlist, persistWatchlistAlert, removeWatchlistAlert } from '../../lib/supabaseClient';
import {
  buildMarketPulseItems,
  buildPersonalMarketOpportunities,
  calculateFarmMarketExposure,
  MarketPulseItem,
  PersonalizedMarketOpportunity,
  FarmMarketExposure,
  TimeWindow
} from '../../lib/marketPulseEngine';

// Re-exported from shared server/client knowledge registry for P2P-tradeable commodities
export const ITEM_NUMERIC_ID_MAP: Record<string, number> = TRADEABLE_ITEM_IDS;

interface MarketWatchViewProps {
  marketplaceData?: any;
  farmId?: string | number;
  farm?: FarmState;
  onNavigate?: (tab: any) => void;
}

type MainTab = 'pulse' | 'personal' | 'exposure' | 'catalogue' | 'watchlist';

export default function MarketWatchView({ marketplaceData: initialMarketData, farmId, farm, onNavigate }: MarketWatchViewProps) {
  const [marketData, setMarketData] = useState<any>(initialMarketData || null);
  const [watchlist, setWatchlist] = useState<PriceAlert[]>(INITIAL_WATCHLIST);
  const [activeTab, setActiveTab] = useState<MainTab>('pulse');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTradeable, setSelectedTradeable] = useState<{ id: number; name: string; icon: string; collection?: string } | null>(null);
  
  // Alert form state
  const [newItemId, setNewItemId] = useState('wheat');
  const [newTargetPrice, setNewTargetPrice] = useState('0.0139');
  const [newCondition, setNewCondition] = useState<'above' | 'below'>('above');
  
  // Catalogue search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'crops' | 'resources' | 'animals'>('all');
  const [isFetchingMarket, setIsFetchingMarket] = useState(false);

  useEffect(() => {
    if (farmId) {
      fetchFarmWatchlist(farmId).then(list => {
        if (list && list.length > 0) setWatchlist(list);
      });
    }
  }, [farmId]);

  useEffect(() => {
    if (initialMarketData) {
      setMarketData(initialMarketData);
    } else {
      setIsFetchingMarket(true);
      fetchLiveMarketplaceActivity().then((data) => {
        setMarketData(data);
        setIsFetchingMarket(false);
      });
    }
  }, [initialMarketData]);

  // If historical 24h/7d baselines are warming on the server after cold start, poll once politely ~16s later
  useEffect(() => {
    if (!marketData || (marketData.has24hHistory && marketData.has7dHistory)) return;
    const timer = setTimeout(() => {
      fetchLiveMarketplaceActivity().then((data) => {
        if (data && Object.keys(data.commodities || {}).length > 0) {
          setMarketData(data);
        }
      });
    }, 16_000);
    return () => clearTimeout(timer);
  }, [marketData]);

  const commodities = marketData?.commodities || {};
  const flowerPriceUSD = marketData?.flowerPriceUSD || 0.1504;
  const totalTrackedItems = marketData?.totalTrackedItems || 3377;
  const has1hHistory = Boolean(marketData?.has1hHistory);
  const has24hHistory = Boolean(marketData?.has24hHistory);
  const has7dHistory = Boolean(marketData?.has7dHistory);

  // 1. Build Market Pulse Items
  const pulseItems: MarketPulseItem[] = useMemo(() => {
    return buildMarketPulseItems(commodities, flowerPriceUSD);
  }, [commodities, flowerPriceUSD]);

  // 2. Build Personalized Market Opportunities
  const personalOpportunities: PersonalizedMarketOpportunity[] = useMemo(() => {
    if (!farm) return [];
    return buildPersonalMarketOpportunities(pulseItems, farm, flowerPriceUSD);
  }, [pulseItems, farm, flowerPriceUSD]);

  // 3. Build Farm Market Exposure
  const farmExposure: FarmMarketExposure | null = useMemo(() => {
    if (!farm) return null;
    return calculateFarmMarketExposure(pulseItems, farm, flowerPriceUSD);
  }, [pulseItems, farm, flowerPriceUSD]);

  // Helper: Get verified delta for current timeWindow (null when window history unavailable)
  const getItemChange = (item: MarketPulseItem): number | null => {
    if (timeWindow === '1h') return item.change1h;
    if (timeWindow === '7d') return item.change7d;
    return item.change24h;
  };

  // Trending Filter: Safeguard-passed active items
  const validTrendingItems = useMemo(() => {
    return pulseItems.filter(item => item.safeguardPassed && item.floorFlower !== null);
  }, [pulseItems]);

  // Top Gainers (strictly positive verified deltas)
  const topGainers = useMemo(() => {
    return [...validTrendingItems]
      .filter(item => {
        const c = getItemChange(item);
        return c !== null && c > 0;
      })
      .sort((a, b) => (getItemChange(b) ?? 0) - (getItemChange(a) ?? 0))
      .slice(0, 4);
  }, [validTrendingItems, timeWindow]);

  // Top Losers (strictly negative verified deltas)
  const topLosers = useMemo(() => {
    return [...validTrendingItems]
      .filter(item => {
        const c = getItemChange(item);
        return c !== null && c < 0;
      })
      .sort((a, b) => (getItemChange(a) ?? 0) - (getItemChange(b) ?? 0))
      .slice(0, 4);
  }, [validTrendingItems, timeWindow]);

  // Most Active
  const mostActive = useMemo(() => {
    return [...pulseItems]
      .filter(i => i.floorFlower !== null)
      .sort((a, b) => b.trades24h - a.trades24h)
      .slice(0, 4);
  }, [pulseItems]);

  // Breakout Items
  const breakoutItems = useMemo(() => {
    const breakouts = pulseItems.filter(i => i.isBreakout && i.change24h !== null);
    return breakouts.length > 0
      ? breakouts.slice(0, 4)
      : [...validTrendingItems]
          .filter(i => i.change24h !== null && i.change24h >= 2.0)
          .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
          .slice(0, 4);
  }, [pulseItems, validTrendingItems]);

  // Full Catalogue Filter (Strictly P2P-Tradeable Produce: Crops, Fruits, Tradeable Minerals, Animal Produce)
  const itemsList = Object.values(SFL_ITEMS);
  const filteredCatalogue = itemsList.filter(item => {
    if (!isItemMarketTradeable(item.name)) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategory === 'crops') return item.category === 'crop' || item.category === 'fruit';
    if (selectedCategory === 'resources') return item.category === 'resource';
    if (selectedCategory === 'animals') return item.category === 'animal';
    return true;
  });

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const item = SFL_ITEMS[newItemId];
    if (!item) return;

    const liveComm = commodities[newItemId];
    const effectiveCurrentPrice = liveComm?.floorFlower !== null && liveComm?.floorFlower !== undefined 
      ? liveComm.floorFlower 
      : (liveComm?.latestSaleFlower || 0);

    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      itemId: newItemId,
      itemName: item.name,
      targetPrice: parseFloat(newTargetPrice) || effectiveCurrentPrice,
      condition: newCondition,
      currentPrice: effectiveCurrentPrice,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setWatchlist(prev => [newAlert, ...prev]);
    if (farmId) {
      persistWatchlistAlert(newAlert, farmId);
    }
    setShowAddModal(false);
  };

  const removeAlert = (id: string) => {
    setWatchlist(prev => prev.filter(a => a.id !== id));
    if (farmId) {
      removeWatchlistAlert(id, farmId);
    }
  };

  const toggleAlert = (id: string) => {
    setWatchlist(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a);
      const target = updated.find(a => a.id === id);
      if (target && farmId) {
        persistWatchlistAlert(target, farmId);
      }
      return updated;
    });
  };

  const formatFlower = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'Unavailable';
    if (val === 0) return '0.0000';
    if (val < 0.0001) return val.toFixed(6);
    if (val < 0.01) return val.toFixed(4);
    if (val < 1) return val.toFixed(4);
    return val.toFixed(2);
  };

  const formatUSD = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return 'Unavailable';
    if (val < 0.0001) return `~$${val.toFixed(6)}`;
    if (val < 0.01) return `~$${val.toFixed(4)}`;
    return `~$${val.toFixed(3)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#241a0e] via-[#2d2012] to-[#1c150c] border border-amber-500/25 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>FarmIQ Market Pulse & Opportunity Engine</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight">
              Market Watch & Verified Trading Feeds
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/70 leading-relaxed">
              Track live P2P trends denominated strictly in <span className="text-amber-300 font-bold">FLOWER</span>. 
              Our engine applies multi-window liquidity safeguards, identifies top market movers, and translates price action into personalized profit strategies for <span className="text-amber-300 font-bold">{farm?.ownerName || (farm?.farmId ? `Farm #${farm.farmId}` : 'Your Farm')}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigate && (
              <button
                onClick={() => onNavigate('ai-advisor')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#18120a] hover:bg-[#241b10] border border-emerald-500/40 text-emerald-300 font-extrabold text-sm shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Ask AI Advisor</span>
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4" />
              <span>Set Price Target Alert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Market Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20 shadow-md">
          <div className="flex items-center justify-between mb-1.5 text-amber-400/80">
            <span className="text-[11px] font-bold uppercase tracking-wider">Market Currency</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-100 flex items-center gap-2">
            <span>🌸 FLOWER</span>
          </div>
          <div className="text-[10px] text-amber-200/60 mt-0.5">
            Verified peer-to-peer exchange unit
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20 shadow-md">
          <div className="flex items-center justify-between mb-1.5 text-amber-400/80">
            <span className="text-[11px] font-bold uppercase tracking-wider">Oracle Spot Price</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-100">
            ${flowerPriceUSD.toFixed(4)} <span className="text-xs font-normal text-amber-300">USD</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">
            In-game oracle exchange benchmark
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20 shadow-md">
          <div className="flex items-center justify-between mb-1.5 text-amber-400/80">
            <span className="text-[11px] font-bold uppercase tracking-wider">Personal Opportunities</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300">
            {personalOpportunities.length} <span className="text-xs font-normal text-amber-400">actions</span>
          </div>
          <div className="text-[10px] text-amber-200/60 mt-0.5">
            Matched to your stockpile & active goals
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20 shadow-md">
          <div className="flex items-center justify-between mb-1.5 text-amber-400/80">
            <span className="text-[11px] font-bold uppercase tracking-wider">Portfolio Sentiment</span>
            <PieChart className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm sm:text-base font-black text-emerald-400 truncate">
            {farmExposure ? farmExposure.sentiment.split(' ')[0] + ' ' + (farmExposure.sentiment.split(' ')[1] || '') : 'Balanced'}
          </div>
          <div className="text-[10px] text-amber-200/60 mt-0.5">
            {farmExposure ? `${farmExposure.risingExposurePercent}% of farm assets rising` : 'Real-time analysis'}
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-amber-900/40 pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'pulse', label: '⚡ Market Pulse & Trending', badge: `${topGainers.length + topLosers.length}` },
          { id: 'personal', label: '🎯 Personal Opportunities', badge: `${personalOpportunities.length} Available` },
          { id: 'exposure', label: '🌐 Farm Market Exposure', badge: farmExposure ? `${farmExposure.risingExposurePercent}% Rising` : undefined },
          { id: 'catalogue', label: '📊 Verified Order Books', badge: `${totalTrackedItems}` },
          { id: 'watchlist', label: '🔔 Profit Targets', badge: `${watchlist.length}` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as MainTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/25 scale-102'
                : 'bg-[#18130c] text-amber-200/70 hover:text-amber-100 hover:bg-[#221a11] border border-amber-500/15'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === tab.id
                  ? 'bg-stone-950/30 text-stone-950'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MARKET PULSE & TRENDING                                            */}
      {/* ========================================================================= */}
      {activeTab === 'pulse' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#18130c] border border-amber-500/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-200/80 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Time Horizon:</span>
              </span>
              <div className="flex items-center gap-1 bg-[#120e09] p-1 rounded-xl border border-amber-500/20">
                {(['1h', '24h', '7d'] as TimeWindow[]).map(window => (
                  <button
                    key={window}
                    onClick={() => setTimeWindow(window)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      timeWindow === window
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'text-amber-200/60 hover:text-amber-100'
                    }`}
                  >
                    {window === '1h' ? '1 Hour (Tension)' : window === '24h' ? '24 Hours (Daily)' : '7 Days (Trend)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-200/70">
              <ShieldCheck className={`w-4 h-4 ${
                (timeWindow === '24h' && has24hHistory) || (timeWindow === '7d' && has7dHistory) || (timeWindow === '1h' && has1hHistory)
                  ? 'text-emerald-400'
                  : 'text-amber-400 animate-pulse'
              }`} />
              <span>
                {timeWindow === '24h'
                  ? has24hHistory
                    ? `Verified 24h Baseline (${marketData?.yesterdayDate} → ${marketData?.date})`
                    : 'Syncing verified 24h report from Sunflower Land API...'
                  : timeWindow === '7d'
                  ? has7dHistory
                    ? `Verified 7d Baseline (${marketData?.sevenDayDate} → ${marketData?.date})`
                    : 'Syncing verified 7-day report from Sunflower Land API...'
                  : has1hHistory
                  ? 'Verified 1h Server Snapshot Baseline Active'
                  : 'Collecting 1h snapshots (keep tab open ≥45m; zero synthetic multipliers)'}
              </span>
            </div>
          </div>

          {/* 4 Feature Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Top Gainers */}
            <div className="p-4 rounded-3xl bg-[#17120a] border border-emerald-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <span className="font-black text-xs uppercase tracking-wider text-emerald-300">Top Gainers</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {timeWindow}
                </span>
              </div>
              <div className="space-y-2.5">
                {topGainers.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-amber-200/50">
                    {(timeWindow === '24h' && !has24hHistory) || (timeWindow === '7d' && !has7dHistory) || (timeWindow === '1h' && !has1hHistory)
                      ? `Waiting on verified ${timeWindow} historical baseline...`
                      : `No active commodities gained over ${timeWindow}.`}
                  </div>
                ) : (
                  topGainers.map((item, idx) => {
                    const chg = getItemChange(item);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          const numericId = ITEM_NUMERIC_ID_MAP[item.id];
                          if (numericId) {
                            setSelectedTradeable({ id: numericId, name: item.name, icon: item.icon, collection: 'collectibles' });
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#20180f]/60 hover:bg-[#281f14] transition-colors cursor-pointer border border-transparent hover:border-amber-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-amber-100 flex items-center gap-1">
                              <span>{item.name}</span>
                              <span className="text-[9px] text-amber-400/60">#{idx + 1}</span>
                            </div>
                            <div className="text-[10px] text-amber-200/50">{formatFlower(item.floorFlower)} FLOWER</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-emerald-400">+{chg}%</div>
                          <div className="text-[9px] text-amber-200/40">
                            {has24hHistory ? `${item.trades24h.toLocaleString()} trades/24h` : `${item.lifetimeTrades.toLocaleString()} total`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top Losers */}
            <div className="p-4 rounded-3xl bg-[#17120a] border border-rose-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <TrendingDown className="w-4 h-4" />
                  </span>
                  <span className="font-black text-xs uppercase tracking-wider text-rose-300">Top Losers</span>
                </div>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/30">
                  {timeWindow}
                </span>
              </div>
              <div className="space-y-2.5">
                {topLosers.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-amber-200/50">
                    {(timeWindow === '24h' && !has24hHistory) || (timeWindow === '7d' && !has7dHistory) || (timeWindow === '1h' && !has1hHistory)
                      ? `Waiting on verified ${timeWindow} historical baseline...`
                      : `No active commodities declined over ${timeWindow}.`}
                  </div>
                ) : (
                  topLosers.map((item, idx) => {
                    const chg = getItemChange(item);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          const numericId = ITEM_NUMERIC_ID_MAP[item.id];
                          if (numericId) {
                            setSelectedTradeable({ id: numericId, name: item.name, icon: item.icon, collection: 'collectibles' });
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#20180f]/60 hover:bg-[#281f14] transition-colors cursor-pointer border border-transparent hover:border-amber-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-amber-100 flex items-center gap-1">
                              <span>{item.name}</span>
                              <span className="text-[9px] text-amber-400/60">#{idx + 1}</span>
                            </div>
                            <div className="text-[10px] text-amber-200/50">{formatFlower(item.floorFlower)} FLOWER</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-rose-400">{chg}%</div>
                          <div className="text-[9px] text-amber-200/40">
                            {has24hHistory ? `${item.trades24h.toLocaleString()} trades/24h` : `${item.lifetimeTrades.toLocaleString()} total`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Most Active (Volume Leaders) */}
            <div className="p-4 rounded-3xl bg-[#17120a] border border-amber-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Flame className="w-4 h-4" />
                  </span>
                  <span className="font-black text-xs uppercase tracking-wider text-amber-300">Most Active</span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {has24hHistory ? '24h Liquidity' : 'Cumulative Vol'}
                </span>
              </div>
              <div className="space-y-2.5">
                {mostActive.map((item, idx) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      const numericId = ITEM_NUMERIC_ID_MAP[item.id];
                      if (numericId) {
                        setSelectedTradeable({ id: numericId, name: item.name, icon: item.icon, collection: 'collectibles' });
                      }
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#20180f]/60 hover:bg-[#281f14] transition-colors cursor-pointer border border-transparent hover:border-amber-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-amber-100 flex items-center gap-1">
                          <span>{item.name}</span>
                          <span className="text-[9px] text-amber-400/60">#{idx + 1}</span>
                        </div>
                        <div className="text-[10px] text-amber-200/50">{formatFlower(item.floorFlower)} FLOWER</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-amber-300">
                        {item.trades24h.toLocaleString()} {has24hHistory ? '24h trades' : 'trades'}
                      </div>
                      <div className="text-[9px] text-amber-200/50">
                        {item.volume24h.toLocaleString()} F {has24hHistory ? '(24h)' : 'total'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakout Watch */}
            <div className="p-4 rounded-3xl bg-[#17120a] border border-cyan-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Zap className="w-4 h-4" />
                  </span>
                  <span className="font-black text-xs uppercase tracking-wider text-cyan-300">Breakout Radar</span>
                </div>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Volume Spike
                </span>
              </div>
              <div className="space-y-2.5">
                {breakoutItems.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-amber-200/50">
                    {has24hHistory ? 'No qualified breakout surges today.' : 'Awaiting verified 24h delta to detect breakouts.'}
                  </div>
                ) : (
                  breakoutItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        const numericId = ITEM_NUMERIC_ID_MAP[item.id];
                        if (numericId) {
                          setSelectedTradeable({ id: numericId, name: item.name, icon: item.icon, collection: 'collectibles' });
                        }
                      }}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#20180f]/60 hover:bg-[#281f14] transition-colors cursor-pointer border border-transparent hover:border-amber-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-amber-100 flex items-center gap-1">
                            <span>{item.name}</span>
                            <span className="text-[9px] text-cyan-400">⚡ ALERT</span>
                          </div>
                          <div className="text-[10px] text-amber-200/50">{formatFlower(item.floorFlower)} FLOWER</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-cyan-300">Score: {item.marketOpportunityScore}</div>
                        <div className="text-[9px] text-emerald-400 font-bold">
                          {item.change24h !== null ? `+${item.change24h}% 24h` : 'Live'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Full Trending Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs font-bold text-amber-300/80 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Market Movement & Velocity Leaderboard ({validTrendingItems.length} active items)</span>
              </div>
              <span className="text-[11px] text-amber-200/50">
                {(timeWindow === '24h' && has24hHistory) || (timeWindow === '7d' && has7dHistory) || (timeWindow === '1h' && has1hHistory)
                  ? `Sorted by verified API delta over ${timeWindow}`
                  : `Sorted by activity while ${timeWindow} history loads`}
              </span>
            </div>

            <div className="overflow-hidden rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#20180f] text-amber-300/70 border-b border-amber-900/30 font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 sm:px-6">Item</th>
                      <th className="py-3 px-3">Lowest Floor</th>
                      <th className="py-3 px-3">{timeWindow} Movement %</th>
                      <th className="py-3 px-3">Signal</th>
                      <th className="py-3 px-3">Liquidity Depth</th>
                      <th className="py-3 px-3">Opportunity Score</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-950/40 text-amber-100">
                    {[...validTrendingItems]
                      .sort((a, b) => {
                        const ca = getItemChange(a);
                        const cb = getItemChange(b);
                        if (ca === null && cb === null) return b.trades24h - a.trades24h;
                        if (ca === null) return 1;
                        if (cb === null) return -1;
                        return Math.abs(cb) - Math.abs(ca);
                      })
                      .map((item) => {
                        const chg = getItemChange(item);
                        return (
                          <tr key={item.id} className="hover:bg-[#20180f]/70 transition-colors">
                            {/* Item */}
                            <td className="py-3 px-4 sm:px-6">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl">{item.icon}</span>
                                <div>
                                  <div className="font-bold text-amber-100 flex items-center gap-1.5">
                                    <span>{item.name}</span>
                                    {item.isBreakout && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400 animate-pulse">
                                        BREAKOUT
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-amber-200/50 capitalize font-medium">
                                    {item.category}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Lowest Floor */}
                            <td className="py-3 px-3">
                              <div className="font-black text-amber-100">
                                {formatFlower(item.floorFlower)} <span className="text-[11px] font-normal text-amber-400">FLOWER</span>
                              </div>
                              <div className="text-[10px] text-amber-200/60 font-mono">
                                {formatUSD(item.floorUSD)}
                              </div>
                            </td>

                            {/* Percentage Movement */}
                            <td className="py-3 px-3">
                              {chg !== null ? (
                                <>
                                  <div className={`inline-flex items-center gap-1 font-black text-xs sm:text-sm ${
                                    chg > 0 ? 'text-emerald-400' : chg < 0 ? 'text-rose-400' : 'text-amber-200/70'
                                  }`}>
                                    {chg > 0 ? <TrendingUp className="w-4 h-4" /> : chg < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                                    <span>{chg > 0 ? `+${chg}%` : `${chg}%`}</span>
                                  </div>
                                  <div className="text-[10px] text-amber-200/40">
                                    {timeWindow === '1h'
                                      ? '1h Snapshot Delta'
                                      : timeWindow === '24h'
                                      ? '24h Verified Delta'
                                      : '7d Verified Delta'}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="inline-flex items-center gap-1 font-mono font-bold text-xs text-stone-400">
                                    <span>—</span>
                                  </div>
                                  <div className="text-[10px] text-amber-200/40">
                                    {timeWindow === '1h'
                                      ? 'Collecting 1h snapshots'
                                      : timeWindow === '24h'
                                      ? 'Pending 24h baseline'
                                      : 'Syncing 7d history'}
                                  </div>
                                </>
                              )}
                            </td>

                            {/* Signal */}
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border ${
                                item.trendSignal.includes('Bullish') || item.trendSignal.includes('Rising')
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                  : item.trendSignal.includes('Bearish') || item.trendSignal.includes('Falling')
                                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                  : 'bg-stone-900 border-stone-800 text-stone-300'
                              }`}>
                                {item.trendSignal}
                              </span>
                            </td>

                            {/* Liquidity */}
                            <td className="py-3 px-3">
                              <div className="text-[11px] font-bold text-amber-200">
                                {item.trades24h.toLocaleString()} {has24hHistory ? 'trades (24h)' : 'total trades'}
                              </div>
                              <div className="text-[10px] text-amber-200/50">
                                {item.quantityMoved24h > 0
                                  ? `${item.quantityMoved24h.toLocaleString()} units`
                                  : item.listingCount > 0
                                  ? `${item.listingCount} asks • ${item.offerCount} bids`
                                  : 'Light volume'}
                              </div>
                            </td>

                            {/* Opportunity Score */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-black text-amber-300">
                                  {item.marketOpportunityScore}/100
                                </div>
                                <div className="w-16 h-2 rounded-full bg-stone-900 overflow-hidden border border-amber-900/30">
                                  <div 
                                    className={`h-full rounded-full ${
                                      item.marketOpportunityScore >= 75 ? 'bg-emerald-500' : item.marketOpportunityScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${item.marketOpportunityScore}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-3 px-4 sm:px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {ITEM_NUMERIC_ID_MAP[item.id] && (
                                  <button
                                    onClick={() => {
                                      setSelectedTradeable({
                                        id: ITEM_NUMERIC_ID_MAP[item.id],
                                        name: item.name,
                                        icon: item.icon,
                                        collection: 'collectibles',
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 border border-amber-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1"
                                  >
                                    <span>📖 Book</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setNewItemId(item.id);
                                    setNewTargetPrice(item.floorFlower !== null ? formatFlower(item.floorFlower) : '0.001');
                                    setShowAddModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#241c12] hover:bg-[#2c2217] text-amber-200/80 hover:text-amber-100 border border-amber-500/20 text-[11px] font-semibold transition-colors"
                                >
                                  + Alert
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERSONAL MARKET OPPORTUNITIES (UNIQUE PERSONALIZED FEATURE)         */}
      {/* ========================================================================= */}
      {activeTab === 'personal' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Explanation */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#20180f] to-[#16120b] border border-amber-500/30 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Target className="w-4 h-4" />
                  <span>Farm-Tailored Arbitrage & Defensive Execution</span>
                </div>
                <h2 className="text-xl font-black text-amber-100">
                  Market Movements Connected to Your Real Farm Inventory
                </h2>
                <p className="text-xs text-amber-200/70 max-w-3xl leading-relaxed">
                  Unlike generic market lists, FarmIQ connects live order book surges and dips directly to the items sitting in your barn. We check your active expansion requirements, compute your exact surplus, and protect you from dumping commodities at a loss.
                </p>
              </div>

              <div className="text-right bg-[#120d08] p-3.5 rounded-2xl border border-amber-500/20">
                <div className="text-xs text-amber-200/60">Active Farm Profile</div>
                <div className="text-base font-black text-amber-300">{farm?.ownerName || (farm?.farmId ? `Farm #${farm.farmId}` : 'Farm #5128790942880844')}</div>
                <div className="text-[10px] text-emerald-400 font-semibold">{farm?.plots?.unlocked || 51} Plots • Level {farm?.level || 50}</div>
              </div>
            </div>
          </div>

          {/* Opportunities Grid */}
          {personalOpportunities.length === 0 ? (
            <div className="text-center py-12 p-8 rounded-3xl bg-[#18130c] border border-amber-500/20 text-amber-200/60">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <div className="font-bold text-sm text-amber-100">No Immediate Market Arbitrage Opportunities</div>
              <div className="text-xs mt-1">Your farm inventory is currently balanced with no significant price swings detected on your owned assets.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personalOpportunities.map((opp) => (
                <div 
                  key={opp.id} 
                  className={`p-5 rounded-3xl border shadow-xl flex flex-col justify-between transition-all ${
                    opp.type === 'surge-liquidation'
                      ? 'bg-gradient-to-br from-[#1b1e0f] to-[#12140a] border-emerald-500/40 hover:border-emerald-500/60'
                      : opp.type === 'defensive-processing'
                      ? 'bg-gradient-to-br from-[#241710] to-[#170e0a] border-amber-500/40 hover:border-amber-500/60'
                      : opp.type === 'crop-arbitrage'
                      ? 'bg-gradient-to-br from-[#0f1d1e] to-[#0a1415] border-cyan-500/40 hover:border-cyan-500/60'
                      : 'bg-gradient-to-br from-[#211520] to-[#150d14] border-purple-500/40 hover:border-purple-500/60'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Type Badge + Score */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        opp.type === 'surge-liquidation'
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                          : opp.type === 'defensive-processing'
                          ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                          : opp.type === 'crop-arbitrage'
                          ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                          : 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                      }`}>
                        {opp.type === 'surge-liquidation' && '🚀 Surge Liquidation'}
                        {opp.type === 'defensive-processing' && '🛡️ Defensive Processing'}
                        {opp.type === 'crop-arbitrage' && '⚡ Breakout Replanting'}
                        {opp.type === 'rare-appreciation' && '💎 Rare Collectible Asset'}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 bg-black/40 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        <span>Score: {opp.compositeScore}/100</span>
                      </div>
                    </div>

                    {/* Title & Item Info */}
                    <div className="flex items-start gap-3">
                      <span className="text-3xl p-2 rounded-2xl bg-black/30 border border-white/5">{opp.icon}</span>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-amber-50 leading-snug">
                          {opp.title}
                        </h3>
                        <div className="text-xs text-amber-300/80 font-semibold mt-0.5">
                          Market Floor: {formatFlower(opp.currentFloorFlower)} FLOWER (~${opp.currentPriceUSD} USD) • 
                          <span className={opp.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {opp.change24h >= 0 ? ` +${opp.change24h}%` : ` ${opp.change24h}%`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Position Breakdown Box */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-amber-200/50 block">Owned in Stockpile</span>
                        <span className="font-bold text-amber-100">{opp.farmPosition.formattedOwned}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-200/50 block">Liquidatable Surplus</span>
                        <span className="font-bold text-emerald-400">{opp.farmPosition.surplusCount.toLocaleString()} {opp.itemName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-200/50 block">Reserved for Goals</span>
                        <span className="font-bold text-amber-300">{opp.farmPosition.reservedForGoal} reserved</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-200/50 block">Surplus Market Value</span>
                        <span className="font-black text-amber-200">{opp.farmPosition.estimatedSurplusValueFlower} FLOWER (~${opp.farmPosition.estimatedSurplusValueUSD})</span>
                      </div>
                    </div>

                    {/* FarmIQ Strategic Insight */}
                    <p className="text-xs text-amber-100/90 leading-relaxed bg-[#140e08]/60 p-3 rounded-xl border border-amber-500/15">
                      💡 <span className="font-bold text-amber-300">FarmIQ Verdict:</span> {opp.farmIQInsight}
                    </p>
                  </div>

                  {/* Action CTA */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
                      <span>👉 {opp.recommendedAction}</span>
                    </span>
                    {ITEM_NUMERIC_ID_MAP[opp.itemId] && (
                      <button
                        onClick={() => {
                          setSelectedTradeable({
                            id: ITEM_NUMERIC_ID_MAP[opp.itemId],
                            name: opp.itemName,
                            icon: opp.icon,
                            collection: 'collectibles',
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors"
                      >
                        Inspect Book
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FARM MARKET EXPOSURE (PORTFOLIO SENTIMENT GAUGE)                    */}
      {/* ========================================================================= */}
      {activeTab === 'exposure' && farmExposure && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Portfolio Exposure Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#20180f] via-[#281e13] to-[#18130c] border border-amber-500/30 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  <span>FarmIQ Portfolio Market Sentiment</span>
                </div>
                <h2 className="text-2xl font-black text-amber-50 mt-1">
                  {farmExposure.sentiment}
                </h2>
                <p className="text-xs text-amber-200/70 max-w-2xl mt-1">
                  Shows how much of your tradeable inventory value is held in appreciating vs depreciating markets right now.
                </p>
              </div>

              <div className="bg-[#120d08] p-4 rounded-2xl border border-amber-500/20 text-right">
                <span className="text-xs text-amber-200/60 block">Total Tradeable Market Value</span>
                <span className="text-2xl font-black text-amber-100">{farmExposure.totalTradeableValueFlower.toLocaleString()} FLOWER</span>
                <span className="text-xs font-bold text-emerald-400 block mt-0.5">~${farmExposure.totalTradeableValueUSD.toLocaleString()} USD</span>
              </div>
            </div>

            {/* Tripartite Gauge */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">Rising Market Exposure ({farmExposure.risingExposurePercent}%)</span>
                <span className="text-amber-300">Stable / Sideways ({farmExposure.stableExposurePercent}%)</span>
                <span className="text-rose-400">Falling Market Exposure ({farmExposure.fallingExposurePercent}%)</span>
              </div>
              <div className="h-4 rounded-full bg-stone-900 overflow-hidden flex border border-amber-900/40 p-0.5">
                <div 
                  className="bg-emerald-500 h-full rounded-l-full transition-all" 
                  style={{ width: `${farmExposure.risingExposurePercent}%` }} 
                />
                <div 
                  className="bg-amber-500 h-full transition-all" 
                  style={{ width: `${farmExposure.stableExposurePercent}%` }} 
                />
                <div 
                  className="bg-rose-500 h-full rounded-r-full transition-all" 
                  style={{ width: `${farmExposure.fallingExposurePercent}%` }} 
                />
              </div>
            </div>

            {/* Top Movers in Player Inventory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                  ⭐ Strongest Appreciating Asset Owned
                </span>
                {farmExposure.topAppreciatingAsset ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{farmExposure.topAppreciatingAsset.icon}</span>
                      <div>
                        <div className="font-bold text-sm text-amber-100">{farmExposure.topAppreciatingAsset.name}</div>
                        <div className="text-xs text-emerald-400 font-black">+{farmExposure.topAppreciatingAsset.change24h}% (24h)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-amber-200/60">Holding Value</div>
                      <div className="text-sm font-black text-amber-100">${farmExposure.topAppreciatingAsset.ownedValueUSD} USD</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-200/50 italic">No assets currently gaining &gt; 2%</div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block mb-1">
                  ⚠️ Primary Downward Risk Asset Owned
                </span>
                {farmExposure.topDepreciatingAsset ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{farmExposure.topDepreciatingAsset.icon}</span>
                      <div>
                        <div className="font-bold text-sm text-amber-100">{farmExposure.topDepreciatingAsset.name}</div>
                        <div className="text-xs text-rose-400 font-black">{farmExposure.topDepreciatingAsset.change24h}% (24h)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-amber-200/60">Holding Value</div>
                      <div className="text-sm font-black text-amber-100">${farmExposure.topDepreciatingAsset.ownedValueUSD} USD</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-200/50 italic">No assets currently falling &gt; 2%</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMPREHENSIVE VERIFIED ORDER BOOKS (CATALOGUE)                     */}
      {/* ========================================================================= */}
      {activeTab === 'catalogue' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'all', label: 'All Tradables' },
                { id: 'crops', label: '🌾 Crops & Fruits (35)' },
                { id: 'resources', label: '🪵 Timber & Minerals (7)' },
                { id: 'animals', label: '🥚 Livestock Yields (7)' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategory === tab.id
                      ? 'bg-amber-500 text-stone-950 font-extrabold shadow-md shadow-amber-500/20'
                      : 'bg-[#1a140d] hover:bg-[#241c12] text-amber-200/70 hover:text-amber-100 border border-amber-500/15'
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
                placeholder="Search crop, resource or seed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#110d08] border border-amber-500/20 pl-8 pr-3 py-1.5 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#20180f] text-amber-300/70 border-b border-amber-900/30 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Item</th>
                    <th className="py-3 px-3">Lowest Floor (Ask)</th>
                    <th className="py-3 px-3">Last Sale Price</th>
                    <th className="py-3 px-3">Best Offer (Bid)</th>
                    <th className="py-3 px-3">24h Change</th>
                    <th className="py-3 px-3">24h Liquidity</th>
                    <th className="py-3 px-3">NPC Betty Price</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-950/40 text-amber-100">
                  {filteredCatalogue.map((item) => {
                    const liveComm = commodities[item.id];
                    const hasLive = !!liveComm && (liveComm.floorFlower !== null || liveComm.latestSaleFlower !== null);
                    const floorVal = liveComm?.floorFlower ?? null;
                    const lastSaleVal = liveComm?.latestSaleFlower ?? null;
                    const bestOfferVal = liveComm?.bestOfferFlower ?? null;
                    const change24h = liveComm?.change24h ?? null;
                    const floorUSD = liveComm?.floorUSD ?? null;
                    const listingCount = liveComm?.listingCount || 0;
                    const offerCount = liveComm?.offerCount || 0;
                    const tradesCount = liveComm?.trades || 0;
                    const quantityMoved = liveComm?.quantity || 0;

                    return (
                      <tr key={item.id} className="hover:bg-[#20180f]/70 transition-colors">
                        {/* 1. Item Name & Category */}
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{item.icon}</span>
                            <div>
                              <div className="font-bold text-amber-100 flex items-center gap-1.5">
                                {item.name}
                                {hasLive ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                                    LIVE
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-900 border border-stone-800 text-stone-400">
                                    NO TRADES
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-amber-200/50 capitalize font-medium">
                                {item.category} • {liveComm?.marketKey || 'No ID'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Lowest Floor (Ask) in FLOWER + USD */}
                        <td className="py-3 px-3">
                          {floorVal !== null ? (
                            <div>
                              <div className="font-black text-amber-100">
                                {formatFlower(floorVal)} <span className="text-[11px] font-normal text-amber-400">FLOWER</span>
                              </div>
                              <div className="text-[10px] text-amber-200/60 font-mono">
                                {formatUSD(floorUSD)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-amber-200/40 text-[11px] italic">
                              Unavailable
                            </div>
                          )}
                        </td>

                        {/* 3. Last Sale Price in FLOWER */}
                        <td className="py-3 px-3">
                          {lastSaleVal !== null ? (
                            <div>
                              <span className="font-extrabold text-amber-200">
                                {formatFlower(lastSaleVal)} FLOWER
                              </span>
                              <div className="text-[10px] text-amber-200/50">
                                Most recent trade
                              </div>
                            </div>
                          ) : (
                            <span className="text-amber-200/40 text-[11px] italic">No sales</span>
                          )}
                        </td>

                        {/* 4. Best Offer / Buyer Bid */}
                        <td className="py-3 px-3">
                          {bestOfferVal !== null && bestOfferVal > 0 ? (
                            <div>
                              <span className="font-bold text-emerald-400">
                                {formatFlower(bestOfferVal)} FLOWER
                              </span>
                              {floorVal && floorVal > 0 && (
                                <div className="text-[10px] text-emerald-400/60 font-mono">
                                  Spread: {(((floorVal - bestOfferVal) / floorVal) * 100).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-200/40 text-[11px] italic">--</span>
                          )}
                        </td>

                        {/* 5. 24h Change */}
                        <td className="py-3 px-3">
                          {change24h !== null ? (
                            <div className={`inline-flex items-center gap-0.5 font-bold text-xs ${
                              change24h > 0 
                                ? 'text-emerald-400' 
                                : change24h < 0 
                                ? 'text-rose-400' 
                                : 'text-amber-200/70'
                            }`}>
                              {change24h > 0 ? (
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              ) : change24h < 0 ? (
                                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                              ) : null}
                              <span>{change24h > 0 ? `+${change24h}%` : `${change24h}%`}</span>
                            </div>
                          ) : (
                            <span className="text-amber-200/40 text-[11px] italic">Unavailable</span>
                          )}
                        </td>

                        {/* 6. Order Book Liquidity */}
                        <td className="py-3 px-3">
                          {hasLive ? (
                            <div className="text-[11px] space-y-0.5">
                              <div className="text-amber-200/90 font-medium">
                                <span className="text-amber-300 font-bold">{listingCount}</span> asks • <span className="text-emerald-400 font-bold">{offerCount}</span> bids
                              </div>
                              <div className="text-[10px] text-amber-200/50">
                                {quantityMoved > 0 ? `${quantityMoved.toLocaleString()} moved (${tradesCount} trades)` : 'No 24h volume'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-amber-200/40 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 7. NPC Betty Price */}
                        <td className="py-3 px-3 text-amber-200/80">
                          <div className="font-semibold text-xs text-amber-300">
                            {Math.round(item.bettyPriceSFL * 200)} Coins
                          </div>
                          <div className="text-[10px] text-amber-200/50">
                            NPC Betty Shop
                          </div>
                        </td>

                        {/* 8. Action */}
                        <td className="py-3 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {ITEM_NUMERIC_ID_MAP[item.id] && (
                              <button
                                onClick={() => {
                                  setSelectedTradeable({
                                    id: ITEM_NUMERIC_ID_MAP[item.id],
                                    name: item.name,
                                    icon: item.icon,
                                    collection: 'collectibles',
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 border border-amber-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <span>📖 Book</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setNewItemId(item.id);
                                setNewTargetPrice(floorVal !== null ? formatFlower(floorVal) : '0.001');
                                setShowAddModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#241c12] hover:bg-[#2c2217] text-amber-200/80 hover:text-amber-100 border border-amber-500/20 text-[11px] font-semibold transition-colors"
                            >
                              + Alert
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PROFIT TARGETS WATCHLIST                                           */}
      {/* ========================================================================= */}
      {activeTab === 'watchlist' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold text-amber-300/80 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Active Profit Targets & Triggers ({watchlist.length})</span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Target Alert</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {watchlist.map((alert) => {
              const item = SFL_ITEMS[alert.itemId] || SFL_ITEMS.wheat;
              const liveComm = commodities[alert.itemId];
              const currentFloor = liveComm?.floorFlower ?? liveComm?.latestSaleFlower ?? null;
              const isTriggered = currentFloor !== null
                ? (alert.condition === 'above' ? currentFloor >= alert.targetPrice : currentFloor <= alert.targetPrice)
                : false;

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isTriggered
                      ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : alert.isActive
                      ? 'bg-[#18130c] border-amber-500/20 hover:border-amber-500/40'
                      : 'bg-[#14100a] border-stone-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-amber-100">{alert.itemName}</div>
                        <div className="text-[10px] text-amber-200/50">Target: {alert.targetPrice} FLOWER</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="p-1 rounded-lg text-amber-400/40 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-amber-200/70">
                      <span>Condition:</span>
                      <span className="font-extrabold text-amber-300">
                        {alert.condition === 'above' ? '≥' : '≤'} {alert.targetPrice} FLOWER
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-200/70">
                      <span>Live Floor:</span>
                      <span className="font-bold text-amber-100">
                        {currentFloor !== null ? `${formatFlower(currentFloor)} FLOWER` : 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-amber-900/30 flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isTriggered 
                        ? 'bg-emerald-500 text-stone-950 animate-pulse font-black' 
                        : 'bg-amber-950/60 text-amber-300'
                    }`}>
                      {isTriggered ? 'TARGET HIT! 🔔' : 'Watching'}
                    </span>
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className="text-[10px] font-semibold text-amber-400 hover:underline"
                    >
                      {alert.isActive ? 'Active' : 'Paused'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Set Target Alert Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#1b140b] border border-amber-500/40 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-100 mb-1 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <span>Create Target Price Alert</span>
            </h3>
            <p className="text-xs text-amber-200/60 mb-4">
              Receive automated notification when live marketplace floor hits your target price in FLOWER.
            </p>

            <form onSubmit={handleAddAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-amber-200/80 mb-1">Select Item</label>
                <select
                  value={newItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setNewItemId(id);
                    const comm = commodities[id];
                    if (comm && comm.floorFlower !== null) {
                      setNewTargetPrice(formatFlower(comm.floorFlower));
                    }
                  }}
                  className="w-full bg-[#110d08] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                >
                  {itemsList.map(i => (
                    <option key={i.id} value={i.id}>{i.icon} {i.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-200/80 mb-1">Condition</label>
                  <select
                    value={newCondition}
                    onChange={(e: any) => setNewCondition(e.target.value)}
                    className="w-full bg-[#110d08] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="above">rises above (≥)</option>
                    <option value="below">drops below (≤)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-200/80 mb-1">Target (FLOWER)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newTargetPrice}
                    onChange={(e) => setNewTargetPrice(e.target.value)}
                    className="w-full bg-[#110d08] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                    placeholder="0.0001"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-transparent hover:bg-stone-900 text-xs text-amber-200/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors"
                >
                  Save Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Order Book & Trade Tape Modal */}
      {selectedTradeable && (
        <TradeableOrderBookModal
          itemId={selectedTradeable.id}
          itemName={selectedTradeable.name}
          itemIcon={selectedTradeable.icon}
          collection={selectedTradeable.collection || 'collectibles'}
          flowerPriceUSD={flowerPriceUSD}
          farm={farm}
          onClose={() => setSelectedTradeable(null)}
        />
      )}
    </div>
  );
}

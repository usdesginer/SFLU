'use client';

import React, { useState, useMemo } from 'react';
import { 
  Radar, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Percent, 
  Zap, 
  Filter, 
  Search, 
  Info, 
  Sparkles,
  ArrowUpDown,
  Coins
} from 'lucide-react';
import { ItemCategory, ProfitRankedItem } from '../../types';
import { getRankedProfitItems } from '../../lib/profitEngine';
import { SFL_TOKEN_PRICE_USD } from '../../data/sflData';

interface ProfitRadarViewProps {
  marketplaceData?: any;
}

export default function ProfitRadarView({ marketplaceData }: ProfitRadarViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'efficiency' | 'hourly' | 'roi' | 'plot' | 'momentum'>('efficiency');
  const [searchQuery, setSearchQuery] = useState('');

  const commodities = marketplaceData?.commodities || {};
  const flowerPriceUSD = marketplaceData?.flowerPriceUSD || SFL_TOKEN_PRICE_USD;

  const rawItems = useMemo(() => {
    const baseItems = getRankedProfitItems(selectedCategory);
    
    // Enrich with live market floor prices from SFL Community API
    return baseItems.map(item => {
      const liveComm = commodities[item.id];
      if (liveComm && (liveComm.floorFlower > 0 || liveComm.latestSaleFlower > 0)) {
        const livePriceFlower = liveComm.floorFlower || liveComm.latestSaleFlower;
        const costFlower = item.buyPriceSFL ? (item.buyPriceSFL * (0.0512 / flowerPriceUSD)) : 0;
        const liveNetProfitFlower = Number((livePriceFlower - costFlower).toFixed(6));
        const liveRoi = costFlower > 0 ? Math.round((liveNetProfitFlower / costFlower) * 100) : 100;
        const growthHours = (item.growthTimeMinutes || 60) / 60;
        const liveProfitPerHour = Number((liveNetProfitFlower / growthHours).toFixed(6));

        return {
          ...item,
          marketPriceSFL: livePriceFlower,
          netProfitPerUnit: liveNetProfitFlower,
          roiPercentage: liveRoi,
          profitPerHour: liveProfitPerHour,
          liveCommodity: liveComm,
          seedCostFlower: costFlower,
        };
      }
      return item;
    });
  }, [selectedCategory, commodities]);

  const sortedItems = useMemo(() => {
    let filtered = rawItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortBy === 'hourly') return b.profitPerHour - a.profitPerHour;
      if (sortBy === 'roi') return b.roiPercentage - a.roiPercentage;
      if (sortBy === 'plot') return b.profitPerPlot - a.profitPerPlot;
      if (sortBy === 'momentum') return b.marketPriceChange24h - a.marketPriceChange24h;
      return b.profitEfficiencyScore - a.profitEfficiencyScore;
    });
  }, [rawItems, sortBy, searchQuery]);

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'crop', label: '🌾 Crops' },
    { id: 'flower', label: '🌺 Flowers & Honey' },
    { id: 'food', label: '🍲 Cooking & Food' },
    { id: 'craftable', label: '💐 Craftables & Tools' },
    { id: 'resource', label: '🪵 Timber & Minerals' },
    { id: 'animal', label: '🥚 Livestock' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#231a0e] via-[#2c2012] to-[#1d160e] border border-amber-500/20 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <Radar className="w-3.5 h-3.5 text-amber-400" />
            <span>Market Intelligence Engine • Mainnet Connected</span>
          </div>
          <h1 className="text-2xl font-black text-amber-50 tracking-tight">
            Daily Profit Radar
          </h1>
          <p className="text-xs sm:text-sm text-amber-200/70 max-w-2xl">
            Ranked not just by sale price, but dynamically calculated with <span className="text-amber-300 font-semibold">official live P2P order floors</span>, <span className="text-amber-300 font-semibold">net profit per hour</span>, and <span className="text-emerald-400 font-semibold">ROI efficiency</span>.
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="flex items-center gap-3 bg-[#18120b] border border-amber-500/20 px-4 py-3 rounded-2xl">
          <div className="text-center px-2">
            <div className="text-[10px] text-amber-200/50 uppercase font-semibold">Top Hourly Crop</div>
            <div className="text-sm font-extrabold text-amber-300">Cauliflower</div>
            <div className="text-[10px] text-emerald-400 font-bold">+8.5% surging</div>
          </div>
          <div className="h-6 w-px bg-amber-900/40" />
          <div className="text-center px-2">
            <div className="text-[10px] text-amber-200/50 uppercase font-semibold">Top ROI %</div>
            <div className="text-sm font-extrabold text-amber-300">White Lotus</div>
            <div className="text-[10px] text-emerald-400 font-bold">137% Margin</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#18130c] border border-amber-500/20 p-3.5 rounded-2xl">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                  : 'bg-[#221a10] text-amber-200/70 hover:text-amber-100 hover:bg-[#2b2115]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort & Search */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/50" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#110d08] border border-amber-500/20 focus:border-amber-400 pl-8 pr-3 py-1.5 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-[#110d08] border border-amber-500/20 rounded-xl px-2 py-1.5 text-xs text-amber-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-amber-100 text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="efficiency" className="bg-[#18130c]">Efficiency Score</option>
              <option value="hourly" className="bg-[#18130c]">Profit / Hour</option>
              <option value="roi" className="bg-[#18130c]">Highest ROI %</option>
              <option value="plot" className="bg-[#18130c]">Daily Yield / Plot</option>
              <option value="momentum" className="bg-[#18130c]">24h Price Momentum</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Radar List */}
      <div className="overflow-hidden rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#20180f] text-amber-300/70 border-b border-amber-900/30 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Item & Category</th>
                <th className="py-3.5 px-3">Cost to Buy/Seed</th>
                <th className="py-3.5 px-3">Selling Floor</th>
                <th className="py-3.5 px-3">Net Profit</th>
                <th className="py-3.5 px-3">Growth / Time</th>
                <th className="py-3.5 px-3">Profit / Hour</th>
                <th className="py-3.5 px-3">24h Momentum</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">FarmIQ Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-950/40 text-amber-100">
              {sortedItems.map((item: any) => {
                const isRising = item.trend === 'rising';
                const isFalling = item.trend === 'falling';
                const hasLive = !!item.liveCommodity;

                return (
                  <tr 
                    key={item.id}
                    className="hover:bg-[#20180f]/70 transition-colors group"
                  >
                    {/* Item & Category */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                        <div>
                          <div className="font-bold text-amber-100 flex items-center gap-1.5">
                            {item.name}
                            {hasLive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                                LIVE MARKET
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-amber-200/50 capitalize font-medium">
                            {item.category} • {item.description.slice(0, 36)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="py-3.5 px-3 font-medium text-amber-200/80">
                      {item.buyPriceSFL !== undefined && item.buyPriceSFL > 0 ? (
                        <div>
                          <div className="font-semibold text-xs text-amber-100">
                            ~{(item.seedCostFlower || item.buyPriceSFL * 0.001).toFixed(4)} FLOWER
                          </div>
                          <div className="text-[10px] text-amber-200/50">
                            {Math.round(item.buyPriceSFL * 200)} Coins (Betty Seed)
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-200/40 italic">Free / Foraged</span>
                      )}
                    </td>

                    {/* Selling Floor Value */}
                    <td className="py-3.5 px-3 font-semibold text-amber-200">
                      <div>
                        <span className="font-bold text-amber-100">
                          {item.marketPriceSFL < 0.001 ? item.marketPriceSFL.toFixed(4) : item.marketPriceSFL} FLOWER
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-200/50 font-mono">
                        ≈ ${(item.marketPriceSFL * flowerPriceUSD).toFixed(4)} USD
                      </div>
                    </td>

                    {/* Net Profit */}
                    <td className="py-3.5 px-3 font-bold">
                      <span className="text-emerald-400">
                        +{(item.netProfitPerUnit || 0).toFixed(4)} FLOWER
                      </span>
                      <div className="text-[10px] text-emerald-400/70 font-semibold">{item.roiPercentage}% ROI</div>
                    </td>

                    {/* Growth / Time */}
                    <td className="py-3.5 px-3 text-amber-200/80">
                      {item.growthTimeMinutes ? (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400/60" />
                          <span>
                            {item.growthTimeMinutes >= 1440 
                              ? `${(item.growthTimeMinutes / 1440).toFixed(1)}d`
                              : item.growthTimeMinutes >= 60 
                              ? `${(item.growthTimeMinutes / 60).toFixed(1)}h`
                              : `${item.growthTimeMinutes}m`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-200/40">Instant</span>
                      )}
                    </td>

                    {/* Profit / Hour */}
                    <td className="py-3.5 px-3 font-extrabold text-amber-300">
                      {item.profitPerHour > 0 ? (
                        <span>{item.profitPerHour.toFixed(3)} <span className="text-[10px] font-normal text-amber-200/60">FLOWER/h</span></span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>

                    {/* 24h Momentum */}
                    <td className="py-3.5 px-3">
                      <div className={`inline-flex items-center gap-1 font-bold text-xs ${
                        isRising ? 'text-emerald-400' : isFalling ? 'text-rose-400' : 'text-amber-200/60'
                      }`}>
                        {isRising && <TrendingUp className="w-3.5 h-3.5" />}
                        {isFalling && <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{item.marketPriceChange24h > 0 ? `+${item.marketPriceChange24h}%` : `${item.marketPriceChange24h}%`}</span>
                      </div>
                    </td>

                    {/* Efficiency Score */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="inline-flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-amber-300 text-sm">{item.profitEfficiencyScore}</span>
                          <span className="text-[10px] text-amber-200/40">/100</span>
                        </div>
                        <div className="w-16 h-1.5 rounded-full bg-[#291f13] overflow-hidden mt-1">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                            style={{ width: `${item.profitEfficiencyScore}%` }}
                          />
                        </div>
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
  );
}

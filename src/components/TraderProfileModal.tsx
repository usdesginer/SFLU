'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  User, 
  Coins, 
  RefreshCw, 
  Users, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  Search,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';
import { fetchMarketplaceProfile } from '../lib/farmService';
import { SFL_TOKEN_PRICE_USD } from '../data/sflData';

interface TraderProfileModalProps {
  farmId: string | number;
  onClose: () => void;
  onSelectFarmId?: (newFarmId: string) => void;
  flowerPriceUSD?: number;
}

export default function TraderProfileModal({
  farmId: initialFarmId,
  onClose,
  onSelectFarmId,
  flowerPriceUSD = SFL_TOKEN_PRICE_USD,
}: TraderProfileModalProps) {
  const [currentFarmId, setCurrentFarmId] = useState<string | number>(initialFarmId);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'trades' | 'open' | 'friends'>('trades');
  const [searchFarmInput, setSearchFarmInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (id: string | number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchMarketplaceProfile(id);
      if (result && !result.error) {
        setData(result);
      } else {
        setError(result?.error || `Failed to load profile for Farm #${id}`);
      }
    } catch (e: any) {
      setError(e.message || 'Error communicating with Community API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(currentFarmId);
  }, [currentFarmId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchFarmInput.trim()) {
      setCurrentFarmId(searchFarmInput.trim());
      setSearchFarmInput('');
    }
  };

  const isNetPositive = (data?.netWeeklyFlower || 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#17120b] border border-amber-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 border-b border-amber-900/40 bg-[#1e170e]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
              👨‍🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-amber-50">
                  {data?.username || `Farm #${currentFarmId}`}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/30 text-amber-300">
                  Farm #{currentFarmId}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                  Lvl {data?.level || 1}
                </span>
              </div>
              <p className="text-xs text-amber-200/60 mt-0.5">
                Sunflower Land Official Community Marketplace Profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Farm Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400/50" />
              <input
                type="text"
                placeholder="Lookup Farm ID..."
                value={searchFarmInput}
                onChange={(e) => setSearchFarmInput(e.target.value)}
                className="bg-[#120d08] border border-amber-500/20 pl-8 pr-3 py-1.5 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 w-36 focus:w-48 transition-all focus:outline-none focus:border-amber-400"
              />
            </form>

            <button
              onClick={() => loadProfile(currentFarmId)}
              disabled={isLoading}
              title="Refresh profile"
              className="p-2 rounded-xl bg-[#271d12] hover:bg-[#342718] border border-amber-500/20 text-amber-300 hover:text-amber-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#271d12] hover:bg-[#342718] border border-amber-500/20 text-amber-200/70 hover:text-amber-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7-Day Cashflow & Lifetime Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-[#140e08] border-b border-amber-900/30 text-xs">
          <div className="p-3 rounded-2xl bg-[#1c150c] border border-amber-500/10">
            <div className="text-[10px] text-amber-200/50 uppercase font-semibold">Weekly Earned (7d)</div>
            <div className="text-base font-extrabold text-emerald-400 flex items-center gap-1 mt-0.5">
              <span>+{Number(data?.weeklyFlowerEarned || 0).toFixed(2)}</span>
              <span className="text-[10px] text-emerald-400/70 font-normal">FLOWER</span>
            </div>
            <div className="text-[10px] text-amber-200/60 mt-0.5">
              ≈ +${((data?.weeklyFlowerEarned || 0) * flowerPriceUSD).toFixed(2)} USD
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#1c150c] border border-amber-500/10">
            <div className="text-[10px] text-amber-200/50 uppercase font-semibold">Weekly Spent (7d)</div>
            <div className="text-base font-extrabold text-rose-400 flex items-center gap-1 mt-0.5">
              <span>-{Number(data?.weeklyFlowerSpent || 0).toFixed(2)}</span>
              <span className="text-[10px] text-rose-400/70 font-normal">FLOWER</span>
            </div>
            <div className="text-[10px] text-amber-200/60 mt-0.5">
              ≈ -${((data?.weeklyFlowerSpent || 0) * flowerPriceUSD).toFixed(2)} USD
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#1c150c] border border-amber-500/10">
            <div className="text-[10px] text-amber-200/50 uppercase font-semibold">Net 7d Flow</div>
            <div className={`text-base font-extrabold flex items-center gap-1 mt-0.5 ${
              isNetPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <span>{isNetPositive ? '+' : ''}{Number(data?.netWeeklyFlower || 0).toFixed(2)}</span>
              <span className="text-[10px] opacity-70 font-normal">FLOWER</span>
            </div>
            <div className="text-[10px] text-amber-200/60 mt-0.5">
              {isNetPositive ? '🟢 Net Producer' : '🔴 Net Buyer'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#1c150c] border border-amber-500/10">
            <div className="text-[10px] text-amber-200/50 uppercase font-semibold">Total Trades Ever</div>
            <div className="text-base font-extrabold text-amber-200 mt-0.5">
              {(data?.totalTrades || 0).toLocaleString()} <span className="text-[10px] font-normal text-amber-400/70">settled</span>
            </div>
            <div className="text-[10px] text-amber-200/60 mt-0.5">
              {data?.friends?.length || 0} trading partners
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-amber-900/30 px-4 sm:px-6 bg-[#1a140d]">
          <button
            onClick={() => setActiveTab('trades')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'trades'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-amber-200/60 hover:text-amber-100'
            }`}
          >
            Recent 50 Fulfilled Trades Tape ({data?.recentTrades?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'open'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-amber-200/60 hover:text-amber-100'
            }`}
          >
            Active Orders ({data?.listings?.length || 0} Listings, {data?.offers?.length || 0} Bids)
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'friends'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-amber-200/60 hover:text-amber-100'
            }`}
          >
            Top Trading Partners ({data?.friends?.length || 0})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl animate-spin">
                🌻
              </div>
              <p className="text-xs font-semibold text-amber-300 animate-pulse">
                Loading trading ledger & history for Farm #{currentFarmId}...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
              <p className="font-bold">Error loading marketplace profile:</p>
              <p className="mt-1 opacity-80">{error}</p>
            </div>
          ) : activeTab === 'trades' ? (
            <div className="space-y-3">
              <div className="text-xs font-bold text-amber-300/80 uppercase tracking-wider flex items-center justify-between">
                <span>Verified Fulfilled Trades (Past 50)</span>
                <span className="text-[10px] text-amber-200/50">Audited on Sunflower Land</span>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-[#16120b] overflow-hidden">
                <div className="divide-y divide-amber-950/40">
                  {!data?.recentTrades || data.recentTrades.length === 0 ? (
                    <div className="py-12 text-center text-xs text-amber-200/40">
                      No fulfilled trades recorded for this farm
                    </div>
                  ) : (
                    data.recentTrades.map((t: any) => {
                      const fulfilledDate = new Date(t.fulfilledAt);
                      const isSeller = String(t.fulfilledBy?.id) === String(currentFarmId);
                      const counterparty = isSeller ? t.initiatedBy : t.fulfilledBy;

                      return (
                        <div key={t.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#20180f] text-xs transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{isSeller ? '💰' : '🛒'}</span>
                            <div>
                              <div className="font-bold text-amber-100 flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  isSeller 
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {isSeller ? 'SOLD' : 'BOUGHT'}
                                </span>
                                <span>{t.quantity}x Item #{t.itemId}</span>
                                <span className="text-amber-400/60 font-normal">for</span>
                                <span className="font-extrabold text-amber-300">{t.sfl} FLOWER</span>
                                <span className="text-[10px] text-amber-200/50">({t.unitPriceSFL.toFixed(4)}/ea)</span>
                              </div>
                              <div className="text-[11px] text-amber-200/60 flex items-center gap-1.5 mt-0.5">
                                <span>Counterparty:</span>
                                <button
                                  onClick={() => counterparty?.id && setCurrentFarmId(counterparty.id)}
                                  className="font-semibold text-amber-300 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>{counterparty?.username || `Farm #${counterparty?.id}`}</span>
                                </button>
                                <span>•</span>
                                <span className="capitalize">{t.source}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-[11px] text-amber-200/50">
                            {fulfilledDate.toLocaleTimeString()} • {fulfilledDate.toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'open' ? (
            <div className="space-y-4">
              {/* Listings */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-400 uppercase tracking-wider px-1">
                  Active Market Listings (Asks)
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-[#1c130e] overflow-hidden">
                  <div className="divide-y divide-rose-950/30">
                    {!data?.listings || data.listings.length === 0 ? (
                      <div className="py-6 text-center text-xs text-amber-200/40">No active listings</div>
                    ) : (
                      data.listings.map((l: any) => (
                        <div key={l.tradeId} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-amber-100">
                              {Object.entries(l.items || {}).map(([k, v]) => `${v}x ${k}`).join(', ')}
                            </div>
                            <div className="text-[10px] text-amber-200/50">
                              Tax: {l.tax} FLOWER • {l.tradeType}
                            </div>
                          </div>
                          <div className="font-black text-rose-300 text-sm">
                            {l.sfl} FLOWER
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Offers */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-1">
                  Active Market Offers (Bids)
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-[#0f1c13] overflow-hidden">
                  <div className="divide-y divide-emerald-950/30">
                    {!data?.offers || data.offers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-amber-200/40">No active offers</div>
                    ) : (
                      data.offers.map((o: any) => (
                        <div key={o.tradeId} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-amber-100">
                              Wants: {Object.entries(o.items || {}).map(([k, v]) => `${v}x ${k}`).join(', ')}
                            </div>
                            <div className="text-[10px] text-amber-200/50">
                              Collection: {o.collection} • {o.tradeType}
                            </div>
                          </div>
                          <div className="font-black text-emerald-300 text-sm">
                            {o.sfl} FLOWER
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-amber-300/80 uppercase tracking-wider">
                Top Trading Partners (Most Frequent Counterparties)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!data?.friends || data.friends.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs text-amber-200/40">
                    No trading partners found
                  </div>
                ) : (
                  data.friends.map((f: any) => (
                    <div 
                      key={f.id}
                      onClick={() => setCurrentFarmId(f.id)}
                      className="p-3.5 rounded-2xl bg-[#1c150c] border border-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-lg">
                          🤝
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-amber-100 group-hover:text-amber-300 transition-colors">
                            {f.username || `Farm #${f.id}`}
                          </div>
                          <div className="text-[10px] text-amber-200/50">
                            Farm #{f.id}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-amber-300 text-xs">
                          {f.trades} trades
                        </div>
                        <div className="text-[10px] text-amber-200/40 group-hover:text-amber-300 flex items-center gap-0.5 justify-end">
                          <span>Inspect</span>
                          <span>→</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-900/40 bg-[#161009] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Community API Live Data (`type=marketplaceProfile`)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold transition-transform active:scale-95"
          >
            Close Trader Profile
          </button>
        </div>
      </div>
    </div>
  );
}

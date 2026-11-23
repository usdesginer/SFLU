'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Coins, 
  TrendingUp, 
  Search, 
  Check, 
  ChevronDown, 
  Key, 
  Compass, 
  Zap,
  RefreshCw
} from 'lucide-react';
import { FarmState } from '../types';
import { FLOWER_TOKEN_PRICE_USD } from '../data/sflData';

interface NavbarProps {
  farm: FarmState;
  onSelectFarmId: (id: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  flowerPriceUSD?: number;
}

export default function Navbar({ farm, onSelectFarmId, onRefresh, isLoading, flowerPriceUSD }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customIdInput, setCustomIdInput] = useState('');

  const archetypes = [
    { id: '5128790942880844', label: 'My Farm #5128790942880844 (VIP Farm)', tag: 'Your Farm' },
    { id: '1', label: 'Farm #1 (Mainnet Genesis Pioneer)', tag: 'Genesis' },
    { id: '7409340814436868', label: 'Farm #7409340814436868 (Maxou, Lvl 67 Trader)', tag: 'Trader' },
    { id: '24601', label: 'Farm #24601 (Gordy, Community Doc Farm)', tag: 'Community' },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customIdInput.trim()) {
      onSelectFarmId(customIdInput.trim());
      setIsDropdownOpen(false);
      setCustomIdInput('');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#16120b]/90 backdrop-blur-md border-b border-[#312517] px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20 text-2xl select-none">
            🌻
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                FarmIQ
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 uppercase tracking-wider">
                Intelligence Hub
              </span>
            </div>
            <p className="hidden md:block text-xs text-amber-200/60 font-medium">
              Your farm. Your market. Your next profitable move.
            </p>
          </div>
        </div>

        {/* Live Market Bar */}
        <div className="hidden xl:flex items-center gap-4 bg-[#1f1910] border border-[#3b2d1c] px-3.5 py-1.5 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 text-amber-300/90 font-medium">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>FLOWER:</span>
            <span suppressHydrationWarning className="font-bold text-white">
              ${(flowerPriceUSD || FLOWER_TOKEN_PRICE_USD).toFixed(4)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-amber-300/80 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Oracle Spot</span>
          </div>
          <div className="h-3 w-px bg-amber-900/40" />
          <div className="flex items-center gap-1.5 text-xs text-amber-200/70">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span className="font-semibold text-emerald-400">Sunflower Land API Live</span>
          </div>
        </div>

        {/* Farm Selector & Switcher */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 bg-gradient-to-r from-[#241c12] to-[#2c2217] hover:from-[#2e2317] hover:to-[#382b1d] border border-amber-500/30 hover:border-amber-500/60 text-amber-100 px-3.5 py-2 rounded-xl text-sm font-medium shadow-md transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            <div className="text-left">
              <div className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold">Active Farm</div>
              <div className="font-bold text-xs sm:text-sm text-amber-100 flex items-center gap-1">
                Farm #{farm.farmId}
                <span className="text-amber-400/90 text-xs font-normal">(Lvl {farm.level})</span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={onRefresh}
            title="Refresh Farm & Market Data"
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-[#241c12] hover:bg-[#2c2217] border border-amber-500/20 text-amber-300 hover:text-amber-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Farm Switcher Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#1a140d] border border-amber-500/30 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider px-2 py-1 mb-2 flex items-center justify-between">
                <span>Select Farm Archetype</span>
                <span className="text-[10px] text-amber-200/50">Instant Switch</span>
              </div>

              <div className="space-y-1 mb-3">
                {archetypes.map((arch) => {
                  const isSelected = String(farm.farmId) === arch.id;
                  return (
                    <button
                      key={arch.id}
                      onClick={() => {
                        onSelectFarmId(arch.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold'
                          : 'hover:bg-[#271d13] text-amber-100/80 border border-transparent'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="font-medium">{arch.label}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-300">
                          {arch.tag}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-amber-900/40 pt-3">
                <form onSubmit={handleCustomSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400/60" />
                    <input
                      type="text"
                      placeholder="NFT ID, Account ID, or 0x Wallet..."
                      value={customIdInput}
                      onChange={(e) => setCustomIdInput(e.target.value)}
                      className="w-full bg-[#110d08] border border-amber-500/20 focus:border-amber-400 pl-8 pr-3 py-1.5 rounded-xl text-xs text-amber-100 placeholder-amber-400/40 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow transition-transform active:scale-95"
                  >
                    Load
                  </button>
                </form>
                <p className="text-[10px] text-amber-200/50 mt-1.5 px-1 leading-snug">
                  Resolves Farm NFT ID (≤1B), Account ID (&gt;1B), or linked 0x Polygon wallet address directly via Sunflower Land Community API.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


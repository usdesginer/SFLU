'use client';

import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Sparkles, 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Share2, 
  ArrowRight, 
  ShieldCheck, 
  ChevronRight, 
  Flame, 
  Zap,
  Users,
  Search,
  RefreshCw
} from 'lucide-react';
import { FarmState } from '../../types';
import { getBenchmarkComparison } from '../../lib/profitEngine';
import { fetchBatchFarms } from '../../lib/farmService';

interface ProfitBattleViewProps {
  farm: FarmState;
  onNavigate: (tabId: any) => void;
}

export default function ProfitBattleView({ farm, onNavigate }: ProfitBattleViewProps) {
  const benchmark = getBenchmarkComparison(farm);
  const [copiedShare, setCopiedShare] = useState(false);
  const [rivalIdsInput, setRivalIdsInput] = useState('1, 2, 3, 5');
  const [rivalFarms, setRivalFarms] = useState<Record<string, FarmState>>({});
  const [isLoadingRivals, setIsLoadingRivals] = useState(false);

  // Load default batch on mount
  useEffect(() => {
    loadRivals([1, 2, 3, 5]);
  }, []);

  const loadRivals = async (ids: number[]) => {
    setIsLoadingRivals(true);
    try {
      const data = await fetchBatchFarms(ids);
      setRivalFarms(data);
    } catch (e) {
      console.error('Failed to load batch rival farms:', e);
    } finally {
      setIsLoadingRivals(false);
    }
  };

  const handleCustomRivalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = rivalIdsInput
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);

    if (parsed.length > 0) {
      loadRivals(parsed);
    }
  };

  const handleShare = () => {
    const text = `🌻 My Sunflower Land Farm #${farm.farmId} has a ${benchmark.efficiencyScore}/100 Efficiency Score on FarmIQ! Outperformed ${100 - benchmark.percentileRank}% of peer farms this week. Check your farm's profit intelligence!`;
    navigator.clipboard?.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  const isAhead = benchmark.weeklyProfitGrowth >= benchmark.peerMedianProfitGrowth;

  // Combine user's farm with rivals for live ranking
  const allFarmsForRanking: FarmState[] = [farm, ...Object.values(rivalFarms).filter(f => String(f.farmId) !== String(farm.farmId))];
  const sortedLeaderboard = allFarmsForRanking.sort((a, b) => b.sflBalance - a.sflBalance);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#2a1715] via-[#331c17] to-[#1f110f] border border-rose-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              <Swords className="w-3.5 h-3.5 text-rose-400" />
              <span>Strategy Benchmark Arena</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-rose-50 tracking-tight">
              The Profit Battle: You vs Peer Farms
            </h1>
            <p className="text-xs sm:text-sm text-rose-200/70 max-w-2xl leading-relaxed">
              Compare your farm's weekly profit and capital allocation against live mainnet farms. Powered by the official Sunflower Land batch lookup API (<code className="text-rose-300 font-mono bg-black/40 px-1 py-0.5 rounded text-[11px]">POST /community/getFarms</code>) querying up to 100 farms in a single call.
            </p>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-rose-500/20 transition-transform active:scale-95 shrink-0"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>{copiedShare ? 'Copied Strategy Card!' : 'Share Farm Strategy'}</span>
          </button>
        </div>
      </div>

      {/* Primary Efficiency Score & Comparison Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Strategy Efficiency Score Card */}
        <div className="rounded-3xl bg-[#1a140d] border border-amber-500/30 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-amber-300/70 font-semibold mb-2">
              <span>Overall Strategy Rating</span>
              <span className="text-amber-400 font-bold">Top {benchmark.percentileRank}% Tier</span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl sm:text-5xl font-black text-amber-100">
                {benchmark.efficiencyScore}
              </span>
              <span className="text-amber-400 text-lg font-bold">/100</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#291f13] overflow-hidden mt-3">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full"
                style={{ width: `${benchmark.efficiencyScore}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-amber-200/60 mt-4 pt-3 border-t border-amber-900/30">
            Efficiency considers plot uptime, seed ROI %, and opportunity cost loss.
          </div>
        </div>

        {/* Weekly Profit Growth vs Peers */}
        <div className="rounded-3xl bg-[#1a140d] border border-amber-500/30 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-amber-300/70 font-semibold mb-2">
              <span>Weekly Profit Growth</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-950/70 text-amber-300 border border-amber-500/20">
                {benchmark.peerCohort}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                +{benchmark.weeklyProfitGrowth}%
              </span>
              <span className="text-xs text-amber-200/60 font-medium">Your Farm</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs bg-[#241c12] p-2.5 rounded-xl border border-amber-500/20">
              <span className="text-amber-200/70">Peer Cohort Median:</span>
              <span className="font-extrabold text-amber-300">+{benchmark.peerMedianProfitGrowth}%</span>
            </div>
          </div>

          <div className="text-xs text-amber-200/60 mt-4 pt-3 border-t border-amber-900/30">
            {isAhead 
              ? '🔥 You are outperforming peer median growth by +' + (benchmark.weeklyProfitGrowth - benchmark.peerMedianProfitGrowth).toFixed(1) + '%' 
              : '⚡ You are ' + (benchmark.peerMedianProfitGrowth - benchmark.weeklyProfitGrowth).toFixed(1) + '% below top cohort peers'}
          </div>
        </div>

        {/* Quantified Missed Opportunity */}
        <div className="rounded-3xl bg-[#1e1511] border border-rose-500/30 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-2">
              <span>Estimated Opportunity Loss</span>
              <span className="text-rose-400 font-bold">Diagnostics</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-rose-400 mt-2">
              -{benchmark.potentialMissedSFL} <span className="text-lg font-bold">FLOWER</span>
            </div>
            <p className="text-xs text-rose-200/80 mt-2 leading-relaxed">
              Potential profit left on the table this week due to idle facility time or sub-optimal crop selection.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-900/30">
            <button
              onClick={() => onNavigate('farm-vs-market')}
              className="text-xs font-bold text-rose-300 hover:text-rose-200 flex items-center gap-1"
            >
              <span>Recover Missed Yield</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Batch Rivalry Leaderboard (POST /community/getFarms) */}
      <div className="rounded-3xl bg-[#16120b] border border-amber-500/20 p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-amber-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Live Mainnet Rivalry Leaderboard</span>
            </h2>
            <p className="text-xs text-amber-200/60">
              Fetched in a single high-efficiency request via <code className="text-amber-300">POST /community/getFarms</code>
            </p>
          </div>

          <form onSubmit={handleCustomRivalsSubmit} className="flex gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400/50" />
              <input
                type="text"
                placeholder="Rival IDs: 1, 2, 3, 5, 42..."
                value={rivalIdsInput}
                onChange={(e) => setRivalIdsInput(e.target.value)}
                className="bg-[#110d08] border border-amber-500/20 pl-8 pr-3 py-1.5 rounded-xl text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400 w-52 sm:w-64"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingRivals}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl shadow transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1"
            >
              {isLoadingRivals ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Batch Compare</span>}
            </button>
          </form>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto rounded-2xl border border-amber-900/30">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#20180f] text-amber-300/70 border-b border-amber-900/30 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-3">Farm</th>
                <th className="py-3 px-3">Bumpkin Level</th>
                <th className="py-3 px-3">Liquid FLOWER</th>
                <th className="py-3 px-3">Crop Plots</th>
                <th className="py-3 px-3">Key Reserves</th>
                <th className="py-3 px-4 text-right">Head-to-Head vs You</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-950/40 text-amber-100">
              {sortedLeaderboard.map((f, idx) => {
                const isUserFarm = String(f.farmId) === String(farm.farmId);
                const sflDiff = Number((farm.sflBalance - f.sflBalance).toFixed(1));

                return (
                  <tr 
                    key={f.farmId} 
                    className={`transition-colors ${
                      isUserFarm ? 'bg-amber-500/10 font-bold border-l-4 border-l-amber-400' : 'hover:bg-[#20180f]/70'
                    }`}
                  >
                    <td className="py-3 px-4 font-black">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-100">{f.ownerName}</span>
                        {isUserFarm && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-stone-950 font-extrabold">
                            YOU
                          </span>
                        )}
                        {f.isLiveApi && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            LIVE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-amber-200">
                      Level {f.level} ({f.bumpkinExperience.toLocaleString()} XP)
                    </td>
                    <td className="py-3 px-3 font-extrabold text-amber-300">
                      {f.sflBalance.toLocaleString()} FLOWER
                    </td>
                    <td className="py-3 px-3 text-amber-200/80">
                      {f.plots.unlocked} Plots
                    </td>
                    <td className="py-3 px-3 text-[11px] text-amber-200/60">
                      🪵 {Math.round(f.inventory.wood || 0)} • 🪨 {Math.round(f.inventory.stone || 0)} • 🥦 {Math.round(f.inventory.cauliflower || 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isUserFarm ? (
                        <span className="text-amber-400 font-bold">— Your Base —</span>
                      ) : sflDiff > 0 ? (
                        <span className="text-emerald-400 font-extrabold">+{sflDiff} FLOWER ahead</span>
                      ) : (
                        <span className="text-rose-400 font-bold">{sflDiff} FLOWER behind</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Diagnostic Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Biggest Missed Opportunity */}
        <div className="rounded-3xl bg-[#16120b] border border-rose-500/30 p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-400">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Top Identified Inefficiency</span>
          </div>

          <h2 className="text-xl font-bold text-rose-100">
            {benchmark.biggestMissedOpportunity}
          </h2>

          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-xs sm:text-sm text-rose-200/90 leading-relaxed">
            <strong className="text-rose-300">Strategy Fix: </strong>
            {benchmark.actionableTip}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigate('profit-radar')}
              className="px-4 py-2 rounded-xl bg-[#2b1715] hover:bg-[#381f1c] text-rose-200 border border-rose-500/30 text-xs font-bold transition-colors"
            >
              View Flower & Apiary Margins
            </button>
          </div>
        </div>

        {/* Your Key Strength */}
        <div className="rounded-3xl bg-[#16120b] border border-emerald-500/30 p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Your Major Farm Advantage</span>
          </div>

          <h2 className="text-xl font-bold text-emerald-100">
            {benchmark.topStrength}
          </h2>

          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
            <strong className="text-emerald-300">Competitive Edge: </strong>
            Your plot rotation rate is in the 88th percentile. You harvest within 15 minutes of crop maturity, preserving working capital velocity.
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigate('simulator')}
              className="px-4 py-2 rounded-xl bg-[#162719] hover:bg-[#1f3723] text-emerald-200 border border-emerald-500/30 text-xs font-bold transition-colors"
            >
              Simulate Scaling This Edge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


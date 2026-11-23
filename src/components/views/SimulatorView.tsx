'use client';

import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  Coins, 
  Layers, 
  ArrowRight,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FarmState } from '../../types';
import { simulateStrategy } from '../../lib/profitEngine';
import { SFL_TOKEN_PRICE_USD } from '../../data/sflData';

interface SimulatorViewProps {
  farm: FarmState;
  onNavigate: (tabId: any) => void;
}

export default function SimulatorView({ farm, onNavigate }: SimulatorViewProps) {
  const [strategy, setStrategy] = useState<string>('flower_apiary');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [playstyle, setPlaystyle] = useState<'casual' | 'balanced' | 'hardcore'>('balanced');

  const simulation = useMemo(() => {
    return simulateStrategy({
      strategy,
      durationDays,
      farm,
      playstyle,
    });
  }, [strategy, durationDays, farm, playstyle]);

  const strategies = [
    {
      id: 'flower_apiary',
      name: '🌺 Flower & Apiary Mastery',
      desc: 'Breed White Lotus & Red Pansies, pollinate beehives for high-margin Honey.',
      badge: 'High Yield',
    },
    {
      id: 'cauliflower_grind',
      name: '🥦 Cauliflower Heavy Rotation',
      desc: 'Maximizes plot land overnight with predictable high-XP and steady Betty sell price.',
      badge: 'Reliable Cashflow',
    },
    {
      id: 'cooking_deluxe',
      name: '🎂 Cooking & Bakery Empire',
      desc: 'Process sunflowers, wheat, and eggs into cakes and chowders for maximum market multiplier.',
      badge: 'Value-Add',
    },
    {
      id: 'balanced_farm',
      name: '🌾 Balanced Multi-Crop Farm',
      desc: 'Even split between short cycle crops, livestock feeds, and tool mining.',
      badge: 'Lowest Risk',
    },
  ];

  const netProfitUSD = (simulation.netProfitSFL * SFL_TOKEN_PRICE_USD).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#241a0e] via-[#2d2012] to-[#1c150c] border border-amber-500/25 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Strategy Decision Sandbox</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight">
            Profit Strategy Simulator
          </h1>
          <p className="text-xs sm:text-sm text-amber-200/70 leading-relaxed">
            Test farming strategies before committing resources or spending seeds. Simulate <span className="text-amber-300 font-semibold">"What if I go all-in on flowers for 7 days?"</span> or <span className="text-amber-300 font-semibold">"What if I convert crops into bakery cakes?"</span>
          </p>
        </div>
      </div>

      {/* Simulator Inputs Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-3xl bg-[#18130c] border border-amber-500/20 shadow-xl space-y-5">
            <div className="text-xs font-bold text-amber-300/80 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Simulation Parameters</span>
            </div>

            {/* Strategy Select */}
            <div>
              <label className="block text-xs font-semibold text-amber-200/70 mb-2">Select Farming Strategy</label>
              <div className="space-y-2">
                {strategies.map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => setStrategy(strat.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all ${
                      strategy === strat.id
                        ? 'bg-[#291e13] border-amber-500/60 shadow-md text-amber-100'
                        : 'bg-[#120e09] border-amber-500/15 text-amber-200/70 hover:bg-[#1b140c]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{strat.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/30 text-amber-300">
                        {strat.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/50 mt-1 leading-snug">
                      {strat.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-amber-200/70 mb-1.5">
                <span>Simulation Duration:</span>
                <span className="font-extrabold text-amber-300">{durationDays} Days</span>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                step="1"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-amber-200/40 mt-1">
                <span>1 Day (Quick test)</span>
                <span>7 Days (Weekly cycle)</span>
                <span>14 Days (Bi-weekly)</span>
              </div>
            </div>

            {/* Playstyle Cadence */}
            <div>
              <label className="block text-xs font-semibold text-amber-200/70 mb-2">Check-in Frequency</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['casual', 'balanced', 'hardcore'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setPlaystyle(style)}
                    className={`py-2 rounded-xl text-xs font-bold capitalize border transition-colors ${
                      playstyle === style
                        ? 'bg-amber-500 text-stone-950 border-amber-400 font-extrabold'
                        : 'bg-[#120e09] border-amber-500/15 text-amber-200/60 hover:text-amber-100'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-amber-200/50 mt-1 px-1">
                {playstyle === 'casual' ? '1 check-in per day (Passive overnight)' :
                 playstyle === 'balanced' ? '2-3 check-ins per day (Optimal rotation)' :
                 'Hourly rotation (Maximum sweat mode)'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Simulation Results & Projections */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top 4 Financial Result Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20">
              <div className="text-[11px] text-amber-200/50 uppercase font-semibold">Initial Seed Cost</div>
              <div className="text-xl font-black text-amber-200 mt-1">{simulation.initialInvestmentSFL} FLOWER</div>
              <div className="text-[10px] text-amber-200/40">Working capital required</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20">
              <div className="text-[11px] text-amber-200/50 uppercase font-semibold">Gross Harvest Yield</div>
              <div className="text-xl font-black text-amber-100 mt-1">{simulation.totalGrossYieldSFL} FLOWER</div>
              <div className="text-[10px] text-emerald-400 font-semibold">{simulation.roiPercentage}% Net ROI</div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#231a0e] to-[#2c2012] border border-emerald-500/40">
              <div className="text-[11px] text-emerald-400 uppercase font-bold">Estimated Net Profit</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">+{simulation.netProfitSFL} FLOWER</div>
              <div className="text-[10px] text-emerald-200/60 font-medium">≈ ${netProfitUSD} USD</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20">
              <div className="text-[11px] text-amber-200/50 uppercase font-semibold">Risk & Volatility</div>
              <div className="text-xl font-black text-amber-300 mt-1 flex items-center gap-1.5">
                {simulation.riskRating}
                <span className={`w-2 h-2 rounded-full ${simulation.riskRating === 'Low' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <div className="text-[10px] text-amber-200/40">{simulation.hourlyEfficiency} FLOWER / hour</div>
            </div>
          </div>

          {/* Cumulative Profit Growth Projection Chart */}
          <div className="p-6 rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-amber-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>Cumulative Profit Growth Curve ({durationDays} Days)</span>
                </h3>
                <p className="text-xs text-amber-200/60">
                  Track how your net profit scales day by day under this strategy
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                  <span>Invested</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                  <span>Net Profit</span>
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="simProfitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2215" vertical={false} />
                  <XAxis dataKey="day" stroke="#8c7657" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8c7657" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1b140b',
                      borderColor: '#10b981',
                      borderRadius: '12px',
                      color: '#fef3c7',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#simProfitGrad)" />
                  <Area type="monotone" dataKey="invested" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strategic Advice & Resource Requirements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20 space-y-2">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulation Key Takeaway</span>
              </div>
              <p className="text-xs text-amber-100 font-medium leading-relaxed">
                {simulation.keyAdvice}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#18130c] border border-amber-500/20 space-y-2">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Total Seed & Resource Inputs</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {simulation.resourceConsumptionSummary.map((res, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-xl bg-[#241c12] border border-amber-500/20 text-amber-200 font-semibold">
                    {res.amount} × {res.itemName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


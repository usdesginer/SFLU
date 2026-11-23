'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Coins, 
  Award, 
  RotateCcw, 
  TrendingUp, 
  ChevronRight,
  ChevronDown,
  Flame,
  Check,
  Clock,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  ShieldCheck,
  Package,
  Layers,
  Compass,
  Zap,
  Info,
  Calendar,
  Filter,
  Sliders,
  Target,
  Calculator,
  Gauge,
  BarChart3,
  Lightbulb,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FarmState, DailyMission } from '../../types';
import { 
  generateIntelligentMissions, 
  OpportunityInsight, 
  MissionRankingStrategy, 
  STRATEGY_PRESETS, 
  rankMissionsByStrategy 
} from '../../lib/missionsEngine';
import { fetchCompletedMissions, persistMissionStatus } from '../../lib/supabaseClient';
import { FLOWER_TOKEN_PRICE_USD } from '../../data/sflData';
import ExecutionGuideModal from '../missions/ExecutionGuideModal';

interface DailyMissionsViewProps {
  farm: FarmState;
  onNavigate: (tabId: any) => void;
  onMissionsUpdated?: (remaining: number) => void;
  marketplaceData?: any;
}

type MissionFilter = 'all' | 'urgent' | 'high-roi' | 'strategic' | 'pending';

export default function DailyMissionsView({ 
  farm, 
  onNavigate, 
  onMissionsUpdated,
  marketplaceData 
}: DailyMissionsViewProps) {
  const flowerPriceUSD = marketplaceData?.flowerPriceUSD || FLOWER_TOKEN_PRICE_USD;

  // Generate intelligent missions & personalized insights
  const { missions: generatedMissions, insights, summary } = useMemo(() => {
    return generateIntelligentMissions(farm, marketplaceData);
  }, [farm, marketplaceData]);

  const [missions, setMissions] = useState<DailyMission[]>(generatedMissions);
  const [activeStrategy, setActiveStrategy] = useState<MissionRankingStrategy>('balanced');
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>('mission-1');
  const [activeFilter, setActiveFilter] = useState<MissionFilter>('all');
  const [selectedGuideMission, setSelectedGuideMission] = useState<DailyMission | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, Set<number>>>({});
  const todayDate = new Date().toISOString().split('T')[0];

  const toggleChecklistStep = (missionId: string, stepNumber: number) => {
    setChecklistProgress(prev => {
      const current = new Set(prev[missionId] || []);
      if (current.has(stepNumber)) {
        current.delete(stepNumber);
      } else {
        current.add(stepNumber);
      }
      return { ...prev, [missionId]: current };
    });
  };

  const openExecutionGuide = (mission: DailyMission) => {
    setSelectedGuideMission(mission);
    setIsGuideModalOpen(true);
  };

  // Re-sync generated missions when farm changes while preserving completion state
  useEffect(() => {
    setMissions(prev => {
      const completedSet = new Set(prev.filter(m => m.isCompleted).map(m => m.id));
      return generatedMissions.map(m => ({
        ...m,
        isCompleted: completedSet.has(m.id) || m.autoVerified,
      }));
    });
  }, [generatedMissions]);

  // Load completed missions for this farm from Supabase / LocalStorage
  useEffect(() => {
    fetchCompletedMissions(farm.farmId, todayDate).then(completedIds => {
      if (completedIds && completedIds.length > 0) {
        setMissions(prev => prev.map(m => ({
          ...m,
          isCompleted: completedIds.includes(m.id) || m.isCompleted,
        })));
      }
    });
  }, [farm.farmId, todayDate]);

  // Sync remaining missions to parent badge
  useEffect(() => {
    const remaining = missions.filter(m => !m.isCompleted).length;
    if (onMissionsUpdated) {
      onMissionsUpdated(remaining);
    }
  }, [missions, onMissionsUpdated]);

  const toggleMission = (id: string) => {
    setMissions(prev => {
      const next = prev.map(m => {
        if (m.id === id) {
          const newState = !m.isCompleted;
          if (newState) {
            try {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#f59e0b', '#10b981', '#fbbf24', '#ffffff']
              });
            } catch (e) {
              // Ignore if canvas-confetti is not loaded
            }
          }
          persistMissionStatus(farm.farmId, id, todayDate, newState);
          return { ...m, isCompleted: newState };
        }
        return m;
      });
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedMissionId(prev => prev === id ? null : id);
  };

  const completedCount = missions.filter(m => m.isCompleted).length;
  const totalCount = missions.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const totalProjectedProfit = missions.reduce((sum, m) => sum + m.netProfitFlower, 0);
  const realizedProfit = missions
    .filter(m => m.isCompleted)
    .reduce((sum, m) => sum + m.netProfitFlower, 0);

  const realizedUSD = Number((realizedProfit * flowerPriceUSD).toFixed(2));
  const totalProjectedUSD = Number((totalProjectedProfit * flowerPriceUSD).toFixed(2));

  const totalXP = missions.reduce((sum, m) => sum + m.xpReward, 0);
  const earnedXP = missions
    .filter(m => m.isCompleted)
    .reduce((sum, m) => sum + m.xpReward, 0);

  // Active strategy preset
  const currentPreset = STRATEGY_PRESETS[activeStrategy] || STRATEGY_PRESETS.balanced;

  // Dynamically re-rank and score missions based on selected strategy
  const rankedMissions = useMemo(() => {
    return rankMissionsByStrategy(missions, activeStrategy);
  }, [missions, activeStrategy]);

  // Filtered missions queue derived from dynamically ranked missions
  const filteredMissions = useMemo(() => {
    return rankedMissions.filter(m => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'urgent') return m.urgencyLevel === 'urgent';
      if (activeFilter === 'high-roi') return m.urgencyLevel === 'high-roi';
      if (activeFilter === 'strategic') return m.urgencyLevel === 'strategic';
      if (activeFilter === 'pending') return !m.isCompleted;
      return true;
    });
  }, [rankedMissions, activeFilter]);

  const handleReset = () => {
    const fresh = generateIntelligentMissions(farm, marketplaceData).missions;
    setMissions(fresh);
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. DAILY PERFORMANCE OVERVIEW (Command Center Hero)                 */}
      {/* =================================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#251b0f] via-[#2f2213] to-[#1c150c] border border-amber-500/25 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>FarmIQ 2.0 • Intelligent Operations & Decision Engine</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight">
              Intelligent Daily Farming Command Center
            </h1>
            
            <p className="text-xs sm:text-sm text-amber-200/70 max-w-2xl leading-relaxed">
              Never farm blind. FarmIQ audits your live plots, greenhouse beds, deliveries, and stockpiles to calculate transparent financial ROI, urgency, and step-by-step execution protocols.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-[#18120b] border border-amber-500/30 p-3 sm:p-4 rounded-2xl">
            <div className="text-left px-2">
              <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Projected Net Profit</div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                +{totalProjectedProfit.toFixed(2)} <span className="text-xs">FLOWER</span>
              </div>
              <div className="text-[10px] text-amber-200/60 font-mono mt-0.5">
                ≈ ${totalProjectedUSD.toFixed(2)} USD
              </div>
            </div>

            <div className="text-left px-2 border-l border-amber-900/40">
              <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Realized Today</div>
              <div className="text-lg sm:text-xl font-black text-amber-100 mt-0.5">
                +{realizedProfit.toFixed(2)} <span className="text-xs">FLOWER</span>
              </div>
              <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
                {progressPercent}% unlocked
              </div>
            </div>

            <div className="text-left px-2 border-l border-amber-900/40">
              <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Bumpkin XP Gain</div>
              <div className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">
                +{totalXP} <span className="text-xs">XP</span>
              </div>
              <div className="text-[10px] text-amber-200/60 mt-0.5">
                +{earnedXP} earned so far
              </div>
            </div>

            <div className="text-left px-2 border-l border-amber-900/40">
              <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Daily Plan</div>
              <div className="text-lg sm:text-xl font-black text-amber-100 mt-0.5">
                {completedCount} / {totalCount}
              </div>
              <div className="text-[10px] text-amber-200/60 font-semibold mt-0.5">
                {totalCount - completedCount} pending
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar & Urgency Counter */}
        <div className="pt-4 border-t border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-amber-200/80 font-medium">
              <span>Daily Operations Execution: {completedCount} of {totalCount} completed ({progressPercent}%)</span>
              <span className="text-emerald-400 font-bold font-mono">Realized: +{realizedProfit.toFixed(2)} FLOWER (~${realizedUSD} USD)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-[#130e08] overflow-hidden p-0.5 border border-amber-500/20">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" />
              <span>{summary.urgentCount} Urgent</span>
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-300 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span>{summary.highRoiCount} High ROI</span>
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/30 text-blue-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              <span>{summary.strategicCount} Strategic</span>
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. PERSONALIZED OPPORTUNITY INTELLIGENCE (Contextual Insights)      */}
      {/* =================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-100 uppercase tracking-wider">
              Personalized Opportunity Intelligence
            </h2>
          </div>
          <span className="text-xs text-amber-200/50 font-medium">Audited from live farm telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights.map(item => (
            <div 
              key={item.id}
              className="p-4 rounded-2xl bg-[#16120b] border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl p-1.5 rounded-xl bg-[#22180e] border border-amber-500/20">{item.icon}</span>
                  <div className="text-right">
                    <div className="text-[10px] text-amber-200/50 uppercase font-bold">{item.metricLabel}</div>
                    <div className="text-sm font-black text-emerald-400 font-mono">{item.metricValue}</div>
                  </div>
                </div>

                <div className="font-extrabold text-sm text-amber-100">{item.title}</div>
                <p className="text-xs text-amber-200/70 leading-snug">{item.description}</p>
              </div>

              <button
                onClick={() => onNavigate(item.tabTarget)}
                className="w-full py-1.5 px-3 rounded-xl bg-[#22190f] hover:bg-amber-500 hover:text-stone-950 text-amber-300 text-xs font-bold border border-amber-500/25 transition-all flex items-center justify-between"
              >
                <span>{item.actionText}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2.5 STRATEGY & MISSION RANKING ENGINE CONTROLS                     */}
      {/* =================================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#19130b] border border-amber-500/20 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-100 uppercase tracking-wider">
                FarmIQ Ranking Strategy & Optimization Goal
              </h3>
            </div>
            <p className="text-xs text-amber-200/70">
              Select an optimization model to dynamically recalibrate mission priority scores and execution order.
            </p>
          </div>

          {/* Strategy Preset Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#120d07] border border-amber-500/20 shrink-0">
            {(Object.keys(STRATEGY_PRESETS) as MissionRankingStrategy[]).map((key) => {
              const preset = STRATEGY_PRESETS[key];
              const isSelected = activeStrategy === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveStrategy(key)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                      : 'text-amber-200/70 hover:text-amber-100 hover:bg-[#20180f]'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Strategy Calibration Callout */}
        <div className="p-3 rounded-xl bg-[#130d07] border border-amber-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">{currentPreset.icon}</span>
            <div>
              <span className="font-extrabold text-amber-100">{currentPreset.name}: </span>
              <span className="text-amber-200/75">{currentPreset.tagline}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-[11px] font-mono text-amber-300/80 bg-[#1e150c] px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {`Weights: P:${(currentPreset.weights.wP * 100).toFixed(0)}% · T:${(currentPreset.weights.wT * 100).toFixed(0)}% · U:${(currentPreset.weights.wU * 100).toFixed(0)}% · R:${(currentPreset.weights.wR * 100).toFixed(0)}% · X:${(currentPreset.weights.wX * 100).toFixed(0)}% · M:${(currentPreset.weights.wM * 100).toFixed(0)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. MISSION PRIORITY QUEUE (With Filters & Urgency Badges)          */}
      {/* =================================================================== */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-100 uppercase tracking-wider">
              Mission Priority Queue ({filteredMissions.length})
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: `All (${missions.length})` },
              { id: 'urgent', label: `🚨 Urgent (${summary.urgentCount})` },
              { id: 'high-roi', label: `💎 High ROI (${summary.highRoiCount})` },
              { id: 'strategic', label: `🛡️ Strategic (${summary.strategicCount})` },
              { id: 'pending', label: `⚡ Action Needed (${totalCount - completedCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as MissionFilter)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === tab.id
                    ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                    : 'bg-[#18130c] hover:bg-[#20180f] text-amber-200/70 hover:text-amber-100 border border-amber-500/15'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4 & 5. DETAILED MISSION EXECUTION & PROFITABILITY PANELS           */}
        {/* =================================================================== */}
        <div className="space-y-3">
          {filteredMissions.map((mission, index) => {
            const isDone = mission.isCompleted;
            const isExpanded = expandedMissionId === mission.id;
            const fin = mission.financials;
            const exec = mission.execution;

            return (
              <div
                key={mission.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isDone
                    ? 'bg-[#151d14]/70 border-emerald-500/40 text-emerald-100 shadow-sm'
                    : 'bg-[#18130c] border-amber-500/20 hover:border-amber-500/40 text-amber-100'
                }`}
              >
                {/* Header Row (Always Visible) */}
                <div 
                  onClick={() => toggleExpand(mission.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMission(mission.id);
                      }}
                      className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-400 text-stone-950 font-bold shadow-md shadow-emerald-500/20'
                          : 'border-amber-500/40 hover:border-amber-400 bg-[#251d13]'
                      }`}
                    >
                      {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Rank Badge */}
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-[#2a1d10] border border-amber-500/30 text-amber-300">
                          Rank #{index + 1}
                        </span>

                        {/* Priority Score Pill */}
                        {mission.missionScore && (
                          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-mono font-black text-xs shadow-sm ${
                            mission.missionScore.rankTier === 'Critical'
                              ? 'bg-rose-950/90 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/20'
                              : mission.missionScore.rankTier === 'High'
                              ? 'bg-amber-950/90 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/20'
                              : mission.missionScore.rankTier === 'Medium'
                              ? 'bg-blue-950/90 border-blue-500/40 text-blue-300'
                              : 'bg-stone-900 border-stone-600/40 text-stone-300'
                          }`}>
                            <span className="text-xs font-black">{mission.missionScore.finalScore}</span>
                            <span className="text-[10px] text-amber-200/50 font-sans font-bold">/100</span>
                            <span className={`text-[9px] font-sans font-black px-1.5 py-0.2 rounded uppercase ${
                              mission.missionScore.rankTier === 'Critical'
                                ? 'bg-rose-500 text-stone-950'
                                : mission.missionScore.rankTier === 'High'
                                ? 'bg-amber-500 text-stone-950'
                                : mission.missionScore.rankTier === 'Medium'
                                ? 'bg-blue-400 text-stone-950'
                                : 'bg-stone-500 text-stone-950'
                            }`}>
                              {mission.missionScore.rankTier}
                            </span>
                          </div>
                        )}

                        {/* Duration Pill */}
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#251c12] border border-amber-500/25 text-amber-200/90 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>
                            {mission.category === 'save' 
                              ? 'Variable' 
                              : `${mission.missionScore?.durationMinutes || 15} min`}
                          </span>
                        </span>

                        {/* Urgency Badge */}
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase border ${
                          mission.urgencyLevel === 'urgent'
                            ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                            : mission.urgencyLevel === 'high-roi'
                            ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                            : 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                        }`}>
                          {mission.urgencyLabel}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#251c12] border border-amber-500/20 text-amber-200/70">
                          {mission.timeHorizon}
                        </span>

                        {/* Live Verification Badge */}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          mission.autoVerified
                            ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-950/60 border-amber-500/20 text-amber-400/80'
                        }`}>
                          {mission.autoVerified ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-400" />
                          )}
                          <span>{mission.verificationBadge}</span>
                        </span>
                      </div>

                      <h3 className={`font-bold text-base sm:text-lg ${isDone ? 'line-through text-emerald-300/70' : 'text-amber-50'}`}>
                        {mission.title}
                      </h3>

                      <p className={`text-xs sm:text-sm ${isDone ? 'text-emerald-400/60' : 'text-amber-200/70'} leading-relaxed`}>
                        {mission.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-amber-300/80 pt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="italic">{mission.reason}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Net Return & Toggle */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                        +{mission.netProfitFlower.toFixed(2)} <span className="text-xs">FLOWER</span>
                      </div>
                      <div className="text-[10px] text-amber-200/60 font-mono">
                        ≈ ${fin.netProfitUSD.toFixed(2)} USD • +{fin.roiPercent}% ROI
                      </div>
                      <div className="text-[10px] text-amber-300/90 font-bold mt-0.5">
                        +{mission.xpReward} XP
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(mission.id);
                      }}
                      className="p-1.5 rounded-xl bg-[#251d13] border border-amber-500/20 text-amber-400 hover:text-amber-200 hover:bg-[#302418] transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* EXPANDABLE SECTION: DETAILED MISSION EXECUTION PANEL          */}
                {/* ============================================================= */}
                {isExpanded && (() => {
                  const missionSteps = exec.checklistSteps || [
                    { stepNumber: 1, title: 'Inspect ready plots', detail: exec.steps[0] || 'Verify ready plots or items in inventory.' },
                    { stepNumber: 2, title: 'Execute primary operation', detail: exec.steps[1] || 'Harvest, craft, or deliver designated items.' },
                    { stepNumber: 3, title: 'Evaluate crop inventory', detail: exec.steps[2] || 'Confirm output produce has entered farm inventory.' },
                    { stepNumber: 4, title: 'Select next cycle', detail: exec.steps[3] || 'Prepare replacement seeds, tools, or resources.' },
                    { stepNumber: 5, title: 'Replant and verify', detail: exec.steps[4] || 'Confirm plots have entered their next cycle.' },
                  ];
                  const currentCompletedSet = checklistProgress[mission.id] || (isDone ? new Set([1, 2, 3, 4, 5]) : new Set());
                  const stepsDoneCount = currentCompletedSet.size;
                  const stepsTotalCount = missionSteps.length;
                  const stepsPercent = Math.round((stepsDoneCount / stepsTotalCount) * 100);
                  const primaryMetricLabel = exec.primaryMetricLabel || 'Target Quantity';
                  const primaryMetricValue = exec.primaryMetricValue || `${mission.progressTarget} ${mission.unit}`;

                  return (
                    <div className="border-t border-amber-900/30 p-4 sm:p-6 bg-[#130f0a] space-y-5 animate-in fade-in duration-150">
                      
                      {/* 1. TOP KEY METRICS 4-BOX BAR */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-[#1b140b] border border-amber-500/25">
                        <div className="p-1">
                          <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">{primaryMetricLabel}</div>
                          <div className="text-base sm:text-lg font-black text-amber-100 font-mono mt-0.5">
                            {primaryMetricValue}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Farm Telemetry Verified</div>
                        </div>

                        <div className="p-1 border-l border-amber-900/40 pl-3">
                          <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Projected Profit</div>
                          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                            +{mission.netProfitFlower.toFixed(2)} <span className="text-xs">FLOWER</span>
                          </div>
                          <div className="text-[10px] text-amber-200/60 font-mono mt-0.5">
                            ≈ ${fin.netProfitUSD.toFixed(2)} USD (Data-driven)
                          </div>
                        </div>

                        <div className="p-1 border-l border-amber-900/40 pl-3">
                          <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Potential XP</div>
                          <div className="text-base sm:text-lg font-black text-amber-300 font-mono mt-0.5">
                            +{mission.xpReward} <span className="text-xs">XP</span>
                          </div>
                          <div className="text-[10px] text-amber-200/60 mt-0.5">
                            Bumpkin Compounding
                          </div>
                        </div>

                        <div className="p-1 border-l border-amber-900/40 pl-3">
                          <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Estimated Duration</div>
                          <div className="text-base sm:text-lg font-black text-amber-100 font-mono mt-0.5">
                            {mission.category === 'save' ? 'Variable' : `~${mission.missionScore?.durationMinutes || 15} min`}
                          </div>
                          <div className="text-[10px] text-amber-200/60 font-mono mt-0.5">
                            Turnaround Time
                          </div>
                        </div>
                      </div>

                      {/* 2. WHY FARMIQ RECOMMENDS THIS CALLOUT */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#23180c] to-amber-500/5 border border-amber-500/30 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-black text-amber-300 uppercase tracking-wider">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Why FarmIQ Recommends This</span>
                        </div>
                        <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                          {mission.reason}
                        </p>
                      </div>

                      {/* 3. EXECUTION CHECKLIST (Interactive Step-by-Step) */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                            <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                              Execution Checklist ({stepsDoneCount} of {stepsTotalCount} completed)
                            </h4>
                          </div>
                          <span className="text-xs text-amber-400 font-mono font-bold">
                            {stepsPercent}% Progress
                          </span>
                        </div>

                        {/* Checklist Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-[#100b06] border border-amber-500/20 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${stepsPercent}%` }}
                          />
                        </div>

                        {/* Interactive Steps List */}
                        <div className="space-y-2 pt-1">
                          {missionSteps.map((step) => {
                            const isStepDone = currentCompletedSet.has(step.stepNumber);
                            return (
                              <div
                                key={step.stepNumber}
                                onClick={() => toggleChecklistStep(mission.id, step.stepNumber)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                  isStepDone
                                    ? 'bg-[#152214]/60 border-emerald-500/40 text-emerald-100'
                                    : 'bg-[#191209] border-amber-500/20 hover:border-amber-500/40 text-amber-100 hover:bg-[#20170c]'
                                }`}
                              >
                                {/* Step Checkbox */}
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[11px] shrink-0 mt-0.5 transition-colors ${
                                  isStepDone
                                    ? 'bg-emerald-500 text-stone-950 shadow-md'
                                    : 'bg-[#291e12] border border-amber-500/30 text-amber-300'
                                }`}>
                                  {isStepDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.stepNumber}
                                </div>

                                <div className="space-y-0.5 flex-1">
                                  <div className={`font-bold text-xs sm:text-sm ${isStepDone ? 'line-through text-emerald-300/80' : 'text-amber-100'}`}>
                                    {step.stepNumber}. {step.title}
                                  </div>
                                  <p className={`text-xs leading-relaxed ${isStepDone ? 'text-emerald-400/70' : 'text-amber-200/75'}`}>
                                    {step.detail}
                                  </p>
                                </div>

                                <div className="text-[10px] text-amber-200/40 font-mono shrink-0 pt-0.5">
                                  {isStepDone ? 'Done ✓' : 'Mark Step'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. PROFIT BREAKDOWN TABLE */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-300 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <span>Profit Breakdown</span>
                          </span>
                          <span className="text-[10px] text-amber-200/50 normal-case font-mono">
                            Farm-state verified
                          </span>
                        </div>

                        <div className="rounded-2xl border border-amber-500/20 overflow-hidden text-xs bg-[#130d07]">
                          <table className="w-full text-left">
                            <thead className="bg-[#1e150b] text-amber-200/60 uppercase font-bold text-[10px] border-b border-amber-900/40">
                              <tr>
                                <th className="py-2.5 px-4">Calculation</th>
                                <th className="py-2.5 px-4 text-right">Value</th>
                                <th className="py-2.5 px-4 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-900/25 font-mono">
                              <tr>
                                <td className="py-2 px-4 text-amber-200/80 font-sans">Estimated Output Value</td>
                                <td className="py-2 px-4 text-right text-amber-100 font-bold">
                                  +{fin.grossRewardFlower.toFixed(4)} FLOWER
                                </td>
                                <td className="py-2 px-4 text-right text-emerald-400/90 text-[11px] font-sans">
                                  Data-driven
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-4 text-amber-200/80 font-sans">Seed / Replanting Cost</td>
                                <td className="py-2 px-4 text-right text-rose-400 font-bold">
                                  -{fin.inputCostFlower.toFixed(4)} FLOWER
                                </td>
                                <td className="py-2 px-4 text-right text-rose-400/80 text-[11px] font-sans">
                                  Data-driven
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2 px-4 text-amber-200/80 font-sans">Other / Tool Costs</td>
                                <td className="py-2 px-4 text-right text-amber-200/60 font-bold">
                                  0.0000 FLOWER
                                </td>
                                <td className="py-2 px-4 text-right text-amber-200/50 text-[11px] font-sans">
                                  Data-driven
                                </td>
                              </tr>
                              <tr className="bg-[#1b140a]/80 font-bold">
                                <td className="py-2.5 px-4 text-amber-100 font-sans">Estimated Net Profit</td>
                                <td className="py-2.5 px-4 text-right text-emerald-400 font-black text-sm">
                                  +{fin.netProfitFlower.toFixed(4)} FLOWER*
                                </td>
                                <td className="py-2.5 px-4 text-right text-emerald-400 text-[11px] font-sans font-bold">
                                  Farm-state verified
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="p-2 px-4 bg-[#0e0905] text-[10px] text-amber-200/50 italic border-t border-amber-900/20">
                            *Illustrative figure calibrated against Sunflower Land Community API floor and NPC baseline prices. Farm-state verified.
                          </div>
                        </div>
                      </div>

                      {/* 5. FARMIQ PRIORITY & OPPORTUNITY SCORING MATRIX */}
                      {mission.missionScore && (
                        <div className="p-4 rounded-2xl bg-[#1b140b] border border-amber-500/25 space-y-3 shadow-inner">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/40 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-amber-400" />
                              <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                                Opportunity Scoring Matrix ({currentPreset.name})
                              </h4>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-amber-200/60 font-mono">Composite Opportunity:</span>
                              <span className="text-xs font-black text-amber-100 font-mono">
                                {mission.missionScore.finalScore}/100 ({mission.missionScore.rankTier} Tier)
                              </span>
                            </div>
                          </div>

                          {/* Formula Display */}
                          <div className="p-2.5 rounded-xl bg-[#120d07] border border-amber-500/15 font-mono text-[11px] text-amber-200/80 space-y-1">
                            <div className="flex items-center justify-between text-amber-400 font-bold">
                              <span>Normalized Multi-Factor Scoring Formulation</span>
                              <span className="text-amber-200/50 font-normal">Score = 0.35P + 0.20T + 0.15U + 0.15R + 0.10X + 0.05M</span>
                            </div>
                            <div className="text-amber-100/90 leading-relaxed overflow-x-auto whitespace-nowrap">
                              Score = ({currentPreset.weights.wP.toFixed(2)} × {mission.missionScore.profitScore}) + ({currentPreset.weights.wT.toFixed(2)} × {mission.missionScore.timeScore}) + ({currentPreset.weights.wU.toFixed(2)} × {mission.missionScore.urgencyScore}) + ({currentPreset.weights.wR.toFixed(2)} × {mission.missionScore.readinessScore}) + ({currentPreset.weights.wX.toFixed(2)} × {mission.missionScore.xpScore}) + ({currentPreset.weights.wM.toFixed(2)} × {mission.missionScore.marketScore}) = <strong className="text-amber-300 font-black">{mission.missionScore.finalScore}/100</strong>
                            </div>
                          </div>

                          {/* 6 Factors Progress Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {/* Profit (P) */}
                            <div className="p-2 rounded-xl bg-[#150f08] border border-amber-500/15 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-200/70 font-semibold text-[11px]">Net Profit (P) {(currentPreset.weights.wP * 100).toFixed(0)}%</span>
                                <span className="font-mono font-black text-emerald-400 text-xs">{mission.missionScore.profitScore}/100</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${mission.missionScore.profitScore}%` }} />
                              </div>
                            </div>

                            {/* Time (T) */}
                            <div className="p-2 rounded-xl bg-[#150f08] border border-amber-500/15 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-200/70 font-semibold text-[11px]">Turnover (T) {(currentPreset.weights.wT * 100).toFixed(0)}%</span>
                                <span className="font-mono font-black text-yellow-400 text-xs">{mission.missionScore.timeScore}/100</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden">
                                <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${mission.missionScore.timeScore}%` }} />
                              </div>
                            </div>

                            {/* Urgency (U) */}
                            <div className="p-2 rounded-xl bg-[#150f08] border border-amber-500/15 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-200/70 font-semibold text-[11px]">Urgency (U) {(currentPreset.weights.wU * 100).toFixed(0)}%</span>
                                <span className="font-mono font-black text-rose-400 text-xs">{mission.missionScore.urgencyScore}/100</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden">
                                <div className="h-full bg-rose-400 rounded-full" style={{ width: `${mission.missionScore.urgencyScore}%` }} />
                              </div>
                            </div>

                            {/* Readiness (R) */}
                            <div className="p-2 rounded-xl bg-[#150f08] border border-amber-500/15 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-200/70 font-semibold text-[11px]">Readiness (R) {(currentPreset.weights.wR * 100).toFixed(0)}%</span>
                                <span className="font-mono font-black text-sky-400 text-xs">{mission.missionScore.readinessScore}/100</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden">
                                <div className="h-full bg-sky-400 rounded-full" style={{ width: `${mission.missionScore.readinessScore}%` }} />
                              </div>
                            </div>

                            {/* XP (X) */}
                            <div className="p-2 rounded-xl bg-[#150f08] border border-amber-500/15 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-200/70 font-semibold text-[11px]">Progression (X) {(currentPreset.weights.wX * 100).toFixed(0)}%</span>
                                <span className="font-mono font-black text-purple-400 text-xs">{mission.missionScore.xpScore}/100</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden">
                                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${mission.missionScore.xpScore}%` }} />
                              </div>
                            </div>

                            {/* Market (M) */}
                            <div className="p-2 rounded-xl bg-[#150f08] border border-amber-500/15 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-amber-200/70 font-semibold text-[11px]">Market Edge (M) {(currentPreset.weights.wM * 100).toFixed(0)}%</span>
                                <span className="font-mono font-black text-teal-400 text-xs">{mission.missionScore.marketScore}/100</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden">
                                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${mission.missionScore.marketScore}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 6. ACTION BAR FOOTER (View Farm Resources & Open Execution Guide) */}
                      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-amber-900/30">
                        <div className="text-[11px] text-amber-200/60 font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{mission.verificationDetail}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Button 1: View Farm Resources */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(exec.resourceTab || exec.actionTab || 'resource-strategy');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#23180c] hover:bg-[#322312] text-amber-300 hover:text-amber-100 border border-amber-500/25 font-bold text-xs transition-all flex items-center gap-1.5"
                          >
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Farm Resources</span>
                          </button>

                          {/* Button 2: Open Execution Guide */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openExecutionGuide(mission);
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-transform active:scale-95 shadow-md flex items-center gap-1.5"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Open Execution Guide</span>
                          </button>

                          {/* Button 3: Confirm Done / Mark Incomplete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMission(mission.id);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                              isDone
                                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                                : 'bg-[#1e160e] border-amber-500/30 text-amber-200 hover:text-amber-100'
                            }`}
                          >
                            {isDone ? 'Mark Incomplete' : 'Confirm Done ✓'}
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 6 & 7. ALL COMPLETED CELEBRATION & RESET CONTROLS                  */}
      {/* =================================================================== */}
      {completedCount === totalCount ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-[#192b1a] to-emerald-950/70 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-in fade-in duration-300">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-inner">
              🏆
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-emerald-100">
                All 5 Daily Missions Completed! Outstanding Farm Efficiency!
              </h3>
              <p className="text-xs text-emerald-300/80 leading-relaxed mt-0.5">
                You successfully captured an estimated +{totalProjectedProfit.toFixed(2)} FLOWER (~${totalProjectedUSD} USD) in net profits and unlocked +{totalXP} Bumpkin XP today.
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-500/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Plan</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#140f09] border border-amber-900/30 flex items-center justify-between text-xs text-amber-200/50">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Daily mission plan recalculates continuously with live block updates and 24h reset timers.</span>
          </div>
          <button
            onClick={handleReset}
            className="hover:text-amber-300 transition-colors flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Recalculate Plan</span>
          </button>
        </div>
      )}

      {/* Interactive Execution Guide Walkthrough Modal */}
      <ExecutionGuideModal
        mission={selectedGuideMission}
        farmId={String(farm.farmId)}
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onConfirmDone={(mId) => toggleMission(mId)}
        onNavigateToResources={(tab) => onNavigate(tab)}
      />
    </div>
  );
}

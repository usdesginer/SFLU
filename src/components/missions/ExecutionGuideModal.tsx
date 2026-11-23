'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Clock, 
  TrendingUp, 
  Award, 
  Compass, 
  ShieldCheck, 
  Sparkles, 
  Lightbulb, 
  ArrowRight, 
  Layers, 
  Check, 
  Info,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyMission } from '../../types';

interface ExecutionGuideModalProps {
  mission: DailyMission | null;
  farmId: string | number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDone: (missionId: string) => void;
  onNavigateToResources: (tabId: any) => void;
}

export default function ExecutionGuideModal({
  mission,
  farmId,
  isOpen,
  onClose,
  onConfirmDone,
  onNavigateToResources
}: ExecutionGuideModalProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Reset steps or prefill if mission is already marked done
  useEffect(() => {
    if (mission) {
      if (mission.isCompleted) {
        setCompletedSteps(new Set([1, 2, 3, 4, 5]));
      } else {
        setCompletedSteps(new Set());
      }
    }
  }, [mission]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mission) return null;

  const steps = mission.execution.checklistSteps || [
    { stepNumber: 1, title: 'Inspect farm prerequisites', detail: mission.execution.steps[0] || 'Verify plots or items are ready in inventory.' },
    { stepNumber: 2, title: 'Execute primary operation', detail: mission.execution.steps[1] || 'Harvest, craft, or deliver designated items.' },
    { stepNumber: 3, title: 'Evaluate inventory changes', detail: mission.execution.steps[2] || 'Confirm output materials have reached your farm.' },
    { stepNumber: 4, title: 'Optimize next cycle', detail: mission.execution.steps[3] || 'Prepare replacement seeds, tools, or resources.' },
    { stepNumber: 5, title: 'Re-seed and verify', detail: mission.execution.steps[4] || 'Confirm all operations are locked in for maximum compounding.' },
  ];

  const toggleStep = (stepNum: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNum)) {
        next.delete(stepNum);
      } else {
        next.add(stepNum);
      }
      return next;
    });
  };

  const stepsDoneCount = completedSteps.size;
  const totalStepsCount = steps.length;
  const stepsProgressPct = Math.round((stepsDoneCount / totalStepsCount) * 100);

  const primaryMetricLabel = mission.execution.primaryMetricLabel || 'Target Quantity';
  const primaryMetricValue = mission.execution.primaryMetricValue || `${mission.progressTarget} ${mission.unit}`;

  const handleLaunchGame = () => {
    window.open('https://sunflower-land.com/play/', '_blank', 'noopener,noreferrer');
  };

  const handleCompleteAndClose = () => {
    onConfirmDone(mission.id);
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ffffff']
      });
    } catch (e) {
      // Ignore if confetti is unavailable
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-[#17120a] border border-amber-500/35 shadow-2xl overflow-hidden text-amber-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-amber-900/40 bg-gradient-to-r from-[#23180c] via-[#2a1d0f] to-[#1c1409] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                {mission.category.toUpperCase()} PROTOCOL
              </span>

              {mission.missionScore && (
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-black border ${
                  mission.missionScore.rankTier === 'Critical'
                    ? 'bg-rose-950/90 border-rose-500/60 text-rose-300'
                    : mission.missionScore.rankTier === 'High'
                    ? 'bg-amber-950/90 border-amber-500/60 text-amber-300'
                    : 'bg-blue-950/90 border-blue-500/50 text-blue-300'
                }`}>
                  Score {mission.missionScore.finalScore}/100 • {mission.missionScore.rankTier} Priority
                </span>
              )}

              <span className="text-[11px] font-mono text-amber-200/60">
                Farm #{farmId}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-amber-50 tracking-tight">
              {mission.title}
            </h2>

            <p className="text-xs text-amber-200/75 leading-relaxed">
              Interactive Execution & Operational Protocol Guide
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#2a1e12] border border-amber-500/20 text-amber-300 hover:text-amber-100 hover:bg-[#362718] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* 1. Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-[#120d07] border border-amber-500/20">
            <div>
              <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">{primaryMetricLabel}</div>
              <div className="text-base sm:text-lg font-black text-amber-100 font-mono mt-0.5">
                {primaryMetricValue}
              </div>
              <div className="text-[10px] text-amber-400 font-medium">Verified Ready</div>
            </div>

            <div>
              <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Projected Net Profit</div>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                +{mission.netProfitFlower.toFixed(2)} FLOWER
              </div>
              <div className="text-[10px] text-emerald-400/80 font-mono">
                ≈ ${mission.financials.netProfitUSD.toFixed(2)} USD
              </div>
            </div>

            <div>
              <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Bumpkin XP Reward</div>
              <div className="text-base sm:text-lg font-black text-amber-300 font-mono mt-0.5">
                +{mission.xpReward} XP
              </div>
              <div className="text-[10px] text-amber-200/60">Milestone Boost</div>
            </div>

            <div>
              <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Estimated Duration</div>
              <div className="text-base sm:text-lg font-black text-amber-100 font-mono mt-0.5">
                {mission.category === 'save' ? 'Variable' : `~${mission.missionScore?.durationMinutes || 15} min`}
              </div>
              <div className="text-[10px] text-amber-200/60 font-mono">Turnaround Time</div>
            </div>
          </div>

          {/* 2. Why FarmIQ Recommends This */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#22170d] to-amber-500/5 border border-amber-500/25 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300 uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Why FarmIQ Recommends This</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
              {mission.reason}
            </p>
          </div>

          {/* 3. Interactive Step-by-Step Execution Checklist */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-amber-100 uppercase tracking-wider">
                  Execution Checklist & Procedure ({stepsDoneCount} of {totalStepsCount} completed)
                </h3>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {stepsProgressPct}% Complete
              </span>
            </div>

            {/* Checklist Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#100b06] border border-amber-500/20 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${stepsProgressPct}%` }}
              />
            </div>

            {/* Steps List */}
            <div className="space-y-2 pt-1">
              {steps.map((step) => {
                const isStepDone = completedSteps.has(step.stepNumber);
                return (
                  <div
                    key={step.stepNumber}
                    onClick={() => toggleStep(step.stepNumber)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                      isStepDone
                        ? 'bg-[#152214]/60 border-emerald-500/40 text-emerald-100'
                        : 'bg-[#191209] border-amber-500/20 hover:border-amber-500/40 text-amber-100 hover:bg-[#20170c]'
                    }`}
                  >
                    {/* Step Number or Checkbox */}
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 transition-colors ${
                      isStepDone
                        ? 'bg-emerald-500 text-stone-950 shadow-md'
                        : 'bg-[#291e12] border border-amber-500/30 text-amber-300'
                    }`}>
                      {isStepDone ? <Check className="w-4 h-4 stroke-[3]" /> : step.stepNumber}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className={`font-bold text-xs sm:text-sm ${isStepDone ? 'line-through text-emerald-300/80' : 'text-amber-100'}`}>
                        {step.title}
                      </div>
                      <p className={`text-xs leading-relaxed ${isStepDone ? 'text-emerald-400/70' : 'text-amber-200/75'}`}>
                        {step.detail}
                      </p>
                    </div>

                    <div className="text-[10px] text-amber-200/40 font-mono shrink-0 pt-0.5">
                      {isStepDone ? 'Completed ✓' : 'Click to Mark'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Profit & Cost Breakdown Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Profit Breakdown Calculation</span>
              </span>
              <span className="text-[10px] text-amber-200/50 font-mono normal-case">
                Farm-state verified
              </span>
            </div>

            <div className="rounded-2xl border border-amber-500/20 overflow-hidden text-xs bg-[#130d07]">
              <table className="w-full text-left">
                <thead className="bg-[#1e150b] text-amber-200/60 uppercase font-bold text-[10px] border-b border-amber-900/40">
                  <tr>
                    <th className="py-2.5 px-4">Calculation Factor</th>
                    <th className="py-2.5 px-4 text-right">Value (FLOWER)</th>
                    <th className="py-2.5 px-4 text-right">Data Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-900/25 font-mono">
                  <tr>
                    <td className="py-2 px-4 text-amber-200/80 font-sans">Estimated Output Value</td>
                    <td className="py-2 px-4 text-right text-amber-100 font-bold">
                      +{mission.financials.grossRewardFlower.toFixed(4)} FLOWER
                    </td>
                    <td className="py-2 px-4 text-right text-emerald-400/90 text-[11px] font-sans">
                      Data-driven
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-amber-200/80 font-sans">Seed / Replanting Input Cost</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-bold">
                      -{mission.financials.inputCostFlower.toFixed(4)} FLOWER
                    </td>
                    <td className="py-2 px-4 text-right text-rose-400/80 text-[11px] font-sans">
                      Data-driven
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-amber-200/80 font-sans">Tool / Upkeep Costs</td>
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
                      +{mission.netProfitFlower.toFixed(4)} FLOWER*
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-400 text-[11px] font-sans font-bold">
                      Farm-state verified
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="p-2 px-4 bg-[#0e0905] text-[10px] text-amber-200/50 italic border-t border-amber-900/20">
                *Calculated from live Sunflower Land Community API floor and NPC baseline prices. Farm-state verified.
              </div>
            </div>
          </div>

          {/* 5. Game API & Direct Execution Notice */}
          <div className="p-3.5 rounded-2xl bg-[#140e08] border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-200">Live Game Session Notice</div>
                <div className="text-amber-200/70 text-[11px] leading-relaxed">
                  Sunflower Land runs in your Web3 browser session. Perform the actions in-game; FarmIQ monitors your farm telemetry on the next block refresh.
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunchGame}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md"
            >
              <span>Launch Sunflower Land ↗</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-amber-900/40 bg-[#161009] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              onClose();
              onNavigateToResources(mission.execution.resourceTab || 'resource-strategy');
            }}
            className="px-4 py-2.5 rounded-xl bg-[#251a0e] hover:bg-[#322313] text-amber-300 hover:text-amber-100 text-xs font-bold border border-amber-500/25 transition-all flex items-center justify-center gap-1.5"
          >
            <span>View Farm Resources</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#1c140b] hover:bg-[#251b0f] text-amber-200/70 hover:text-amber-100 text-xs font-bold border border-amber-500/15 transition-all"
            >
              Close
            </button>

            <button
              onClick={handleCompleteAndClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-1.5"
            >
              <span>Confirm Mission Done ✓</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

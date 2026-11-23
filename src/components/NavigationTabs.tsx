'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Radar, 
  Crosshair, 
  CheckSquare, 
  Layers, 
  TrendingUp, 
  Cpu, 
  Swords, 
  Settings,
  Sparkles
} from 'lucide-react';

export type TabId = 
  | 'overview' 
  | 'profit-radar' 
  | 'farm-vs-market' 
  | 'daily-missions' 
  | 'resource-strategy' 
  | 'market-watch' 
  | 'ai-advisor'
  | 'simulator' 
  | 'profit-battle' 
  | 'settings';

interface NavigationTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  missionCountRemaining: number;
}

export default function NavigationTabs({ activeTab, onTabChange, missionCountRemaining }: NavigationTabsProps) {
  const tabs = [
    {
      id: 'overview' as TabId,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'profit-radar' as TabId,
      label: 'Profit Radar',
      icon: Radar,
      badge: 'Hot',
    },
    {
      id: 'farm-vs-market' as TabId,
      label: 'Farm vs Market',
      icon: Crosshair,
      badge: 'Personal',
    },
    {
      id: 'daily-missions' as TabId,
      label: 'Daily Missions',
      icon: CheckSquare,
      badge: missionCountRemaining > 0 ? `${missionCountRemaining}` : 'Done',
      badgeColor: missionCountRemaining > 0 ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-emerald-500/20 text-emerald-400',
    },
    {
      id: 'resource-strategy' as TabId,
      label: 'Resource Engine',
      icon: Layers,
      badge: null,
    },
    {
      id: 'market-watch' as TabId,
      label: 'Market Watch',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'ai-advisor' as TabId,
      label: 'AI Advisor',
      icon: Sparkles,
      badge: 'KB + AI',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'simulator' as TabId,
      label: 'Profit Simulator',
      icon: Cpu,
      badge: 'Sandbox',
    },
    {
      id: 'profit-battle' as TabId,
      label: 'Profit Battle',
      icon: Swords,
      badge: 'Benchmark',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'settings' as TabId,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <div className="w-full bg-[#18130c] border-b border-[#312517] sticky top-[61px] z-30">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar text-xs sm:text-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap font-medium transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'text-amber-200/70 hover:text-amber-100 hover:bg-[#251d13]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-stone-950' : 'text-amber-400/80'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      tab.badgeColor || (isActive ? 'bg-stone-900/40 text-stone-100' : 'bg-amber-950/80 border border-amber-500/30 text-amber-300')
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}


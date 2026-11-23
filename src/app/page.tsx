'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import NavigationTabs, { TabId } from '../components/NavigationTabs';
import OverviewView from '../components/views/OverviewView';
import ProfitRadarView from '../components/views/ProfitRadarView';
import FarmVsMarketView from '../components/views/FarmVsMarketView';
import DailyMissionsView from '../components/views/DailyMissionsView';
import ResourceStrategyView from '../components/views/ResourceStrategyView';
import MarketWatchView from '../components/views/MarketWatchView';
import AiAdvisorView from '../components/views/AiAdvisorView';
import SimulatorView from '../components/views/SimulatorView';
import ProfitBattleView from '../components/views/ProfitBattleView';
import SettingsView from '../components/views/SettingsView';

import { FarmState } from '../types';
import { getFarmData, getStoredFarmId, setStoredFarmId, getStoredApiKey, fetchLiveMarketplaceActivity, INITIAL_EMPTY_FARM } from '../lib/farmService';

export default function Home() {
  const [activeFarmId, setActiveFarmId] = useState<string>('5128790942880844');
  const [farmState, setFarmState] = useState<FarmState>(INITIAL_EMPTY_FARM);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [missionCountRemaining, setMissionCountRemaining] = useState<number>(3);
  const [marketplaceData, setMarketplaceData] = useState<any>(null);

  // Load active farm and live market data on initial mount
  useEffect(() => {
    const storedId = getStoredFarmId();
    if (storedId) {
      setActiveFarmId(storedId);
      loadFarm(storedId);
    } else {
      loadFarm('5128790942880844');
    }
    loadMarket();

    // Real-time automatic polling every 30 seconds for live community API updates
    const interval = setInterval(() => {
      const curId = getStoredFarmId() || '5128790942880844';
      getFarmData(curId, getStoredApiKey())
        .then(farm => farm && setFarmState(farm))
        .catch(() => {});
      fetchLiveMarketplaceActivity()
        .then(m => m && setMarketplaceData(m))
        .catch(() => {});
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const loadMarket = async () => {
    try {
      const market = await fetchLiveMarketplaceActivity();
      if (market) setMarketplaceData(market);
    } catch (e) {
      console.error('Failed to load live marketplace data:', e);
    }
  };

  const loadFarm = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const apiKey = getStoredApiKey();
      const farm = await getFarmData(id, apiKey);
      setFarmState(farm);
      setStoredFarmId(id);
    } catch (err) {
      console.error('Failed to load farm:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectFarmId = (id: string) => {
    setActiveFarmId(id);
    loadFarm(id);
  };

  const handleRefresh = () => {
    loadFarm(activeFarmId);
    loadMarket();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0d0a] text-amber-50 selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navigation Bar */}
      <Navbar
        farm={farmState}
        onSelectFarmId={handleSelectFarmId}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        flowerPriceUSD={marketplaceData?.flowerPriceUSD}
      />

      {/* Feature Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        missionCountRemaining={missionCountRemaining}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl animate-spin">
              🌻
            </div>
            <p className="text-xs font-bold text-amber-300 tracking-wider uppercase animate-pulse">
              Crunching Farm Intelligence & Market Spot Rates...
            </p>
          </div>
        ) : (
          <div>
            {activeTab === 'overview' && (
              <OverviewView farm={farmState} onNavigate={setActiveTab} marketplaceData={marketplaceData} />
            )}
            {activeTab === 'profit-radar' && (
              <ProfitRadarView marketplaceData={marketplaceData} />
            )}
            {activeTab === 'farm-vs-market' && (
              <FarmVsMarketView farm={farmState} onNavigate={setActiveTab} marketplaceData={marketplaceData} />
            )}
            {activeTab === 'daily-missions' && (
              <DailyMissionsView 
                farm={farmState} 
                onNavigate={setActiveTab}
                onMissionsUpdated={setMissionCountRemaining}
                marketplaceData={marketplaceData}
              />
            )}
            {activeTab === 'resource-strategy' && (
              <ResourceStrategyView farm={farmState} onNavigate={setActiveTab} marketplaceData={marketplaceData} />
            )}
            {activeTab === 'market-watch' && (
              <MarketWatchView
                marketplaceData={marketplaceData}
                farmId={activeFarmId}
                farm={farmState}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === 'ai-advisor' && (
              <AiAdvisorView
                farm={farmState}
                marketplaceData={marketplaceData}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === 'simulator' && (
              <SimulatorView farm={farmState} onNavigate={setActiveTab} />
            )}
            {activeTab === 'profit-battle' && (
              <ProfitBattleView farm={farmState} onNavigate={setActiveTab} />
            )}
            {activeTab === 'settings' && (
              <SettingsView farm={farmState} onSelectFarmId={handleSelectFarmId} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#261d12] bg-[#141009] py-6 px-4 lg:px-8 text-xs text-amber-200/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌻</span>
            <span className="font-bold text-amber-300">FarmIQ Hub</span>
            <span>— The Personal Profit Intelligence System for Sunflower Land</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => setActiveTab('profit-radar')} className="hover:text-amber-300 transition-colors">
              Daily Radar
            </button>
            <button onClick={() => setActiveTab('simulator')} className="hover:text-amber-300 transition-colors">
              Simulator
            </button>
            <button onClick={() => setActiveTab('profit-battle')} className="hover:text-amber-300 transition-colors">
              Benchmark
            </button>
            <button onClick={() => setActiveTab('settings')} className="hover:text-amber-300 transition-colors">
              Settings & API
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}


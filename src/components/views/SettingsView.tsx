'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Key, 
  Bell, 
  Send, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Info,
  Shield,
  HelpCircle,
  ExternalLink,
  Database,
  UserCheck
} from 'lucide-react';
import { FarmState } from '../../types';
import { getStoredApiKey, setStoredApiKey, setStoredFarmId } from '../../lib/farmService';
import { SFL_TOKEN_PRICE_USD } from '../../data/sflData';
import { isSupabaseConnected } from '../../lib/supabaseClient';

interface SettingsViewProps {
  farm: FarmState;
  onSelectFarmId: (id: string) => void;
}

export default function SettingsView({ farm, onSelectFarmId }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('auto');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramWebhook, setTelegramWebhook] = useState('');
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  useEffect(() => {
    setApiKey(getStoredApiKey());
    setIsSupabaseActive(isSupabaseConnected());
    if (typeof window !== 'undefined') {
      setAiProvider(localStorage.getItem('farmiq_ai_provider') || 'auto');
      setGeminiApiKey(
        localStorage.getItem('farmiq_ai_api_key') ||
          localStorage.getItem('farmiq_gemini_api_key') ||
          ''
      );
      setAiModel(localStorage.getItem('farmiq_ai_model') || '');
      setAiBaseUrl(localStorage.getItem('farmiq_ai_base_url') || '');
      setSupabaseUrl(localStorage.getItem('farmiq_supabase_url') || process.env.NEXT_PUBLIC_SUPABASE_URL || '');
      setSupabaseKey(localStorage.getItem('farmiq_supabase_key') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredApiKey(apiKey.trim());
    if (typeof window !== 'undefined') {
      localStorage.setItem('farmiq_ai_provider', aiProvider);
      if (geminiApiKey.trim()) {
        localStorage.setItem('farmiq_ai_api_key', geminiApiKey.trim());
        if (aiProvider === 'gemini' || geminiApiKey.trim().startsWith('AIza')) {
          localStorage.setItem('farmiq_gemini_api_key', geminiApiKey.trim());
        } else {
          localStorage.removeItem('farmiq_gemini_api_key');
        }
      } else {
        localStorage.removeItem('farmiq_ai_api_key');
        localStorage.removeItem('farmiq_gemini_api_key');
      }
      if (aiModel.trim()) localStorage.setItem('farmiq_ai_model', aiModel.trim());
      else localStorage.removeItem('farmiq_ai_model');
      if (aiBaseUrl.trim()) localStorage.setItem('farmiq_ai_base_url', aiBaseUrl.trim());
      else localStorage.removeItem('farmiq_ai_base_url');
      if (supabaseUrl) localStorage.setItem('farmiq_supabase_url', supabaseUrl.trim());
      if (supabaseKey) localStorage.setItem('farmiq_supabase_key', supabaseKey.trim());
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserNotifications(permission === 'granted');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#241a0e] via-[#2d2012] to-[#1c150c] border border-amber-500/25 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <SettingsIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Configuration & Connectivity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight">
            Settings & Integrations
          </h1>
          <p className="text-xs sm:text-sm text-amber-200/70 leading-relaxed">
            Configure your Farm ID, live API endpoints, price target notifications, and external alerts.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Zero-Auth Farm ID Architecture Banner */}
      <div className="p-6 rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-amber-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Auth Farm ID Identity</span>
          </h2>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
            No Passwords Required
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1d160e] border border-amber-500/15 space-y-2 text-xs text-amber-200/80">
          <p className="leading-relaxed">
            FarmIQ treats your <strong className="text-amber-300">Sunflower Land Farm ID</strong> as your primary public identity key. Anyone can view public farm telemetry on-chain without creating accounts or entering passwords. FarmIQ remembers your Farm ID locally on this device.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-amber-200/60 border-t border-amber-900/30">
            <div>
              <span>Current Active Farm: </span>
              <strong className="text-amber-300">Farm #{farm.farmId}</strong>
            </div>
            {farm.nftId && (
              <div>
                <span>NFT ID: </span>
                <strong className="text-amber-300">#{farm.nftId}</strong>
              </div>
            )}
            <div>
              <span>Owner: </span>
              <strong className="text-amber-300">{farm.ownerName}</strong>
            </div>
            <div>
              <span>Bumpkin Level: </span>
              <strong className="text-emerald-400">Lvl {farm.level}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Persistent Data Hub */}
      <div className="p-6 rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-amber-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <span>Supabase Persistent Data Hub (Keyed by Farm ID)</span>
          </h2>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            isSupabaseActive 
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
              : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
          }`}>
            {isSupabaseActive ? '🟢 Supabase Connected' : '🟡 LocalStorage Dual-Sync'}
          </span>
        </div>

        <p className="text-xs text-amber-200/70 leading-relaxed">
          Supabase is used as FarmIQ's persistent store for <span className="text-amber-300 font-semibold">farm snapshots</span>, <span className="text-amber-300 font-semibold">historical net worth growth</span>, <span className="text-amber-300 font-semibold">saved price alerts</span>, and <span className="text-emerald-400 font-semibold">daily missions</span> — all indexed by Farm ID without requiring login.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#1d160e] border border-amber-500/10 space-y-1">
            <div className="font-bold text-amber-200 flex items-center gap-1.5">
              <span>📈 public.farm_snapshots</span>
            </div>
            <p className="text-[11px] text-amber-200/60">
              Stores hourly valuation checkpoints to power 7-day and 30-day historical net worth growth charts.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1d160e] border border-amber-500/10 space-y-1">
            <div className="font-bold text-amber-200 flex items-center gap-1.5">
              <span>🔔 public.farm_watchlists</span>
            </div>
            <p className="text-[11px] text-amber-200/60">
              Saves custom floor and bid price targets so triggers persist across devices.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1d160e] border border-amber-500/10 space-y-1">
            <div className="font-bold text-amber-200 flex items-center gap-1.5">
              <span>🎯 public.farm_missions</span>
            </div>
            <p className="text-[11px] text-amber-200/60">
              Persists completed daily missions and XP/SFL rewards tally for each date.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1d160e] border border-amber-500/10 space-y-1">
            <div className="font-bold text-amber-200 flex items-center gap-1.5">
              <span>⚙️ public.farm_settings</span>
            </div>
            <p className="text-[11px] text-amber-200/60">
              Remembers Telegram webhook and device alert notifications.
            </p>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-amber-200/60 flex items-center gap-2">
          <span>Schema file generated at:</span>
          <code className="bg-black/50 px-2 py-0.5 rounded text-amber-300 font-mono">supabase/schema.sql</code>
        </div>
      </div>

      {/* API Key & Farm ID Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl space-y-4">
          <h2 className="font-bold text-base text-amber-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Sunflower Land Community API Integration</span>
          </h2>

          <div className="p-4 rounded-2xl bg-[#1f170e] border border-amber-500/20 text-xs text-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Sunflower Land Official API Requirement:</span>
            </div>
            <p className="leading-relaxed">
              Sunflower Land's official community API (<code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">api.sunflower-land.com/community/farms</code>) requires an API key issued to players with VIP and Level 50+. If you have a key, paste it below to sync live. If not, FarmIQ’s built-in intelligent farm emulator provides 100% full functionality for any Farm ID!
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-200/70 mb-1">
              Custom SFL API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="sfl_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#110d08] border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-200/70 mb-1">
              Active Farm ID
            </label>
            <input
              type="text"
              value={farm.farmId}
              onChange={(e) => onSelectFarmId(e.target.value)}
              className="w-full bg-[#110d08] border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-100 focus:outline-none focus:border-amber-400 font-mono"
            />
            <p className="text-[10px] text-amber-200/50 mt-1">
              Currently connected: {farm.ownerName} (Level {farm.level})
            </p>
          </div>

          <div className="pt-2 border-t border-amber-900/30 space-y-2.5">
            <label className="block text-xs font-semibold text-amber-200/70">
              AI Advisor Engine &amp; API Key (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full bg-[#110d08] border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-100 focus:outline-none focus:border-amber-400"
              >
                <option value="auto">Auto Detect Provider</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq (Llama)</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Local Ollama</option>
              </select>
              <input
                type="password"
                placeholder={aiProvider === 'ollama' ? 'Not needed for Ollama' : 'AIza... / sk-... / gsk_...'}
                value={geminiApiKey}
                disabled={aiProvider === 'ollama'}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full bg-[#110d08] border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400 disabled:opacity-40"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Model override (e.g. gemini-3.8-flash, gpt-4o-mini)"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-[#110d08] border border-amber-500/20 p-2 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                placeholder="Custom Base URL (optional, e.g. http://localhost:11434/v1)"
                value={aiBaseUrl}
                onChange={(e) => setAiBaseUrl(e.target.value)}
                className="w-full bg-[#110d08] border border-amber-500/20 p-2 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400"
              />
            </div>
            <p className="text-[10px] text-amber-200/50">
              Supports full multi-turn LLM tool-calling over live FarmIQ SFL backend APIs. Even without an API key, live order-book &amp; recipe tools still run automatically.
            </p>
          </div>
        </div>

        {/* Telegram & Web Push Alerts Configuration */}
        <div className="p-6 rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl space-y-4">
          <h2 className="font-bold text-base text-amber-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Price Movement Alert Channels</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Browser Push */}
            <div className="p-4 rounded-2xl bg-[#1d160e] border border-amber-500/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-100">Browser Web Push</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${browserNotifications ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                  {browserNotifications ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-amber-200/60 text-[11px]">
                Receive instant notifications when watched items hit your buy/sell target.
              </p>
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="w-full py-2 rounded-xl bg-[#291e13] hover:bg-[#342718] border border-amber-500/30 text-amber-200 font-semibold text-xs transition-colors"
              >
                Request Push Permission
              </button>
            </div>

            {/* Telegram Bot */}
            <div className="p-4 rounded-2xl bg-[#1d160e] border border-amber-500/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-100 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Telegram Bot Webhook</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 font-bold">
                  Bot Setup
                </span>
              </div>
              <p className="text-amber-200/60 text-[11px]">
                Deliver high-priority price targets straight to your private Telegram chat.
              </p>
              <input
                type="text"
                placeholder="Telegram Chat ID (e.g. @farm_bot)"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full bg-[#110d08] border border-amber-500/20 p-2 rounded-xl text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Currency & Valuation Reference */}
        <div className="p-6 rounded-3xl bg-[#16120b] border border-amber-500/20 shadow-xl space-y-3">
          <h2 className="font-bold text-base text-amber-100">
            Valuation Reference Pegs
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#1d160e]">
              <div className="text-amber-200/50">SFL Token Price:</div>
              <div className="font-bold text-amber-100 text-sm mt-0.5">${SFL_TOKEN_PRICE_USD} USD</div>
            </div>
            <div className="p-3 rounded-xl bg-[#1d160e]">
              <div className="text-amber-200/50">Coin Rate:</div>
              <div className="font-bold text-amber-100 text-sm mt-0.5">200 Coins = 1 SFL</div>
            </div>
            <div className="p-3 rounded-xl bg-[#1d160e]">
              <div className="text-amber-200/50">Network:</div>
              <div className="font-bold text-emerald-400 text-sm mt-0.5">Polygon POS Mainnet</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold text-sm shadow-md transition-transform active:scale-95"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}


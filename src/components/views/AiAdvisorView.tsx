'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  Bot,
  User,
  Target,
  ChevronRight,
  Coins,
  Cpu,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  PlugZap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { FarmState } from '../../types';
import { VERIFIED_RECIPES, RESOURCE_PROFILES } from '../../data/gameKnowledge';
import { TabId } from '../NavigationTabs';
import TradeableOrderBookModal from '../TradeableOrderBookModal';
import { ITEM_NUMERIC_ID_MAP } from './MarketWatchView';
import { getStoredApiKey } from '../../lib/farmService';
import {
  AiAdvisorResponse,
  AiRecommendationAction,
  buildFarmAiDossier,
  generateInitialDailyBriefing,
} from '../../lib/farmAiAdvisorEngine';

export type AiProviderChoice = 'auto' | 'gemini' | 'openai' | 'groq' | 'openrouter' | 'ollama';

const PROVIDER_META: Record<
  AiProviderChoice,
  { label: string; defaultModel: string; placeholderKey: string; needsKey: boolean }
> = {
  auto: {
    label: 'Auto Detect',
    defaultModel: '',
    placeholderKey: 'Paste Gemini, OpenAI, Groq, or OpenRouter key...',
    needsKey: true,
  },
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-3.8-flash',
    placeholderKey: 'AIza... / AQ... (uses .env.local automatically if blank)',
    needsKey: true,
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    placeholderKey: 'sk-...',
    needsKey: true,
  },
  groq: {
    label: 'Groq (Fast Llama)',
    defaultModel: 'llama-3.3-70b-versatile',
    placeholderKey: 'gsk_...',
    needsKey: true,
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'google/gemini-2.5-flash',
    placeholderKey: 'sk-or-...',
    needsKey: true,
  },
  ollama: {
    label: 'Local Ollama',
    defaultModel: 'llama3.2',
    placeholderKey: 'No key needed (local http://localhost:11434/v1)',
    needsKey: false,
  },
};

interface AiAdvisorViewProps {
  farm: FarmState;
  marketplaceData?: any;
  onNavigate?: (tab: TabId) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: AiAdvisorResponse;
  timestamp: string;
}

function renderInlineBold(line: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="text-amber-200 font-black">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-amber-200/90 font-semibold">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-200 font-mono text-[11px] border border-amber-500/20"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function renderFormattedMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-amber-100/90">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="text-sm sm:text-base font-black text-amber-200 pt-1.5">
              {renderInlineBold(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="text-sm font-black text-amber-300 pt-1">
              {renderInlineBold(trimmed.slice(4))}
            </h4>
          );
        }
        if (/^([-•*]|\d+\.)\s+/.test(trimmed)) {
          const isNumbered = /^\d+\.\s+/.test(trimmed);
          const prefixMatch = trimmed.match(/^(\d+\.)\s+/);
          const content = trimmed.replace(/^([-•*]|\d+\.)\s+/, '');
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-amber-400 font-bold mt-0.5 shrink-0">
                {isNumbered && prefixMatch ? prefixMatch[1] : '•'}
              </span>
              <span>{renderInlineBold(content)}</span>
            </div>
          );
        }
        return <p key={i}>{renderInlineBold(trimmed)}</p>;
      })}
    </div>
  );
}

export default function AiAdvisorView({
  farm,
  marketplaceData,
  onNavigate,
}: AiAdvisorViewProps) {
  const [questionInput, setQuestionInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showProviderDrawer, setShowProviderDrawer] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProviderChoice>('auto');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [providerSavedNotice, setProviderSavedNotice] = useState(false);
  const [serverProviders, setServerProviders] = useState<{
    anyServerProvider: boolean;
    configuredProviders: Record<string, boolean>;
  }>({
    anyServerProvider: false,
    configuredProviders: {},
  });
  const [selectedTradeable, setSelectedTradeable] = useState<{
    id: number;
    name: string;
    icon: string;
    collection?: string;
  } | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider =
        (localStorage.getItem('farmiq_ai_provider') as AiProviderChoice | null) || 'auto';
      const savedKey =
        localStorage.getItem('farmiq_ai_api_key') ||
        localStorage.getItem('farmiq_gemini_api_key') ||
        '';
      const savedModel = localStorage.getItem('farmiq_ai_model') || '';
      const savedBaseUrl = localStorage.getItem('farmiq_ai_base_url') || '';
      setAiProvider(savedProvider);
      setAiApiKey(savedKey);
      setAiModel(savedModel);
      setAiBaseUrl(savedBaseUrl);
    }

    fetch('/api/sfl/ai-advisor')
      .then(r => r.json())
      .then(info => {
        setServerProviders({
          anyServerProvider: Boolean(info?.anyServerProvider || info?.geminiEnvConfigured),
          configuredProviders: info?.configuredProviders || {},
        });
      })
      .catch(() => {
        setServerProviders({ anyServerProvider: false, configuredProviders: {} });
      });
  }, []);

  const saveProviderConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('farmiq_ai_provider', aiProvider);
      localStorage.setItem('farmiq_ai_api_key', aiApiKey.trim());
      if (aiProvider === 'gemini' || aiApiKey.trim().startsWith('AIza')) {
        localStorage.setItem('farmiq_gemini_api_key', aiApiKey.trim());
      }
      localStorage.setItem('farmiq_ai_model', aiModel.trim());
      localStorage.setItem('farmiq_ai_base_url', aiBaseUrl.trim());
    }
    setProviderSavedNotice(true);
    setTimeout(() => setProviderSavedNotice(false), 2500);
  };

  const dossier = useMemo(() => {
    return buildFarmAiDossier(farm, marketplaceData, questionInput);
  }, [farm, marketplaceData, questionInput]);

  const initialBriefing = useMemo(() => {
    return generateInitialDailyBriefing(dossier);
  }, [dossier]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Reset conversation starter cleanly when Farm ID changes
  useEffect(() => {
    setMessages([]);
  }, [farm.farmId]);

  const askAdvisor = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isThinking) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setQuestionInput('');
    setIsThinking(true);

    try {
      const activeKey =
        aiApiKey.trim() ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('farmiq_ai_api_key') ||
            localStorage.getItem('farmiq_gemini_api_key') ||
            ''
          : '');
      const sflApiKey = typeof window !== 'undefined' ? getStoredApiKey() : '';
      const requestDossier = buildFarmAiDossier(farm, marketplaceData, trimmed);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-ai-provider': aiProvider,
      };
      if (activeKey) {
        headers['x-ai-api-key'] = activeKey;
        if (aiProvider === 'gemini' || activeKey.startsWith('AIza')) {
          headers['x-gemini-api-key'] = activeKey;
        }
      }
      if (aiModel.trim()) headers['x-ai-model'] = aiModel.trim();
      if (aiBaseUrl.trim()) headers['x-ai-base-url'] = aiBaseUrl.trim();
      if (sflApiKey) headers['x-api-key'] = sflApiKey;

      const res = await fetch('/api/sfl/ai-advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: trimmed,
          dossier: requestDossier,
          conversationHistory: nextHistory.slice(-10).map(m => ({
            role: m.role,
            text: m.role === 'assistant' ? m.response?.answerMarkdown || m.text : m.text,
          })),
        }),
      });

      const data: AiAdvisorResponse = await res.json();
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.answerMarkdown || data.headline,
        response: data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const fallbackDossier = buildFarmAiDossier(farm, marketplaceData, trimmed);
      const fallback = generateInitialDailyBriefing(fallbackDossier);
      setMessages(prev => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          text: fallback.answerMarkdown,
          response: fallback,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  };

  const actionPillClass = (action: AiRecommendationAction) => {
    switch (action) {
      case 'SELL':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'PROCESS / CRAFT':
      case 'UPGRADE':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'BUY':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
      case 'DELIVER':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      default:
        return 'bg-stone-900 text-stone-300 border-stone-700';
    }
  };

  const openOrderBookForItem = (itemId?: string, itemName?: string, icon: string = '📦') => {
    if (!itemId) return;
    const numericId = ITEM_NUMERIC_ID_MAP[itemId];
    if (!numericId) return;
    setSelectedTradeable({
      id: numericId,
      name: itemName || itemId,
      icon,
      collection: 'collectibles',
    });
  };

  const hasClientLlm = Boolean(aiApiKey.trim()) || aiProvider === 'ollama';
  const isLlmActive = serverProviders.anyServerProvider || hasClientLlm;
  const activeProviderLabel =
    hasClientLlm
      ? `${PROVIDER_META[aiProvider].label}${aiModel.trim() ? ` (${aiModel.trim()})` : ''}`
      : serverProviders.configuredProviders?.gemini
      ? 'Gemini 3.8 Flash (.env.local) + Live Tools Active'
      : serverProviders.anyServerProvider
      ? 'Server LLM + Live Tools Active'
      : 'Live API Tools + KB (No LLM Key Found)';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#24190c] via-[#1c130a] to-[#130e08] border border-amber-500/30 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Personalized Farm & Market AI Copilot</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isLlmActive
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-950/60 text-amber-200 border-amber-500/30'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>{activeProviderLabel}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-amber-50 tracking-tight">
              AI Strategy Copilot for {dossier.farmSummary.ownerName}
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/75 max-w-3xl leading-relaxed">
              Connected to <strong className="text-amber-200">Farm #{dossier.farmSummary.farmId}</strong>{' '}
              telemetry, live backend Order Book &amp; Signal APIs, and verified SFL Knowledge Base rules (
              {VERIFIED_RECIPES.length} recipes / {Object.keys(RESOURCE_PROFILES).length} resources).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setShowProviderDrawer(prev => !prev)}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                showProviderDrawer || !isLlmActive
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50 text-amber-200'
                  : 'bg-[#18120a] hover:bg-[#241b10] border-amber-500/25 text-amber-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>{isLlmActive ? 'AI Model & Key' : '+ Connect AI Model (Gemini / OpenAI / Groq / Ollama)'}</span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('settings')}
                className="px-3 py-2 rounded-2xl bg-[#18120a] hover:bg-[#241b10] border border-amber-500/20 text-xs font-bold text-amber-300/80 flex items-center gap-1.5 transition-colors"
              >
                <span>Settings</span>
                <ExternalLink className="w-3 h-3 text-amber-400" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible In-Chat AI Provider Setup Drawer */}
        {showProviderDrawer && (
          <form
            onSubmit={saveProviderConfig}
            className="p-4 sm:p-5 rounded-2xl bg-[#110c07]/95 border border-amber-500/35 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <PlugZap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-amber-100 uppercase tracking-wider">
                  Conversational AI Engine Configuration
                </span>
              </div>
              {providerSavedNotice && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved! Next chat turn uses this AI engine.
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-amber-200/70 mb-1 uppercase">
                  Provider
                </label>
                <select
                  value={aiProvider}
                  onChange={e => setAiProvider(e.target.value as AiProviderChoice)}
                  className="w-full bg-[#1a130b] border border-amber-500/25 rounded-xl px-3 py-2 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                >
                  {(Object.keys(PROVIDER_META) as AiProviderChoice[]).map(key => (
                    <option key={key} value={key}>
                      {PROVIDER_META[key].label}
                      {serverProviders.configuredProviders?.[key] ? ' (Env Connected)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-200/70 mb-1 uppercase">
                  API Key {aiProvider === 'ollama' ? '(Not Required)' : '(Stored Locally)'}
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  disabled={aiProvider === 'ollama'}
                  placeholder={PROVIDER_META[aiProvider].placeholderKey}
                  className="w-full bg-[#1a130b] border border-amber-500/25 rounded-xl px-3 py-2 text-xs text-amber-100 placeholder-amber-200/35 focus:outline-none focus:border-amber-400 disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-200/70 mb-1 uppercase">
                  Model Override (Optional)
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                  placeholder={PROVIDER_META[aiProvider].defaultModel || 'Auto'}
                  className="w-full bg-[#1a130b] border border-amber-500/25 rounded-xl px-3 py-2 text-xs text-amber-100 placeholder-amber-200/35 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-200/70 mb-1 uppercase">
                  Base URL (Optional / Ollama)
                </label>
                <input
                  type="text"
                  value={aiBaseUrl}
                  onChange={e => setAiBaseUrl(e.target.value)}
                  placeholder={aiProvider === 'ollama' ? 'http://localhost:11434/v1' : 'Default endpoint'}
                  className="w-full bg-[#1a130b] border border-amber-500/25 rounded-xl px-3 py-2 text-xs text-amber-100 placeholder-amber-200/35 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-amber-200/65">
                Supports real function-calling over your live backend SFL APIs: Order Book Signals, Slippage Simulator, Farmer Inventory, and Recipe Craftability.
              </p>
              <button
                type="submit"
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors"
              >
                Save &amp; Connect AI Engine
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Main 2-Column Layout: Left = Briefing & Chat | Right = KB & Farm Telemetry Grounding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Proactive Briefing + Conversational AI */}
        <div className="lg:col-span-2 space-y-6">
          {/* Proactive Daily Farm & Market Direction Briefing */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#16110a] border border-amber-500/25 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm sm:text-base font-black text-amber-100 uppercase tracking-wider">
                  Live Farm & Market Direction Briefing
                </h2>
              </div>
              <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35 self-start sm:self-auto">
                Stance: {initialBriefing.marketStance}
              </span>
            </div>

            {renderFormattedMarkdown(initialBriefing.answerMarkdown)}

            {/* Priority Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {initialBriefing.recommendations.map(rec => {
                const canInspectBook = rec.itemId && ITEM_NUMERIC_ID_MAP[rec.itemId];
                return (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl bg-[#110d08] border border-amber-900/40 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border ${actionPillClass(
                            rec.action
                          )}`}
                        >
                          {rec.action}
                        </span>
                        <span className="text-[10px] text-amber-200/55 font-mono">
                          Confidence: {rec.confidence}
                        </span>
                      </div>
                      <div className="text-xs font-extrabold text-amber-100 flex items-center gap-1.5">
                        {rec.icon && <span>{rec.icon}</span>}
                        <span>{rec.title}</span>
                      </div>
                      <p className="text-[11px] text-amber-200/70 leading-snug">{rec.rationale}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px]">
                      <span className="font-mono font-bold text-amber-300 truncate">
                        {rec.impactEstimate}
                      </span>
                      {canInspectBook && (
                        <button
                          onClick={() => openOrderBookForItem(rec.itemId, rec.itemName, rec.icon)}
                          className="shrink-0 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition-colors"
                        >
                          📖 Order Book
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Farm & Market Copilot Chat */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#16110a] border border-amber-500/25 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black text-amber-100 uppercase tracking-wider">
                  Ask FarmIQ AI Advisor
                </h2>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-[11px] text-amber-300/70 hover:text-amber-200 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset Thread</span>
                </button>
              )}
            </div>

            {/* Dynamic Smart Prompt Chips tailored to this Farm */}
            <div className="flex items-center gap-2 flex-wrap">
              {initialBriefing.followUpPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => askAdvisor(prompt)}
                  disabled={isThinking}
                  className="text-[11px] text-left px-3 py-1.5 rounded-xl bg-[#1f170e] hover:bg-[#2b2013] border border-amber-500/25 text-amber-200 transition-colors disabled:opacity-50"
                >
                  ✨ {prompt}
                </button>
              ))}
            </div>

            {/* Conversation History */}
            {messages.length > 0 && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 pt-2 border-t border-amber-900/30">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl border space-y-2.5 ${
                      msg.role === 'user'
                        ? 'bg-[#21180f] border-amber-500/30 ml-6'
                        : 'bg-[#100c07] border-emerald-500/25 mr-2'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <span className="font-bold flex items-center gap-1.5 text-amber-300">
                        {msg.role === 'user' ? (
                          <>
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>{dossier.farmSummary.ownerName}</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {msg.response?.engineMode && msg.response.engineMode !== 'kb_engine'
                                ? `FarmIQ AI (${msg.response.modelUsed || msg.response.engineMode})`
                                : 'FarmIQ Live Backend Tools + KB Engine'}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="text-amber-200/45">{msg.timestamp}</span>
                    </div>

                    {msg.role === 'user' ? (
                      <p className="text-xs font-semibold text-amber-100">{msg.text}</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Live Backend API Tool Trace Pills */}
                        {msg.response?.toolTrace && msg.response.toolTrace.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pb-1">
                            {msg.response.toolTrace.map((trace, tIdx) => (
                              <div
                                key={`${trace.toolName}-${tIdx}`}
                                title={trace.resultSummary}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono border ${
                                  trace.status === 'ok'
                                    ? 'bg-emerald-950/50 text-emerald-200 border-emerald-500/30'
                                    : 'bg-rose-950/50 text-rose-200 border-rose-500/30'
                                }`}
                              >
                                <PlugZap className="w-3 h-3 shrink-0" />
                                <span className="font-bold">{trace.toolName}</span>
                                <span className="text-amber-200/65 truncate max-w-[240px]">
                                  → {trace.resultSummary}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {renderFormattedMarkdown(msg.response?.answerMarkdown || msg.text)}

                        {msg.response?.requiresLlmKeyNotice && (
                          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-start gap-2 text-amber-200/85">
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <span>
                                Live backend order-book &amp; farm tools ran for this answer. Connect a Gemini, OpenAI, Groq, OpenRouter, or local Ollama key for full open-ended multi-turn LLM reasoning.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowProviderDrawer(true)}
                              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] transition-colors"
                            >
                              Connect AI Engine
                            </button>
                          </div>
                        )}

                        {msg.response?.recommendations && msg.response.recommendations.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {msg.response.recommendations.map(rec => {
                              const canInspectBook = rec.itemId && ITEM_NUMERIC_ID_MAP[rec.itemId];
                              return (
                                <div
                                  key={rec.id}
                                  className="p-3 rounded-xl bg-[#161009] border border-amber-500/20 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-md border ${actionPillClass(
                                        rec.action
                                      )}`}
                                    >
                                      {rec.action}
                                    </span>
                                    {canInspectBook && (
                                      <button
                                        type="button"
                                        onClick={() => openOrderBookForItem(rec.itemId, rec.itemName, rec.icon)}
                                        className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline"
                                      >
                                        Order Book
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-bold text-amber-100">
                                    {rec.icon ? `${rec.icon} ` : ''}{rec.title}
                                  </div>
                                  <div className="text-[10px] text-amber-200/65">{rec.rationale}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {msg.response?.followUpPrompts && msg.response.followUpPrompts.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {msg.response.followUpPrompts.map((fp, fpIdx) => (
                              <button
                                key={fpIdx}
                                type="button"
                                disabled={isThinking}
                                onClick={() => askAdvisor(fp)}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#1d150c] hover:bg-[#2a1f12] border border-amber-500/25 text-amber-200 transition-colors disabled:opacity-50"
                              >
                                ↳ {fp}
                              </button>
                            ))}
                          </div>
                        )}

                        {msg.response?.sourcesUsed && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5">
                            <span className="text-[9px] uppercase font-mono text-amber-200/45">
                              Grounded In:
                            </span>
                            {msg.response.sourcesUsed.map(src => (
                              <span
                                key={src}
                                className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/25"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Question Input Form */}
            <form
              onSubmit={e => {
                e.preventDefault();
                askAdvisor(questionInput);
              }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="text"
                value={questionInput}
                onChange={e => setQuestionInput(e.target.value)}
                placeholder={`Ask about Wood, Egg, Market Direction, or upgrades for ${dossier.farmSummary.ownerName}...`}
                className="flex-1 bg-[#100c07] border border-amber-500/30 rounded-2xl px-4 py-3 text-xs text-amber-100 placeholder-amber-200/40 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!questionInput.trim() || isThinking}
                className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isThinking ? 'Thinking...' : 'Ask AI'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Farm Context & KB Inspector */}
        <div className="space-y-5">
          {/* Top Farm Holdings Grounding */}
          <div className="p-5 rounded-3xl bg-[#16110a] border border-amber-500/20 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Your Top Barn Holdings</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {dossier.portfolio.exposure.totalTradeableValueFlower} F
              </span>
            </div>

            <div className="space-y-2">
              {dossier.portfolio.topHoldings.slice(0, 6).map(h => (
                <div
                  key={h.id}
                  onClick={() => openOrderBookForItem(h.id, h.name, h.icon)}
                  className="p-2.5 rounded-2xl bg-[#110c07] hover:bg-[#1e150c] border border-amber-900/30 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{h.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-amber-100 truncate">
                        {h.owned.toLocaleString()} {h.name}
                      </div>
                      <div className="text-[10px] text-amber-200/55 font-mono">
                        {h.valueFlower} F (${h.valueUSD})
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {h.change24h !== null ? (
                      <span
                        className={`text-[11px] font-mono font-black ${
                          h.change24h > 0
                            ? 'text-emerald-400'
                            : h.change24h < 0
                            ? 'text-rose-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {h.change24h > 0 ? `+${h.change24h}%` : `${h.change24h}%`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-stone-400">Live</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ready Knowledge Base Crafts & Upgrades */}
          <div className="p-5 rounded-3xl bg-[#16110a] border border-amber-500/20 shadow-xl space-y-3">
            <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Knowledge Base Ready Now</span>
            </div>

            {dossier.kbHighlights.readyRecipes.length === 0 ? (
              <p className="text-xs text-amber-200/55">
                Collect additional ingredients to unlock instant KB crafting chains.
              </p>
            ) : (
              <div className="space-y-2">
                {dossier.kbHighlights.readyRecipes.slice(0, 5).map(r => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-2xl bg-[#110c07] border border-emerald-500/20 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-100">{r.name}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        {r.maxCraftable}× Ready
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-200/60">
                      {r.buildingRequired || 'Workbench'} • {r.ingredientsSummary}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-amber-900/30 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/60">
                Top Expansion Milestones
              </div>
              {dossier.kbHighlights.goalReadiness.slice(0, 3).map(g => (
                <div key={g.id} className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-100">
                      {g.icon} {g.title}
                    </span>
                    <span className="font-mono font-bold text-amber-300">{g.readinessPercent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-900 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${g.readinessPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Order Book Modal */}
      {selectedTradeable && (
        <TradeableOrderBookModal
          itemId={selectedTradeable.id}
          itemName={selectedTradeable.name}
          itemIcon={selectedTradeable.icon}
          collection={selectedTradeable.collection}
          onClose={() => setSelectedTradeable(null)}
          flowerPriceUSD={marketplaceData?.flowerPriceUSD || 0.1504}
          farm={farm}
          onNavigate={onNavigate as any}
        />
      )}
    </div>
  );
}


import { NextRequest, NextResponse } from 'next/server';
import {
  AiAdvisorResponse,
  AiAdvisorToolTrace,
  FarmAiDossier,
  generateGroundedAiResponse,
} from '@/lib/farmAiAdvisorEngine';
import {
  AI_TOOL_DEFINITIONS,
  AiToolExecutionContext,
  executeAiBackendTool,
} from '@/lib/aiBackendTools';
import { TRADEABLE_ITEM_IDS, VERIFIED_RECIPES } from '@/data/gameKnowledge';

type AiProviderKind = 'gemini' | 'openai' | 'groq' | 'openrouter' | 'ollama';

interface ResolvedProviderConfig {
  provider: AiProviderKind;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function resolveProviderConfig(request: NextRequest): ResolvedProviderConfig | null {
  const headerProvider = (request.headers.get('x-ai-provider') || 'auto').trim().toLowerCase();
  const headerKey = (
    request.headers.get('x-ai-api-key') ||
    request.headers.get('x-gemini-api-key') ||
    ''
  ).trim();
  const headerModel = (request.headers.get('x-ai-model') || '').trim();
  const headerBaseUrl = (request.headers.get('x-ai-base-url') || '').trim();

  // Explicit client selection takes priority when provided
  if (headerProvider !== 'auto') {
    if (headerProvider === 'ollama') {
      return {
        provider: 'ollama',
        apiKey: headerKey || 'ollama',
        model: headerModel || process.env.OLLAMA_MODEL || 'llama3.2',
        baseUrl: headerBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      };
    }
    if (headerKey) {
      if (headerProvider === 'openai') {
        return {
          provider: 'openai',
          apiKey: headerKey,
          model: headerModel || 'gpt-4o-mini',
          baseUrl: headerBaseUrl || 'https://api.openai.com/v1',
        };
      }
      if (headerProvider === 'groq') {
        return {
          provider: 'groq',
          apiKey: headerKey,
          model: headerModel || 'llama-3.3-70b-versatile',
          baseUrl: headerBaseUrl || 'https://api.groq.com/openai/v1',
        };
      }
      if (headerProvider === 'openrouter') {
        return {
          provider: 'openrouter',
          apiKey: headerKey,
          model: headerModel || 'google/gemini-2.5-flash',
          baseUrl: headerBaseUrl || 'https://openrouter.ai/api/v1',
        };
      }
      return {
        provider: 'gemini',
        apiKey: headerKey,
        model: headerModel || process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      };
    }
  }

  // Fallback / Auto-detection across client key + server environment variables
  if (headerKey) {
    // Infer OpenAI-style sk- / gsk_ vs Gemini key
    if (headerKey.startsWith('gsk_')) {
      return {
        provider: 'groq',
        apiKey: headerKey,
        model: headerModel || 'llama-3.3-70b-versatile',
        baseUrl: 'https://api.groq.com/openai/v1',
      };
    }
    if (headerKey.startsWith('sk-or-')) {
      return {
        provider: 'openrouter',
        apiKey: headerKey,
        model: headerModel || 'google/gemini-2.5-flash',
        baseUrl: 'https://openrouter.ai/api/v1',
      };
    }
    if (headerKey.startsWith('sk-')) {
      return {
        provider: 'openai',
        apiKey: headerKey,
        model: headerModel || 'gpt-4o-mini',
        baseUrl: headerBaseUrl || 'https://api.openai.com/v1',
      };
    }
    return {
      provider: 'gemini',
      apiKey: headerKey,
      model: headerModel || process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
    };
  }

  if (process.env.GEMINI_API_KEY?.trim()) {
    return {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY.trim(),
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
    };
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY.trim(),
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
      baseUrl: process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1',
    };
  }
  if (process.env.GROQ_API_KEY?.trim()) {
    return {
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY.trim(),
      model: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
      baseUrl: 'https://api.groq.com/openai/v1',
    };
  }
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    return {
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY.trim(),
      model: process.env.OPENROUTER_MODEL?.trim() || 'google/gemini-2.5-flash',
      baseUrl: 'https://openrouter.ai/api/v1',
    };
  }
  if (process.env.OLLAMA_BASE_URL?.trim()) {
    return {
      provider: 'ollama',
      apiKey: 'ollama',
      model: process.env.OLLAMA_MODEL?.trim() || 'llama3.2',
      baseUrl: process.env.OLLAMA_BASE_URL.trim(),
    };
  }

  return null;
}

function buildSystemInstruction(dossier: FarmAiDossier): string {
  return [
    `You are FarmIQ AI, an interactive, conversational Sunflower Land (SFL) strategist and live market analyst assisting ${dossier.farmSummary.ownerName} (Farm #${dossier.farmSummary.farmId}, Level ${dossier.farmSummary.level}, Coins: ${dossier.farmSummary.coinsBalance}, FLOWER: ${dossier.farmSummary.sflBalance}).`,
    'YOU HAVE LIVE BACKEND TOOLS YOU SHOULD PROACTIVELY CALL WHEN RELEVANT:',
    '- Always call `get_live_orderbook_and_signals` when the farmer mentions any P2P-tradeable item, asks about buy/sell signals, price zones, slippage for a quantity, order book depth, or multi-timeframe trends.',
    '- Call `get_farmer_profile_and_inventory` if they ask about a different Farm ID or want fresh delivery board / inventory stacks.',
    '- Call `check_sfl_recipes_and_craftability` whenever they ask what they can cook/craft, ingredients needed, Coins cost, or Bumpkin XP ROI.',
    '- Call `get_market_direction_movers` for overall market gainers, losers, active volume, or portfolio exposure.',
    'STRICT GROUNDING & SFL GAME RULES:',
    '1. NEVER invent prices, percentage deltas, recipe ingredients, coin costs, or barn counts. Rely ONLY on the dossier & tool responses.',
    '2. STRICT TRADEABILITY RULE: Cooked foods (Apple Pie, Rhubarb Tart, Sunflower Cake, Cheese, Chowder, etc.), Workbench/Treasure tools (Axe, Pickaxes, Rod, Oil Drill), seeds, flowers, Oil, and Sunstone are NON-TRADEABLE (`isTradeable: false`). Only raw crops, fruits, greenhouse crops/fruits, Wood/Stone/Iron/Gold/Crimstone/Salt, and animal produce (Egg, Milk, Honey, Leather, Wool, Feather) are P2P-tradeable.',
    '3. Cooking/crafting incurs 0 FLOWER time-skip fees; P2P marketplace sales carry a 10% FLOWER tax.',
    '4. If `has24hHistory` is false or `change24h` is null, state honestly that the 24h baseline is still syncing instead of fabricating % movements.',
    '5. Respond naturally and conversationally in Markdown (concise bullets, specific numbers, clear action takeaway tailored to this farmer).',
  ].join('\n');
}

function buildCompactDossierSummary(dossier: FarmAiDossier) {
  return {
    farmSummary: {
      farmId: dossier.farmSummary.farmId,
      ownerName: dossier.farmSummary.ownerName,
      level: dossier.farmSummary.level,
      sflBalance: dossier.farmSummary.sflBalance,
      coinsBalance: dossier.farmSummary.coinsBalance,
      plotsUnlocked: dossier.farmSummary.plotsUnlocked,
      animals: dossier.farmSummary.animals,
      buildings: dossier.farmSummary.buildings,
      liveOrdersCount: dossier.farmSummary.liveOrdersCount,
    },
    portfolioExposure: dossier.portfolio.exposure,
    topHoldings: dossier.portfolio.topHoldings.slice(0, 10),
    has24hHistory: dossier.marketPulse.has24hHistory,
    has7dHistory: dossier.marketPulse.has7dHistory,
    readyRecipesCount: dossier.kbHighlights.readyRecipes.length,
    topGoals: dossier.kbHighlights.goalReadiness.slice(0, 3),
  };
}

function buildDynamicFollowUps(dossier: FarmAiDossier, toolTrace: AiAdvisorToolTrace[]): string[] {
  const topHolding = dossier.portfolio.topHoldings[0];
  const prompts: string[] = [];
  if (toolTrace.some(t => t.toolName === 'get_live_orderbook_and_signals')) {
    prompts.push('What quantity can I trade before slippage exceeds 3%?');
  } else if (topHolding) {
    prompts.push(`Check the live order book & multi-timeframe signal for ${topHolding.name}`);
  }
  prompts.push('Compare what I can cook in Fire Pit, Deli, and Bakery right now');
  prompts.push('Which items in my barn have the best P2P demand vs goal reserves?');
  return prompts.slice(0, 3);
}

/**
 * Runs a multi-turn Gemini tool-calling conversation against live FarmIQ backend tools.
 */
async function runGeminiAgentLoop(
  config: ResolvedProviderConfig,
  question: string,
  history: { role: 'user' | 'assistant'; text: string }[],
  dossier: FarmAiDossier,
  toolCtx: AiToolExecutionContext
): Promise<{ text: string; toolTrace: AiAdvisorToolTrace[]; modelUsed: string } | null> {
  const systemText = buildSystemInstruction(dossier);
  const compactContext = buildCompactDossierSummary(dossier);

  const geminiTools = [
    {
      functionDeclarations: AI_TOOL_DEFINITIONS.map(def => ({
        name: def.name,
        description: def.description,
        parameters: def.parameters,
      })),
    },
  ];

  const candidateModels = Array.from(
    new Set([
      config.model,
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-flash-latest',
    ])
  );
  // Deduplicate live API tool calls across model fallbacks within the same request
  const toolCache = new Map<string, Awaited<ReturnType<typeof executeAiBackendTool>>>();

  for (const activeModel of candidateModels) {
    const contents: any[] = [
      ...history.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: `FARMER & MARKET SNAPSHOT:\n${JSON.stringify(compactContext)}\n\nQUESTION:\n${question}`,
          },
        ],
      },
    ];

    const toolTrace: AiAdvisorToolTrace[] = [];
    let shouldTryNextModel = false;

    for (let hop = 0; hop < 5; hop++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemText }] },
              tools: geminiTools,
              contents,
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 1200,
              },
            }),
          }
        );
        clearTimeout(timer);

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          console.error(`[FarmIQ Gemini Error] model=${activeModel} status=${res.status}`, errBody.slice(0, 300));
          if (res.status === 404 || res.status === 400 || res.status === 503 || res.status === 429) {
            shouldTryNextModel = true;
            break;
          }
          return null;
        }

        const json = await res.json();
        const candidateParts: any[] = json?.candidates?.[0]?.content?.parts || [];
        if (candidateParts.length === 0) break;

        contents.push({ role: 'model', parts: candidateParts });

        const functionCalls = candidateParts.filter(p => p.functionCall);
        if (functionCalls.length === 0) {
          const text = candidateParts
            .map(p => p.text || '')
            .join('\n')
            .trim();
          return text ? { text, toolTrace, modelUsed: activeModel } : null;
        }

        const responseParts: any[] = [];
        for (const part of functionCalls) {
          const fc = part.functionCall;
          const cacheKey = `${fc.name}:${JSON.stringify(fc.args || {})}`;
          let execResult = toolCache.get(cacheKey);
          if (!execResult || execResult.trace.status === 'error') {
            execResult = await executeAiBackendTool(fc.name, fc.args || {}, toolCtx);
            if (execResult.trace.status === 'ok') {
              toolCache.set(cacheKey, execResult);
            }
          }
          toolTrace.push(execResult.trace);
          responseParts.push({
            functionResponse: {
              name: fc.name,
              response: { result: execResult.payload },
            },
          });
        }

        contents.push({ role: 'user', parts: responseParts });
      } catch (err) {
        clearTimeout(timer);
        console.error(`[FarmIQ Gemini Exception] model=${activeModel}`, err);
        shouldTryNextModel = true;
        break;
      }
    }

    if (!shouldTryNextModel) break;
  }

  return null;
}

/**
 * Runs a multi-turn OpenAI-compatible tool-calling conversation (OpenAI, Groq, OpenRouter, Ollama).
 */
async function runOpenAiCompatibleAgentLoop(
  config: ResolvedProviderConfig,
  question: string,
  history: { role: 'user' | 'assistant'; text: string }[],
  dossier: FarmAiDossier,
  toolCtx: AiToolExecutionContext
): Promise<{ text: string; toolTrace: AiAdvisorToolTrace[] } | null> {
  const endpoint = `${(config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
  const systemText = buildSystemInstruction(dossier);
  const compactContext = buildCompactDossierSummary(dossier);

  const openAiTools = AI_TOOL_DEFINITIONS.map(def => ({
    type: 'function',
    function: {
      name: def.name,
      description: def.description,
      parameters: def.parameters,
    },
  }));

  const messages: any[] = [
    { role: 'system', content: systemText },
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.text,
    })),
    {
      role: 'user',
      content: `FARMER & MARKET SNAPSHOT:\n${JSON.stringify(compactContext)}\n\nQUESTION:\n${question}`,
    },
  ];

  const toolTrace: AiAdvisorToolTrace[] = [];

  for (let hop = 0; hop < 4; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && config.apiKey !== 'ollama'
            ? { Authorization: `Bearer ${config.apiKey}` }
            : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          messages,
          tools: openAiTools,
          tool_choice: 'auto',
          temperature: 0.35,
          max_tokens: 1100,
        }),
      });
      clearTimeout(timer);

      if (!res.ok) return null;
      const json = await res.json();
      const msg = json?.choices?.[0]?.message;
      if (!msg) return null;

      messages.push(msg);

      const toolCalls: any[] = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      if (toolCalls.length === 0) {
        const text = typeof msg.content === 'string' ? msg.content.trim() : '';
        return text ? { text, toolTrace } : null;
      }

      for (const tc of toolCalls) {
        const fnName = tc.function?.name || '';
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          parsedArgs = {};
        }
        const execResult = await executeAiBackendTool(fnName, parsedArgs, toolCtx);
        toolTrace.push(execResult.trace);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(execResult.payload),
        });
      }
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fmtFlowerPrice(val: any): string {
  const n = Number(val);
  if (!Number.isFinite(n)) return '0.0000';
  return Number(n.toFixed(4)).toString();
}

/**
 * When no external LLM key is configured, runs live backend tools matched to the user's question
 * (live Order Book API / live Farm API / KB Craftability) instead of returning purely static prose.
 */
async function runNoKeyLiveToolFallback(
  question: string,
  dossier: FarmAiDossier,
  toolCtx: AiToolExecutionContext,
  requiresLlmKeyNotice: boolean = true
): Promise<AiAdvisorResponse> {
  const q = (question || '').toLowerCase();
  const baseResponse = generateGroundedAiResponse(question, dossier);
  const toolTrace: AiAdvisorToolTrace[] = [];

  // Extract optional farm ID mention (e.g. "farm 5128790942880844" or "farm #12345")
  const farmMatch = q.match(/farm\s*#?\s*(\d{3,})/);
  // Extract optional quantity (e.g. "buy 1000 wood" or "sell 250 egg")
  const qtyMatch = q.match(/\b(\d{1,6})\s+[a-z]/);
  const intendedQty = qtyMatch ? parseInt(qtyMatch[1], 10) : 500;

  // Match longest-first with word boundaries so "Crimstone" never collides with "Stone"
  const matchedRecipe = [...VERIFIED_RECIPES]
    .sort((a, b) => b.name.length - a.name.length)
    .find(r => r.isTradeable === false && new RegExp(`\\b${escapeRegex(r.name.toLowerCase())}\\b`).test(q));
  const sortedTradeableKeys = Object.keys(TRADEABLE_ITEM_IDS).sort((a, b) => b.length - a.length);
  const mentionedItemKey = !matchedRecipe
    ? sortedTradeableKeys.find(key => new RegExp(`\\b${escapeRegex(key.toLowerCase())}\\b`).test(q))
    : undefined;

  const extraSections: string[] = [];

  if (farmMatch && farmMatch[1]) {
    const fRes = await executeAiBackendTool('get_farmer_profile_and_inventory', { farmId: farmMatch[1] }, toolCtx);
    toolTrace.push(fRes.trace);
    if (fRes.trace.status === 'ok' && fRes.payload) {
      extraSections.push(
        `- **Live Farm #${farmMatch[1]} Sync:** ${fRes.payload.ownerName || `Farm #${farmMatch[1]}`} • ${fRes.payload.coinsBalance ?? 0} Coins • ${fRes.payload.sflBalance ?? 0} FLOWER • ${(fRes.payload.deliveryOrders || []).length} active delivery order(s).`
      );
    }
  }

  if (mentionedItemKey) {
    const obRes = await executeAiBackendTool(
      'get_live_orderbook_and_signals',
      { itemNameOrId: mentionedItemKey, intendedQuantity: intendedQty },
      toolCtx
    );
    toolTrace.push(obRes.trace);
    const p = obRes.payload;
    if (obRes.trace.status === 'ok' && p?.liveOrderBook) {
      const mtfSummary = (p.multiTimeframe?.intervals || [])
        .map((i: any) => `${i.timeframe}: ${i.signal}`)
        .join(' | ');
      extraSections.push(
        `- **Live Order Book (${p.item} #${p.collectibleId} — ${p.liveOrderBook.asksCount} asks / ${p.liveOrderBook.bidsCount} bids):** Floor **${fmtFlowerPrice(p.liveOrderBook.floorAskFlower)} F**, Best Bid **${fmtFlowerPrice(p.liveOrderBook.bestBidFlower)} F** (${p.liveOrderBook.spreadPercent}% spread).`,
        `- **Weighted Signal & Confidence:** **${p.weightedSignal.state}** (**${p.weightedSignal.score}/100**, Confidence: **${p.weightedSignal.confidence}**) — ${p.weightedSignal.confidenceReason}`,
        `- **Multi-Timeframe Alignment (${p.multiTimeframe.alignment}):** ${mtfSummary}.`,
        `- **Order-Book Execution Simulation (${intendedQty.toLocaleString()} units):** Buy avg fill **${fmtFlowerPrice(p.tradeOpportunitySimulation.buySetup.avgExecutionFlower)} F** (${p.tradeOpportunitySimulation.buySetup.slippagePercent}% slippage, zone ${p.tradeOpportunitySimulation.buySetup.preferredBuyZone}) | Sell avg fill **${fmtFlowerPrice(p.tradeOpportunitySimulation.sellSetup.avgExecutionFlower)} F** (${p.tradeOpportunitySimulation.sellSetup.slippagePercent}% slippage, net ${p.tradeOpportunitySimulation.sellSetup.netProceedsAfter10PctTaxFlower} F after 10% tax).`
      );
    }
  }

  return {
    ...baseResponse,
    answerMarkdown:
      extraSections.length > 0
        ? `${baseResponse.answerMarkdown}\n${extraSections.join('\n')}`
        : baseResponse.answerMarkdown,
    sourcesUsed:
      toolTrace.some(t => t.toolName === 'get_live_orderbook_and_signals' && t.status === 'ok')
        ? [...baseResponse.sourcesUsed, 'Live Order Book API']
        : baseResponse.sourcesUsed,
    toolTrace,
    requiresLlmKeyNotice,
    engineMode: 'kb_engine',
  };
}

export async function GET() {
  const configuredProviders = {
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    groq: Boolean(process.env.GROQ_API_KEY?.trim()),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    ollama: Boolean(process.env.OLLAMA_BASE_URL?.trim()),
  };
  const anyServerProvider = Object.values(configuredProviders).some(Boolean);
  return NextResponse.json({
    geminiEnvConfigured: configuredProviders.gemini,
    configuredProviders,
    anyServerProvider,
    supportedEngine: anyServerProvider ? 'llm+tools' : 'kb_engine+tools',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question: string = typeof body?.question === 'string' ? body.question : '';
    const dossier: FarmAiDossier | undefined = body?.dossier;
    const history: { role: 'user' | 'assistant'; text: string }[] = Array.isArray(body?.conversationHistory)
      ? body.conversationHistory.slice(-8)
      : [];

    if (!dossier || !dossier.farmSummary) {
      return NextResponse.json({ error: 'Missing farm dossier context' }, { status: 400 });
    }

    const sflApiKey =
      request.headers.get('x-api-key') || process.env.SFL_COMMUNITY_API_KEY || '';
    const sflBaseUrl = process.env.SFL_API_BASE_URL || 'https://api.sunflower-land.com';

    const toolCtx: AiToolExecutionContext = {
      dossier,
      sflApiKey,
      sflBaseUrl,
    };

    const providerConfig = resolveProviderConfig(request);
    if (!providerConfig) {
      const noKeyRes = await runNoKeyLiveToolFallback(question, dossier, toolCtx);
      return NextResponse.json({
        ...noKeyRes,
        geminiConfigured: false,
      });
    }

    const llmResult =
      providerConfig.provider === 'gemini'
        ? await runGeminiAgentLoop(providerConfig, question, history, dossier, toolCtx)
        : await runOpenAiCompatibleAgentLoop(providerConfig, question, history, dossier, toolCtx);

    if (!llmResult) {
      const fallbackRes = await runNoKeyLiveToolFallback(question, dossier, toolCtx, false);
      return NextResponse.json({
        ...fallbackRes,
        geminiConfigured: providerConfig.provider === 'gemini',
        _llmFallbackError: true,
      });
    }

    const baseline = generateGroundedAiResponse(question, dossier);
    const firstLine = llmResult.text.split('\n').find(l => l.trim().length > 0)?.replace(/^#+\s*/, '') || baseline.headline;
    const resolvedModel =
      'modelUsed' in llmResult && typeof llmResult.modelUsed === 'string'
        ? llmResult.modelUsed
        : providerConfig.model;

    const sources: AiAdvisorResponse['sourcesUsed'] = [
      'Your Farm Telemetry',
      'Live Market Feeds',
      'SFL Knowledge Base',
      ...(llmResult.toolTrace.some(t => t.toolName === 'get_live_orderbook_and_signals' && t.status === 'ok')
        ? (['Live Order Book API'] as const)
        : []),
      providerConfig.provider === 'gemini' ? 'Gemini LLM Synthesis' : 'OpenAI-Compatible LLM',
    ];

    // Keep only contextual recommendation cards relevant to the question / live tools invoked
    const relevantRecs = baseline.recommendations.filter(rec => {
      const qLow = question.toLowerCase();
      if (rec.itemName && qLow.includes(rec.itemName.toLowerCase())) return true;
      if (llmResult.toolTrace.some(t => rec.itemName && t.argsSummary.toLowerCase().includes(rec.itemName.toLowerCase()))) return true;
      return llmResult.toolTrace.length === 0;
    });

    const finalResponse: AiAdvisorResponse = {
      headline: firstLine.slice(0, 120),
      marketStance: baseline.marketStance,
      answerMarkdown: llmResult.text,
      recommendations: relevantRecs.slice(0, 2),
      sourcesUsed: sources,
      followUpPrompts: buildDynamicFollowUps(dossier, llmResult.toolTrace),
      engineMode: providerConfig.provider,
      modelUsed: resolvedModel,
      toolTrace: llmResult.toolTrace,
      requiresLlmKeyNotice: false,
    };

    return NextResponse.json({
      ...finalResponse,
      geminiConfigured: providerConfig.provider === 'gemini',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to generate AI advisor response' },
      { status: 500 }
    );
  }
}

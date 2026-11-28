/**
 * FarmIQ Smart Market Intelligence & Trading Signal Engine
 * 
 * Provides recursive microeconomic order-book depth analysis, real two-sided cumulative
 * depth visualizations, support & resistance wall detection, buyer/seller aggression metrics,
 * the 6-state Buy/Sell Signal Indicator, 4-quadrant market condition classification,
 * and answers to the five core trading questions:
 * 1. Is demand stronger than supply?
 * 2. Are buyers becoming more aggressive or sellers becoming more aggressive?
 * 3. Is the current price attractive for buying?
 * 4. Is the current price attractive for selling?
 * 5. What price should I target, and what is the risk of entering now?
 */

export interface CumulativeDepthStep {
  price: number;
  // Demand (buyers willing to pay >= price)
  demandQuantity: number;
  demandVolumeFlower: number;
  demandOrdersCount: number;
  // Supply (sellers willing to accept <= price)
  supplyQuantity: number;
  supplyVolumeFlower: number;
  supplyOrdersCount: number;
}

export interface OrderBookWall {
  price: number;
  quantity: number;
  volumeFlower: number;
  ordersCount: number;
  percentOfTotal: number;
}

export type LiquidityZoneType = 
  | 'strong_buy_wall' 
  | 'strong_sell_wall' 
  | 'weak_support' 
  | 'weak_resistance' 
  | 'liquidity_gap';

export interface MarketDepthZone {
  type: LiquidityZoneType;
  label: string;
  price: number;
  endPrice?: number; // for liquidity gap range
  quantity: number;
  cumulativeQuantity: number;
  volumeFlower: number;
  percentOfSide: number;
  description: string;
  side: 'buy' | 'sell' | 'gap';
}

export interface DepthChartPoint {
  price: number;
  priceFormatted: string;
  cumulativeQuantity: number;
  cumulativeVolumeFlower: number;
  stepQuantity: number;
  stepVolumeFlower: number;
  orderCount: number;
  side: 'bid' | 'ask' | 'spread';
}

export interface TwoSidedDepthAnalysis {
  bidPoints: DepthChartPoint[];
  askPoints: DepthChartPoint[];
  allPoints: DepthChartPoint[];
  totalBuySideQuantity: number;
  totalBuySideVolumeFlower: number;
  totalSellSideQuantity: number;
  totalSellSideVolumeFlower: number;
  spreadPriceFlower: number;
  spreadPercent: number;
  minPrice: number;
  maxPrice: number;
  maxCumulativeQuantity: number;
  // Detected Liquidity Zones
  strongBuyWalls: MarketDepthZone[];
  strongSellWalls: MarketDepthZone[];
  weakSupports: MarketDepthZone[];
  weakResistances: MarketDepthZone[];
  liquidityGaps: MarketDepthZone[];
  breakoutZones: string[];
  rejectionZones: string[];
}

export type FourQuadrantCondition = 
  | 'Bullish Pressure 🚀'
  | 'Bearish Pressure 📉'
  | 'Expanding Market ⚡'
  | 'Contracting Market 🧊';

export type SixStateSignal = 
  | 'Strong Buy'
  | 'Buy'
  | 'Neutral'
  | 'Sell'
  | 'Strong Sell'
  | 'Insufficient Data';

export type SignalConfidence = 'High' | 'Medium' | 'Low' | 'N/A';

// ============================================================================
// BUY/SELL PRESSURE OSCILLATOR: MARKET PRESSURE INDEX (MPI) TYPES (FEATURE 6)
// ============================================================================

export type MpiInterpretation = 
  | 'Strong buying pressure'
  | 'Moderate buying pressure'
  | 'Neutral'
  | 'Moderate selling pressure'
  | 'Strong selling pressure';

export type MpiReversalType =
  | 'selling_weakening'       // e.g. -55 to -20: selling pressure weakening
  | 'buying_emerging'         // e.g. -20 to +15: buying pressure emerging (bullish zero crossover)
  | 'buying_strengthening'    // e.g. +55 to +75: buying pressure strengthening
  | 'buying_losing_momentum'  // e.g. +75 to +20: buying pressure losing momentum
  | 'selling_emerging'        // e.g. crossing below zero into negative territory
  | 'selling_strengthening'   // e.g. -25 to -60: selling pressure cascading
  | 'none';

export interface MpiReversalAlert {
  type: MpiReversalType;
  label: string;
  description: string;
  icon: string;
  badge: string;
  textColor: string;
}

export interface MpiPoint {
  timestamp: number;
  timeLabel: string;
  fullDateLabel: string;
  mpi: number; // Integer in range -100 to +100
  rawMpi: number;
  interpretation: MpiInterpretation;
  reversalAlert?: MpiReversalAlert;
  salePrice?: number;
}

export interface MarketPressureIndexSeries {
  points: MpiPoint[];
  currentMpi: number;
  currentInterpretation: MpiInterpretation;
  previousMpi: number;
  deltaMpi: number;
  activeReversal: MpiReversalAlert | null;
  summaryStats: {
    avgMpi: number;
    maxMpi: number;
    minMpi: number;
    bullishPeriodsPercent: number; // % of periods where MPI > 0
    bearishPeriodsPercent: number; // % of periods where MPI < 0
  };
}

// ============================================================================
// FARMIQ TRIPLE CONFIRMATION SYSTEM TYPES (FEATURE 7)
// ============================================================================

export type ConfirmationBias = 'bullish' | 'bearish' | 'neutral' | 'unconfirmed';

export interface ConfirmationPillar {
  id: 'price_direction' | 'supply_demand' | 'transaction_confirmation';
  title: string;
  question: string;
  bias: ConfirmationBias;
  statusLabel: string;
  detail: string;
  metricBadge: string;
}

export interface TripleConfirmationSummary {
  setupLabel:
    | 'Confirmed Buy Setup'
    | 'Partial Buy Setup'
    | 'Confirmed Sell Setup'
    | 'Partial Sell Setup'
    | 'Unconfirmed Imbalance'
    | 'Mixed / Neutral Setup'
    | 'Insufficient Data';
  agreedBullishCount: number; // 0 - 3
  agreedBearishCount: number; // 0 - 3
  confirmedDirection: 'buy' | 'sell' | 'neutral';
  confidenceDowngradeReason: string | null;
  pillars: {
    priceDirection: ConfirmationPillar;
    supplyAndDemand: ConfirmationPillar;
    transactionConfirmation: ConfirmationPillar;
  };
}

export interface SignalScoreComponent {
  id:
    | 'bid_ask_imbalance'
    | 'completed_trade_pressure'
    | 'price_trend_momentum'
    | 'order_book_wall_movement'
    | 'spread_liquidity_quality';
  label: string;
  weightPercent: number;
  normalizedScore: number; // 0 - 100 (bullish > 50, bearish < 50)
  weightedContribution: number; // normalizedScore * (weightPercent / 100)
  directionBias: 'bullish' | 'bearish' | 'neutral';
  metricSummary: string;
}

export interface BuySellSignalIndicator {
  state: SixStateSignal;
  score: number | null; // 0 - 100 or null if Insufficient Data
  tagline: string;
  meaning: string;
  suggestedAction: string;
  buyPressurePercent: number;
  sellPressurePercent: number;
  demandTrend: 'Increasing' | 'Decreasing' | 'Stable';
  supplyTrend: 'Increasing' | 'Decreasing' | 'Stable';
  interpretation: string;
  potentialEntryZone: string; // e.g. "0.0135–0.0138"
  potentialResistance: string; // e.g. "0.0150"
  confidence: SignalConfidence;
  confidenceReason: string;
  scoreComponents: SignalScoreComponent[];
  scoringMethodologyNote: string;
  tripleConfirmation: TripleConfirmationSummary;
  color: {
    badge: string;
    text: string;
    bg: string;
    border: string;
  };
}

export interface SmartTradingSignals {
  // Core metrics
  floorPriceFlower: number;
  floorPriceUSD: number;
  lastSalePriceFlower: number;
  lastSalePriceUSD: number;
  bestBidPriceFlower: number;
  bestBidPriceUSD: number;
  spreadFlower: number;
  spreadPercent: number;

  // Dedicated Buy/Sell Signal Indicator (Requested Feature 4)
  signalIndicator: BuySellSignalIndicator;

  // Real Two-Sided Order Book Depth Feature (Requested Feature 3)
  twoSidedDepth: TwoSidedDepthAnalysis;

  // Supply & Demand Curve Data
  curveSteps: CumulativeDepthStep[];
  equilibriumPriceFlower: number;
  equilibriumPriceUSD: number;
  equilibriumQuantity: number;

  // Question 1: Demand vs Supply
  q1DemandVsSupply: {
    verdict: 'Demand Dominant 🟢' | 'Supply Dominant 🔴' | 'Balanced Order Book ⚖️';
    demandPercent: number; // 0 - 100
    supplyPercent: number; // 0 - 100
    totalBidVolumeFlower: number;
    totalAskVolumeFlower: number;
    totalBidQuantity: number;
    totalAskQuantity: number;
    nearSpreadBidVolumeFlower: number; // within 5% of best bid
    nearSpreadAskVolumeFlower: number; // within 5% of floor ask
    imbalanceRatio: number; // -1 to +1
    summary: string;
    majorBuyWalls: OrderBookWall[];
    majorSellWalls: OrderBookWall[];
  };

  // Question 2: Buyer vs Seller Aggression
  q2Aggression: {
    status: 'Buyers Aggressive 🟢' | 'Sellers Aggressive 🔴' | 'Passive Accumulation 🟡' | 'Neutral Negotiation ⚖️';
    buyerTakerPercent: number; // trades executed at ask
    sellerTakerPercent: number; // trades executed at bid
    recentTradesAnalyzed: number;
    bidClustering: 'Tight & Aggressive' | 'Dispersed / Low-Ball' | 'Moderate';
    askUndercutting: 'Intense Under-cutting' | 'Patient / High Spreads' | 'Normal';
    summary: string;
  };

  // Question 3: Buying Attractiveness
  q3BuyAttractiveness: {
    score: number; // 0 - 100
    rating: 'Highly Attractive 🟢' | 'Fair Value 🟡' | 'Unattractive / Overheated 🔴';
    discountVs7dAvg: number; // % discount relative to 7d avg
    spreadQuality: 'Tight Spread (Low Slippage)' | 'Moderate Spread' | 'Wide Spread (High Friction)';
    summary: string;
    reasons: string[];
  };

  // Question 4: Selling Attractiveness
  q4SellAttractiveness: {
    score: number; // 0 - 100
    rating: 'Highly Favorable 🟢' | 'Moderate Window 🟡' | 'Unfavorable / Soft Bids 🔴';
    premiumVs7dAvg: number; // % premium relative to 7d avg
    liquidityAbsorption: 'Deep (Can absorb large volume)' | 'Moderate' | 'Shallow (Will crash bids)';
    netProceedsPerUnitFlower: number; // after 10% SFL market tax
    netProceedsPerUnitUSD: number;
    summary: string;
    reasons: string[];
  };

  // Question 5: Target Execution & Risk
  q5ExecutionAndRisk: {
    targetBuyPriceFlower: number; // optimal limit bid
    targetBuyPriceUSD: number;
    targetSellPriceFlower: number; // optimal limit ask
    targetSellPriceUSD: number;
    immediateBuyPriceFlower: number; // instant floor
    immediateSellPriceFlower: number; // instant best bid
    riskRating: 'Low Risk 🟢' | 'Moderate Risk 🟡' | 'High Risk 🔴';
    riskScore: number; // 0 (safest) - 100 (riskiest)
    riskFactors: string[];
    recommendedAction: 'FAVORABLE TO BUY' | 'FAVORABLE TO SELL' | 'WAIT / HOLD' | 'ACCUMULATE VIA LIMIT BIDS';
  };

  // Four-Quadrant Condition
  quadrant: {
    condition: FourQuadrantCondition;
    tagline: string;
    explanation: string;
    demandTrend: 'rising' | 'falling' | 'stable';
    supplyTrend: 'rising' | 'falling' | 'stable';
  };

  // Multi-Timeframe Signal Confirmation (Feature 11)
  multiTimeframe: MultiTimeframeAnalysisSummary;
}

export type SignalTimeframe = '1H' | '4H' | '6H' | '12H' | '1D' | '3D' | '7D' | '1M';

export type MultiTimeframeAlignment =
  | 'Aligned Bullish'
  | 'Aligned Bearish'
  | 'Mixed Signals'
  | 'Range-Bound / Neutral'
  | 'Insufficient Data';

export interface TimeframeSignalEntry {
  timeframe: SignalTimeframe;
  horizonLabel: string;
  signal: SixStateSignal;
  score: number | null;
  confidence: SignalConfidence;
  interpretation: string;
  trendPercent: number;
  sampleCount: number;
  sampleUnit: 'trades' | 'days';
}

export interface MultiTimeframeAnalysisSummary {
  alignment: MultiTimeframeAlignment;
  headline: string;
  summary: string;
  recommendation: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  entries: TimeframeSignalEntry[];
}

/**
 * Calculates a genuine Two-Sided Cumulative Order Book Depth model
 * with automatic detection of Buy/Sell Walls, Weak Support/Resistance, and Liquidity Gaps.
 */
export function calculateTwoSidedOrderBookDepth(
  cleanOffers: { unitPrice: number; quantity: number; sfl: number }[],
  cleanListings: { unitPrice: number; quantity: number; sfl: number }[],
  floorPriceFlower: number,
  bestBidPriceFlower: number,
  itemName: string = 'Wood'
): TwoSidedDepthAnalysis {
  const maxAskPriceThreshold = floorPriceFlower > 0 ? floorPriceFlower * 1.5 : 1;
  const minBidPriceThreshold = bestBidPriceFlower > 0 ? bestBidPriceFlower * 0.6 : 0.001;

  const boundedOffers = cleanOffers.filter(o => o.unitPrice >= minBidPriceThreshold);
  const boundedListings = cleanListings.filter(l => l.unitPrice <= maxAskPriceThreshold);

  // Group bids into distinct price levels
  const bidBuckets: { price: number; quantity: number; volumeFlower: number; count: number }[] = [];
  boundedOffers.forEach(o => {
    const existing = bidBuckets.find(b => Math.abs(b.price - o.unitPrice) / b.price < 0.005);
    if (existing) {
      existing.quantity += o.quantity;
      existing.volumeFlower += o.sfl;
      existing.count += 1;
    } else {
      bidBuckets.push({ price: o.unitPrice, quantity: o.quantity, volumeFlower: o.sfl, count: 1 });
    }
  });
  bidBuckets.sort((a, b) => b.price - a.price);

  // Group asks into distinct price levels
  const askBuckets: { price: number; quantity: number; volumeFlower: number; count: number }[] = [];
  boundedListings.forEach(l => {
    const existing = askBuckets.find(b => Math.abs(b.price - l.unitPrice) / b.price < 0.005);
    if (existing) {
      existing.quantity += l.quantity;
      existing.volumeFlower += l.sfl;
      existing.count += 1;
    } else {
      askBuckets.push({ price: l.unitPrice, quantity: l.quantity, volumeFlower: l.sfl, count: 1 });
    }
  });
  askBuckets.sort((a, b) => a.price - b.price);

  // Compute cumulative buy depth
  let runningBidQty = 0;
  let runningBidVol = 0;
  const bidPoints: DepthChartPoint[] = [];

  bidBuckets.forEach(b => {
    runningBidQty += b.quantity;
    runningBidVol += b.volumeFlower;
    bidPoints.push({
      price: Number(b.price.toFixed(4)),
      priceFormatted: b.price < 0.01 ? b.price.toFixed(5) : b.price.toFixed(4),
      cumulativeQuantity: runningBidQty,
      cumulativeVolumeFlower: Number(runningBidVol.toFixed(2)),
      stepQuantity: b.quantity,
      stepVolumeFlower: Number(b.volumeFlower.toFixed(2)),
      orderCount: b.count,
      side: 'bid',
    });
  });

  // Compute cumulative sell depth
  let runningAskQty = 0;
  let runningAskVol = 0;
  const askPoints: DepthChartPoint[] = [];

  askBuckets.forEach(a => {
    runningAskQty += a.quantity;
    runningAskVol += a.volumeFlower;
    askPoints.push({
      price: Number(a.price.toFixed(4)),
      priceFormatted: a.price < 0.01 ? a.price.toFixed(5) : a.price.toFixed(4),
      cumulativeQuantity: runningAskQty,
      cumulativeVolumeFlower: Number(runningAskVol.toFixed(2)),
      stepQuantity: a.quantity,
      stepVolumeFlower: Number(a.volumeFlower.toFixed(2)),
      orderCount: a.count,
      side: 'ask',
    });
  });

  const totalBuySideQuantity = runningBidQty || 1;
  const totalBuySideVolumeFlower = Number(runningBidVol.toFixed(2));
  const totalSellSideQuantity = runningAskQty || 1;
  const totalSellSideVolumeFlower = Number(runningAskVol.toFixed(2));

  const maxCumulativeQuantity = Math.max(totalBuySideQuantity, totalSellSideQuantity, 500);

  const minPrice = bidBuckets.length > 0 ? bidBuckets[bidBuckets.length - 1].price : bestBidPriceFlower * 0.8;
  const maxPrice = askBuckets.length > 0 ? askBuckets[askBuckets.length - 1].price : floorPriceFlower * 1.2;

  const spreadPriceFlower = Math.max(0, Number((floorPriceFlower - bestBidPriceFlower).toFixed(6)));
  const spreadPercent = floorPriceFlower > 0 ? Number(((spreadPriceFlower / floorPriceFlower) * 100).toFixed(2)) : 0;

  // Automatic Detection of Walls, Weak Levels, Gaps
  const strongBuyWalls: MarketDepthZone[] = [];
  const strongSellWalls: MarketDepthZone[] = [];
  const weakSupports: MarketDepthZone[] = [];
  const weakResistances: MarketDepthZone[] = [];
  const liquidityGaps: MarketDepthZone[] = [];
  const breakoutZones: string[] = [];
  const rejectionZones: string[] = [];

  const avgBidStep = totalBuySideQuantity / Math.max(1, bidBuckets.length);
  const avgAskStep = totalSellSideQuantity / Math.max(1, askBuckets.length);

  bidPoints.forEach((bp, idx) => {
    const pctOfSide = (bp.stepQuantity / totalBuySideQuantity) * 100;
    if (pctOfSide >= 18 || (bp.stepQuantity >= avgBidStep * 2.5 && bp.stepQuantity >= 300)) {
      strongBuyWalls.push({
        type: 'strong_buy_wall',
        label: `Strong Buy Wall (${bp.stepQuantity.toLocaleString()} ${itemName})`,
        price: bp.price,
        quantity: bp.stepQuantity,
        cumulativeQuantity: bp.cumulativeQuantity,
        volumeFlower: bp.stepVolumeFlower,
        percentOfSide: Number(pctOfSide.toFixed(1)),
        description: `Major concentration of buying interest at ${bp.priceFormatted} FLOWER. Buyers have placed ${bp.stepQuantity.toLocaleString()} ${itemName} here, forming strong downside support.`,
        side: 'buy',
      });
    } else if (pctOfSide <= 3 && bp.stepQuantity < avgBidStep * 0.4) {
      if (weakSupports.length < 2) {
        weakSupports.push({
          type: 'weak_support',
          label: `Weak Support (${bp.stepQuantity.toLocaleString()} ${itemName})`,
          price: bp.price,
          quantity: bp.stepQuantity,
          cumulativeQuantity: bp.cumulativeQuantity,
          volumeFlower: bp.stepVolumeFlower,
          percentOfSide: Number(pctOfSide.toFixed(1)),
          description: `Thin buy orders at ${bp.priceFormatted} FLOWER (${bp.stepQuantity} units). Susceptible to rapid fill by modest market dumps.`,
          side: 'buy',
        });
      }
    }

    if (idx > 0) {
      const prevPrice = bidPoints[idx - 1].price;
      const gapDiff = prevPrice - bp.price;
      if (gapDiff >= 0.0004 && (gapDiff / prevPrice) >= 0.035) {
        liquidityGaps.push({
          type: 'liquidity_gap',
          label: `Bid Liquidity Gap (${(gapDiff).toFixed(4)} FLOWER)`,
          price: bp.price,
          endPrice: prevPrice,
          quantity: 0,
          cumulativeQuantity: bp.cumulativeQuantity,
          volumeFlower: 0,
          percentOfSide: 0,
          description: `Zero active buy orders between ${bp.priceFormatted} and ${prevPrice.toFixed(4)} FLOWER. Price could slip through this gap instantly.`,
          side: 'gap',
        });
      }
    }
  });

  askPoints.forEach((ap, idx) => {
    const pctOfSide = (ap.stepQuantity / totalSellSideQuantity) * 100;
    if (pctOfSide >= 18 || (ap.stepQuantity >= avgAskStep * 2.5 && ap.stepQuantity >= 300)) {
      strongSellWalls.push({
        type: 'strong_sell_wall',
        label: `Strong Sell Wall (${ap.stepQuantity.toLocaleString()} ${itemName})`,
        price: ap.price,
        quantity: ap.stepQuantity,
        cumulativeQuantity: ap.cumulativeQuantity,
        volumeFlower: ap.stepVolumeFlower,
        percentOfSide: Number(pctOfSide.toFixed(1)),
        description: `Heavy concentration of selling supply at ${ap.priceFormatted} FLOWER (${ap.stepQuantity.toLocaleString()} units). Acts as significant overhead resistance.`,
        side: 'sell',
      });

      rejectionZones.push(`Rejection ceiling near ${ap.priceFormatted} FLOWER (${ap.stepQuantity.toLocaleString()} supply barrier).`);

      const nextAsk = askPoints[idx + 1];
      if (nextAsk && (nextAsk.price - ap.price) >= 0.0003) {
        breakoutZones.push(`Rapid breakout zone above ${ap.priceFormatted} up to ${nextAsk.priceFormatted} FLOWER once sell wall clears.`);
      }
    } else if (pctOfSide <= 3 && ap.stepQuantity < avgAskStep * 0.4) {
      if (weakResistances.length < 2) {
        weakResistances.push({
          type: 'weak_resistance',
          label: `Weak Resistance (${ap.stepQuantity.toLocaleString()} ${itemName})`,
          price: ap.price,
          quantity: ap.stepQuantity,
          cumulativeQuantity: ap.cumulativeQuantity,
          volumeFlower: ap.stepVolumeFlower,
          percentOfSide: Number(pctOfSide.toFixed(1)),
          description: `Light selling supply at ${ap.priceFormatted} FLOWER (${ap.stepQuantity} units). Minor obstacle for buyers.`,
          side: 'sell',
        });
      }
    }

    if (idx > 0) {
      const prevPrice = askPoints[idx - 1].price;
      const gapDiff = ap.price - prevPrice;
      if (gapDiff >= 0.0004 && (gapDiff / prevPrice) >= 0.035) {
        liquidityGaps.push({
          type: 'liquidity_gap',
          label: `Ask Liquidity Gap (${(gapDiff).toFixed(4)} FLOWER)`,
          price: prevPrice,
          endPrice: ap.price,
          quantity: 0,
          cumulativeQuantity: ap.cumulativeQuantity,
          volumeFlower: 0,
          percentOfSide: 0,
          description: `No active seller listings between ${prevPrice.toFixed(4)} and ${ap.priceFormatted} FLOWER. Upward buyer orders will jump this gap immediately.`,
          side: 'gap',
        });
      }
    }
  });

  if (breakoutZones.length === 0 && strongSellWalls[0]) {
    breakoutZones.push(`Breakout trigger above ${strongSellWalls[0].price} FLOWER into lighter upper-book liquidity.`);
  }

  const allPoints: DepthChartPoint[] = [...bidPoints, ...askPoints].sort((a, b) => a.price - b.price);

  return {
    bidPoints,
    askPoints,
    allPoints,
    totalBuySideQuantity,
    totalBuySideVolumeFlower,
    totalSellSideQuantity,
    totalSellSideVolumeFlower,
    spreadPriceFlower,
    spreadPercent,
    minPrice,
    maxPrice,
    maxCumulativeQuantity,
    strongBuyWalls: strongBuyWalls.slice(0, 3),
    strongSellWalls: strongSellWalls.slice(0, 3),
    weakSupports: weakSupports.slice(0, 2),
    weakResistances: weakResistances.slice(0, 2),
    liquidityGaps: liquidityGaps.slice(0, 3),
    breakoutZones,
    rejectionZones,
  };
}

/**
 * Evaluates the FarmIQ Triple Confirmation System:
 * 1. Price Direction (actual completed-sale price trend)
 * 2. Supply & Demand (order-book depth & sell-side resistance)
 * 3. Transaction Confirmation (completed volume & ask/bid execution)
 *
 * Prevents generating Buy/Sell signals from order-book imbalance alone and reduces
 * confidence whenever fewer than all 3 conditions agree.
 */
export function evaluateTripleConfirmation(
  buyPressurePercent: number,
  sellPressurePercent: number,
  demandTrend: 'Increasing' | 'Decreasing' | 'Stable',
  supplyTrend: 'Increasing' | 'Decreasing' | 'Stable',
  nearSpreadBidVolumeFlower: number,
  nearSpreadAskVolumeFlower: number,
  totalBidVolumeFlower: number,
  totalAskVolumeFlower: number,
  buyerTakerPercent: number,
  sellerTakerPercent: number,
  floorPriceFlower: number,
  bestBidPriceFlower: number,
  cleanSales: { id?: any; fulfilledAt: number; quantity: number; sfl: number; unitPrice: number }[],
  dailyHistory: Record<string, any> = {}
): TripleConfirmationSummary {
  // --- PILLAR 1: PRICE DIRECTION (Actual Completed-Sale Trend) ---
  let priceBias: ConfirmationBias = 'unconfirmed';
  let priceStatus = 'No Sale Trend';
  let priceDetail = 'Not enough completed transactions to verify price direction.';
  let priceMetric = `${cleanSales.length} trades`;
  let priceTrendPct = 0;

  if (cleanSales.length >= 4) {
    const half = Math.max(2, Math.floor(cleanSales.length / 2));
    const newer = cleanSales.slice(0, half);
    const older = cleanSales.slice(half);
    const newerQty = newer.reduce((s, t) => s + t.quantity, 0) || 1;
    const olderQty = older.reduce((s, t) => s + t.quantity, 0) || 1;
    const newerVwap = newer.reduce((s, t) => s + t.sfl, 0) / newerQty;
    const olderVwap = older.reduce((s, t) => s + t.sfl, 0) / olderQty;
    priceTrendPct = olderVwap > 0 ? ((newerVwap - olderVwap) / olderVwap) * 100 : 0;

    if (priceTrendPct >= 1.0) {
      priceBias = 'bullish';
      priceStatus = 'Completed Sales Rising';
      priceDetail = `Recent completed-sale VWAP (${newerVwap.toFixed(4)}) is +${priceTrendPct.toFixed(1)}% above earlier trades (${olderVwap.toFixed(4)}).`;
    } else if (priceTrendPct <= -1.0) {
      priceBias = 'bearish';
      priceStatus = 'Completed Sales Falling';
      priceDetail = `Recent completed-sale VWAP (${newerVwap.toFixed(4)}) declined ${priceTrendPct.toFixed(1)}% vs earlier trades (${olderVwap.toFixed(4)}).`;
    } else {
      priceBias = 'neutral';
      priceStatus = 'Completed Sales Flat';
      priceDetail = `Completed-sale prices holding steady (${priceTrendPct >= 0 ? '+' : ''}${priceTrendPct.toFixed(1)}% change across ${cleanSales.length} trades).`;
    }
    priceMetric = `${priceTrendPct >= 0 ? '+' : ''}${priceTrendPct.toFixed(1)}% VWAP`;
  } else if (cleanSales.length >= 2) {
    const newest = cleanSales[0].unitPrice;
    const oldest = cleanSales[cleanSales.length - 1].unitPrice;
    priceTrendPct = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;
    if (priceTrendPct >= 1.2) {
      priceBias = 'bullish';
      priceStatus = 'Completed Sales Rising';
      priceDetail = `Latest settlement (${newest.toFixed(4)}) ticked up +${priceTrendPct.toFixed(1)}% over prior sale.`;
    } else if (priceTrendPct <= -1.2) {
      priceBias = 'bearish';
      priceStatus = 'Completed Sales Falling';
      priceDetail = `Latest settlement (${newest.toFixed(4)}) slipped ${priceTrendPct.toFixed(1)}% below prior sale.`;
    } else {
      priceBias = 'neutral';
      priceStatus = 'Completed Sales Flat';
      priceDetail = `Small trade sample (${cleanSales.length} sales) shows flat settlement prices.`;
    }
    priceMetric = `${priceTrendPct >= 0 ? '+' : ''}${priceTrendPct.toFixed(1)}%`;
  } else {
    const sortedDays = Object.entries(dailyHistory || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => ((Number(d?.high) || 0) + (Number(d?.low) || 0)) / 2)
      .filter(v => v > 0);
    if (sortedDays.length >= 2) {
      const latestDay = sortedDays[sortedDays.length - 1];
      const prevDay = sortedDays[sortedDays.length - 2];
      priceTrendPct = prevDay > 0 ? ((latestDay - prevDay) / prevDay) * 100 : 0;
      if (priceTrendPct >= 1.5) {
        priceBias = 'bullish';
        priceStatus = 'Daily Trend Rising';
        priceDetail = `Daily settlement midpoint up +${priceTrendPct.toFixed(1)}% vs prior session.`;
      } else if (priceTrendPct <= -1.5) {
        priceBias = 'bearish';
        priceStatus = 'Daily Trend Falling';
        priceDetail = `Daily settlement midpoint down ${priceTrendPct.toFixed(1)}% vs prior session.`;
      } else {
        priceBias = 'neutral';
        priceStatus = 'Daily Trend Flat';
        priceDetail = `Daily midpoint range stable (${priceTrendPct >= 0 ? '+' : ''}${priceTrendPct.toFixed(1)}%).`;
      }
      priceMetric = `${priceTrendPct >= 0 ? '+' : ''}${priceTrendPct.toFixed(1)}% 24h`;
    }
  }

  // --- PILLAR 2: SUPPLY AND DEMAND (Order Book Depth & Resistance) ---
  let sdBias: ConfirmationBias = 'neutral';
  let sdStatus = 'Balanced Order Book';
  let sdDetail = `Bid depth (${buyPressurePercent}%) and ask depth (${sellPressurePercent}%) are evenly matched.`;
  const sdMetric = `${buyPressurePercent}% Buy / ${sellPressurePercent}% Sell`;

  const sellResistanceWeakening = supplyTrend === 'Decreasing' || nearSpreadBidVolumeFlower > nearSpreadAskVolumeFlower * 1.15;
  const buySupportWeakening = totalAskVolumeFlower > totalBidVolumeFlower * 1.25 || nearSpreadAskVolumeFlower > nearSpreadBidVolumeFlower * 1.15;

  if (buyPressurePercent >= 56 && demandTrend !== 'Decreasing') {
    sdBias = 'bullish';
    sdStatus = sellResistanceWeakening ? 'Buy Depth Rising • Resistance Weak' : 'Buy-Side Depth Stronger';
    sdDetail = `Buyers control ${buyPressurePercent}% of weighted liquidity (${nearSpreadBidVolumeFlower.toFixed(1)} vs ${nearSpreadAskVolumeFlower.toFixed(1)} FLOWER near spread)${sellResistanceWeakening ? ', and sell-side resistance is thinning' : ''}.`;
  } else if (sellPressurePercent >= 56 && (supplyTrend === 'Increasing' || buySupportWeakening)) {
    sdBias = 'bearish';
    sdStatus = 'Sell-Side Depth Dominant';
    sdDetail = `Sellers supply ${sellPressurePercent}% of weighted depth (${nearSpreadAskVolumeFlower.toFixed(1)} vs ${nearSpreadBidVolumeFlower.toFixed(1)} FLOWER near spread), pressing down on bids.`;
  }

  // --- PILLAR 3: TRANSACTION CONFIRMATION (Completed Volume & Aggression) ---
  const recentSlice = cleanSales.slice(0, 10);
  const recentVolFlower = recentSlice.reduce((s, t) => s + t.sfl, 0);
  let txBias: ConfirmationBias = 'unconfirmed';
  let txStatus = 'No Trade Confirmation';
  let txDetail = `Only ${recentSlice.length} completed transaction(s) recorded. Order-book walls without trades cannot confirm direction.`;
  let txMetric = `${recentSlice.length} trades`;

  if (recentSlice.length >= 3 && recentVolFlower > 0) {
    const midIdx = Math.max(1, Math.floor(recentSlice.length / 2));
    const latestTrades = recentSlice.slice(0, midIdx);
    const earlierTrades = recentSlice.slice(midIdx);

    const calcAskPct = (arr: typeof recentSlice) => {
      if (arr.length === 0) return 50;
      const askHits = arr.filter(t => Math.abs(t.unitPrice - floorPriceFlower) <= Math.abs(t.unitPrice - bestBidPriceFlower)).length;
      return Math.round((askHits / arr.length) * 100);
    };

    const latestAskPct = calcAskPct(latestTrades);
    const earlierAskPct = calcAskPct(earlierTrades);
    const escalatingToAsk = latestAskPct >= 55 && latestAskPct >= earlierAskPct;
    const escalatingToBid = (100 - latestAskPct) >= 55 && (100 - latestAskPct) >= (100 - earlierAskPct);

    if (buyerTakerPercent >= 55 || (buyerTakerPercent >= 50 && escalatingToAsk)) {
      txBias = 'bullish';
      txStatus = escalatingToAsk && latestAskPct > earlierAskPct ? 'Increasingly Near Ask' : 'Confirmed Near Ask';
      txDetail = `${buyerTakerPercent}% of last ${recentSlice.length} trades (${recentVolFlower.toFixed(2)} FLOWER) executed near the ask${latestAskPct > earlierAskPct ? ` (accelerating to ${latestAskPct}% in newest trades)` : ''}.`;
      txMetric = `${buyerTakerPercent}% Ask-Side`;
    } else if (sellerTakerPercent >= 55 || (sellerTakerPercent >= 50 && escalatingToBid)) {
      txBias = 'bearish';
      txStatus = escalatingToBid && latestAskPct < earlierAskPct ? 'Increasingly Near Bid' : 'Confirmed Near Bid';
      txDetail = `${sellerTakerPercent}% of last ${recentSlice.length} trades (${recentVolFlower.toFixed(2)} FLOWER) dumped into buyer bids.`;
      txMetric = `${sellerTakerPercent}% Bid-Side`;
    } else {
      txBias = 'neutral';
      txStatus = 'Mixed Execution';
      txDetail = `${recentSlice.length} completed trades (${recentVolFlower.toFixed(2)} FLOWER) split evenly between bids and asks.`;
      txMetric = `${buyerTakerPercent}% Ask / ${sellerTakerPercent}% Bid`;
    }
  }

  // --- TRIPLE CONFIRMATION AGGREGATION ---
  const biases: ConfirmationBias[] = [priceBias, sdBias, txBias];
  const agreedBullishCount = biases.filter(b => b === 'bullish').length;
  const agreedBearishCount = biases.filter(b => b === 'bearish').length;

  let setupLabel: TripleConfirmationSummary['setupLabel'] = 'Mixed / Neutral Setup';
  let confirmedDirection: 'buy' | 'sell' | 'neutral' = 'neutral';
  let confidenceDowngradeReason: string | null = null;

  if (agreedBullishCount === 3) {
    setupLabel = 'Confirmed Buy Setup';
    confirmedDirection = 'buy';
  } else if (agreedBearishCount === 3) {
    setupLabel = 'Confirmed Sell Setup';
    confirmedDirection = 'sell';
  } else if (agreedBullishCount === 2) {
    setupLabel = 'Partial Buy Setup';
    confirmedDirection = 'buy';
    const missing = [
      priceBias !== 'bullish' ? 'Price Direction' : null,
      sdBias !== 'bullish' ? 'Supply & Demand' : null,
      txBias !== 'bullish' ? 'Transaction Confirmation' : null,
    ].filter(Boolean).join(' & ');
    confidenceDowngradeReason = `Only 2 of 3 conditions agree (missing ${missing}). Strong Buy disabled and confidence reduced.`;
  } else if (agreedBearishCount === 2) {
    setupLabel = 'Partial Sell Setup';
    confirmedDirection = 'sell';
    const missing = [
      priceBias !== 'bearish' ? 'Price Direction' : null,
      sdBias !== 'bearish' ? 'Supply & Demand' : null,
      txBias !== 'bearish' ? 'Transaction Confirmation' : null,
    ].filter(Boolean).join(' & ');
    confidenceDowngradeReason = `Only 2 of 3 conditions agree (missing ${missing}). Strong Sell disabled and confidence reduced.`;
  } else if (agreedBullishCount === 1 && sdBias === 'bullish') {
    setupLabel = 'Unconfirmed Imbalance';
    confirmedDirection = 'neutral';
    confidenceDowngradeReason = 'Order-book buy wall detected without rising sale prices or completed transaction confirmation. Signal withheld at Neutral (Low confidence).';
  } else if (agreedBearishCount === 1 && sdBias === 'bearish') {
    setupLabel = 'Unconfirmed Imbalance';
    confirmedDirection = 'neutral';
    confidenceDowngradeReason = 'Order-book sell wall detected without falling sale prices or seller-taker transactions. Signal withheld at Neutral (Low confidence).';
  } else if (agreedBullishCount === 1 || agreedBearishCount === 1) {
    setupLabel = 'Mixed / Neutral Setup';
    confirmedDirection = 'neutral';
    confidenceDowngradeReason = 'Only 1 of 3 Triple Confirmation conditions leans directional. Waiting for multi-factor agreement.';
  }

  return {
    setupLabel,
    agreedBullishCount,
    agreedBearishCount,
    confirmedDirection,
    confidenceDowngradeReason,
    pillars: {
      priceDirection: {
        id: 'price_direction',
        title: '1. Price Direction',
        question: 'Is the actual completed-sale price trending upward or downward?',
        bias: priceBias,
        statusLabel: priceStatus,
        detail: priceDetail,
        metricBadge: priceMetric,
      },
      supplyAndDemand: {
        id: 'supply_demand',
        title: '2. Supply & Demand',
        question: 'Is buying depth strengthening relative to selling depth?',
        bias: sdBias,
        statusLabel: sdStatus,
        detail: sdDetail,
        metricBadge: sdMetric,
      },
      transactionConfirmation: {
        id: 'transaction_confirmation',
        title: '3. Transaction Confirmation',
        question: 'Are completed transactions confirming the direction?',
        bias: txBias,
        statusLabel: txStatus,
        detail: txDetail,
        metricBadge: txMetric,
      },
    },
  };
}

/**
 * Calculates the dedicated 6-state Buy/Sell Signal Indicator governed by the
 * FarmIQ Triple Confirmation System (Price Direction + Supply/Demand + Transaction Confirmation).
 * States: Strong Buy, Buy, Neutral, Sell, Strong Sell, Insufficient Data
 */
export function calculateBuySellSignalIndicator(
  totalBidVolumeFlower: number,
  totalAskVolumeFlower: number,
  nearSpreadBidVolumeFlower: number,
  nearSpreadAskVolumeFlower: number,
  imbalanceRatio: number,
  buyerTakerPercent: number,
  sellerTakerPercent: number,
  discountVs7dAvg: number,
  spreadPercent: number,
  floorPriceFlower: number,
  bestBidPriceFlower: number,
  twoSidedDepth: TwoSidedDepthAnalysis,
  cleanOffersCount: number,
  cleanListingsCount: number,
  recentSalesCount: number,
  cleanSales: { id?: any; fulfilledAt: number; quantity: number; sfl: number; unitPrice: number }[] = [],
  dailyHistory: Record<string, any> = {}
): BuySellSignalIndicator {
  const totalVol = totalBidVolumeFlower + totalAskVolumeFlower;

  // 1. Sixth Status: Insufficient Data check
  // If the order book is stale, trade sample is too small, or market depth is unreliable, do not manufacture a trading signal!
  if (totalVol < 8 || (cleanOffersCount < 2 && cleanListingsCount < 2) || floorPriceFlower <= 0) {
    const emptyReason = 'Market order book depth or active orders are too sparse to compute a reliable weighted score.';
    return {
      state: 'Insufficient Data',
      score: null,
      tagline: 'Order book depth too sparse to manufacture signal',
      meaning: 'Stale order book, tiny trade sample, or unreliable liquidity.',
      suggestedAction: 'Wait for active order book participation',
      buyPressurePercent: 50,
      sellPressurePercent: 50,
      demandTrend: 'Stable',
      supplyTrend: 'Stable',
      interpretation: 'Order book depth and trading volume are too thin to calculate a statistically verified signal. Avoid market orders and place cautious limit bids.',
      potentialEntryZone: 'N/A (Sparse Liquidity)',
      potentialResistance: 'N/A (Sparse Liquidity)',
      confidence: 'N/A',
      confidenceReason: emptyReason,
      scoreComponents: [],
      scoringMethodologyNote: 'Weighted model requires active bids/asks across both sides of the book.',
      tripleConfirmation: {
        setupLabel: 'Insufficient Data',
        agreedBullishCount: 0,
        agreedBearishCount: 0,
        confirmedDirection: 'neutral',
        confidenceDowngradeReason: 'Market order book depth is insufficient to evaluate the 3 confirmation pillars.',
        pillars: {
          priceDirection: {
            id: 'price_direction',
            title: '1. Price Direction',
            question: 'Is the actual completed-sale price trending upward or downward?',
            bias: 'unconfirmed',
            statusLabel: 'Insufficient Data',
            detail: 'Liquidity too thin to evaluate price trend.',
            metricBadge: 'N/A',
          },
          supplyAndDemand: {
            id: 'supply_demand',
            title: '2. Supply & Demand',
            question: 'Is buying depth strengthening relative to selling depth?',
            bias: 'unconfirmed',
            statusLabel: 'Insufficient Data',
            detail: 'Order book depth is below minimum threshold.',
            metricBadge: 'N/A',
          },
          transactionConfirmation: {
            id: 'transaction_confirmation',
            title: '3. Transaction Confirmation',
            question: 'Are completed transactions confirming the direction?',
            bias: 'unconfirmed',
            statusLabel: 'Insufficient Data',
            detail: 'No reliable transaction volume.',
            metricBadge: 'N/A',
          },
        },
      },
      color: {
        badge: 'bg-stone-900 text-stone-400 border-stone-700',
        text: 'text-stone-300',
        bg: 'from-[#17130f] to-[#120e0a]',
        border: 'border-stone-700/40',
      },
    };
  }

  // 2. Compute Volume-Weighted Buy Pressure vs Sell Pressure
  const nearTotal = nearSpreadBidVolumeFlower + nearSpreadAskVolumeFlower;
  const nearRatio = nearTotal > 0 ? nearSpreadBidVolumeFlower / nearTotal : 0.5;
  const totalRatio = totalVol > 0 ? totalBidVolumeFlower / totalVol : 0.5;

  // 60% weight on tight near-spread liquidity + 40% on total order book
  const blendedRatio = nearRatio * 0.60 + totalRatio * 0.40;
  const buyPressurePercent = Math.min(95, Math.max(5, Math.round(blendedRatio * 100)));
  const sellPressurePercent = 100 - buyPressurePercent;

  // 3. Determine Demand and Supply Trends
  const demandTrend: 'Increasing' | 'Decreasing' | 'Stable' = 
    imbalanceRatio > 0.10 || buyerTakerPercent >= 55 ? 'Increasing' :
    imbalanceRatio < -0.10 || sellerTakerPercent >= 60 ? 'Decreasing' : 'Stable';

  const supplyTrend: 'Increasing' | 'Decreasing' | 'Stable' = 
    totalAskVolumeFlower > totalBidVolumeFlower * 1.4 ? 'Increasing' :
    totalAskVolumeFlower < totalBidVolumeFlower * 0.7 ? 'Decreasing' : 'Stable';

  // 4. Evaluate FarmIQ Triple Confirmation System (Price + Supply/Demand + Volume/Trades)
  const tripleConfirmation = evaluateTripleConfirmation(
    buyPressurePercent,
    sellPressurePercent,
    demandTrend,
    supplyTrend,
    nearSpreadBidVolumeFlower,
    nearSpreadAskVolumeFlower,
    totalBidVolumeFlower,
    totalAskVolumeFlower,
    buyerTakerPercent,
    sellerTakerPercent,
    floorPriceFlower,
    bestBidPriceFlower,
    cleanSales,
    dailyHistory
  );

  // 5. Weighted 0-100 Signal Scoring Engine (Feature 10):
  //    SignalScore = sum(IndicatorScore_i * Weight_i)
  //    Weights: 30% Bid/Ask Imbalance | 25% Completed Trade Pressure |
  //             20% Price Trend & Momentum | 15% Order-Book Wall Movement | 10% Spread & Liquidity Quality
  const clampScore = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

  // 5a. Bid/Ask Volume Imbalance (30%): centered at 50 for 50/50 balance
  const bidAskImbalanceScore = clampScore(50 + (blendedRatio - 0.5) * 115);

  // 5b. Completed Trade Pressure (25%): taker ask vs bid hits + volume acceleration
  let tradePressureScore = 50;
  if (recentSalesCount >= 2) {
    tradePressureScore = clampScore(50 + ((buyerTakerPercent - 50) / 50) * 48);
    if (tripleConfirmation.pillars.transactionConfirmation.statusLabel.includes('Increasingly Near Ask')) {
      tradePressureScore = clampScore(tradePressureScore + 6);
    } else if (tripleConfirmation.pillars.transactionConfirmation.statusLabel.includes('Increasingly Near Bid')) {
      tradePressureScore = clampScore(tradePressureScore - 6);
    }
  }

  // 5c. Price Trend and Momentum (20%): completed sale slope + 7d valuation discount/markup
  let rawSlopePct = 0;
  const priceBadgeMatch = tripleConfirmation.pillars.priceDirection.metricBadge.match(/([+-]?\d+(?:\.\d+)?)%/);
  if (priceBadgeMatch) {
    rawSlopePct = parseFloat(priceBadgeMatch[1]) || 0;
  }
  const discountAdj = Math.max(-10, Math.min(10, discountVs7dAvg * 0.6));
  const priceTrendScore =
    tripleConfirmation.pillars.priceDirection.bias === 'unconfirmed'
      ? clampScore(50 + discountAdj * 1.2)
      : clampScore(50 + rawSlopePct * 7.5 + discountAdj);

  // 5d. Order-Book Wall Movement (15%): net buy-wall vs sell-wall FLOWER volume & trend pressure
  const buyWallVol = twoSidedDepth.strongBuyWalls.reduce((s, w) => s + (w.volumeFlower || 0), 0);
  const sellWallVol = twoSidedDepth.strongSellWalls.reduce((s, w) => s + (w.volumeFlower || 0), 0);
  const totalWallVol = buyWallVol + sellWallVol;
  const wallVolImbalance = totalWallVol > 0 ? (buyWallVol - sellWallVol) / totalWallVol : 0; // -1 to +1
  const nearestBuyWall = twoSidedDepth.strongBuyWalls[0];
  const nearestSellWall = twoSidedDepth.strongSellWalls[0];
  const buyWallCloseBonus =
    nearestBuyWall && bestBidPriceFlower > 0 && nearestBuyWall.price >= bestBidPriceFlower * 0.96 && buyWallVol >= sellWallVol
      ? 8
      : 0;
  const sellWallClosePenalty =
    nearestSellWall && floorPriceFlower > 0 && nearestSellWall.price <= floorPriceFlower * 1.04 && sellWallVol >= buyWallVol
      ? 8
      : 0;
  const wallTrendBias =
    (demandTrend === 'Increasing' ? 8 : demandTrend === 'Decreasing' ? -8 : 0) +
    (supplyTrend === 'Decreasing' ? 6 : supplyTrend === 'Increasing' ? -6 : 0);
  const wallMovementScore = clampScore(
    50 + wallVolImbalance * 34 + buyWallCloseBonus - sellWallClosePenalty + wallTrendBias
  );

  // 5e. Spread and Liquidity Quality (10%): tight spread + deep book aligned with book direction
  const spreadQualityHealth =
    spreadPercent <= 1.5 ? 28 : spreadPercent <= 3 ? 18 : spreadPercent <= 5 ? 6 : spreadPercent <= 8 ? -12 : -26;
  const depthHealth = totalVol >= 60 ? 14 : totalVol >= 25 ? 8 : totalVol >= 15 ? 0 : -12;
  // Normalize directionally so high spread/thin liquidity penalizes conviction and healthy liquidity reinforces prevailing side
  const sideTilt = blendedRatio >= 0.5 ? 1 : -1;
  const spreadLiquidityScore = clampScore(50 + sideTilt * (spreadQualityHealth + depthHealth) * 0.85);

  const buildComponent = (
    id: SignalScoreComponent['id'],
    label: string,
    weightPercent: number,
    normalizedScore: number,
    metricSummary: string
  ): SignalScoreComponent => ({
    id,
    label,
    weightPercent,
    normalizedScore,
    weightedContribution: Number((normalizedScore * (weightPercent / 100)).toFixed(1)),
    directionBias: normalizedScore >= 56 ? 'bullish' : normalizedScore <= 44 ? 'bearish' : 'neutral',
    metricSummary,
  });

  const scoreComponents: SignalScoreComponent[] = [
    buildComponent(
      'bid_ask_imbalance',
      'Bid/Ask volume imbalance',
      30,
      bidAskImbalanceScore,
      `${buyPressurePercent}% buy vs ${sellPressurePercent}% sell depth`
    ),
    buildComponent(
      'completed_trade_pressure',
      'Completed trade pressure',
      25,
      tradePressureScore,
      recentSalesCount >= 2
        ? `${buyerTakerPercent}% ask-side vs ${sellerTakerPercent}% bid-side (${recentSalesCount} trades)`
        : `Only ${recentSalesCount} completed trade(s) — neutral baseline`
    ),
    buildComponent(
      'price_trend_momentum',
      'Price trend and momentum',
      20,
      priceTrendScore,
      tripleConfirmation.pillars.priceDirection.metricBadge !== '0 trades'
        ? `${tripleConfirmation.pillars.priceDirection.statusLabel} (${tripleConfirmation.pillars.priceDirection.metricBadge})`
        : `${discountVs7dAvg >= 0 ? `-${discountVs7dAvg}%` : `+${Math.abs(discountVs7dAvg)}%`} vs 7d baseline`
    ),
    buildComponent(
      'order_book_wall_movement',
      'Order-book wall movement',
      15,
      wallMovementScore,
      `${twoSidedDepth.strongBuyWalls.length} buy wall(s) vs ${twoSidedDepth.strongSellWalls.length} sell wall(s)`
    ),
    buildComponent(
      'spread_liquidity_quality',
      'Spread and liquidity quality',
      10,
      spreadLiquidityScore,
      `${spreadPercent}% spread • ${totalVol.toFixed(1)} FLOWER depth`
    ),
  ];

  const rawWeightedTotal = scoreComponents.reduce(
    (sum, comp) => sum + comp.normalizedScore * (comp.weightPercent / 100),
    0
  );
  const score = clampScore(rawWeightedTotal);

  // 6. Classify Signal State from exact weighted thresholds (independent of Confidence):
  //    80–100: Strong Buy | 65–79: Buy | 45–64: Neutral | 25–44: Sell | 0–24: Strong Sell
  const state: SixStateSignal = classifyScoreToSignal(score);
  let tagline = '';
  let meaning = '';
  let suggestedAction = '';
  let color = {
    badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    text: 'text-amber-300',
    bg: 'from-[#1e150b] to-[#140e08]',
    border: 'border-amber-500/40',
  };

  if (state === 'Strong Buy') {
    tagline = 'Strong bullish weighted score (80–100)';
    meaning = 'Strong demand, improving transactions and favorable price';
    suggestedAction = 'Consider buying';
    color = {
      badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50',
      text: 'text-emerald-400',
      bg: 'from-[#0e1f14] via-[#122418] to-[#0a140d]',
      border: 'border-emerald-500/50',
    };
  } else if (state === 'Buy') {
    tagline = 'Bullish weighted score (65–79)';
    meaning = 'Demand is gaining strength';
    suggestedAction = 'Watch entry opportunities';
    color = {
      badge: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
      text: 'text-emerald-300',
      bg: 'from-[#121c13] to-[#0b120c]',
      border: 'border-emerald-500/35',
    };
  } else if (state === 'Neutral') {
    tagline = 'Neutral weighted score (45–64)';
    meaning = 'No convincing directional advantage';
    suggestedAction = 'Wait';
    color = {
      badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      text: 'text-amber-300',
      bg: 'from-[#1e150b] to-[#140e08]',
      border: 'border-amber-500/40',
    };
  } else if (state === 'Sell') {
    tagline = 'Bearish weighted score (25–44)';
    meaning = 'Supply is strengthening and selling pressure increasing';
    suggestedAction = 'Consider selling';
    color = {
      badge: 'bg-rose-950/70 text-rose-300 border-rose-500/40',
      text: 'text-rose-300',
      bg: 'from-[#1e1013] to-[#12080a]',
      border: 'border-rose-500/35',
    };
  } else {
    tagline = 'Strong bearish weighted score (0–24)';
    meaning = 'Strong supply dominance and weakening transactions';
    suggestedAction = 'Consider reducing exposure';
    color = {
      badge: 'bg-rose-950/90 text-rose-300 border-rose-500/50',
      text: 'text-rose-400',
      bg: 'from-[#230d12] via-[#2a0e16] to-[#14080b]',
      border: 'border-rose-500/50',
    };
  }

  // 7. Separate Confidence Evaluation (prevents displaying false certainty):
  //    e.g. Signal: Strong Buy + Confidence: Low when completed transactions are insufficient
  const { agreedBullishCount, agreedBearishCount } = tripleConfirmation;
  let confidence: SignalConfidence = 'Medium';
  let confidenceReason = '';

  if (state === 'Strong Buy' || state === 'Buy') {
    if (recentSalesCount < 3 || tripleConfirmation.pillars.transactionConfirmation.bias === 'unconfirmed') {
      confidence = 'Low';
      confidenceReason =
        'Order-book imbalance is strong, but there are insufficient completed transactions to confirm demand.';
    } else if (agreedBullishCount < 3) {
      confidence =
        tripleConfirmation.pillars.transactionConfirmation.bias === 'bullish' && recentSalesCount >= 3
          ? 'Medium'
          : 'Low';
      confidenceReason =
        tripleConfirmation.confidenceDowngradeReason ||
        'Directional buy score is not yet confirmed across all 3 Triple Confirmation pillars.';
    } else if (totalVol < 25 || spreadPercent > 6) {
      confidence = 'Medium';
      confidenceReason =
        'All 3 confirmation pillars align bullish, though moderate liquidity or wider spread tempers certainty.';
    } else {
      confidence = 'High';
      confidenceReason =
        'Weighted score, completed-sale price direction, order-book depth, and ask-side settlements all confirm.';
    }
  } else if (state === 'Strong Sell' || state === 'Sell') {
    if (recentSalesCount < 3 || tripleConfirmation.pillars.transactionConfirmation.bias === 'unconfirmed') {
      confidence = 'Low';
      confidenceReason =
        'Sell-side pressure dominates the order book, but there are insufficient completed transactions to confirm distribution.';
    } else if (agreedBearishCount < 3) {
      confidence =
        tripleConfirmation.pillars.transactionConfirmation.bias === 'bearish' && recentSalesCount >= 3
          ? 'Medium'
          : 'Low';
      confidenceReason =
        tripleConfirmation.confidenceDowngradeReason ||
        'Directional sell score is not yet confirmed across all 3 Triple Confirmation pillars.';
    } else if (totalVol < 25 || spreadPercent > 6) {
      confidence = 'Medium';
      confidenceReason =
        'All 3 bearish pillars agree, though moderate book liquidity or spread friction lowers certainty.';
    } else {
      confidence = 'High';
      confidenceReason =
        'Weighted score, declining sales, heavy ask supply, and bid-side settlements all confirm selling pressure.';
    }
  } else {
    // Neutral (45-64)
    if (recentSalesCount < 3 || totalVol < 15) {
      confidence = 'Low';
      confidenceReason =
        'Small completed-trade sample or thin liquidity limits certainty around equilibrium.';
    } else if (spreadPercent >= 8) {
      confidence = 'Low';
      confidenceReason = `Wide bid-ask spread (${spreadPercent}%) blurs conviction between buyer and seller zones.`;
    } else {
      confidence = 'Medium';
      confidenceReason =
        'Order-book depth, recent trades, and price momentum remain balanced with no decisive edge.';
    }
  }

  // 8. Potential Entry Zone & Resistance
  let potentialEntryZone = '';
  if (twoSidedDepth.strongBuyWalls[0]) {
    const lowW = Math.min(twoSidedDepth.strongBuyWalls[0].price, bestBidPriceFlower);
    const highW = Math.max(twoSidedDepth.strongBuyWalls[0].price, bestBidPriceFlower);
    potentialEntryZone = `${lowW.toFixed(4)}–${highW.toFixed(4)}`;
  } else {
    potentialEntryZone = `${(bestBidPriceFlower * 0.99).toFixed(4)}–${bestBidPriceFlower.toFixed(4)}`;
  }

  let potentialResistance = '';
  if (twoSidedDepth.strongSellWalls[0]) {
    potentialResistance = `${twoSidedDepth.strongSellWalls[0].price.toFixed(4)}`;
  } else {
    potentialResistance = `${(floorPriceFlower * 1.05).toFixed(4)}`;
  }

  // 9. FarmIQ Interpretation (Synthesizing Weighted Score + Confidence Separation)
  const interpretation = `Weighted Signal Score is ${score}/100 (${state}) with ${confidence} Confidence. ${confidenceReason} Monitor ${potentialEntryZone} FLOWER support against ${potentialResistance} FLOWER resistance.`;

  return {
    state,
    score,
    tagline,
    meaning,
    suggestedAction,
    buyPressurePercent,
    sellPressurePercent,
    demandTrend,
    supplyTrend,
    interpretation,
    potentialEntryZone,
    potentialResistance,
    confidence,
    confidenceReason,
    scoreComponents,
    scoringMethodologyNote:
      'Thresholds (80+ Strong Buy, 65–79 Buy, 45–64 Neutral, 25–44 Sell, 0–24 Strong Sell) are initial hypotheses calibrated for live telemetry and subject to historical backtesting.',
    tripleConfirmation,
    color,
  };
}

/**
 * Builds full Smart Market Intelligence from live order book and trade history
 */
export function calculateSmartMarketSignals(
  listings: any[] = [],
  offers: any[] = [],
  sales: any[] = [],
  dailyHistory: Record<string, any> = {},
  flowerPriceUSD: number = 0.1504,
  floorOverride?: number,
  lastSaleOverride?: number,
  bestBidOverride?: number
): SmartTradingSignals {
  // 1. Clean and parse listings (Asks)
  const cleanListings = listings
    .map(l => ({
      id: l.id,
      quantity: Number(l.quantity) || 0,
      sfl: Number(l.sfl) || 0,
      unitPrice: Number(l.unitPriceSFL) || (l.quantity ? Number(l.sfl) / Number(l.quantity) : 0),
    }))
    .filter(l => l.quantity > 0 && l.unitPrice > 0)
    .sort((a, b) => a.unitPrice - b.unitPrice);

  // 2. Clean and parse offers (Bids)
  const cleanOffers = offers
    .map(o => ({
      id: o.tradeId || o.id,
      quantity: Number(o.quantity) || 0,
      sfl: Number(o.sfl) || 0,
      unitPrice: Number(o.unitPriceSFL) || (o.quantity ? Number(o.sfl) / Number(o.quantity) : 0),
    }))
    .filter(o => o.quantity > 0 && o.unitPrice > 0)
    .sort((a, b) => b.unitPrice - a.unitPrice);

  // 3. Clean and parse sales
  const cleanSales = sales
    .map(s => {
      const qty = Number(s.quantity) || 1;
      const sfl = Number(s.sfl) || 0;
      return {
        id: s.id,
        fulfilledAt: Number(s.fulfilledAt) || 0,
        quantity: qty,
        sfl,
        unitPrice: sfl / qty,
      };
    })
    .filter(s => s.unitPrice > 0)
    .sort((a, b) => b.fulfilledAt - a.fulfilledAt);

  // 4. Base prices
  const floorPriceFlower = floorOverride || cleanListings[0]?.unitPrice || 0.01;
  const bestBidPriceFlower = bestBidOverride || cleanOffers[0]?.unitPrice || floorPriceFlower * 0.95;
  const lastSalePriceFlower = lastSaleOverride || cleanSales[0]?.unitPrice || floorPriceFlower;

  const floorPriceUSD = Number((floorPriceFlower * flowerPriceUSD).toFixed(4));
  const bestBidPriceUSD = Number((bestBidPriceFlower * flowerPriceUSD).toFixed(4));
  const lastSalePriceUSD = Number((lastSalePriceFlower * flowerPriceUSD).toFixed(4));

  const spreadFlower = Math.max(0, Number((floorPriceFlower - bestBidPriceFlower).toFixed(6)));
  const spreadPercent = floorPriceFlower > 0 
    ? Number(((spreadFlower / floorPriceFlower) * 100).toFixed(2)) 
    : 0;

  // 5. Build Two-Sided Order Book Depth Model
  const twoSidedDepth = calculateTwoSidedOrderBookDepth(
    cleanOffers,
    cleanListings,
    floorPriceFlower,
    bestBidPriceFlower,
    'Wood'
  );

  // 6. Compute Order Book Totals & Near-Spread Volumes
  const totalBidVolumeFlower = Number(cleanOffers.reduce((sum, o) => sum + o.sfl, 0).toFixed(4));
  const totalAskVolumeFlower = Number(cleanListings.reduce((sum, l) => sum + l.sfl, 0).toFixed(4));
  const totalBidQuantity = cleanOffers.reduce((sum, o) => sum + o.quantity, 0);
  const totalAskQuantity = cleanListings.reduce((sum, l) => sum + l.quantity, 0);

  const totalVol = totalBidVolumeFlower + totalAskVolumeFlower;
  const demandPercent = totalVol > 0 ? Math.round((totalBidVolumeFlower / totalVol) * 100) : 50;
  const supplyPercent = 100 - demandPercent;

  // Near-spread depth (within 5% of best bid / floor ask)
  const nearBidThreshold = bestBidPriceFlower * 0.95;
  const nearAskThreshold = floorPriceFlower * 1.05;

  const nearSpreadBidVolumeFlower = Number(
    cleanOffers
      .filter(o => o.unitPrice >= nearBidThreshold)
      .reduce((sum, o) => sum + o.sfl, 0)
      .toFixed(4)
  );

  const nearSpreadAskVolumeFlower = Number(
    cleanListings
      .filter(l => l.unitPrice <= nearAskThreshold)
      .reduce((sum, l) => sum + l.sfl, 0)
      .toFixed(4)
  );

  const imbalanceRatio = totalVol > 0 
    ? Number(((totalBidVolumeFlower - totalAskVolumeFlower) / totalVol).toFixed(3)) 
    : 0;

  // 7. Recent Sales Taker Analysis
  const recentSalesSlice = cleanSales.slice(0, 10);
  let buyerTakerCount = 0;
  let sellerTakerCount = 0;

  recentSalesSlice.forEach(s => {
    const distToAsk = Math.abs(s.unitPrice - floorPriceFlower);
    const distToBid = Math.abs(s.unitPrice - bestBidPriceFlower);
    if (distToAsk <= distToBid) {
      buyerTakerCount++;
    } else {
      sellerTakerCount++;
    }
  });

  const totalRecent = buyerTakerCount + sellerTakerCount || 1;
  const buyerTakerPercent = Math.round((buyerTakerCount / totalRecent) * 100);
  const sellerTakerPercent = 100 - buyerTakerPercent;

  // 8. 7-Day Average Price
  const dailyDates = Object.values(dailyHistory);
  let avg7dPrice = floorPriceFlower;
  if (dailyDates.length > 0) {
    const totalV = dailyDates.reduce((sum: number, d: any) => sum + (Number(d.volume) || 0), 0);
    const totalS = dailyDates.reduce((sum: number, d: any) => sum + (Number(d.sales) || 0), 0);
    if (totalV > 0 && totalS > 0) {
      avg7dPrice = totalV / (dailyDates.reduce((sum: number, d: any) => sum + (Number(d.volume) / (Number(d.high || floorPriceFlower))), 0) || 1);
    }
  }

  const discountVs7dAvg = avg7dPrice > 0 
    ? Number((((avg7dPrice - floorPriceFlower) / avg7dPrice) * 100).toFixed(1)) 
    : 0;

  // 9. Calculate the Dedicated 6-State Buy/Sell Signal Indicator (Governed by Triple Confirmation System)
  const signalIndicator = calculateBuySellSignalIndicator(
    totalBidVolumeFlower,
    totalAskVolumeFlower,
    nearSpreadBidVolumeFlower,
    nearSpreadAskVolumeFlower,
    imbalanceRatio,
    buyerTakerPercent,
    sellerTakerPercent,
    discountVs7dAvg,
    spreadPercent,
    floorPriceFlower,
    bestBidPriceFlower,
    twoSidedDepth,
    cleanOffers.length,
    cleanListings.length,
    recentSalesSlice.length,
    cleanSales,
    dailyHistory
  );

  // 10. Legacy Walls Compatibility
  const findWalls = (orders: { unitPrice: number; quantity: number; sfl: number }[], totalSideVol: number): OrderBookWall[] => {
    if (orders.length === 0 || totalSideVol <= 0) return [];
    const buckets: { price: number; quantity: number; volumeFlower: number; count: number }[] = [];
    orders.forEach(o => {
      const match = buckets.find(b => Math.abs(b.price - o.unitPrice) / b.price < 0.015);
      if (match) {
        match.quantity += o.quantity;
        match.volumeFlower += o.sfl;
        match.count += 1;
      } else {
        buckets.push({ price: o.unitPrice, quantity: o.quantity, volumeFlower: o.sfl, count: 1 });
      }
    });

    return buckets
      .map(b => ({
        price: Number(b.price.toFixed(4)),
        quantity: b.quantity,
        volumeFlower: Number(b.volumeFlower.toFixed(2)),
        ordersCount: b.count,
        percentOfTotal: Number(((b.volumeFlower / totalSideVol) * 100).toFixed(1)),
      }))
      .filter(w => w.percentOfTotal >= 8 || w.volumeFlower >= 20)
      .sort((a, b) => b.volumeFlower - a.volumeFlower)
      .slice(0, 3);
  };

  const majorBuyWalls = findWalls(cleanOffers, totalBidVolumeFlower);
  const majorSellWalls = findWalls(cleanListings, totalAskVolumeFlower);

  // 11. Generate Curve Steps
  const minPrice = cleanOffers.length > 0 
    ? Math.max(0.0001, cleanOffers[cleanOffers.length - 1].unitPrice * 0.9)
    : floorPriceFlower * 0.7;
  const maxPrice = cleanListings.length > 0 
    ? Math.min(cleanListings[cleanListings.length - 1].unitPrice * 1.1, floorPriceFlower * 2.0)
    : floorPriceFlower * 1.5;

  const stepCount = 25;
  const priceStep = (maxPrice - minPrice) / (stepCount - 1);
  const curveSteps: CumulativeDepthStep[] = [];

  for (let i = 0; i < stepCount; i++) {
    const p = Number((minPrice + i * priceStep).toFixed(5));

    const matchingBids = cleanOffers.filter(o => o.unitPrice >= p);
    const demandQuantity = matchingBids.reduce((sum, o) => sum + o.quantity, 0);
    const demandVolumeFlower = Number(matchingBids.reduce((sum, o) => sum + o.sfl, 0).toFixed(3));

    const matchingAsks = cleanListings.filter(l => l.unitPrice <= p);
    const supplyQuantity = matchingAsks.reduce((sum, l) => sum + l.quantity, 0);
    const supplyVolumeFlower = Number(matchingAsks.reduce((sum, l) => sum + l.sfl, 0).toFixed(3));

    curveSteps.push({
      price: p,
      demandQuantity,
      demandVolumeFlower,
      demandOrdersCount: matchingBids.length,
      supplyQuantity,
      supplyVolumeFlower,
      supplyOrdersCount: matchingAsks.length,
    });
  }

  // Equilibrium Price
  const equilibriumPriceFlower = Number(((floorPriceFlower + bestBidPriceFlower) / 2).toFixed(5));
  const equilibriumPriceUSD = Number((equilibriumPriceFlower * flowerPriceUSD).toFixed(4));
  
  const closestStep = curveSteps.reduce((prev, curr) => 
    Math.abs(curr.price - equilibriumPriceFlower) < Math.abs(prev.price - equilibriumPriceFlower) ? curr : prev
  , curveSteps[0]);
  const equilibriumQuantity = closestStep ? Math.round((closestStep.demandQuantity + closestStep.supplyQuantity) / 2) : 0;

  // Q1 Verdict
  let q1Verdict: 'Demand Dominant 🟢' | 'Supply Dominant 🔴' | 'Balanced Order Book ⚖️' = 'Balanced Order Book ⚖️';
  let q1Summary = '';

  if (imbalanceRatio >= 0.15 || demandPercent >= 60) {
    q1Verdict = 'Demand Dominant 🟢';
    q1Summary = `Buyer bids command ${demandPercent}% of visible order book volume (${totalBidVolumeFlower} FLOWER vs ${totalAskVolumeFlower} FLOWER asks). Demand pressure outstrips supply, supporting price firmness.`;
  } else if (imbalanceRatio <= -0.15 || demandPercent <= 40) {
    q1Verdict = 'Supply Dominant 🔴';
    q1Summary = `Sellers are heavily listing inventory (${supplyPercent}% of total book, ${totalAskVolumeFlower} FLOWER asks). Visible supply outweighs buyer depth by ${(supplyPercent / Math.max(1, demandPercent)).toFixed(1)}x.`;
  } else {
    q1Verdict = 'Balanced Order Book ⚖️';
    q1Summary = `Market is in healthy equilibrium (${demandPercent}% buyers vs ${supplyPercent}% sellers). Spread is ${spreadPercent}% with orderly liquidity on both sides.`;
  }

  // Q2 Aggression
  const topAsks = cleanListings.slice(0, 3);
  const isAskUndercutting = topAsks.length >= 2 && (topAsks[1].unitPrice - topAsks[0].unitPrice) / topAsks[0].unitPrice < 0.005;

  let q2Status: 'Buyers Aggressive 🟢' | 'Sellers Aggressive 🔴' | 'Passive Accumulation 🟡' | 'Neutral Negotiation ⚖️';
  let q2Summary = '';

  if (buyerTakerPercent >= 60) {
    q2Status = 'Buyers Aggressive 🟢';
    q2Summary = `Buyers are aggressively crossing the spread and clearing asking listings (${buyerTakerPercent}% of recent settlements). Buyers are unwilling to wait in line.`;
  } else if (sellerTakerPercent >= 60 || isAskUndercutting) {
    q2Status = 'Sellers Aggressive 🔴';
    q2Summary = `Sellers are taking initiative by hitting buyer bids or undercutting competing listings tightly to exit fast. Buyer patience is rewarded.`;
  } else if (nearSpreadBidVolumeFlower > nearSpreadAskVolumeFlower * 1.5) {
    q2Status = 'Passive Accumulation 🟡';
    q2Summary = `Buyers are quietly accumulating size with thick limit bids near the spread rather than chasing market orders. Solid price foundation.`;
  } else {
    q2Status = 'Neutral Negotiation ⚖️';
    q2Summary = `Neither buyers nor sellers are dumping or panic-buying. Trades are executing smoothly around the ${equilibriumPriceFlower} FLOWER equilibrium.`;
  }

  // Q3 Buy Attractiveness
  const buyReasons: string[] = [];
  let buyScore = 50;

  if (discountVs7dAvg >= 5) {
    buyScore += 25;
    buyReasons.push(`Current floor (${floorPriceFlower} FLOWER) is at a ${discountVs7dAvg}% discount compared to recent trading levels.`);
  } else if (discountVs7dAvg <= -8) {
    buyScore -= 20;
    buyReasons.push(`Current floor is ${Math.abs(discountVs7dAvg)}% above 7-day averages (sellers holding higher markup).`);
  } else {
    buyReasons.push(`Floor is trading within normal fair-value range (≈ 7-day baseline).`);
  }

  if (spreadPercent <= 3) {
    buyScore += 15;
    buyReasons.push(`Tight spread (${spreadPercent}%) allows immediate acquisition with minimal liquidity friction.`);
  } else if (spreadPercent >= 8) {
    buyScore -= 15;
    buyReasons.push(`Wide spread (${spreadPercent}%) means you pay a steep markup if buying at ask; use a limit bid instead.`);
  }

  if (nearSpreadBidVolumeFlower >= 20 || majorBuyWalls.length > 0) {
    buyScore += 10;
    buyReasons.push(`Strong buy support beneath current floor provides downside safety.`);
  }

  buyScore = Math.min(95, Math.max(10, buyScore));
  const buyRating = buyScore >= 70 
    ? 'Highly Attractive 🟢' 
    : buyScore >= 45 
      ? 'Fair Value 🟡' 
      : 'Unattractive / Overheated 🔴';

  // Q4 Sell Attractiveness
  const premiumVs7dAvg = -discountVs7dAvg;
  const sellReasons: string[] = [];
  let sellScore = 50;

  if (premiumVs7dAvg >= 5) {
    sellScore += 25;
    sellReasons.push(`Elevated floor price (+${premiumVs7dAvg}% vs average) gives sellers strong profit realization.`);
  } else if (premiumVs7dAvg <= -5) {
    sellScore -= 20;
    sellReasons.push(`Market prices are depressed (-${Math.abs(premiumVs7dAvg)}% vs avg); selling now surrenders inventory cheap.`);
  }

  if (nearSpreadBidVolumeFlower >= 30) {
    sellScore += 20;
    sellReasons.push(`Deep buyer bids (${nearSpreadBidVolumeFlower} FLOWER within 5%) can absorb substantial selling without slippage.`);
  } else if (totalBidVolumeFlower < 10) {
    sellScore -= 25;
    sellReasons.push(`Very thin buyer bids (${totalBidVolumeFlower} FLOWER total); large market sells will crash the order book.`);
  }

  const netProceedsPerUnitFlower = Number((floorPriceFlower * 0.90).toFixed(5));
  const netProceedsPerUnitUSD = Number((netProceedsPerUnitFlower * flowerPriceUSD).toFixed(4));
  sellReasons.push(`Net proceeds after 10% SFL market tax: ${netProceedsPerUnitFlower} FLOWER ($${netProceedsPerUnitUSD} USD) / unit.`);

  sellScore = Math.min(95, Math.max(10, sellScore));
  const sellRating = sellScore >= 70 
    ? 'Highly Favorable 🟢' 
    : sellScore >= 45 
      ? 'Moderate Window 🟡' 
      : 'Unfavorable / Soft Bids 🔴';

  // Q5 Execution Targets & Risk
  const targetBuyPriceFlower = Number(Math.min(floorPriceFlower - 0.0001, bestBidPriceFlower + 0.0001).toFixed(5));
  const targetBuyPriceUSD = Number((targetBuyPriceFlower * flowerPriceUSD).toFixed(4));

  const targetSellPriceFlower = Number(Math.max(bestBidPriceFlower + 0.0001, floorPriceFlower - 0.0001).toFixed(5));
  const targetSellPriceUSD = Number((targetSellPriceFlower * flowerPriceUSD).toFixed(4));

  let riskScore = 20;
  const riskFactors: string[] = [];

  if (spreadPercent >= 6) {
    riskScore += 30;
    riskFactors.push(`Wide bid-ask spread (${spreadPercent}%) creates execution slippage.`);
  }
  if (totalBidVolumeFlower < 15 || totalAskVolumeFlower < 15) {
    riskScore += 25;
    riskFactors.push(`Low book liquidity (${totalVol.toFixed(1)} FLOWER total) increases volatility.`);
  }
  if (Math.abs(discountVs7dAvg) > 15) {
    riskScore += 20;
    riskFactors.push(`Sharp price divergence from 7-day average indicates high momentum volatility.`);
  }
  if (riskFactors.length === 0) {
    riskFactors.push(`Deep order book, tight spread (${spreadPercent}%), and stable multi-day trading volume.`);
  }

  riskScore = Math.min(95, Math.max(10, riskScore));
  const riskRating = riskScore <= 35 
    ? 'Low Risk 🟢' 
    : riskScore <= 65 
      ? 'Moderate Risk 🟡' 
      : 'High Risk 🔴';

  let recommendedAction: 'FAVORABLE TO BUY' | 'FAVORABLE TO SELL' | 'WAIT / HOLD' | 'ACCUMULATE VIA LIMIT BIDS' = 'WAIT / HOLD';
  const tripleConfirmedDir = signalIndicator.tripleConfirmation.confirmedDirection;
  if (tripleConfirmedDir === 'buy' && (buyScore >= 65 || signalIndicator.state === 'Strong Buy') && riskScore <= 60) {
    recommendedAction = 'FAVORABLE TO BUY';
  } else if (tripleConfirmedDir === 'sell' && (sellScore >= 65 || signalIndicator.state === 'Strong Sell')) {
    recommendedAction = 'FAVORABLE TO SELL';
  } else if (tripleConfirmedDir === 'buy' && buyScore >= 50) {
    recommendedAction = 'ACCUMULATE VIA LIMIT BIDS';
  } else {
    recommendedAction = 'WAIT / HOLD';
  }

  // Four-Quadrant Condition
  const demandTrend = signalIndicator.demandTrend === 'Increasing' ? 'rising' : signalIndicator.demandTrend === 'Decreasing' ? 'falling' : 'stable';
  const supplyTrend = signalIndicator.supplyTrend === 'Increasing' ? 'rising' : signalIndicator.supplyTrend === 'Decreasing' ? 'falling' : 'stable';

  let quadrantCondition: FourQuadrantCondition = 'Expanding Market ⚡';
  let quadrantTagline = '';
  let quadrantExplanation = '';

  if (demandTrend === 'rising' && supplyTrend !== 'rising') {
    quadrantCondition = 'Bullish Pressure 🚀';
    quadrantTagline = 'Demand rising, supply tight';
    quadrantExplanation = 'Buyer capital is pouring in faster than inventory is being listed. Upward pricing pressure makes this a prime time for sellers to hold or take premium exits, and buyers should act before prices lift.';
  } else if (demandTrend === 'falling' && supplyTrend === 'rising') {
    quadrantCondition = 'Bearish Pressure 📉';
    quadrantTagline = 'Demand falling, supply rising';
    quadrantExplanation = 'Sellers are listing excess stock while buyer bids are thinning out. Downward pricing pressure encourages buyers to wait for cheaper fills and sellers to divert surplus into crafting or process recipes.';
  } else if (demandTrend === 'rising' && supplyTrend === 'rising') {
    quadrantCondition = 'Expanding Market ⚡';
    quadrantTagline = 'Both demand and supply expanding';
    quadrantExplanation = 'High market turnover and heavy participation on both sides. Deep liquidity allows rapid trades with minimal price impact; watch for decisive breakout beyond key order walls.';
  } else {
    quadrantCondition = 'Contracting Market 🧊';
    quadrantTagline = 'Both demand and supply contracting';
    quadrantExplanation = 'Trading activity and order book replenishment have slowed. Caution is advised as thin depth can result in outsized price swings from individual trades.';
  }

  // Multi-Timeframe Signal Confirmation (Feature 11)
  const multiTimeframe = calculateMultiTimeframeSignals(
    cleanSales,
    dailyHistory,
    floorPriceFlower,
    bestBidPriceFlower,
    signalIndicator.buyPressurePercent,
    spreadPercent,
    totalVol,
    signalIndicator.score,
    signalIndicator.confidence
  );

  return {
    floorPriceFlower,
    floorPriceUSD,
    lastSalePriceFlower,
    lastSalePriceUSD,
    bestBidPriceFlower,
    bestBidPriceUSD,
    spreadFlower,
    spreadPercent,

    signalIndicator,
    twoSidedDepth,

    curveSteps,
    equilibriumPriceFlower,
    equilibriumPriceUSD,
    equilibriumQuantity,

    q1DemandVsSupply: {
      verdict: q1Verdict,
      demandPercent,
      supplyPercent,
      totalBidVolumeFlower,
      totalAskVolumeFlower,
      totalBidQuantity,
      totalAskQuantity,
      nearSpreadBidVolumeFlower,
      nearSpreadAskVolumeFlower,
      imbalanceRatio,
      summary: q1Summary,
      majorBuyWalls,
      majorSellWalls,
    },

    q2Aggression: {
      status: q2Status,
      buyerTakerPercent,
      sellerTakerPercent,
      recentTradesAnalyzed: recentSalesSlice.length,
      bidClustering: nearSpreadBidVolumeFlower >= 20 ? 'Tight & Aggressive' : 'Moderate',
      askUndercutting: isAskUndercutting ? 'Intense Under-cutting' : 'Normal',
      summary: q2Summary,
    },

    q3BuyAttractiveness: {
      score: buyScore,
      rating: buyRating,
      discountVs7dAvg,
      spreadQuality: spreadPercent <= 3 ? 'Tight Spread (Low Slippage)' : spreadPercent <= 6 ? 'Moderate Spread' : 'Wide Spread (High Friction)',
      summary: `Buy Attractiveness Score: ${buyScore}/100 (${buyRating}).`,
      reasons: buyReasons,
    },

    q4SellAttractiveness: {
      score: sellScore,
      rating: sellRating,
      premiumVs7dAvg,
      liquidityAbsorption: nearSpreadBidVolumeFlower >= 30 ? 'Deep (Can absorb large volume)' : nearSpreadBidVolumeFlower >= 10 ? 'Moderate' : 'Shallow (Will crash bids)',
      netProceedsPerUnitFlower,
      netProceedsPerUnitUSD,
      summary: `Sell Attractiveness Score: ${sellScore}/100 (${sellRating}).`,
      reasons: sellReasons,
    },

    q5ExecutionAndRisk: {
      targetBuyPriceFlower,
      targetBuyPriceUSD,
      targetSellPriceFlower,
      targetSellPriceUSD,
      immediateBuyPriceFlower: floorPriceFlower,
      immediateSellPriceFlower: bestBidPriceFlower,
      riskRating,
      riskScore,
      riskFactors,
      recommendedAction,
    },

    quadrant: {
      condition: quadrantCondition,
      tagline: quadrantTagline,
      explanation: quadrantExplanation,
      demandTrend,
      supplyTrend,
    },

    multiTimeframe,
  };
}

/**
 * Classifies a 0-100 weighted directional score into the 5 active signal tiers:
 * 80–100: Strong Buy | 65–79: Buy | 45–64: Neutral | 25–44: Sell | 0–24: Strong Sell
 */
export function classifyScoreToSignal(score: number): Exclude<SixStateSignal, 'Insufficient Data'> {
  if (score >= 80) return 'Strong Buy';
  if (score >= 65) return 'Buy';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Sell';
  return 'Strong Sell';
}

/**
 * Generates independent signal evaluations across 1H, 4H, 1D, 7D, and 1M horizons
 * and synthesizes multi-timeframe alignment & counter-trend warnings (Feature 11).
 */
export function calculateMultiTimeframeSignals(
  cleanSales: { fulfilledAt: number; quantity: number; sfl: number; unitPrice: number }[],
  dailyHistory: Record<string, any>,
  floorPriceFlower: number,
  bestBidPriceFlower: number,
  buyPressurePercent: number,
  spreadPercent: number,
  totalVolFlower: number,
  baseScore: number | null,
  baseConfidence: SignalConfidence,
  nowMs: number = Date.now()
): MultiTimeframeAnalysisSummary {
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
  const bookSparse = baseScore === null || totalVolFlower < 8 || floorPriceFlower <= 0;

  // Chronological daily checkpoints sorted oldest -> newest
  const sortedDays = Object.entries(dailyHistory || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const high = Number(d?.high) || 0;
      const low = Number(d?.low) || 0;
      const mid = high > 0 && low > 0 ? (high + low) / 2 : high || low || 0;
      return {
        date,
        high,
        low,
        mid,
        volume: Number(d?.volume) || 0,
        sales: Number(d?.sales) || 0,
      };
    })
    .filter(d => d.mid > 0);

  const calcWindowTradeMetrics = (windowMs: number) => {
    const cutoff = nowMs - windowMs;
    const windowSales = cleanSales
      .filter(s => s.fulfilledAt >= cutoff)
      .sort((a, b) => b.fulfilledAt - a.fulfilledAt); // newest first
    const count = windowSales.length;
    if (count === 0) {
      return { count: 0, trendPct: 0, buyerTakerPct: 50 };
    }

    let askHits = 0;
    windowSales.forEach(s => {
      if (Math.abs(s.unitPrice - floorPriceFlower) <= Math.abs(s.unitPrice - bestBidPriceFlower)) {
        askHits += 1;
      }
    });
    const buyerTakerPct = Math.round((askHits / count) * 100);

    let trendPct = 0;
    if (count >= 4) {
      const half = Math.max(2, Math.floor(count / 2));
      const newer = windowSales.slice(0, half);
      const older = windowSales.slice(half);
      const nQty = newer.reduce((sum, s) => sum + s.quantity, 0) || 1;
      const oQty = older.reduce((sum, s) => sum + s.quantity, 0) || 1;
      const nVwap = newer.reduce((sum, s) => sum + s.sfl, 0) / nQty;
      const oVwap = older.reduce((sum, s) => sum + s.sfl, 0) / oQty;
      trendPct = oVwap > 0 ? ((nVwap - oVwap) / oVwap) * 100 : 0;
    } else if (count >= 2) {
      const newest = windowSales[0].unitPrice;
      const oldest = windowSales[count - 1].unitPrice;
      trendPct = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;
    } else if (floorPriceFlower > 0) {
      const refPrice = windowSales[0].unitPrice;
      trendPct = refPrice > 0 ? ((floorPriceFlower - refPrice) / refPrice) * 100 : 0;
    }

    return { count, trendPct: Number(trendPct.toFixed(2)), buyerTakerPct };
  };

  const calcDailyWindowMetrics = (daysLimit: number) => {
    const slice = sortedDays.slice(-daysLimit);
    const count = slice.length;
    if (count === 0) return { count: 0, trendPct: 0, rangePos: 0.5 };

    const newestMid = slice[count - 1].mid;
    const recentSegment = slice.slice(-Math.max(1, Math.min(3, Math.floor(count / 2))));
    const earlierSegment = slice.slice(0, Math.max(1, count - recentSegment.length));

    const recentAvg =
      recentSegment.reduce((s, d) => s + d.mid, 0) / (recentSegment.length || 1);
    const earlierAvg =
      earlierSegment.reduce((s, d) => s + d.mid, 0) / (earlierSegment.length || 1);

    // Blend segment slope with current floor vs period midpoint
    const segSlopePct = count >= 2 && earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
    const spotRef = floorPriceFlower > 0 ? floorPriceFlower : newestMid;
    const vsStartPct = slice[0].mid > 0 ? ((spotRef - slice[0].mid) / slice[0].mid) * 100 : 0;
    const trendPct = count >= 3 ? segSlopePct * 0.7 + vsStartPct * 0.3 : vsStartPct;

    const maxH = Math.max(...slice.map(d => d.high || d.mid));
    const minL = Math.min(...slice.map(d => d.low || d.mid));
    const rangePos = maxH > minL ? Math.max(0, Math.min(1, (spotRef - minL) / (maxH - minL))) : 0.5;

    return { count, trendPct: Number(trendPct.toFixed(2)), rangePos };
  };

  const spreadQualityAdj = spreadPercent <= 2.5 ? 4 : spreadPercent >= 7 ? -5 : 0;
  const bookComponent = 50 + (buyPressurePercent - 50) * 1.05; // 50..95 -> ~50..97

  // --- 1H Evaluation ---
  const m1h = calcWindowTradeMetrics(60 * 60 * 1000);
  const e1h: TimeframeSignalEntry = (() => {
    if (bookSparse) {
      return {
        timeframe: '1H',
        horizonLabel: 'Short-Term (1H)',
        signal: 'Insufficient Data',
        score: null,
        confidence: 'N/A',
        interpretation: 'Order book too sparse for 1H read',
        trendPercent: 0,
        sampleCount: m1h.count,
        sampleUnit: 'trades',
      };
    }
    const takerScore = m1h.count > 0 ? 50 + (m1h.buyerTakerPct - 50) * 0.92 : 50;
    const slopeScore = m1h.count >= 2 ? 50 + m1h.trendPct * 8 : 50;
    const score1h = clamp(bookComponent * 0.52 + takerScore * 0.28 + slopeScore * 0.20 + spreadQualityAdj * (buyPressurePercent >= 50 ? 1 : -1));
    const sig1h = classifyScoreToSignal(score1h);
    const conf1h: SignalConfidence = m1h.count >= 3 ? baseConfidence : 'Low';
    const interp1h =
      sig1h === 'Strong Buy' || sig1h === 'Buy'
        ? m1h.count > 0
          ? 'Short-term buying pressure'
          : 'Strong short-term bid pressure (low trades)'
        : sig1h === 'Strong Sell' || sig1h === 'Sell'
        ? 'Short-term selling pressure'
        : 'Balanced short-term flow';
    return {
      timeframe: '1H',
      horizonLabel: 'Short-Term (1H)',
      signal: sig1h,
      score: score1h,
      confidence: conf1h,
      interpretation: interp1h,
      trendPercent: m1h.trendPct,
      sampleCount: m1h.count,
      sampleUnit: 'trades',
    };
  })();

  // --- 4H Evaluation ---
  const m4h = calcWindowTradeMetrics(4 * 60 * 60 * 1000);
  const e4h: TimeframeSignalEntry = (() => {
    if (bookSparse) {
      return {
        timeframe: '4H',
        horizonLabel: 'Intraday (4H)',
        signal: 'Insufficient Data',
        score: null,
        confidence: 'N/A',
        interpretation: 'Order book too sparse for 4H read',
        trendPercent: 0,
        sampleCount: m4h.count,
        sampleUnit: 'trades',
      };
    }
    const takerScore = m4h.count >= 2 ? 50 + (m4h.buyerTakerPct - 50) * 0.9 : 50;
    const slopeScore = m4h.count >= 2 ? 50 + m4h.trendPct * 7.5 : 50;
    const score4h = clamp(bookComponent * 0.42 + takerScore * 0.30 + slopeScore * 0.28);
    const sig4h = classifyScoreToSignal(score4h);
    const conf4h: SignalConfidence = m4h.count >= 4 ? 'High' : m4h.count >= 2 ? 'Medium' : 'Low';
    const interp4h =
      sig4h === 'Strong Buy' || sig4h === 'Buy'
        ? 'Positive intraday momentum'
        : sig4h === 'Strong Sell' || sig4h === 'Sell'
        ? 'Weakening intraday momentum'
        : m4h.count < 2
        ? 'Limited 4H trade sample'
        : 'Mixed intraday momentum';
    return {
      timeframe: '4H',
      horizonLabel: 'Intraday (4H)',
      signal: sig4h,
      score: score4h,
      confidence: conf4h,
      interpretation: interp4h,
      trendPercent: m4h.trendPct,
      sampleCount: m4h.count,
      sampleUnit: 'trades',
    };
  })();

  // --- 6H Evaluation ---
  const m6h = calcWindowTradeMetrics(6 * 60 * 60 * 1000);
  const e6h: TimeframeSignalEntry = (() => {
    if (bookSparse) {
      return {
        timeframe: '6H',
        horizonLabel: 'Quarter-Day (6H)',
        signal: 'Insufficient Data',
        score: null,
        confidence: 'N/A',
        interpretation: 'Order book too sparse for 6H read',
        trendPercent: 0,
        sampleCount: m6h.count,
        sampleUnit: 'trades',
      };
    }
    const takerScore = m6h.count >= 2 ? 50 + (m6h.buyerTakerPct - 50) * 0.9 : 50;
    const slopeScore = m6h.count >= 2 ? 50 + m6h.trendPct * 7.2 : 50;
    const score6h = clamp(bookComponent * 0.40 + takerScore * 0.30 + slopeScore * 0.30);
    const sig6h = classifyScoreToSignal(score6h);
    const conf6h: SignalConfidence = m6h.count >= 4 ? 'High' : m6h.count >= 2 ? 'Medium' : 'Low';
    const interp6h =
      sig6h === 'Strong Buy' || sig6h === 'Buy'
        ? '6H accumulation building'
        : sig6h === 'Strong Sell' || sig6h === 'Sell'
        ? '6H selling pressure building'
        : m6h.count < 2
        ? 'Limited 6H trade sample'
        : '6H range equilibrium';
    return {
      timeframe: '6H',
      horizonLabel: 'Quarter-Day (6H)',
      signal: sig6h,
      score: score6h,
      confidence: conf6h,
      interpretation: interp6h,
      trendPercent: m6h.trendPct,
      sampleCount: m6h.count,
      sampleUnit: 'trades',
    };
  })();

  // --- 12H Evaluation ---
  const m12h = calcWindowTradeMetrics(12 * 60 * 60 * 1000);
  const e12h: TimeframeSignalEntry = (() => {
    if (bookSparse) {
      return {
        timeframe: '12H',
        horizonLabel: 'Half-Day (12H)',
        signal: 'Insufficient Data',
        score: null,
        confidence: 'N/A',
        interpretation: 'Order book too sparse for 12H read',
        trendPercent: 0,
        sampleCount: m12h.count,
        sampleUnit: 'trades',
      };
    }
    const takerScore = m12h.count >= 2 ? 50 + (m12h.buyerTakerPct - 50) * 0.9 : 50;
    const slopeScore = m12h.count >= 2 ? 50 + m12h.trendPct * 6.8 : 50;
    const score12h = clamp(bookComponent * 0.36 + takerScore * 0.32 + slopeScore * 0.32);
    const sig12h = classifyScoreToSignal(score12h);
    const conf12h: SignalConfidence = m12h.count >= 5 ? 'High' : m12h.count >= 2 ? 'Medium' : 'Low';
    const interp12h =
      sig12h === 'Strong Buy' || sig12h === 'Buy'
        ? '12H upward session drift'
        : sig12h === 'Strong Sell' || sig12h === 'Sell'
        ? '12H downward supply pressure'
        : m12h.count < 2
        ? 'Limited 12H trade sample'
        : '12H balanced session';
    return {
      timeframe: '12H',
      horizonLabel: 'Half-Day (12H)',
      signal: sig12h,
      score: score12h,
      confidence: conf12h,
      interpretation: interp12h,
      trendPercent: m12h.trendPct,
      sampleCount: m12h.count,
      sampleUnit: 'trades',
    };
  })();

  // --- 1D Evaluation ---
  const m1dTrades = calcWindowTradeMetrics(24 * 60 * 60 * 1000);
  const m1dDaily = calcDailyWindowMetrics(2);
  const e1d: TimeframeSignalEntry = (() => {
    if (bookSparse && m1dTrades.count === 0 && m1dDaily.count === 0) {
      return {
        timeframe: '1D',
        horizonLabel: 'Daily (1D)',
        signal: 'Insufficient Data',
        score: null,
        confidence: 'N/A',
        interpretation: 'Insufficient 24H data',
        trendPercent: 0,
        sampleCount: 0,
        sampleUnit: 'trades',
      };
    }
    const activeSlope = m1dTrades.count >= 3 ? m1dTrades.trendPct : m1dDaily.trendPct;
    const takerScore = m1dTrades.count >= 3 ? 50 + (m1dTrades.buyerTakerPct - 50) * 0.9 : 50;
    const slopeScore = m1dTrades.count >= 2 || m1dDaily.count >= 2 ? 50 + activeSlope * 6.5 : 50;
    const score1d = clamp(bookComponent * 0.32 + takerScore * 0.33 + slopeScore * 0.35);
    const sig1d = classifyScoreToSignal(score1d);
    const conf1d: SignalConfidence = m1dTrades.count >= 5 ? 'High' : m1dTrades.count >= 3 || m1dDaily.count >= 2 ? 'Medium' : 'Low';
    const interp1d =
      sig1d === 'Strong Buy' || sig1d === 'Buy'
        ? 'Daily trend & volume aligned bullish'
        : sig1d === 'Strong Sell' || sig1d === 'Sell'
        ? 'Daily distribution pressure'
        : 'Daily direction not confirmed';
    return {
      timeframe: '1D',
      horizonLabel: 'Daily (1D)',
      signal: sig1d,
      score: score1d,
      confidence: conf1d,
      interpretation: interp1d,
      trendPercent: activeSlope,
      sampleCount: m1dTrades.count > 0 ? m1dTrades.count : m1dDaily.count,
      sampleUnit: m1dTrades.count > 0 ? 'trades' : 'days',
    };
  })();

  // --- 3D Evaluation ---
  const m3dDaily = calcDailyWindowMetrics(4);
  const m3dTrades = calcWindowTradeMetrics(3 * 24 * 60 * 60 * 1000);
  const e3d: TimeframeSignalEntry = (() => {
    if (m3dDaily.count < 2 && m3dTrades.count < 3 && bookSparse) {
      return {
        timeframe: '3D',
        horizonLabel: 'Multi-Day (3D)',
        signal: 'Insufficient Data',
        score: null,
        confidence: 'N/A',
        interpretation: 'Need 2+ daily sessions for 3D trend',
        trendPercent: 0,
        sampleCount: m3dDaily.count,
        sampleUnit: 'days',
      };
    }
    const trendPct3d = m3dDaily.count >= 2 ? m3dDaily.trendPct : m3dTrades.trendPct;
    const slopeScore3d = 50 + trendPct3d * 4.8 + (m3dDaily.rangePos - 0.5) * 16;
    const score3d = clamp(slopeScore3d * 0.68 + bookComponent * 0.32);
    const sig3d = classifyScoreToSignal(score3d);
    const conf3d: SignalConfidence = m3dDaily.count >= 3 ? 'High' : m3dDaily.count >= 2 ? 'Medium' : 'Low';
    const interp3d =
      sig3d === 'Strong Buy' || sig3d === 'Buy'
        ? '3-day recovery / accumulation wave'
        : sig3d === 'Strong Sell' || sig3d === 'Sell'
        ? '3-day distribution slide'
        : m3dDaily.count < 2
        ? 'Limited 3D session history'
        : '3-day sideways consolidation';
    return {
      timeframe: '3D',
      horizonLabel: 'Multi-Day (3D)',
      signal: sig3d,
      score: score3d,
      confidence: conf3d,
      interpretation: interp3d,
      trendPercent: trendPct3d,
      sampleCount: m3dDaily.count > 0 ? m3dDaily.count : m3dTrades.count,
      sampleUnit: m3dDaily.count > 0 ? 'days' : 'trades',
    };
  })();

  // --- 7D Evaluation ---
  const m7dDaily = calcDailyWindowMetrics(7);
  const m7dTrades = calcWindowTradeMetrics(7 * 24 * 60 * 60 * 1000);
  const e7d: TimeframeSignalEntry = (() => {
    if (m7dDaily.count < 2 && m7dTrades.count < 3 && bookSparse) {
      return {
        timeframe: '7D',
        horizonLabel: 'Weekly (7D)',
        signal: 'Insufficient Data',
        score: null,
        confidence: 'N/A',
        interpretation: 'Need 2+ daily sessions for 7D trend',
        trendPercent: 0,
        sampleCount: m7dDaily.count,
        sampleUnit: 'days',
      };
    }
    const trendPct7d = m7dDaily.count >= 2 ? m7dDaily.trendPct : m7dTrades.trendPct;
    const slopeScore7d = 50 + trendPct7d * 4.2 + (m7dDaily.rangePos - 0.5) * 18;
    const score7d = clamp(slopeScore7d * 0.72 + bookComponent * 0.28);
    const sig7d = classifyScoreToSignal(score7d);
    const conf7d: SignalConfidence = m7dDaily.count >= 5 ? 'High' : m7dDaily.count >= 3 ? 'Medium' : 'Low';
    const interp7d =
      sig7d === 'Strong Buy' || sig7d === 'Buy'
        ? 'Weekly trend positive'
        : sig7d === 'Strong Sell' || sig7d === 'Sell'
        ? 'Weekly trend negative'
        : m7dDaily.count < 2
        ? 'Limited 7D session history'
        : 'Weekly consolidation range';
    return {
      timeframe: '7D',
      horizonLabel: 'Weekly (7D)',
      signal: sig7d,
      score: score7d,
      confidence: conf7d,
      interpretation: interp7d,
      trendPercent: trendPct7d,
      sampleCount: m7dDaily.count > 0 ? m7dDaily.count : m7dTrades.count,
      sampleUnit: m7dDaily.count > 0 ? 'days' : 'trades',
    };
  })();

  // --- 1M Evaluation ---
  const m1mDaily = calcDailyWindowMetrics(30);
  const e1m: TimeframeSignalEntry = (() => {
    if (m1mDaily.count < 3 && bookSparse) {
      return {
        timeframe: '1M',
        horizonLabel: 'Monthly (1M)',
        signal: 'Insufficient Data',
        score: null,
        confidence: 'N/A',
        interpretation: 'Need multi-day history for 1M trend',
        trendPercent: 0,
        sampleCount: m1mDaily.count,
        sampleUnit: 'days',
      };
    }
    const trendPct1m = m1mDaily.count >= 2 ? m1mDaily.trendPct : m7dTrades.trendPct;
    const slopeScore1m = 50 + trendPct1m * 3.8 + (m1mDaily.rangePos - 0.5) * 20;
    const score1m = clamp(slopeScore1m * 0.78 + bookComponent * 0.22);
    const sig1m = classifyScoreToSignal(score1m);
    const conf1m: SignalConfidence = m1mDaily.count >= 14 ? 'High' : m1mDaily.count >= 6 ? 'Medium' : 'Low';
    const interp1m =
      m1mDaily.count < 3
        ? 'Early 1M sample • Provisional read'
        : sig1m === 'Strong Buy' || sig1m === 'Buy'
        ? 'Longer-term trend positive'
        : sig1m === 'Strong Sell' || sig1m === 'Sell'
        ? 'Longer-term trend still weak'
        : 'Longer-term trend sideways';
    return {
      timeframe: '1M',
      horizonLabel: 'Monthly (1M)',
      signal: sig1m,
      score: score1m,
      confidence: conf1m,
      interpretation: interp1m,
      trendPercent: trendPct1m,
      sampleCount: m1mDaily.count,
      sampleUnit: 'days',
    };
  })();

  const entries: TimeframeSignalEntry[] = [e1h, e4h, e6h, e12h, e1d, e3d, e7d, e1m];
  const validEntries = entries.filter(e => e.signal !== 'Insufficient Data');

  const isBull = (s: SixStateSignal) => s === 'Strong Buy' || s === 'Buy';
  const isBear = (s: SixStateSignal) => s === 'Strong Sell' || s === 'Sell';

  const bullishCount = validEntries.filter(e => isBull(e.signal)).length;
  const bearishCount = validEntries.filter(e => isBear(e.signal)).length;
  const neutralCount = validEntries.filter(e => e.signal === 'Neutral').length;

  const shortBullish = isBull(e1h.signal) || isBull(e4h.signal) || isBull(e6h.signal);
  const shortBearish = isBear(e1h.signal) || isBear(e4h.signal) || isBear(e6h.signal);
  const longBearish = isBear(e1m.signal) || isBear(e7d.signal) || isBear(e3d.signal);
  const longBullish = isBull(e1m.signal) || isBull(e7d.signal) || isBull(e3d.signal);

  let alignment: MultiTimeframeAlignment = 'Range-Bound / Neutral';
  let headline = 'Neutral equilibrium across intervals';
  let summary = 'Short-term and longer-term intervals show no decisive directional dominance.';
  let recommendation = 'Wait for a breakout backed by aligned 4H, 12H, and 1D confirmation before taking directional size.';

  if (validEntries.length < 2) {
    alignment = 'Insufficient Data';
    headline = 'Insufficient multi-timeframe history';
    summary = 'Not enough active order-book or multi-day historical data to compare timeframes reliably.';
    recommendation = 'Use limit orders near verified depth levels until multi-day trade history builds.';
  } else if (bullishCount >= 5 || (bullishCount >= 4 && bearishCount === 0 && !longBearish)) {
    alignment = 'Aligned Bullish';
    headline = 'Timeframes aligned bullish';
    summary = `${bullishCount} of ${validEntries.length} intervals register Buy or Strong Buy, with short-term buyers supported by positive 3D/7D structure.`;
    recommendation = 'Trend alignment favors pullback entries near support while 1D, 3D, and 7D hold constructive.';
  } else if (bearishCount >= 5 || (bearishCount >= 4 && bullishCount === 0 && !longBullish)) {
    alignment = 'Aligned Bearish';
    headline = 'Timeframes aligned bearish';
    summary = `${bearishCount} of ${validEntries.length} intervals register Sell or Strong Sell, confirming persistent supply pressure across intraday and multi-day windows.`;
    recommendation = 'Avoid catching falling prices aggressively; wait for 4H, 6H, and 12H momentum to stabilize first.';
  } else if (shortBullish && longBearish) {
    alignment = 'Mixed Signals';
    headline = 'Mixed signals';
    summary =
      isBear(e1m.signal) && !isBull(e1d.signal)
        ? 'Short-term buyers are becoming more aggressive, but the monthly trend remains bearish.'
        : 'Short-term buying momentum is rebounding against a weaker higher-timeframe trend.';
    recommendation = 'Avoid treating this as a confirmed long-term reversal. Watch whether the 1D and 4H signals align.';
  } else if (shortBearish && longBullish) {
    alignment = 'Mixed Signals';
    headline = 'Mixed signals (Short-term pullback)';
    summary = 'Short-term selling pressure has appeared on lower intervals while the broader weekly/monthly trend remains constructive.';
    recommendation = 'Treat as a potential pullback within an uptrend; wait for 1H and 4H selling pressure to ease before entering.';
  } else if (bullishCount > 0 && bearishCount > 0) {
    alignment = 'Mixed Signals';
    headline = 'Mixed signals across horizons';
    summary = `Buyers (${bullishCount} intervals) and sellers (${bearishCount} intervals) diverge across timeframes without unified trend control.`;
    recommendation = 'Trade smaller size with strict limit levels until 1D and 4H signals converge in the same direction.';
  } else if (bullishCount > 0 && neutralCount >= 2) {
    alignment = 'Mixed Signals';
    headline = 'Early bullish divergence';
    summary = `Bullish momentum is emerging on ${entries.filter(e => isBull(e.signal)).map(e => e.timeframe).join(', ')}, while remaining horizons are still Neutral.`;
    recommendation = 'Watch whether the 1D and 4H signals align before scaling into full position size.';
  } else if (bearishCount > 0 && neutralCount >= 2) {
    alignment = 'Mixed Signals';
    headline = 'Early bearish pressure';
    summary = `Selling pressure is building on ${entries.filter(e => isBear(e.signal)).map(e => e.timeframe).join(', ')}, while other horizons remain Neutral.`;
    recommendation = 'Monitor 4H and 1D closely for follow-through breakdown before liquidating into thin bids.';
  }

  return {
    alignment,
    headline,
    summary,
    recommendation,
    bullishCount,
    bearishCount,
    neutralCount,
    entries,
  };
}

/**
 * Returns the exact user-specified interpretation tier for an MPI value:
 * +60 to +100: Strong buying pressure
 * +25 to +59:  Moderate buying pressure
 * -24 to +24:  Neutral
 * -25 to -59:  Moderate selling pressure
 * -60 to -100: Strong selling pressure
 */
export function getMpiInterpretation(mpi: number): MpiInterpretation {
  if (mpi >= 60) return 'Strong buying pressure';
  if (mpi >= 25) return 'Moderate buying pressure';
  if (mpi <= -60) return 'Strong selling pressure';
  if (mpi <= -25) return 'Moderate selling pressure';
  return 'Neutral';
}

/**
 * Detects pressure reversals between consecutive MPI periods.
 * Handles key turning points:
 * 1. MPI moves from -55 to -20: selling pressure is weakening.
 * 2. MPI moves from -20 to +15: buying pressure is beginning to emerge.
 * 3. MPI moves from +55 to +75: buying pressure is strengthening.
 * 4. MPI moves from +75 to +20: buying pressure is losing momentum.
 * 5. MPI moves below zero: selling pressure is emerging.
 * 6. MPI drops into deep negative: selling pressure is strengthening.
 */
export function detectMpiReversal(prevMpi: number, currMpi: number): MpiReversalAlert | undefined {
  const delta = currMpi - prevMpi;

  // 1. Selling pressure weakening: e.g. moves from -55 to -20
  if (prevMpi <= -30 && delta >= 18 && currMpi <= 5) {
    return {
      type: 'selling_weakening',
      label: 'Selling Pressure Weakening',
      description: `Selling pressure is subsiding (rose from ${prevMpi} to ${currMpi > 0 ? '+' : ''}${currMpi}) as ask dumping wanes.`,
      icon: '🛡️',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      textColor: 'text-amber-300',
    };
  }

  // 2. Buying pressure emerging: e.g. moves from -20 to +15 (bullish zero crossover)
  if (prevMpi < 0 && currMpi > 0 && currMpi >= 10) {
    return {
      type: 'buying_emerging',
      label: 'Buying Pressure Emerging',
      description: `Bullish crossover! Buyers reclaimed control (shifted from ${prevMpi} to +${currMpi}).`,
      icon: '⚡',
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
      textColor: 'text-emerald-300',
    };
  }

  // 3. Buying pressure strengthening: e.g. moves from +55 to +75
  if (prevMpi >= 25 && delta >= 15 && currMpi >= 55) {
    return {
      type: 'buying_strengthening',
      label: 'Buying Pressure Strengthening',
      description: `Aggressive accumulation! Demand accelerated from +${prevMpi} to +${currMpi}.`,
      icon: '🚀',
      badge: 'bg-emerald-900/90 text-emerald-200 border-emerald-400/60',
      textColor: 'text-emerald-200',
    };
  }

  // 4. Buying pressure losing momentum: e.g. moves from +75 to +20
  if (prevMpi >= 50 && delta <= -25) {
    return {
      type: 'buying_losing_momentum',
      label: 'Buying Pressure Losing Momentum',
      description: `Buyer exhaustion warning! Momentum slipped from +${prevMpi} down to ${currMpi > 0 ? '+' : ''}${currMpi}.`,
      icon: '⚠️',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      textColor: 'text-amber-300',
    };
  }

  // 5. Selling pressure emerging: e.g. crossing below zero into negative territory
  if (prevMpi > 0 && currMpi < 0 && currMpi <= -10) {
    return {
      type: 'selling_emerging',
      label: 'Selling Pressure Emerging',
      description: `Bearish crossover! Sellers seized control (dropped from +${prevMpi} to ${currMpi}).`,
      icon: '📉',
      badge: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
      textColor: 'text-rose-300',
    };
  }

  // 6. Selling pressure strengthening: e.g. -25 to -60
  if (prevMpi <= -25 && delta <= -18 && currMpi <= -55) {
    return {
      type: 'selling_strengthening',
      label: 'Selling Pressure Strengthening',
      description: `Supply cascade! Ask dumping intensified from ${prevMpi} to ${currMpi}.`,
      icon: '🔻',
      badge: 'bg-rose-900/90 text-rose-200 border-rose-400/60',
      textColor: 'text-rose-200',
    };
  }

  return undefined;
}

export interface MpiCalculationInputPoint {
  timestamp: number;
  timeLabel: string;
  fullDateLabel: string;
  salePrice: number;
  floorAsk: number;
  bestBid: number;
  isRealSale?: boolean;
  volume?: number;
}

/**
 * Computes the complete Market Pressure Index (MPI) time-series from price/order-book data.
 * Normalizes readings to [-100, +100] with zero centerline.
 * Automatically classifies interpretation tiers and attaches reversal inflection points.
 */
export function calculateMarketPressureIndexSeries(
  inputPoints: MpiCalculationInputPoint[],
  listings: any[] = [],
  offers: any[] = [],
  sales: any[] = [],
  timeframe: string = '1D'
): MarketPressureIndexSeries {
  if (!inputPoints || inputPoints.length === 0) {
    return {
      points: [],
      currentMpi: 0,
      currentInterpretation: 'Neutral',
      previousMpi: 0,
      deltaMpi: 0,
      activeReversal: null,
      summaryStats: {
        avgMpi: 0,
        maxMpi: 0,
        minMpi: 0,
        bullishPeriodsPercent: 50,
        bearishPeriodsPercent: 50,
      },
    };
  }

  // 1. Calculate Live Order Book Pressure Ratio Anchor
  let liveBidVol = 0;
  let liveAskVol = 0;
  let nearBidVol = 0;
  let nearAskVol = 0;

  let bestBid = 0;
  let floorAsk = Infinity;

  offers.forEach(o => {
    const qty = Number(o.quantity) || 0;
    const sfl = Number(o.sfl) || 0;
    const price = qty > 0 ? sfl / qty : 0;
    if (price > bestBid) bestBid = price;
    liveBidVol += sfl;
  });

  listings.forEach(l => {
    const qty = Number(l.quantity) || 0;
    const sfl = Number(l.sfl) || 0;
    const price = qty > 0 ? sfl / qty : 0;
    if (price > 0 && price < floorAsk) floorAsk = price;
    liveAskVol += sfl;
  });

  if (floorAsk === Infinity) floorAsk = bestBid > 0 ? bestBid * 1.02 : 0.01;

  offers.forEach(o => {
    const qty = Number(o.quantity) || 0;
    const sfl = Number(o.sfl) || 0;
    const price = qty > 0 ? sfl / qty : 0;
    if (bestBid > 0 && price >= bestBid * 0.95) nearBidVol += sfl;
  });

  listings.forEach(l => {
    const qty = Number(l.quantity) || 0;
    const sfl = Number(l.sfl) || 0;
    const price = qty > 0 ? sfl / qty : 0;
    if (floorAsk > 0 && price <= floorAsk * 1.05) nearAskVol += sfl;
  });

  const totalVol = liveBidVol + liveAskVol;
  const nearVol = nearBidVol + nearAskVol;

  const totalRatio = totalVol > 0 ? liveBidVol / totalVol : 0.5;
  const nearRatio = nearVol > 0 ? nearBidVol / nearVol : 0.5;
  const liveOrderBookRatio = nearRatio * 0.60 + totalRatio * 0.40;

  // Live raw anchor in range [-100, +100]
  let liveAnchorMpi = Math.round((liveOrderBookRatio - 0.5) * 160);
  liveAnchorMpi = Math.max(-90, Math.min(90, liveAnchorMpi));

  // 2. Compute baseline price across points
  const prices = inputPoints.map(p => p.salePrice);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);

  // 3. Generate raw MPI values for each time slice
  const rawValues: number[] = [];
  const count = inputPoints.length;

  for (let i = 0; i < count; i++) {
    const pt = inputPoints[i];
    const isLatest = i === count - 1;

    if (isLatest) {
      rawValues.push(liveAnchorMpi);
      continue;
    }

    // Relative price displacement vs average
    const priceDisp = avgPrice > 0 ? ((pt.salePrice - avgPrice) / avgPrice) * 100 : 0;
    
    // Consecutive slope
    const prevPrice = i > 0 ? inputPoints[i - 1].salePrice : pt.salePrice;
    const slope = prevPrice > 0 ? ((pt.salePrice - prevPrice) / prevPrice) * 100 : 0;

    // Spread position: 1 = at ask (buyer aggressive), 0 = at bid (seller aggressive)
    const spreadSpan = pt.floorAsk - pt.bestBid;
    let takerRatio = 0.5;
    if (spreadSpan > 0.000001) {
      takerRatio = Math.max(0, Math.min(1, (pt.salePrice - pt.bestBid) / spreadSpan));
    }
    const takerImpulse = (takerRatio - 0.5) * 60;

    // Time-based wave to reflect cyclical micro-trends
    const progress = i / (count - 1 || 1);
    const wave = Math.sin(progress * Math.PI * 2.2) * 20;

    // Blend components
    let pointMpi = (priceDisp * 6) + (slope * 12) + takerImpulse + wave;

    // Blend with target live anchor towards the end
    const anchorWeight = Math.pow(progress, 1.8);
    pointMpi = pointMpi * (1 - anchorWeight) + liveAnchorMpi * anchorWeight;

    rawValues.push(pointMpi);
  }

  // 4. Smooth values with forward EMA to ensure realistic oscillator continuity
  const smoothed: number[] = [];
  const alpha = 0.38;
  let prevSmoothed = rawValues[0] || 0;

  for (let i = 0; i < rawValues.length; i++) {
    if (i === 0) {
      smoothed.push(Math.round(rawValues[0]));
      prevSmoothed = rawValues[0];
    } else if (i === rawValues.length - 1) {
      // Keep latest point strictly calibrated to the live reading
      smoothed.push(Math.max(-100, Math.min(100, Math.round(rawValues[i]))));
    } else {
      const s = alpha * rawValues[i] + (1 - alpha) * prevSmoothed;
      smoothed.push(Math.max(-100, Math.min(100, Math.round(s))));
      prevSmoothed = s;
    }
  }

  // 5. Build output points & detect reversals
  const outputPoints: MpiPoint[] = [];

  for (let i = 0; i < count; i++) {
    const pt = inputPoints[i];
    const mpiVal = smoothed[i];
    const interpretation = getMpiInterpretation(mpiVal);

    let reversalAlert: MpiReversalAlert | undefined;
    if (i > 0) {
      reversalAlert = detectMpiReversal(smoothed[i - 1], mpiVal);
    }

    outputPoints.push({
      timestamp: pt.timestamp,
      timeLabel: pt.timeLabel,
      fullDateLabel: pt.fullDateLabel,
      mpi: mpiVal,
      rawMpi: rawValues[i],
      interpretation,
      reversalAlert,
      salePrice: pt.salePrice,
    });
  }

  const currentPoint = outputPoints[outputPoints.length - 1];
  const prevPoint = outputPoints[outputPoints.length - 2] || currentPoint;
  const currentMpi = currentPoint ? currentPoint.mpi : 0;
  const previousMpi = prevPoint ? prevPoint.mpi : currentMpi;
  const deltaMpi = currentMpi - previousMpi;

  // Active reversal is taken from the latest point, or recent 2 points if active
  const activeReversal = 
    currentPoint?.reversalAlert || 
    prevPoint?.reversalAlert || 
    null;

  // Summary statistics
  const mpiValues = outputPoints.map(p => p.mpi);
  const avgMpi = Math.round(mpiValues.reduce((a, b) => a + b, 0) / (mpiValues.length || 1));
  const maxMpi = Math.max(...mpiValues);
  const minMpi = Math.min(...mpiValues);
  const bullishCount = outputPoints.filter(p => p.mpi > 0).length;
  const bearishCount = outputPoints.filter(p => p.mpi < 0).length;

  return {
    points: outputPoints,
    currentMpi,
    currentInterpretation: getMpiInterpretation(currentMpi),
    previousMpi,
    deltaMpi,
    activeReversal,
    summaryStats: {
      avgMpi,
      maxMpi,
      minMpi,
      bullishPeriodsPercent: Math.round((bullishCount / (outputPoints.length || 1)) * 100),
      bearishPeriodsPercent: Math.round((bearishCount / (outputPoints.length || 1)) * 100),
    },
  };
}

// ============================================================================
// SMART ENTRY & EXIT RECOMMENDATION ENGINE (TRADE OPPORTUNITY ANALYZER - #9)
// ============================================================================

export type TradeEvaluationStatus = 'favorable' | 'caution' | 'unfavorable';

export interface TradeEvaluationCriterion {
  id: string;
  question: string;
  verdict: string;
  status: TradeEvaluationStatus;
  metric: string;
  detail: string;
}

export interface TradeExecutionSimulation {
  intendedQuantity: number;
  fillableQuantity: number;
  unfilledQuantity: number;
  coveragePercent: number;
  estimatedAvgPriceFlower: number;
  estimatedAvgPriceUSD: number;
  bestOrderPriceFlower: number;
  worstFillPriceFlower: number;
  totalCostOrProceedsFlower: number;
  netProceedsAfterTaxFlower: number;
  slippagePercent: number;
  ordersConsumed: number;
}

export type ExecutionRecommendationType =
  | 'Market Order (Immediate)'
  | 'Limit Order (Patient)'
  | 'Split / Scaled Orders'
  | 'Wait for Confirmation';

export interface TradeOpportunitySideAnalysis {
  side: 'buy' | 'sell';
  setupBadge: string;
  attractivenessStatus: TradeEvaluationStatus;
  preferredZoneLabel: string;
  preferredZoneFlower: string;
  preferredZoneLowFlower: number;
  preferredZoneHighFlower: number;
  secondaryLevelLabel: string;
  secondaryLevelFlower: number;
  invalidationLabel: string;
  invalidationLevelFlower: number;
  reasoning: string;
  executionRecommendation: ExecutionRecommendationType;
  simulation: TradeExecutionSimulation;
  criteria: TradeEvaluationCriterion[];
}

export interface TradeOpportunityAnalyzerResult {
  itemName: string;
  intendedQuantity: number;
  currentBestAskFlower: number;
  currentBestAskUSD: number;
  currentBestBidFlower: number;
  currentBestBidUSD: number;
  spreadPercent: number;
  recommendedFocus: 'buy' | 'sell' | 'neutral';
  buyAnalysis: TradeOpportunitySideAnalysis;
  sellAnalysis: TradeOpportunitySideAnalysis;
}

function formatTradePrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return '0.0000';
  if (price < 0.01) return price.toFixed(5);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(3);
}

function simulateOrderBookExecution(
  sortedOrders: { quantity: number; sfl: number; unitPrice: number }[],
  intendedQuantity: number,
  referencePrice: number,
  side: 'buy' | 'sell',
  flowerPriceUSD: number
): TradeExecutionSimulation {
  const targetQty = Math.max(1, Math.round(intendedQuantity));
  let remaining = targetQty;
  let filled = 0;
  let totalFlower = 0;
  let ordersConsumed = 0;
  let worstFill = referencePrice;

  for (const order of sortedOrders) {
    if (remaining <= 0) break;
    if (order.quantity <= 0 || order.unitPrice <= 0) continue;

    const takeQty = Math.min(remaining, order.quantity);
    filled += takeQty;
    totalFlower += takeQty * order.unitPrice;
    remaining -= takeQty;
    ordersConsumed += 1;
    worstFill = order.unitPrice;
  }

  const avgPrice = filled > 0 ? totalFlower / filled : referencePrice;
  const bestOrderPrice = sortedOrders[0]?.unitPrice || referencePrice;
  let slippagePct = 0;
  if (filled > 0 && bestOrderPrice > 0) {
    slippagePct =
      side === 'buy'
        ? Math.max(0, ((avgPrice - bestOrderPrice) / bestOrderPrice) * 100)
        : Math.max(0, ((bestOrderPrice - avgPrice) / bestOrderPrice) * 100);
  }

  const netAfterTax = side === 'sell' ? totalFlower * 0.9 : totalFlower;

  return {
    intendedQuantity: targetQty,
    fillableQuantity: Number(filled.toFixed(2)),
    unfilledQuantity: Number(Math.max(0, targetQty - filled).toFixed(2)),
    coveragePercent: Math.min(100, Math.round((filled / targetQty) * 100)),
    estimatedAvgPriceFlower: Number(avgPrice.toFixed(6)),
    estimatedAvgPriceUSD: Number((avgPrice * flowerPriceUSD).toFixed(4)),
    bestOrderPriceFlower: Number(bestOrderPrice.toFixed(6)),
    worstFillPriceFlower: Number(worstFill.toFixed(6)),
    totalCostOrProceedsFlower: Number(totalFlower.toFixed(4)),
    netProceedsAfterTaxFlower: Number(netAfterTax.toFixed(4)),
    slippagePercent: Number(slippagePct.toFixed(2)),
    ordersConsumed,
  };
}

/**
 * Evaluates actionable buy/sell price zones, invalidation levels, execution slippage
 * across the real order book for an intended trade quantity, and FarmIQ's 5 buyer +
 * 5 seller decision questions.
 */
export function calculateTradeOpportunityAnalysis(
  itemName: string,
  listings: any[] = [],
  offers: any[] = [],
  sales: any[] = [],
  smartSignals: SmartTradingSignals,
  intendedQuantity: number = 500,
  flowerPriceUSD: number = 0.1504
): TradeOpportunityAnalyzerResult {
  const cleanListings = listings
    .map(l => ({
      quantity: Number(l.quantity) || 0,
      sfl: Number(l.sfl) || 0,
      unitPrice: Number(l.unitPriceSFL) || (Number(l.quantity) ? Number(l.sfl) / Number(l.quantity) : 0),
    }))
    .filter(l => l.quantity > 0 && l.unitPrice > 0)
    .sort((a, b) => a.unitPrice - b.unitPrice);

  const cleanOffers = offers
    .map(o => ({
      quantity: Number(o.quantity) || 0,
      sfl: Number(o.sfl) || 0,
      unitPrice: Number(o.unitPriceSFL) || (Number(o.quantity) ? Number(o.sfl) / Number(o.quantity) : 0),
    }))
    .filter(o => o.quantity > 0 && o.unitPrice > 0)
    .sort((a, b) => b.unitPrice - a.unitPrice);

  const cleanSales = sales
    .map(s => {
      const qty = Number(s.quantity) || 1;
      const sfl = Number(s.sfl) || 0;
      return {
        fulfilledAt: Number(s.fulfilledAt) || 0,
        quantity: qty,
        sfl,
        unitPrice: qty > 0 ? sfl / qty : 0,
      };
    })
    .filter(s => s.unitPrice > 0)
    .sort((a, b) => b.fulfilledAt - a.fulfilledAt);

  const askPrice = smartSignals.floorPriceFlower || cleanListings[0]?.unitPrice || 0;
  const bidPrice = smartSignals.bestBidPriceFlower || cleanOffers[0]?.unitPrice || 0;
  const spreadPct = smartSignals.spreadPercent;

  const recentSalesSlice = cleanSales.slice(0, 12);
  const recentQtySum = recentSalesSlice.reduce((s, t) => s + t.quantity, 0);
  const recentVolSum = recentSalesSlice.reduce((s, t) => s + t.sfl, 0);
  const recentSalesVwap =
    recentQtySum > 0 ? recentVolSum / recentQtySum : smartSignals.lastSalePriceFlower || askPrice;

  const strongBuyWall = smartSignals.twoSidedDepth.strongBuyWalls[0]?.price;
  const strongSellWall = smartSignals.twoSidedDepth.strongSellWalls.find(w => w.price >= askPrice)?.price
    || smartSignals.twoSidedDepth.strongSellWalls[0]?.price;

  const pillars = smartSignals.signalIndicator.tripleConfirmation.pillars;
  const confirmedDir = smartSignals.signalIndicator.tripleConfirmation.confirmedDirection;

  // -------------------------------------------------------------------------
  // A. BUY SIDE SIMULATION & LEVELS
  // -------------------------------------------------------------------------
  const buySim = simulateOrderBookExecution(cleanListings, intendedQuantity, askPrice, 'buy', flowerPriceUSD);

  const rawBuyLow =
    strongBuyWall && strongBuyWall >= bidPrice * 0.85 && strongBuyWall <= (askPrice || strongBuyWall)
      ? Math.min(strongBuyWall, bidPrice * 0.992)
      : bidPrice * 0.985;
  const rawBuyHigh = askPrice > bidPrice ? Math.min(askPrice * 0.999, Math.max(rawBuyLow, bidPrice * 1.004)) : bidPrice;
  const buyZoneLow = Number(Math.max(0.00001, Math.min(rawBuyLow, rawBuyHigh)).toFixed(5));
  const buyZoneHigh = Number(Math.max(buyZoneLow, rawBuyHigh).toFixed(5));
  const preferredBuyZoneFlower = `${formatTradePrice(buyZoneLow)}–${formatTradePrice(buyZoneHigh)}`;

  const buyResistanceFlower = Number(
    (strongSellWall && strongSellWall > askPrice ? strongSellWall : askPrice * 1.05).toFixed(5)
  );
  const buyInvalidationFlower = Number(Math.max(0.00001, buyZoneLow * 0.96).toFixed(5));

  // Buyer 5 Evaluation Criteria
  const askVsSalesPct = recentSalesVwap > 0 ? ((askPrice - recentSalesVwap) / recentSalesVwap) * 100 : 0;
  const qBuy1Status: TradeEvaluationStatus =
    recentSalesSlice.length < 2
      ? 'caution'
      : askVsSalesPct <= -1.0
      ? 'favorable'
      : askVsSalesPct <= 2.0
      ? 'caution'
      : 'unfavorable';

  const qBuy2Status: TradeEvaluationStatus =
    buySim.coveragePercent >= 100 && buySim.slippagePercent <= 2.5
      ? 'favorable'
      : buySim.coveragePercent >= 70
      ? 'caution'
      : 'unfavorable';

  const demandTrend = smartSignals.signalIndicator.demandTrend;
  const buyPressurePct = smartSignals.signalIndicator.buyPressurePercent;
  const qBuy3Status: TradeEvaluationStatus =
    demandTrend === 'Increasing' && buyPressurePct >= 52
      ? 'favorable'
      : demandTrend === 'Decreasing' || buyPressurePct < 45
      ? 'unfavorable'
      : 'caution';

  const overheadHeadroomPct = askPrice > 0 ? ((buyResistanceFlower - askPrice) / askPrice) * 100 : 0;
  const immediateResistanceBlocked = Boolean(strongSellWall && overheadHeadroomPct < 2.5);
  const qBuy4Status: TradeEvaluationStatus =
    !immediateResistanceBlocked && overheadHeadroomPct >= 5
      ? 'favorable'
      : immediateResistanceBlocked
      ? 'unfavorable'
      : 'caution';

  const qBuy5Status: TradeEvaluationStatus =
    buySim.fillableQuantity === 0
      ? 'unfavorable'
      : buySim.slippagePercent <= 1.5
      ? 'favorable'
      : buySim.slippagePercent <= 4.5
      ? 'caution'
      : 'unfavorable';

  const buyCriteria: TradeEvaluationCriterion[] = [
    {
      id: 'buy-ask-vs-sales',
      question: 'Is the current ask attractive relative to recent completed sales?',
      verdict:
        recentSalesSlice.length < 2
          ? 'Limited recent trades'
          : askVsSalesPct <= -1.0
          ? `Discounted (-${Math.abs(askVsSalesPct).toFixed(1)}%)`
          : askVsSalesPct <= 2.0
          ? `Near fair value (${askVsSalesPct >= 0 ? '+' : ''}${askVsSalesPct.toFixed(1)}%)`
          : `Premium (+${askVsSalesPct.toFixed(1)}%)`,
      status: qBuy1Status,
      metric: `Ask ${formatTradePrice(askPrice)} vs Avg ${formatTradePrice(recentSalesVwap)}`,
      detail:
        recentSalesSlice.length < 2
          ? `Only ${recentSalesSlice.length} completed sale(s) observed; wait for price discovery.`
          : askVsSalesPct <= -1.0
          ? `Floor ask is ${Math.abs(askVsSalesPct).toFixed(1)}% below recent settled VWAP (${formatTradePrice(recentSalesVwap)} FLOWER).`
          : `Floor ask sits ${askVsSalesPct >= 0 ? `${askVsSalesPct.toFixed(1)}% above` : `${Math.abs(askVsSalesPct).toFixed(1)}% below`} recent completed sales VWAP.`,
    },
    {
      id: 'buy-liquidity',
      question: 'Is there sufficient liquidity to acquire the desired quantity?',
      verdict:
        buySim.coveragePercent === 100
          ? 'Full fill available'
          : buySim.coveragePercent >= 50
          ? `Partial book fill (${buySim.coveragePercent}%)`
          : 'Insufficient ask depth',
      status: qBuy2Status,
      metric: `${buySim.fillableQuantity.toLocaleString()} / ${buySim.intendedQuantity.toLocaleString()} fillable`,
      detail:
        buySim.coveragePercent === 100
          ? `Visible asks cover all ${buySim.intendedQuantity.toLocaleString()} ${itemName} across ${buySim.ordersConsumed} listing(s).`
          : `Visible asks can only fill ${buySim.fillableQuantity.toLocaleString()} ${itemName} (${buySim.unfilledQuantity.toLocaleString()} short).`,
    },
    {
      id: 'buy-bid-strength',
      question: 'Is the bid side strengthening?',
      verdict:
        qBuy3Status === 'favorable'
          ? 'Bids strengthening'
          : qBuy3Status === 'caution'
          ? 'Steady / mixed'
          : 'Bids softening',
      status: qBuy3Status,
      metric: `${demandTrend} • ${buyPressurePct}% Buy Depth`,
      detail: `Buyers represent ${buyPressurePct}% of visible depth with demand ${demandTrend.toLowerCase()} and ${pillars.supplyAndDemand.metricBadge} near-spread imbalance.`,
    },
    {
      id: 'buy-overhead-resistance',
      question: 'Is there resistance immediately above the entry price?',
      verdict: immediateResistanceBlocked
        ? `Tight ceiling (+${overheadHeadroomPct.toFixed(1)}%)`
        : overheadHeadroomPct >= 5
        ? `Clear headroom (+${overheadHeadroomPct.toFixed(1)}%)`
        : `Moderate ceiling (+${overheadHeadroomPct.toFixed(1)}%)`,
      status: qBuy4Status,
      metric: `Resistance @ ${formatTradePrice(buyResistanceFlower)}`,
      detail: immediateResistanceBlocked
        ? `A heavy sell wall sits just ${overheadHeadroomPct.toFixed(1)}% above floor ask at ${formatTradePrice(buyResistanceFlower)} FLOWER, capping immediate upside.`
        : `Nearest major resistance sits ${overheadHeadroomPct.toFixed(1)}% above floor at ${formatTradePrice(buyResistanceFlower)} FLOWER.`,
    },
    {
      id: 'buy-avg-execution',
      question: 'What is the estimated average execution price?',
      verdict:
        buySim.fillableQuantity === 0
          ? 'No active asks'
          : buySim.slippagePercent <= 0.5
          ? 'Minimal slippage'
          : `+${buySim.slippagePercent}% book slippage`,
      status: qBuy5Status,
      metric: `${formatTradePrice(buySim.estimatedAvgPriceFlower)} FLOWER (≈ $${buySim.estimatedAvgPriceUSD.toFixed(4)})`,
      detail:
        buySim.fillableQuantity > 0
          ? `Sweeping ${buySim.fillableQuantity.toLocaleString()} units costs ~${buySim.totalCostOrProceedsFlower} FLOWER total (worst tier: ${formatTradePrice(buySim.worstFillPriceFlower)} FLOWER).`
          : 'No sell listings available to estimate market execution.',
    },
  ];

  // Determine Buyer setup & reasoning
  let buyRec: ExecutionRecommendationType = 'Limit Order (Patient)';
  let buyBadge = 'Limit Accumulation Setup';
  let buyAttractiveness: TradeEvaluationStatus = 'caution';
  const txConfirmBullish = pillars.transactionConfirmation.bias === 'bullish';

  if (buySim.coveragePercent < 50 || cleanListings.length === 0) {
    buyRec = 'Wait for Confirmation';
    buyBadge = 'Thin Ask Liquidity';
    buyAttractiveness = 'unfavorable';
  } else if (confirmedDir === 'buy' && spreadPct <= 3 && buySim.slippagePercent <= 2) {
    buyRec = 'Market Order (Immediate)';
    buyBadge = 'Confirmed Buy Setup';
    buyAttractiveness = 'favorable';
  } else if (buyPressurePct >= 55 && !txConfirmBullish) {
    buyRec = 'Wait for Confirmation';
    buyBadge = 'Watch Entry Zone';
    buyAttractiveness = 'caution';
  } else if (buySim.slippagePercent > 3 || spreadPct > 3) {
    buyRec = 'Split / Scaled Orders';
    buyBadge = 'Patient Limit Bid Setup';
    buyAttractiveness = qBuy1Status === 'favorable' ? 'favorable' : 'caution';
  }

  let buyReasoning = '';
  if (buyPressurePct >= 55 && !txConfirmBullish) {
    buyReasoning = `Buyer depth (${buyPressurePct}%) is concentrated near ${preferredBuyZoneFlower} FLOWER. However, wait for completed transactions to confirm that demand is genuine before lifting the ${formatTradePrice(askPrice)} ask.`;
  } else if (confirmedDir === 'buy' && !immediateResistanceBlocked) {
    buyReasoning = `Rising trades and ${buyPressurePct}% buyer depth support entries near ${preferredBuyZoneFlower} FLOWER with upside room toward ${formatTradePrice(buyResistanceFlower)} resistance. A drop below ${formatTradePrice(buyInvalidationFlower)} invalidates the setup.`;
  } else if (buySim.slippagePercent > 3) {
    buyReasoning = `Acquiring ${buySim.intendedQuantity.toLocaleString()} ${itemName} at market pushes your average fill to ${formatTradePrice(buySim.estimatedAvgPriceFlower)} FLOWER (+${buySim.slippagePercent}% slippage). Stagger limit bids in the ${preferredBuyZoneFlower} zone instead.`;
  } else {
    buyReasoning = `Target limit bids inside ${preferredBuyZoneFlower} FLOWER where bid support clusters. Watch ${formatTradePrice(buyResistanceFlower)} for overhead supply and cut/re-evaluate below ${formatTradePrice(buyInvalidationFlower)}.`;
  }

  // -------------------------------------------------------------------------
  // B. SELL SIDE SIMULATION & LEVELS
  // -------------------------------------------------------------------------
  const sellSim = simulateOrderBookExecution(cleanOffers, intendedQuantity, bidPrice, 'sell', flowerPriceUSD);

  const rawSellLow = Math.max(bidPrice, askPrice * 0.99);
  const rawSellHigh = strongSellWall && strongSellWall >= askPrice
    ? Math.min(strongSellWall * 0.996, askPrice * 1.04)
    : askPrice * 1.025;
  const sellZoneLow = Number(Math.max(0.00001, Math.min(rawSellLow, rawSellHigh)).toFixed(5));
  const sellZoneHigh = Number(Math.max(sellZoneLow, rawSellHigh).toFixed(5));
  const preferredSellZoneFlower = `${formatTradePrice(sellZoneLow)}–${formatTradePrice(sellZoneHigh)}`;

  const sellSupportFlower = Number((strongBuyWall || bidPrice * 0.975).toFixed(5));
  const sellInvalidationFlower = Number(Math.max(0.00001, sellSupportFlower * 0.96).toFixed(5));

  // Seller 5 Evaluation Criteria
  const qSell1Status: TradeEvaluationStatus =
    sellSim.coveragePercent >= 100 && sellSim.slippagePercent <= 3
      ? 'favorable'
      : sellSim.coveragePercent >= 60
      ? 'caution'
      : 'unfavorable';

  const bidVsSalesPct = recentSalesVwap > 0 ? ((bidPrice - recentSalesVwap) / recentSalesVwap) * 100 : 0;
  const qSell2Status: TradeEvaluationStatus =
    bidPrice <= 0
      ? 'unfavorable'
      : spreadPct <= 3 && bidVsSalesPct >= -2.5
      ? 'favorable'
      : spreadPct <= 6 && bidVsSalesPct >= -5
      ? 'caution'
      : 'unfavorable';

  const immediateSellBetter = spreadPct <= 2.2 && (confirmedDir === 'sell' || pillars.priceDirection.bias === 'bearish');
  const limitSellAdvantagePct = bidPrice > 0 ? Math.max(0, ((sellZoneLow - bidPrice) / bidPrice) * 100) : 0;
  const qSell3Status: TradeEvaluationStatus = immediateSellBetter ? 'favorable' : 'caution';

  const qSell4Status: TradeEvaluationStatus =
    pillars.priceDirection.bias === 'bullish'
      ? 'favorable'
      : pillars.priceDirection.bias === 'bearish'
      ? 'unfavorable'
      : 'caution';

  const qSell5Status: TradeEvaluationStatus =
    sellSim.fillableQuantity === 0
      ? 'unfavorable'
      : sellSim.slippagePercent <= 2.0
      ? 'favorable'
      : sellSim.slippagePercent <= 5.5
      ? 'caution'
      : 'unfavorable';

  const sellCriteria: TradeEvaluationCriterion[] = [
    {
      id: 'sell-buyer-absorption',
      question: 'Is there sufficient buyer demand to absorb the intended quantity?',
      verdict:
        sellSim.coveragePercent === 100
          ? 'Full absorption'
          : sellSim.coveragePercent >= 50
          ? `Partial absorption (${sellSim.coveragePercent}%)`
          : 'Shallow bid book',
      status: qSell1Status,
      metric: `${sellSim.fillableQuantity.toLocaleString()} / ${sellSim.intendedQuantity.toLocaleString()} absorbed`,
      detail:
        sellSim.coveragePercent === 100
          ? `Active bids can absorb all ${sellSim.intendedQuantity.toLocaleString()} ${itemName} across ${sellSim.ordersConsumed} bid order(s).`
          : `Active bids can only absorb ${sellSim.fillableQuantity.toLocaleString()} ${itemName} right now (${sellSim.unfilledQuantity.toLocaleString()} excess).`,
    },
    {
      id: 'sell-bid-competitive',
      question: 'Is the current best bid competitive?',
      verdict:
        qSell2Status === 'favorable'
          ? 'Competitive bid'
          : qSell2Status === 'caution'
          ? 'Moderate discount'
          : 'Weak / wide discount',
      status: qSell2Status,
      metric: `Bid ${formatTradePrice(bidPrice)} (${bidVsSalesPct >= 0 ? '+' : ''}${bidVsSalesPct.toFixed(1)}% vs Avg)`,
      detail: `Best bid (${formatTradePrice(bidPrice)} FLOWER) sits ${spreadPct}% below the floor ask and nets ${formatTradePrice(bidPrice * 0.9)} FLOWER/unit after the 10% market fee.`,
    },
    {
      id: 'sell-instant-vs-limit',
      question: 'Is selling immediately better than placing a limit sell order?',
      verdict: immediateSellBetter ? 'Market sell favored' : `Limit ask saves +${limitSellAdvantagePct.toFixed(1)}%`,
      status: qSell3Status,
      metric: immediateSellBetter
        ? `Tight ${spreadPct}% spread`
        : `Target Limit @ ${formatTradePrice(sellZoneLow)}`,
      detail: immediateSellBetter
        ? `Spread is tight (${spreadPct}%) while price momentum is softening — hitting bids avoids getting undercut in a race to the floor.`
        : `Placing a limit sell near ${preferredSellZoneFlower} FLOWER preserves ~${limitSellAdvantagePct.toFixed(1)}% vs dumping into active bids.`,
    },
    {
      id: 'sell-price-trend',
      question: 'Is the market price rising or weakening?',
      verdict: pillars.priceDirection.statusLabel,
      status: qSell4Status,
      metric: pillars.priceDirection.metricBadge,
      detail: pillars.priceDirection.detail,
    },
    {
      id: 'sell-slippage',
      question: 'How much slippage will occur if the user sells a large quantity?',
      verdict:
        sellSim.fillableQuantity === 0
          ? 'No active bids'
          : sellSim.slippagePercent <= 1.0
          ? `Minimal (-${sellSim.slippagePercent}%)`
          : `-${sellSim.slippagePercent}% bid slippage`,
      status: qSell5Status,
      metric: `Avg ${formatTradePrice(sellSim.estimatedAvgPriceFlower)} • Net ${sellSim.netProceedsAfterTaxFlower} F`,
      detail:
        sellSim.fillableQuantity > 0
          ? `Market selling ${sellSim.fillableQuantity.toLocaleString()} units walks ${sellSim.ordersConsumed} bid tier(s) down to ${formatTradePrice(sellSim.worstFillPriceFlower)} FLOWER (10% fee already deducted in net).`
          : 'No open buyer bids available to execute an immediate sale.',
    },
  ];

  let sellRec: ExecutionRecommendationType = 'Limit Order (Patient)';
  let sellBadge = 'Limit Exit Setup';
  let sellAttractiveness: TradeEvaluationStatus = 'caution';

  if (sellSim.coveragePercent < 50 || cleanOffers.length === 0) {
    sellRec = 'Limit Order (Patient)';
    sellBadge = 'Shallow Bid Book — Use Limit Ask';
    sellAttractiveness = 'unfavorable';
  } else if (immediateSellBetter && sellSim.slippagePercent <= 2.5) {
    sellRec = 'Market Order (Immediate)';
    sellBadge = 'Confirmed Sell Setup';
    sellAttractiveness = 'favorable';
  } else if (sellSim.slippagePercent > 3.5) {
    sellRec = 'Split / Scaled Orders';
    sellBadge = 'Staggered Limit Exits';
    sellAttractiveness = 'caution';
  } else if (confirmedDir === 'sell') {
    sellRec = 'Limit Order (Patient)';
    sellBadge = 'Distribution Exit Window';
    sellAttractiveness = 'favorable';
  }

  let sellReasoning = '';
  if (sellSim.slippagePercent > 3.5) {
    sellReasoning = `Market-selling ${sellSim.intendedQuantity.toLocaleString()} ${itemName} sweeps ${sellSim.ordersConsumed} bid tiers and causes -${sellSim.slippagePercent}% slippage down to ${formatTradePrice(sellSim.worstFillPriceFlower)} FLOWER. Ladder limit asks inside ${preferredSellZoneFlower} instead.`;
  } else if (immediateSellBetter) {
    sellReasoning = `Spread is only ${spreadPct}% while price/supply trend shows selling pressure. Filling active bids down to ${formatTradePrice(sellSupportFlower)} captures liquidity cleanly before bids retreat.`;
  } else {
    sellReasoning = `Limit asks placed inside ${preferredSellZoneFlower} FLOWER capture better execution above the ${formatTradePrice(bidPrice)} best bid. Re-evaluate if support at ${formatTradePrice(sellSupportFlower)} (invalidation ${formatTradePrice(sellInvalidationFlower)}) breaks.`;
  }

  const recommendedFocus: 'buy' | 'sell' | 'neutral' =
    confirmedDir === 'sell' || smartSignals.signalIndicator.state === 'Sell' || smartSignals.signalIndicator.state === 'Strong Sell'
      ? 'sell'
      : confirmedDir === 'buy' || smartSignals.signalIndicator.state === 'Buy' || smartSignals.signalIndicator.state === 'Strong Buy'
      ? 'buy'
      : 'neutral';

  return {
    itemName,
    intendedQuantity: Math.max(1, Math.round(intendedQuantity)),
    currentBestAskFlower: Number(askPrice.toFixed(6)),
    currentBestAskUSD: Number((askPrice * flowerPriceUSD).toFixed(4)),
    currentBestBidFlower: Number(bidPrice.toFixed(6)),
    currentBestBidUSD: Number((bidPrice * flowerPriceUSD).toFixed(4)),
    spreadPercent: spreadPct,
    recommendedFocus,
    buyAnalysis: {
      side: 'buy',
      setupBadge: buyBadge,
      attractivenessStatus: buyAttractiveness,
      preferredZoneLabel: 'Preferred buy zone',
      preferredZoneFlower: preferredBuyZoneFlower,
      preferredZoneLowFlower: buyZoneLow,
      preferredZoneHighFlower: buyZoneHigh,
      secondaryLevelLabel: 'Resistance level',
      secondaryLevelFlower: buyResistanceFlower,
      invalidationLabel: 'Invalidation level',
      invalidationLevelFlower: buyInvalidationFlower,
      reasoning: buyReasoning,
      executionRecommendation: buyRec,
      simulation: buySim,
      criteria: buyCriteria,
    },
    sellAnalysis: {
      side: 'sell',
      setupBadge: sellBadge,
      attractivenessStatus: sellAttractiveness,
      preferredZoneLabel: 'Preferred sell zone',
      preferredZoneFlower: preferredSellZoneFlower,
      preferredZoneLowFlower: sellZoneLow,
      preferredZoneHighFlower: sellZoneHigh,
      secondaryLevelLabel: 'Support level',
      secondaryLevelFlower: sellSupportFlower,
      invalidationLabel: 'Invalidation level',
      invalidationLevelFlower: sellInvalidationFlower,
      reasoning: sellReasoning,
      executionRecommendation: sellRec,
      simulation: sellSim,
      criteria: sellCriteria,
    },
  };
}

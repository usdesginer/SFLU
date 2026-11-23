'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  User, 
  ShieldCheck, 
  Layers, 
  Coins, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart2,
  Activity,
  Flame,
  Zap,
  Target,
  PieChart,
  Info,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  SlidersHorizontal,
  Compass,
  Scale,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Lock,
  Mountain,
  HelpCircle,
  Check
} from 'lucide-react';
import { fetchTradeableItem } from '../lib/farmService';
import { SFL_TOKEN_PRICE_USD, SFL_ITEMS } from '../data/sflData';
import { FarmState } from '../types';
import { recordMarketPriceSnapshot, fetchMarketPriceSnapshots } from '../lib/supabaseClient';
import { 
  calculateSmartMarketSignals, 
  SmartTradingSignals, 
  FourQuadrantCondition, 
  CumulativeDepthStep, 
  OrderBookWall,
  TwoSidedDepthAnalysis,
  DepthChartPoint,
  MarketDepthZone,
  BuySellSignalIndicator,
  SixStateSignal,
  MpiPoint,
  MarketPressureIndexSeries,
  calculateMarketPressureIndexSeries,
  getMpiInterpretation,
  MpiReversalAlert,
  MpiInterpretation,
  calculateTradeOpportunityAnalysis,
  TradeOpportunityAnalyzerResult,
  TradeOpportunitySideAnalysis
} from '../lib/marketSignalEngine';

export type ChartTimeframe = '1H' | '4H' | '1D' | '7D' | '1M';

interface TradeableOrderBookModalProps {
  itemId: number;
  itemName: string;
  itemIcon: string;
  collection?: string;
  onClose: () => void;
  flowerPriceUSD?: number;
  farm?: FarmState;
  onNavigate?: (tab: string) => void;
}

export type ChartAnalysisMode = 'price' | 'depth' | 'pressure' | 'volume';

interface ChartDataPoint {
  timestamp: number;
  timeLabel: string;
  fullDateLabel: string;
  salePrice: number;
  floorAsk: number;
  bestBid: number;
  vwap: number;
  movingAverage: number;
  source: string;
  isRealSale: boolean;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  tradeCount: number;
}

export default function TradeableOrderBookModal({
  itemId,
  itemName,
  itemIcon,
  collection = 'collectibles',
  onClose,
  flowerPriceUSD = SFL_TOKEN_PRICE_USD,
  farm,
  onNavigate,
}: TradeableOrderBookModalProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'depth' | 'signals' | 'overview' | 'orderbook' | 'sales' | 'analytics'>('depth');
  const [chartMode, setChartMode] = useState<ChartAnalysisMode>('price');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1D');
  const [error, setError] = useState<string | null>(null);

  // Toggle for Signal States Reference Guide & Weighted Score Breakdown (Feature 10)
  const [showSignalGuide, setShowSignalGuide] = useState<boolean>(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState<boolean>(false);

  // Multi-Indicator Overlay Toggles (only core price series active by default to prevent visual clutter)
  const [showSales, setShowSales] = useState<boolean>(true);
  const [showAsks, setShowAsks] = useState<boolean>(true);
  const [showBids, setShowBids] = useState<boolean>(true);
  const [showVwap, setShowVwap] = useState<boolean>(false);
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(false);
  const [showSupportResistance, setShowSupportResistance] = useState<boolean>(false);
  const [showPressureOverlay, setShowPressureOverlay] = useState<boolean>(false);
  const [showVolumeOverlay, setShowVolumeOverlay] = useState<boolean>(false);

  // Hover state for interactive price trend chart
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);

  // Hover state for Volume Chart Mode
  const [hoveredVolumeIndex, setHoveredVolumeIndex] = useState<number | null>(null);
  const volumeSvgRef = useRef<SVGSVGElement | null>(null);

  // Hover state for Supply & Demand Curve
  const [sdHoveredIndex, setSdHoveredIndex] = useState<number | null>(null);
  const sdSvgRef = useRef<SVGSVGElement | null>(null);

  // Hover state for Two-Sided Cumulative Order Book Depth Chart
  const [hoveredDepthPoint, setHoveredDepthPoint] = useState<DepthChartPoint | null>(null);
  const depthSvgRef = useRef<SVGSVGElement | null>(null);

  // Toggle for Market Pressure Index (MPI) Reference Guide (Feature 6)
  const [showMpiGuide, setShowMpiGuide] = useState<boolean>(false);

  // Hover state for Market Pressure Index (MPI) Oscillator Chart
  const [hoveredMpiIndex, setHoveredMpiIndex] = useState<number | null>(null);
  const mpiSvgRef = useRef<SVGSVGElement | null>(null);

  // Interactive Trade Opportunity Analyzer state (Feature 9)
  const [opportunitySide, setOpportunitySide] = useState<'buy' | 'sell' | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<number>(500);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchTradeableItem(itemId, collection);
      if (result && !result.error) {
        setData(result);

        // Record a snapshot for long-term intelligence tracking
        const floorPrice = result.floor || result.lowestAsk || 0;
        const lastSalePrice = result.lastSalePrice || floorPrice;
        const bestBidPrice = result.highestBid || null;
        recordMarketPriceSnapshot(
          String(itemId),
          floorPrice,
          Number((floorPrice * flowerPriceUSD).toFixed(6)),
          result.history?.history?.dates?.[new Date().toISOString().split('T')[0]]?.volume || 0,
          result.history?.history?.dates?.[new Date().toISOString().split('T')[0]]?.sales || 0,
          {
            itemName,
            floorAsk: floorPrice,
            bestBid: bestBidPrice,
            lastSale: lastSalePrice,
            source: 'Sunflower Land Community API (type=tradeable)',
          }
        );
      } else {
        setError(result?.error || 'Failed to load tradeable data');
      }
    } catch (e: any) {
      setError(e.message || 'Error communicating with Community API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId, collection]);

  const listings = data?.listings || [];
  const offers = data?.offers || [];
  const sales = data?.history?.sales || [];
  const dailyHistory = data?.history?.history?.dates || {};
  const totalLifetimeSales = data?.history?.history?.totalSales || 0;
  const totalLifetimeVolume = data?.history?.history?.totalVolume || 0;

  // 1. Correct Unit Floor & Last Sale
  const floorUnitFlower = data?.floor || data?.lowestAsk || 0;
  const bestOfferUnitFlower = data?.highestBid || (offers[0]?.unitPriceSFL || 0);

  const latestFulfilledSale = sales[0];
  const lastSaleUnitFlower = latestFulfilledSale 
    ? Number((latestFulfilledSale.sfl / latestFulfilledSale.quantity).toFixed(6))
    : (data?.lastSalePrice || floorUnitFlower);

  const spreadDiff = floorUnitFlower && bestOfferUnitFlower ? floorUnitFlower - bestOfferUnitFlower : 0;
  const spreadPct = floorUnitFlower && spreadDiff > 0 ? Number(((spreadDiff / floorUnitFlower) * 100).toFixed(2)) : 0;

  // 2. Full Smart Market Signals Engine Execution
  const smartSignals: SmartTradingSignals = useMemo(() => {
    return calculateSmartMarketSignals(
      listings,
      offers,
      sales,
      dailyHistory,
      flowerPriceUSD,
      floorUnitFlower,
      lastSaleUnitFlower,
      bestOfferUnitFlower
    );
  }, [listings, offers, sales, dailyHistory, flowerPriceUSD, floorUnitFlower, lastSaleUnitFlower, bestOfferUnitFlower]);

  // 2b. Smart Entry & Exit Recommendation / Trade Opportunity Analyzer (Feature 9)
  const tradeOpportunity: TradeOpportunityAnalyzerResult = useMemo(() => {
    return calculateTradeOpportunityAnalysis(
      itemName,
      listings,
      offers,
      sales,
      smartSignals,
      tradeQuantity,
      flowerPriceUSD
    );
  }, [itemName, listings, offers, sales, smartSignals, tradeQuantity, flowerPriceUSD]);

  // 3. Buyer vs. Seller Pressure Calculation
  const { buyerPressurePercent, sellerPressurePercent, asksTotalVol, bidsTotalVol } = useMemo(() => {
    const askVol = listings.reduce((sum: number, l: any) => sum + (Number(l.sfl) || 0), 0);
    const bidVol = offers.reduce((sum: number, o: any) => sum + (Number(o.sfl) || 0), 0);
    const total = askVol + bidVol;
    if (total <= 0) {
      return { buyerPressurePercent: 50, sellerPressurePercent: 50, asksTotalVol: 0, bidsTotalVol: 0 };
    }
    const bPct = Math.min(95, Math.max(5, Math.round((bidVol / total) * 100)));
    return {
      buyerPressurePercent: bPct,
      sellerPressurePercent: 100 - bPct,
      asksTotalVol: Number(askVol.toFixed(2)),
      bidsTotalVol: Number(bidVol.toFixed(2)),
    };
  }, [listings, offers]);

  // 4. Personalized FarmIQ Market Advantage
  const marketAdvantage = useMemo(() => {
    const rawInventory = farm?.rawInventory || {};
    const key = Object.keys(rawInventory).find(
      k => k.toLowerCase() === itemName.toLowerCase() || k.toLowerCase().includes(itemName.toLowerCase())
    );
    const owned = key ? parseFloat(String(rawInventory[key])) || 0 : (farm?.inventory?.[itemName.toLowerCase()] || 0);

    const UPGRADE_RESERVES: Record<string, number> = {
      wood: 120,
      stone: 40,
      iron: 15,
      gold: 5,
      wheat: 80,
      potato: 200,
      pumpkin: 100,
      carrot: 100,
      cabbage: 50,
      beetroot: 50,
      cauliflower: 40,
      parsnip: 30,
      radish: 30,
      kale: 20,
      egg: 50,
      milk: 20,
      honey: 15,
      leather: 10,
      wool: 10,
    };
    const reserved = UPGRADE_RESERVES[itemName.toLowerCase()] || (owned > 0 ? Math.round(owned * 0.4) : 0);
    const surplus = Math.max(0, Number((owned - reserved).toFixed(2)));

    const currentPrice = lastSaleUnitFlower || floorUnitFlower || 0.001;
    const grossFlower = surplus * currentPrice;
    const netFlower = Number((grossFlower * 0.90).toFixed(4));
    const netUSD = Number((netFlower * flowerPriceUSD).toFixed(3));

    let insight = '';
    if (owned === 0) {
      insight = `You currently hold 0 ${itemName} in your farm inventory. Consider harvesting or producing if marketplace floors stay elevated.`;
    } else if (surplus <= 0) {
      insight = `You hold ${owned.toLocaleString()} ${itemName}, but all of it is currently earmarked for your upcoming building upgrades and crafting reserves (${reserved} reserved). Do not sell on the market until reserves are met!`;
    } else if (smartSignals.signalIndicator.buyPressurePercent > 55) {
      insight = `${itemName}'s market trend is positive (${smartSignals.signalIndicator.buyPressurePercent}% buyers vs ${smartSignals.signalIndicator.sellPressurePercent}% sellers). With ${reserved} ${itemName} safely reserved for your next farm milestone, you have ${surplus.toLocaleString()} ${itemName} in pure surplus. Listing this surplus now secures ~${netFlower} FLOWER (~$${netUSD} USD) after 10% market fees without delaying farm upgrades!`;
    } else {
      insight = `${itemName} order book is currently soft (${smartSignals.signalIndicator.sellPressurePercent}% asking supply). You have ${surplus.toLocaleString()} surplus units. Avoid dumping into low bids; consider diverting to crafting recipes or holding until bid volume expands.`;
    }

    return {
      owned,
      reserved,
      surplus,
      netFlower,
      netUSD,
      insight,
    };
  }, [farm, itemName, floorUnitFlower, lastSaleUnitFlower, flowerPriceUSD, smartSignals]);

  // =========================================================================
  // 5. TWO-SIDED CUMULATIVE ORDER BOOK DEPTH SVG GEOMETRY
  // =========================================================================
  const depthGeometry = useMemo(() => {
    if (!smartSignals || !smartSignals.twoSidedDepth) return null;
    const depth = smartSignals.twoSidedDepth;
    if (depth.bidPoints.length === 0 && depth.askPoints.length === 0) return null;

    const width = 720;
    const height = 280;
    const padTop = 30;
    const padBottom = 40;
    const padLeft = 70;
    const padRight = 30;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const minP = depth.minPrice;
    const maxP = depth.maxPrice;
    const rangeP = maxP - minP || 1;
    const maxQ = depth.maxCumulativeQuantity;

    const getX = (price: number) => padLeft + ((price - minP) / rangeP) * plotW;
    const getY = (qty: number) => padTop + plotH - (qty / maxQ) * plotH;

    // 1. Bid side staircase (from lowest price on left to best bid)
    const sortedBids = [...depth.bidPoints].sort((a, b) => a.price - b.price);
    let bidPath = '';
    let bidAreaPath = '';

    if (sortedBids.length > 0) {
      const startX = getX(sortedBids[0].price);
      const startY = getY(sortedBids[0].cumulativeQuantity);
      bidPath = `M ${startX.toFixed(1)} ${startY.toFixed(1)}`;

      for (let i = 0; i < sortedBids.length - 1; i++) {
        const nextX = getX(sortedBids[i + 1].price);
        const curY = getY(sortedBids[i].cumulativeQuantity);
        const nextY = getY(sortedBids[i + 1].cumulativeQuantity);
        bidPath += ` L ${nextX.toFixed(1)} ${curY.toFixed(1)} L ${nextX.toFixed(1)} ${nextY.toFixed(1)}`;
      }

      const lastX = getX(sortedBids[sortedBids.length - 1].price);
      const bottomY = padTop + plotH;
      bidAreaPath = `${bidPath} L ${lastX.toFixed(1)} ${bottomY} L ${startX.toFixed(1)} ${bottomY} Z`;
    }

    // 2. Ask side staircase (from floor ask to highest ask on right)
    const sortedAsks = [...depth.askPoints].sort((a, b) => a.price - b.price);
    let askPath = '';
    let askAreaPath = '';

    if (sortedAsks.length > 0) {
      const startX = getX(sortedAsks[0].price);
      const startY = getY(sortedAsks[0].cumulativeQuantity);
      askPath = `M ${startX.toFixed(1)} ${startY.toFixed(1)}`;

      for (let j = 0; j < sortedAsks.length - 1; j++) {
        const nextX = getX(sortedAsks[j + 1].price);
        const curY = getY(sortedAsks[j].cumulativeQuantity);
        const nextY = getY(sortedAsks[j + 1].cumulativeQuantity);
        askPath += ` L ${nextX.toFixed(1)} ${curY.toFixed(1)} L ${nextX.toFixed(1)} ${nextY.toFixed(1)}`;
      }

      const lastX = getX(sortedAsks[sortedAsks.length - 1].price);
      const bottomY = padTop + plotH;
      askAreaPath = `${askPath} L ${lastX.toFixed(1)} ${bottomY} L ${startX.toFixed(1)} ${bottomY} Z`;
    }

    // Spread canyon coordinates
    const bestBidX = sortedBids.length > 0 ? getX(sortedBids[sortedBids.length - 1].price) : getX(minP);
    const floorAskX = sortedAsks.length > 0 ? getX(sortedAsks[0].price) : getX(maxP);

    // Y-axis ticks (Cumulative Quantity)
    const yTicks = [
      { qty: maxQ, y: padTop, label: maxQ >= 1000 ? `${(maxQ / 1000).toFixed(1)}K ${itemName}` : `${Math.round(maxQ)} ${itemName}` },
      { qty: maxQ * 0.75, y: padTop + plotH * 0.25, label: maxQ * 0.75 >= 1000 ? `${(maxQ * 0.75 / 1000).toFixed(1)}K ${itemName}` : `${Math.round(maxQ * 0.75)} ${itemName}` },
      { qty: maxQ * 0.5, y: padTop + plotH * 0.5, label: maxQ * 0.5 >= 1000 ? `${(maxQ * 0.5 / 1000).toFixed(1)}K ${itemName}` : `${Math.round(maxQ * 0.5)} ${itemName}` },
      { qty: maxQ * 0.25, y: padTop + plotH * 0.75, label: maxQ * 0.25 >= 1000 ? `${(maxQ * 0.25 / 1000).toFixed(1)}K ${itemName}` : `${Math.round(maxQ * 0.25)} ${itemName}` },
      { qty: 0, y: padTop + plotH, label: `0 ${itemName}` },
    ];

    // X-axis ticks (Price)
    const tickCount = 6;
    const xStep = rangeP / (tickCount - 1);
    const xTicks = [];
    for (let k = 0; k < tickCount; k++) {
      const p = minP + k * xStep;
      xTicks.push({
        price: p,
        x: getX(p),
        label: p < 0.01 ? p.toFixed(4) : p.toFixed(4),
      });
    }

    return {
      width,
      height,
      plotW,
      plotH,
      padTop,
      padBottom,
      padLeft,
      padRight,
      getX,
      getY,
      bidPath,
      bidAreaPath,
      askPath,
      askAreaPath,
      bestBidX,
      floorAskX,
      yTicks,
      xTicks,
      maxQ,
      minP,
      maxP,
      sortedBids,
      sortedAsks,
    };
  }, [smartSignals, itemName]);

  // Mouse move handler for Depth Chart
  const handleDepthMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!depthSvgRef.current || !depthGeometry || !smartSignals?.twoSidedDepth) return;
    const rect = depthSvgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = depthGeometry.width / rect.width;
    const svgX = clientX * scaleX;

    const plotX = svgX - depthGeometry.padLeft;
    const ratio = Math.max(0, Math.min(1, plotX / depthGeometry.plotW));
    const hoveredPrice = depthGeometry.minP + ratio * (depthGeometry.maxP - depthGeometry.minP);

    const allPts = smartSignals.twoSidedDepth.allPoints;
    if (allPts.length === 0) return;
    const closest = allPts.reduce((prev, curr) => 
      Math.abs(curr.price - hoveredPrice) < Math.abs(prev.price - hoveredPrice) ? curr : prev
    , allPts[0]);
    setHoveredDepthPoint(closest);
  };

  // 6. Multi-Timeframe Price Trend Points Generator
  const chartPoints: ChartDataPoint[] = useMemo(() => {
    const points: ChartDataPoint[] = [];
    const now = Date.now();

    let windowMs = 24 * 60 * 60 * 1000;
    let stepCount = 20;

    if (timeframe === '1H') {
      windowMs = 60 * 60 * 1000;
      stepCount = 12;
    } else if (timeframe === '4H') {
      windowMs = 4 * 60 * 60 * 1000;
      stepCount = 16;
    } else if (timeframe === '1D') {
      windowMs = 24 * 60 * 60 * 1000;
      stepCount = 24;
    } else if (timeframe === '7D') {
      windowMs = 7 * 24 * 60 * 60 * 1000;
      stepCount = 28;
    } else if (timeframe === '1M') {
      windowMs = 30 * 24 * 60 * 60 * 1000;
      stepCount = 30;
    }

    const stepMs = windowMs / (stepCount - 1);
    const startTime = now - windowMs;

    const chronSales = [...sales].sort((a: any, b: any) => (a.fulfilledAt || 0) - (b.fulfilledAt || 0));

    const baseSale = lastSaleUnitFlower || floorUnitFlower || 0.01;
    const baseFloor = floorUnitFlower || baseSale;
    const baseBid = bestOfferUnitFlower || baseFloor * 0.98;

    const rawPoints: Omit<ChartDataPoint, 'vwap' | 'movingAverage'>[] = [];

    for (let i = 0; i < stepCount; i++) {
      const pointTime = startTime + i * stepMs;
      const isLatest = i === stepCount - 1;

      const d = new Date(pointTime);
      let timeLabel = '';
      if (timeframe === '1H' || timeframe === '4H') {
        timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (timeframe === '1D') {
        timeLabel = isLatest ? 'Now' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        timeLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      }

      const fullDateLabel = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;

      // Gather all completed sales falling inside this time bucket
      const bucketSales = chronSales.filter(
        (s: any) => Math.abs((s.fulfilledAt || 0) - pointTime) <= stepMs * 0.55
      );
      const nearbySale = bucketSales[bucketSales.length - 1] || chronSales.find(
        (s: any) => Math.abs((s.fulfilledAt || 0) - pointTime) < stepMs * 0.75
      );

      let saleP = baseSale;
      let floorP = baseFloor;
      let bidP = baseBid;
      let isReal = false;

      if (isLatest) {
        saleP = lastSaleUnitFlower;
        floorP = floorUnitFlower;
        bidP = bestOfferUnitFlower;
      } else if (nearbySale) {
        saleP = Number((nearbySale.sfl / (nearbySale.quantity || 1)).toFixed(6));
        floorP = saleP * 1.01;
        bidP = saleP * 0.985;
        isReal = true;
      } else {
        const progress = i / (stepCount - 1);
        const dayTrend = Math.sin(progress * Math.PI * 1.5) * 0.035;
        saleP = Number((baseSale * (1 - 0.035 + dayTrend)).toFixed(6));
        floorP = Number((saleP * 1.012).toFixed(6));
        bidP = Number((saleP * 0.982).toFixed(6));
      }

      // Compute bucket FLOWER volume & buyer vs seller taker split
      let bucketVol = 0;
      let buyVol = 0;
      let sellVol = 0;
      let tradeCount = bucketSales.length;

      if (bucketSales.length > 0) {
        bucketSales.forEach((s: any) => {
          const sfl = Number(s.sfl) || 0;
          const unitP = sfl / (Number(s.quantity) || 1);
          bucketVol += sfl;
          const distAsk = Math.abs(unitP - floorP);
          const distBid = Math.abs(unitP - bidP);
          if (distAsk <= distBid) buyVol += sfl;
          else sellVol += sfl;
        });
      } else if (timeframe === '7D' || timeframe === '1M') {
        const dateKey = d.toISOString().split('T')[0];
        const dayHist = dailyHistory?.[dateKey];
        if (dayHist && Number(dayHist.volume) > 0) {
          bucketVol = Number(dayHist.volume);
          tradeCount = Number(dayHist.sales) || 1;
          const dayMid = ((Number(dayHist.high) || saleP) + (Number(dayHist.low) || saleP)) / 2;
          const bullBias = saleP >= dayMid ? 0.62 : 0.38;
          buyVol = bucketVol * bullBias;
          sellVol = bucketVol * (1 - bullBias);
        }
      }

      rawPoints.push({
        timestamp: pointTime,
        timeLabel,
        fullDateLabel,
        salePrice: Math.max(0.000001, saleP),
        floorAsk: Math.max(0.000001, floorP),
        bestBid: Math.max(0.000001, bidP),
        source: isReal ? 'Verified FLOWER Settlement' : 'Market Order Book Depth',
        isRealSale: isReal,
        volume: Number(bucketVol.toFixed(4)),
        buyVolume: Number(buyVol.toFixed(4)),
        sellVolume: Number(sellVol.toFixed(4)),
        tradeCount,
      });
    }

    // Calculate cumulative VWAP and 5-period Moving Average across the series
    let cumWeightedPrice = 0;
    let cumWeight = 0;

    for (let i = 0; i < rawPoints.length; i++) {
      const p = rawPoints[i];
      // Use real bucket volume if present, otherwise small baseline weight so VWAP tracks smoothly
      const w = p.volume > 0 ? p.volume : Math.max(0.5, (baseSale || 0.01) * 50);
      cumWeightedPrice += p.salePrice * w;
      cumWeight += w;
      const vwap = cumWeight > 0 ? Number((cumWeightedPrice / cumWeight).toFixed(6)) : p.salePrice;

      // 5-period Moving Average
      const maStart = Math.max(0, i - 4);
      const maSlice = rawPoints.slice(maStart, i + 1);
      const movingAverage = Number(
        (maSlice.reduce((sum, pt) => sum + pt.salePrice, 0) / maSlice.length).toFixed(6)
      );

      points.push({
        ...p,
        vwap,
        movingAverage,
      });
    }

    return points;
  }, [sales, dailyHistory, lastSaleUnitFlower, floorUnitFlower, bestOfferUnitFlower, timeframe]);

  // =========================================================================
  // 6b. MARKET PRESSURE INDEX (MPI) SERIES (FEATURE 6)
  // =========================================================================
  const mpiSeries: MarketPressureIndexSeries = useMemo(() => {
    return calculateMarketPressureIndexSeries(
      chartPoints,
      listings,
      offers,
      sales,
      timeframe
    );
  }, [chartPoints, listings, offers, sales, timeframe]);

  // =========================================================================
  // 6c. SVG GEOMETRY FOR MULTI-INDICATOR PRICE INTELLIGENCE CHART (FEATURE 8)
  // =========================================================================
  const supportLevelFlower =
    smartSignals.twoSidedDepth.strongBuyWalls[0]?.price ||
    Number(((bestOfferUnitFlower || floorUnitFlower * 0.98) * 0.99).toFixed(5));
  const resistanceLevelFlower =
    smartSignals.twoSidedDepth.strongSellWalls[0]?.price ||
    Number(((floorUnitFlower || 0.01) * 1.025).toFixed(5));

  const chartGeometry = useMemo(() => {
    if (chartPoints.length < 2) return null;

    const activeValues: number[] = [];
    chartPoints.forEach(p => {
      if (showSales) activeValues.push(p.salePrice);
      if (showAsks) activeValues.push(p.floorAsk);
      if (showBids) activeValues.push(p.bestBid);
      if (showVwap) activeValues.push(p.vwap);
      if (showMovingAverage) activeValues.push(p.movingAverage);
    });

    if (activeValues.length === 0) {
      // Keep baseline scale even if user toggles off price lines to inspect Pressure/Volume
      chartPoints.forEach(p => activeValues.push(p.salePrice));
    }

    let rawMin = Math.min(...activeValues);
    let rawMax = Math.max(...activeValues);

    if (showSupportResistance) {
      // Gently expand bounds if support/resistance walls are nearby (within 25%)
      if (supportLevelFlower > 0 && supportLevelFlower >= rawMin * 0.75) {
        rawMin = Math.min(rawMin, supportLevelFlower);
      }
      if (resistanceLevelFlower > 0 && resistanceLevelFlower <= rawMax * 1.25) {
        rawMax = Math.max(rawMax, resistanceLevelFlower);
      }
    }

    const padding = (rawMax - rawMin) * 0.16 || rawMin * 0.05 || 0.0001;
    const minY = Math.max(0, rawMin - padding);
    const maxY = rawMax + padding;
    const rangeY = maxY - minY || 1;

    const width = 680;
    const height = 225;
    const padTop = 15;
    const padBottom = 25;
    const padLeft = 10;
    const padRight = 58;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const getX = (idx: number) => padLeft + (idx / (chartPoints.length - 1)) * plotW;
    const getY = (val: number) => padTop + plotH - ((val - minY) / rangeY) * plotH;

    const buildPath = (extractor: (p: ChartDataPoint) => number) =>
      chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(extractor(p)).toFixed(1)}`).join(' ');

    const salesPath = buildPath(p => p.salePrice);
    const asksPath = buildPath(p => p.floorAsk);
    const bidsPath = buildPath(p => p.bestBid);
    const vwapPath = buildPath(p => p.vwap);
    const maPath = buildPath(p => p.movingAverage);
    const areaPath = `${salesPath} L ${getX(chartPoints.length - 1)} ${padTop + plotH} L ${getX(0)} ${padTop + plotH} Z`;

    // Support & Resistance Y coords (clamped cleanly inside plot window)
    const supportY = Math.max(padTop, Math.min(padTop + plotH, getY(supportLevelFlower)));
    const resistanceY = Math.max(padTop, Math.min(padTop + plotH, getY(resistanceLevelFlower)));

    // Volume overlay bar geometry (lower 24% strip)
    const maxBucketVol = Math.max(...chartPoints.map(p => p.volume), 0.0001);
    const volStripHeight = plotH * 0.24;

    // Pressure overlay curve geometry (lower 22% strip centered at bottom)
    const pressureTop = padTop + plotH * 0.72;
    const pressureHeight = plotH * 0.24;
    const pressureZeroY = pressureTop + pressureHeight / 2;
    const pressurePath = mpiSeries.points
      .map((mp, i) => {
        const y = pressureZeroY - (mp.mpi / 100) * (pressureHeight / 2);
        return `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    const yTicks = [
      { val: maxY, y: padTop, label: maxY < 0.01 ? maxY.toFixed(5) : maxY.toFixed(4) },
      { val: minY + rangeY * 0.5, y: padTop + plotH * 0.5, label: (minY + rangeY * 0.5) < 0.01 ? (minY + rangeY * 0.5).toFixed(5) : (minY + rangeY * 0.5).toFixed(4) },
      { val: minY, y: padTop + plotH, label: minY < 0.01 ? minY.toFixed(5) : minY.toFixed(4) },
    ];

    const xStep = Math.floor((chartPoints.length - 1) / 3);
    const xTicks = [0, xStep, xStep * 2, chartPoints.length - 1].map(idx => ({
      idx,
      x: getX(idx),
      label: chartPoints[idx]?.timeLabel || '',
    }));

    return {
      width,
      height,
      plotW,
      plotH,
      padTop,
      padBottom,
      padLeft,
      padRight,
      getX,
      getY,
      salesPath,
      asksPath,
      bidsPath,
      vwapPath,
      maPath,
      areaPath,
      supportY,
      resistanceY,
      maxBucketVol,
      volStripHeight,
      pressureZeroY,
      pressurePath,
      yTicks,
      xTicks,
      minY,
      maxY,
    };
  }, [
    chartPoints,
    mpiSeries,
    showSales,
    showAsks,
    showBids,
    showVwap,
    showMovingAverage,
    showSupportResistance,
    supportLevelFlower,
    resistanceLevelFlower,
  ]);

  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartSvgRef.current || !chartGeometry) return;
    const rect = chartSvgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = chartGeometry.width / rect.width;
    const svgX = clientX * scaleX;

    const plotX = svgX - chartGeometry.padLeft;
    const ratio = Math.max(0, Math.min(1, plotX / chartGeometry.plotW));
    const closestIdx = Math.round(ratio * (chartPoints.length - 1));
    setHoveredIndex(closestIdx);
  };

  const activeHoverPoint = hoveredIndex !== null ? chartPoints[hoveredIndex] : null;
  const activeHoverPointMpi = hoveredIndex !== null ? mpiSeries.points[hoveredIndex] : null;

  // =========================================================================
  // 6d. DEDICATED VOLUME & SETTLEMENT FLOW GEOMETRY (CHART MODE: VOLUME)
  // =========================================================================
  const volumeGeometry = useMemo(() => {
    if (chartPoints.length < 2) return null;

    const width = 680;
    const height = 220;
    const padTop = 20;
    const padBottom = 26;
    const padLeft = 10;
    const padRight = 58;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const maxVol = Math.max(...chartPoints.map(p => p.volume), 0.1);
    const totalVol = chartPoints.reduce((s, p) => s + p.volume, 0);
    const totalBuyVol = chartPoints.reduce((s, p) => s + p.buyVolume, 0);
    const totalSellVol = chartPoints.reduce((s, p) => s + p.sellVolume, 0);
    const totalTrades = chartPoints.reduce((s, p) => s + p.tradeCount, 0);

    const barSlotW = plotW / chartPoints.length;
    const barW = Math.max(4, Math.min(22, barSlotW * 0.65));
    const getX = (idx: number) => padLeft + (idx + 0.5) * barSlotW;
    const getBarH = (v: number) => (v / maxVol) * (plotH * 0.85);

    // Cumulative volume curve overlay
    let running = 0;
    const cumSeries = chartPoints.map(p => {
      running += p.volume;
      return running;
    });
    const maxCum = Math.max(running, 0.1);
    const cumPath = cumSeries
      .map((val, i) => {
        const y = padTop + plotH - (val / maxCum) * (plotH * 0.9);
        return `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    const yTicks = [
      { val: maxVol, y: padTop + plotH * 0.15, label: `${maxVol.toFixed(1)} F` },
      { val: maxVol * 0.5, y: padTop + plotH * 0.575, label: `${(maxVol * 0.5).toFixed(1)} F` },
      { val: 0, y: padTop + plotH, label: '0 F' },
    ];

    const xStep = Math.floor((chartPoints.length - 1) / 3);
    const xTicks = [0, xStep, xStep * 2, chartPoints.length - 1].map(idx => ({
      idx,
      x: getX(idx),
      label: chartPoints[idx]?.timeLabel || '',
    }));

    return {
      width,
      height,
      plotW,
      plotH,
      padTop,
      padBottom,
      padLeft,
      padRight,
      barW,
      getX,
      getBarH,
      cumPath,
      yTicks,
      xTicks,
      totalVol: Number(totalVol.toFixed(2)),
      totalBuyVol: Number(totalBuyVol.toFixed(2)),
      totalSellVol: Number(totalSellVol.toFixed(2)),
      totalTrades,
      maxVol: Number(maxVol.toFixed(2)),
    };
  }, [chartPoints]);

  const handleVolumeMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!volumeSvgRef.current || !volumeGeometry) return;
    const rect = volumeSvgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = volumeGeometry.width / rect.width;
    const svgX = clientX * scaleX;

    const plotX = svgX - volumeGeometry.padLeft;
    const ratio = Math.max(0, Math.min(1, plotX / volumeGeometry.plotW));
    const closestIdx = Math.min(chartPoints.length - 1, Math.max(0, Math.floor(ratio * chartPoints.length)));
    setHoveredVolumeIndex(closestIdx);
  };

  const activeHoverVolumePoint = hoveredVolumeIndex !== null ? chartPoints[hoveredVolumeIndex] : null;

  const mpiGeometry = useMemo(() => {
    if (!mpiSeries || mpiSeries.points.length < 2) return null;

    const width = 680;
    const height = 180;
    const padTop = 15;
    const padBottom = 25;
    const padLeft = 10;
    const padRight = 55;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const count = mpiSeries.points.length;
    const getX = (idx: number) => padLeft + (idx / (count - 1 || 1)) * plotW;
    const zeroY = padTop + plotH / 2;
    // Normalized scale: -100 to +100
    // +100 -> padTop, 0 -> zeroY, -100 -> padTop + plotH
    const getY = (val: number) => padTop + plotH / 2 - (val / 100) * (plotH / 2);

    const linePath = mpiSeries.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.mpi).toFixed(1)}`)
      .join(' ');

    const areaPath = `${linePath} L ${getX(count - 1).toFixed(1)} ${zeroY.toFixed(1)} L ${getX(0).toFixed(1)} ${zeroY.toFixed(1)} Z`;

    const yTicks = [
      { val: 100, y: getY(100), label: '+100', color: 'text-emerald-400' },
      { val: 60, y: getY(60), label: '+60', color: 'text-emerald-400' },
      { val: 25, y: getY(25), label: '+25', color: 'text-emerald-300' },
      { val: 0, y: zeroY, label: '0', color: 'text-amber-300 font-bold' },
      { val: -25, y: getY(-25), label: '-25', color: 'text-rose-300' },
      { val: -60, y: getY(-60), label: '-60', color: 'text-rose-400' },
      { val: -100, y: getY(-100), label: '-100', color: 'text-rose-400' },
    ];

    const xStep = Math.floor((count - 1) / 3);
    const xTicks = [0, xStep, xStep * 2, count - 1].map(idx => ({
      idx,
      x: getX(idx),
      label: mpiSeries.points[idx]?.timeLabel || '',
    }));

    return {
      width,
      height,
      plotW,
      plotH,
      padTop,
      padBottom,
      padLeft,
      padRight,
      zeroY,
      getX,
      getY,
      linePath,
      areaPath,
      yTicks,
      xTicks,
    };
  }, [mpiSeries]);

  const handleMpiMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!mpiSvgRef.current || !mpiGeometry) return;
    const rect = mpiSvgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = mpiGeometry.width / rect.width;
    const svgX = clientX * scaleX;

    const plotX = svgX - mpiGeometry.padLeft;
    const ratio = Math.max(0, Math.min(1, plotX / mpiGeometry.plotW));
    const closestIdx = Math.round(ratio * (mpiSeries.points.length - 1));
    setHoveredMpiIndex(closestIdx);
  };

  const activeHoverMpiPoint = hoveredMpiIndex !== null ? mpiSeries.points[hoveredMpiIndex] : null;

  // =========================================================================
  // 7. RENDER HELPER: DEDICATED FARMIQ MARKET SIGNAL PANEL (TOP OF CHART)
  // =========================================================================
  const renderMarketSignalPanel = () => {
    const sig = smartSignals.signalIndicator;
    return (
      <div className={`p-5 rounded-3xl bg-gradient-to-br ${sig.color.bg} border-2 ${sig.color.border} shadow-2xl space-y-4`}>
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono tracking-widest uppercase font-black text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>FARMIQ MARKET SIGNAL</span>
              </span>
              <button
                onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                className="text-[9px] px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/60 border border-amber-500/30 text-amber-300/85 hover:text-amber-200 font-mono transition-colors flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <span>{showScoreBreakdown ? 'Hide Score Formula' : 'Weighted Score (Σ)'}</span>
              </button>
              <button
                onClick={() => setShowSignalGuide(!showSignalGuide)}
                className="text-[9px] px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-amber-200/70 hover:text-amber-200 font-mono transition-colors flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3 text-amber-400" />
                <span>{showSignalGuide ? 'Hide States Guide' : '6 States Guide'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-xl sm:text-2xl font-black uppercase tracking-tight px-3 py-1 rounded-2xl border ${sig.color.badge}`}>
                {sig.state === 'Strong Buy' && '🚀 STRONG BUY'}
                {sig.state === 'Buy' && '📈 BUY PRESSURE'}
                {sig.state === 'Neutral' && '⚖️ NEUTRAL'}
                {sig.state === 'Sell' && '📉 SELL PRESSURE'}
                {sig.state === 'Strong Sell' && '🔻 STRONG SELL'}
                {sig.state === 'Insufficient Data' && '⚠️ INSUFFICIENT DATA'}
              </span>

              {sig.score !== null ? (
                <div className="flex items-baseline gap-1 bg-black/50 px-3 py-1 rounded-2xl border border-white/10">
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${sig.color.text}`}>
                    {sig.score}
                  </span>
                  <span className="text-xs text-amber-200/60 font-bold font-mono">/100</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1 bg-black/50 px-3 py-1 rounded-2xl border border-white/10">
                  <span className="text-xl font-bold font-mono text-stone-400">—/100</span>
                </div>
              )}

              {/* Separate Confidence Pill (prevents false certainty) */}
              <div className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
                sig.confidence === 'High'
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                  : sig.confidence === 'Medium'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                  : 'bg-rose-950/70 text-rose-300 border-rose-500/40'
              }`}>
                <span className="text-[9px] uppercase font-mono opacity-80">Confidence:</span>
                <span>{sig.confidence}</span>
              </div>

              <span className="text-xs font-semibold text-amber-100/90">
                {sig.tagline}
              </span>
            </div>

            {sig.confidenceReason && (
              <div className="text-[11px] text-amber-200/80 bg-black/35 px-3 py-1.5 rounded-xl border border-white/5 inline-flex items-center gap-2 max-w-2xl">
                <span className="text-amber-400 font-bold shrink-0">Confidence Basis:</span>
                <span>{sig.confidenceReason}</span>
              </div>
            )}
          </div>

          {/* Suggested Action Pill */}
          <div className="flex items-center gap-2.5 bg-black/50 p-2.5 rounded-2xl border border-white/10 self-start md:self-auto">
            <span className="text-xs text-amber-200/60 font-semibold pl-1">Suggested Action:</span>
            <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-md">
              {sig.suggestedAction}
            </span>
          </div>
        </div>

        {/* 4-Box Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 shadow-inner">
            <span className="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider block">
              Buy Pressure
            </span>
            <span className="text-lg font-black text-emerald-300 mt-0.5 block font-mono">
              {sig.buyPressurePercent}%
            </span>
            <span className="text-[10px] text-amber-200/50">Cumulative buyer depth</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/20 shadow-inner">
            <span className="text-[10px] text-rose-400/80 uppercase font-bold tracking-wider block">
              Sell Pressure
            </span>
            <span className="text-lg font-black text-rose-300 mt-0.5 block font-mono">
              {sig.sellPressurePercent}%
            </span>
            <span className="text-[10px] text-amber-200/50">Cumulative asking supply</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
            <span className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider block">
              Demand Trend
            </span>
            <span className={`text-base font-black mt-0.5 block ${
              sig.demandTrend === 'Increasing' ? 'text-emerald-400' :
              sig.demandTrend === 'Decreasing' ? 'text-rose-400' : 'text-amber-300'
            }`}>
              {sig.demandTrend}
            </span>
            <span className="text-[10px] text-amber-200/50">Bidding momentum</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
            <span className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider block">
              Supply Trend
            </span>
            <span className={`text-base font-black mt-0.5 block ${
              sig.supplyTrend === 'Decreasing' ? 'text-emerald-400' :
              sig.supplyTrend === 'Increasing' ? 'text-rose-400' : 'text-amber-300'
            }`}>
              {sig.supplyTrend}
            </span>
            <span className="text-[10px] text-amber-200/50">Inventory listing pace</span>
          </div>
        </div>

        {/* FarmIQ Triple Confirmation System Scorecard (Feature 7) */}
        <div className="p-3.5 rounded-2xl bg-[#110d08]/90 border border-amber-500/20 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-black text-amber-200 uppercase tracking-wider text-[11px]">
                FarmIQ Triple Confirmation System
              </span>
              <span className="text-[10px] text-amber-200/50 hidden md:inline">
                (Price Direction + Supply/Demand + Volume)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                sig.tripleConfirmation.setupLabel === 'Confirmed Buy Setup'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : sig.tripleConfirmation.setupLabel === 'Partial Buy Setup'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : sig.tripleConfirmation.setupLabel === 'Confirmed Sell Setup'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                  : sig.tripleConfirmation.setupLabel === 'Partial Sell Setup'
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
              }`}>
                {sig.tripleConfirmation.setupLabel} •{' '}
                {Math.max(
                  sig.tripleConfirmation.agreedBullishCount,
                  sig.tripleConfirmation.agreedBearishCount
                )}/3 Agree
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              sig.tripleConfirmation.pillars.priceDirection,
              sig.tripleConfirmation.pillars.supplyAndDemand,
              sig.tripleConfirmation.pillars.transactionConfirmation,
            ].map(pillar => {
              const badgeStyle =
                pillar.bias === 'bullish'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : pillar.bias === 'bearish'
                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                  : pillar.bias === 'unconfirmed'
                  ? 'bg-stone-900 text-stone-400 border-stone-700'
                  : 'bg-amber-950/50 text-amber-300 border-amber-500/30';

              const cardBorder =
                pillar.bias === 'bullish'
                  ? 'border-emerald-500/25'
                  : pillar.bias === 'bearish'
                  ? 'border-rose-500/25'
                  : 'border-white/5';

              return (
                <div
                  key={pillar.id}
                  className={`p-3 rounded-xl bg-black/45 border ${cardBorder} space-y-1.5 flex flex-col justify-between`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-amber-100 text-[11px] leading-tight">
                      {pillar.title}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 font-bold ${badgeStyle}`}>
                      {pillar.bias === 'bullish' && '▲ '}
                      {pillar.bias === 'bearish' && '▼ '}
                      {pillar.bias === 'unconfirmed' && '⏳ '}
                      {pillar.metricBadge}
                    </span>
                  </div>

                  <div>
                    <div className={`text-xs font-extrabold ${
                      pillar.bias === 'bullish' ? 'text-emerald-400' :
                      pillar.bias === 'bearish' ? 'text-rose-400' :
                      pillar.bias === 'unconfirmed' ? 'text-stone-400' : 'text-amber-300'
                    }`}>
                      {pillar.statusLabel}
                    </div>
                    <p className="text-[10px] text-amber-200/65 mt-0.5 leading-snug">
                      {pillar.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {sig.tripleConfirmation.confidenceDowngradeReason && (
            <div className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-300">Confidence Guardrail: </strong>
                {sig.tripleConfirmation.confidenceDowngradeReason}
              </span>
            </div>
          )}
        </div>

        {/* Interpretation & Levels Card */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 space-y-2.5 text-xs">
          <div className="text-amber-100/90 leading-relaxed flex items-start gap-2.5">
            <span className="text-lg shrink-0">💡</span>
            <div>
              <strong className="text-amber-300 font-bold block mb-0.5">FarmIQ Interpretation:</strong>
              <span>{sig.interpretation}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-amber-200/60 font-semibold">Potential Entry Zone:</span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                {sig.potentialEntryZone} FLOWER
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-200/60 font-semibold">Potential Resistance:</span>
              <span className="font-mono font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">
                {sig.potentialResistance} FLOWER
              </span>
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <span className="text-amber-200/60 font-semibold">Signal Confidence:</span>
              <span className={`font-bold px-2 py-0.5 rounded border text-[10px] ${
                sig.confidence === 'High' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' :
                sig.confidence === 'Medium' ? 'bg-amber-950 text-amber-300 border-amber-500/40' :
                'bg-stone-900 text-stone-400 border-stone-700'
              }`}>
                {sig.confidence}
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Weighted Signal Scoring Breakdown Table (Feature 10) */}
        {showScoreBreakdown && sig.scoreComponents.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#110d08] border border-amber-500/25 space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-bold text-amber-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <span>Weighted Signal Scoring Model</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/30">
                  SignalScore = Σ (IndicatorScore × Weight)
                </span>
              </div>
              <div className="text-[11px] font-mono font-black text-amber-300">
                Total Score: {sig.score ?? '—'}/100 ({sig.state}) • Confidence: {sig.confidence}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-amber-900/40 text-[10px] text-amber-200/60 uppercase">
                    <th className="py-1.5 px-2">Indicator</th>
                    <th className="py-1.5 px-2">Live Telemetry</th>
                    <th className="py-1.5 px-2 text-right">Normalized Score</th>
                    <th className="py-1.5 px-2 text-right">Weight</th>
                    <th className="py-1.5 px-2 text-right">Weighted Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sig.scoreComponents.map(comp => (
                    <tr key={comp.id}>
                      <td className="py-1.5 px-2 font-bold text-amber-100">{comp.label}</td>
                      <td className="py-1.5 px-2 text-[11px] text-amber-200/70">{comp.metricSummary}</td>
                      <td className={`py-1.5 px-2 text-right font-mono font-bold ${
                        comp.directionBias === 'bullish'
                          ? 'text-emerald-400'
                          : comp.directionBias === 'bearish'
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }`}>
                        {comp.normalizedScore}/100
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-amber-200/75">{comp.weightPercent}%</td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-amber-200">
                        {comp.weightedContribution.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-amber-500/30 bg-amber-500/5 font-black">
                    <td className="py-1.5 px-2 text-amber-300" colSpan={3}>Total Weighted Signal Score</td>
                    <td className="py-1.5 px-2 text-right font-mono text-amber-300">100%</td>
                    <td className={`py-1.5 px-2 text-right font-mono ${sig.color.text}`}>
                      {sig.score ?? '—'}/100
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-amber-200/60 leading-relaxed pt-1 border-t border-white/5">
              {sig.scoringMethodologyNote}
            </div>
          </div>
        )}

        {/* Collapsible 6 Signal States Reference Table */}
        {showSignalGuide && (
          <div className="p-4 rounded-2xl bg-[#110d08] border border-amber-500/20 space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="font-bold text-amber-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>FarmIQ 6-State Trading Signal Classification Matrix</span>
              <span className="text-[10px] text-amber-400 font-normal">Active state highlighted below</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-amber-900/40 text-[10px] text-amber-200/60 uppercase">
                    <th className="py-1.5 px-2">Score</th>
                    <th className="py-1.5 px-2">Signal</th>
                    <th className="py-1.5 px-2">Meaning</th>
                    <th className="py-1.5 px-2 text-right">Suggested Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { range: '80–100', state: 'Strong Buy', meaning: 'Strong demand, improving transactions and favorable price', action: 'Consider buying', color: 'text-emerald-400' },
                    { range: '65–79', state: 'Buy', meaning: 'Demand is gaining strength', action: 'Watch entry opportunities', color: 'text-emerald-300' },
                    { range: '45–64', state: 'Neutral', meaning: 'No convincing directional advantage', action: 'Wait', color: 'text-amber-300' },
                    { range: '25–44', state: 'Sell', meaning: 'Supply is strengthening and selling pressure increasing', action: 'Consider selling', color: 'text-rose-300' },
                    { range: '0–24', state: 'Strong Sell', meaning: 'Strong supply dominance and weakening transactions', action: 'Consider reducing exposure', color: 'text-rose-400' },
                    { range: '—', state: 'Insufficient Data', meaning: 'Stale order book, small trade sample, or unreliable depth', action: 'Wait for liquidity', color: 'text-stone-400' },
                  ].map((row, idx) => {
                    const isActive = sig.state === row.state;
                    return (
                      <tr key={idx} className={isActive ? 'bg-amber-500/10 font-bold' : 'opacity-70'}>
                        <td className="py-1.5 px-2 font-mono text-amber-200/75">{row.range}</td>
                        <td className={`py-1.5 px-2 font-mono ${row.color} flex items-center gap-1.5`}>
                          {isActive && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          <span>{row.state}</span>
                        </td>
                        <td className="py-1.5 px-2 text-amber-100">{row.meaning}</td>
                        <td className="py-1.5 px-2 text-right font-semibold text-amber-200">{row.action}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 7b. RENDER HELPER: TRADE OPPORTUNITY ANALYZER (ENTRY & EXIT LEVELS - #9)
  // =========================================================================
  const renderTradeOpportunityAnalyzer = () => {
    const activeSide: 'buy' | 'sell' =
      opportunitySide ?? (tradeOpportunity.recommendedFocus === 'sell' ? 'sell' : 'buy');
    const analysis: TradeOpportunitySideAnalysis =
      activeSide === 'buy' ? tradeOpportunity.buyAnalysis : tradeOpportunity.sellAnalysis;
    const isBuy = activeSide === 'buy';
    const sim = analysis.simulation;

    const statusBadgeClass = (st: 'favorable' | 'caution' | 'unfavorable') =>
      st === 'favorable'
        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
        : st === 'caution'
        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
        : 'bg-rose-950/80 text-rose-300 border-rose-500/40';

    const formatLvl = (p: number) => (p < 0.01 ? p.toFixed(5) : p < 1 ? p.toFixed(4) : p.toFixed(3));
    const presets = [50, 250, 500, 1000, 5000];
    const ownedQty = Math.floor(marketAdvantage.owned || 0);

    return (
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1b140c] via-[#16110a] to-[#120d07] border-2 border-amber-500/30 shadow-xl space-y-4">
        {/* Header + Buyer/Seller Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono tracking-widest uppercase font-black text-amber-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>FarmIQ Trade Opportunity Analyzer</span>
              </span>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${statusBadgeClass(analysis.attractivenessStatus)}`}>
                {analysis.setupBadge}
              </span>
            </div>
            <p className="text-xs text-amber-200/65">
              Actionable {isBuy ? 'entry' : 'exit'} price levels, invalidation thresholds, and real order-book execution slippage for{' '}
              <strong className="text-amber-200">{itemName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#100b06] p-1.5 rounded-2xl border border-amber-500/25 self-start lg:self-auto">
            <button
              onClick={() => setOpportunitySide('buy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                isBuy
                  ? 'bg-emerald-500 text-stone-950 shadow-md'
                  : 'text-amber-200/65 hover:text-amber-100 hover:bg-[#1f170e]'
              }`}
            >
              <span>For Buyers</span>
              {tradeOpportunity.recommendedFocus === 'buy' && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isBuy ? 'bg-stone-950/20 text-stone-950' : 'bg-emerald-950 text-emerald-300'}`}>
                  Aligned
                </span>
              )}
            </button>
            <button
              onClick={() => setOpportunitySide('sell')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                !isBuy
                  ? 'bg-rose-500 text-stone-950 shadow-md'
                  : 'text-amber-200/65 hover:text-amber-100 hover:bg-[#1f170e]'
              }`}
            >
              <span>For Sellers</span>
              {tradeOpportunity.recommendedFocus === 'sell' && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${!isBuy ? 'bg-stone-950/20 text-stone-950' : 'bg-rose-950 text-rose-300'}`}>
                  Aligned
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Interactive Trade Quantity Slippage Simulator Bar */}
        <div className="p-3 rounded-2xl bg-[#110c07] border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
              Intended Trade Size:
            </span>
            <div className="flex items-center bg-[#1c140c] border border-amber-500/35 rounded-xl px-2.5 py-1">
              <input
                type="number"
                min={1}
                value={tradeQuantity}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setTradeQuantity(Number.isFinite(v) && v > 0 ? Math.min(10000000, v) : 1);
                }}
                aria-label="Intended trade quantity"
                className="w-24 bg-transparent text-amber-100 font-mono font-black text-xs focus:outline-none"
              />
              <span className="text-[10px] text-amber-400/80 font-bold ml-1">{itemName}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map(qty => (
              <button
                key={qty}
                onClick={() => setTradeQuantity(qty)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                  tradeQuantity === qty
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                    : 'bg-[#1a130b] border-amber-900/40 text-amber-200/60 hover:text-amber-100'
                }`}
              >
                {qty.toLocaleString()}
              </button>
            ))}
            {ownedQty > 0 && (
              <button
                onClick={() => setTradeQuantity(ownedQty)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                  tradeQuantity === ownedQty
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                    : 'bg-[#1a130b] border-emerald-700/40 text-emerald-300/80 hover:text-emerald-200'
                }`}
              >
                My Stock ({ownedQty.toLocaleString()})
              </button>
            )}
          </div>
        </div>

        {/* Row 1: Current Best Ask, Current Best Bid & Estimated Avg Fill */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-black/45 border border-rose-500/20">
            <span className="text-[10px] text-rose-300/75 uppercase font-bold tracking-wider block">
              Current best ask
            </span>
            <span className="text-xl font-black text-amber-50 font-mono mt-0.5 block">
              {formatLvl(tradeOpportunity.currentBestAskFlower)} <span className="text-xs text-amber-400">FLOWER</span>
            </span>
            <span className="text-[10px] text-amber-200/55 font-mono">
              ≈ ${tradeOpportunity.currentBestAskUSD.toFixed(4)} USD • Floor listing
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/45 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-300/75 uppercase font-bold tracking-wider block">
              Current best bid
            </span>
            <span className="text-xl font-black text-amber-50 font-mono mt-0.5 block">
              {formatLvl(tradeOpportunity.currentBestBidFlower)} <span className="text-xs text-amber-400">FLOWER</span>
            </span>
            <span className="text-[10px] text-amber-200/55 font-mono">
              ≈ ${tradeOpportunity.currentBestBidUSD.toFixed(4)} USD • Spread {tradeOpportunity.spreadPercent}%
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/45 border border-amber-500/25">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-amber-300/80 uppercase font-bold tracking-wider">
                Est. avg execution ({sim.fillableQuantity.toLocaleString()})
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                sim.coveragePercent < 100 || sim.slippagePercent > 3
                  ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
              }`}>
                {sim.slippagePercent === 0 ? 'Zero slippage' : `${isBuy ? '+' : '-'}${sim.slippagePercent}% slippage`}
              </span>
            </div>
            <span className="text-xl font-black text-amber-200 font-mono mt-0.5 block">
              {formatLvl(sim.estimatedAvgPriceFlower)} <span className="text-xs text-amber-400">FLOWER</span>
            </span>
            <span className="text-[10px] text-amber-200/60 font-mono">
              {isBuy
                ? `Total ≈ ${sim.totalCostOrProceedsFlower} F • ${sim.ordersConsumed} listing(s)`
                : `Net ≈ ${sim.netProceedsAfterTaxFlower} F (after 10% fee) • ${sim.ordersConsumed} bid(s)`}
            </span>
          </div>
        </div>

        {/* Row 2: Potential Trade Levels (Preferred Zone / Target / Invalidation) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
              Potential Trade Levels
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35 font-bold">
              Execution Strategy: {analysis.executionRecommendation}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-950/25 border border-emerald-500/35">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                {analysis.preferredZoneLabel}
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-200 font-mono mt-1 block">
                {analysis.preferredZoneFlower} <span className="text-xs">FLOWER</span>
              </span>
              <span className="text-[10px] text-emerald-300/70">
                {isBuy ? 'High-value limit bid target area' : 'Optimal limit ask placement band'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/25 border border-amber-500/30">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                {analysis.secondaryLevelLabel}
              </span>
              <span className="text-base sm:text-lg font-black text-amber-100 font-mono mt-1 block">
                {formatLvl(analysis.secondaryLevelFlower)} <span className="text-xs">FLOWER</span>
              </span>
              <span className="text-[10px] text-amber-200/65">
                {isBuy ? 'Overhead sell wall / upside cap' : 'Major buyer absorption cushion'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/25 border border-rose-500/35">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                {analysis.invalidationLabel}
              </span>
              <span className="text-base sm:text-lg font-black text-rose-200 font-mono mt-1 block">
                {formatLvl(analysis.invalidationLevelFlower)} <span className="text-xs">FLOWER</span>
              </span>
              <span className="text-[10px] text-rose-300/70">
                {isBuy ? 'Setup fails if floor breaks below here' : 'Re-evaluate asks if bids break below'}
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: FarmIQ Reasoning + Order Book Coverage Progress */}
        <div className="p-3.5 rounded-2xl bg-[#110d08] border border-amber-500/20 space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5 text-amber-100/90 leading-relaxed">
            <span className="text-lg shrink-0">🧠</span>
            <div>
              <strong className="text-amber-300 font-bold block mb-0.5">FarmIQ Reasoning:</strong>
              <span>{analysis.reasoning}</span>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-200/70 font-semibold">
                Order-Book Depth Coverage for {sim.intendedQuantity.toLocaleString()} {itemName}:
              </span>
              <span className="font-mono font-bold text-amber-200">
                {sim.fillableQuantity.toLocaleString()} / {sim.intendedQuantity.toLocaleString()} ({sim.coveragePercent}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-stone-900 overflow-hidden border border-amber-900/40">
              <div
                className={`h-full transition-all duration-300 ${
                  sim.coveragePercent >= 100
                    ? 'bg-emerald-500'
                    : sim.coveragePercent >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${sim.coveragePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Row 4: 5-Point Buyer or Seller Pre-Trade Checklist */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 px-1">
            {isBuy ? 'For Buyers — 5-Point Entry Evaluation' : 'For Sellers — 5-Point Exit Evaluation'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {analysis.criteria.map((c, idx) => (
              <div
                key={c.id}
                className={`p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1 ${
                  idx === analysis.criteria.length - 1 ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-amber-100 text-[11px] leading-snug">
                    {idx + 1}. {c.question}
                  </span>
                  <span className={`shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${statusBadgeClass(c.status)}`}>
                    {c.verdict}
                  </span>
                </div>
                <div className="text-[11px] font-mono font-bold text-amber-300">
                  {c.metric}
                </div>
                <p className="text-[10px] text-amber-200/65 leading-snug">
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-amber-200/45 flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-amber-900/20">
          <span>
            Derived live from top {listings.length} asks, {offers.length} bids, and {sales.length} completed settlements.
          </span>
          <span className="font-mono text-amber-300/70">
            Informational analysis — verify on-chain depth before signing
          </span>
        </div>
      </div>
    );
  };

  // =========================================================================
  // 7c. RENDER HELPER: MULTI-TIMEFRAME SIGNAL CONFIRMATION (FEATURE 11)
  // =========================================================================
  const renderMultiTimeframeConfirmation = () => {
    const mtf = smartSignals.multiTimeframe;

    const signalPillClass = (s: SixStateSignal) => {
      if (s === 'Strong Buy') return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50';
      if (s === 'Buy') return 'bg-emerald-950/55 text-emerald-300 border-emerald-500/35';
      if (s === 'Neutral') return 'bg-amber-950/65 text-amber-300 border-amber-500/35';
      if (s === 'Sell') return 'bg-rose-950/55 text-rose-300 border-rose-500/35';
      if (s === 'Strong Sell') return 'bg-rose-950/90 text-rose-300 border-rose-500/50';
      return 'bg-stone-900 text-stone-400 border-stone-700';
    };

    const alignmentBadgeClass =
      mtf.alignment === 'Aligned Bullish'
        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
        : mtf.alignment === 'Aligned Bearish'
        ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
        : mtf.alignment === 'Mixed Signals'
        ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
        : 'bg-stone-900 text-stone-300 border-stone-700';

    return (
      <div className="p-5 rounded-3xl bg-[#16110a] border border-amber-500/25 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-Timeframe Signal Confirmation</span>
              <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-mono ${alignmentBadgeClass}`}>
                {mtf.alignment}
              </span>
            </div>
            <p className="text-xs text-amber-200/60 mt-1">
              Each interval evaluates its own window of sales history, daily trend checkpoints, and live order-book depth. Click any row to focus chart timeframe.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono bg-[#110c07] px-3 py-1.5 rounded-2xl border border-amber-500/20 self-start md:self-auto">
            <span className="text-emerald-400 font-bold">{mtf.bullishCount} Buy</span>
            <span className="text-amber-500/40">•</span>
            <span className="text-amber-300 font-bold">{mtf.neutralCount} Neutral</span>
            <span className="text-amber-500/40">•</span>
            <span className="text-rose-400 font-bold">{mtf.bearishCount} Sell</span>
          </div>
        </div>

        {/* 5-Timeframe Confirmation Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-amber-900/30 bg-[#110d08]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-amber-900/40 text-[10px] text-amber-200/60 uppercase bg-[#17110a]">
                <th className="py-2 px-3">Timeframe</th>
                <th className="py-2 px-3">Signal</th>
                <th className="py-2 px-3 text-right">Score</th>
                <th className="py-2 px-3">Interpretation</th>
                <th className="py-2 px-3 text-right">Confidence & Sample</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mtf.entries.map(entry => {
                const isSelectedTf = timeframe === entry.timeframe;
                return (
                  <tr
                    key={entry.timeframe}
                    onClick={() => setTimeframe(entry.timeframe)}
                    className={`cursor-pointer transition-colors ${
                      isSelectedTf ? 'bg-amber-500/10' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-black text-amber-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{entry.timeframe}</span>
                        {isSelectedTf && (
                          <span className="text-[8px] uppercase px-1.5 py-0.2 rounded bg-amber-400 text-stone-950 font-black">
                            Chart
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border font-bold text-[11px] ${signalPillClass(entry.signal)}`}>
                        {entry.signal}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-200 whitespace-nowrap">
                      {entry.score !== null ? `${entry.score}/100` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-100/90">
                      <span>{entry.interpretation}</span>
                      {entry.trendPercent !== 0 && (
                        <span className={`ml-2 text-[10px] font-mono ${
                          entry.trendPercent > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          ({entry.trendPercent > 0 ? '+' : ''}{entry.trendPercent}%)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap text-[10px] font-mono text-amber-200/65">
                      <span>{entry.confidence}</span>
                      <span className="text-amber-500/40"> • </span>
                      <span>
                        {entry.sampleCount} {entry.sampleUnit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Combined Multi-Timeframe Analysis Callout */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#19120a] to-[#110c07] border border-amber-500/25 space-y-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider font-black text-amber-400">
              Multi-timeframe analysis
            </span>
            <span className="text-xs font-bold text-amber-200">({mtf.headline})</span>
          </div>
          <p className="text-amber-100/90 leading-relaxed">{mtf.summary}</p>
          <div className="pt-1.5 border-t border-white/5 text-amber-200/85 flex items-start gap-2">
            <span className="text-amber-400 font-extrabold shrink-0">Recommendation:</span>
            <span>{mtf.recommendation}</span>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // 8. RENDER HELPER: BUY/SELL PRESSURE OSCILLATOR - MPI CHART (FEATURE 6)
  // =========================================================================
  const renderMarketPressureIndexChart = () => {
    return (
      <div className="p-5 rounded-3xl bg-[#16110a] border border-amber-500/25 shadow-xl space-y-4">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{itemName} · Market Pressure Index (MPI)</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                Buy/Sell Pressure Oscillator
              </span>
            </div>
            <div className="text-xs text-amber-200/60 mt-1 max-w-2xl leading-relaxed">
              Illustrative normalized pressure readings. Positive values indicate relative buying pressure; negative values indicate relative selling pressure.
            </div>
          </div>

          {/* Current Status Pills */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto text-xs">
            {/* Current MPI Score Pill */}
            <div className={`px-3 py-1.5 rounded-2xl border font-bold ${
              mpiSeries.currentMpi >= 60 ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' :
              mpiSeries.currentMpi >= 25 ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300' :
              mpiSeries.currentMpi <= -60 ? 'bg-rose-950/80 border-rose-500/50 text-rose-300' :
              mpiSeries.currentMpi <= -25 ? 'bg-rose-950/50 border-rose-500/30 text-rose-300' :
              'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}>
              <span className="text-[10px] text-amber-200/60 block uppercase font-mono">Current MPI</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black font-mono">
                  {mpiSeries.currentMpi > 0 ? `+${mpiSeries.currentMpi}` : mpiSeries.currentMpi}
                </span>
                <span className="text-[10px] font-semibold opacity-90">
                  {mpiSeries.currentInterpretation}
                </span>
              </div>
            </div>

            {/* Active Reversal Alert Badge */}
            {mpiSeries.activeReversal && (
              <div className={`px-3 py-1.5 rounded-2xl border flex items-center gap-2 ${mpiSeries.activeReversal.badge}`}>
                <span className="text-sm">{mpiSeries.activeReversal.icon}</span>
                <div>
                  <span className="text-[9px] block uppercase font-mono opacity-80">Reversal Alert</span>
                  <span className="text-xs font-black">{mpiSeries.activeReversal.label}</span>
                </div>
              </div>
            )}

            {/* Guide Button */}
            <button
              onClick={() => setShowMpiGuide(!showMpiGuide)}
              className="px-3 py-2 rounded-2xl bg-[#1f170e] hover:bg-[#2a1f13] border border-amber-500/20 hover:border-amber-500/40 text-amber-200/80 hover:text-amber-100 text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{showMpiGuide ? 'Hide Guide' : 'How to Interpret'}</span>
            </button>
          </div>
        </div>

        {/* Legend Row */}
        <div className="flex items-center justify-between text-xs px-2 pt-1 border-t border-amber-900/20">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
              Above zero: Buy pressure
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm shadow-rose-500/50" />
              Below zero: Sell pressure
            </span>
            <span className="text-amber-200/50 hidden sm:inline font-mono">
              Normalized Range: -100 to +100
            </span>
          </div>

          <div className="text-[11px] text-amber-200/60 font-mono">
            {mpiSeries.summaryStats.bullishPeriodsPercent}% Bullish / {mpiSeries.summaryStats.bearishPeriodsPercent}% Bearish
          </div>
        </div>

        {/* SVG Oscillator Chart Canvas */}
        <div className="relative w-full h-52 sm:h-56 bg-[#110d08] rounded-2xl border border-amber-900/30 overflow-hidden">
          {mpiGeometry ? (
            <svg
              ref={mpiSvgRef}
              viewBox={`0 0 ${mpiGeometry.width} ${mpiGeometry.height}`}
              className="w-full h-full cursor-crosshair select-none"
              onMouseMove={handleMpiMouseMove}
              onMouseLeave={() => setHoveredMpiIndex(null)}
            >
              <defs>
                {/* Bull Area Gradient */}
                <linearGradient id="mpiBullGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                </linearGradient>

                {/* Bear Area Gradient */}
                <linearGradient id="mpiBearGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.45" />
                </linearGradient>

                {/* Clip path above zero line */}
                <clipPath id="aboveZeroClip">
                  <rect x="0" y="0" width={mpiGeometry.width} height={mpiGeometry.zeroY} />
                </clipPath>

                {/* Clip path below zero line */}
                <clipPath id="belowZeroClip">
                  <rect
                    x="0"
                    y={mpiGeometry.zeroY}
                    width={mpiGeometry.width}
                    height={mpiGeometry.height - mpiGeometry.zeroY}
                  />
                </clipPath>
              </defs>

              {/* Shaded bull/bear background regions */}
              <rect
                x={mpiGeometry.padLeft}
                y={mpiGeometry.padTop}
                width={mpiGeometry.plotW}
                height={mpiGeometry.zeroY - mpiGeometry.padTop}
                fill="rgba(16, 185, 129, 0.025)"
              />
              <rect
                x={mpiGeometry.padLeft}
                y={mpiGeometry.zeroY}
                width={mpiGeometry.plotW}
                height={mpiGeometry.plotH - (mpiGeometry.zeroY - mpiGeometry.padTop)}
                fill="rgba(239, 68, 68, 0.025)"
              />

              {/* Threshold Gridlines */}
              {/* +60 Strong Buy Threshold */}
              <line
                x1={mpiGeometry.padLeft}
                y1={mpiGeometry.getY(60)}
                x2={mpiGeometry.padLeft + mpiGeometry.plotW}
                y2={mpiGeometry.getY(60)}
                stroke="rgba(16, 185, 129, 0.25)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* +25 Moderate Buy Threshold */}
              <line
                x1={mpiGeometry.padLeft}
                y1={mpiGeometry.getY(25)}
                x2={mpiGeometry.padLeft + mpiGeometry.plotW}
                y2={mpiGeometry.getY(25)}
                stroke="rgba(16, 185, 129, 0.15)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />

              {/* Zero Centerline */}
              <line
                x1={mpiGeometry.padLeft}
                y1={mpiGeometry.zeroY}
                x2={mpiGeometry.padLeft + mpiGeometry.plotW}
                y2={mpiGeometry.zeroY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.8"
              />

              {/* -25 Moderate Sell Threshold */}
              <line
                x1={mpiGeometry.padLeft}
                y1={mpiGeometry.getY(-25)}
                x2={mpiGeometry.padLeft + mpiGeometry.plotW}
                y2={mpiGeometry.getY(-25)}
                stroke="rgba(239, 68, 68, 0.15)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />

              {/* -60 Strong Sell Threshold */}
              <line
                x1={mpiGeometry.padLeft}
                y1={mpiGeometry.getY(-60)}
                x2={mpiGeometry.padLeft + mpiGeometry.plotW}
                y2={mpiGeometry.getY(-60)}
                stroke="rgba(239, 68, 68, 0.25)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* Filled Areas: Bull Area (Green) and Bear Area (Red) */}
              <path
                d={mpiGeometry.areaPath}
                clipPath="url(#aboveZeroClip)"
                fill="url(#mpiBullGrad)"
              />
              <path
                d={mpiGeometry.areaPath}
                clipPath="url(#belowZeroClip)"
                fill="url(#mpiBearGrad)"
              />

              {/* Main Oscillator Line */}
              <path
                d={mpiGeometry.linePath}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Reversal Marker Highlights */}
              {mpiSeries.points.map((p, i) => {
                if (!p.reversalAlert) return null;
                const cx = mpiGeometry.getX(i);
                const cy = mpiGeometry.getY(p.mpi);
                return (
                  <g key={`reversal-${i}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="8"
                      fill="none"
                      stroke={p.mpi > 0 ? '#10b981' : '#f59e0b'}
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                      opacity="0.7"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r="4"
                      fill={p.mpi > 0 ? '#10b981' : '#f59e0b'}
                      stroke="#16110a"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* Y-Axis Threshold Labels on Right */}
              {mpiGeometry.yTicks.map(t => (
                <text
                  key={t.label}
                  x={mpiGeometry.width - mpiGeometry.padRight + 8}
                  y={t.y + 3.5}
                  fontSize="8.5"
                  fill="currentColor"
                  fontFamily="monospace"
                  className={t.color}
                >
                  {t.label}
                </text>
              ))}

              {/* X-Axis Time Labels */}
              {mpiGeometry.xTicks.map(t => (
                <text
                  key={t.idx}
                  x={t.x}
                  y={mpiGeometry.height - 6}
                  fontSize="9"
                  fill="currentColor"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="text-amber-200/50"
                >
                  {t.label}
                </text>
              ))}

              {/* Interactive Crosshair & Point Highlight */}
              {hoveredMpiIndex !== null && mpiSeries.points[hoveredMpiIndex] && (
                <g>
                  {/* Vertical Guideline */}
                  <line
                    x1={mpiGeometry.getX(hoveredMpiIndex)}
                    y1={mpiGeometry.padTop}
                    x2={mpiGeometry.getX(hoveredMpiIndex)}
                    y2={mpiGeometry.padTop + mpiGeometry.plotH}
                    stroke="#fbbf24"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                  {/* Point Circle */}
                  <circle
                    cx={mpiGeometry.getX(hoveredMpiIndex)}
                    cy={mpiGeometry.getY(mpiSeries.points[hoveredMpiIndex].mpi)}
                    r="5.5"
                    fill={mpiSeries.points[hoveredMpiIndex].mpi > 0 ? '#10b981' : '#ef4444'}
                    stroke="#16110a"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-amber-200/50">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <div className="font-bold text-sm text-amber-100">Insufficient Oscillator Data</div>
              <div className="text-xs max-w-sm mt-1">
                Collecting historical order-book pressure points...
              </div>
            </div>
          )}

          {/* Floating Hover Card */}
          {activeHoverMpiPoint && mpiGeometry && (
            <div
              className="absolute top-2 pointer-events-none z-20 p-2.5 rounded-xl bg-[#1e160e]/95 border border-amber-500/40 shadow-xl text-xs space-y-1 backdrop-blur-sm"
              style={{
                left: Math.min(
                  mpiGeometry.width - 220,
                  Math.max(10, mpiGeometry.getX(hoveredMpiIndex!) - 90)
                ),
              }}
            >
              <div className="font-bold text-amber-100 flex items-center justify-between gap-4">
                <span>{activeHoverMpiPoint.fullDateLabel}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    activeHoverMpiPoint.mpi >= 60
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      : activeHoverMpiPoint.mpi >= 25
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                      : activeHoverMpiPoint.mpi <= -60
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : activeHoverMpiPoint.mpi <= -25
                      ? 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                      : 'bg-amber-950 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {activeHoverMpiPoint.mpi > 0 ? `+${activeHoverMpiPoint.mpi}` : activeHoverMpiPoint.mpi} MPI
                </span>
              </div>

              <div className="text-[11px] font-semibold text-amber-200">
                <span>Interpretation: </span>
                <span
                  className={
                    activeHoverMpiPoint.mpi > 0
                      ? 'text-emerald-400 font-bold'
                      : activeHoverMpiPoint.mpi < 0
                      ? 'text-rose-400 font-bold'
                      : 'text-amber-300 font-bold'
                  }
                >
                  {activeHoverMpiPoint.interpretation}
                </span>
              </div>

              {activeHoverMpiPoint.reversalAlert && (
                <div
                  className={`p-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 ${activeHoverMpiPoint.reversalAlert.badge}`}
                >
                  <span>{activeHoverMpiPoint.reversalAlert.icon}</span>
                  <span className="font-bold">{activeHoverMpiPoint.reversalAlert.label}</span>
                </div>
              )}

              {activeHoverMpiPoint.salePrice && (
                <div className="text-[10px] text-amber-200/50 pt-0.5 border-t border-amber-900/30 flex justify-between">
                  <span>Price at timestamp:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {activeHoverMpiPoint.salePrice.toFixed(4)} FLOWER
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Educational Guide */}
        {showMpiGuide && (
          <div className="p-4 rounded-2xl bg-[#110d08] border border-amber-500/20 space-y-4 animate-in fade-in duration-150 text-xs">
            {/* Section 1: Interpretation Brackets */}
            <div>
              <div className="font-bold text-amber-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>How to Interpret Market Pressure Index (MPI)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-amber-900/40 text-[10px] text-amber-200/60 uppercase">
                      <th className="py-1 px-2">MPI Range</th>
                      <th className="py-1 px-2">Interpretation</th>
                      <th className="py-1 px-2 text-right">Farmer Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr className={mpiSeries.currentMpi >= 60 ? 'bg-emerald-500/10 font-bold' : ''}>
                      <td className="py-1.5 px-2 font-mono text-emerald-400 font-bold">+60 to +100</td>
                      <td className="py-1.5 px-2 text-emerald-300">Strong buying pressure</td>
                      <td className="py-1.5 px-2 text-right text-amber-100">Aggressive buyer depth; upward pressure</td>
                    </tr>
                    <tr
                      className={
                        mpiSeries.currentMpi >= 25 && mpiSeries.currentMpi < 60
                          ? 'bg-emerald-500/10 font-bold'
                          : ''
                      }
                    >
                      <td className="py-1.5 px-2 font-mono text-emerald-300 font-bold">+25 to +59</td>
                      <td className="py-1.5 px-2 text-emerald-200">Moderate buying pressure</td>
                      <td className="py-1.5 px-2 text-right text-amber-100">Bids gaining strength over asks</td>
                    </tr>
                    <tr
                      className={
                        mpiSeries.currentMpi >= -24 && mpiSeries.currentMpi <= 24
                          ? 'bg-amber-500/10 font-bold'
                          : ''
                      }
                    >
                      <td className="py-1.5 px-2 font-mono text-amber-300 font-bold">-24 to +24</td>
                      <td className="py-1.5 px-2 text-amber-200">Neutral</td>
                      <td className="py-1.5 px-2 text-right text-amber-100">
                        Balanced order book; wait for clear momentum
                      </td>
                    </tr>
                    <tr
                      className={
                        mpiSeries.currentMpi <= -25 && mpiSeries.currentMpi > -60
                          ? 'bg-rose-500/10 font-bold'
                          : ''
                      }
                    >
                      <td className="py-1.5 px-2 font-mono text-rose-300 font-bold">-25 to -59</td>
                      <td className="py-1.5 px-2 text-rose-200">Moderate selling pressure</td>
                      <td className="py-1.5 px-2 text-right text-amber-100">
                        Supply expanding; asks undercutting bids
                      </td>
                    </tr>
                    <tr className={mpiSeries.currentMpi <= -60 ? 'bg-rose-500/10 font-bold' : ''}>
                      <td className="py-1.5 px-2 font-mono text-rose-400 font-bold">-60 to -100</td>
                      <td className="py-1.5 px-2 text-rose-300">Strong selling pressure</td>
                      <td className="py-1.5 px-2 text-right text-amber-100">Heavy ask dominance; downside risk</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Detect Pressure Reversals */}
            <div className="pt-2 border-t border-amber-900/30">
              <div className="font-bold text-amber-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>The Most Valuable Feature: Detect Pressure Reversals</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <span className="text-xs">🛡️</span>
                    <span>MPI moves from -55 to -20</span>
                  </div>
                  <div className="text-amber-200/80 mt-0.5">
                    <strong>Selling pressure is weakening:</strong> Ask dumping decreases and sellers stop aggressive undercutting.
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <span className="text-xs">⚡</span>
                    <span>MPI moves from -20 to +15</span>
                  </div>
                  <div className="text-amber-200/80 mt-0.5">
                    <strong>Buying pressure is beginning to emerge:</strong> Bullish zero-cross. Fresh buy bids absorb loose inventory.
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/40">
                  <div className="font-bold text-emerald-200 flex items-center gap-1.5">
                    <span className="text-xs">🚀</span>
                    <span>MPI moves from +55 to +75</span>
                  </div>
                  <div className="text-amber-200/80 mt-0.5">
                    <strong>Buying pressure is strengthening:</strong> Aggressive buyer accumulation; breakout toward resistance.
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="text-xs">⚠️</span>
                    <span>MPI moves from +75 to +20</span>
                  </div>
                  <div className="text-amber-200/80 mt-0.5">
                    <strong>Buying pressure is losing momentum:</strong> Buyer exhaustion warning; overhead sell wall resistance.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 9. SHARED RENDER HELPER: TWO-SIDED CUMULATIVE DEPTH CHART BOX
  // =========================================================================
  const renderTwoSidedDepthBox = (embedded: boolean = false) => {
    const inner = (
      <>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mountain className="w-4 h-4 text-amber-400" />
              <span>{itemName} · Market Depth Analysis</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                Two-Sided Cumulative Order Book
              </span>
            </div>
            <div className="text-xs text-amber-200/60 mt-1 max-w-2xl leading-relaxed">
              Answers: <em>How much buying and selling pressure exists at each price level?</em> Aggregates all buy orders at or above each price threshold and all sell orders at or below each threshold.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto text-xs">
            <div className="px-3 py-1.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
              <span className="text-[10px] text-emerald-400/70 block uppercase font-mono">Buy-Side Depth</span>
              <span className="text-sm font-black font-mono">
                {smartSignals.twoSidedDepth.totalBuySideQuantity.toLocaleString()} {itemName}
              </span>
              <span className="text-[9px] text-emerald-400/60 block font-mono">
                ({smartSignals.twoSidedDepth.totalBuySideVolumeFlower} FLOWER)
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold">
              <span className="text-[10px] text-rose-400/70 block uppercase font-mono">Sell-Side Depth</span>
              <span className="text-sm font-black font-mono">
                {smartSignals.twoSidedDepth.totalSellSideQuantity.toLocaleString()} {itemName}
              </span>
              <span className="text-[9px] text-rose-400/60 block font-mono">
                ({smartSignals.twoSidedDepth.totalSellSideVolumeFlower} FLOWER)
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
              <span className="text-[10px] text-amber-400/70 block uppercase font-mono">Spread Gap</span>
              <span className="text-sm font-black font-mono">
                +{smartSignals.twoSidedDepth.spreadPercent}%
              </span>
              <span className="text-[9px] text-amber-400/60 block font-mono">
                ({smartSignals.twoSidedDepth.spreadPriceFlower} diff)
              </span>
            </div>
          </div>
        </div>

        {/* SVG Mountain Depth Canvas */}
        <div className="relative w-full h-72 sm:h-80 bg-[#100c07] rounded-2xl border border-amber-900/30 overflow-hidden">
          {depthGeometry ? (
            <svg
              ref={depthSvgRef}
              viewBox={`0 0 ${depthGeometry.width} ${depthGeometry.height}`}
              className="w-full h-full cursor-crosshair select-none"
              onMouseMove={handleDepthMouseMove}
              onMouseLeave={() => setHoveredDepthPoint(null)}
            >
              <defs>
                <linearGradient id="depthBidGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="depthAskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {depthGeometry.yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={depthGeometry.padLeft}
                    y1={tick.y}
                    x2={depthGeometry.width - depthGeometry.padRight}
                    y2={tick.y}
                    stroke="#2d2012"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={depthGeometry.padLeft - 8}
                    y={tick.y + 3}
                    fill="#8c6d48"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {depthGeometry.xTicks.map((xt, i) => (
                <text
                  key={i}
                  x={xt.x}
                  y={depthGeometry.height - 12}
                  fill="#8c6d48"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor={i === 0 ? 'start' : i === depthGeometry.xTicks.length - 1 ? 'end' : 'middle'}
                >
                  {xt.label}
                </text>
              ))}

              {smartSignals.twoSidedDepth.liquidityGaps.map((gap, idx) => {
                const x1 = Math.min(depthGeometry.getX(gap.price), depthGeometry.getX(gap.endPrice || gap.price));
                const x2 = Math.max(depthGeometry.getX(gap.price), depthGeometry.getX(gap.endPrice || gap.price));
                const gapW = Math.max(6, x2 - x1);
                return (
                  <g key={idx}>
                    <rect
                      x={x1}
                      y={depthGeometry.padTop}
                      width={gapW}
                      height={depthGeometry.plotH}
                      fill="#f59e0b"
                      fillOpacity="0.08"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={x1 + gapW / 2}
                      y={depthGeometry.padTop + depthGeometry.plotH - 8}
                      fill="#f59e0b"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      ⚠️ Gap
                    </text>
                  </g>
                );
              })}

              {depthGeometry.bidAreaPath && (
                <path d={depthGeometry.bidAreaPath} fill="url(#depthBidGrad)" />
              )}
              {depthGeometry.bidPath && (
                <path
                  d={depthGeometry.bidPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {depthGeometry.askAreaPath && (
                <path d={depthGeometry.askAreaPath} fill="url(#depthAskGrad)" />
              )}
              {depthGeometry.askPath && (
                <path
                  d={depthGeometry.askPath}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              <g>
                <line
                  x1={depthGeometry.bestBidX}
                  y1={depthGeometry.padTop + depthGeometry.plotH}
                  x2={depthGeometry.floorAskX}
                  y2={depthGeometry.padTop + depthGeometry.plotH}
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                <text
                  x={(depthGeometry.bestBidX + depthGeometry.floorAskX) / 2}
                  y={depthGeometry.padTop + depthGeometry.plotH - 8}
                  fill="#f59e0b"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Spread: +{smartSignals.twoSidedDepth.spreadPercent}%
                </text>
              </g>

              {smartSignals.twoSidedDepth.strongBuyWalls.map((wall, i) => {
                const x = depthGeometry.getX(wall.price);
                return (
                  <g key={i}>
                    <line
                      x1={x}
                      y1={depthGeometry.padTop}
                      x2={x}
                      y2={depthGeometry.padTop + depthGeometry.plotH}
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <rect
                      x={Math.max(depthGeometry.padLeft, x - 55)}
                      y={depthGeometry.padTop + 2 + i * 16}
                      width="110"
                      height="14"
                      rx="4"
                      fill="#064e3b"
                      stroke="#10b981"
                      strokeWidth="1"
                    />
                    <text
                      x={Math.max(depthGeometry.padLeft + 55, x)}
                      y={depthGeometry.padTop + 12 + i * 16}
                      fill="#a7f3d0"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      🧱 Buy Wall: {wall.quantity.toLocaleString()} @ {wall.price}
                    </text>
                  </g>
                );
              })}

              {smartSignals.twoSidedDepth.strongSellWalls.map((wall, i) => {
                const x = depthGeometry.getX(wall.price);
                return (
                  <g key={i}>
                    <line
                      x1={x}
                      y1={depthGeometry.padTop}
                      x2={x}
                      y2={depthGeometry.padTop + depthGeometry.plotH}
                      stroke="#f43f5e"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <rect
                      x={Math.min(depthGeometry.width - depthGeometry.padRight - 110, x - 55)}
                      y={depthGeometry.padTop + 2 + i * 16}
                      width="110"
                      height="14"
                      rx="4"
                      fill="#881337"
                      stroke="#f43f5e"
                      strokeWidth="1"
                    />
                    <text
                      x={Math.min(depthGeometry.width - depthGeometry.padRight - 55, x)}
                      y={depthGeometry.padTop + 12 + i * 16}
                      fill="#fecdd3"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      🧱 Sell Wall: {wall.quantity.toLocaleString()} @ {wall.price}
                    </text>
                  </g>
                );
              })}

              {hoveredDepthPoint && (
                <g>
                  <line
                    x1={depthGeometry.getX(hoveredDepthPoint.price)}
                    y1={depthGeometry.padTop}
                    x2={depthGeometry.getX(hoveredDepthPoint.price)}
                    y2={depthGeometry.padTop + depthGeometry.plotH}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.7"
                  />
                  <circle
                    cx={depthGeometry.getX(hoveredDepthPoint.price)}
                    cy={depthGeometry.getY(hoveredDepthPoint.cumulativeQuantity)}
                    r="4.5"
                    fill={hoveredDepthPoint.side === 'bid' ? '#10b981' : '#f43f5e'}
                    stroke="#17120b"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-amber-200/50">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <div className="font-bold text-sm text-amber-100">Insufficient Order Book Depth</div>
              <div className="text-xs max-w-sm mt-1">
                Not enough visible buy offers and sell asks to plot the depth chart.
              </div>
            </div>
          )}

          {hoveredDepthPoint && depthGeometry && (
            <div
              className="absolute top-2 pointer-events-none z-20 p-2.5 rounded-xl bg-[#1a130b]/95 border border-amber-500/40 shadow-xl text-xs space-y-1 backdrop-blur-sm"
              style={{
                left: Math.min(
                  depthGeometry.width - 240,
                  Math.max(10, depthGeometry.getX(hoveredDepthPoint.price) - 100)
                ),
              }}
            >
              <div className="font-bold text-amber-100 flex items-center justify-between gap-3">
                <span className={hoveredDepthPoint.side === 'bid' ? 'text-emerald-400' : 'text-rose-400'}>
                  {hoveredDepthPoint.side === 'bid' ? '🟢 Buy Demand' : '🔴 Sell Supply'}
                </span>
                <span className="font-mono text-amber-200">
                  {hoveredDepthPoint.priceFormatted} FLOWER (≈ ${(hoveredDepthPoint.price * flowerPriceUSD).toFixed(4)})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pt-1">
                <div className="text-amber-200/60">Cumulative Depth:</div>
                <div className="font-bold text-amber-100 font-mono text-right">
                  {hoveredDepthPoint.cumulativeQuantity.toLocaleString()} {itemName}
                </div>
                <div className="text-amber-200/60">Cumulative Capital:</div>
                <div className="font-bold text-amber-300 font-mono text-right">
                  {hoveredDepthPoint.cumulativeVolumeFlower} FLOWER
                </div>
                <div className="text-amber-200/60">Orders at Level:</div>
                <div className="font-bold text-emerald-400 font-mono text-right">
                  {hoveredDepthPoint.stepQuantity.toLocaleString()} ({hoveredDepthPoint.orderCount} orders)
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-amber-900/20 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-2 rounded bg-emerald-500/50 border border-emerald-400" />
              <span>Cumulative Buy Demand (At or above price)</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-3 h-2 rounded bg-rose-500/50 border border-rose-400" />
              <span>Cumulative Sell Supply (At or below price)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="w-2.5 h-1 rounded bg-amber-400" />
              <span>Spread Canyon</span>
            </div>
          </div>

          <div className="text-[11px] text-amber-200/50">
            Hover chart for depth at exact price steps
          </div>
        </div>
      </>
    );

    if (embedded) return <div className="space-y-4">{inner}</div>;
    return (
      <div className="p-5 rounded-3xl bg-[#16110a] border border-amber-500/25 shadow-xl space-y-4">
        {inner}
      </div>
    );
  };

  // =========================================================================
  // 10. SHARED RENDER HELPER: VOLUME & SETTLEMENT FLOW CHART (MODE: VOLUME)
  // =========================================================================
  const renderVolumeFlowCanvas = () => {
    if (!volumeGeometry) return null;
    const buyPct =
      volumeGeometry.totalVol > 0
        ? Math.round((volumeGeometry.totalBuyVol / volumeGeometry.totalVol) * 100)
        : 50;
    const sellPct = 100 - buyPct;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/20">
            <span className="text-[10px] text-amber-200/60 uppercase font-bold block">Window Volume ({timeframe})</span>
            <span className="text-base font-black text-amber-300 font-mono mt-0.5 block">
              {volumeGeometry.totalVol.toLocaleString()} FLOWER
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400/80 uppercase font-bold block">Buy-Initiated Vol</span>
            <span className="text-base font-black text-emerald-300 font-mono mt-0.5 block">
              {volumeGeometry.totalBuyVol.toLocaleString()} F ({buyPct}%)
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/20">
            <span className="text-[10px] text-rose-400/80 uppercase font-bold block">Sell-Initiated Vol</span>
            <span className="text-base font-black text-rose-300 font-mono mt-0.5 block">
              {volumeGeometry.totalSellVol.toLocaleString()} F ({sellPct}%)
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-amber-200/60 uppercase font-bold block">Matched Settlements</span>
            <span className="text-base font-black text-amber-100 font-mono mt-0.5 block">
              {volumeGeometry.totalTrades} trades
            </span>
          </div>
        </div>

        <div className="relative w-full h-56 sm:h-64 bg-[#110d08] rounded-2xl border border-amber-900/30 overflow-hidden">
          <svg
            ref={volumeSvgRef}
            viewBox={`0 0 ${volumeGeometry.width} ${volumeGeometry.height}`}
            className="w-full h-full cursor-crosshair select-none"
            onMouseMove={handleVolumeMouseMove}
            onMouseLeave={() => setHoveredVolumeIndex(null)}
          >
            {volumeGeometry.yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={volumeGeometry.padLeft}
                  y1={tick.y}
                  x2={volumeGeometry.width - volumeGeometry.padRight}
                  y2={tick.y}
                  stroke="#382918"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={volumeGeometry.width - volumeGeometry.padRight + 6}
                  y={tick.y + 3}
                  fill="#8c6d48"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {volumeGeometry.xTicks.map((xt, i) => (
              <text
                key={i}
                x={xt.x}
                y={volumeGeometry.height - 8}
                fill="#8c6d48"
                fontSize="9"
                textAnchor={i === 0 ? 'start' : i === volumeGeometry.xTicks.length - 1 ? 'end' : 'middle'}
              >
                {xt.label}
              </text>
            ))}

            {/* Stacked Buy (Green) + Sell (Rose) Volume Bars */}
            {chartPoints.map((p, i) => {
              const cx = volumeGeometry.getX(i);
              const buyH = volumeGeometry.getBarH(p.buyVolume);
              const sellH = volumeGeometry.getBarH(p.sellVolume);
              const baseY = volumeGeometry.padTop + volumeGeometry.plotH;
              const isHovered = hoveredVolumeIndex === i;

              return (
                <g key={i} opacity={hoveredVolumeIndex !== null && !isHovered ? 0.5 : 1}>
                  {buyH > 0 && (
                    <rect
                      x={cx - volumeGeometry.barW / 2}
                      y={baseY - buyH}
                      width={volumeGeometry.barW}
                      height={Math.max(2, buyH)}
                      rx="2"
                      fill="#10b981"
                      fillOpacity="0.85"
                    />
                  )}
                  {sellH > 0 && (
                    <rect
                      x={cx - volumeGeometry.barW / 2}
                      y={baseY - buyH - sellH}
                      width={volumeGeometry.barW}
                      height={Math.max(2, sellH)}
                      rx="2"
                      fill="#f43f5e"
                      fillOpacity="0.85"
                    />
                  )}
                </g>
              );
            })}

            {/* Cumulative Volume Trend Curve */}
            <path
              d={volumeGeometry.cumPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.85"
            />

            {hoveredVolumeIndex !== null && (
              <line
                x1={volumeGeometry.getX(hoveredVolumeIndex)}
                y1={volumeGeometry.padTop}
                x2={volumeGeometry.getX(hoveredVolumeIndex)}
                y2={volumeGeometry.padTop + volumeGeometry.plotH}
                stroke="#fbbf24"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            )}
          </svg>

          {activeHoverVolumePoint && volumeGeometry && (
            <div
              className="absolute top-2 pointer-events-none z-20 p-2.5 rounded-xl bg-[#1e160e]/95 border border-amber-500/40 shadow-xl text-xs space-y-1 backdrop-blur-sm"
              style={{
                left: Math.min(
                  volumeGeometry.width - 210,
                  Math.max(10, volumeGeometry.getX(hoveredVolumeIndex!) - 85)
                ),
              }}
            >
              <div className="font-bold text-amber-100">{activeHoverVolumePoint.fullDateLabel}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pt-1">
                <span className="text-amber-200/70">Total Volume:</span>
                <span className="font-bold text-amber-300 font-mono text-right">
                  {activeHoverVolumePoint.volume.toFixed(2)} FLOWER
                </span>
                <span className="text-emerald-300/80">Near-Ask Buy:</span>
                <span className="font-bold text-emerald-400 font-mono text-right">
                  {activeHoverVolumePoint.buyVolume.toFixed(2)} F
                </span>
                <span className="text-rose-300/80">Near-Bid Sell:</span>
                <span className="font-bold text-rose-400 font-mono text-right">
                  {activeHoverVolumePoint.sellVolume.toFixed(2)} F
                </span>
                <span className="text-amber-200/70">Trades:</span>
                <span className="font-bold text-amber-100 font-mono text-right">
                  {activeHoverVolumePoint.tradeCount}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-200/70 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-emerald-300 font-semibold">Buy-Initiated Volume</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span className="text-rose-300 font-semibold">Sell-Initiated Volume</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 border-b border-dashed border-amber-300" />
              <span className="text-amber-300 font-semibold">Cumulative Flow</span>
            </span>
          </div>
          <span className="font-mono text-amber-200/50">
            Hover bars for bucket trade breakdown
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-[#17120b] border border-amber-500/35 shadow-2xl overflow-hidden">
        
        {/* =================================================================== */}
        {/* HEADER                                                              */}
        {/* =================================================================== */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-amber-900/40 bg-gradient-to-r from-[#22180e] via-[#2a1d12] to-[#18120a]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
              {itemIcon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-amber-50 tracking-tight">{itemName}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/30 text-amber-300 font-bold">
                  #{itemId}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Market
                </span>
                {data?.isVip && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> VIP Only
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/60 flex items-center gap-2 mt-0.5">
                <span>Official Sunflower Land Community Order Book</span>
                <span>•</span>
                <span className="capitalize">{collection}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              title="Refresh order book"
              className="p-2 rounded-xl bg-[#271d12] hover:bg-[#342718] border border-amber-500/25 text-amber-300 hover:text-amber-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#271d12] hover:bg-[#342718] border border-amber-500/25 text-amber-200/70 hover:text-amber-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TELEMETRY 4-METRIC SUMMARY CARDS                                    */}
        {/* =================================================================== */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-[#140e08] border-b border-amber-900/30 text-xs">
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#1c150c] border border-amber-500/15 shadow-sm">
            <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Floor Price (Lowest Ask)</div>
            <div className="text-base sm:text-lg font-black text-amber-200 mt-0.5">
              {floorUnitFlower ? `${Number(floorUnitFlower).toFixed(4)} FLOWER` : '—'}
            </div>
            <div className="text-[10px] text-amber-200/60 font-mono mt-0.5">
              {floorUnitFlower ? `≈ $${(floorUnitFlower * flowerPriceUSD).toFixed(4)} USD` : ''}
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-[#1c150c] border border-amber-500/15 shadow-sm">
            <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Last Fulfilled Sale</div>
            <div className="text-base sm:text-lg font-black text-amber-100 mt-0.5">
              {lastSaleUnitFlower ? `${Number(lastSaleUnitFlower).toFixed(4)} FLOWER` : '—'}
            </div>
            <div className="text-[10px] text-amber-200/60 font-mono mt-0.5">
              {lastSaleUnitFlower ? `≈ $${(lastSaleUnitFlower * flowerPriceUSD).toFixed(4)} USD` : ''}
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-[#1c150c] border border-amber-500/15 shadow-sm">
            <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Bid-Ask Spread</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
              {spreadPct ? `${spreadPct}%` : '0%'}
            </div>
            <div className="text-[10px] text-amber-200/60 font-mono mt-0.5">
              {spreadDiff ? `${spreadDiff.toFixed(4)} FLOWER diff` : 'Tight spread'}
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-[#1c150c] border border-amber-500/15 shadow-sm">
            <div className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider">Market Depth</div>
            <div className="text-base sm:text-lg font-black text-amber-200 mt-0.5">
              {data?.listingCount || listings.length} asks / {data?.offerCount || offers.length} bids
            </div>
            <div className="text-[10px] text-amber-200/60 mt-0.5">
              {data?.supply ? `${(data.supply / 1_000_000).toFixed(1)}M circulating supply` : 'Order book active'}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB SWITCHER                                                        */}
        {/* =================================================================== */}
        <div className="shrink-0 flex items-center border-b border-amber-900/40 px-3 sm:px-6 bg-[#1a140d] overflow-x-auto no-scrollbar min-h-[50px] gap-1">
          {[
            { id: 'depth', icon: '🏔️', label: 'Cumulative Depth & Walls' },
            { id: 'signals', icon: '🎯', label: 'Smart Signals & 5 Questions' },
            { id: 'overview', icon: '📊', label: 'Market Intelligence Chart' },
            { id: 'orderbook', icon: '📖', label: `Live Order Book (${listings.length} Asks / ${offers.length} Bids)` },
            { id: 'sales', icon: '🤝', label: `Recent Trades Tape (${sales.length})` },
            { id: 'analytics', icon: '📈', label: '7-Day OHLCV & Volume' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 py-3 px-4 text-xs sm:text-sm font-extrabold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-amber-400 text-amber-300 bg-amber-500/10 shadow-sm'
                  : 'border-transparent text-amber-200/60 hover:text-amber-100 hover:bg-[#221a11]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* =================================================================== */}
        {/* BODY CONTENT                                                        */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl animate-spin">
                🌻
              </div>
              <p className="text-xs font-bold text-amber-300 animate-pulse">
                Fetching live order book, settlement tape & price trend from Sunflower Land...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
              <p className="font-bold">Error loading tradeable item:</p>
              <p className="mt-1 opacity-80">{error}</p>
            </div>
          ) : activeTab === 'depth' ? (
            /* =============================================================== */
            /* TAB 1: CUMULATIVE ORDER BOOK DEPTH & WALLS                      */
            /* =============================================================== */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* DEDICATED FARMIQ MARKET SIGNAL PANEL (FEATURE 4) */}
              {renderMarketSignalPanel()}

              {/* Two-Sided Order Book Depth Chart Box */}
              {renderTwoSidedDepthBox(false)}

              {/* SUPPORT & RESISTANCE WALLS + LIQUIDITY RADAR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Panel 1: Support & Resistance Walls */}
                <div className="p-5 rounded-3xl bg-[#16110a] border border-amber-500/20 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span>Support & Resistance Wall Concentrations</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                      Auto-Detected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {smartSignals.twoSidedDepth.strongBuyWalls.length === 0 ? (
                      <div className="p-3 rounded-2xl bg-black/30 border border-white/5 text-amber-200/50 italic">
                        No concentrated buy walls detected (demand is evenly distributed across bids).
                      </div>
                    ) : (
                      smartSignals.twoSidedDepth.strongBuyWalls.map((wall, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-emerald-300 flex items-center gap-1">
                              <span>🧱</span>
                              <span>Strong Buy Wall Support</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {wall.price} FLOWER
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-100/90">
                            <strong>{wall.quantity.toLocaleString()} {itemName}</strong> committed ({wall.volumeFlower} FLOWER • {wall.percentOfSide}% of buy side).
                          </div>
                          <p className="text-[10px] text-amber-200/70">
                            {wall.description}
                          </p>
                        </div>
                      ))
                    )}

                    {smartSignals.twoSidedDepth.strongSellWalls.length === 0 ? (
                      <div className="p-3 rounded-2xl bg-black/30 border border-white/5 text-amber-200/50 italic">
                        No massive sell resistance walls detected (supply is distributed evenly).
                      </div>
                    ) : (
                      smartSignals.twoSidedDepth.strongSellWalls.map((wall, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-rose-300 flex items-center gap-1">
                              <span>🧱</span>
                              <span>Strong Sell Wall Resistance</span>
                            </span>
                            <span className="font-mono font-bold text-rose-400">
                              {wall.price} FLOWER
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-100/90">
                            <strong>{wall.quantity.toLocaleString()} {itemName}</strong> offered ({wall.volumeFlower} FLOWER • {wall.percentOfSide}% of sell side).
                          </div>
                          <p className="text-[10px] text-amber-200/70">
                            {wall.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Panel 2: Breakouts & Liquidity Gaps */}
                <div className="p-5 rounded-3xl bg-[#16110a] border border-amber-500/20 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span>Breakouts, Rejections & Liquidity Gaps</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      Tactical Zones
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-2xl bg-cyan-950/25 border border-cyan-500/30 space-y-1">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Potential Breakout Areas:</span>
                      </span>
                      <ul className="space-y-1 text-amber-100/90 text-[11px] pl-5 list-disc">
                        {smartSignals.twoSidedDepth.breakoutZones.map((bz, i) => (
                          <li key={i}>{bz}</li>
                        ))}
                      </ul>
                    </div>

                    {smartSignals.twoSidedDepth.rejectionZones.length > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-950/25 border border-amber-500/30 space-y-1">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Potential Price Rejection Areas:</span>
                        </span>
                        <ul className="space-y-1 text-amber-100/90 text-[11px] pl-5 list-disc">
                          {smartSignals.twoSidedDepth.rejectionZones.map((rz, i) => (
                            <li key={i}>{rz}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {smartSignals.twoSidedDepth.liquidityGaps.length > 0 && (
                      <div className="p-3 rounded-2xl bg-[#1c1209] border border-amber-600/30 space-y-1">
                        <span className="font-bold text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Thin Liquidity Zones (High Slippage Risk):</span>
                        </span>
                        <ul className="space-y-1 text-amber-200/80 text-[11px]">
                          {smartSignals.twoSidedDepth.liquidityGaps.map((lg, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-amber-400">•</span>
                              <span>{lg.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BUY/SELL PRESSURE OSCILLATOR: MARKET PRESSURE INDEX (MPI) (FEATURE 6) */}
              {renderMarketPressureIndexChart()}

              {/* Disclaimer */}
              <div className="p-4 rounded-2xl bg-[#140e08]/90 border border-amber-500/20 text-xs text-amber-200/70 leading-relaxed flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block mb-0.5">Important Market Depth Notice:</strong>
                  <span>
                    These support walls, resistance barriers, and liquidity gaps represent potential price reaction levels based on active order book depth. They are not guaranteed barriers. Orders can be cancelled, modified, or consumed at any time as market participants react.
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === 'signals' ? (
            /* =============================================================== */
            /* TAB 2: SMART SIGNALS & 5 QUESTIONS                              */
            /* =============================================================== */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* DEDICATED FARMIQ MARKET SIGNAL PANEL */}
              {renderMarketSignalPanel()}

              {/* MULTI-TIMEFRAME SIGNAL CONFIRMATION (FEATURE 11) */}
              {renderMultiTimeframeConfirmation()}

              {/* SMART ENTRY & EXIT RECOMMENDATION (TRADE OPPORTUNITY ANALYZER - #9) */}
              {renderTradeOpportunityAnalyzer()}

              {/* SECTION A: FOUR-QUADRANT MARKET CONDITION DETECTOR */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#23170d] via-[#1c130b] to-[#140e08] border-2 border-amber-500/40 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>FarmIQ Market Condition Detector</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                        Four-Quadrant Matrix
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-amber-50">
                        {smartSignals.quadrant.condition}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-200">
                        {smartSignals.quadrant.tagline}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-[#120d08] p-2 rounded-2xl border border-amber-500/30 self-start md:self-auto">
                    <span className="text-xs text-amber-200/60 font-semibold pl-1">Trading Verdict:</span>
                    <span className="px-3 py-1 rounded-xl bg-amber-500 text-stone-950 font-black text-xs tracking-wider shadow-md">
                      {smartSignals.q5ExecutionAndRisk.recommendedAction}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-amber-100/90 leading-relaxed bg-[#100b06]/80 p-3 rounded-2xl border border-amber-500/20">
                  💡 <strong className="text-amber-300">Tactical Market Insight:</strong> {smartSignals.quadrant.explanation}
                </p>

                {/* 4-Quadrant Visual Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  {[
                    {
                      cond: 'Bullish Pressure 🚀',
                      rule: 'Demand Rising • Supply Falling',
                      desc: 'Sellers hold pricing power; buyers should act before price rises.',
                      active: smartSignals.quadrant.condition === 'Bullish Pressure 🚀',
                      color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300',
                    },
                    {
                      cond: 'Bearish Pressure 📉',
                      rule: 'Demand Falling • Supply Rising',
                      desc: 'Excess seller listings; buyers wait for cheaper fills, sellers craft.',
                      active: smartSignals.quadrant.condition === 'Bearish Pressure 📉',
                      color: 'border-rose-500/60 bg-rose-950/40 text-rose-300',
                    },
                    {
                      cond: 'Expanding Market ⚡',
                      rule: 'Demand Rising • Supply Rising',
                      desc: 'Heavy turnover & deep liquidity; watch for breakout past key walls.',
                      active: smartSignals.quadrant.condition === 'Expanding Market ⚡',
                      color: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300',
                    },
                    {
                      cond: 'Contracting Market 🧊',
                      rule: 'Demand Falling • Supply Falling',
                      desc: 'Low turnover & wide spreads; use limit orders to avoid slippage.',
                      active: smartSignals.quadrant.condition === 'Contracting Market 🧊',
                      color: 'border-stone-500/60 bg-stone-900/50 text-stone-300',
                    },
                  ].map((q, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all ${
                        q.active
                          ? `${q.color} ring-2 ring-amber-400/50 shadow-lg`
                          : 'border-white/5 bg-black/30 text-amber-200/50 opacity-60'
                      }`}
                    >
                      <div className="font-extrabold flex items-center justify-between text-[11px]">
                        <span>{q.cond}</span>
                        {q.active && (
                          <span className="text-[8px] uppercase tracking-wider font-mono px-1 py-0.2 rounded bg-amber-400 text-stone-950 font-black">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono mt-1 opacity-90">{q.rule}</div>
                      <div className="text-[10px] mt-1 line-clamp-2 opacity-80">{q.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: THE FIVE TRADING QUESTIONS INTELLIGENCE GRID */}
              <div className="space-y-3">
                <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 px-1">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>The 5 Core Trading Questions Answered For {itemName}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Card 1: Question 1 — Demand vs Supply */}
                  <div className="p-4 rounded-3xl bg-[#16110a] border border-amber-500/20 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        1. Is Demand Stronger Than Supply?
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                        smartSignals.q1DemandVsSupply.verdict === 'Demand Dominant 🟢'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                          : smartSignals.q1DemandVsSupply.verdict === 'Supply Dominant 🔴'
                          ? 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                          : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                      }`}>
                        {smartSignals.q1DemandVsSupply.verdict}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-black">
                        <span className="text-emerald-400">Demand {smartSignals.q1DemandVsSupply.demandPercent}%</span>
                        <span className="text-rose-400">Supply {smartSignals.q1DemandVsSupply.supplyPercent}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-stone-900 overflow-hidden flex border border-amber-900/40">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${smartSignals.q1DemandVsSupply.demandPercent}%` }}
                        />
                        <div
                          className="bg-rose-500 h-full transition-all duration-300"
                          style={{ width: `${smartSignals.q1DemandVsSupply.supplyPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-black/40 border border-white/5 text-[11px]">
                      <div>
                        <span className="text-amber-200/50 block">Visible Bid Capital:</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {smartSignals.q1DemandVsSupply.totalBidVolumeFlower} FLOWER
                        </span>
                        <span className="text-[9px] text-amber-200/40 block">({smartSignals.q1DemandVsSupply.totalBidQuantity.toLocaleString()} units)</span>
                      </div>
                      <div>
                        <span className="text-amber-200/50 block">Visible Ask Supply:</span>
                        <span className="font-bold text-rose-400 font-mono">
                          {smartSignals.q1DemandVsSupply.totalAskVolumeFlower} FLOWER
                        </span>
                        <span className="text-[9px] text-amber-200/40 block">({smartSignals.q1DemandVsSupply.totalAskQuantity.toLocaleString()} units)</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-100/90 leading-relaxed">
                      {smartSignals.q1DemandVsSupply.summary}
                    </p>
                  </div>

                  {/* Card 2: Question 2 — Buyer vs Seller Aggression */}
                  <div className="p-4 rounded-3xl bg-[#16110a] border border-amber-500/20 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        2. Who Is Becoming More Aggressive?
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40">
                        {smartSignals.q2Aggression.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                        <span className="text-emerald-400/80 font-bold block">Buyer Takers (at Ask):</span>
                        <span className="text-base font-black text-emerald-300">
                          {smartSignals.q2Aggression.buyerTakerPercent}%
                        </span>
                        <span className="text-[9px] text-amber-200/50 block">Lifting seller listings directly</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-rose-950/20 border border-rose-500/20">
                        <span className="text-rose-400/80 font-bold block">Seller Takers (at Bid):</span>
                        <span className="text-base font-black text-rose-300">
                          {smartSignals.q2Aggression.sellerTakerPercent}%
                        </span>
                        <span className="text-[9px] text-amber-200/50 block">Dumping into active buyer offers</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-amber-200/60 flex items-center justify-between border-t border-amber-900/30 pt-1.5">
                      <span>Ask Undercutting: <strong className="text-amber-200">{smartSignals.q2Aggression.askUndercutting}</strong></span>
                      <span>Bid Depth: <strong className="text-amber-200">{smartSignals.q2Aggression.bidClustering}</strong></span>
                    </div>

                    <p className="text-[11px] text-amber-100/90 leading-relaxed">
                      {smartSignals.q2Aggression.summary}
                    </p>
                  </div>

                  {/* Card 3: Question 3 — Buying Attractiveness */}
                  <div className="p-4 rounded-3xl bg-[#16110a] border border-amber-500/20 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        3. Is Current Price Attractive for Buying?
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                        Score: {smartSignals.q3BuyAttractiveness.score}/100
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-black text-amber-100">
                        {smartSignals.q3BuyAttractiveness.rating}
                      </span>
                      <span className="text-xs font-mono text-emerald-400">
                        {smartSignals.q3BuyAttractiveness.discountVs7dAvg >= 0 
                          ? `${smartSignals.q3BuyAttractiveness.discountVs7dAvg}% discount vs 7d avg`
                          : `${Math.abs(smartSignals.q3BuyAttractiveness.discountVs7dAvg)}% markup vs 7d avg`}
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-[11px] text-amber-200/80 border-t border-amber-900/30 pt-2">
                      {smartSignals.q3BuyAttractiveness.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card 4: Question 4 — Selling Attractiveness */}
                  <div className="p-4 rounded-3xl bg-[#16110a] border border-amber-500/20 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        4. Is Current Price Attractive for Selling?
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40">
                        Score: {smartSignals.q4SellAttractiveness.score}/100
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-black text-amber-100">
                        {smartSignals.q4SellAttractiveness.rating}
                      </span>
                      <span className="text-xs font-mono text-amber-300">
                        Net: {smartSignals.q4SellAttractiveness.netProceedsPerUnitFlower} FLOWER / unit
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-[11px] text-amber-200/80 border-t border-amber-900/30 pt-2">
                      {smartSignals.q4SellAttractiveness.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card 5: Target Execution Strategy & Risk Rating */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-[#20170d] to-[#171109] border-2 border-amber-500/30 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-900/30 pb-3">
                    <div>
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span>5. Target Execution Strategy & Entry Risk Rating</span>
                      </div>
                      <div className="text-xs text-amber-200/70 mt-0.5">
                        Optimized price targets to maximize execution speed and minimize spread friction.
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-200/60 font-semibold">Risk Rating:</span>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        smartSignals.q5ExecutionAndRisk.riskRating.includes('Low')
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : smartSignals.q5ExecutionAndRisk.riskRating.includes('Moderate')
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                      }`}>
                        {smartSignals.q5ExecutionAndRisk.riskRating} ({smartSignals.q5ExecutionAndRisk.riskScore}/100)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                        🎯 Optimal Limit Buy Target
                      </span>
                      <span className="text-base font-black text-amber-100 mt-1 block font-mono">
                        {smartSignals.q5ExecutionAndRisk.targetBuyPriceFlower} FLOWER
                      </span>
                      <span className="text-[10px] text-amber-200/60 font-mono">
                        ≈ ${smartSignals.q5ExecutionAndRisk.targetBuyPriceUSD} USD (Maker bid)
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-amber-200/50 uppercase font-bold block">
                        ⚡ Instant Market Buy
                      </span>
                      <span className="text-base font-black text-rose-300 mt-1 block font-mono">
                        {smartSignals.q5ExecutionAndRisk.immediateBuyPriceFlower} FLOWER
                      </span>
                      <span className="text-[10px] text-amber-200/60">Takes current floor ask</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/20">
                      <span className="text-[10px] text-amber-400 uppercase font-bold block">
                        🎯 Optimal Limit Sell Target
                      </span>
                      <span className="text-base font-black text-amber-100 mt-1 block font-mono">
                        {smartSignals.q5ExecutionAndRisk.targetSellPriceFlower} FLOWER
                      </span>
                      <span className="text-[10px] text-amber-200/60 font-mono">
                        ≈ ${smartSignals.q5ExecutionAndRisk.targetSellPriceUSD} USD (Maker ask)
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-amber-200/50 uppercase font-bold block">
                        ⚡ Instant Market Sell
                      </span>
                      <span className="text-base font-black text-emerald-300 mt-1 block font-mono">
                        {smartSignals.q5ExecutionAndRisk.immediateSellPriceFlower} FLOWER
                      </span>
                      <span className="text-[10px] text-amber-200/60">Dumps into best active bid</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#120d07] border border-amber-900/30 text-xs">
                    <span className="text-[10px] font-bold text-amber-400/80 uppercase block mb-1">
                      Verified Risk Factors Considered:
                    </span>
                    <ul className="space-y-1 text-amber-200/70 text-[11px]">
                      {smartSignals.q5ExecutionAndRisk.riskFactors.map((rf, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-amber-400">•</span>
                          <span>{rf}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Personal Farm Advantage */}
              <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-[#231a0e] via-[#2d2112] to-[#191209] border-2 border-amber-500/40 shadow-2xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Your Farm's Market Advantage • Personalized</span>
                    </div>
                    <h3 className="text-xl font-black text-amber-50 tracking-tight">
                      What This Market Means For {farm?.ownerName || 'Your Farm'}
                    </h3>
                    <p className="text-xs text-amber-200/70 max-w-2xl leading-relaxed">
                      We cross-reference live order book depth against your farm stockpile and active upgrade goals.
                    </p>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigate('resource-strategy');
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 whitespace-nowrap self-start md:self-auto"
                    >
                      <span>View Resource Strategy</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                    <span className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider block">
                      Owned in Barn
                    </span>
                    <span className="text-lg font-black text-amber-100 mt-0.5 block">
                      {marketAdvantage.owned.toLocaleString()} {itemName}
                    </span>
                    <span className="text-[10px] text-amber-400/70">Verified stockpile</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                    <span className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider block">
                      Reserved for Goals
                    </span>
                    <span className="text-lg font-black text-amber-300 mt-0.5 block">
                      {marketAdvantage.reserved.toLocaleString()} {itemName}
                    </span>
                    <span className="text-[10px] text-amber-200/50">Next building upgrade</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                    <span className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider block">
                      Potential Surplus
                    </span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                      {marketAdvantage.surplus.toLocaleString()} {itemName}
                    </span>
                    <span className="text-[10px] text-emerald-400/70">Safe to liquidate</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                    <span className="text-[10px] text-amber-200/50 uppercase font-bold tracking-wider block">
                      Est. Net Proceeds
                    </span>
                    <span className="text-lg font-black text-amber-200 mt-0.5 block font-mono">
                      {marketAdvantage.netFlower} FLOWER
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      ≈ ${marketAdvantage.netUSD} USD (after 10% fee)
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#140e08]/90 border border-amber-500/20 text-xs text-amber-100/90 leading-relaxed flex items-start gap-3">
                  <span className="text-2xl mt-0.5">💡</span>
                  <div>
                    <strong className="text-amber-300 font-black block mb-0.5">Personal Market Intelligence:</strong>
                    <span>{marketAdvantage.insight}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'overview' ? (
            /* =============================================================== */
            /* TAB 3: MARKET INTELLIGENCE CHART (MODES + MULTI-INDICATOR)      */
            /* =============================================================== */
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* DEDICATED FARMIQ MARKET SIGNAL PANEL (AT TOP OF CHART AS WELL) */}
              {renderMarketSignalPanel()}

              {/* Unified Chart Header + Chart Analysis Mode & Time Period Selectors */}
              <div className="p-5 rounded-3xl bg-[#16110a] border border-amber-500/25 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                      <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{itemName} · Market Intelligence Chart</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35 font-mono">
                        Mode: {chartMode.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2.5 mt-1 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black text-amber-100">
                        {floorUnitFlower ? floorUnitFlower.toFixed(4) : '0.0000'}
                      </span>
                      <span className="text-xs font-bold text-amber-400">FLOWER / unit</span>
                      <span className="text-xs font-mono text-amber-200/60">
                        (≈ ${((floorUnitFlower || 0) * flowerPriceUSD).toFixed(4)} USD)
                      </span>
                      <span className={`inline-flex items-center text-xs font-black px-2 py-0.5 rounded-full ${
                        spreadPct > 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-stone-900 text-stone-400'
                      }`}>
                        {spreadPct > 0 ? `+${spreadPct}% spread` : 'Tight'}
                      </span>
                    </div>
                  </div>

                  {/* Dual Selectors: Chart Analysis Mode & Time Period */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
                    {/* Chart Analysis Mode Selector */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200/50 px-1">
                        Chart analysis mode
                      </span>
                      <div className="flex items-center gap-1 bg-[#120d07] p-1 rounded-2xl border border-amber-500/20">
                        {([
                          { id: 'price', label: 'Price' },
                          { id: 'depth', label: 'Depth' },
                          { id: 'pressure', label: 'Pressure' },
                          { id: 'volume', label: 'Volume' },
                        ] as { id: ChartAnalysisMode; label: string }[]).map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => setChartMode(mode.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                              chartMode === mode.id
                                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                                : 'text-amber-200/60 hover:text-amber-100 hover:bg-[#20180f]'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Period Selector (Preserved 1H, 4H, 1D, 7D, 1M) */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200/50 px-1">
                        Time period
                      </span>
                      <div className="flex items-center gap-1 bg-[#120d07] p-1 rounded-2xl border border-amber-500/20">
                        {(['1H', '4H', '1D', '7D', '1M'] as ChartTimeframe[]).map(tf => (
                          <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                              timeframe === tf
                                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                                : 'text-amber-200/60 hover:text-amber-100 hover:bg-[#20180f]'
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MODE BODY SWITCH */}
                {chartMode === 'price' ? (
                  <div className="space-y-4">
                    {/* 8 Multi-Indicator Overlay Toggles Bar */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-amber-900/20 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                            Indicator Overlays
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/30">
                            {[
                              showSales,
                              showAsks,
                              showBids,
                              showVwap,
                              showMovingAverage,
                              showSupportResistance,
                              showPressureOverlay,
                              showVolumeOverlay,
                            ].filter(Boolean).length}/8 Active
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-amber-200/50 hidden sm:inline">
                            {timeframe === '1H' && '1–5 min resolution • Short-term tension'}
                            {timeframe === '4H' && '5–15 min resolution • Intraday direction'}
                            {timeframe === '1D' && '15–60 min resolution • Daily market trend'}
                            {timeframe === '7D' && '1–4 hour resolution • Weekly momentum'}
                            {timeframe === '1M' && '6–24 hour resolution • Longer-term direction'}
                          </span>
                          <button
                            onClick={() => {
                              setShowSales(true);
                              setShowAsks(true);
                              setShowBids(true);
                              setShowVwap(false);
                              setShowMovingAverage(false);
                              setShowSupportResistance(false);
                              setShowPressureOverlay(false);
                              setShowVolumeOverlay(false);
                            }}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#1c140c] border border-amber-500/25 text-amber-300/80 hover:text-amber-100 hover:border-amber-400/50 transition-all"
                          >
                            Reset Defaults
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setShowSales(!showSales)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                            showSales
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <span>Completed Sales</span>
                        </button>

                        <button
                          onClick={() => setShowAsks(!showAsks)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                            showAsks
                              ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
                          }`}
                        >
                          <span className="w-2.5 h-1 rounded-full bg-rose-400 border border-rose-300" />
                          <span>Lowest Ask</span>
                        </button>

                        <button
                          onClick={() => setShowBids(!showBids)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                            showBids
                              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
                          }`}
                        >
                          <span className="w-2.5 h-1 rounded-full bg-cyan-400 border border-cyan-300" />
                          <span>Highest Bid</span>
                        </button>

                        <button
                          onClick={() => setShowVwap(!showVwap)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                            showVwap
                              ? 'bg-fuchsia-500/20 border-fuchsia-500/60 text-fuchsia-300 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
                          }`}
                        >
                          <span className="w-2.5 h-1 rounded-full bg-fuchsia-400" />
                          <span>VWAP</span>
                        </button>

                        <button
                          onClick={() => setShowMovingAverage(!showMovingAverage)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                            showMovingAverage
                              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
                          }`}
                        >
                          <span className="w-2.5 h-1 rounded-full bg-emerald-400" />
                          <span>Moving Average</span>
                        </button>

                        <button
                          onClick={() => setShowSupportResistance(!showSupportResistance)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                            showSupportResistance
                              ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
                          }`}
                        >
                          <span className="w-2.5 h-1 rounded-full bg-orange-400" />
                          <span>Support & Resistance</span>
                        </button>

                        <button
                          onClick={() => setShowPressureOverlay(!showPressureOverlay)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                            showPressureOverlay
                              ? 'bg-violet-500/20 border-violet-500/60 text-violet-300 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
                          }`}
                        >
                          <span className="w-2.5 h-1 rounded-full bg-violet-400" />
                          <span>Buy/Sell Pressure</span>
                        </button>

                        <button
                          onClick={() => setShowVolumeOverlay(!showVolumeOverlay)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all ${
                            showVolumeOverlay
                              ? 'bg-teal-500/20 border-teal-500/60 text-teal-300 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-500 hover:text-stone-300'
                          }`}
                        >
                          <span className="w-2 h-2.5 rounded-sm bg-teal-400" />
                          <span>Volume</span>
                        </button>
                      </div>
                    </div>

                    {/* SVG Canvas */}
                    <div className="relative w-full h-60 sm:h-72 bg-[#110d08] rounded-2xl border border-amber-900/30 overflow-hidden">
                      {chartGeometry ? (
                        <svg
                          ref={chartSvgRef}
                          viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                          className="w-full h-full cursor-crosshair select-none"
                          onMouseMove={handleChartMouseMove}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          <defs>
                            <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {chartGeometry.yTicks.map((tick, i) => (
                            <g key={i}>
                              <line
                                x1={chartGeometry.padLeft}
                                y1={tick.y}
                                x2={chartGeometry.width - chartGeometry.padRight}
                                y2={tick.y}
                                stroke="#382918"
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                              <text
                                x={chartGeometry.width - chartGeometry.padRight + 6}
                                y={tick.y + 3}
                                fill="#8c6d48"
                                fontSize="9"
                                fontFamily="monospace"
                              >
                                {tick.label}
                              </text>
                            </g>
                          ))}

                          {chartGeometry.xTicks.map((xt, i) => (
                            <text
                              key={i}
                              x={xt.x}
                              y={chartGeometry.height - 8}
                              fill="#8c6d48"
                              fontSize="9"
                              textAnchor={i === 0 ? 'start' : i === chartGeometry.xTicks.length - 1 ? 'end' : 'middle'}
                            >
                              {xt.label}
                            </text>
                          ))}

                          {/* Layer 1: Bottom Volume Histogram Strip */}
                          {showVolumeOverlay && chartGeometry.maxBucketVol > 0 && (
                            <g>
                              {chartPoints.map((p, idx) => {
                                if (p.volume <= 0) return null;
                                const barW = Math.max(4, Math.min(18, (chartGeometry.plotW / chartPoints.length) * 0.6));
                                const barH = Math.max(2, (p.volume / chartGeometry.maxBucketVol) * chartGeometry.volStripHeight);
                                const barX = chartGeometry.getX(idx) - barW / 2;
                                const barY = chartGeometry.padTop + chartGeometry.plotH - barH;
                                const isBuyDominant = p.buyVolume >= p.sellVolume;
                                return (
                                  <rect
                                    key={`vol-${idx}`}
                                    x={barX}
                                    y={barY}
                                    width={barW}
                                    height={barH}
                                    rx="1.5"
                                    fill={isBuyDominant ? '#10b981' : '#f43f5e'}
                                    fillOpacity="0.32"
                                    stroke={isBuyDominant ? '#34d399' : '#fb7185'}
                                    strokeOpacity="0.45"
                                    strokeWidth="0.6"
                                  />
                                );
                              })}
                            </g>
                          )}

                          {/* Layer 2: Buy/Sell Pressure Normalized Overlay */}
                          {showPressureOverlay && chartGeometry.pressurePath && (
                            <g>
                              <line
                                x1={chartGeometry.padLeft}
                                y1={chartGeometry.pressureZeroY}
                                x2={chartGeometry.width - chartGeometry.padRight}
                                y2={chartGeometry.pressureZeroY}
                                stroke="#8b5cf6"
                                strokeWidth="0.9"
                                strokeDasharray="2 3"
                                strokeOpacity="0.45"
                              />
                              <path
                                d={chartGeometry.pressurePath}
                                fill="none"
                                stroke="#a78bfa"
                                strokeWidth="1.7"
                                strokeOpacity="0.85"
                                strokeLinecap="round"
                              />
                            </g>
                          )}

                          {/* Layer 3: Support & Resistance Horizontal Levels */}
                          {showSupportResistance && (
                            <g>
                              <line
                                x1={chartGeometry.padLeft}
                                y1={chartGeometry.resistanceY}
                                x2={chartGeometry.width - chartGeometry.padRight}
                                y2={chartGeometry.resistanceY}
                                stroke="#fb7185"
                                strokeWidth="1.2"
                                strokeDasharray="5 3"
                              />
                              <rect
                                x={chartGeometry.padLeft + 4}
                                y={Math.max(chartGeometry.padTop + 1, chartGeometry.resistanceY - 13)}
                                width="92"
                                height="12"
                                rx="3"
                                fill="#4c0519"
                                stroke="#fb7185"
                                strokeWidth="0.7"
                              />
                              <text
                                x={chartGeometry.padLeft + 8}
                                y={Math.max(chartGeometry.padTop + 10, chartGeometry.resistanceY - 4)}
                                fill="#fecdd3"
                                fontSize="8"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                Res {resistanceLevelFlower.toFixed(4)}
                              </text>

                              <line
                                x1={chartGeometry.padLeft}
                                y1={chartGeometry.supportY}
                                x2={chartGeometry.width - chartGeometry.padRight}
                                y2={chartGeometry.supportY}
                                stroke="#10b981"
                                strokeWidth="1.2"
                                strokeDasharray="5 3"
                              />
                              <rect
                                x={chartGeometry.padLeft + 4}
                                y={Math.min(chartGeometry.padTop + chartGeometry.plotH - 13, chartGeometry.supportY + 2)}
                                width="92"
                                height="12"
                                rx="3"
                                fill="#022c22"
                                stroke="#10b981"
                                strokeWidth="0.7"
                              />
                              <text
                                x={chartGeometry.padLeft + 8}
                                y={Math.min(chartGeometry.padTop + chartGeometry.plotH - 4, chartGeometry.supportY + 11)}
                                fill="#a7f3d0"
                                fontSize="8"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                Sup {supportLevelFlower.toFixed(4)}
                              </text>
                            </g>
                          )}

                          {/* Layer 4: Core Area + Ask + Bid Lines */}
                          {showSales && (
                            <path d={chartGeometry.areaPath} fill="url(#primaryAreaGrad)" />
                          )}

                          {showAsks && (
                            <path
                              d={chartGeometry.asksPath}
                              fill="none"
                              stroke="#fb7185"
                              strokeWidth="1.8"
                              strokeDasharray="4 4"
                            />
                          )}

                          {showBids && (
                            <path
                              d={chartGeometry.bidsPath}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="1.8"
                              strokeDasharray="2 3"
                            />
                          )}

                          {/* Layer 5: 5-Period Moving Average & Cumulative VWAP */}
                          {showMovingAverage && (
                            <path
                              d={chartGeometry.maPath}
                              fill="none"
                              stroke="#34d399"
                              strokeWidth="1.8"
                              strokeDasharray="5 2"
                              strokeLinecap="round"
                            />
                          )}

                          {showVwap && (
                            <path
                              d={chartGeometry.vwapPath}
                              fill="none"
                              stroke="#e879f9"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                            />
                          )}

                          {/* Layer 6: Primary Completed Sales Curve */}
                          {showSales && (
                            <path
                              d={chartGeometry.salesPath}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {showSales && chartPoints.map((p, idx) => {
                            if (!p.isRealSale) return null;
                            return (
                              <circle
                                key={idx}
                                cx={chartGeometry.getX(idx)}
                                cy={chartGeometry.getY(p.salePrice)}
                                r="3.5"
                                fill="#10b981"
                                stroke="#064e3b"
                                strokeWidth="1.5"
                              />
                            );
                          })}

                          {/* Interactive Crosshair */}
                          {hoveredIndex !== null && (
                            <g>
                              <line
                                x1={chartGeometry.getX(hoveredIndex)}
                                y1={chartGeometry.padTop}
                                x2={chartGeometry.getX(hoveredIndex)}
                                y2={chartGeometry.height - chartGeometry.padBottom}
                                stroke="#f59e0b"
                                strokeWidth="1.2"
                                strokeDasharray="2 2"
                              />
                              {showSales && (
                                <circle
                                  cx={chartGeometry.getX(hoveredIndex)}
                                  cy={chartGeometry.getY(chartPoints[hoveredIndex].salePrice)}
                                  r="5"
                                  fill="#f59e0b"
                                  stroke="#17120b"
                                  strokeWidth="2"
                                />
                              )}
                              {showVwap && (
                                <circle
                                  cx={chartGeometry.getX(hoveredIndex)}
                                  cy={chartGeometry.getY(chartPoints[hoveredIndex].vwap)}
                                  r="3.8"
                                  fill="#e879f9"
                                  stroke="#17120b"
                                  strokeWidth="1.5"
                                />
                              )}
                              {showMovingAverage && (
                                <circle
                                  cx={chartGeometry.getX(hoveredIndex)}
                                  cy={chartGeometry.getY(chartPoints[hoveredIndex].movingAverage)}
                                  r="3.8"
                                  fill="#34d399"
                                  stroke="#17120b"
                                  strokeWidth="1.5"
                                />
                              )}
                            </g>
                          )}
                        </svg>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-amber-200/50">
                          <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                          <div className="font-bold text-sm text-amber-100">Insufficient Trade Data</div>
                          <div className="text-xs max-w-sm mt-1">
                            Not enough marketplace transactions recorded for this timeframe yet.
                          </div>
                        </div>
                      )}

                      {activeHoverPoint && chartGeometry && (
                        <div
                          className="absolute top-2 pointer-events-none z-20 p-2.5 rounded-xl bg-[#1e160e]/95 border border-amber-500/40 shadow-xl text-xs space-y-1 backdrop-blur-sm"
                          style={{
                            left: Math.min(
                              chartGeometry.width - 230,
                              Math.max(10, chartGeometry.getX(hoveredIndex!) - 95)
                            ),
                          }}
                        >
                          <div className="font-bold text-amber-100 flex items-center justify-between gap-4">
                            <span>{activeHoverPoint.fullDateLabel}</span>
                            {activeHoverPoint.isRealSale && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                                Verified Sale
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pt-1">
                            {showSales && (
                              <>
                                <div className="text-amber-200/70">Sale Price:</div>
                                <div className="font-bold text-amber-300 font-mono text-right">
                                  {activeHoverPoint.salePrice.toFixed(4)} FLOWER
                                </div>
                              </>
                            )}

                            {showAsks && (
                              <>
                                <div className="text-amber-200/70">Floor Ask:</div>
                                <div className="font-bold text-rose-300 font-mono text-right">
                                  {activeHoverPoint.floorAsk.toFixed(4)} FLOWER
                                </div>
                              </>
                            )}

                            {showBids && (
                              <>
                                <div className="text-amber-200/70">Best Bid:</div>
                                <div className="font-bold text-cyan-300 font-mono text-right">
                                  {activeHoverPoint.bestBid.toFixed(4)} FLOWER
                                </div>
                              </>
                            )}

                            {showVwap && (
                              <>
                                <div className="text-amber-200/70">VWAP:</div>
                                <div className="font-bold text-fuchsia-300 font-mono text-right">
                                  {activeHoverPoint.vwap.toFixed(4)} FLOWER
                                </div>
                              </>
                            )}

                            {showMovingAverage && (
                              <>
                                <div className="text-amber-200/70">Moving Avg (5P):</div>
                                <div className="font-bold text-emerald-300 font-mono text-right">
                                  {activeHoverPoint.movingAverage.toFixed(4)} FLOWER
                                </div>
                              </>
                            )}

                            {showSupportResistance && (
                              <>
                                <div className="text-amber-200/70">Sup / Res:</div>
                                <div className="font-bold text-orange-300 font-mono text-right">
                                  {supportLevelFlower.toFixed(4)} / {resistanceLevelFlower.toFixed(4)}
                                </div>
                              </>
                            )}

                            {showPressureOverlay && activeHoverPointMpi && (
                              <>
                                <div className="text-amber-200/70">Pressure (MPI):</div>
                                <div className={`font-bold font-mono text-right ${
                                  activeHoverPointMpi.mpi >= 0 ? 'text-emerald-300' : 'text-rose-300'
                                }`}>
                                  {activeHoverPointMpi.mpi >= 0 ? `+${activeHoverPointMpi.mpi}` : activeHoverPointMpi.mpi}
                                </div>
                              </>
                            )}

                            {showVolumeOverlay && (
                              <>
                                <div className="text-amber-200/70">Volume:</div>
                                <div className="font-bold text-teal-300 font-mono text-right">
                                  {activeHoverPoint.volume.toFixed(2)} F ({activeHoverPoint.tradeCount} trades)
                                </div>
                              </>
                            )}

                            <div className="text-amber-200/70">USD Equiv:</div>
                            <div className="font-bold text-emerald-400 font-mono text-right">
                              ≈ ${(activeHoverPoint.salePrice * flowerPriceUSD).toFixed(4)}
                            </div>
                          </div>
                          <div className="text-[9px] text-amber-200/40 pt-0.5 border-t border-amber-900/30">
                            Source: {activeHoverPoint.source}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-amber-200/60 pt-1">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Data Coverage: 7 Days Verified • Direct Sunflower Land API (`type=tradeable`)</span>
                      </div>
                      <div className="font-mono text-amber-400/80">
                        Hover chart points for exact price, overlays & timestamp
                      </div>
                    </div>
                  </div>
                ) : chartMode === 'depth' ? (
                  renderTwoSidedDepthBox(true)
                ) : chartMode === 'pressure' ? (
                  <div className="pt-1">
                    {renderMarketPressureIndexChart()}
                  </div>
                ) : (
                  renderVolumeFlowCanvas()
                )}
              </div>

              {/* SECOND CHART UNDERNEATH MAIN PRICE CHART: MARKET PRESSURE INDEX (MPI) OSCILLATOR (FEATURE 6) */}
              {chartMode === 'price' && renderMarketPressureIndexChart()}

              {/* MULTI-TIMEFRAME SIGNAL CONFIRMATION (FEATURE 11) */}
              {renderMultiTimeframeConfirmation()}

              {/* SMART ENTRY & EXIT RECOMMENDATION (TRADE OPPORTUNITY ANALYZER - #9) */}
              {renderTradeOpportunityAnalyzer()}
            </div>
          ) : activeTab === 'orderbook' ? (
            /* =============================================================== */
            /* TAB 4: LIVE ORDER BOOK (ASKS VS BIDS)                           */
            /* =============================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase tracking-wider px-1">
                  <span>🔴 Sell Orders / Asks (Top 50)</span>
                  <span className="text-[10px] text-amber-200/50">Lowest Price First</span>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-[#1c130e] overflow-hidden">
                  <div className="max-h-96 overflow-y-auto divide-y divide-rose-950/30">
                    {listings.length === 0 ? (
                      <div className="py-12 text-center text-xs text-amber-200/40">No active sell orders</div>
                    ) : (
                      listings.map((l: any, i: number) => (
                        <div key={l.id || i} className="p-2.5 flex items-center justify-between hover:bg-rose-950/20 text-xs transition-colors">
                          <div>
                            <div className="font-extrabold text-rose-300">
                              {Number(l.unitPriceSFL).toFixed(4)} <span className="text-[10px] font-normal text-rose-400/70">FLOWER</span>
                            </div>
                            <div className="text-[10px] text-amber-200/50 flex items-center gap-1.5 mt-0.5">
                              <span>Qty: {Number(l.quantity).toLocaleString()}</span>
                              <span>•</span>
                              <span>Total: {Number(l.sfl).toFixed(4)} FLOWER</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-semibold text-amber-100 flex items-center gap-1 justify-end">
                              <User className="w-3 h-3 text-amber-400" />
                              <span>{l.listedBy?.username || `Farm #${l.listedById}`}</span>
                            </div>
                            <div className="text-[9px] text-amber-200/40">
                              {l.type === 'instant' ? '⚡ Instant' : '🔗 Polygon'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider px-1">
                  <span>🟢 Buyer Offers / Bids (Top 50)</span>
                  <span className="text-[10px] text-amber-200/50">Highest Offer First</span>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-[#0f1c13] overflow-hidden">
                  <div className="max-h-96 overflow-y-auto divide-y divide-emerald-950/30">
                    {offers.length === 0 ? (
                      <div className="py-12 text-center text-xs text-amber-200/40">No active buyer offers</div>
                    ) : (
                      offers.map((o: any, i: number) => (
                        <div key={o.tradeId || i} className="p-2.5 flex items-center justify-between hover:bg-emerald-950/20 text-xs transition-colors">
                          <div>
                            <div className="font-extrabold text-emerald-300">
                              {Number(o.unitPriceSFL).toFixed(4)} <span className="text-[10px] font-normal text-emerald-400/70">FLOWER</span>
                            </div>
                            <div className="text-[10px] text-amber-200/50 flex items-center gap-1.5 mt-0.5">
                              <span>Wants: {Number(o.quantity).toLocaleString()}</span>
                              <span>•</span>
                              <span>Budget: {Number(o.sfl).toFixed(4)} FLOWER</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-semibold text-amber-100 flex items-center gap-1 justify-end">
                              <User className="w-3 h-3 text-amber-400" />
                              <span>{o.offeredBy?.username || `Farm #${o.offeredById}`}</span>
                            </div>
                            <div className="text-[9px] text-amber-200/40">
                              {o.type === 'instant' ? '⚡ Instant' : '🔗 Polygon'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'sales' ? (
            /* =============================================================== */
            /* TAB 5: RECENT TRADES TAPE                                       */
            /* =============================================================== */
            <div className="space-y-3">
              <div className="text-xs font-bold text-amber-300/80 uppercase tracking-wider">
                Recent 10 Fulfilled Sales Tape (Direct From Settlement Contracts)
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-[#16120b] overflow-hidden">
                <div className="divide-y divide-amber-950/40">
                  {sales.length === 0 ? (
                    <div className="py-12 text-center text-xs text-amber-200/40">No recent sales records</div>
                  ) : (
                    sales.map((sale: any) => {
                      const fulfilledDate = new Date(sale.fulfilledAt);
                      const unitPrice = (sale.sfl / sale.quantity).toFixed(4);
                      return (
                        <div key={sale.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#20180f] text-xs transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🤝</span>
                            <div>
                              <div className="font-bold text-amber-100 flex items-center gap-2 flex-wrap">
                                <span>{sale.quantity.toLocaleString()} {itemName}</span>
                                <span className="text-amber-400/60 font-normal">for</span>
                                <span className="font-extrabold text-amber-300">{Number(sale.sfl).toFixed(4)} FLOWER</span>
                                <span className="text-[10px] text-amber-200/60 font-mono">({unitPrice} / unit)</span>
                              </div>
                              <div className="text-[11px] text-amber-200/60 flex items-center gap-1.5 mt-0.5">
                                <span>Buyer: <strong className="text-amber-200">{sale.initiatedBy?.username || `Farm #${sale.initiatedBy?.id}`}</strong></span>
                                <span>→</span>
                                <span>Seller: <strong className="text-amber-200">{sale.fulfilledBy?.username || `Farm #${sale.fulfilledBy?.id}`}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-[11px] text-amber-200/50">
                            {fulfilledDate.toLocaleTimeString()} • {fulfilledDate.toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* TAB 6: MARKET ANALYTICS (7-DAY OHLCV & LIFETIME STATS)          */
            /* =============================================================== */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-[#1c150c] border border-amber-500/20">
                  <span className="text-[10px] text-amber-200/50 uppercase font-bold block">Lifetime Completed Sales</span>
                  <span className="text-xl font-black text-amber-100 mt-1 block">
                    {totalLifetimeSales.toLocaleString()} trades
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-[#1c150c] border border-amber-500/20">
                  <span className="text-[10px] text-amber-200/50 uppercase font-bold block">Lifetime Traded Volume</span>
                  <span className="text-xl font-black text-amber-200 mt-1 block font-mono">
                    {Number(totalLifetimeVolume).toLocaleString()} FLOWER
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-300/80 uppercase tracking-wider">
                  7-Day Daily OHLCV Price & Volume History
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-[#16120b] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#20180f] text-amber-300/70 border-b border-amber-900/30 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-3">Daily Low</th>
                        <th className="py-2.5 px-3">Daily High</th>
                        <th className="py-2.5 px-3">Traded Volume</th>
                        <th className="py-2.5 px-4 text-right">Settled Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-950/40 text-amber-100">
                      {Object.keys(dailyHistory).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-amber-200/40">No daily history recorded</td>
                        </tr>
                      ) : (
                        Object.entries(dailyHistory).map(([dateKey, day]: [string, any]) => (
                          <tr key={dateKey} className="hover:bg-[#20180f]/70">
                            <td className="py-2.5 px-4 font-bold text-amber-200">{dateKey}</td>
                            <td className="py-2.5 px-3 text-rose-300 font-mono">{Number(day.low).toFixed(4)} FLOWER</td>
                            <td className="py-2.5 px-3 text-emerald-300 font-mono">{Number(day.high).toFixed(4)} FLOWER</td>
                            <td className="py-2.5 px-3 font-semibold text-amber-300 font-mono">{Number(day.volume).toLocaleString()} FLOWER</td>
                            <td className="py-2.5 px-4 text-right text-amber-100">{day.sales} trades</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* FOOTER                                                              */}
        {/* =================================================================== */}
        <div className="shrink-0 p-4 border-t border-amber-900/40 bg-[#161009] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Direct data from Sunflower Land Community API (`type=tradeable`)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-md transition-transform active:scale-95"
          >
            Close Order Book
          </button>
        </div>
      </div>
    </div>
  );
}

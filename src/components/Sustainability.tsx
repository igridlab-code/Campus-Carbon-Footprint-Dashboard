import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Leaf, 
  Footprints, 
  TrendingUp, 
  Zap, 
  Droplet, 
  Trash2, 
  Compass, 
  HelpCircle,
  Flame,
  FileText,
  Printer,
  Calendar,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle,
  Download,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { CampusAsset, InstitutionName } from '../types';
import { motion } from 'motion/react';
import Tilt from 'react-parallax-tilt';

interface SustainabilityProps {
  assets: CampusAsset[];
}

interface AnalyticsData {
  today: {
    energy: number;
    water: number;
    waste: number;
    transport: number;
    greenScore: number;
  };
  trends: {
    energy: TrendMetric;
    water: TrendMetric;
    waste: TrendMetric;
    transport: TrendMetric;
  };
  charts: {
    daily: ChartPoint[];
    weekly: ChartPoint[];
    monthly: ChartPoint[];
  };
}

interface TrendMetric {
  curr: number;
  prev: number;
  diff: number;
  pct: number;
  trend: 'up' | 'down' | 'same';
}

interface ChartPoint {
  name: string;
  date?: string;
  energy: number;
  water: number;
  waste: number;
  transport: number;
}

export default function Sustainability({ assets }: SustainabilityProps) {
  const token = localStorage.getItem('indraverse_token');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subTab, setSubTab] = useState<'footprint' | 'carbon' | 'green' | 'energy'>('footprint');

  const [carbonFactors, setCarbonFactors] = useState({
    electricity: 0.82,
    diesel: 2.68,
    petrol: 2.31,
    lpg: 2.984,
    waste: 1.9,
    treeAbsorption: 21
  });

  // Computed rankings based on campus assets data
  const topEnergyConsumers = useMemo(() => {
    return assets.filter(a => (a.status || 'Active') === 'Active').sort((a, b) => b.energyUsage - a.energyUsage).slice(0, 5);
  }, [assets]);

  const mostSustainable = useMemo(() => {
    return assets.filter(a => (a.status || 'Active') === 'Active').sort((a, b) => b.greenScore - a.greenScore).slice(0, 5);
  }, [assets]);

  const leastSustainable = useMemo(() => {
    return assets.filter(a => (a.status || 'Active') === 'Active').sort((a, b) => a.greenScore - b.greenScore).slice(0, 5);
  }, [assets]);

  const topWaterConsumers = useMemo(() => {
    return assets.filter(a => (a.status || 'Active') === 'Active').sort((a, b) => b.waterUsage - a.waterUsage).slice(0, 5);
  }, [assets]);

  const topCarbonAbsorbers = useMemo(() => {
    return assets
      .filter(a => (a.status || 'Active') === 'Active' && (a.annualCarbonAbsorption || 0) > 0)
      .sort((a, b) => (b.annualCarbonAbsorption || 0) - (a.annualCarbonAbsorption || 0))
      .slice(0, 5);
  }, [assets]);

  const topCarbonEmitters = useMemo(() => {
    return assets
      .filter(a => (a.status || 'Active') === 'Active' && (a.carbonFootprint || 0) > 0)
      .sort((a, b) => b.carbonFootprint - a.carbonFootprint)
      .slice(0, 5);
  }, [assets]);

  const lowestCarbonEmitters = useMemo(() => {
    return assets
      .filter(a => (a.status || 'Active') === 'Active')
      .sort((a, b) => a.carbonFootprint - b.carbonFootprint)
      .slice(0, 5);
  }, [assets]);

  // Green Cover Asset inventory list
  const greenCoverAssets = useMemo(() => {
    return assets.filter(a => 
      ((a.category === 'Trees' || a.category === 'Plants' || a.category === 'Garden Area' || a.category === 'Lawn') && (a.status || 'Active') !== 'Inactive')
    );
  }, [assets]);

  // Electrical Twin Asset inventory list
  const electricalAssets = useMemo(() => {
    return assets.filter(a => 
      (a.powerRating !== undefined && a.powerRating !== null && Number(a.powerRating) > 0 && (a.status || 'Active') !== 'Inactive')
    );
  }, [assets]);

  // Computed totals for Energy dashboard
  const energyDashboardTotals = useMemo(() => {
    let dailyPowerDraw = 0;
    let totalGenerators = 0;
    let totalSolarPanels = 0;

    electricalAssets.forEach(a => {
      const qty = a.quantity !== undefined && a.quantity !== null ? Number(a.quantity) : 1;
      const power = a.powerRating !== undefined && a.powerRating !== null ? Number(a.powerRating) : 0;
      const hours = a.usageHours !== undefined && a.usageHours !== null ? Number(a.usageHours) : 0;
      
      // Calculate daily power draw in kWh/day
      dailyPowerDraw += (power * qty * hours) / 1000;

      if (a.category === 'Solar Panels' || a.category === 'Solar Panel' || a.name.toLowerCase().includes('solar')) {
        totalSolarPanels += qty;
      }
      if (a.name.toLowerCase().includes('generator') || a.category.toLowerCase().includes('utility')) {
        totalGenerators += qty;
      }
    });

    return {
      dailyPowerDraw: parseFloat(dailyPowerDraw.toFixed(2)),
      totalGenerators,
      totalSolarPanels
    };
  }, [electricalAssets]);

  // Carbon Sinks and Emissions detailed stats
  const carbonStats = useMemo(() => {
    const active = assets.filter(a => (a.status || 'Active') === 'Active');
    
    let totalTrees = 0;
    let totalGreenArea = 0;
    let totalAnnualSink = 0; // kg CO2/year
    let totalDailyEmissions = 0; // kg CO2/day
    
    let totalElectricity = 0;
    let totalLpg = 0;
    let totalDiesel = 0;
    let totalPetrol = 0;
    let totalWaste = 0;

    let carbonSinkAssetsCount = 0;

    active.forEach(a => {
      totalTrees += a.treeCount || 0;
      totalGreenArea += a.greenCoverArea || 0;
      totalAnnualSink += a.annualCarbonAbsorption || 0;
      totalDailyEmissions += a.carbonFootprint || 0;
      
      totalElectricity += a.energyUsage || 0; // kWh/day
      totalWaste += a.wasteGenerated || 0; // kg/day
      
      // Calibrate estimated/factual fuel usage
      if (a.category === 'Utility') {
        totalLpg += 12; // kg/day default
        totalDiesel += 15; // L/day default generator backup
      } else if (a.institution === 'Transport') {
        totalDiesel += 80; // Bus fleet L/day
        totalPetrol += 20; // Pool vehicles L/day
      }

      if ((a.treeCount || 0) > 0 || (a.greenCoverArea || 0) > 0) {
        carbonSinkAssetsCount++;
      }
    });

    const annualEmissions = totalDailyEmissions * 365;
    const netBalance = annualEmissions - totalAnnualSink;
    const neutralityPct = annualEmissions > 0 
      ? Math.min(100, Math.round((totalAnnualSink / annualEmissions) * 100)) 
      : 100;

    const campusTotalArea = 250000; // sqm institutional campus size
    const greenCoverPct = parseFloat(((totalGreenArea / campusTotalArea) * 100).toFixed(1));

    const f = {
      electricity: carbonFactors.electricity,
      lpg: carbonFactors.lpg,
      diesel: carbonFactors.diesel,
      petrol: carbonFactors.petrol,
      waste: carbonFactors.waste,
    };

    const energyEmissions = (totalElectricity * f.electricity) + (totalLpg * f.lpg);
    const transportEmissions = (totalDiesel * f.diesel) + (totalPetrol * f.petrol);
    const wasteEmissions = totalWaste * f.waste;

    return {
      totalTrees,
      totalGreenArea,
      totalAnnualSink,
      annualEmissions,
      netBalance,
      neutralityPct,
      greenCoverPct,
      carbonSinkAssetsCount,
      energyEmissions: parseFloat(energyEmissions.toFixed(1)),
      transportEmissions: parseFloat(transportEmissions.toFixed(1)),
      wasteEmissions: parseFloat(wasteEmissions.toFixed(1)),
      totalEmissionsCalculated: parseFloat((energyEmissions + transportEmissions + wasteEmissions).toFixed(1))
    };
  }, [assets, carbonFactors]);

  // Chart configuration states
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartMetric, setChartMetric] = useState<'energy' | 'water' | 'waste' | 'transport'>('energy');

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchCarbonFactors();
  }, [assets]);

  const fetchCarbonFactors = async () => {
    try {
      const res = await fetch('/api/carbon-factors');
      if (res.ok) {
        setCarbonFactors(await res.json());
      }
    } catch (err) {
      console.error('Failed to load carbon factors:', err);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sustainability/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setAnalytics(await res.json());
      } else {
        setError('Could not download latest sustainability analytics stream.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please sign in to verify administrative parameters.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render trend indicators cleanly
  const renderTrendIndicator = (metricName: string, trendData: TrendMetric) => {
    const isIncrease = trendData.diff > 0;
    const isDecrease = trendData.diff < 0;

    // For resource usage, reduction is green (good) and increment is red (bad)
    let isPositiveOutcome = isDecrease; 
    
    let colorClass = 'text-[#94A3B8] bg-white/[0.03] border-white/10';
    let icon = <Minus size={12} />;

    if (isIncrease) {
      colorClass = 'text-[#FF6B6B] bg-[#FF6B6B]/[0.06] border-[#FF6B6B]/20';
      icon = <ArrowUpRight size={12} />;
    } else if (isDecrease) {
      colorClass = 'text-[#00E676] bg-[#00E676]/[0.06] border-[#00E676]/20';
      icon = <ArrowDownRight size={12} />;
    }

    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
        {icon}
        <span>{Math.abs(trendData.pct)}%</span>
        <span className="text-[9px] font-normal text-slate-400">
          {isIncrease ? 'increased' : isDecrease ? 'reduced' : 'no change'}
        </span>
      </div>
    );
  };

  const activeChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.charts[chartTimeframe] || [];
  }, [analytics, chartTimeframe]);

  const activeMetricLabel = useMemo(() => {
    switch (chartMetric) {
      case 'energy': return 'Energy Usage (kWh)';
      case 'water': return 'Water Flow (Litres)';
      case 'waste': return 'Waste Generated (kg)';
      case 'transport': return 'Transport Emissions (kg CO₂)';
    }
  }, [chartMetric]);

  const activeMetricColor = useMemo(() => {
    switch (chartMetric) {
      case 'energy': return '#0EA5E9';   // Energy Sky Blue
      case 'water': return '#0284C7';    // Water Blue
      case 'waste': return '#8B5E3C';    // Waste Earth Brown
      case 'transport': return '#DC2626';// Transport Danger Red
    }
  }, [chartMetric]);

  const handlePrintReport = () => {
    const printContent = document.getElementById('report-printable-area');
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>IndraVerse - Campus Monthly Sustainability Report</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; }
              .header { border-b: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
              .title { font-size: 26px; font-weight: bold; color: #0f172a; margin: 0; }
              .subtitle { font-size: 12px; text-transform: uppercase; color: #059669; font-weight: bold; margin-top: 5px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; }
              .card-title { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #475569; }
              .metric-row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px; }
              .metric-val { font-size: 24px; font-weight: bold; font-family: monospace; }
              .diff-row { display: flex; justify-content: space-between; margin-top: 15px; border-t: 1px solid #e2e8f0; padding-top: 10px; font-size: 12px; font-weight: 500; }
              .trend-up { color: #dc2626; }
              .trend-down { color: #059669; }
              .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .table th { background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; }
              .table td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; font-size: 13px; }
              .footer { text-align: center; font-size: 10px; color: #94a3b8; border-t: 1px solid #e2e8f0; padding-top: 20px; margin-top: 50px; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6" 
      id="sustainability-monitor-root"
    >
      
      {/* Title block with PDF action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5" id="sustainability-header">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-slate-950 tracking-tight">
            Sustainability Monitor
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Tracking resource footprints, dynamic trend analyses, and active carbon offset telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {analytics && (
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-all border border-blue-200 cursor-pointer"
              id="btn-trigger-pdf-report"
            >
              <FileText size={15} />
              Generate PDF Report
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Selection */}
      <div className="flex flex-wrap border-b border-white/[0.06]">
        <button
          onClick={() => setSubTab('footprint')}
          className={`px-5 py-3 border-b-2 font-display text-sm font-semibold transition-all cursor-pointer border-none bg-transparent ${
            subTab === 'footprint'
              ? 'border-[#00E676] text-[#00E676] font-bold'
              : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
          }`}
        >
          Footprint Diagnostics
        </button>
        <button
          onClick={() => setSubTab('carbon')}
          className={`px-5 py-3 border-b-2 font-display text-sm font-semibold transition-all cursor-pointer border-none bg-transparent ${
            subTab === 'carbon'
              ? 'border-[#00E676] text-[#00E676] font-bold'
              : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
          }`}
        >
          Carbon Sinks & Accounting
        </button>
        <button
          onClick={() => setSubTab('green')}
          className={`px-5 py-3 border-b-2 font-display text-sm font-semibold transition-all cursor-pointer border-none bg-transparent ${
            subTab === 'green'
              ? 'border-[#00E676] text-[#00E676] font-bold'
              : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
          }`}
        >
          Green Asset Dashboard
        </button>
        <button
          onClick={() => setSubTab('energy')}
          className={`px-5 py-3 border-b-2 font-display text-sm font-semibold transition-all cursor-pointer border-none bg-transparent ${
            subTab === 'energy'
              ? 'border-[#00E676] text-[#00E676] font-bold'
              : 'border-transparent text-[#94A3B8] hover:text-[#E2E8F0]'
          }`}
        >
          Energy Dashboard
        </button>
      </div>

      {loading ? (
        <div className="p-20 text-center text-[#94A3B8] text-xs font-mono flex flex-col items-center justify-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-[#00E676] border-t-transparent animate-spin shadow-[0_0_15px_rgba(0,230,118,0.3)]"></div>
          Analyzing live IoT resource telemetry feeds...
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-blue-50/50 border border-blue-150 rounded-2xl flex flex-col items-center justify-center gap-3">
          <AlertCircle size={32} className="text-blue-600 animate-pulse" />
          <h4 className="font-semibold text-slate-900 text-sm">Calibration Session Required</h4>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{error}</p>
        </div>
      ) : analytics ? (
        <>
          {subTab === 'footprint' && (
            <div className="space-y-6 animate-fade-in" id="footprint-diagnostics-tab">
          {/* Main 8 Stat Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="sustainability-8-cards">
            {/* Energy Today */}
            <div className="glass-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="label-text text-xs uppercase font-mono font-bold">Today's Energy</span>
                <div className="p-1.5 bg-[#0056D2]/10 text-[#0056D2] rounded-xl"><Zap size={16} /></div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="stat-value">{analytics.today.energy}</span>
                <span className="secondary-text text-xs font-bold">kWh</span>
              </div>
              <p className="secondary-text text-xs font-mono">Calibrated sum of all nodes</p>
            </div>

            {/* Energy This Month */}
            <div className="glass-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="label-text text-xs uppercase font-mono font-bold">This Month Energy</span>
                <div className="p-1.5 bg-[#0056D2]/10 text-[#0056D2] rounded-xl"><Zap size={16} /></div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="stat-value">{analytics.trends.energy.curr.toLocaleString()}</span>
                <span className="secondary-text text-xs font-bold">kWh</span>
              </div>
              {renderTrendIndicator('Energy', analytics.trends.energy)}
            </div>

            {/* Water Today */}
            <div className="glass-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="label-text text-xs uppercase font-mono font-bold">Today's Water</span>
                <div className="p-1.5 bg-cyan-500/10 text-cyan-600 rounded-xl"><Droplet size={16} /></div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="stat-value">{analytics.today.water.toLocaleString()}</span>
                <span className="secondary-text text-xs font-bold">Litres</span>
              </div>
              <p className="secondary-text text-xs font-mono">Active campus aquifer pull</p>
            </div>

            {/* Water This Month */}
            <div className="glass-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="label-text text-xs uppercase font-mono font-bold">This Month Water</span>
                <div className="p-1.5 bg-cyan-500/10 text-cyan-600 rounded-xl"><Droplet size={16} /></div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="stat-value">{analytics.trends.water.curr.toLocaleString()}</span>
                <span className="secondary-text text-xs font-bold">Litres</span>
              </div>
              {renderTrendIndicator('Water', analytics.trends.water)}
            </div>

            {/* Waste Today */}
            <div className="glass-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="label-text text-xs uppercase font-mono font-bold">Today's Waste</span>
                <div className="p-1.5 bg-amber-500/10 text-amber-700 rounded-xl"><Trash2 size={16} /></div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="stat-value">{analytics.today.waste}</span>
                <span className="secondary-text text-xs font-bold">kg</span>
              </div>
              <p className="secondary-text text-xs font-mono">Mass measured organic ref.</p>
            </div>

            {/* Waste This Month */}
            <div className="glass-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="label-text text-xs uppercase font-mono font-bold">This Month Waste</span>
                <div className="p-1.5 bg-amber-500/10 text-amber-700 rounded-xl"><Trash2 size={16} /></div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="stat-value">{analytics.trends.waste.curr.toLocaleString()}</span>
                <span className="secondary-text text-xs font-bold">kg</span>
              </div>
              {renderTrendIndicator('Waste', analytics.trends.waste)}
            </div>

            {/* Transport Emissions */}
            <div className="glass-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="label-text text-xs uppercase font-mono font-bold">Transport Emissions</span>
                <div className="p-1.5 bg-rose-500/10 text-rose-600 rounded-xl font-mono text-xs font-bold">CO₂</div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="stat-value">{analytics.trends.transport.curr.toLocaleString()}</span>
                <span className="secondary-text text-xs font-bold">kg CO₂</span>
              </div>
              {renderTrendIndicator('Transport', analytics.trends.transport)}
            </div>

            {/* Campus Green Score */}
            <div className="bg-gradient-to-tr from-emerald-50 to-green-50/40 border border-emerald-500/20 rounded-3xl p-5 space-y-2 shadow-sm relative overflow-hidden hover:shadow-md transition-all">
              <div className="flex items-center justify-between relative z-10">
                <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider">Campus Green Score</span>
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl"><Award size={14} /></div>
              </div>
              <div className="flex items-baseline gap-1.5 relative z-10 mt-1">
                <span className="text-3xl font-black font-display text-emerald-950">{analytics.today.greenScore}%</span>
              </div>
              <p className="text-[9px] text-emerald-700/80 font-mono tracking-wide relative z-10 font-bold uppercase">Average System Rank: HIGH ECO</p>
            </div>
          </div>

          {/* Interactive Charting Panel */}
          <div className="glass-card rounded-3xl p-6 shadow-sm space-y-6" id="sustainability-interactive-charts">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-150 pb-4">
              <div>
                <h3 className="font-semibold text-slate-950 text-base">Sustainability Load Diagnostics</h3>
                <p className="text-slate-500 text-xs mt-0.5">Toggle date groupings or resource categories to trace campus consumption loads.</p>
              </div>

              {/* Chart Switches */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Timeframe switch */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['daily', 'weekly', 'monthly'] as const).map(timeframe => (
                    <button
                      key={timeframe}
                      onClick={() => setChartTimeframe(timeframe)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-none ${
                        chartTimeframe === timeframe 
                          ? 'bg-white/[0.08] text-[#E2E8F0] shadow-sm font-bold' 
                          : 'text-[#94A3B8] hover:text-[#E2E8F0] bg-transparent'
                      }`}
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>

                {/* Metric Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['energy', 'water', 'waste', 'transport'] as const).map(metric => (
                    <button
                      key={metric}
                      onClick={() => setChartMetric(metric)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-none ${
                        chartMetric === metric 
                          ? 'bg-[#00BFFF] text-white shadow-sm font-bold' 
                          : 'text-[#94A3B8] hover:text-[#E2E8F0] bg-transparent'
                      }`}
                    >
                      {metric}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recharts Render stage */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeMetricColor} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={activeMetricColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} iconSize={10} />
                  <Area 
                    type="monotone" 
                    dataKey={chartMetric} 
                    name={activeMetricLabel} 
                    stroke={activeMetricColor} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#chartColor)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Campus Sustainability Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="rankings-section">
            {/* Most Sustainable Assets Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Award className="text-emerald-600" size={18} />
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">Most Sustainable Assets</h3>
                    <p className="text-[10px] text-slate-500">Highest digital twin Green Score (0-100)</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {mostSustainable.map((asset, index) => (
                    <div key={asset.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 rounded-xl transition-all">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-xs text-slate-800 block truncate max-w-[150px]">{asset.name}</span>
                          <span className="text-[9px] text-slate-400 block">{asset.institution}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-600 font-mono block">{asset.greenScore}</span>
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Green Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Least Sustainable Assets Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <AlertCircle className="text-amber-600" size={18} />
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">Least Sustainable Assets</h3>
                    <p className="text-[10px] text-slate-500">Assets needing immediate environmental audit</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {leastSustainable.map((asset, index) => (
                    <div key={asset.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 rounded-xl transition-all">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-xs text-slate-800 block truncate max-w-[150px]">{asset.name}</span>
                          <span className="text-[9px] text-slate-400 block">{asset.institution}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-rose-600 font-mono block">{asset.greenScore}</span>
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Green Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Resource Consumers Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Zap className="text-blue-600" size={18} />
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">Top Resource Consumers</h3>
                    <p className="text-[10px] text-slate-500">Buildings with the highest daily energy load</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {topEnergyConsumers.map((asset, index) => (
                    <div key={asset.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 rounded-xl transition-all">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-xs text-slate-800 block truncate max-w-[150px]">{asset.name}</span>
                          <span className="text-[9px] text-slate-400 block">{asset.institution}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-blue-600 font-mono block">{asset.energyUsage} <span className="text-[9px] text-slate-400 font-normal">kWh</span></span>
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Daily Usage</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
          )}

          {subTab === 'carbon' && (
            <div className="space-y-6 animate-fade-in" id="carbon-accounting-tab">
              {/* Carbon 7 KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                
                {/* Card 1: Annual Emissions */}
                <div className="glass-card rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Emissions</span>
                    <div className="p-1.5 bg-red-500/10 text-red-500 rounded-xl"><Flame size={14} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-black font-display text-slate-800">{carbonStats.annualEmissions.toLocaleString()}</h3>
                    <span className="text-[9px] text-slate-400 font-mono">kg CO₂ / yr</span>
                  </div>
                </div>

                {/* Card 2: Annual Absorbed */}
                <div className="glass-card rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Absorbed</span>
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl"><Leaf size={14} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-black font-display text-slate-800">{carbonStats.totalAnnualSink.toLocaleString()}</h3>
                    <span className="text-[9px] text-slate-400 font-mono">kg CO₂ / yr</span>
                  </div>
                </div>

                {/* Card 3: Net Carbon Balance */}
                <div className="glass-card rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Net Balance</span>
                    <div className="p-1 bg-emerald-500/10 text-emerald-600 rounded-lg font-mono text-[9px] font-bold">NET</div>
                  </div>
                  <div className="mt-2">
                    <h3 className={`text-lg font-black font-display ${carbonStats.netBalance <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {carbonStats.netBalance > 0 ? '+' : ''}{carbonStats.netBalance.toLocaleString()}
                    </h3>
                    <span className="text-[9px] text-slate-400 font-mono">kg CO₂ / yr</span>
                  </div>
                </div>

                {/* Card 4: Carbon Neutrality % */}
                <div className="bg-gradient-to-tr from-emerald-50 to-green-50/40 border border-emerald-500/20 rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider">Neutrality</span>
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl"><Award size={14} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-xl font-black font-display text-emerald-950">{carbonStats.neutralityPct}%</h3>
                    <span className="text-[9px] text-emerald-700/80 font-mono font-bold uppercase">Offset Level</span>
                  </div>
                </div>

                {/* Card 5: Campus Green Cover % */}
                <div className="glass-card rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-medium">Green Cover</span>
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl"><Droplet size={14} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-black font-display text-slate-800">{carbonStats.greenCoverPct}%</h3>
                    <span className="text-[9px] text-slate-400 font-mono">of Campus Area</span>
                  </div>
                </div>

                {/* Card 6: Total Trees */}
                <div className="glass-card rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-medium">Total Trees</span>
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl"><Leaf size={14} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-black font-display text-slate-800">{carbonStats.totalTrees.toLocaleString()}</h3>
                    <span className="text-[9px] text-slate-400 font-mono font-bold uppercase">Live Register</span>
                  </div>
                </div>

                {/* Card 7: Carbon Sinks Assets */}
                <div className="glass-card rounded-3xl p-4 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-medium">Sink Zones</span>
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl"><Compass size={14} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-black font-display text-slate-800">{carbonStats.carbonSinkAssetsCount}</h3>
                    <span className="text-[9px] text-slate-400 font-mono">Active Areas</span>
                  </div>
                </div>
              </div>

              {/* TWO COLUMN DETAIL PANEL */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEFT COLUMN: CARBON EMISSIONS */}
                <div className="glass-card rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Flame size={16} className="text-red-500" />
                      Campus Emissions Ledger
                    </h3>
                    <p className="text-[11px] text-slate-500">Calculated emission loads based on India standard factors & operations</p>
                  </div>

                  <div className="space-y-4">
                    {/* Source 1: Electricity */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">Electricity Grid Consumption</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {carbonStats.energyEmissions.toLocaleString()} kg CO₂/yr
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, (carbonStats.energyEmissions / Math.max(1, carbonStats.totalEmissionsCalculated)) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono">Factor: {carbonFactors.electricity} kg CO₂ per kWh</p>
                    </div>

                    {/* Source 2: Diesel Generators */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">Diesel Combustion & Backup Generators</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {(carbonStats.transportEmissions * 0.6).toFixed(1)} kg CO₂/yr
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, ((carbonStats.transportEmissions * 0.6) / Math.max(1, carbonStats.totalEmissionsCalculated)) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono">Factor: {carbonFactors.diesel} kg CO₂ per Litre</p>
                    </div>

                    {/* Source 3: Transport Operations */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">Institutional Fleet & Petrol operations</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {(carbonStats.transportEmissions * 0.4).toFixed(1)} kg CO₂/yr
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, ((carbonStats.transportEmissions * 0.4) / Math.max(1, carbonStats.totalEmissionsCalculated)) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono">Factor: {carbonFactors.petrol} kg CO₂ per Litre</p>
                    </div>

                    {/* Source 4: Waste Decomposition */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">Solid Waste Landfill Decomposition</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {carbonStats.wasteEmissions.toLocaleString()} kg CO₂/yr
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-yellow-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, (carbonStats.wasteEmissions / Math.max(1, carbonStats.totalEmissionsCalculated)) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-slate-400 font-mono">Factor: {carbonFactors.waste} kg CO₂ per kg solid waste</p>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: CARBON ABSORPTION & SINKS */}
                <div className="glass-card rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Leaf size={16} className="text-emerald-500 animate-pulse" />
                      Campus Carbon Sink Registers
                    </h3>
                    <p className="text-[11px] text-slate-500">Live absorption capacity of botanical nursery, gardens, and forestry assets</p>
                  </div>

                  <div className="space-y-5">
                    {/* Tree Sinks */}
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-emerald-900">Arboreal Sequestration (Trees)</h4>
                        <p className="text-[10px] text-emerald-700 leading-relaxed">
                          Absorption from {carbonStats.totalTrees.toLocaleString()} catalogued trees across institutional lines.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-800 font-mono block">
                          {(carbonStats.totalTrees * carbonFactors.treeAbsorption).toLocaleString()}
                        </span>
                        <span className="text-[8px] text-emerald-600 font-mono block">kg CO₂ / yr</span>
                      </div>
                    </div>

                    {/* Ground Grass / Cover Sinks */}
                    <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-teal-900">Green Belts & Horticultural Cover</h4>
                        <p className="text-[10px] text-teal-700 leading-relaxed">
                          Sequestration over {carbonStats.totalGreenArea.toLocaleString()} sqm of landscaped turf, nursery, and ground covers.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-teal-800 font-mono block">
                          {(carbonStats.totalGreenArea * 0.12).toLocaleString()}
                        </span>
                        <span className="text-[8px] text-teal-600 font-mono block">kg CO₂ / yr</span>
                      </div>
                    </div>

                    {/* Calibration Parameters Panel */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                        <HelpCircle size={12} className="text-slate-500" />
                        Calibration Factors
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono text-slate-500">
                        <div>Electricity: {carbonFactors.electricity}</div>
                        <div>Tree absorption: {carbonFactors.treeAbsorption} kg/yr</div>
                        <div>Diesel: {carbonFactors.diesel}</div>
                        <div>LPG: {carbonFactors.lpg}</div>
                        <div>Petrol: {carbonFactors.petrol}</div>
                        <div>Solid waste: {carbonFactors.waste}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECHARTS CHART: EMISSIONS VS ABSORPTION */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Campus Carbon Balance Comparison</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Annualized comparison of CO₂ emissions vs botanical absorption of top blocks</p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                    Twin Model Feed
                  </span>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={assets
                        .filter(a => (a.status || 'Active') === 'Active')
                        .sort((a, b) => b.energyUsage - a.energyUsage)
                        .slice(0, 6)
                        .map(a => ({
                          name: a.name,
                          Emissions: parseFloat((a.carbonFootprint * 365).toFixed(1)),
                          Absorption: a.annualCarbonAbsorption || 0
                        }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                      <Legend iconSize={10} verticalAlign="top" height={36} />
                      <Bar dataKey="Emissions" name="Annual Emissions (kg CO₂)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Absorption" name="Annual Absorption Sink (kg CO₂)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CARBON LEADERBOARD GRIDS */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
                {/* 1. Top Carbon Absorbers */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-3">
                    <Leaf className="text-emerald-600 animate-bounce" size={16} />
                    <div>
                      <h3 className="font-display font-bold text-slate-900 text-xs">Top Sinks (Absorbers)</h3>
                      <p className="text-[9px] text-slate-500">Highest catalogued arboreal absorption</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {topCarbonAbsorbers.map((asset, index) => (
                      <div key={asset.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center justify-center shrink-0">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-slate-800 block truncate">{asset.name}</span>
                            <span className="text-[9px] text-slate-400 block truncate">{asset.category}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-600 font-mono block">{asset.annualCarbonAbsorption}</span>
                          <span className="text-[7px] text-slate-400 uppercase tracking-wider font-semibold">kg CO₂/yr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Highest Carbon Emitters */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-3">
                    <Flame className="text-red-600" size={16} />
                    <div>
                      <h3 className="font-display font-bold text-slate-900 text-xs">Highest Carbon Emitters</h3>
                      <p className="text-[9px] text-slate-500">Highest calculated emission footprint</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {topCarbonEmitters.map((asset, index) => (
                      <div key={asset.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-full bg-red-100 text-red-800 text-[9px] font-bold flex items-center justify-center shrink-0">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-slate-800 block truncate">{asset.name}</span>
                            <span className="text-[9px] text-slate-400 block truncate">{asset.institution}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-red-600 font-mono block">{(asset.carbonFootprint * 365).toFixed(0)}</span>
                          <span className="text-[7px] text-slate-400 uppercase tracking-wider font-semibold">kg CO₂/yr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Lowest Carbon Emitters */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-3">
                    <Award className="text-blue-600" size={16} />
                    <div>
                      <h3 className="font-display font-bold text-slate-900 text-xs">Most Efficient Units</h3>
                      <p className="text-[9px] text-slate-500">Lowest carbon footprint structures</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {lowestCarbonEmitters.map((asset, index) => (
                      <div key={asset.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-bold flex items-center justify-center shrink-0">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-slate-800 block truncate">{asset.name}</span>
                            <span className="text-[9px] text-slate-400 block truncate">{asset.institution}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-blue-600 font-mono block">{(asset.carbonFootprint * 365).toFixed(0)}</span>
                          <span className="text-[7px] text-slate-400 uppercase tracking-wider font-semibold">kg CO₂/yr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Most Sustainable Assets */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-3">
                    <Award className="text-emerald-600" size={16} />
                    <div>
                      <h3 className="font-display font-bold text-slate-900 text-xs">Sustainability Leaderboard</h3>
                      <p className="text-[9px] text-slate-500">Highest overall Green Scores</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {mostSustainable.map((asset, index) => (
                      <div key={asset.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center justify-center shrink-0">
                            #{index + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-slate-800 block truncate">{asset.name}</span>
                            <span className="text-[9px] text-slate-400 block truncate">{asset.institution}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-600 font-mono block">{asset.greenScore}</span>
                          <span className="text-[7px] text-slate-400 uppercase tracking-wider font-semibold">Green Score</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {subTab === 'green' && (
            <div className="space-y-6 animate-fade-in" id="green-asset-dashboard-tab">
              {/* Green Cover 3 Stat Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-3xl p-6 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Catalogued Trees</span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl"><Leaf size={16} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-2xl md:text-3xl font-black font-display text-slate-800">{carbonStats.totalTrees.toLocaleString()}</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Individual botanical elements</span>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Landscaped Lawn cover</span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl"><Compass size={16} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-2xl md:text-3xl font-black font-display text-slate-800">{carbonStats.totalGreenArea.toLocaleString()} sqm</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Acreage mapped on twin layers</span>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Annual Offset capacity</span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl"><Award size={16} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-2xl md:text-3xl font-black font-display text-slate-800">{carbonStats.totalAnnualSink.toLocaleString()} kg/yr</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Estimated direct carbon sink capacity</span>
                  </div>
                </div>
              </div>

              {/* Mapped Botanical Asset Ledger Table */}
              <div className="glass-card rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">Geospatial Botanical Registry</h3>
                    <p className="text-slate-500 text-[10px] mt-0.5">Catalogued green zone assets and carbon sink details.</p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
                    {greenCoverAssets.length} Mapped Zones
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold uppercase text-[9px] tracking-wider font-mono">
                        <th className="p-3">Asset name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Block location</th>
                        <th className="p-3 text-right">Quantity / Area</th>
                        <th className="p-3 text-right">Absorption coefficient</th>
                        <th className="p-3 text-right">Total annual sink</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {greenCoverAssets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-mono">No mapped green zone assets in digital twin.</td>
                        </tr>
                      ) : (
                        greenCoverAssets.map((asset) => {
                          const absorptionCoeff = asset.carbonAbsorptionRate !== undefined ? asset.carbonAbsorptionRate : 21;
                          const qty = asset.quantity !== undefined ? asset.quantity : 1;
                          const totalSink = asset.annualCarbonAbsorption || (qty * absorptionCoeff);
                          return (
                            <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-semibold text-slate-800">{asset.name}</td>
                              <td className="p-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold">{asset.category}</span></td>
                              <td className="p-3 font-mono">{asset.locationBlock || 'Campus Outer'}</td>
                              <td className="p-3 text-right font-mono font-bold">
                                {asset.category === 'Lawn' || asset.category === 'Garden Area'
                                  ? `${(asset.greenCoverArea || 0).toLocaleString()} sqm`
                                  : qty.toLocaleString()
                                }
                              </td>
                              <td className="p-3 text-right font-mono text-slate-500">{absorptionCoeff} kg CO₂/unit/yr</td>
                              <td className="p-3 text-right font-mono font-extrabold text-emerald-600">{totalSink.toLocaleString()} kg/yr</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {subTab === 'energy' && (
            <div className="space-y-6 animate-fade-in" id="energy-dashboard-tab">
              {/* Energy 4 Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card rounded-3xl p-6 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Daily Power Load</span>
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl"><Zap size={16} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-2xl md:text-3xl font-black font-display text-slate-800">{energyDashboardTotals.dailyPowerDraw.toLocaleString()} kWh</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Estimated daily grid demand</span>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Monthly Power Load</span>
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl"><Zap size={16} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-2xl md:text-3xl font-black font-display text-slate-800">{(energyDashboardTotals.dailyPowerDraw * 30).toLocaleString()} kWh</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Estimated monthly consumption</span>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Generator Units</span>
                    <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl"><Flame size={16} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-2xl md:text-3xl font-black font-display text-slate-800">{energyDashboardTotals.totalGenerators.toLocaleString()} Units</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Diesel backup systems catalogued</span>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 space-y-2.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rooftop Solar feedback</span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl"><Leaf size={16} /></div>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-2xl md:text-3xl font-black font-display text-slate-800">{energyDashboardTotals.totalSolarPanels.toLocaleString()} Panels</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Active microgrid generation feedback</span>
                  </div>
                </div>
              </div>

              {/* Electrical Twin Registry Table */}
              <div className="glass-card rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">Electrical Twin Node Registry</h3>
                    <p className="text-slate-500 text-[10px] mt-0.5">Live IoT cataloguing of heavy equipment, air conditioning loops, and generator twins.</p>
                  </div>
                  <span className="text-[10px] bg-[#FFB547]/10 text-amber-700 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
                    {electricalAssets.length} Mapped Loads
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold uppercase text-[9px] tracking-wider font-mono">
                        <th className="p-3">Device name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Grid Location</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Rating load (W)</th>
                        <th className="p-3 text-right">Daily operating hours</th>
                        <th className="p-3 text-right">Daily emission (kg CO₂/day)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {electricalAssets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 font-mono">No active electrical devices mapped on digital twin.</td>
                        </tr>
                      ) : (
                        electricalAssets.map((asset) => {
                          const power = asset.powerRating || 0;
                          const qty = asset.quantity !== undefined ? asset.quantity : 1;
                          const hours = asset.usageHours || 0;
                          const dailyEmission = asset.carbonFootprint || (((power * qty * hours) / 1000) * 0.82);
                          return (
                            <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-semibold text-slate-800">{asset.name}</td>
                              <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">{asset.category}</span></td>
                              <td className="p-3 font-mono">{asset.locationBlock || 'Infrastructure Grid'}</td>
                              <td className="p-3 text-right font-mono">{qty.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono text-slate-500">{power.toLocaleString()} W</td>
                              <td className="p-3 text-right font-mono text-slate-500">{hours} hrs/day</td>
                              <td className="p-3 text-right font-mono font-extrabold text-rose-600">{dailyEmission.toFixed(2)} kg/day</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* PDF Exporter modal layout */}
      {showReportModal && analytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 bg-transparent border-none cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="font-display font-bold text-lg text-slate-950 mb-1">Monthly Sustainability Report Exporter</h3>
            <p className="text-slate-500 text-xs mb-4">Review the compiled institutional metrics ledger before exporting as a PDF document.</p>

            {/* Printable Report Box */}
            <div id="report-printable-area" className="border border-slate-300 rounded-xl p-6 bg-white shadow-inner mb-6">
              <div className="border-b-2 border-slate-200 pb-4 mb-6 text-center">
                <h1 className="text-xl font-bold text-slate-900">IndraVerse Campus Sustainability OS</h1>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Monthly Analytics Ledger • June 2026</p>
                <p className="text-slate-400 text-[10px] mt-1">Generated: {new Date().toLocaleDateString()}</p>
              </div>

              {/* Data Table */}
              <table className="w-full text-left text-xs border border-collapse border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200">Sustainability Category</th>
                    <th className="p-3 border-r border-slate-200 text-right">Current Month</th>
                    <th className="p-3 border-r border-slate-200 text-right">Previous Month</th>
                    <th className="p-3 border-r border-slate-200 text-right">Difference</th>
                    <th className="p-3 text-center">Percentage Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Energy */}
                  <tr>
                    <td className="p-3 font-semibold border-r border-slate-200">Electricity Consumption (kWh)</td>
                    <td className="p-3 text-right font-mono border-r border-slate-200">{analytics.trends.energy.curr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono border-r border-slate-200">{analytics.trends.energy.prev.toLocaleString()}</td>
                    <td className={`p-3 text-right font-mono font-bold border-r border-slate-200 ${analytics.trends.energy.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {analytics.trends.energy.diff > 0 ? '+' : ''}{analytics.trends.energy.diff.toLocaleString()}
                    </td>
                    <td className={`p-3 text-center font-bold ${analytics.trends.energy.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {analytics.trends.energy.diff > 0 ? '↑ Increased' : analytics.trends.energy.diff < 0 ? '↓ Decreased' : '→ No Change'} ({analytics.trends.energy.pct}%)
                    </td>
                  </tr>

                  {/* Water */}
                  <tr>
                    <td className="p-3 font-semibold border-r border-slate-200">Water Consumption (Litres)</td>
                    <td className="p-3 text-right font-mono border-r border-slate-200">{analytics.trends.water.curr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono border-r border-slate-200">{analytics.trends.water.prev.toLocaleString()}</td>
                    <td className={`p-3 text-right font-mono font-bold border-r border-slate-200 ${analytics.trends.water.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {analytics.trends.water.diff > 0 ? '+' : ''}{analytics.trends.water.diff.toLocaleString()}
                    </td>
                    <td className={`p-3 text-center font-bold ${analytics.trends.water.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {analytics.trends.water.diff > 0 ? '↑ Increased' : analytics.trends.water.diff < 0 ? '↓ Decreased' : '→ No Change'} ({analytics.trends.water.pct}%)
                    </td>
                  </tr>

                  {/* Waste */}
                  <tr>
                    <td className="p-3 font-semibold border-r border-slate-200">Municipal Waste Refuse (kg)</td>
                    <td className="p-3 text-right font-mono border-r border-slate-200">{analytics.trends.waste.curr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono border-r border-slate-200">{analytics.trends.waste.prev.toLocaleString()}</td>
                    <td className={`p-3 text-right font-mono font-bold border-r border-slate-200 ${analytics.trends.waste.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {analytics.trends.waste.diff > 0 ? '+' : ''}{analytics.trends.waste.diff.toLocaleString()}
                    </td>
                    <td className={`p-3 text-center font-bold ${analytics.trends.waste.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {analytics.trends.waste.diff > 0 ? '↑ Increased' : analytics.trends.waste.diff < 0 ? '↓ Decreased' : '→ No Change'} ({analytics.trends.waste.pct}%)
                    </td>
                  </tr>

                  {/* Transport */}
                  <tr>
                    <td className="p-3 font-semibold border-r border-slate-200">Indirect Transport Carbon (kg CO₂)</td>
                    <td className="p-3 text-right font-mono border-r border-slate-200">{analytics.trends.transport.curr.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono border-r border-slate-200">{analytics.trends.transport.prev.toLocaleString()}</td>
                    <td className={`p-3 text-right font-mono font-bold border-r border-slate-200 ${analytics.trends.transport.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {analytics.trends.transport.diff > 0 ? '+' : ''}{analytics.trends.transport.diff.toLocaleString()}
                    </td>
                    <td className={`p-3 text-center font-bold ${analytics.trends.transport.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {analytics.trends.transport.diff > 0 ? '↑ Increased' : analytics.trends.transport.diff < 0 ? '↓ Decreased' : '→ No Change'} ({analytics.trends.transport.pct}%)
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-8 border-t border-slate-100 pt-4 text-center">
                <p className="text-[10px] text-slate-400">Indra Ganesan Group of Institutions (Trichy, India). Autonomously compiled and verified digitally.</p>
              </div>
            </div>

            {/* Exporter triggers */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer bg-white"
              >
                Close Preview
              </button>
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/10 border-none cursor-pointer"
              >
                <Printer size={14} />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Cpu, 
  Droplet, 
  Trash2, 
  Leaf, 
  Search, 
  SlidersHorizontal,
  Plus,
  TrendingUp,
  TrendingDown,
  Edit2,
  Check,
  X,
  Gauge,
  Sparkles,
  Zap,
  Car,
  Trees,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { CampusAsset, User } from '../types';
import { calculateCampusCarbonStats } from '../utils/sustainabilityUtils';
import { CmsConfig } from '../utils/cmsStore';
import CarbonSmokeTreeVisualizer from './CarbonSmokeTreeVisualizer';

interface DashboardProps {
  assets: CampusAsset[];
  user: User | null;
  onUpdateAsset: (id: string, updatedFields: Partial<CampusAsset>) => Promise<void>;
  cmsConfig?: CmsConfig;
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

function AnimatedCounter({ value, duration = 1000, decimals = 0, prefix = '', suffix = '' }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / 60), 16);
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalMiliseconds, 1);
      const easeProgress = progress * (2 - progress);
      const current = start + (end - start) * easeProgress;
      setCount(current);

      if (progress >= 1) {
        clearInterval(timer);
        setCount(end);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export default function Dashboard({ assets, user, onUpdateAsset, cmsConfig }: DashboardProps) {
  const [activeChartTab, setActiveChartTab] = useState<'carbon-trend' | 'smoke-metaphor' | 'emission-breakdown' | 'tree-offsets' | 'category-distribution'>('carbon-trend');

  const activeAssets = useMemo(() => {
    return assets.filter(a => (a.status || 'Active') !== 'Inactive');
  }, [assets]);

  const campusStats = useMemo(() => {
    return calculateCampusCarbonStats(assets);
  }, [assets]);

  const treeSpeciesData = useMemo(() => {
    const speciesMap: { [key: string]: number } = {};
    activeAssets.forEach(a => {
      if (a.category === 'Trees' && a.treeSpecies) {
        const qty = a.quantity || 1;
        const rate = a.carbonAbsorptionRate !== undefined ? a.carbonAbsorptionRate : 21;
        const speciesName = a.treeSpecies.trim();
        speciesMap[speciesName] = (speciesMap[speciesName] || 0) + (qty * rate);
      }
    });
    if (Object.keys(speciesMap).length === 0) {
      return [
        { name: 'Neem Tree', value: 1250 },
        { name: 'Banyan Tree', value: 940 },
        { name: 'Mahogany', value: 850 },
        { name: 'Ashoka Tree', value: 600 }
      ];
    }
    return Object.keys(speciesMap).map(key => ({
      name: key,
      value: speciesMap[key]
    }));
  }, [activeAssets]);

  const carbonEmissionsBreakdown = useMemo(() => {
    const list = Object.keys(campusStats.categoryEmissions).map(cat => ({
      name: cat,
      value: Math.round(campusStats.categoryEmissions[cat])
    }));
    if (list.length === 0) {
      return [
        { name: 'Air Conditioners', value: 3400 },
        { name: 'Diesel Vehicles', value: 4500 },
        { name: 'Generators', value: 2800 },
        { name: 'Laptops & Computers', value: 1200 }
      ];
    }
    return list;
  }, [campusStats]);

  const assetCategoryCounts = useMemo(() => {
    const list = Object.keys(campusStats.categoryQuantities).map(cat => ({
      name: cat,
      value: campusStats.categoryQuantities[cat]
    }));
    if (list.length === 0) {
      return [
        { name: 'Trees', value: 140 },
        { name: 'Ceiling Fans', value: 85 },
        { name: 'Air Conditioners', value: 42 },
        { name: 'Computers', value: 110 }
      ];
    }
    return list;
  }, [campusStats]);

  const monthlyCarbonTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const { totalEmissions, totalOffset } = campusStats;
    
    return months.map((month, idx) => {
      const variation = 0.94 + (idx * 0.02) + Math.sin(idx) * 0.015;
      const emissions = Math.round((totalEmissions > 0 ? totalEmissions : 11500) / 12 * variation);
      const offsets = Math.round((totalOffset > 0 ? totalOffset : 4500) / 12 * (0.86 + (idx * 0.04)));
      const net = emissions - offsets;
      return {
        month,
        emissions,
        offsets,
        net
      };
    });
  }, [campusStats]);

  const EMISSION_COLORS = ['#ef4444', '#f59e0b', '#0056d2', '#0ea5e9', '#8b5cf6', '#10b981'];
  const CATEGORY_COLORS = ['#0056d2', '#0ea5e9', '#0284c7', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'];
  const TREE_COLORS = ['#10b981', '#059669', '#0ea5e9', '#0056d2', '#6366f1'];

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  const heroTitle = cmsConfig?.heroTitle || 'Smart Campus Command Center';
  const heroSubtitle = cmsConfig?.heroSubtitle || 'Monitoring carbon telemetry, asset performance, and net-zero benchmarks for Indra Ganesan Institutions.';

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6 pb-10" 
      id="dashboard-root"
    >
      {/* Page Hero Panel (36px Poppins Title, bg-hero-pattern, #0F172A heading) */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 glass-card rounded-3xl relative overflow-hidden bg-hero-pattern" 
        id="dashboard-header"
      >
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2 text-[#0056D2] font-mono text-xs uppercase tracking-widest font-bold">
            <Sparkles size={14} className="text-[#0056D2]" />
            <span>Mission Control • Real-Time Campus Intelligence</span>
          </div>
          <h1 className="page-title text-[#0F172A]">{heroTitle}</h1>
          <p className="body-text text-base font-medium leading-relaxed max-w-3xl mt-1">{heroSubtitle}</p>
        </div>
        <div className="flex items-center gap-4 z-10 shrink-0">
          <div className="flex flex-col items-end">
            <span className="label-text text-xs uppercase tracking-wider text-[#475569] font-bold">Green Index</span>
            <span className="stat-value text-3xl text-[#0056D2]">{campusStats.sustainabilityScore}%</span>
          </div>
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3.5 py-2 rounded-xl text-xs text-[#0056D2] font-mono font-bold shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#0056D2] animate-pulse"></span>
            <span>System Synchronized</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards Grid with 20px card titles, 32px Poppins stat values and enlarged icons */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" 
        id="kpi-grid"
      >
        {/* Card 1: Total Campus Emissions */}
        <div className="glass-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-text text-xs uppercase tracking-wider font-mono font-bold">Gross Emissions</span>
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="stat-value">
              <AnimatedCounter value={campusStats.totalEmissions} />
            </h3>
            <p className="secondary-text text-xs font-mono mt-1 font-bold uppercase">
              kg CO₂ / Year
            </p>
          </div>
        </div>

        {/* Card 2: Total Carbon Offset */}
        <div className="glass-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-text text-xs uppercase tracking-wider font-mono font-bold">Offset Absorption</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Leaf size={22} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="stat-value">
              <AnimatedCounter value={campusStats.totalOffset} />
            </h3>
            <p className="secondary-text text-xs text-emerald-600 font-mono mt-1 font-bold uppercase">
              kg CO₂ / Year
            </p>
          </div>
        </div>

        {/* Card 3: Net Carbon Footprint */}
        <div className="glass-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-text text-xs uppercase tracking-wider font-mono font-bold">Net Footprint</span>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${campusStats.netCarbonFootprint <= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
              <Activity size={22} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`stat-value ${campusStats.netCarbonFootprint <= 0 ? 'text-emerald-600' : 'text-[#0F172A]'}`}>
              <AnimatedCounter value={Math.abs(campusStats.netCarbonFootprint)} />
              {campusStats.netCarbonFootprint <= 0 && <span className="text-xs ml-1 text-emerald-600 font-bold uppercase">(Net-Zero)</span>}
            </h3>
            <p className="secondary-text text-xs font-mono mt-1 font-bold uppercase">
              kg CO₂ / Year
            </p>
          </div>
        </div>

        {/* Card 4: Neutrality Score */}
        <div className="glass-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-text text-xs uppercase tracking-wider font-mono font-bold">Neutrality Index</span>
            <div className="h-10 w-10 rounded-xl bg-sky-50 text-[#0056D2] border border-sky-200 flex items-center justify-center">
              <Gauge size={22} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="stat-value text-[#0056D2]">
              <AnimatedCounter value={campusStats.sustainabilityScore} suffix="%" />
            </h3>
            <p className="secondary-text text-xs text-[#0056D2] font-mono mt-1 font-bold uppercase">
              Institutional Benchmark
            </p>
          </div>
        </div>
      </motion.div>

      {/* Analytics Charts Section with 22px chart titles */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6" 
        id="charts-row"
      >
        <div className="lg:col-span-2 relative" id="energy-water-chart-container">
          <div className="glass-card h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="chart-title">Carbon & Greenery Telemetry</h3>
                <p className="body-text text-xs mt-0.5 font-medium">Automatic asset-calculated analytics & offset trend calibrations.</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-[#F2F6FB] p-1 rounded-xl border border-slate-200">
                {(['carbon-trend', 'smoke-metaphor', 'emission-breakdown', 'tree-offsets', 'category-distribution'] as const).map((tabKey) => {
                  const labelMap = {
                    'carbon-trend': 'Monthly Carbon Trend',
                    'smoke-metaphor': 'Smoke & Tree Metaphor',
                    'emission-breakdown': 'Emission Breakdown',
                    'tree-offsets': 'Tree Offset Species',
                    'category-distribution': 'Asset Category Counts'
                  };
                  const colors = {
                    'carbon-trend': '#10B981',
                    'smoke-metaphor': '#8B5CF6',
                    'emission-breakdown': '#EF4444',
                    'tree-offsets': '#059669',
                    'category-distribution': '#0056D2'
                  };
                  const isActive = activeChartTab === tabKey;
                  return (
                    <button
                      key={tabKey}
                      onClick={() => setActiveChartTab(tabKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 font-display ${
                        isActive
                          ? 'bg-white shadow-xs text-[#0F172A] border border-slate-200'
                          : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/50'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: colors[tabKey] }} />
                      <span>{labelMap[tabKey]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="h-72">
              {activeChartTab === 'smoke-metaphor' ? (
                <CarbonSmokeTreeVisualizer data={monthlyCarbonTrend} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {activeChartTab === 'carbon-trend' ? (
                  <AreaChart data={monthlyCarbonTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOffsets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#334155" fontSize={11} fontWeight={600} tickLine={false} />
                    <YAxis stroke="#334155" fontSize={11} fontWeight={600} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }} />
                    <Area type="monotone" dataKey="emissions" name="Gross Emissions (kg CO₂/mo)" stroke="#DC2626" strokeWidth={2} fillOpacity={1} fill="url(#colorEmissions)" />
                    <Area type="monotone" dataKey="offsets" name="Offset Absorption (kg CO₂/mo)" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorOffsets)" />
                  </AreaChart>
                ) : activeChartTab === 'emission-breakdown' ? (
                  <BarChart data={carbonEmissionsBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#334155" fontSize={10} fontWeight={600} tickLine={false} />
                    <YAxis stroke="#334155" fontSize={11} fontWeight={600} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }} />
                    <Bar dataKey="value" name="Annual Emissions (kg CO₂/yr)" fill="#0056D2" radius={[6, 6, 0, 0]}>
                      {carbonEmissionsBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={EMISSION_COLORS[index % EMISSION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : activeChartTab === 'tree-offsets' ? (
                  <PieChart>
                    <Pie
                      data={treeSpeciesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {treeSpeciesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={TREE_COLORS[index % TREE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#0f172a' }} formatter={(val) => [`${val} kg CO₂/yr`, 'Absorption']} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }} />
                  </PieChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={assetCategoryCounts}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {assetCategoryCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#0f172a' }} formatter={(val) => [`${val} Units`, 'Quantity']} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', color: '#0f172a', fontWeight: 'bold' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Quick Asset Metrics Overview */}
        <div className="glass-card space-y-4">
          <h3 className="chart-title border-b border-slate-200 pb-2">
            Campus Infrastructure Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-[#F2F6FB] rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <Trees size={20} className="text-emerald-600" />
                <div>
                  <strong className="card-title text-sm block">Botanical Assets</strong>
                  <span className="secondary-text text-xs">Recorded Trees & Lawns</span>
                </div>
              </div>
              <span className="stat-value text-base font-mono">{campusStats.totalTrees}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F2F6FB] rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-[#0056D2]" />
                <div>
                  <strong className="card-title text-sm block">Electrical Telemetry</strong>
                  <span className="secondary-text text-xs">Active Twin Metering</span>
                </div>
              </div>
              <span className="stat-value text-base font-mono">{campusStats.totalElectricalAssets}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F2F6FB] rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-amber-500" />
                <div>
                  <strong className="card-title text-sm block">Solar Array Generation</strong>
                  <span className="secondary-text text-xs">Renewable Energy Nodes</span>
                </div>
              </div>
              <span className="stat-value text-base font-mono">{campusStats.totalRenewableEnergyAssets}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

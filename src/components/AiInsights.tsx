import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Zap, 
  Droplet, 
  Trash2, 
  Leaf, 
  TrendingUp, 
  ArrowRight,
  RefreshCw,
  Cpu,
  Terminal,
  Activity
} from 'lucide-react';
import { AiRecommendation, InsightCategory } from '../types';

interface AiInsightsProps {
  recommendations: AiRecommendation[];
  onTriggerAudit: () => Promise<void>;
  userRole?: string;
}

export default function AiInsights({ recommendations, onTriggerAudit, userRole }: AiInsightsProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [auditLogs, setAuditLogs] = useState<string[]>([]);

  const handleAuditClick = async () => {
    setIsScanning(true);
    setAuditLogs([]);
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    setScanMessage('Initializing Indra Ganesan Campus Sensor Arrays...');
    setAuditLogs(prev => [...prev, '[SYSTEM] Connecting to IoT edge gateways... Done.']);
    await sleep(800);
    
    setScanMessage('Aggregating Energy & Water Flow Telemetry...');
    setAuditLogs(prev => [...prev, '[SYSTEM] Reading STP recycled water flows... Done.', '[SYSTEM] Fetching rooftop solar grid feedback... Done.']);
    await sleep(1000);
    
    setScanMessage('Running Gemini 2.5 Sustainability Audit Models...');
    setAuditLogs(prev => [...prev, '[AI MODEL] Querying gemini-2.5-flash with live parameters...', '[AI MODEL] Calculating carbon indexes...']);
    await sleep(1200);

    setScanMessage('Generating Actionable Directives...');
    setAuditLogs(prev => [...prev, '[AI MODEL] Formatting final response... Done.']);
    await sleep(600);

    try {
      await onTriggerAudit();
    } catch (err) {
      console.error(err);
      alert('Audit model encountered an error.');
    } finally {
      setIsScanning(false);
    }
  };

  const getCategoryColor = (category: InsightCategory) => {
    switch (category) {
      case 'Energy': return 'text-[#0056D2] bg-sky-50 border-sky-200';
      case 'Water': return 'text-[#0284C7] bg-cyan-50 border-cyan-200';
      case 'Waste': return 'text-[#8B5E3C] bg-amber-50 border-amber-200';
      case 'Greenery': return 'text-[#059669] bg-emerald-50 border-emerald-200';
      default: return 'text-[#7C3AED] bg-purple-50 border-purple-200';
    }
  };

  const getCategoryIcon = (category: InsightCategory) => {
    switch (category) {
      case 'Energy': return <Zap size={16} />;
      case 'Water': return <Droplet size={16} />;
      case 'Waste': return <Trash2 size={16} />;
      case 'Greenery': return <Leaf size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  return (
    <div className="space-y-6" id="insights-root">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4" id="insights-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            AI Sustainability Insights
            <span className="text-xs bg-sky-50 text-[#0056D2] font-mono font-bold px-3 py-1 rounded-full border border-sky-200 shadow-xs flex items-center gap-1.5 shrink-0">
              <Sparkles size={13} className="text-[#0056D2]" />
              Gemini AI Engine
            </span>
          </h1>
          <p className="body-text text-base mt-1">
            Real-time machine learning analysis auditing campus resources to propose high-impact carbon solutions.
          </p>
        </div>

        {userRole === 'Admin' && (
          <button
            onClick={handleAuditClick}
            disabled={isScanning}
            className="btn-primary-ig shrink-0"
            id="trigger-audit-btn"
          >
            <BrainCircuit size={18} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Running ML Telemetry Scan...' : 'Trigger AI Eco-Audit'}</span>
          </button>
        )}
      </div>

      {/* Audit scanning screen overlay if isScanning */}
      {isScanning ? (
        <div className="glass-card flex flex-col items-center justify-center space-y-6 animate-fade-in shadow-md" id="scanning-screen">
          <div className="relative flex items-center justify-center h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-sky-100 border border-sky-300 animate-ping"></div>
            <div className="relative h-12 w-12 rounded-full bg-[#0056D2] text-white flex items-center justify-center font-bold shadow-sm">
              <Activity size={24} className="animate-spin" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="section-title text-xl text-[#0F172A]">{scanMessage}</h3>
            <p className="body-text text-sm">Gemini AI models are computing green metrics against live node state records.</p>
          </div>

          {/* Terminal Logs Simulation */}
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-5 font-mono text-xs text-slate-200 space-y-2 h-36 overflow-y-auto shadow-inner" id="scanning-terminal-logs">
            <div className="text-slate-400 flex items-center gap-2 border-b border-slate-800 pb-2 mb-2 font-bold">
              <Terminal size={14} /> Live Audit Diagnostics Trace
            </div>
            {auditLogs.map((log, index) => (
              <div key={index} className="leading-relaxed animate-fade-in text-emerald-400 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Grid of Recommendations (High Contrast, Poppins 20px card titles, Inter 16px body, 24px Poppins values) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="insights-grid">
          {recommendations.length === 0 ? (
            <div className="col-span-full glass-card border-dashed py-16 text-center text-[#334155] text-sm">
              No recommendations generated yet. Click 'Trigger AI Eco-Audit' above to query Gemini AI!
            </div>
          ) : (
            recommendations.map((rec) => (
              <div 
                key={rec.id}
                className="glass-card flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono tracking-wider font-bold uppercase border ${getCategoryColor(rec.category)}`}>
                      {getCategoryIcon(rec.category)}
                      {rec.category}
                    </span>

                    {/* Impact Level Badge */}
                    <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      rec.impactLevel === 'High' ? 'text-rose-600 font-extrabold' :
                      rec.impactLevel === 'Medium' ? 'text-amber-600 font-extrabold' :
                      'text-[#475569]'
                    }`}>
                      {rec.impactLevel} Impact
                    </span>
                  </div>

                  <h3 className="card-title text-xl text-[#0F172A]">{rec.title}</h3>
                  <p className="body-text text-base leading-relaxed text-[#334155]">{rec.description}</p>
                </div>

                {/* Savings Potential Footer (24px Poppins bold #0056D2) */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
                  <div>
                    <span className="label-text text-xs uppercase font-mono tracking-wider text-[#475569] block font-bold">Savings Potential</span>
                    <span className="stat-value text-2xl text-[#0056D2] font-extrabold mt-1 block">{rec.savingsPotential}</span>
                  </div>
                  
                  <span className="secondary-text text-xs font-mono font-bold">
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

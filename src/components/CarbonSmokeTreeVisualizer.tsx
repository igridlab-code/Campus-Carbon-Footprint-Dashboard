import React, { useState } from 'react';

interface MonthlyCarbonData {
  month: string;
  emissions: number;
  offsets: number;
  net: number;
}

interface CarbonSmokeTreeVisualizerProps {
  data: MonthlyCarbonData[];
}

export default function CarbonSmokeTreeVisualizer({ data }: CarbonSmokeTreeVisualizerProps) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);

  const selectedData = data[selectedMonthIndex] || data[0] || { month: 'Jan', emissions: 1000, offsets: 500, net: 500 };

  const { emissions, offsets, month } = selectedData;
  const total = emissions + offsets || 1;
  const emissionsRatio = Math.min(1, Math.max(0, emissions / total));
  const offsetRatio = Math.min(1, Math.max(0, offsets / total));

  // Determine pollution vs recovery status text & styling
  const isHighEmissions = emissions > offsets;
  const statusColor = isHighEmissions ? 'text-rose-600' : 'text-emerald-600';
  const statusBg = isHighEmissions ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200';

  // Scale numbers for smoke puffs & trees
  const smokeOpacity = Math.min(0.85, 0.15 + emissionsRatio * 0.7);
  const smokeCount = Math.round(2 + emissionsRatio * 6);
  const treeScale = 0.5 + offsetRatio * 0.7;
  const treeDensity = Math.round(3 + offsetRatio * 7);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Controls: Month Selector & Telemetry Ratio Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200">
          {data.map((item, idx) => (
            <button
              key={item.month}
              onClick={() => setSelectedMonthIndex(idx)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                idx === selectedMonthIndex
                  ? 'bg-white shadow-xs text-slate-900 border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {item.month}
            </button>
          ))}
        </div>

        <div className={`px-3 py-1 rounded-full border text-xs font-bold font-mono flex items-center gap-1.5 ${statusBg} ${statusColor}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${isHighEmissions ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          <span>{month}: {isHighEmissions ? `High Carbon Output (${emissions.toLocaleString()} kg)` : `Strong Green Offset (${offsets.toLocaleString()} kg)`}</span>
        </div>
      </div>

      {/* SVG Metaphor Canvas */}
      <div className="relative flex-1 w-full min-h-[200px] rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950 p-4 flex flex-col justify-end shadow-inner">
        {/* CSS Keyframe Styles for lightweight animations */}
        <style>{`
          @keyframes smokeRise {
            0% { transform: translateY(0px) scale(0.8); opacity: 0; }
            40% { opacity: var(--smoke-opacity, 0.5); }
            100% { transform: translateY(-90px) scale(1.6); opacity: 0; }
          }
          @keyframes treeSway {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(1.5deg); }
          }
          .smoke-puff {
            animation: smokeRise 4s infinite ease-out;
            transform-origin: center bottom;
          }
          .tree-sway {
            animation: treeSway 6s ease-in-out infinite;
            transform-origin: center bottom;
          }
        `}</style>

        {/* Ambient Sky / Air Pollution Overlay */}
        <div 
          className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
          style={{
            backgroundColor: `rgba(15, 23, 42, ${0.2 + emissionsRatio * 0.5})`,
            backgroundImage: emissionsRatio > 0.5 
              ? 'radial-gradient(circle at 50% 20%, rgba(225, 29, 72, 0.15), transparent 70%)'
              : 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.15), transparent 70%)'
          }}
        />

        {/* Dynamic Smoke Stack & Smoke Clouds */}
        <div className="absolute left-8 bottom-12 w-24 h-48 pointer-events-none flex flex-col items-center justify-end">
          {/* Smoke Plumes */}
          {Array.from({ length: smokeCount }).map((_, i) => (
            <div
              key={`smoke-${i}`}
              className="smoke-puff absolute bottom-14 rounded-full blur-md bg-slate-600/70 border border-slate-500/30"
              style={{
                width: `${36 + i * 8}px`,
                height: `${36 + i * 8}px`,
                left: `${(i % 3) * 6 - 8}px`,
                animationDelay: `${i * 0.6}s`,
                ['--smoke-opacity' as any]: smokeOpacity
              }}
            />
          ))}
          {/* Factory Stack Silhouette */}
          <div className="w-8 h-20 bg-slate-800 border-x border-t border-slate-700 rounded-t-sm relative z-10 shadow-lg">
            <div className="w-10 -ml-1 h-3 bg-slate-700 rounded-xs border border-slate-600" />
            {/* Red alert light on stack top */}
            <div className="absolute -top-2 left-3.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          </div>
        </div>

        {/* Dynamic Tree & Forest Area */}
        <div className="absolute right-4 bottom-10 left-36 h-36 pointer-events-none flex items-end justify-around px-2">
          {Array.from({ length: treeDensity }).map((_, i) => {
            const h = 48 + (i % 4) * 14;
            const delay = (i * 0.4) % 3;
            return (
              <div
                key={`tree-${i}`}
                className="tree-sway flex flex-col items-center transition-all duration-700"
                style={{
                  height: `${h * treeScale}px`,
                  animationDelay: `${delay}s`,
                  opacity: Math.max(0.3, offsetRatio * 1.2)
                }}
              >
                {/* Tree Canopy */}
                <div 
                  className="w-0 h-0 border-l-[18px] border-r-[18px] border-b-[36px] border-l-transparent border-r-transparent transition-colors duration-700"
                  style={{
                    borderBottomColor: offsetRatio > 0.45 ? '#10B981' : offsetRatio > 0.25 ? '#059669' : '#854D0E'
                  }}
                />
                <div 
                  className="w-0 h-0 border-l-[22px] border-r-[22px] border-b-[42px] border-l-transparent border-r-transparent -mt-5 transition-colors duration-700"
                  style={{
                    borderBottomColor: offsetRatio > 0.45 ? '#059669' : offsetRatio > 0.25 ? '#047857' : '#713F12'
                  }}
                />
                {/* Tree Trunk */}
                <div className="w-2.5 h-5 bg-amber-900/90 rounded-b-xs" />
              </div>
            );
          })}
        </div>

        {/* Ground Terrain */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-950 via-slate-900 to-transparent border-t border-slate-800/60 z-20 flex items-center justify-between px-4 text-[11px] font-mono text-slate-300">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500/80 inline-block" />
              Emissions: <strong className="text-white">{emissions.toLocaleString()} kg</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/80 inline-block" />
              Offsets: <strong className="text-white">{offsets.toLocaleString()} kg</strong>
            </span>
          </div>
          <span className="font-sans text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
            {month} Ratio: {Math.round(emissionsRatio * 100)}% Smoke / {Math.round(offsetRatio * 100)}% Greenery
          </span>
        </div>
      </div>
    </div>
  );
}

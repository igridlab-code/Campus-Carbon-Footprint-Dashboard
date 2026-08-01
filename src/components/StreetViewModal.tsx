import React, { useState } from 'react';
import { X, MapPin, Compass, Building2, HelpCircle, Globe, Eye } from 'lucide-react';
import PanoramaViewer from './PanoramaViewer';
import { CampusAsset } from '../types';

interface StreetViewModalProps {
  asset: CampusAsset;
  onClose: () => void;
  initialTab?: 'streetview' | 'panorama';
}

// Visual fallbacks that fit campus categories beautifully
const CATEGORY_PANORAMA_FALLBACKS: Record<string, string> = {
  Academic: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=2000&q=80', // Library
  Healthcare: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=2000&q=80', // Clinical Complex
  Medical: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=2000&q=80',
  Administration: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2000&q=80', // Admin main courtyard
  Administrative: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2000&q=80',
  'Food Services': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80', // Canteen/Catering
  'Green Zone': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=2000&q=80', // Eco garden park
  Sports: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=2000&q=80', // Sports/Athletics
  Default: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2000&q=80'
};

export default function StreetViewModal({ asset, onClose, initialTab }: StreetViewModalProps) {
  // Tabs: 'streetview' | 'panorama'
  const [activeView, setActiveView] = useState<'streetview' | 'panorama'>(
    initialTab || (asset.streetViewUrl ? 'streetview' : 'panorama')
  );

  // Determine panoramic visual to load
  const panoramaSrc = asset.panoramaUrl?.trim() || 
                       CATEGORY_PANORAMA_FALLBACKS[asset.category] || 
                       CATEGORY_PANORAMA_FALLBACKS.Default;

  const isUsingFallback = !asset.panoramaUrl;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in"
      id="streetview-modal-root"
    >
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Top Row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-accent/15 text-brand-accent flex items-center justify-center">
              <Compass size={18} className="animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm text-slate-100">{asset.name}</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-mono font-bold">
                  {activeView === 'streetview' ? 'GOOGLE STREET VIEW' : '360° PANORAMA'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Building2 size={11} className="text-slate-500" />
                  {asset.category} Block
                </span>
                <span className="text-slate-700 font-mono text-[10px]">•</span>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <MapPin size={11} className="text-slate-500" />
                  {asset.coordinate ? `${asset.coordinate[0].toFixed(4)}, ${asset.coordinate[1].toFixed(4)}` : 'Onsite'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Selector Toggle buttons */}
            <div className="bg-slate-950/80 p-0.5 rounded-xl border border-slate-850 flex gap-0.5">
              <button
                onClick={() => setActiveView('streetview')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all border-none cursor-pointer ${
                  activeView === 'streetview'
                    ? 'bg-brand-primary text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Street View
              </button>
              <button
                onClick={() => setActiveView('panorama')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all border-none cursor-pointer ${
                  activeView === 'panorama'
                    ? 'bg-brand-primary text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                360° Tour
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
              title="Close 360° Street View"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content Stage (Street View Iframe or 360 Panorama) */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950 flex flex-col justify-center min-h-[400px]">
          {activeView === 'streetview' ? (
            asset.streetViewUrl ? (
              <div className="w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-800 relative bg-slate-950">
                <iframe
                  src={asset.streetViewUrl}
                  width="100%"
                  height="100%"
                  className="absolute inset-0 border-none w-full h-full"
                  allowFullScreen={true}
                  loading="lazy"
                  title="Google Street View embed"
                  referrerPolicy="no-referrer"
                ></iframe>
              </div>
            ) : (
              <div className="text-center space-y-4 py-12 max-w-md mx-auto">
                <div className="h-12 w-12 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 mx-auto">
                  <Globe size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-slate-200 font-display font-bold text-sm">Street View Not Configured</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Google Street View is not yet available for these specific campus coordinates. Super Admins can add a Google Maps Embed link in the Asset Management desk.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('panorama')}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-semibold cursor-pointer border-none transition-all flex items-center gap-1.5 mx-auto"
                >
                  <Eye size={14} />
                  Switch to Immersive 360° Panorama
                </button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {isUsingFallback && (
                <div className="px-3 py-2 bg-blue-950/40 border border-blue-900/50 rounded-xl text-[10px] text-blue-300 flex items-center gap-2 font-mono">
                  <HelpCircle size={14} className="shrink-0 text-brand-accent animate-pulse" />
                  <span>
                    Note: No customized 360° panorama uploaded for this asset twin. Rendered fallback virtual scene matching "{asset.category}".
                  </span>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden border border-slate-800">
                <PanoramaViewer 
                  imageSrc={panoramaSrc} 
                  title={`${asset.name} • 360° Live Tour`} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0 text-[10px] text-slate-500 font-mono">
          <span>INDRAVERSE • DIGITAL TWIN SIMULATION DECK</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer border-none transition-all"
          >
            Exit Tour
          </button>
        </div>
      </div>
    </div>
  );
}

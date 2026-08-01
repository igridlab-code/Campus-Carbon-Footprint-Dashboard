import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  MapPin, 
  ImageIcon, 
  Building2, 
  Settings, 
  Upload, 
  RefreshCw, 
  Trash2, 
  HelpCircle, 
  Globe, 
  Eye, 
  Sparkles,
  Search,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PanoramaViewer from './PanoramaViewer';
import AssetGallery from './AssetGallery';
import StreetViewModal from './StreetViewModal';
import { CampusAsset, User } from '../types';

interface VirtualCampusTourProps {
  assets: CampusAsset[];
  onAssetsChanged: () => void;
  user: User | null;
  token?: string;
}

export default function VirtualCampusTour({ assets, onAssetsChanged, user, token }: VirtualCampusTourProps) {
  const isAdmin = user?.role === 'Admin';
  
  // List of active/available assets
  const activeAssets = useMemo(() => {
    return assets.filter(a => (a.status || 'Active') === 'Active');
  }, [assets]);

  // Selected asset state (defaults to the first active asset or null)
  const [selectedAssetId, setSelectedAssetId] = useState<string>(() => {
    return activeAssets[0]?.id || '';
  });

  const selectedAsset = useMemo(() => {
    return activeAssets.find(a => a.id === selectedAssetId) || activeAssets[0] || null;
  }, [activeAssets, selectedAssetId]);

  // Form states for Admin Panorama Management
  const [adminPanoUrl, setAdminPanoUrl] = useState('');
  const [adminThumbUrl, setAdminThumbUrl] = useState('');
  const [isUpdatingPano, setIsUpdatingPano] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingPano, setUploadingPano] = useState(false);
  const [ panoError, setPanoError ] = useState('');
  const [ panoSuccess, setPanoSuccess ] = useState('');

  // Custom Toasts State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'thumbnail' | 'panorama') => {
    const file = e.target.files?.[0];
    if (!file || !selectedAsset) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPanoError('Only jpg, jpeg, png, and webp formats are accepted.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    if (type === 'thumbnail') setUploadingThumb(true);
    if (type === 'panorama') setUploadingPano(true);
    setPanoError('');
    setPanoSuccess('');

    try {
      const res = await fetch(`/api/assets/${selectedAsset.id}/upload/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Failed to upload ${type}`);
      }

      const data = await res.json();
      setPanoSuccess(`Asset ${type} uploaded successfully!`);
      addToast(`Asset ${type} uploaded successfully!`, 'success');
      onAssetsChanged();
    } catch (err: any) {
      console.error(err);
      setPanoError(err.message || `Failed to upload ${type}`);
      addToast(err.message || `Failed to upload ${type}`, 'error');
    } finally {
      if (type === 'thumbnail') setUploadingThumb(false);
      if (type === 'panorama') setUploadingPano(false);
    }
  };

  // Filtering list search query
  const [searchQuery, setSearchQuery] = useState('');
  const [showStreetViewModal, setShowStreetViewModal] = useState(false);

  // Filtered list of assets
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return activeAssets;
    return activeAssets.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeAssets, searchQuery]);

  // Handler: Update/Replace Panorama
  const handleUpdatePanorama = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setIsUpdatingPano(true);
    setPanoError('');
    setPanoSuccess('');

    try {
      const res = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          panoramaUrl: adminPanoUrl.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update panorama in database.');
      }

      setPanoSuccess('360° Panorama updated successfully!');
      addToast('360° Panorama updated successfully!', 'success');
      setAdminPanoUrl('');
      onAssetsChanged();
      setTimeout(() => setPanoSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setPanoError(err.message || 'Error updating panorama.');
      addToast(err.message || 'Error updating panorama.', 'error');
    } finally {
      setIsUpdatingPano(false);
    }
  };

  // Handler: Delete Panorama (Clears URL)
  const handleDeletePanorama = async () => {
    if (!selectedAsset) return;
    if (!window.confirm('Are you sure you want to delete this custom 360° Panorama? The asset will revert to its standard category-optimized fallback panorama.')) return;

    setIsUpdatingPano(true);
    setPanoError('');
    setPanoSuccess('');

    try {
      const res = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          panoramaUrl: '' // Empty clears it
        })
      });

      if (!res.ok) {
        throw new Error('Failed to delete panorama.');
      }

      setPanoSuccess('Custom panorama deleted. Reverted to category default.');
      addToast('Custom panorama deleted.', 'success');
      onAssetsChanged();
      setTimeout(() => setPanoSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setPanoError(err.message || 'Error deleting panorama.');
      addToast(err.message || 'Error deleting panorama.', 'error');
    } finally {
      setIsUpdatingPano(false);
    }
  };

  // Handler: Update main thumbnail
  const handleUpdateThumbnail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setIsUpdatingPano(true);
    setPanoError('');
    setPanoSuccess('');

    try {
      const res = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          thumbnailUrl: adminThumbUrl.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update thumbnail.');
      }

      setPanoSuccess('Asset main thumbnail updated successfully!');
      addToast('Asset main thumbnail updated successfully!', 'success');
      setAdminThumbUrl('');
      onAssetsChanged();
      setTimeout(() => setPanoSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setPanoError(err.message || 'Error updating thumbnail.');
      addToast(err.message || 'Error updating thumbnail.', 'error');
    } finally {
      setIsUpdatingPano(false);
    }
  };

  // Panoramic visual fallback URL finder
  const currentPanoUrl = selectedAsset?.panoramaUrl || '';
  const currentThumbUrl = selectedAsset?.thumbnailUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80';

  return (
    <div className="space-y-6" id="virtual-tour-root">
      
      {/* VisionOS Spatial Tour Header Banner */}
      <div className="bg-[#11151C]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0084ff]/15 text-[#00d4ff] border border-[#0084ff]/25 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
            <Globe size={13} className="animate-pulse" />
            VisionOS Spatial Tour Viewport
          </div>
          <h2 className="font-display font-black text-3xl text-[#F8FAFC] tracking-tight">IndraVerse 360° Spatial Campus Tour</h2>
          <p className="text-[#94A3B8] text-xs md:text-sm max-w-2xl leading-relaxed font-medium">
            Step directly into high-fidelity twin simulation layers. Explore key academic blocks, medical research complexes, and sustainable green zones in full 360-degree rotation.
          </p>
        </div>
      </div>

      {activeAssets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
          <Compass size={40} className="text-slate-300 mx-auto mb-3 animate-spin" style={{ animationDuration: '10s' }} />
          <h3 className="font-display font-bold text-slate-900">No Assets Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Provision or activate campus asset twins in the Asset Management dashboard to populate this virtual tour.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* LEFT COLUMN: Asset Selection List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-4">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm text-slate-900">Campus Blocks</h3>
                <p className="text-[10px] text-slate-500">Select an asset to tour</p>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 px-3 h-[36px] bg-slate-50 border border-slate-200 focus-within:border-brand-primary rounded-xl transition-all">
                <Search size={14} className="shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search blocks..."
                  className="w-full h-full bg-transparent border-none outline-none text-slate-800 text-xs"
                />
              </div>

              {/* Asset List Buttons */}
              <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                {filteredAssets.map((asset) => {
                  const isSelected = asset.id === selectedAssetId;
                  return (
                    <button
                      key={asset.id}
                      onClick={() => {
                        setSelectedAssetId(asset.id);
                        setPanoError('');
                        setPanoSuccess('');
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-brand-primary-light border-brand-primary text-brand-primary font-bold shadow-xs' 
                          : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                        <img 
                          src={asset.thumbnailUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=150&q=80'} 
                          alt={asset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold truncate leading-tight">{asset.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-mono text-slate-500">{asset.category}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredAssets.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No blocks matched criteria.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats on selected item */}
            {selectedAsset && (
              <motion.div 
                layoutId="asset-meta-sidebar"
                className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3"
              >
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold border-b border-slate-100 pb-2">Active Twin Specs</div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Eco Score</span>
                  <span className="font-bold text-emerald-600 font-display">{selectedAsset.greenScore}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Institution</span>
                  <span className="font-semibold text-slate-800">{selectedAsset.institution}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Coordinate</span>
                  <span className="text-slate-600 font-mono text-[10px]">
                    {selectedAsset.coordinate ? `${selectedAsset.coordinate[0].toFixed(4)}, ${selectedAsset.coordinate[1].toFixed(4)}` : 'Onsite'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 leading-relaxed italic">
                  "{selectedAsset.description}"
                </div>

                {(selectedAsset.panoramaUrl || selectedAsset.panorama) && (
                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const target = document.getElementById('tour-viewport-header');
                        if (target) {
                          target.scrollIntoView({ behavior: 'smooth' });
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-semibold cursor-pointer border border-blue-200 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Compass size={14} />
                      View 360 Tour
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStreetViewModal(true)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer border-none transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} />
                      Open Panorama Viewer
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* RIGHT COLUMNS: Live Tour & Asset Gallery */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 360° Live Stream Viewport */}
            {selectedAsset && (
              <div id="tour-viewport-header" className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                      <Compass className="text-brand-accent animate-spin" size={18} style={{ animationDuration: '8s' }} />
                      360° Panorama Telemetry: {selectedAsset.name}
                    </h3>
                    <p className="text-xs text-slate-500">Live high-precision virtual tour model</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">SENSORS ONLINE</span>
                  </div>
                </div>

                {/* Panorama Display */}
                <PanoramaViewer 
                  key={selectedAsset.id + '-' + currentPanoUrl}
                  imageSrc={currentPanoUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2000&q=80'}
                  title={`${selectedAsset.name} Twin Space`}
                />
              </div>
            )}

            {/* ADMIN PANORAMA/THUMBNAIL MANAGEMENT PANEL */}
            {isAdmin && selectedAsset && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <Settings className="text-brand-accent animate-spin" size={16} style={{ animationDuration: '10s' }} />
                    360° Spatial Management Console (Super Admin)
                  </h4>
                  <span className="text-[9px] uppercase tracking-wider bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-full font-bold">
                    Asset ID: {selectedAsset.id}
                  </span>
                </div>

                {panoError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-mono">
                    ⚠️ Error: {panoError}
                  </div>
                )}
                {panoSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-mono flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                    <span>{panoSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Panorama Form */}
                  <div className="space-y-4 p-4 bg-slate-850/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
                    <form onSubmit={handleUpdatePanorama} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                          360° Panorama Image URL
                        </label>
                        {(selectedAsset.panoramaUrl || selectedAsset.panorama) && (
                          <button
                            type="button"
                            onClick={handleDeletePanorama}
                            disabled={isUpdatingPano}
                            className="text-[9px] text-rose-400 hover:text-rose-300 font-mono font-bold border-none bg-transparent cursor-pointer flex items-center gap-1 transition-all"
                            title="Delete current panorama configuration"
                          >
                            <Trash2 size={11} />
                            Delete Panorama
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        required
                        value={adminPanoUrl}
                        onChange={(e) => setAdminPanoUrl(e.target.value)}
                        placeholder={(selectedAsset.panoramaUrl || selectedAsset.panorama) ? "Paste new URL to replace panorama..." : "Paste 360° spherical Unsplash/image URL..."}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-brand-accent rounded-xl text-xs text-white outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={isUpdatingPano}
                        className="w-full py-2 bg-brand-accent hover:bg-brand-accent text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border-none flex items-center justify-center gap-1.5"
                      >
                        {isUpdatingPano ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {(selectedAsset.panoramaUrl || selectedAsset.panorama) ? 'Replace Panorama' : 'Upload Panorama'}
                      </button>
                    </form>

                    {(selectedAsset.panoramaUrl || selectedAsset.panorama) && (
                      <div className="space-y-2 border-t border-slate-800 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                            Current Panorama
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-[9px] text-brand-accent hover:text-brand-accent-hover font-mono font-bold border-none bg-transparent cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Eye size={11} />
                            View Panorama
                          </button>
                        </div>
                        <div className="relative w-full h-16 rounded-lg overflow-hidden border border-slate-850 bg-slate-900">
                          <img 
                            src={selectedAsset.panoramaUrl || selectedAsset.panorama} 
                            alt="Current Panorama Preview" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              console.error("Panorama preview failed to load:", selectedAsset.panoramaUrl || selectedAsset.panorama);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2.5 mt-2.5 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-mono">OR UPLOAD FILE DIRECTLY:</span>
                      <label className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1">
                        <Upload size={12} className="text-emerald-500" />
                        {uploadingPano ? 'Uploading...' : (selectedAsset.panoramaUrl || selectedAsset.panorama) ? 'Replace Panorama' : 'Choose Panorama'}
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, 'panorama')} 
                          disabled={uploadingPano}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Thumbnail Form */}
                  <div className="space-y-3 p-3.5 bg-slate-850/60 rounded-2xl border border-slate-800 flex flex-col justify-between">
                    <form onSubmit={handleUpdateThumbnail} className="space-y-3">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">
                        Main Thumbnail Image URL
                      </label>
                      <input
                        type="url"
                        required
                        value={adminThumbUrl}
                        onChange={(e) => setAdminThumbUrl(e.target.value)}
                        placeholder="Paste cover photo URL (e.g. Unsplash cover photo)..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-brand-accent rounded-xl text-xs text-white outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={isUpdatingPano}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                      >
                        {isUpdatingPano ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Update Thumbnail
                      </button>
                    </form>

                    <div className="pt-2.5 mt-2.5 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-mono">OR UPLOAD FILE DIRECTLY:</span>
                      <label className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1">
                        <Upload size={12} className="text-emerald-500" />
                        {uploadingThumb ? 'Uploading...' : 'Choose Thumbnail'}
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, 'thumbnail')} 
                          disabled={uploadingThumb}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 flex items-center gap-2">
                  <HelpCircle size={14} className="text-brand-accent shrink-0" />
                  <span>
                    Pro-tip: Unsplash URLs work perfectly! Make sure your 360° image is wide and panoramic (equirectangular) for ideal cylindrical rendering.
                  </span>
                </div>
              </div>
            )}

            {/* Asset Photo Gallery & Slide Deck */}
            {selectedAsset && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
                <AssetGallery 
                  asset={selectedAsset} 
                  isAdmin={isAdmin} 
                  token={token} 
                  onAssetsChanged={onAssetsChanged} 
                />
              </div>
            )}

          </div>
        </div>
      )}

      {showStreetViewModal && selectedAsset && (
        <StreetViewModal 
          asset={selectedAsset} 
          onClose={() => setShowStreetViewModal(false)} 
          initialTab="panorama"
        />
      )}

      {/* Dynamic Floating Toast Feedback Alerts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border pointer-events-auto animate-fade-in ${
              t.type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : t.type === 'error' 
                  ? 'bg-rose-600 text-white border-rose-500' 
                  : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

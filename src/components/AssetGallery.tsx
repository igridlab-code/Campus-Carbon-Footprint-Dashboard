import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Maximize2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  Star,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CampusAsset } from '../types';

interface AssetGalleryProps {
  asset: CampusAsset;
  isAdmin?: boolean;
  token?: string;
  onAssetsChanged?: () => void;
}

export default function AssetGallery({ asset, isAdmin = false, token, onAssetsChanged }: AssetGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [galleryError, setGalleryError] = useState('');

  // Lightbox View Settings
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);

  const galleryImages = asset.galleryUrls || [];

  // Submit new image to gallery
  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;

    setIsSubmitting(true);
    setGalleryError('');

    try {
      const updatedGallery = [...galleryImages, newImageUrl.trim()];
      
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          galleryUrls: updatedGallery
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to insert image.');
      }

      setNewImageUrl('');
      if (onAssetsChanged) onAssetsChanged();
    } catch (err: any) {
      console.error(err);
      setGalleryError(err.message || 'Error updating asset gallery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove image from gallery
  const handleDeleteImage = async (indexToDelete: number) => {
    if (!window.confirm('Are you sure you want to delete this image from the gallery?')) return;
    
    setIsSubmitting(true);
    try {
      const updatedGallery = galleryImages.filter((_, idx) => idx !== indexToDelete);
      
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          galleryUrls: updatedGallery
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update gallery in database.');
      }

      if (onAssetsChanged) onAssetsChanged();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete image: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set image as primary thumbnail
  const handleSetAsThumbnail = async (url: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          thumbnailUrl: url
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update thumbnail in database.');
      }

      if (onAssetsChanged) onAssetsChanged();
    } catch (err: any) {
      console.error(err);
      alert('Failed to set thumbnail: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lightbox Navigation
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeImageIndex === null) return;
    setActiveImageIndex(activeImageIndex === 0 ? galleryImages.length - 1 : activeImageIndex - 1);
    setLightboxZoom(1);
    setLightboxRotation(0);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeImageIndex === null) return;
    setActiveImageIndex(activeImageIndex === galleryImages.length - 1 ? 0 : activeImageIndex + 1);
    setLightboxZoom(1);
    setLightboxRotation(0);
  };

  return (
    <div className="space-y-4" id={`asset-gallery-${asset.id}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider">
          <ImageIcon size={16} className="text-brand-primary" />
          Campus Gallery ({galleryImages.length})
        </h4>
      </div>

      {/* Admin Add Image form */}
      {isAdmin && (
        <form onSubmit={handleAddImage} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Add Gallery Image</div>
          <div className="flex gap-2">
            <input
              type="url"
              required
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Paste photo URL (e.g. https://images.unsplash.com/...)"
              className="flex-1 px-3 py-2 bg-white border border-slate-200 focus:border-brand-primary rounded-xl text-xs outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary-hover active:bg-brand-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add Image
            </button>
          </div>
          {galleryError && (
            <p className="text-[10px] font-mono text-rose-600 mt-1">{galleryError}</p>
          )}
          
          {/* Quick preset options */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[9px] text-slate-400 font-medium">Quick presets:</span>
            {[
              { label: 'Campus Block', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80' },
              { label: 'Modern Library', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80' },
              { label: 'Research Lab', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80' }
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setNewImageUrl(preset.url)}
                className="text-[9px] px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:text-brand-primary hover:border-brand-primary transition-all cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </form>
      )}

      {/* Gallery Grid */}
      {galleryImages.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
          <ImageIcon size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No gallery images registered yet.</p>
          {isAdmin && <p className="text-[10px] text-slate-400 mt-1">Use the panel above to add the first image!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {galleryImages.map((url, index) => {
            const isThumb = asset.thumbnailUrl === url;
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs cursor-pointer"
                onClick={() => setActiveImageIndex(index)}
              >
                <img 
                  src={url} 
                  alt={`${asset.name} gallery ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Primary Badge */}
                {isThumb && (
                  <div className="absolute top-1.5 left-1.5 bg-brand-primary text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5 shadow-sm">
                    <Star size={10} fill="currentColor" />
                    Thumbnail
                  </div>
                )}

                {/* Hover Quick Admin Buttons */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(index);
                    }}
                    className="p-1.5 bg-white hover:bg-slate-100 rounded-lg text-slate-700 shadow-sm transition-colors border-none cursor-pointer"
                    title="View Image"
                  >
                    <Maximize2 size={13} />
                  </button>
                  
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetAsThumbnail(url);
                        }}
                        disabled={isThumb}
                        className={`p-1.5 rounded-lg shadow-sm transition-colors border-none cursor-pointer ${
                          isThumb ? 'bg-slate-200 text-slate-400' : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                        title="Set as Main Thumbnail"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(index);
                        }}
                        className="p-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-white shadow-sm transition-colors border-none cursor-pointer"
                        title="Delete Image"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Slider Modal Overlay */}
      <AnimatePresence>
        {activeImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col justify-between p-4 md:p-6"
            onClick={() => setActiveImageIndex(null)}
          >
            {/* Header */}
            <div className="flex items-center justify-between text-white border-b border-white/10 pb-4">
              <div className="flex flex-col">
                <span className="text-xs text-brand-accent uppercase font-mono font-bold tracking-widest">{asset.name}</span>
                <span className="text-sm font-semibold mt-0.5">Image {activeImageIndex + 1} of {galleryImages.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxZoom(prev => Math.min(3, prev + 0.25));
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors border-none cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxZoom(prev => Math.max(0.5, prev - 0.25));
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors border-none cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxRotation(prev => (prev + 90) % 360);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors border-none cursor-pointer"
                  title="Rotate Right"
                >
                  <RotateCw size={15} />
                </button>
                <button
                  onClick={() => setActiveImageIndex(null)}
                  className="p-2 bg-rose-600 hover:bg-rose-700 rounded-xl text-white transition-colors border-none cursor-pointer"
                  title="Close Lightbox"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Stage */}
            <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
              {/* Prev Button */}
              <button
                onClick={handlePrev}
                className="absolute left-4 md:left-8 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border-none cursor-pointer"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Image Container */}
              <motion.div
                key={activeImageIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-h-[70vh] max-w-[85vw] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={galleryImages[activeImageIndex]}
                  alt="Lightbox representation"
                  referrerPolicy="no-referrer"
                  style={{
                    transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                    transition: 'transform 0.15s ease-out'
                  }}
                  className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-2xl select-none"
                />
              </motion.div>

              {/* Next Button */}
              <button
                onClick={handleNext}
                className="absolute right-4 md:right-8 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border-none cursor-pointer"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Footer thumbnails */}
            <div className="overflow-x-auto flex gap-2 justify-center py-2 shrink-0 max-w-full">
              {galleryImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(idx);
                    setLightboxZoom(1);
                    setLightboxRotation(0);
                  }}
                  className={`relative aspect-video h-10 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer ${
                    idx === activeImageIndex ? 'border-brand-accent scale-105 ring-2 ring-brand-accent/20' : 'border-white/10 opacity-60'
                  }`}
                >
                  <img src={url} alt="thumbnail scroll" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

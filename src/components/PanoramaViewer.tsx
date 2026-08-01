import React, { useEffect, useRef, useState } from 'react';
import { 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  Compass as CompassIcon,
  Play,
  Pause,
  HelpCircle,
  Loader2
} from 'lucide-react';

interface PanoramaViewerProps {
  imageSrc: string;
  title?: string;
  onClose?: () => void;
}

export default function PanoramaViewer({ imageSrc, title = 'Campus 360° View', onClose }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [showTutorial, setShowTutorial] = useState(true);

  // Panorama View State
  const stateRef = useRef({
    lon: 180,       // Horizontal angle (degrees, 0-360)
    lat: 0,         // Vertical angle (degrees, -45 to 45)
    zoom: 1.0,      // Zoom factor (0.5 to 2.5)
    isUserInteracting: false,
    onMouseDownMouseX: 0,
    onMouseDownMouseY: 0,
    onMouseDownLon: 0,
    onMouseDownLat: 0,
  });

  // Current view parameters exposed for UI
  const [currentLon, setCurrentLon] = useState(180);
  const [currentZoom, setCurrentZoom] = useState(1.0);

  // Initialize and load image
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    img.src = imageSrc;

    img.onload = () => {
      imgRef.current = img;
      setIsLoading(false);
      // Turn off tutorial hint after 5 seconds
      setTimeout(() => setShowTutorial(false), 5000);
    };

    img.onerror = () => {
      console.error('Failed to load panorama image:', imageSrc);
      setIsLoading(false);
      setHasError(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageSrc]);

  // Main Render Loop for the 360° projection
  useEffect(() => {
    if (isLoading || hasError || !imgRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const state = stateRef.current;

      // Apply auto-rotation if active and user is not dragging
      if (isAutoRotating && !state.isUserInteracting) {
        state.lon = (state.lon + 0.1) % 360;
        setCurrentLon(state.lon);
      }

      // Sync state to React for HUD
      if (state.isUserInteracting) {
        setCurrentLon(state.lon);
      }

      const img = imgRef.current!;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Perform Cylindrical Projection
      // The horizontal FOV is determined by zoom
      const fovX = 120 / state.zoom; 
      const fovY = (fovX * (h / w));

      // Map texture space to screen coordinates
      const srcW = img.width;
      const srcH = img.height;

      // Draw vertical slices
      const sliceCount = w;
      for (let x = 0; x < sliceCount; x++) {
        // Calculate the heading angle for this screen column
        const percentX = x / sliceCount;
        const angleOffset = (percentX - 0.5) * fovX;
        const targetAngle = (state.lon + angleOffset + 360) % 360;

        // Source column index in the panoramic image
        const sourceX = Math.floor((targetAngle / 360) * srcW);

        // Calculate pitch mapping for this column (accounting for tilt / lat)
        // Draw the slice
        const destX = x;
        
        // Horizontal stretch and vertical tilt calculations
        const tiltOffsetY = (state.lat / 90) * h * state.zoom;
        const sourceY = 0;
        const sourceHeight = srcH;

        // Scale factor for rendering height
        const viewHeight = h * state.zoom;
        const destY = (h - viewHeight) / 2 + tiltOffsetY;
        const destHeight = viewHeight;

        // Draw a single 1px column slice
        ctx.drawImage(
          img,
          sourceX, sourceY, 1, sourceHeight,
          destX, destY, 1, destHeight
        );
      }

      // Draw subtle grid/horizon lines or overlays
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    // Resize handler
    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Start loop
    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLoading, hasError, isAutoRotating]);

  // Mouse / Touch Handlers for Dragging
  const handlePointerDown = (clientX: number, clientY: number) => {
    const state = stateRef.current;
    state.isUserInteracting = true;
    state.onMouseDownMouseX = clientX;
    state.onMouseDownMouseY = clientY;
    state.onMouseDownLon = state.lon;
    state.onMouseDownLat = state.lat;
    setIsAutoRotating(false);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const state = stateRef.current;
    if (!state.isUserInteracting) return;

    // Adjust sensitivity based on zoom
    const sensitivity = 0.25 / state.zoom;
    const deltaX = clientX - state.onMouseDownMouseX;
    const deltaY = clientY - state.onMouseDownMouseY;

    state.lon = (state.onMouseDownLon - deltaX * sensitivity + 360) % 360;
    // Limit vertical viewing angle (tilt)
    state.lat = Math.max(-40, Math.min(40, state.onMouseDownLat + deltaY * sensitivity));
  };

  const handlePointerUp = () => {
    stateRef.current.isUserInteracting = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const state = stateRef.current;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    state.zoom = Math.max(0.6, Math.min(2.5, state.zoom + delta));
    setCurrentZoom(state.zoom);
  };

  // Click actions
  const adjustZoom = (amount: number) => {
    const state = stateRef.current;
    state.zoom = Math.max(0.6, Math.min(2.5, state.zoom + amount));
    setCurrentZoom(state.zoom);
  };

  const handleReset = () => {
    const state = stateRef.current;
    state.lon = 180;
    state.lat = 0;
    state.zoom = 1.0;
    setCurrentLon(180);
    setCurrentZoom(1.0);
    setIsAutoRotating(true);
  };

  // Fullscreen implementation
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        // Fallback for iframe constraints
        setIsFullscreen(!isFullscreen);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Convert longitude (0-360) to a cardinal direction (N, E, S, W)
  const getCardinalDirection = (angle: number) => {
    // 180 is center/North
    const adjustedAngle = (angle - 180 + 360) % 360;
    const directions = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
    const index = Math.round(adjustedAngle / 45) % 8;
    return directions[index];
  };

  return (
    <div 
      ref={containerRef}
      id="panorama-container"
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 transition-all shadow-xl select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'h-[420px] md:h-[500px]'
      }`}
    >
      {/* Title Header overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/50 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
        <span className="text-white text-xs font-semibold tracking-wide font-display">{title}</span>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl border border-slate-700/50 transition-all cursor-pointer"
          title="Exit Panorama"
        >
          <Minimize2 size={16} />
        </button>
      )}

      {/* Panorama Canvas Layer */}
      {!isLoading && !hasError && (
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => {
            if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-3">
          <Loader2 className="animate-spin text-brand-accent" size={32} />
          <span className="text-xs font-mono">Calibrating 360° Sensor Feeds...</span>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-rose-400 p-6 text-center gap-2">
          <HelpCircle size={36} className="text-rose-500 animate-bounce" />
          <h4 className="text-sm font-bold text-slate-100">Panorama Load Failed</h4>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Could not retrieve 360° visual data. Please verify the panorama URL configuration in Asset settings.
          </p>
        </div>
      )}

      {/* Bottom Control HUD */}
      {!isLoading && !hasError && (
        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-3 flex-wrap pointer-events-none">
          {/* Compass & Direction HUD */}
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/50 flex items-center gap-2.5 text-white pointer-events-auto shadow-lg shadow-black/20">
            <CompassIcon 
              size={16} 
              className="text-brand-accent transition-transform duration-75"
              style={{ transform: `rotate(${-currentLon}deg)` }}
            />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono">Heading</span>
              <span className="text-[11px] font-bold font-mono text-white flex items-center gap-1">
                {Math.round(currentLon)}° <span className="text-brand-accent font-sans">{getCardinalDirection(currentLon)}</span>
              </span>
            </div>
          </div>

          {/* Action Button Controls */}
          <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 shadow-lg shadow-black/20">
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border-none flex items-center justify-center ${
                isAutoRotating ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-white bg-transparent'
              }`}
              title={isAutoRotating ? 'Pause Auto-Rotation' : 'Resume Auto-Rotation'}
            >
              {isAutoRotating ? <Pause size={14} /> : <Play size={14} />}
            </button>

            <div className="h-4 w-[1px] bg-slate-700"></div>

            <button
              onClick={() => adjustZoom(0.25)}
              disabled={currentZoom >= 2.5}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer border-none flex items-center justify-center bg-transparent"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => adjustZoom(-0.25)}
              disabled={currentZoom <= 0.6}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer border-none flex items-center justify-center bg-transparent"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer border-none flex items-center justify-center bg-transparent"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-700"></div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer border-none flex items-center justify-center bg-transparent"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Drag & Pan Help Tutorial Indicator */}
      {showTutorial && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-slate-950/20 backdrop-blur-xs transition-opacity duration-500">
          <div className="bg-slate-900/90 text-white px-5 py-3 rounded-2xl border border-slate-700/50 flex flex-col items-center gap-1.5 max-w-xs text-center shadow-2xl">
            <CompassIcon className="text-brand-accent animate-spin" size={24} style={{ animationDuration: '6s' }} />
            <h5 className="text-xs font-bold font-display">Interactive 360° View</h5>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Drag on the screen or use your finger to explore the campus environment. Scroll or pinch to zoom.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

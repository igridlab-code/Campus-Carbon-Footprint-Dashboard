import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { 
  Building2, 
  MapPin, 
  Leaf, 
  Cpu, 
  Droplet, 
  Trash2, 
  SlidersHorizontal,
  Info,
  Navigation,
  Compass,
  Layers,
  Search,
  Locate,
  Map as MapIcon,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CampusAsset, InstitutionName, AssetCategory } from '../types';

interface CampusMapProps {
  assets: CampusAsset[];
  setActiveTab: (tab: string) => void;
  setQuickReportLocation: (location: string) => void;
  onOpenStreetView?: (asset: CampusAsset) => void;
}

// HTML entity escaping to prevent XSS in Leaflet popup innerHTML
const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
};

export default function CampusMap({ assets, setActiveTab, setQuickReportLocation, onOpenStreetView }: CampusMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const tileLayersRef = useRef<{ [key: string]: L.TileLayer | L.LayerGroup }>({});
  const routingControlRef = useRef<any>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  
  // Custom states
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapLayer, setMapLayer] = useState<'satellite' | 'hybrid' | 'osm'>('satellite');
  
  // GPS user location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  // Navigation
  const [navStart, setNavStart] = useState<string>(''); // 'gps' or asset id
  const [navEnd, setNavEnd] = useState<string>(''); // asset id
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationInstructions, setNavigationInstructions] = useState<any[]>([]);

  const [hoveredAsset, setHoveredAsset] = useState<CampusAsset | null>(null);

  // Filter lists
  const categories = ['All', 'Administrative', 'Academic', 'Amenities', 'Utility', 'Medical', 'Agriculture'];
  const institutions = [
    'All', 
    'Engineering', 
    'Arts & Science', 
    'Nursing', 
    'Medical', 
    'Transport', 
    'Agriculture', 
    'Common Facilities'
  ];

  // Search and filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if ((asset.status || 'Active') !== 'Active') return false;
      const matchesCategory = selectedCategory === 'All' || asset.category === selectedCategory;
      const matchesInstitution = selectedInstitution === 'All' || asset.institution === selectedInstitution;
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            asset.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesInstitution && matchesSearch;
    });
  }, [assets, selectedCategory, selectedInstitution, searchQuery]);

  // Color Mapping by Status & Score (Carbon Design Language Palette)
  const getMarkerStatusColor = (score: number) => {
    if (score >= 90) return '#0B8A5A'; // Deep Pine (Excellent)
    if (score >= 80) return '#18B26B'; // Forest Emerald (Good)
    if (score >= 70) return '#FFB547'; // Solar Amber (Average)
    if (score >= 60) return '#FF8A00'; // Warning Orange (Warning)
    return '#FF5D73';                  // Coral Red (Critical)
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Administrative': return '#0EA5E9'; // Sky Blue
      case 'Academic': return '#0284C7';       // Water Blue
      case 'Amenities': return '#FBBF24';      // Solar Yellow
      case 'Utility': return '#8B5E3C';        // Earth Brown
      case 'Medical': return '#DC2626';        // Danger Red
      case 'Agriculture': return '#166534';    // Primary Forest Green
      default: return '#10B981';               // Accent Mint
    }
  };

  // Quick Action: report issue
  const handleQuickReport = (assetName: string) => {
    setQuickReportLocation(assetName);
    setActiveTab('reports');
  };

  // GPS Locate me trigger
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        const { latitude, longitude } = position.coords;
        const coords: [number, number] = [latitude, longitude];
        setUserLocation(coords);
        
        if (mapRef.current) {
          mapRef.current.setView(coords, 18);
          
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(coords);
          } else {
            const userIcon = L.divIcon({
              html: `
                <div class="relative flex items-center justify-center h-10 w-10">
                  <div class="absolute h-6 w-6 rounded-full bg-blue-600/30 animate-ping"></div>
                  <div class="absolute h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
                </div>
              `,
              className: 'user-gps-marker',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });
            userMarkerRef.current = L.marker(coords, { icon: userIcon })
              .addTo(mapRef.current)
              .bindPopup('<div class="font-sans text-xs font-semibold p-1">Your GPS Location</div>')
              .openPopup();
          }
        }
      },
      (error) => {
        setGpsLoading(false);
        console.error('GPS tracking error:', error);
        alert('Could not lock your GPS coordinates. Please ensure browser frame geolocation permissions are allowed.');
      },
      { enableHighAccuracy: true }
    );
  };

  // Setup Routing Control
  const handleRouteDirections = () => {
    if (!mapRef.current) return;

    let startCoords: [number, number] | null = null;
    let endCoords: [number, number] | null = null;

    // Resolve Start Coords
    if (navStart === 'gps') {
      if (!userLocation) {
        alert('Please lock your GPS location first using the Locate button.');
        return;
      }
      startCoords = userLocation;
    } else {
      const startAsset = assets.find(a => a.id === navStart);
      if (startAsset) {
        startCoords = startAsset.coordinate;
      }
    }

    // Resolve End Coords
    const endAsset = assets.find(a => a.id === navEnd);
    if (endAsset) {
      endCoords = endAsset.coordinate;
    }

    if (!startCoords || !endCoords) {
      alert('Please select valid start and end positions to navigate.');
      return;
    }

    // Clear old route
    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    try {
      const routingControl = (L as any).Routing.control({
        waypoints: [
          L.latLng(startCoords[0], startCoords[1]),
          L.latLng(endCoords[0], endCoords[1])
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false, // We will show instructions in our clean custom sidebar rather than the ugly default box
        lineOptions: {
          styles: [
            { color: '#10b981', weight: 6, opacity: 0.85 } // Sustainability green route line!
          ]
        },
        createMarker: () => null // Hide routing machine flags (we have custom building/GPS markers)
      }).addTo(mapRef.current);

      routingControl.on('routesfound', (e: any) => {
        const routes = e.routes;
        if (routes && routes[0]) {
          setNavigationInstructions(routes[0].instructions || []);
        }
      });

      routingControlRef.current = routingControl;
      setIsNavigating(true);
    } catch (err) {
      console.error('Leaflet routing setup failed:', err);
    }
  };

  const handleClearRoute = () => {
    if (mapRef.current && routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    setIsNavigating(false);
    setNavigationInstructions([]);
    setNavStart('');
    setNavEnd('');
  };

  // Render Map and Update Markers
  useEffect(() => {
    // 1. Initialize map if not already done
    if (!mapRef.current) {
      const map = L.map('map-canvas', {
        center: [10.7405, 78.638],
        zoom: 17,
        zoomControl: false, // We will put a cleaner zoom control or use default layout
        attributionControl: false
      });

      // Add a clean zoom control in bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Define our three custom layers
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      });

      const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });

      const hybridSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
      const hybridLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
      const hybrid = L.layerGroup([hybridSat, hybridLabels]);

      tileLayersRef.current = { osm, satellite, hybrid };

      // Set default as Esri Satellite View per user requirement!
      satellite.addTo(map);
      mapRef.current = map;
    }

    const map = mapRef.current;

    // 2. Track active marker IDs to remove stale ones
    const currentAssetIds = new Set(filteredAssets.map(a => a.id));

    // Remove markers that are no longer in the filtered list
    Object.keys(markersRef.current).forEach(id => {
      if (!currentAssetIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // 3. Add or update markers based on current filters
    filteredAssets.forEach(asset => {
      const color = getMarkerStatusColor(asset.greenScore);
      
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center h-10 w-10 transition-all duration-300" id="marker-node-${asset.id}">
            <div class="relative h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-extrabold shadow-md cursor-pointer transition-all duration-300 hover:scale-110" style="background-color: ${color}">
              ${asset.greenScore}
            </div>
          </div>
        `,
        className: 'custom-campus-marker-wrapper',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const existingMarker = markersRef.current[asset.id];

      // Assemble popup layout with escaped user-controlled strings
      const safeName = escapeHtml(asset.name);
      const safeInstitution = escapeHtml(asset.institution);
      const safeDescription = escapeHtml(asset.description);
      const popupContent = `
        <div class="p-2 w-64 text-slate-700 dark:text-[#F5F7F5] font-sans">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-[#274237] pb-1.5 mb-2">
            <div>
              <h4 class="font-display font-bold text-sm text-slate-900 dark:text-[#F5F7F5]">${safeName}</h4>
              <span class="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-[#9FB8A7] border border-slate-200 dark:border-[#274237]">
                ${safeInstitution}
              </span>
            </div>
            <div class="flex flex-col items-center">
              <span class="font-bold text-base font-display" style="color: ${color}">${asset.greenScore}%</span>
              <span class="text-[8px] text-slate-400 dark:text-[#9FB8A7] font-mono">GREEN SCORE</span>
            </div>
          </div>
          
          <p class="text-[11px] text-slate-600 dark:text-[#9FB8A7] leading-relaxed mb-3">${safeDescription}</p>

          <div class="space-y-1.5 text-[11px] font-mono text-slate-600 dark:text-[#9FB8A7] border-t border-slate-100 dark:border-[#274237] pt-2 mb-3">
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Carbon Footprint:</span>
              <span class="font-semibold text-rose-600 font-bold">${asset.carbonFootprint || '0'} kg/day</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Carbon Absorption:</span>
              <span class="font-semibold text-[#166534] dark:text-[#22C55E] font-bold">${asset.annualCarbonAbsorption || 0} kg/yr</span>
            </div>
            <div class="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-[#274237] pt-1 mt-1">
              <span class="text-slate-500 font-bold">Net Carbon Balance:</span>
              <span class="font-bold ${((asset.carbonFootprint || 0) * 365 - (asset.annualCarbonAbsorption || 0)) <= 0 ? 'text-[#166534] dark:text-[#22C55E]' : 'text-amber-600'}">
                ${((asset.carbonFootprint || 0) * 365 - (asset.annualCarbonAbsorption || 0)).toFixed(1)} kg CO₂/yr
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Energy Load:</span>
              <span class="font-semibold text-slate-800 dark:text-[#F5F7F5]">${asset.energyUsage} kWh/day</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Water Demand:</span>
              <span class="font-semibold text-slate-800 dark:text-[#F5F7F5]">${asset.waterUsage.toLocaleString()} L/day</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Waste Produced:</span>
              <span class="font-semibold text-slate-800 dark:text-[#F5F7F5]">${asset.wasteGenerated} kg/day</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-2">
            <button 
              id="popup-btn-report-${asset.id}" 
              class="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-[#F5F7F5] font-sans font-bold text-[10px] cursor-pointer transition-all border-none"
            >
              Report Issue
            </button>
            <button 
              id="popup-btn-tour-${asset.id}" 
              class="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#166534] dark:bg-[#16A34A] text-white font-sans font-bold text-[10px] shadow-sm cursor-pointer transition-all border-none"
            >
              360° Tour
            </button>
          </div>
        </div>
      `;

      if (existingMarker) {
        const oldLatLng = existingMarker.getLatLng();
        // Compare with tolerance to avoid floating point issues
        if (Math.abs(oldLatLng.lat - asset.coordinate[0]) > 0.000001 || Math.abs(oldLatLng.lng - asset.coordinate[1]) > 0.000001) {
          existingMarker.setLatLng(asset.coordinate);
          map.setView(asset.coordinate, map.getZoom(), { animate: true, duration: 1 });
        }
        existingMarker.setIcon(customIcon);
        existingMarker.setPopupContent(popupContent);
      } else {
        const marker = L.marker(asset.coordinate, { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const reportBtn = document.getElementById(`popup-btn-report-${asset.id}`);
          if (reportBtn) {
            reportBtn.addEventListener('click', () => handleQuickReport(asset.name));
          }
          const tourBtn = document.getElementById(`popup-btn-tour-${asset.id}`);
          if (tourBtn && onOpenStreetView) {
            tourBtn.addEventListener('click', () => onOpenStreetView(asset));
          }
        });

        marker.on('mouseover', () => {
          setHoveredAsset(asset);
          const nodeEl = document.getElementById(`marker-node-${asset.id}`);
          if (nodeEl) nodeEl.classList.add('hovered-marker-ring');
        });

        marker.on('mouseout', () => {
          const nodeEl = document.getElementById(`marker-node-${asset.id}`);
          if (nodeEl) nodeEl.classList.remove('hovered-marker-ring');
        });

        markersRef.current[asset.id] = marker;
      }
    });

  }, [filteredAssets]);

  // Handle programmatically changing tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(tileLayersRef.current).forEach(layer => {
      map.removeLayer(layer);
    });

    const selected = tileLayersRef.current[mapLayer];
    if (selected) {
      selected.addTo(map);
    }
  }, [mapLayer]);

  // Quick Pan to specific asset location
  const panToAsset = (asset: CampusAsset) => {
    if (mapRef.current) {
      mapRef.current.setView(asset.coordinate, 18);
      const marker = markersRef.current[asset.id];
      if (marker) {
        marker.openPopup();
      }
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
      id="campus-map-root"
    >
      {/* Header Info */}
      <motion.div 
        variants={itemVariants} 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/75 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-[0_15px_30px_-5px_rgba(31,41,55,0.03)]"
      >
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-mono text-[10px] uppercase tracking-widest font-bold">
            <Sparkles size={12} className="animate-pulse" />
            <span>Interactive Digital Twin</span>
          </div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-slate-800 tracking-tight mt-1">Campus Spatial Twin</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">
            Real-time geospatial twin mapping the energy and water metrics of Indra Ganesan institutions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* GPS Locate Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLocateMe}
            disabled={gpsLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md border border-slate-200 hover:border-emerald-300 active:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Locate size={14} className={`text-emerald-500 ${gpsLoading ? 'animate-spin' : ''}`} />
            {gpsLoading ? 'Locking GPS...' : 'My Coordinates (GPS)'}
          </motion.button>
        </div>
      </motion.div>

      {/* Main Grid: Left sidebar panel / Right Leaflet map area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="map-grid">
        {/* Sidebar Filters & Navigation */}
        <div className="lg:col-span-1 space-y-4 flex flex-col h-[650px] overflow-y-auto pr-1" id="map-controls">
          
          {/* Building Search & Filters */}
          <motion.div 
            variants={itemVariants}
            className="glass-card rounded-3xl p-5 space-y-4 shadow-md"
          >
            <h3 className="font-display font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-emerald-500" />
              Twin Filters
            </h3>

            {/* Building Search input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search telemetry block..."
                className="w-full pl-9 pr-4 py-2 bg-white/60 border border-slate-200 focus:border-emerald-500 rounded-2xl text-slate-700 text-xs font-sans outline-none hover:border-slate-300 transition-all"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white/60 border border-slate-200 rounded-2xl text-slate-700 text-xs font-sans outline-none hover:border-slate-300 focus:border-emerald-500 transition-all cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Institution Select */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Institution</label>
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full px-3 py-2 bg-white/60 border border-slate-200 rounded-2xl text-slate-700 text-xs font-sans outline-none hover:border-slate-300 focus:border-emerald-500 transition-all cursor-pointer"
              >
                {institutions.map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
            </div>
          </motion.div>

          {/* Campus Waypoint Navigation Engine */}
          <motion.div 
            variants={itemVariants}
            className="glass-card rounded-3xl p-5 space-y-3 shadow-md"
          >
            <h3 className="font-display font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Navigation size={15} className="text-emerald-500" />
              Campus Navigator
            </h3>
            
            <div className="space-y-2">
              {/* Start Point */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Start Location</label>
                <select
                  value={navStart}
                  onChange={(e) => setNavStart(e.target.value)}
                  className="w-full px-3 py-2 bg-white/60 border border-slate-200 rounded-2xl text-slate-700 text-xs font-sans outline-none hover:border-slate-300 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="">-- Choose Start Node --</option>
                  {userLocation && <option value="gps">📌 My Locked GPS Location</option>}
                  {assets.filter(a => (a.status || 'Active') === 'Active').map(asset => (
                    <option key={`start-${asset.id}`} value={asset.id}>{asset.name}</option>
                  ))}
                </select>
              </div>

              {/* End Point */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Destination</label>
                <select
                  value={navEnd}
                  onChange={(e) => setNavEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-white/60 border border-slate-200 rounded-2xl text-slate-700 text-xs font-sans outline-none hover:border-slate-300 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="">-- Choose Destination --</option>
                  {assets.filter(a => (a.status || 'Active') === 'Active').map(asset => (
                    <option key={`end-${asset.id}`} value={asset.id}>{asset.name}</option>
                  ))}
                </select>
              </div>

              {/* Routing Buttons */}
              <div className="pt-1 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRouteDirections}
                  className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none"
                >
                  <Sparkles size={13} />
                  Get Route
                </motion.button>
                {isNavigating && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClearRoute}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center border-none"
                    title="Clear Route"
                  >
                    <X size={14} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Active Directions list */}
            {isNavigating && navigationInstructions.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2 max-h-[140px] overflow-y-auto">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">Step Instructions</span>
                <ol className="space-y-2 list-decimal list-inside text-[11px] text-slate-650 leading-normal pl-1 font-medium">
                  {navigationInstructions.map((inst, index) => (
                    <li key={`step-${index}`} className="line-clamp-2">
                      {inst.text} <span className="text-slate-400 font-mono">({Math.round(inst.distance)}m)</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </motion.div>

          {/* Scrolling Assets List */}
          <motion.div 
            variants={itemVariants}
            className="glass-card rounded-3xl p-5 flex-1 flex flex-col min-h-[200px] shadow-md"
          >
            <h4 className="font-display font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Telemetry Nodes ({filteredAssets.length})</span>
            </h4>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="nodes-scroller">
              {filteredAssets.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No matching nodes active.
                </div>
              ) : (
                filteredAssets.map(asset => {
                  const catColor = getCategoryColor(asset.category);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => panToAsset(asset)}
                      className="w-full text-left p-2.5 rounded-2xl bg-white/40 border border-slate-200/80 hover:border-emerald-300 active:bg-white/80 flex items-center justify-between gap-3 group transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="overflow-hidden">
                        <span className="font-bold text-slate-750 text-xs block truncate group-hover:text-emerald-600 transition-colors">
                          {asset.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-extrabold">
                          {asset.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-mono font-bold" style={{ color: catColor }}>
                          {asset.greenScore}%
                        </span>
                        <MapPin size={12} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        {/* Live Leaflet Map Canvas Container */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-3 flex flex-col h-[650px] bg-white border border-slate-200/50 rounded-3xl overflow-hidden relative shadow-md" 
          id="map-canvas-container"
        >
          
          {/* Custom Elegant Layer Switcher & Map Overlay info */}
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-sm px-3.5 py-2 rounded-2xl text-[10px] text-slate-600 flex items-center gap-2 font-mono font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            Mapping Layer: <span className="font-black text-emerald-600 uppercase">{mapLayer === 'osm' ? 'OpenStreetMap' : mapLayer === 'satellite' ? 'Esri Satellite' : 'Hybrid Satellite'}</span>
          </div>

          {/* Premium Custom Map Layer Selector (Blue-Green Academic styling) */}
          <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-lg p-1.5 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setMapLayer('satellite')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border-none ${mapLayer === 'satellite' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Compass size={12} />
              Satellite
            </button>
            <button
              onClick={() => setMapLayer('hybrid')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border-none ${mapLayer === 'hybrid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Layers size={12} />
              Hybrid
            </button>
            <button
              onClick={() => setMapLayer('osm')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border-none ${mapLayer === 'osm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <MapIcon size={12} />
              Vector
            </button>
          </div>

          {/* Leaflet canvas element */}
          <div id="map-canvas" className="w-full flex-1 z-0"></div>

          {/* Hover Status Footnote */}
          {hoveredAsset ? (
            <div className="bg-slate-50 border-t border-slate-200/60 px-4 py-3 flex items-center justify-between gap-4 animate-fade-in z-10">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${getCategoryColor(hoveredAsset.category)}15`, color: getCategoryColor(hoveredAsset.category) }}>
                  <Info size={14} />
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 text-xs">{hoveredAsset.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-2 font-bold">[{hoveredAsset.coordinate.join(', ')}]</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-500 text-[11px] font-mono font-bold">
                <span className="flex items-center gap-1 text-emerald-600"><Leaf size={12} /> {hoveredAsset.carbonFootprint || 'TBD'} kg CO₂</span>
                <span className="flex items-center gap-1 text-slate-700"><Cpu size={12} /> {hoveredAsset.energyUsage} kWh</span>
                <span className="flex items-center gap-1 text-slate-700"><Droplet size={12} /> {hoveredAsset.waterUsage} L</span>
                <span className="flex items-center gap-1 text-emerald-600"><Trash2 size={12} /> {hoveredAsset.wasteGenerated} kg</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/60 border-t border-slate-200/60 px-4 py-3 text-slate-400 text-xs font-sans text-center z-10 font-medium">
              Hover over telemetry nodes on the map to inspect real-time metrics dynamically.
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Activity, 
  ShieldAlert, 
  MapPin, 
  Zap, 
  Droplet, 
  Trash, 
  RotateCcw,
  BarChart4,
  XCircle,
  Upload,
  Image,
  Eye,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CampusAsset, AssetCategory, InstitutionName } from '../types';
import StreetViewModal from './StreetViewModal';

const isElectricalCategory = (category: string): boolean => {
  const electricalTypes = [
    'Air Conditioner', 'Air Conditioners',
    'Ceiling Fan', 'Ceiling Fans',
    'LED Light', 'LED Lights',
    'Tube Light', 'Tube Lights',
    'Computer', 'Computers',
    'Laptop', 'Laptops',
    'Projector', 'Projectors',
    'Printer', 'Printers',
    'CCTV Camera', 'CCTV Cameras',
    'Wi-Fi Router', 'Wi-Fi Routers',
    'Water Pump', 'Water Pumps',
    'Solar Panel', 'Solar Panels',
    'Battery', 'Batteries',
    'UPS', 'UPS Systems',
    'Street Light', 'Street Lights'
  ];
  return electricalTypes.includes(category);
};

const isTransportCategory = (category: string): boolean => {
  const transportTypes = [
    'Electric Vehicle', 'Electric Vehicles',
    'Diesel Vehicle', 'Diesel Vehicles',
    'College Bus', 'College Buses'
  ];
  return transportTypes.includes(category);
};

interface AssetManagementProps {
  token: string | null;
  assets: CampusAsset[];
  onAssetsChanged: () => void;
}

export default function AssetManagement({ token, assets, onAssetsChanged }: AssetManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [institutionFilter, setInstitutionFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CampusAsset | null>(null);
  const [activePreviewAsset, setActivePreviewAsset] = useState<CampusAsset | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  // Safe iframe-compatible modal states
  const [assetToDelete, setAssetToDelete] = useState<CampusAsset | null>(null);
  const [customAlertMsg, setCustomAlertMsg] = useState<string | null>(null);

  // Custom Toasts State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Form Field States
  const [formName, setFormName] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingPano, setUploadingPano] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'thumbnail' | 'panorama' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file || !editingAsset) return;

    // Validate type on client side too
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      addToast('Only jpg, jpeg, png, and webp formats are accepted.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    if (type === 'thumbnail') setUploadingThumb(true);
    if (type === 'panorama') setUploadingPano(true);
    if (type === 'gallery') setUploadingGallery(true);

    try {
      const res = await fetch(`/api/assets/${editingAsset.id}/upload/${type}`, {
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
      addToast(`Asset ${type} uploaded successfully!`, 'success');
      
      onAssetsChanged();
      
      if (data.asset) {
        setEditingAsset(data.asset);
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || `Failed to upload ${type}`, 'error');
    } finally {
      if (type === 'thumbnail') setUploadingThumb(false);
      if (type === 'panorama') setUploadingPano(false);
      if (type === 'gallery') setUploadingGallery(false);
    }
  };

  const handleDeletePanorama = async () => {
    if (!editingAsset) return;
    if (!window.confirm('Are you sure you want to delete this custom 360° Panorama?')) return;

    try {
      const res = await fetch(`/api/assets/${editingAsset.id}`, {
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

      addToast('Custom panorama deleted.', 'success');
      onAssetsChanged();
      // Update editing asset state
      setEditingAsset(prev => prev ? { ...prev, panoramaUrl: '', panorama: '' } : null);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error deleting panorama.', 'error');
    }
  };
  const [formCategory, setFormCategory] = useState<AssetCategory>('Trees');
  const [formInstitution, setFormInstitution] = useState<InstitutionName>('Engineering');
  const [formDescription, setFormDescription] = useState('');
  const [formLat, setFormLat] = useState('10.7400');
  const [formLng, setFormLng] = useState('78.6380');
  const [formEnergy, setFormEnergy] = useState('0');
  const [formWater, setFormWater] = useState('0');
  const [formWaste, setFormWaste] = useState('0');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'Maintenance'>('Active');

  // Custom asset fields
  const [formQuantity, setFormQuantity] = useState('1');
  const [formLocationBlock, setFormLocationBlock] = useState('');
  const [formPowerRating, setFormPowerRating] = useState('0');
  const [formUsageHours, setFormUsageHours] = useState('8');
  const [formFuelConsumption, setFormFuelConsumption] = useState('0');
  const [formTreeSpecies, setFormTreeSpecies] = useState('');
  const [formCarbonAbsorptionRate, setFormCarbonAbsorptionRate] = useState('21');

  // Categories list
  const categories: AssetCategory[] = [
    'Trees',
    'Plants',
    'Garden Area',
    'Lawn',
    'Buildings',
    'Classrooms',
    'Laboratories',
    'Building',
    'Classroom',
    'Laboratory',
    'Air Conditioners',
    'Ceiling Fans',
    'Computers',
    'Laptops',
    'Projectors',
    'Printers',
    'CCTV Cameras',
    'Street Lights',
    'Water Pumps',
    'Solar Panels',
    'Electric Vehicles',
    'Diesel Vehicles',
    'Generators',
    'Batteries',
    'UPS Systems',
    'Air Conditioner',
    'Ceiling Fan',
    'LED Light',
    'Tube Light',
    'Computer',
    'Laptop',
    'Projector',
    'Printer',
    'CCTV Camera',
    'Wi-Fi Router',
    'Water Pump',
    'Solar Panel',
    'Battery',
    'UPS',
    'Street Light',
    'Electric Vehicle',
    'Diesel Vehicle',
    'College Bus',
    'Academic', 
    'Healthcare', 
    'Administration', 
    'Food Services', 
    'Transport', 
    'Green Zone', 
    'Sports', 
    'Infrastructure',
    'Administrative', 
    'Amenities', 
    'Utility', 
    'Medical', 
    'Agriculture'
  ];

  // Institutions list
  const institutions: InstitutionName[] = [
    'Engineering', 
    'Arts & Science', 
    'Nursing', 
    'Medical', 
    'Transport', 
    'Agriculture', 
    'Common Facilities'
  ];

  // Statistics
  const statistics = useMemo(() => {
    const total = assets.length;
    const active = assets.filter(a => (a.status || 'Active') === 'Active').length;
    const inactive = total - active;
    
    let sumGreenScore = 0;
    let activeWithScore = 0;
    let highestCarbon: CampusAsset | null = null;

    assets.forEach(a => {
      const isAct = (a.status || 'Active') === 'Active';
      if (isAct) {
        sumGreenScore += a.greenScore || 0;
        activeWithScore++;
      }
      if (!highestCarbon || (a.carbonFootprint || 0) > (highestCarbon.carbonFootprint || 0)) {
        highestCarbon = a;
      }
    });

    const avgGreen = activeWithScore > 0 ? Math.round(sumGreenScore / activeWithScore) : 0;

    return { total, active, inactive, avgGreen, highestCarbon };
  }, [assets]);

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingAsset(null);
    setFormName('');
    setFormCategory('Trees');
    setFormInstitution('Engineering');
    setFormDescription('');
    setFormLat('10.7400');
    setFormLng('78.6380');
    setFormEnergy('0');
    setFormWater('0');
    setFormWaste('0');
    setFormStatus('Active');
    setFormQuantity('1');
    setFormLocationBlock('');
    setFormPowerRating('0');
    setFormUsageHours('0');
    setFormFuelConsumption('0');
    setFormTreeSpecies('');
    setFormCarbonAbsorptionRate('21');
    setErrorMsg('');
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (asset: CampusAsset) => {
    setEditingAsset(asset);
    setFormName(asset.name);
    setFormCategory(asset.category);
    setFormInstitution(asset.institution);
    setFormDescription(asset.description);
    setFormLat(asset.coordinate ? String(asset.coordinate[0]) : '10.7400');
    setFormLng(asset.coordinate ? String(asset.coordinate[1]) : '78.6380');
    setFormEnergy(String(asset.energyUsage || 0));
    setFormWater(String(asset.waterUsage || 0));
    setFormWaste(String(asset.wasteGenerated || 0));
    setFormStatus(asset.status || 'Active');
    setFormQuantity(String(asset.quantity || 1));
    setFormLocationBlock(asset.locationBlock || '');
    setFormPowerRating(String(asset.powerRating || 0));
    setFormUsageHours(String(asset.usageHours || 0));
    setFormFuelConsumption(String(asset.fuelConsumption || 0));
    setFormTreeSpecies(asset.treeSpecies || '');
    setFormCarbonAbsorptionRate(String(asset.carbonAbsorptionRate !== undefined ? asset.carbonAbsorptionRate : (asset.category === 'Trees' ? 21 : 0)));
    setErrorMsg('');
    setShowModal(true);
  };

  // Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDescription.trim()) {
      setErrorMsg('Name and description are required.');
      return;
    }

    const latVal = parseFloat(formLat);
    const lngVal = parseFloat(formLng);
    if (isNaN(latVal) || isNaN(lngVal)) {
      setErrorMsg('Invalid latitude or longitude.');
      return;
    }

    // Validate Quantity: Required, positive integer, minimum value = 1
    const qtyVal = Number(formQuantity);
    if (!formQuantity || isNaN(qtyVal) || !Number.isInteger(qtyVal) || qtyVal < 1) {
      setErrorMsg('Quantity is required and must be a positive integer greater than or equal to 1.');
      return;
    }

    const isElect = isElectricalCategory(formCategory);
    const isTrans = isTransportCategory(formCategory);

    // Validate Average Daily Usage Hours: decimal, range 0 to 24
    const usageHoursNum = Number(formUsageHours);
    if (isElect || isTrans) {
      if (formUsageHours === '' || isNaN(usageHoursNum) || usageHoursNum < 0 || usageHoursNum > 24) {
        setErrorMsg('Average Daily Usage Hours is required for electrical and transport assets, and must be between 0 and 24.');
        return;
      }
    } else {
      if (formUsageHours !== '' && (isNaN(usageHoursNum) || usageHoursNum < 0 || usageHoursNum > 24)) {
        setErrorMsg('Average Daily Usage Hours must be between 0 and 24.');
        return;
      }
    }

    // Validate Power Rating: Required only for electrical assets
    const powerRatingNum = Number(formPowerRating);
    if (isElect) {
      if (formPowerRating === '' || isNaN(powerRatingNum) || powerRatingNum <= 0) {
        setErrorMsg('Power Rating (Watts) is required for electrical assets and must be greater than 0.');
        return;
      }
    } else {
      if (formPowerRating !== '' && (isNaN(powerRatingNum) || powerRatingNum < 0)) {
        setErrorMsg('Power Rating (Watts) must be 0 or more.');
        return;
      }
    }

    setSubmitLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        institution: formInstitution,
        description: formDescription.trim(),
        coordinate: [latVal, lngVal],
        energyUsage: Number(formEnergy) || 0,
        waterUsage: Number(formWater) || 0,
        wasteGenerated: Number(formWaste) || 0,
        status: formStatus,
        quantity: qtyVal,
        locationBlock: formLocationBlock.trim(),
        powerRating: isElect ? powerRatingNum : (formPowerRating === '' ? 0 : powerRatingNum),
        usageHours: (isElect || isTrans) ? usageHoursNum : (formUsageHours === '' ? 0 : usageHoursNum),
        fuelConsumption: Number(formFuelConsumption) || 0,
        treeSpecies: formTreeSpecies.trim(),
        carbonAbsorptionRate: Number(formCarbonAbsorptionRate) || 0
      };

      const url = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      const method = editingAsset ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Operation failed.');
      }

      onAssetsChanged();
      setShowModal(false);
      addToast(editingAsset ? 'Asset modifications applied successfully.' : 'New campus asset registered successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to save asset.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Toggle/Restore Status handler
  const handleToggleStatus = async (asset: CampusAsset) => {
    try {
      const nextStatus = (asset.status || 'Active') === 'Active' ? 'Inactive' : 'Active';
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to toggle status.');
      }

      addToast(`Asset "${asset.name}" status set to ${nextStatus}.`, 'success');
      onAssetsChanged();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error toggling asset status', 'error');
    }
  };

  // Soft Delete Handler
  const handleDeleteAsset = (asset: CampusAsset) => {
    setAssetToDelete(asset);
  };

  const handleConfirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    const targetId = assetToDelete.id;
    const targetName = assetToDelete.name;
    try {
      const res = await fetch(`/api/assets/${targetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete asset.');
      }

      addToast(`Asset "${targetName}" has been successfully deleted.`, 'success');
      onAssetsChanged();
      setAssetToDelete(null);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error deleting asset', 'error');
    }
  };

  // Filter & Search Logic
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            asset.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || asset.category === categoryFilter;
      const matchesInstitution = !institutionFilter || asset.institution === institutionFilter;
      
      const assetStatus = asset.status || 'Active';
      const matchesStatus = statusFilter === 'All' || assetStatus === statusFilter;

      return matchesSearch && matchesCategory && matchesInstitution && matchesStatus;
    });
  }, [assets, searchQuery, categoryFilter, institutionFilter, statusFilter]);

  return (
    <div className="space-y-6 relative" id="asset-management-module">
      
      {/* Toast Notification HUD */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold border pointer-events-auto ${
                toast.type === 'error'
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : toast.type === 'info'
                  ? 'bg-blue-50 border-blue-100 text-blue-800'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}
            >
              <div className="shrink-0">
                {toast.type === 'error' ? (
                  <XCircle size={18} className="text-rose-600 animate-pulse" />
                ) : toast.type === 'info' ? (
                  <AlertCircle size={18} className="text-blue-600" />
                ) : (
                  <CheckCircle size={18} className="text-emerald-600" />
                )}
              </div>
              <p className="flex-1 leading-normal">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-slate-900 text-2xl tracking-tight flex items-center gap-2">
            <Building2 className="text-emerald-600" size={26} />
            Asset Management
          </h1>
          <p className="text-xs text-slate-500">Configure, audit, and provision campus assets for the digital twin simulation.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/10 cursor-pointer border-none transition-all"
        >
          <Plus size={16} />
          Provision New Asset
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="asset-stats-row">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Total Assets</span>
          <span className="text-2xl font-bold font-display text-slate-900 block mt-1">{statistics.total}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 block">Active Twins</span>
          <span className="text-2xl font-bold font-display text-emerald-600 block mt-1">{statistics.active}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-mono tracking-wider text-rose-600 block">Soft-Deleted</span>
          <span className="text-2xl font-bold font-display text-rose-600 block mt-1">{statistics.inactive}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] uppercase font-mono tracking-wider text-blue-600 block">Avg Green Score</span>
          <span className="text-2xl font-bold font-display text-blue-600 block mt-1">{statistics.avgGreen} <span className="text-xs font-normal">/100</span></span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-amber-600 block">Max Carbon Load</span>
          <span className="text-sm font-semibold text-slate-800 truncate block mt-1" title={statistics.highestCarbon?.name || 'N/A'}>
            {statistics.highestCarbon?.name || 'N/A'}
          </span>
          {statistics.highestCarbon && (
            <span className="text-[10px] font-mono text-slate-500 block">{Math.round(statistics.highestCarbon.carbonFootprint || 0)} kg CO₂</span>
          )}
        </div>
      </div>

      {/* Search and Filters panel */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="flex items-center gap-2.5 px-4 h-[38px] bg-slate-50 border border-slate-200 focus-within:border-blue-500 rounded-xl transition-all w-full md:flex-1">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-transparent border-none outline-none text-slate-800 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Twins</option>
            <option value="Inactive">Soft-Deleted</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Institution Filter */}
          <select
            value={institutionFilter}
            onChange={(e) => setInstitutionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none"
          >
            <option value="">All Institutions</option>
            {institutions.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assets Listing Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-150 bg-slate-50 text-[10px] uppercase font-mono tracking-wider text-slate-500">
                <th className="p-4 font-semibold">Asset / Info</th>
                <th className="p-4 font-semibold">Location (Lat, Lng)</th>
                <th className="p-4 font-semibold">Asset Details</th>
                <th className="p-4 font-semibold text-center">Green Score</th>
                <th className="p-4 font-semibold">Carbon Footprint</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-mono">
                    No campus assets matching the filter conditions.
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => {
                  const isActive = (asset.status || 'Active') === 'Active';
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 text-sm">{asset.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[9px] font-mono">
                            {asset.category}
                          </span>
                          <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded text-[9px] font-mono">
                            {asset.institution}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-xs truncate" title={asset.description}>
                          {asset.description}
                        </div>
                      </td>

                      <td className="p-4 font-mono text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{asset.coordinate ? `${asset.coordinate[0].toFixed(5)}, ${asset.coordinate[1].toFixed(5)}` : 'N/A'}</span>
                        </div>
                      </td>

                      <td className="p-4 space-y-0.5 font-mono text-[10px] text-slate-500">
                        <div><span className="text-slate-400 font-semibold uppercase">Qty:</span> {asset.quantity !== undefined ? asset.quantity : 1}</div>
                        {asset.locationBlock && <div><span className="text-slate-400 font-semibold uppercase">Block:</span> {asset.locationBlock}</div>}
                        {asset.category === 'Trees' && (
                          <>
                            {asset.treeSpecies && <div><span className="text-slate-400 font-semibold uppercase">Species:</span> {asset.treeSpecies}</div>}
                            <div><span className="text-slate-400 font-semibold uppercase">AbsRate:</span> {asset.carbonAbsorptionRate !== undefined ? asset.carbonAbsorptionRate : 21} kg/yr</div>
                          </>
                        )}
                        {['Diesel Vehicles', 'Generators'].includes(asset.category) && (
                          <div><span className="text-slate-400 font-semibold uppercase">Fuel:</span> {asset.fuelConsumption || 0} L/yr</div>
                        )}
                        {(isElectricalCategory(asset.category) || (asset.powerRating !== undefined && asset.powerRating > 0)) && (
                          <div><span className="text-slate-400 font-semibold uppercase">Power:</span> {asset.powerRating || 0}W</div>
                        )}
                        {(isElectricalCategory(asset.category) || isTransportCategory(asset.category) || (asset.usageHours !== undefined && asset.usageHours > 0)) && (
                          <div><span className="text-slate-400 font-semibold uppercase">Hours:</span> {asset.usageHours || 0}h/day</div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-xl font-bold font-mono text-xs ${
                          asset.greenScore >= 80 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                            : asset.greenScore >= 60 
                            ? 'bg-amber-50 text-amber-700 border border-amber-150' 
                            : 'bg-rose-50 text-rose-700 border border-rose-150'
                        }`}>
                          {asset.greenScore}
                        </span>
                      </td>

                      <td className="p-4 font-mono font-semibold text-slate-700">
                        {asset.carbonFootprint !== undefined ? (
                          <>
                            <span className={asset.carbonFootprint < 0 ? 'text-emerald-600' : ''}>
                              {asset.carbonFootprint < 0 ? '-' : ''}{Math.abs(Math.round(asset.carbonFootprint))}
                            </span>
                            <span className="text-[10px] font-normal text-slate-400"> kg CO₂/day</span>
                          </>
                        ) : 'N/A'}
                      </td>

                      <td className="p-4">
                        {asset.status === 'Maintenance' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-150">
                            <Activity size={10} className="animate-pulse" />
                            Maintenance
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-150">
                            <CheckCircle size={10} />
                            Active Twin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-150">
                            <ShieldAlert size={10} />
                            Soft-Deleted
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(asset)}
                            className="p-1.5 hover:text-blue-600 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                            title="Edit configuration details"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(asset)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer bg-transparent border-none ${
                              isActive 
                                ? 'hover:text-amber-600 hover:bg-amber-50 text-slate-400' 
                                : 'hover:text-emerald-600 hover:bg-emerald-50 text-slate-400'
                            }`}
                            title={isActive ? 'Deactivate twin' : 'Restore & Activate twin'}
                          >
                            {isActive ? <ShieldAlert size={13} /> : <RotateCcw size={13} />}
                          </button>

                          <button
                            onClick={() => handleDeleteAsset(asset)}
                            className="p-1.5 hover:text-rose-600 hover:bg-rose-50 text-slate-400 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                            title="Soft-delete asset"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisioning/Modification Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
              <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <Building2 className="text-emerald-600" size={20} />
                {editingAsset ? 'Configure Asset Twin' : 'Provision Asset Twin'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-950 transition-all cursor-pointer bg-transparent border-none"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs flex items-center gap-2 font-mono shrink-0">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Asset Name */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Asset Name*</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Mechanical Engineering Block"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                />
              </div>

              {/* Category & Institution */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Category*</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AssetCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Institution*</label>
                  <select
                    value={formInstitution}
                    onChange={(e) => setFormInstitution(e.target.value as InstitutionName)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  >
                    {institutions.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Description*</label>
                <textarea
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summarize structural design, green configurations, and utilization targets..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all resize-none"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Latitude*</label>
                  <input
                    type="text"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="e.g. 10.74123"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Longitude*</label>
                  <input
                    type="text"
                    required
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    placeholder="e.g. 78.63845"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              {/* Asset Specific Configuration */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                <BarChart4 size={14} className="text-slate-400" />
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-600">Asset Specifications & Twin Configuration</span>
              </div>

              {/* Status, Location / Block, Quantity (Applies to all) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block">Status*</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block">Location / Block*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Block A"
                    value={formLocationBlock}
                    onChange={(e) => setFormLocationBlock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block">Quantity*</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Categories Fields */}
              {formCategory === 'Trees' && (
                <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono tracking-wider text-emerald-800 block font-semibold">Tree Species</label>
                    <input
                      type="text"
                      placeholder="e.g. Neem, Banyan"
                      value={formTreeSpecies}
                      onChange={(e) => setFormTreeSpecies(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 focus:border-emerald-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono tracking-wider text-emerald-800 block font-semibold">Carbon Absorption Rate (kg/year)</label>
                    <input
                      type="number"
                      min="0"
                      value={formCarbonAbsorptionRate}
                      onChange={(e) => setFormCarbonAbsorptionRate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 focus:border-emerald-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {['Diesel Vehicles', 'Generators'].includes(formCategory) && (
                <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-amber-800 block font-semibold">Fuel Consumption (Litres/year)</label>
                  <input
                    type="number"
                    min="0"
                    value={formFuelConsumption}
                    onChange={(e) => setFormFuelConsumption(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  />
                </div>
              )}

              {/* Power Rating & Average Daily Usage Hours (Visible for all categories) */}
              <div className="grid grid-cols-2 gap-3 bg-blue-50/40 p-3.5 rounded-2xl border border-blue-100/50">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-blue-800 block font-semibold">
                    {isElectricalCategory(formCategory) ? 'Power Rating (Watts)*' : 'Power Rating (Watts) (Optional)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={isElectricalCategory(formCategory) ? "e.g. 1500" : "e.g. 0"}
                    value={formPowerRating}
                    onChange={(e) => setFormPowerRating(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-mono tracking-wider text-blue-800 block font-semibold">
                    {(isElectricalCategory(formCategory) || isTransportCategory(formCategory)) ? 'Usage Hours (hours/day)*' : 'Usage Hours (hours/day) (Optional)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="any"
                    placeholder={(isElectricalCategory(formCategory) || isTransportCategory(formCategory)) ? "e.g. 8" : "e.g. 0"}
                    value={formUsageHours}
                    onChange={(e) => setFormUsageHours(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  />
                </div>
              </div>

              {/* Media & Panoramic Assets Section */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Image size={14} className="text-emerald-600" />
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-600">Media & Interactive Assets</span>
                </div>

                {editingAsset ? (
                  <div className="space-y-4">
                    {/* Thumbnail Upload */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-700 block">Thumbnail Image</span>
                          <span className="text-[9px] text-slate-400">Main card display image</span>
                        </div>
                        <label className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-semibold text-slate-700 cursor-pointer transition-all flex items-center gap-1">
                          <Upload size={12} />
                          {uploadingThumb ? 'Uploading...' : 'Choose File'}
                          <input 
                            type="file" 
                            accept=".jpg,.jpeg,.png,.webp" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'thumbnail')} 
                            disabled={uploadingThumb}
                          />
                        </label>
                      </div>
                      {(editingAsset.thumbnailUrl || editingAsset.thumbnail) && (
                        <div className="relative w-20 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                          <img 
                            src={editingAsset.thumbnailUrl || editingAsset.thumbnail} 
                            alt="Thumbnail" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Panorama Upload */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-700 block">360° Panorama Image</span>
                          <span className="text-[9px] text-slate-400">Used for virtual tour & 360 viewer</span>
                        </div>
                        <label className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-semibold text-slate-700 cursor-pointer transition-all flex items-center gap-1">
                          <Upload size={12} />
                          {uploadingPano ? 'Uploading...' : (editingAsset.panoramaUrl || editingAsset.panorama) ? 'Replace Panorama' : 'Choose File'}
                          <input 
                            type="file" 
                            accept=".jpg,.jpeg,.png,.webp" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'panorama')} 
                            disabled={uploadingPano}
                          />
                        </label>
                      </div>
                      {(editingAsset.panoramaUrl || editingAsset.panorama) ? (
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-slate-500 block">Current Panorama</span>
                          <div className="relative w-full h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img 
                              src={editingAsset.panoramaUrl || editingAsset.panorama} 
                              alt="Current Panorama" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => setActivePreviewAsset(editingAsset)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[10px] font-semibold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Eye size={12} />
                              View Panorama
                            </button>
                            <button
                              type="button"
                              onClick={handleDeletePanorama}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-semibold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Trash2 size={12} />
                              Delete Panorama
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-400 italic">No panorama uploaded. Reverts to standard fallback.</div>
                      )}
                    </div>

                    {/* Gallery Images Upload */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-700 block">Gallery Images</span>
                          <span className="text-[9px] text-slate-400">Add multiple high-resolution photos</span>
                        </div>
                        <label className="px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-semibold text-slate-700 cursor-pointer transition-all flex items-center gap-1">
                          <Upload size={12} />
                          {uploadingGallery ? 'Uploading...' : 'Add Image'}
                          <input 
                            type="file" 
                            accept=".jpg,.jpeg,.png,.webp" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'gallery')} 
                            disabled={uploadingGallery}
                          />
                        </label>
                      </div>
                      {editingAsset.galleryUrls && editingAsset.galleryUrls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {editingAsset.galleryUrls.map((url, idx) => (
                            <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                              <img 
                                src={url} 
                                alt={`Gallery ${idx}`} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-slate-200 rounded-2xl text-center">
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Thumbnail, Gallery images, and 360° Panoramas can be directly uploaded here after provisioning the asset.
                    </p>
                  </div>
                )}
              </div>

              {/* Status field (only if editing) */}
              {editingAsset && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Twin Status*</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-850 text-xs outline-none transition-all"
                  >
                    <option value="Active">Active Twin</option>
                    <option value="Inactive">Soft-Deleted / Inactive</option>
                  </select>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-xs text-slate-600 font-semibold rounded-xl transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/10 cursor-pointer border-none transition-all"
                >
                  {submitLoading ? 'Saving...' : editingAsset ? 'Apply Changes' : 'Provision Asset'}
                </button>
              </div>
             </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE CONFIRMATION MODAL */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">Soft-Delete Asset</h3>
                <p className="text-xs text-slate-500">Historical records and telemetry logs will remain safe.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Asset</div>
              <div className="font-semibold text-slate-800 text-sm">{assetToDelete.name}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{assetToDelete.category} • {assetToDelete.institution}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAssetToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAsset}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl cursor-pointer border-none shadow-md shadow-amber-600/10 transition-colors"
              >
                Soft-Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFE CUSTOM ALERT MODAL */}
      {customAlertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col items-center text-center p-2">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                <AlertCircle size={28} />
              </div>
              <h3 className="font-display font-bold text-base text-slate-900 mb-2">Notification</h3>
              <p className="text-xs text-slate-650 leading-relaxed mb-5">{customAlertMsg}</p>
              <button
                onClick={() => setCustomAlertMsg(null)}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer border-none transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Street View / 360 Panorama Viewer Overlay */}
      {activePreviewAsset && (
        <StreetViewModal 
          asset={activePreviewAsset} 
          onClose={() => setActivePreviewAsset(null)} 
          initialTab="panorama"
        />
      )}
    </div>
  );
}

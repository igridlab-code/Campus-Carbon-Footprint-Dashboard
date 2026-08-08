import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Building2, 
  Zap, 
  Droplet, 
  Trash2, 
  Plus, 
  Search, 
  Sparkles, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Cpu,
  Utensils,
  Pizza,
  Flame,
  Activity,
  GlassWater,
  Truck,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { CampusAsset, SustainabilityLog } from '../types';

interface DailySustainabilityLoggerProps {
  token: string | null;
  assets: CampusAsset[];
  onLogAdded?: () => void;
}

export default function DailySustainabilityLogger({
  token,
  assets,
  onLogAdded
}: DailySustainabilityLoggerProps) {
  const [logs, setLogs] = useState<SustainabilityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [buildingId, setBuildingId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [energyUsage, setEnergyUsage] = useState('');
  const [waterUsage, setWaterUsage] = useState('');
  const [wasteGenerated, setWasteGenerated] = useState('');
  const [fuelType, setFuelType] = useState<'Diesel' | 'Petrol' | 'CNG' | 'Electric Vehicle' | 'Electric' | ''>('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [remarks, setRemarks] = useState('');

  // Category specific states
  const [paperWaste, setPaperWaste] = useState('');
  const [plasticWaste, setPlasticWaste] = useState('');
  const [eWaste, setEWaste] = useState('');
  const [mealsServed, setMealsServed] = useState('');
  const [foodWaste, setFoodWaste] = useState('');
  const [lpgConsumption, setLpgConsumption] = useState('');
  const [medicalWaste, setMedicalWaste] = useState('');
  const [electricityUsage, setElectricityUsage] = useState('');
  const [waterUsageDairy, setWaterUsageDairy] = useState('');
  const [animalWaste, setAnimalWaste] = useState('');
  const [milkProduction, setMilkProduction] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  const [tripsOperated, setTripsOperated] = useState('');

  // Extra category-specific states
  const [classroomsActive, setClassroomsActive] = useState('');
  const [labsActive, setLabsActive] = useState('');
  const [computerLabEnergy, setComputerLabEnergy] = useState('');
  const [lightingEnergy, setLightingEnergy] = useState('');
  const [acEnergy, setAcEnergy] = useState('');
  const [studentsServed, setStudentsServed] = useState('');
  const [patientCount, setPatientCount] = useState('');
  const [vehicleCount, setVehicleCount] = useState('');
  const [evCharging, setEvCharging] = useState('');
  const [feedConsumption, setFeedConsumption] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('');
  const [logIdToDelete, setLogIdToDelete] = useState<string | null>(null);

  // Determine active category based on selected building
  const selectedAsset = useMemo(() => assets.find(a => a.id === buildingId), [assets, buildingId]);
  const selectedCategory = selectedAsset?.category || '';

  const formMode = useMemo(() => {
    if (!buildingId) return 'Standard';
    const nameLower = selectedAsset?.name.toLowerCase() || '';
    const catLower = selectedCategory.toLowerCase();
    
    if (nameLower.includes('canteen') || catLower === 'food services') return 'Canteen';
    if (nameLower.includes('hostel') || nameLower.includes('mess')) return 'Hostel';
    if (nameLower.includes('bus') || nameLower.includes('transport') || catLower === 'transport') return 'Transport';
    if (nameLower.includes('farm') || nameLower.includes('dairy') || catLower === 'agriculture') return 'Dairy';
    if (catLower === 'academic' || nameLower.includes('block') || catLower === 'administrative' || catLower === 'administration') return 'Academic';
    if (catLower === 'medical') return 'Medical';
    return 'Standard';
  }, [buildingId, selectedCategory, selectedAsset]);

  // Reset category-specific states on building change
  useEffect(() => {
    setEnergyUsage(''); setWaterUsage(''); setWasteGenerated('');
    setFuelType(formMode === 'Transport' ? 'Diesel' : '');
    setFuelConsumed(''); setPaperWaste(''); setPlasticWaste(''); setEWaste('');
    setMealsServed(''); setFoodWaste(''); setLpgConsumption(''); setMedicalWaste('');
    setElectricityUsage(''); setWaterUsageDairy(''); setAnimalWaste(''); setMilkProduction('');
    setVehicleType('Bus'); setTripsOperated('');
    setClassroomsActive(''); setLabsActive(''); setComputerLabEnergy(''); setLightingEnergy(''); setAcEnergy('');
    setStudentsServed(''); setPatientCount(''); setVehicleCount(''); setEvCharging(''); setFeedConsumption('');
  }, [buildingId, formMode]);

  // Live previews
  const liveCalculations = useMemo(() => {
    let e = 0, w = 0, waste = 0, trans = 0, carb = 0;

    const safeFloat = (val: string) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    };

    const fCons = safeFloat(fuelConsumed);
    const evChg = safeFloat(evCharging);
    if (fuelType === 'Diesel') trans = fCons * 2.68;
    else if (fuelType === 'Petrol') trans = fCons * 2.31;
    else if (fuelType === 'CNG') trans = fCons * 2.74;
    else if (fuelType === 'Electric Vehicle' || fuelType === 'Electric') trans = evChg * 0.82;

    if (formMode === 'Academic') {
      const pW = safeFloat(paperWaste);
      const plW = safeFloat(plasticWaste);
      const eW = safeFloat(eWaste);
      const compE = safeFloat(computerLabEnergy);
      const lightE = safeFloat(lightingEnergy);
      const acE = safeFloat(acEnergy);
      e = compE + lightE + acE;
      w = safeFloat(waterUsage);
      waste = pW + plW + eW;
      carb = e * 0.82 + w * 0.0003 + pW * 1.5 + plW * 3.0 + eW * 5.0;
    } else if (formMode === 'Canteen') {
      const fW = safeFloat(foodWaste);
      const lpg = safeFloat(lpgConsumption);
      const plW = safeFloat(plasticWaste);
      e = safeFloat(energyUsage) || (lpg * 13.9);
      w = safeFloat(waterUsage);
      waste = fW + plW;
      carb = e * 0.82 + w * 0.0003 + lpg * 2.984 + fW * 1.9 + plW * 3.0;
    } else if (formMode === 'Hostel') {
      const fW = safeFloat(foodWaste);
      e = safeFloat(electricityUsage);
      w = safeFloat(waterUsage);
      waste = fW;
      carb = e * 0.82 + w * 0.0003 + fW * 1.9;
    } else if (formMode === 'Medical') {
      const mW = safeFloat(medicalWaste);
      const plW = safeFloat(plasticWaste);
      e = safeFloat(electricityUsage) || safeFloat(energyUsage);
      w = safeFloat(waterUsage);
      waste = mW + plW;
      carb = e * 0.82 + w * 0.0003 + mW * 2.5 + plW * 3.0;
    } else if (formMode === 'Dairy') {
      const elec = safeFloat(electricityUsage);
      const watD = safeFloat(waterUsageDairy) || safeFloat(waterUsage);
      const animW = safeFloat(animalWaste);
      const feedC = safeFloat(feedConsumption);
      e = elec; w = watD; waste = animW;
      carb = elec * 0.82 + watD * 0.0003 + animW * 0.8 + feedC * 0.2;
    } else if (formMode === 'Transport') {
      w = 0; waste = 0;
      e = evChg;
      carb = trans;
    } else {
      e = safeFloat(energyUsage);
      w = safeFloat(waterUsage);
      waste = safeFloat(wasteGenerated);
      carb = e * 0.82 + w * 0.0003 + waste * 1.9 + trans;
    }

    // Standard live green score calculation
    const scoreEnergy = Math.max(0, Math.min(100, 100 - (e / 15)));
    const scoreWater = Math.max(0, Math.min(100, 100 - (w / 150)));
    const scoreWaste = Math.max(0, Math.min(100, 100 - (waste * 1.2)));
    const scoreTrans = Math.max(0, Math.min(100, 100 - (trans * 0.5)));
    const rawScore = (scoreEnergy * 0.35) + (scoreWater * 0.25) + (scoreWaste * 0.25) + (scoreTrans * 0.15);
    const score = Math.max(10, Math.min(100, Math.round(rawScore)));

    return { e, w, waste, trans, carb, score };
  }, [
    formMode, energyUsage, waterUsage, wasteGenerated, fuelType, fuelConsumed, evCharging,
    paperWaste, plasticWaste, eWaste, mealsServed, foodWaste, lpgConsumption,
    medicalWaste, electricityUsage, waterUsageDairy, animalWaste, vehicleType, tripsOperated,
    classroomsActive, labsActive, computerLabEnergy, lightingEnergy, acEnergy,
    studentsServed, patientCount, vehicleCount, feedConsumption
  ]);

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sustainability/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLogs(await res.json());
    } catch (err) {
      console.error(err);
      setError('Network connection error while fetching logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!buildingId) return setError('Please select a building node.');
    if (!date) return setError('Please select a date.');

    const payload: any = {
      assetId: buildingId,
      date,
      remarks: remarks.trim()
    };

    if (formMode === 'Academic') {
      payload.classroomsActive = parseFloat(classroomsActive) || 0;
      payload.labsActive = parseFloat(labsActive) || 0;
      payload.computerLabEnergy = parseFloat(computerLabEnergy) || 0;
      payload.lightingEnergy = parseFloat(lightingEnergy) || 0;
      payload.acEnergy = parseFloat(acEnergy) || 0;
      payload.energyUsage = payload.computerLabEnergy + payload.lightingEnergy + payload.acEnergy;
      payload.waterUsage = parseFloat(waterUsage) || 0;
      payload.paperWaste = parseFloat(paperWaste) || 0;
      payload.plasticWaste = parseFloat(plasticWaste) || 0;
      payload.eWaste = parseFloat(eWaste) || 0;
      payload.wasteGenerated = payload.paperWaste + payload.plasticWaste + payload.eWaste;
    } else if (formMode === 'Canteen') {
      payload.mealsServed = parseFloat(mealsServed) || 0;
      payload.foodWaste = parseFloat(foodWaste) || 0;
      payload.waterUsage = parseFloat(waterUsage) || 0;
      payload.plasticWaste = parseFloat(plasticWaste) || 0;
      payload.lpgConsumption = parseFloat(lpgConsumption) || 0;
      payload.energyUsage = parseFloat(energyUsage) || (payload.lpgConsumption * 13.9);
      payload.wasteGenerated = payload.foodWaste + payload.plasticWaste;
    } else if (formMode === 'Hostel') {
      payload.studentsServed = parseFloat(studentsServed) || 0;
      payload.electricityUsage = parseFloat(electricityUsage) || 0;
      payload.energyUsage = payload.electricityUsage;
      payload.waterUsage = parseFloat(waterUsage) || 0;
      payload.foodWaste = parseFloat(foodWaste) || 0;
      payload.wasteGenerated = payload.foodWaste;
    } else if (formMode === 'Medical') {
      payload.patientCount = parseFloat(patientCount) || 0;
      payload.medicalWaste = parseFloat(medicalWaste) || 0;
      payload.plasticWaste = parseFloat(plasticWaste) || 0;
      payload.waterUsage = parseFloat(waterUsage) || 0;
      payload.electricityUsage = parseFloat(electricityUsage) || parseFloat(energyUsage) || 0;
      payload.energyUsage = payload.electricityUsage;
      payload.wasteGenerated = payload.medicalWaste + payload.plasticWaste;
    } else if (formMode === 'Dairy') {
      payload.milkProduction = parseFloat(milkProduction) || 0;
      payload.animalWaste = parseFloat(animalWaste) || 0;
      payload.waterUsageDairy = parseFloat(waterUsageDairy) || parseFloat(waterUsage) || 0;
      payload.waterUsage = payload.waterUsageDairy;
      payload.electricityUsage = parseFloat(electricityUsage) || 0;
      payload.energyUsage = payload.electricityUsage;
      payload.feedConsumption = parseFloat(feedConsumption) || 0;
      payload.wasteGenerated = payload.animalWaste;
    } else if (formMode === 'Transport') {
      payload.vehicleCount = parseFloat(vehicleCount) || 0;
      payload.tripsOperated = parseFloat(tripsOperated) || 0;
      payload.fuelType = fuelType;
      payload.fuelConsumed = parseFloat(fuelConsumed) || 0;
      payload.evCharging = parseFloat(evCharging) || 0;
      payload.energyUsage = payload.evCharging;
      payload.waterUsage = 0;
      payload.wasteGenerated = 0;
    } else {
      payload.energyUsage = parseFloat(energyUsage) || 0;
      payload.waterUsage = parseFloat(waterUsage) || 0;
      payload.wasteGenerated = parseFloat(wasteGenerated) || 0;
      payload.fuelType = fuelType;
      payload.fuelConsumed = fuelType ? parseFloat(fuelConsumed) : 0;
    }

    try {
      const res = await fetch('/api/sustainability/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newLog = await res.json();
        setSuccess('Daily sustainability log successfully recorded.');
        setLogs(prev => [newLog, ...prev]);
        setRemarks('');
        if (onLogAdded) onLogAdded();
      } else {
        const errData = await res.json();
        setError(errData.message || 'Error saving sustainability log.');
      }
    } catch (err) {
      setError('Connection to digital twin server failed.');
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/sustainability/logs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== id));
        setSuccess('Entry removed successfully.');
        setLogIdToDelete(null);
        if (onLogAdded) onLogAdded();
      }
    } catch (err) {
      setError('Failed to delete log entry.');
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const name = log.assetName || log.buildingName || '';
      const notes = log.remarks || log.notes || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            log.date.includes(searchQuery);
      const matchesBuilding = !selectedBuildingFilter || log.assetId === selectedBuildingFilter;
      return matchesSearch && matchesBuilding;
    });
  }, [logs, searchQuery, selectedBuildingFilter]);

  return (
    <div className="space-y-6" id="sustainability-logger">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="text-emerald-600" size={22} />
          Category-Specific Sustainability Logger
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Dynamically configures relevant fields based on selected asset category. Automatically computes emissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <h2 className="font-semibold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 size={16} className="text-blue-500" />
            New Sustainability Audit
          </h2>

          {error && <div className="p-3 bg-red-50 border border-red-150 text-red-700 text-xs rounded-xl flex gap-2"><AlertCircle size={14} className="shrink-0" /> {error}</div>}
          {success && <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-xl flex gap-2"><CheckCircle2 size={14} className="shrink-0" /> {success}</div>}

          <form onSubmit={handleSaveLog} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" required />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Node</label>
                <select value={buildingId} onChange={e => setBuildingId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" required>
                  <option value="">-- Select Asset --</option>
                  {assets.filter(a => (a.status || 'Active') === 'Active').map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Academic Forms */}
            {formMode === 'Academic' && (
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Building Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Classrooms Active*</label>
                    <input type="number" required placeholder="12" value={classroomsActive} onChange={e => setClassroomsActive(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Labs Active*</label>
                    <input type="number" required placeholder="4" value={labsActive} onChange={e => setLabsActive(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Computer Lab Energy (kWh)*</label>
                    <input type="number" required placeholder="45" value={computerLabEnergy} onChange={e => setComputerLabEnergy(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Lighting Energy (kWh)*</label>
                    <input type="number" required placeholder="30" value={lightingEnergy} onChange={e => setLightingEnergy(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">AC Energy (kWh)*</label>
                    <input type="number" required placeholder="75" value={acEnergy} onChange={e => setAcEnergy(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Water (Liters)*</label>
                    <input type="number" required placeholder="1000" value={waterUsage} onChange={e => setWaterUsage(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Paper (kg)*</label>
                    <input type="number" required placeholder="5" value={paperWaste} onChange={e => setPaperWaste(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Plastic (kg)*</label>
                    <input type="number" required placeholder="3" value={plasticWaste} onChange={e => setPlasticWaste(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">E-Waste (kg)*</label>
                    <input type="number" required placeholder="1" value={eWaste} onChange={e => setEWaste(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
              </div>
            )}

            {/* Canteen Forms */}
            {formMode === 'Canteen' && (
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canteen / Dining Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Meals Served*</label>
                    <input type="number" required placeholder="500" value={mealsServed} onChange={e => setMealsServed(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Water (Liters)*</label>
                    <input type="number" required placeholder="1500" value={waterUsage} onChange={e => setWaterUsage(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Food Waste (kg)*</label>
                    <input type="number" required placeholder="25" value={foodWaste} onChange={e => setFoodWaste(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Plastic Waste (kg)*</label>
                    <input type="number" required placeholder="5" value={plasticWaste} onChange={e => setPlasticWaste(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">LPG Consumed (kg)*</label>
                    <input type="number" required placeholder="14.2" value={lpgConsumption} onChange={e => setLpgConsumption(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" step="any" />
                  </div>
                </div>
              </div>
            )}

            {/* Hostel Forms */}
            {formMode === 'Hostel' && (
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hostel Building Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Students Served*</label>
                    <input type="number" required placeholder="250" value={studentsServed} onChange={e => setStudentsServed(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Electricity (kWh)*</label>
                    <input type="number" required placeholder="180" value={electricityUsage} onChange={e => setElectricityUsage(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Water (Liters)*</label>
                    <input type="number" required placeholder="3200" value={waterUsage} onChange={e => setWaterUsage(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Food Waste (kg)*</label>
                    <input type="number" required placeholder="30" value={foodWaste} onChange={e => setFoodWaste(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
              </div>
            )}

            {/* Medical Forms */}
            {formMode === 'Medical' && (
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medical Building Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Patient Count*</label>
                    <input type="number" required placeholder="45" value={patientCount} onChange={e => setPatientCount(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Electricity (kWh)*</label>
                    <input type="number" required placeholder="210" value={electricityUsage} onChange={e => setElectricityUsage(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Water (Liters)*</label>
                    <input type="number" required placeholder="1500" value={waterUsage} onChange={e => setWaterUsage(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Medical Waste (kg)*</label>
                    <input type="number" required placeholder="15" value={medicalWaste} onChange={e => setMedicalWaste(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Plastic Waste (kg)*</label>
                    <input type="number" required placeholder="8" value={plasticWaste} onChange={e => setPlasticWaste(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
              </div>
            )}

            {/* Dairy Farm Forms */}
            {formMode === 'Dairy' && (
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dairy Farm Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Milk Yield (Liters)*</label>
                    <input type="number" required placeholder="300" value={milkProduction} onChange={e => setMilkProduction(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Electricity (kWh)*</label>
                    <input type="number" required placeholder="120" value={electricityUsage} onChange={e => setElectricityUsage(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Water (Liters)*</label>
                    <input type="number" required placeholder="3500" value={waterUsageDairy} onChange={e => setWaterUsageDairy(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Animal Waste (kg)*</label>
                    <input type="number" required placeholder="150" value={animalWaste} onChange={e => setAnimalWaste(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Feed Consumption (kg)*</label>
                    <input type="number" required placeholder="120" value={feedConsumption} onChange={e => setFeedConsumption(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
              </div>
            )}

            {/* Transport Forms */}
            {formMode === 'Transport' && (
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transport Zone Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Vehicle Count*</label>
                    <input type="number" required placeholder="5" value={vehicleCount} onChange={e => setVehicleCount(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Vehicle Type*</label>
                    <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs">
                      <option value="Bus">Bus</option>
                      <option value="Shuttle">Shuttle</option>
                      <option value="Van">Van</option>
                      <option value="Staff Car">Staff Car</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Trips Operated*</label>
                    <input type="number" required placeholder="10" value={tripsOperated} onChange={e => setTripsOperated(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Fuel Type*</label>
                    <select value={fuelType} onChange={e => setFuelType(e.target.value as any)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" required>
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                      <option value="CNG">CNG</option>
                      <option value="Electric Vehicle">Electric Vehicle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Fuel Consumed (L)*</label>
                    <input type="number" required placeholder="50" value={fuelConsumed} disabled={fuelType === 'Electric Vehicle'} onChange={e => setFuelConsumed(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs disabled:bg-slate-100" min="0" step="any" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">EV Charging (kWh)*</label>
                    <input type="number" required placeholder="45" value={evCharging} disabled={fuelType !== 'Electric Vehicle'} onChange={e => setEvCharging(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs disabled:bg-slate-100" min="0" />
                  </div>
                </div>
              </div>
            )}

            {/* Standard Forms */}
            {formMode === 'Standard' && (
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Standard Baseline Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Energy (kWh)*</label>
                    <input type="number" required placeholder="100" value={energyUsage} onChange={e => setEnergyUsage(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Water (L)*</label>
                    <input type="number" required placeholder="800" value={waterUsage} onChange={e => setWaterUsage(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-600 mb-1">Waste (kg)*</label>
                    <input type="number" required placeholder="10" value={wasteGenerated} onChange={e => setWasteGenerated(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-250 rounded-lg text-xs" min="0" />
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Calculation Panel */}
            {buildingId && (
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2.5">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-500 animate-pulse" />
                  Live Twin Environmental Calculations
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-mono">Carbon Load</span>
                    <span className="font-bold text-slate-700 font-mono block mt-0.5">{liveCalculations.carb} kg</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-mono">Transport</span>
                    <span className="font-bold text-slate-700 font-mono block mt-0.5">{liveCalculations.trans} kg</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block">Green Score</span>
                    <span className={`font-bold block mt-0.5 ${
                      liveCalculations.score >= 80 ? 'text-emerald-600' : liveCalculations.score >= 60 ? 'text-amber-500' : 'text-rose-500'
                    }`}>{liveCalculations.score}/100</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Remarks / Notes</label>
              <textarea placeholder="Meter readings or notes..." value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs h-16 resize-none outline-none" />
            </div>

            <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer border-none transition-colors">
              <Save size={14} /> Save Audit Entry
            </button>
          </form>
        </div>

        {/* Recent Audits List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
              <RefreshCw size={15} className="text-emerald-600" />
              Live Audit Log History
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-semibold rounded-full font-mono">{filteredLogs.length} Entries</span>
          </div>

          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 h-[32px] bg-slate-50 border border-slate-200 focus-within:border-emerald-500 rounded-xl transition-all flex-1">
              <Search className="shrink-0 text-slate-400" size={14} />
              <input type="text" placeholder="Search entries..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-full bg-transparent border-none outline-none text-slate-800 text-xs" />
            </div>
            <select value={selectedBuildingFilter} onChange={e => setSelectedBuildingFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 outline-none">
              <option value="">All Buildings</option>
              {assets.filter(a => (a.status || 'Active') === 'Active').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-150">
                  <th className="px-3 py-2">Date / Asset</th>
                  <th className="px-3 py-2 text-right">Energy</th>
                  <th className="px-3 py-2 text-right">Water</th>
                  <th className="px-3 py-2 text-right">Waste</th>
                  <th className="px-3 py-2 text-right">Carbon Load</th>
                  <th className="px-3 py-2 text-center">Score</th>
                  <th className="px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && logs.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Loading digital twin logs...</td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No sustainability data available.</td></tr>
                ) : (
                  filteredLogs.map(log => {
                    const bName = log.assetName || log.buildingName || 'Building Node';
                    const notes = log.remarks || log.notes || '';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2">
                          <span className="font-mono text-[10px] text-slate-400 block">{log.date}</span>
                          <span className="font-semibold text-slate-800 block text-[11px]">{bName}</span>
                          {notes && <span className="text-[10px] text-slate-400 block max-w-[140px] truncate" title={notes}>{notes}</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-blue-600">{log.energyUsage} <span className="text-[9px] font-normal text-slate-400">kWh</span></td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-cyan-600">{log.waterUsage} <span className="text-[9px] font-normal text-slate-400">L</span></td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-amber-700">
                          <span>{log.wasteGenerated} <span className="text-[9px] font-normal text-slate-400">kg</span></span>
                          {log.paperWaste !== undefined && (
                            <span className="text-[8px] font-sans text-slate-400 block">
                              P: {log.paperWaste} | Pl: {log.plasticWaste} | E: {log.eWaste}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">
                          {log.carbonFootprint} <span className="text-[9px] font-normal text-slate-400">kg</span>
                          {log.transportEmission !== undefined && log.transportEmission > 0 && (
                            <span className="text-[8px] text-emerald-600 block">Fleet: {log.transportEmission}kg</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            (log.greenScore || 0) >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 
                            (log.greenScore || 0) >= 60 ? 'bg-amber-50 text-amber-700 border border-amber-150' : 
                            'bg-rose-50 text-rose-700 border border-rose-150'
                          }`}>{log.greenScore || 0}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {logIdToDelete === log.id ? (
                            <div className="flex items-center justify-center gap-1.5 animate-fade-in">
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer bg-transparent border-none font-semibold text-[10px]"
                                title="Confirm delete"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setLogIdToDelete(null)}
                                className="p-1 text-slate-500 hover:bg-slate-100 rounded cursor-pointer bg-transparent border-none font-semibold text-[10px]"
                                title="Cancel"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setLogIdToDelete(log.id)} className="p-1 hover:text-rose-600 hover:bg-rose-50 text-slate-400 rounded-lg cursor-pointer bg-transparent border-none" title="Delete log entry">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

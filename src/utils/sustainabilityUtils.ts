import { CampusAsset } from '../types';

export function calculateCarbonFootprint(energy: number, water: number, waste: number, transport: number = 0): number {
  // Documented Carbon Emission Factors (India & Standard Sustainability Frameworks):
  // 1. Grid Electricity (India Central Electricity Authority standard): ~0.82 kg CO2 per kWh
  // 2. Water supply purification & treatment: ~0.0003 kg CO2 per litre
  // 3. Municipal Solid Waste decomposition/recycling offset: ~1.9 kg CO2 per kg
  // 4. Transport Fleet: direct fuel combustion CO2 (Diesel/Petrol/CNG)
  const energyEmissions = energy * 0.82;
  const waterEmissions = water * 0.0003;
  const wasteEmissions = waste * 1.9;
  return parseFloat((energyEmissions + waterEmissions + wasteEmissions + transport).toFixed(2));
}

export function calculateGreenScore(energy: number, water: number, waste: number, transport: number = 0): number {
  // Normalized scoring components: lower consumption = higher score
  const energyScore = Math.max(0, Math.min(100, 100 - (energy / 15)));
  const waterScore = Math.max(0, Math.min(100, 100 - (water / 150)));
  const wasteScore = Math.max(0, Math.min(100, 100 - (waste * 1.2)));
  const transportScore = Math.max(0, Math.min(100, 100 - (transport * 2)));
  
  return Math.round((energyScore + waterScore + wasteScore + transportScore) / 4);
}

export interface CarbonCalculationResult {
  energyEmissions: number;
  transportEmissions: number;
  wasteEmissions: number;
  totalEmissions: number;
  
  treeAbsorption: number;
  greenAreaAbsorption: number;
  totalAbsorption: number;
  
  netCarbonBalance: number;
}

export function calculateDetailedCarbonAccounting(
  metrics: {
    electricity?: number; // kWh/day
    diesel?: number; // Litres/day
    petrol?: number; // Litres/day
    lpg?: number; // kg/day
    waste?: number; // kg/day
    transportLogs?: number; // kg CO2 direct
    treeCount?: number;
    greenCoverArea?: number; // sqm
  },
  factors?: {
    electricity?: number;
    diesel?: number;
    petrol?: number;
    lpg?: number;
    waste?: number;
    treeAbsorption?: number;
  }
): CarbonCalculationResult {
  const f = {
    electricity: factors?.electricity ?? 0.82,
    diesel: factors?.diesel ?? 2.68,
    petrol: factors?.petrol ?? 2.31,
    lpg: factors?.lpg ?? 2.984,
    waste: factors?.waste ?? 1.9,
    treeAbsorption: factors?.treeAbsorption ?? 21
  };

  // Calculate daily emissions
  const energyEmissions = ((metrics.electricity || 0) * f.electricity) + ((metrics.lpg || 0) * f.lpg);
  const transportEmissions = ((metrics.diesel || 0) * f.diesel) + ((metrics.petrol || 0) * f.petrol) + (metrics.transportLogs || 0);
  const wasteEmissions = (metrics.waste || 0) * f.waste;
  const totalEmissions = energyEmissions + transportEmissions + wasteEmissions;

  // Absorption (annual rate standard is kg CO2 / tree / year)
  // Standard conversion for green grass cover: 0.12 kg CO2 / sqm / year
  const annualTreeAbs = (metrics.treeCount || 0) * f.treeAbsorption;
  const annualGreenAreaAbs = (metrics.greenCoverArea || 0) * 0.12;
  const totalAbsorptionAnnual = annualTreeAbs + annualGreenAreaAbs;

  // Let's express daily absorption to balance daily emissions
  const totalAbsorptionDaily = totalAbsorptionAnnual / 365;
  const netCarbonBalanceDaily = totalEmissions - totalAbsorptionDaily;

  return {
    energyEmissions: parseFloat(energyEmissions.toFixed(2)),
    transportEmissions: parseFloat(transportEmissions.toFixed(2)),
    wasteEmissions: parseFloat(wasteEmissions.toFixed(2)),
    totalEmissions: parseFloat(totalEmissions.toFixed(2)),
    
    treeAbsorption: parseFloat(annualTreeAbs.toFixed(2)),
    greenAreaAbsorption: parseFloat(annualGreenAreaAbs.toFixed(2)),
    totalAbsorption: parseFloat(totalAbsorptionAnnual.toFixed(2)),
    
    // Net balance over a year (scaled to annual standard)
    netCarbonBalance: parseFloat((totalEmissions * 365 - totalAbsorptionAnnual).toFixed(2))
  };
}

export function calculateCampusCarbonStats(assets: CampusAsset[]) {
  const activeAssets = (assets || []).filter(a => (a.status || 'Active') !== 'Inactive');

  let totalEmissions = 0; // kg CO2 / year
  let totalOffset = 0; // kg CO2 / year
  let totalTrees = 0;
  let totalElectricalAssets = 0;
  let totalRenewableEnergyAssets = 0;

  // Track breakdowns
  const categoryEmissions: { [key: string]: number } = {};
  const categoryOffsets: { [key: string]: number } = {};
  const categoryQuantities: { [key: string]: number } = {};

  const highLevelCategories = [
    'Academic', 'Healthcare', 'Administration', 'Food Services', 'Transport',
    'Green Zone', 'Sports', 'Infrastructure', 'Administrative', 'Amenities',
    'Utility', 'Medical', 'Agriculture'
  ];

  activeAssets.forEach(a => {
    const qty = a.quantity !== undefined && a.quantity !== null ? Number(a.quantity) : 1;
    const cat = a.category as string;
    const power = a.powerRating !== undefined && a.powerRating !== null ? Number(a.powerRating) : 0;
    const hours = a.usageHours !== undefined && a.usageHours !== null ? Number(a.usageHours) : 0;

    let assetEmission = 0;
    let assetOffset = 0;

    // 1. Calculate Offsets (Trees and Solar)
    if (cat === 'Trees' || cat === 'Plants' || cat === 'Garden Area' || cat === 'Lawn') {
      const rate = a.carbonAbsorptionRate !== undefined && a.carbonAbsorptionRate !== null ? Number(a.carbonAbsorptionRate) : 21;
      assetOffset += qty * rate;
      totalTrees += qty;
    } else if (a.treeCount !== undefined && a.treeCount > 0) {
      const rate = a.carbonAbsorptionRate !== undefined && a.carbonAbsorptionRate !== null ? Number(a.carbonAbsorptionRate) : 21;
      assetOffset += a.treeCount * rate;
      totalTrees += a.treeCount;
    }

    if (cat === 'Solar Panels' || cat === 'Solar Panel') {
      const genRating = power > 0 ? power : 300; // 300 Watts default
      const annualKwh = (genRating * qty * 4.5 * 365) / 1000;
      assetOffset += annualKwh * 0.82;
      totalRenewableEnergyAssets += qty;
    } else if (a.name.toLowerCase().includes('solar') || a.description.toLowerCase().includes('solar')) {
      totalRenewableEnergyAssets += 1;
      const annualKwh = (3000 * 1 * 4.5 * 365) / 1000;
      assetOffset += annualKwh * 0.82;
    }

    // 2. Calculate Emissions
    if (highLevelCategories.includes(cat)) {
      const footprint = calculateCarbonFootprint(a.energyUsage || 0, a.waterUsage || 0, a.wasteGenerated || 0);
      assetEmission = footprint * 365;
      if ((a.energyUsage || 0) > 0) {
        totalElectricalAssets += qty;
      }
    } else if (cat === 'Electric Vehicles' || cat === 'Electric Vehicle' || cat === 'College Bus' || cat === 'College Buses') {
      assetEmission = qty * 120;
    } else if (cat === 'Diesel Vehicles' || cat === 'Diesel Vehicle') {
      const fuel = a.fuelConsumption !== undefined && a.fuelConsumption !== null && a.fuelConsumption > 0 ? Number(a.fuelConsumption) : 1500;
      assetEmission = qty * fuel * 2.68;
    } else if (cat === 'Generators') {
      const fuel = a.fuelConsumption !== undefined && a.fuelConsumption !== null && a.fuelConsumption > 0 ? Number(a.fuelConsumption) : 1200;
      assetEmission = qty * fuel * 2.68;
      totalElectricalAssets += qty;
    } else {
      // General Electrical Equipment Check
      const isElectrical = [
        'Air Conditioners', 'Ceiling Fans', 'Computers', 'Laptops', 'Projectors',
        'Printers', 'CCTV Cameras', 'Street Lights', 'Water Pumps', 'Batteries', 'UPS Systems',
        'Air Conditioner', 'Ceiling Fan', 'LED Light', 'Tube Light', 'Computer', 'Laptop',
        'Projector', 'Printer', 'CCTV Camera', 'Wi-Fi Router', 'Water Pump', 'Battery', 'UPS', 'Street Light'
      ].includes(cat);

      if (isElectrical) {
        totalElectricalAssets += qty;
      }

      if (power > 0) {
        const usageHours = hours > 0 ? hours : 8;
        const annualKwh = (power * qty * usageHours * 365) / 1000;
        assetEmission = annualKwh * 0.82;
      } else if (isElectrical) {
        // Fallback standard power ratings in Watts if powerRating is 0 or undefined
        let stdPower = 0;
        let stdHours = 8;
        switch (cat) {
          case 'Air Conditioners':
          case 'Air Conditioner':
            stdPower = 1500; stdHours = 8; break;
          case 'Ceiling Fans':
          case 'Ceiling Fan':
            stdPower = 75; stdHours = 12; break;
          case 'Computers':
          case 'Computer':
            stdPower = 150; stdHours = 8; break;
          case 'Laptops':
          case 'Laptop':
            stdPower = 65; stdHours = 6; break;
          case 'Projectors':
          case 'Projector':
            stdPower = 300; stdHours = 4; break;
          case 'Printers':
          case 'Printer':
            stdPower = 500; stdHours = 2; break;
          case 'CCTV Cameras':
          case 'CCTV Camera':
            stdPower = 15; stdHours = 24; break;
          case 'Street Lights':
          case 'Street Light':
            stdPower = 100; stdHours = 12; break;
          case 'Water Pumps':
          case 'Water Pump':
            stdPower = 1500; stdHours = 3; break;
          case 'Batteries':
          case 'Battery':
            stdPower = 100; stdHours = 24; break;
          case 'UPS Systems':
          case 'UPS':
            stdPower = 120; stdHours = 24; break;
          case 'LED Light':
          case 'Tube Light':
            stdPower = 20; stdHours = 10; break;
          case 'Wi-Fi Router':
            stdPower = 15; stdHours = 24; break;
        }
        const annualKwh = (stdPower * qty * stdHours * 365) / 1000;
        assetEmission = annualKwh * 0.82;
      }
    }

    if (assetEmission > 0) {
      totalEmissions += assetEmission;
      categoryEmissions[cat] = (categoryEmissions[cat] || 0) + assetEmission;
    }
    if (assetOffset > 0) {
      totalOffset += assetOffset;
      categoryOffsets[cat] = (categoryOffsets[cat] || 0) + assetOffset;
    }
    categoryQuantities[cat] = (categoryQuantities[cat] || 0) + qty;
  });

  const netCarbonFootprint = totalEmissions - totalOffset;

  let sustainabilityScore = 50;
  if (totalEmissions > 0) {
    const ratio = totalOffset / totalEmissions;
    if (ratio >= 1) {
      sustainabilityScore = 100;
    } else {
      sustainabilityScore = Math.round(ratio * 100);
    }
  } else if (totalOffset > 0) {
    sustainabilityScore = 100;
  }

  sustainabilityScore = Math.max(0, Math.min(100, sustainabilityScore));

  return {
    totalEmissions: parseFloat(totalEmissions.toFixed(2)),
    totalOffset: parseFloat(totalOffset.toFixed(2)),
    netCarbonFootprint: parseFloat(netCarbonFootprint.toFixed(2)),
    totalTrees,
    totalElectricalAssets,
    totalRenewableEnergyAssets,
    sustainabilityScore,
    categoryEmissions,
    categoryOffsets,
    categoryQuantities
  };
}

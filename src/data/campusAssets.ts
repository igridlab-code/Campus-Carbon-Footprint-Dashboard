import { CampusAsset } from '../types';
import { calculateCarbonFootprint, calculateGreenScore } from '../utils/sustainabilityUtils';

const rawCampusAssets: any[] = [
  {
    id: 'main-gate',
    name: 'Main Gate',
    coordinate: [10.739939261919805, 78.63900952243701],
    category: 'Amenities',
    institution: 'Common Facilities',
    greenScore: 88,
    energyUsage: 12, // LED high efficiency lighting
    waterUsage: 50,  // Security guard cabin
    wasteGenerated: 2,
    description: 'Main campus entry checkpoint for vehicles and pedestrians with solar-powered boundary lights.'
  },
  {
    id: 'admin-block',
    name: 'Admin Block',
    coordinate: [10.740081082770674, 78.63839603731475],
    category: 'Administrative',
    institution: 'Common Facilities',
    greenScore: 78,
    energyUsage: 240, // Offices, servers, ACs
    waterUsage: 1200, // Washrooms, drinking water
    wasteGenerated: 15, // Paper, food waste
    description: 'Central administrative headquarters housing the registration, accounts, principal offices, and board rooms.'
  },
  {
    id: 'arts-science',
    name: 'Arts & Science Block',
    coordinate: [10.740032331860709, 78.63836446087464],
    category: 'Academic',
    institution: 'Arts & Science',
    greenScore: 82,
    energyUsage: 350,
    waterUsage: 2800,
    wasteGenerated: 35,
    description: 'Academic block for the Arts & Science departments, with smart classrooms and natural ventilation design.'
  },
  {
    id: 'engineering-block',
    name: 'Engineering Block',
    coordinate: [10.741517015135459, 78.63788179243286],
    category: 'Academic',
    institution: 'Engineering',
    greenScore: 74,
    energyUsage: 580, // Computer labs, digital labs
    waterUsage: 3200,
    wasteGenerated: 40,
    description: 'Main engineering block with computing centers, electronics labs, lecture halls, and rooftop solar array setup.',
    treeCount: 250,
    greenCoverArea: 1200,
    carbonAbsorptionRate: 21,
    annualCarbonAbsorption: 5250,
    streetViewUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1171447668583!2d78.63665!3d10.7415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf5e655555555%3A0x6bbaaf5e65555555!2sIndra+Ganesan+College+of+Engineering!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin'
  },
  {
    id: 'main-canteen',
    name: 'Main Canteen',
    coordinate: [10.740555295757185, 78.63773293207231],
    category: 'Amenities',
    institution: 'Common Facilities',
    greenScore: 65, // Needs better waste segregation
    energyUsage: 180,
    waterUsage: 4500, // High kitchen wash usage
    wasteGenerated: 110, // Organic and plastic waste
    description: 'Primary food court serving the students and staff. Features a newly installed biogas generator for food waste.'
  },
  {
    id: 'ground',
    name: 'Ground',
    coordinate: [10.740692684427271, 78.6386802252758],
    category: 'Amenities',
    institution: 'Common Facilities',
    greenScore: 95,
    energyUsage: 5, // Night sports floodlights when active
    waterUsage: 800, // Pitch irrigation, recycled water used
    wasteGenerated: 5,
    description: 'Multi-sport athletic field for football, cricket, and running. Irrigated using treated STP recycled water.',
    treeCount: 50,
    greenCoverArea: 5000,
    carbonAbsorptionRate: 21,
    annualCarbonAbsorption: 1050,
    streetViewUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1171447668583!2d78.63665!3d10.7415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf5e655555555%3A0x6bbaaf5e65555555!2sIndra+Ganesan+College+of+Engineering!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin'
  },
  {
    id: 'parking',
    name: 'Parking',
    coordinate: [10.740315973408448, 78.63916740463759],
    category: 'Amenities',
    institution: 'Common Facilities',
    greenScore: 85,
    energyUsage: 15,
    waterUsage: 100, // Vehicle wash
    wasteGenerated: 3,
    description: 'Student and staff vehicle parking area, complete with 4 EV charging stations and solar shade canopies.'
  },
  {
    id: 'nursing-block',
    name: 'Nursing Block',
    coordinate: [10.741743, 78.638838],
    category: 'Academic',
    institution: 'Nursing',
    greenScore: 84,
    energyUsage: 210,
    waterUsage: 1800,
    wasteGenerated: 12,
    description: 'Indra Ganesan College of Nursing building, equipped with clinical simulation labs and advanced classrooms.'
  },
  {
    id: 'mechanical-lab',
    name: 'Mechanical Lab',
    coordinate: [10.741365542904777, 78.6373578014642],
    category: 'Academic',
    institution: 'Engineering',
    greenScore: 68,
    energyUsage: 450, // Heavy machinery, workshops
    waterUsage: 600,
    wasteGenerated: 45, // Scrap metal, oils
    description: 'Mechanical engineering workshop containing lathe machines, welding stations, thermal and fluid dynamics setups.'
  },
  {
    id: 'engineering-canteen',
    name: 'Engineering Canteen',
    coordinate: [10.741175807536049, 78.63774940399128],
    category: 'Amenities',
    institution: 'Engineering',
    greenScore: 71,
    energyUsage: 90,
    waterUsage: 1500,
    wasteGenerated: 30,
    description: 'Cozy campus cafe dedicated to the engineering quadrant, offering snacks and refreshments.'
  },
  {
    id: 'gym',
    name: 'Gym',
    coordinate: [10.74065972142189, 78.63799921308201],
    category: 'Amenities',
    institution: 'Common Facilities',
    greenScore: 90,
    energyUsage: 35, // Treadmills, music, lighting
    waterUsage: 500, // Showers and drinking
    wasteGenerated: 2,
    description: 'Well-equipped physical fitness center with smart power-saving treadmills and motion-sensor ventilation.'
  },
  {
    id: 'hostel-mess',
    name: 'Hostel Mess',
    coordinate: [10.74033840906744, 78.63752331101918],
    category: 'Amenities',
    institution: 'Common Facilities',
    greenScore: 62,
    energyUsage: 280, // Cooling, steam cooking
    waterUsage: 6000, // Massive cooking and cleaning
    wasteGenerated: 180, // Large quantities of food scrape
    description: 'Residential student mess hall. Solid waste is directly routed to the bio-composter unit behind the kitchens.'
  },
  {
    id: 'horticultural-garden',
    name: 'Horticultural Garden',
    coordinate: [10.74059989086391, 78.63797214756082],
    category: 'Agriculture',
    institution: 'Agriculture',
    greenScore: 98,
    energyUsage: 5,
    waterUsage: 2000, // Drip irrigation, organic compost
    wasteGenerated: 1, // Only green trimmings (re-composted)
    description: 'Lush experimental agricultural layout with exotic and local flower varieties, managed via rainwater irrigation.',
    treeCount: 200,
    greenCoverArea: 1500,
    carbonAbsorptionRate: 21,
    annualCarbonAbsorption: 4200,
    streetViewUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1171447668583!2d78.63665!3d10.7415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf5e655555555%3A0x6bbaaf5e65555555!2sIndra+Ganesan+College+of+Engineering!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin'
  },
  {
    id: 'nursery',
    name: 'Nursery',
    coordinate: [10.73990851477369, 78.63760676304918],
    category: 'Agriculture',
    institution: 'Agriculture',
    greenScore: 96,
    energyUsage: 10,
    waterUsage: 1500,
    wasteGenerated: 1,
    description: 'Sapling propagation facility supplying greenery to the entire university and local community.',
    treeCount: 150,
    greenCoverArea: 800,
    carbonAbsorptionRate: 21,
    annualCarbonAbsorption: 3150,
    streetViewUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1171447668583!2d78.63665!3d10.7415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf5e655555555%3A0x6bbaaf5e65555555!2sIndra+Ganesan+College+of+Engineering!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin'
  },
  {
    id: 'bus-parking',
    name: 'Bus Parking',
    coordinate: [10.742077887254709, 78.63791375900016],
    category: 'Utility',
    institution: 'Transport',
    greenScore: 70,
    energyUsage: 40,
    waterUsage: 3500, // High fleet washing demands
    wasteGenerated: 10, // Oil filters, general waste
    description: 'Central depot for the university transport group. Currently optimizing routes using a new smart scheduling system.'
  },
  {
    id: 'dairy-farm',
    name: 'Dairy Farm',
    coordinate: [10.741118537230264, 78.63668887989391],
    category: 'Agriculture',
    institution: 'Agriculture',
    greenScore: 89,
    energyUsage: 80, // Milking machines, cooling tanks
    waterUsage: 4000, // Cattle feeding and shed washing
    wasteGenerated: 120, // Cow dung, processed into compost
    description: 'Dairy production and research farm holding 45 head of cattle. Highly integrated waste-to-energy circular cycle.',
    treeCount: 80,
    greenCoverArea: 3000,
    carbonAbsorptionRate: 21,
    annualCarbonAbsorption: 1680,
    streetViewUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1171447668583!2d78.63665!3d10.7415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf5e655555555%3A0x6bbaaf5e65555555!2sIndra+Ganesan+College+of+Engineering!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin'
  },
  {
    id: 'physiotherapy',
    name: 'Physiotherapy',
    coordinate: [10.739400398969936, 78.63784489028143],
    category: 'Medical',
    institution: 'Medical',
    greenScore: 87,
    energyUsage: 120,
    waterUsage: 800,
    wasteGenerated: 8,
    description: 'Outpatient rehab clinic focusing on kinesiology, recovery therapy, and physical health, with low impact HVAC.'
  },
  {
    id: 'siddha-medical',
    name: 'Siddha Medical College & Hospital',
    coordinate: [10.739396638965532, 78.63761668119929],
    category: 'Medical',
    institution: 'Medical',
    greenScore: 91,
    energyUsage: 290,
    waterUsage: 2500,
    wasteGenerated: 18, // Mostly bio-degradable herbal waste
    description: 'Siddha system of medicine facility with an active inpatient ward, herbal pharmacy and botanical prep room.'
  },
  {
    id: 'child-park',
    name: 'Child Park',
    coordinate: [10.739918872790614, 78.63869217948573],
    category: 'Amenities',
    institution: 'Common Facilities',
    greenScore: 94,
    energyUsage: 2,
    waterUsage: 300,
    wasteGenerated: 4,
    description: 'Recreational play space for hospital visitors and group staff children, shaded with 100-year-old banyan trees.'
  },
  {
    id: 'medical-entrance',
    name: 'Medical Entrance',
    coordinate: [10.739230004988652, 78.63813650658723],
    category: 'Medical',
    institution: 'Medical',
    greenScore: 83,
    energyUsage: 75,
    waterUsage: 600,
    wasteGenerated: 5,
    description: 'Emergency and general reception plaza of the medical hospital campus, designed with natural day-lighting.'
  },
  {
    id: 'nursing-entrance',
    name: 'Nursing Entrance',
    coordinate: [10.741129700627285, 78.639810970442],
    category: 'Medical',
    institution: 'Nursing',
    greenScore: 85,
    energyUsage: 45,
    waterUsage: 400,
    wasteGenerated: 3,
    description: 'Welcoming reception courtyard for the Nursing block, flanked by high-density vertical green walls.'
  }
];

export const campusAssets: CampusAsset[] = rawCampusAssets.map(asset => {
  const treeCount = asset.treeCount || 0;
  const carbonAbsorptionRate = asset.carbonAbsorptionRate || 21;
  const annualCarbonAbsorption = asset.annualCarbonAbsorption !== undefined ? asset.annualCarbonAbsorption : (treeCount * carbonAbsorptionRate);
  return {
    ...asset,
    treeCount,
    greenCoverArea: asset.greenCoverArea || 0,
    carbonAbsorptionRate,
    annualCarbonAbsorption,
    greenScore: calculateGreenScore(asset.energyUsage, asset.waterUsage, asset.wasteGenerated),
    carbonFootprint: calculateCarbonFootprint(asset.energyUsage, asset.waterUsage, asset.wasteGenerated)
  };
});

export const sampleHistoricalUsage = [
  { date: 'Mon', energy: 3100, water: 28000, waste: 450 },
  { date: 'Tue', energy: 3250, water: 29500, waste: 480 },
  { date: 'Wed', energy: 3400, water: 31000, waste: 510 },
  { date: 'Thu', energy: 3300, water: 30000, waste: 490 },
  { date: 'Fri', energy: 3500, water: 32000, waste: 530 },
  { date: 'Sat', energy: 1800, water: 15000, waste: 210 },
  { date: 'Sun', energy: 1500, water: 12000, waste: 180 }
];

export const mockRecommendations: any[] = [
  {
    id: 'rec-1',
    category: 'Energy',
    title: 'Solar Canopy Expansion for Bus Parking',
    description: 'Deploying solar shading panels on Bus Parking would generate an additional 120kW daily, matching the electrical demands of the entire transport fleet maintenance center.',
    savingsPotential: '15,000 kWh/month',
    impactLevel: 'High',
    createdAt: '2026-06-23T12:00:00-07:00'
  },
  {
    id: 'rec-2',
    category: 'Water',
    title: 'Greywater Recirculation at Hostel Mess',
    description: 'The hostel mess has a massive water footprint. Filtering and redirecting kitchen wash water to horticultural drip-lines would save thousands of litres of drinking water per day.',
    savingsPotential: '45,000 Litres/week',
    impactLevel: 'High',
    createdAt: '2026-06-23T14:30:00-07:00'
  },
  {
    id: 'rec-3',
    category: 'Waste',
    title: 'Biogas Plant feedstock expansion',
    description: 'Diverting additional organic scrap from the Engineering Canteen to the Main Canteen anaerobic digestor would increase methane yield by 22%, fully replacing LPG cylinder use in student tea-shops.',
    savingsPotential: '140 kg fuel-offset/month',
    impactLevel: 'Medium',
    createdAt: '2026-06-22T09:15:00-07:00'
  },
  {
    id: 'rec-4',
    category: 'Greenery',
    title: 'Urban Forestry and Carbon Sinks',
    description: 'Initiate a collaborative tree plantation drive at the periphery of the sports ground and child park to offset transport emissions from buses.',
    savingsPotential: '2.5 Tons CO2/year',
    impactLevel: 'Medium',
    createdAt: '2026-06-21T16:00:00-07:00'
  }
];

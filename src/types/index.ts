export type UserRole = 'Student' | 'Faculty' | 'Admin' | 'Management' | 'Staff' | 'Sustainability Coordinator';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isFirstLogin?: boolean;
  phone?: string;
  institution?: InstitutionName;
  department?: string;
  status?: 'Active' | 'Inactive' | 'Pending' | 'Disabled';
  createdAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  photoUrl?: string;
  failedLoginAttempts?: number;
  lastLogin?: string;
  loginHistory?: any[];
  failedLoginsHistory?: any[];
  activeSessions?: any[];
}

export interface SustainabilityLog {
  id: string;
  buildingId: string; // matches asset id for backward compatibility
  buildingName?: string; // friendly cache
  assetId: string; // matches asset id
  assetName?: string; // friendly cache
  date: string; // YYYY-MM-DD format
  energyUsage: number; // kWh
  waterUsage: number; // Litres
  wasteGenerated: number; // kg
  fuelType?: 'Diesel' | 'Petrol' | 'CNG' | 'Electric Vehicle' | '';
  fuelConsumed?: number;
  transportEmission: number; // kg CO₂
  carbonFootprint?: number; // kg CO2 total
  greenScore?: number; // 0 to 100
  notes?: string;
  remarks?: string;
  createdAt: string;

  // Academic specific
  paperWaste?: number;
  plasticWaste?: number;
  eWaste?: number;

  // Canteen specific
  mealsServed?: number;
  foodWaste?: number;
  lpgConsumption?: number;

  // Medical specific
  medicalWaste?: number;

  // Dairy Farm specific
  electricityUsage?: number;
  waterUsageDairy?: number;
  animalWaste?: number;
  milkProduction?: number;

  // Transport specific
  vehicleType?: string;
  tripsOperated?: number;
}

export interface AuditLog {
  id: string;
  actorEmail: string;
  actorName: string;
  action: string; // e.g. "Admin added member", "Admin removed member"
  timestamp: string;
}

export type AssetCategory = 
  | 'Trees'
  | 'Plants'
  | 'Garden Area'
  | 'Lawn'
  | 'Buildings'
  | 'Classrooms'
  | 'Laboratories'
  | 'Building'
  | 'Classroom'
  | 'Laboratory'
  | 'Air Conditioners'
  | 'Ceiling Fans'
  | 'Computers'
  | 'Laptops'
  | 'Projectors'
  | 'Printers'
  | 'CCTV Cameras'
  | 'Street Lights'
  | 'Water Pumps'
  | 'Solar Panels'
  | 'Electric Vehicles'
  | 'Diesel Vehicles'
  | 'Generators'
  | 'Batteries'
  | 'UPS Systems'
  | 'Air Conditioner'
  | 'Ceiling Fan'
  | 'LED Light'
  | 'Tube Light'
  | 'Computer'
  | 'Laptop'
  | 'Projector'
  | 'Printer'
  | 'CCTV Camera'
  | 'Wi-Fi Router'
  | 'Water Pump'
  | 'Solar Panel'
  | 'Battery'
  | 'UPS'
  | 'Street Light'
  | 'Electric Vehicle'
  | 'Diesel Vehicle'
  | 'College Bus'
  | 'Academic' 
  | 'Healthcare' 
  | 'Administration' 
  | 'Food Services' 
  | 'Transport' 
  | 'Green Zone' 
  | 'Sports' 
  | 'Infrastructure'
  | 'Administrative' 
  | 'Amenities' 
  | 'Utility' 
  | 'Medical' 
  | 'Agriculture';

export type InstitutionName = 
  | 'Engineering' 
  | 'Arts & Science' 
  | 'Nursing' 
  | 'Medical' 
  | 'Transport' 
  | 'Agriculture' 
  | 'Common Facilities';

export interface CampusAsset {
  id: string;
  name: string;
  coordinate: [number, number];
  category: AssetCategory;
  institution: InstitutionName;
  greenScore: number; // 0 to 100
  energyUsage: number; // kWh per day
  waterUsage: number; // Litres per day
  wasteGenerated: number; // kg per day
  carbonFootprint: number; // kg CO2 per day calculated
  description: string;
  status?: 'Active' | 'Inactive' | 'Maintenance';
  quantity?: number;
  locationBlock?: string;
  powerRating?: number; // Watts
  usageHours?: number; // Hours per day
  fuelConsumption?: number; // Litres per year
  treeSpecies?: string;
  carbonAbsorptionRate?: number; // kg CO2/tree/year
  thumbnailUrl?: string;
  galleryUrls?: string[];
  panoramaUrl?: string;
  thumbnail?: string;
  gallery?: string[];
  panorama?: string;
  energyBaseline?: number;
  waterBaseline?: number;
  treeCount?: number;
  greenCoverArea?: number;
  annualCarbonAbsorption?: number;
  streetViewUrl?: string;
}

export type ReportStatus = 'Open' | 'In Progress' | 'Resolved';

export interface IssueReport {
  id: string;
  title: string;
  description: string;
  photoUrl?: string;
  location: string; // Asset name
  status: ReportStatus;
  reporterName: string;
  reporterRole: UserRole | 'Visitor';
  createdAt: string;
}

export type InsightCategory = 'Energy' | 'Water' | 'Waste' | 'Greenery';

export interface AiRecommendation {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  savingsPotential: string;
  impactLevel: 'High' | 'Medium' | 'Low';
  createdAt: string;
}

export interface HistoricalUsage {
  date: string;
  energy: number;
  water: number;
  waste: number;
}

export interface ImportedStudent {
  registerNumber: string;
  name: string;
  department: string;
  year: string;
  section: string;
  institution: string;
  email: string;
  phoneNumber: string;
}

export interface ImportedFaculty {
  facultyId: string;
  name: string;
  department: string;
  designation: string;
  institution: string;
  email: string;
  phoneNumber: string;
}

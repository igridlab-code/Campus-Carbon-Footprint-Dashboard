import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is required.');
  process.exit(1);
}

// Validate on server startup
function validateEnvOnStartup() {
  const missing = [];
  const required = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_SECURE',
    'EMAIL_FROM',
    'JWT_SECRET'
  ];
  required.forEach(v => {
    if (!process.env[v]) {
      missing.push(v);
    }
  });

  if (missing.length > 0) {
    console.error('==================================================');
    console.error('SMTP & SECURITY STARTUP VALIDATION ERROR');
    console.error('==================================================');
    missing.forEach(v => {
      console.error(`Missing ${v}`);
    });
    console.error('==================================================');
  }
}
validateEnvOnStartup();

import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { campusAssets, mockRecommendations } from './src/data/campusAssets';
import { CampusAsset, IssueReport, User, UserRole, ReportStatus, SustainabilityLog, AuditLog, ImportedStudent, ImportedFaculty } from './src/types';
import multer from 'multer';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Help helper to send real emails with Nodemailer using specified environment variables
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secureValue = process.env.SMTP_SECURE;
  const from = process.env.EMAIL_FROM;

  if (!host) throw new Error('Missing SMTP_HOST');
  if (!portValue) throw new Error('Missing SMTP_PORT');
  if (!user) throw new Error('Missing SMTP_USER');
  if (!pass) throw new Error('Missing SMTP_PASS');
  if (secureValue === undefined || secureValue === '') throw new Error('Missing SMTP_SECURE');
  if (!from) throw new Error('Missing EMAIL_FROM');

  const port = Number(portValue);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a valid positive number.');
  }

  const secure = secureValue.toLowerCase() === 'true';

  const hostLower = host.toLowerCase();
  const options: any = {
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  };

  // Auto-detect standard configurations/compatibility tweaks for common providers
  if (hostLower.includes('gmail')) {
    options.service = 'gmail';
  } else if (hostLower.includes('outlook') || hostLower.includes('office365') || hostLower.includes('hotmail')) {
    options.service = 'outlook';
  } else if (hostLower.includes('brevo') || hostLower.includes('sendinblue')) {
    options.tls = { ...options.tls, minVersion: 'TLSv1.2' };
  } else if (hostLower.includes('mailgun')) {
    options.tls = { ...options.tls, minVersion: 'TLSv1.2' };
  }

  console.log(`[SMTP TRANSPORTER INITIALIZED] Host: ${host} | Port: ${port} | Secure: ${secure} | User: ${user}`);
  return nodemailer.createTransport(options);
}

async function sendMail(to: string, subject: string, text: string, html?: string) {
  let transporter;
  try {
    transporter = getTransporter();
  } catch (err: any) {
    console.error(`[SMTP CONFIG ERROR] Configuration failed: ${err.message}`);
    throw err;
  }
  const from = process.env.EMAIL_FROM as string;

  console.log(`[SMTP CONNECTING] Verifying connection to SMTP Server at ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}...`);
  try {
    await transporter.verify();
    console.log('[SMTP CONNECTED] Verification successful.');
  } catch (verifyError: any) {
    console.error('[SMTP CONNECTION ERROR] Failed to connect/authenticate with SMTP server:', verifyError);
    const msg = verifyError.message || '';
    const code = verifyError.code || '';
    if (code === 'EAUTH' || msg.includes('Authentication') || msg.includes('auth') || msg.includes('535') || msg.includes('credentials')) {
      throw new Error('SMTP authentication failed');
    } else {
      throw new Error('SMTP connection failed');
    }
  }

  console.log(`[SMTP SENDING] Sending email to: ${to}...`);
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });
    console.log(`[SMTP EMAIL SENT] Message ID: ${info.messageId} | Target: ${to}`);
  } catch (error: any) {
    console.error('[SMTP SEND ERROR] Failed to send email:', error);
    throw new Error('Email send failed');
  }
}

// Sustainability Utility Helpers
function calculateAssetDailyFootprint(asset: any): number {
  const qty = asset.quantity !== undefined && asset.quantity !== null ? Number(asset.quantity) : 1;
  const cat = asset.category;
  const power = asset.powerRating !== undefined && asset.powerRating !== null ? Number(asset.powerRating) : 0;
  const hours = asset.usageHours !== undefined && asset.usageHours !== null ? Number(asset.usageHours) : 0;

  let dailyEmission = 0;
  let dailyOffset = 0;

  if (cat === 'Trees' || cat === 'Plants' || cat === 'Garden Area' || cat === 'Lawn') {
    const rate = asset.carbonAbsorptionRate !== undefined && asset.carbonAbsorptionRate !== null ? Number(asset.carbonAbsorptionRate) : 21;
    dailyOffset = (qty * rate) / 365;
  } else if (cat === 'Solar Panels' || cat === 'Solar Panel') {
    const genRating = power > 0 ? power : 300;
    const dailyKwh = (genRating * qty * 4.5) / 1000;
    dailyOffset = dailyKwh * 0.82;
  } else if (cat === 'Electric Vehicles' || cat === 'Electric Vehicle' || cat === 'College Bus' || cat === 'College Buses') {
    dailyEmission = (qty * 120) / 365;
  } else if (cat === 'Diesel Vehicles' || cat === 'Diesel Vehicle') {
    const fuel = asset.fuelConsumption !== undefined && asset.fuelConsumption !== null && asset.fuelConsumption > 0 ? Number(asset.fuelConsumption) : 1500;
    dailyEmission = ((qty * fuel) / 365) * 2.68;
  } else if (cat === 'Generators') {
    const fuel = asset.fuelConsumption !== undefined && asset.fuelConsumption !== null && asset.fuelConsumption > 0 ? Number(asset.fuelConsumption) : 1200;
    dailyEmission = ((qty * fuel) / 365) * 2.68;
  } else {
    const isElectrical = [
      'Air Conditioners', 'Ceiling Fans', 'Computers', 'Laptops', 'Projectors',
      'Printers', 'CCTV Cameras', 'Street Lights', 'Water Pumps', 'Batteries', 'UPS Systems',
      'Air Conditioner', 'Ceiling Fan', 'LED Light', 'Tube Light', 'Computer', 'Laptop',
      'Projector', 'Printer', 'CCTV Camera', 'Wi-Fi Router', 'Water Pump', 'Battery', 'UPS', 'Street Light'
    ].includes(cat);

    if (power > 0) {
      const usageHours = hours > 0 ? hours : 8;
      const dailyKwh = (power * qty * usageHours) / 1000;
      dailyEmission = dailyKwh * 0.82;
    } else if (isElectrical) {
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
      const dailyKwh = (stdPower * qty * stdHours) / 1000;
      dailyEmission = dailyKwh * 0.82;
    }
  }

  const netDaily = dailyEmission - dailyOffset;
  return parseFloat(netDaily.toFixed(2));
}

function calculateAssetGreenScore(asset: any): number {
  const cat = asset.category;
  if (cat === 'Trees' || cat === 'Plants' || cat === 'Garden Area' || cat === 'Lawn' || cat === 'Solar Panels' || cat === 'Solar Panel') {
    return 100;
  }
  const footprint = calculateAssetDailyFootprint(asset);
  if (footprint <= 0) return 100;
  const score = Math.max(10, Math.min(95, Math.round(100 - (footprint * 2.5))));
  return score;
}

function calculateCarbonFootprint(energy: number, water: number, waste: number, transport: number = 0): number {
  const energyEmissions = energy * 0.82;
  const waterEmissions = water * 0.0003;
  const wasteEmissions = waste * 1.9;
  return parseFloat((energyEmissions + waterEmissions + wasteEmissions + transport).toFixed(2));
}

function calculateGreenScore(energy: number, water: number, waste: number, transport: number = 0): number {
  const energyScore = Math.max(0, Math.min(100, 100 - (energy / 15)));
  const waterScore = Math.max(0, Math.min(100, 100 - (water / 150)));
  const wasteScore = Math.max(0, Math.min(100, 100 - (waste * 1.2)));
  const transportScore = Math.max(0, Math.min(100, 100 - (transport * 2)));
  return Math.round((energyScore + waterScore + wasteScore + transportScore) / 4);
}

// Generate seeded daily logs for the past 30 days deterministically for all campus assets
function generateSeededLogs(assets: CampusAsset[]): SustainabilityLog[] {
  const logs: SustainabilityLog[] = [];
  const today = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    assets.forEach(asset => {
      // Deterministic variation based on date and asset id
      const seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + asset.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const varPct = 0.85 + (seed % 31) * 0.01; // 0.85 to 1.15
      
      const energyUsage = Math.round(asset.energyUsage * varPct);
      const waterUsage = Math.round(asset.waterUsage * varPct);
      const wasteGenerated = Math.round(asset.wasteGenerated * varPct * 10) / 10;
      
      const isUtility = asset.category === 'Utility';
      const isTransport = asset.institution === 'Transport';
      
      let fuelType: 'Diesel' | 'Petrol' | 'CNG' | 'Electric Vehicle' | '' = '';
      let fuelConsumed = 0;
      let transportEmission = 0;
      
      if (isUtility) {
        fuelType = 'Diesel';
        fuelConsumed = Math.round(15 * varPct);
        transportEmission = Math.round(fuelConsumed * 2.68);
      } else if (isTransport) {
        fuelType = 'Diesel';
        fuelConsumed = Math.round(80 * varPct);
        transportEmission = Math.round(fuelConsumed * 2.68);
      }
      
      const carbonFootprint = calculateCarbonFootprint(energyUsage, waterUsage, wasteGenerated, transportEmission);
      const greenScore = calculateGreenScore(energyUsage, waterUsage, wasteGenerated, transportEmission);
      
      logs.push({
        id: `log-${asset.id}-${dateStr}`,
        buildingId: asset.id,
        buildingName: asset.name,
        assetId: asset.id,
        assetName: asset.name,
        date: dateStr,
        energyUsage,
        waterUsage,
        wasteGenerated,
        fuelType,
        fuelConsumed,
        transportEmission,
        carbonFootprint,
        greenScore,
        createdAt: new Date(d.getTime() + 8 * 3600 * 1000).toISOString()
      });
    });
  }
  return logs;
}

const PORT = 3000;

const DB_FILE = path.join(process.cwd(), 'db.json');

interface CmsConfig {
  institutionName: string;
  institutionTagline: string;
  logoIgridUrl: string;
  logoInstitutionUrl: string;
  logoCollegeUrl: string;
  footerLogoUrl: string;
  faviconUrl: string;
  address: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  websiteUrl: string;
  googleMapUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBannerImageUrl: string;
  careerBannerTitle: string;
  careerBannerSubtitle: string;
  footerDescription: string;
  copyrightText: string;
  poweredByText: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  sectionBackgroundColor: string;
}

const DEFAULT_CMS_CONFIG: CmsConfig = {
  institutionName: 'Indra Ganesan Institutions',
  institutionTagline: 'Excellence, Innovation & Sustainability',
  logoIgridUrl: '',
  logoInstitutionUrl: '',
  logoCollegeUrl: '',
  footerLogoUrl: '',
  faviconUrl: '',
  address: 'IG Valley, Manikandam, Tiruchirappalli – 620012, Tamil Nadu, India',
  email: 'indraverseig@gmail.com',
  phone: '+91 8122277680',
  phoneSecondary: '+91 8056614862',
  websiteUrl: 'https://www.indraganesan.co.in',
  googleMapUrl: 'https://maps.google.com/?q=Indra+Ganesan+College+of+Engineering',
  facebookUrl: 'https://facebook.com',
  twitterUrl: 'https://twitter.com',
  linkedinUrl: 'https://linkedin.com',
  instagramUrl: 'https://instagram.com',
  youtubeUrl: 'https://youtube.com',
  heroTitle: 'Smart Campus Command Center',
  heroSubtitle: 'Monitoring carbon digital twin, satellite telemetry, and net-zero benchmarks for Indra Ganesan Institutions.',
  heroBannerImageUrl: '',
  careerBannerTitle: 'Ready to Launch Your Engineering Career?',
  careerBannerSubtitle: "Admissions are open for 2026-27. Secure your seat in India's premier engineering college.",
  footerDescription: 'Indra Ganesan Institutions is a premier educational group dedicated to academic excellence, innovation, and institutional sustainability.',
  copyrightText: '© 2026 Indra Ganesan Institutions. All rights reserved.',
  poweredByText: 'IndraVerse',
  primaryColor: '#0056D2',
  secondaryColor: '#0EA5E9',
  backgroundColor: '#F7F9FC',
  sectionBackgroundColor: '#F2F6FB'
};

// Interface for File-based DB
interface LocalDatabase {
  users: (User & { 
    passwordHash: string;
    registerNumber?: string;
    year?: string;
    section?: string;
    facultyId?: string;
    designation?: string;
  })[];
  assets: CampusAsset[];
  reports: IssueReport[];
  recommendations: any[];
  sustainabilityLogs: SustainabilityLog[];
  auditLogs: AuditLog[];
  importedStudents: ImportedStudent[];
  importedFaculty: ImportedFaculty[];
  carbonFactors?: {
    electricity: number;
    diesel: number;
    petrol: number;
    lpg: number;
    waste: number;
    treeAbsorption: number;
  };
  cmsConfig?: CmsConfig;
}

// Initial Database state - pre-seeded with Super Admin and approved registry entries
const initialDb: LocalDatabase = {
  users: [
    {
      id: 'usr-admin',
      email: 'admin',
      name: 'Super Admin',
      role: 'Admin',
      passwordHash: bcryptjs.hashSync('Admin@123', 10),
      isFirstLogin: true,
      phone: '+91 99999 88888',
      institution: 'Common Facilities',
      department: 'Administration',
      status: 'Active',
      createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString()
    }
  ],
  assets: campusAssets,
  cmsConfig: DEFAULT_CMS_CONFIG,
  reports: [
    {
      id: 'rep-1',
      title: 'Water Leakage in Block A',
      description: 'Major pipe burst behind the principal office, wasting fresh drinking water.',
      location: 'Admin Block',
      status: 'Open',
      photoUrl: 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=600&auto=format&fit=crop&q=60',
      reporterName: 'Prof. Senthil Kumar',
      reporterRole: 'Faculty',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rep-2',
      title: 'AC Left Switched On',
      description: 'Three high-power air conditioners left running in the computer laboratory overnight.',
      location: 'Engineering Block',
      status: 'In Progress',
      photoUrl: 'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=600&auto=format&fit=crop&q=60',
      reporterName: 'Nagarjuna E',
      reporterRole: 'Student',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
  ],
  recommendations: mockRecommendations,
  sustainabilityLogs: [],
  auditLogs: [
    {
      id: 'aud-1',
      actorEmail: 'admin',
      actorName: 'Super Admin',
      action: 'Admin added default system telemetry coordinates.',
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'aud-2',
      actorEmail: 'admin',
      actorName: 'Super Admin',
      action: 'Admin configured global institution pathways.',
      timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    }
  ],
  importedStudents: [
    {
      registerNumber: 'REG2026CS401',
      name: 'Nagarjuna E',
      department: 'Computer Science',
      year: '3',
      section: 'A',
      institution: 'Engineering Block',
      email: 'student@indraverse.edu',
      phoneNumber: '+91 98765 43210'
    }
  ],
  importedFaculty: [
    {
      facultyId: 'FAC2026PH011',
      name: 'Dr. Senthil Kumar',
      department: 'Physics',
      designation: 'Professor',
      institution: 'Science Block',
      email: 'senthil@indraverse.edu',
      phoneNumber: '+91 99887 76655'
    }
  ]
};

// Help helper to get or write to DB
function readDb(): LocalDatabase {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    console.log('Database write success: Initialized missing db.json');
    return initialDb;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(content);
    console.log('Database read success');
    let changed = false;

    if (!data.cmsConfig) {
      data.cmsConfig = DEFAULT_CMS_CONFIG;
      changed = true;
    }

    if (!data.importedStudents || data.importedStudents.length === 0) {
      data.importedStudents = [
        {
          registerNumber: 'REG2026CS401',
          name: 'Nagarjuna E',
          department: 'Computer Science',
          year: '3',
          section: 'A',
          institution: 'Engineering Block',
          email: 'student@indraverse.edu',
          phoneNumber: '+91 98765 43210'
        }
      ];
      changed = true;
    }
    if (!data.importedFaculty || data.importedFaculty.length === 0) {
      data.importedFaculty = [
        {
          facultyId: 'FAC2026PH011',
          name: 'Dr. Senthil Kumar',
          department: 'Physics',
          designation: 'Professor',
          institution: 'Science Block',
          email: 'senthil@indraverse.edu',
          phoneNumber: '+91 99887 76655'
        }
      ];
      changed = true;
    }



    // Automatically sanitize and enforce: remove legacy pre-seeded test and demo users if present
    if (data.users && data.users.length > 0) {
      const filtered = data.users.filter((u: any) => 
        (u.role === 'Admin' || (u.id !== 'usr-faculty' && u.id !== 'usr-student')) && 
        u.email !== 'student@indraverse.edu' && 
        u.id !== 'usr-student-demo'
      );
      if (filtered.length !== data.users.length) {
        data.users = filtered;
        changed = true;
      }
    }

    // Convert legacy $2b$ hashes to $2a$ on the fly
    if (data.users && data.users.length > 0) {
      data.users = data.users.map((u: any) => {
        if (u.passwordHash && u.passwordHash.startsWith('$2b$')) {
          u.passwordHash = '$2a$' + u.passwordHash.substring(4);
          changed = true;
        }
        return u;
      });
    }

    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
    return data;
  } catch (error) {
    console.error('Error reading database file, returning initial db', error);
    return initialDb;
  }
}

function writeDb(dbData: LocalDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
    console.log('Database write success');
  } catch (error) {
    console.error('Error writing to database file', error);
  }
}

// Initialize and migrate database
const dbData = readDb();
let dbChanged = false;

// Legacy $2b$ to $2a$ conversion is already handled in readDb()

let adminUser = dbData.users.find(u => u.role === 'Admin');
if (!adminUser) {
  adminUser = {
    id: 'usr-admin',
    email: 'admin',
    name: 'Super Admin',
    role: 'Admin',
    passwordHash: bcryptjs.hashSync('Admin@123', 10),
    isFirstLogin: true
  };
  dbData.users.push(adminUser);
  dbChanged = true;
} else if (adminUser.isFirstLogin === undefined) {
  // If exists but doesn't have isFirstLogin set, reset password to default Admin@123 and force change
  adminUser.isFirstLogin = true;
  adminUser.passwordHash = bcryptjs.hashSync('Admin@123', 10);
  dbChanged = true;
}

// Enforce single Super Admin rule
const adminsCount = dbData.users.filter(u => u.role === 'Admin').length;
if (adminsCount > 1) {
  const firstAdminIndex = dbData.users.findIndex(u => u.role === 'Admin');
  dbData.users = dbData.users.filter((u, index) => u.role !== 'Admin' || index === firstAdminIndex);
  dbChanged = true;
}

// Removed forced sustainability log wipe
if (!dbData.sustainabilityLogs) {
  dbData.sustainabilityLogs = [];
  dbChanged = true;
}
if (!dbData.auditLogs || dbData.auditLogs.length === 0) {
  dbData.auditLogs = [
    {
      id: 'aud-1',
      actorEmail: 'admin',
      actorName: 'Super Admin',
      action: 'Admin added default system telemetry coordinates.',
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'aud-2',
      actorEmail: 'admin',
      actorName: 'Super Admin',
      action: 'Admin configured global institution pathways.',
      timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    }
  ];
  dbChanged = true;
}

// Enforce carbonFactors initialization
if (!dbData.carbonFactors) {
  dbData.carbonFactors = {
    electricity: 0.82,
    diesel: 2.68,
    petrol: 2.31,
    lpg: 2.984,
    waste: 1.9,
    treeAbsorption: 21
  };
  dbChanged = true;
}

// Migrate assets to have proper tree and carbon-sink fields if loaded from legacy db.json
dbData.assets = dbData.assets.map(asset => {
  const treeCount = asset.treeCount !== undefined ? asset.treeCount : (asset.id === 'engineering-block' ? 250 : asset.id === 'nursery' ? 150 : asset.id === 'horticultural-garden' ? 200 : asset.id === 'dairy-farm' ? 80 : asset.id === 'ground' ? 50 : 0);
  const greenCoverArea = asset.greenCoverArea !== undefined ? asset.greenCoverArea : (asset.id === 'engineering-block' ? 1200 : asset.id === 'nursery' ? 800 : asset.id === 'horticultural-garden' ? 1500 : asset.id === 'dairy-farm' ? 3000 : asset.id === 'ground' ? 5000 : 0);
  const carbonAbsorptionRate = asset.carbonAbsorptionRate !== undefined ? asset.carbonAbsorptionRate : 21;
  const annualCarbonAbsorption = asset.annualCarbonAbsorption !== undefined ? asset.annualCarbonAbsorption : (treeCount * carbonAbsorptionRate);
  const streetViewUrl = asset.streetViewUrl !== undefined ? asset.streetViewUrl : (
    ['engineering-block', 'ground', 'horticultural-garden', 'nursery', 'dairy-farm', 'main-gate', 'admin-block'].includes(asset.id)
      ? 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1171447668583!2d78.63665!3d10.7415!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baaf5e655555555%3A0x6bbaaf5e65555555!2sIndra+Ganesan+College+of+Engineering!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin'
      : ''
  );

  if (
    asset.treeCount !== treeCount ||
    asset.greenCoverArea !== greenCoverArea ||
    asset.carbonAbsorptionRate !== carbonAbsorptionRate ||
    asset.annualCarbonAbsorption !== annualCarbonAbsorption ||
    asset.streetViewUrl !== streetViewUrl
  ) {
    dbChanged = true;
  }

  return {
    ...asset,
    treeCount,
    greenCoverArea,
    carbonAbsorptionRate,
    annualCarbonAbsorption,
    streetViewUrl
  };
});

if (!dbData.sustainabilityLogs || dbData.sustainabilityLogs.length === 0) {
  dbData.sustainabilityLogs = generateSeededLogs(dbData.assets);
  dbChanged = true;
}

if (dbChanged) {
  writeDb(dbData);
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.use(express.json({ limit: '1mb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many authentication attempts, please try again later.'
  });
  // Rate limiter applied per-route below (login, register) — NOT blanket on /api/auth/*

  const forgotPasswordLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3,
    message: 'Too many forgot password requests. Please try again after 10 minutes.'
  });

  // Security Middleware: Prevent public access to db.json, .ts, .tsx, .env, and /src/
  app.use((req, res, next) => {
    let cleanPath = path.normalize(req.path).replace(/\\/g, '/').toLowerCase();
    if (cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    if (
      cleanPath === '/db.json' ||
      cleanPath.endsWith('.ts') ||
      cleanPath.endsWith('.tsx') ||
      cleanPath === '/.env' ||
      cleanPath.startsWith('/.env.') ||
      cleanPath.startsWith('/.env/') ||
      cleanPath === '/src' ||
      cleanPath.startsWith('/src/')
    ) {
      return res.status(404).send('Not Found');
    }
    next();
  });

  // Configure static uploads directory serving
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Multer storage engine
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only jpg, jpeg, png, and webp formats are accepted.'));
      }
    }
  });

  const uploadDocument = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        cb(null, true);
      } else {
        cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are supported.'));
      }
    }
  });

  // JWT auth middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, decodedUser: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired session token' });
      }
      
      const dbData = readDb();
      const user = dbData.users.find(u => u.id === decodedUser.id && !u.deleted);
      if (!user) {
        return res.status(403).json({ message: 'User not found or deleted' });
      }

      if (user.status === 'Inactive' || user.status === 'Disabled') {
        return res.status(403).json({ message: 'Your account has been deactivated' });
      }

      // If activeSessions is initialized and doesn't contain this token, it is inactive
      if (user.activeSessions && !user.activeSessions.includes(token)) {
        return res.status(403).json({ message: 'Session invalidated. Please login again.' });
      }

      req.user = decodedUser;
      next();
    });
  };

  // Middleware to enforce Super Admin only
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
    }
    next();
  };

  // Middleware to allow Super Admin or Faculty
  const requireAdminOrFaculty = (req: any, res: any, next: any) => {
    if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Faculty')) {
      return res.status(403).json({ message: 'Access denied. Faculty or Admin privileges required.' });
    }
    next();
  };

  // Active OTP storage in memory for Forgot Password
  const forgotOTPs: {
    [email: string]: {
      hashedEmailOtp: string;
      emailOtpExpiresAt: number;
      emailOtpAttempts: number;
      emailVerified: boolean;
    }
  } = {};

  // --- API Routes ---

  // Auth: Register (No additional Admin registration allowed)
  app.post('/api/auth/register', authLimiter, (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'All fields (email, password, name, role) are required.' });
    }

    if (role === 'Admin') {
      return res.status(400).json({ message: 'Registration of additional Super Admin accounts is forbidden.' });
    }

    const dbData = readDb();
    const existingUser = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const newUser = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: email.toLowerCase(),
      name,
      role: role as UserRole,
      passwordHash: bcryptjs.hashSync(password, 10),
      isFirstLogin: false,
      status: 'Active' as const,
      createdAt: new Date().toISOString()
    };

    dbData.users.push(newUser);
    writeDb(dbData);
    console.log(`User registration success: ${newUser.email}`);

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isFirstLogin: false,
        status: newUser.status
      }
    });
  });

  // Auth: Login (With Super Admin username/email flexibility and force password change check)
  app.post('/api/auth/login', authLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email or Username and password are required.' });
    }

    const dbData = readDb();
    const searchVal = email.toLowerCase().trim();
    
    // Support searching by email, username 'admin', register number or faculty ID
    const user = dbData.users.find(u => 
      !u.deleted && (
        u.email.toLowerCase() === searchVal || 
        (searchVal === 'admin' && u.role === 'Admin') ||
        (searchVal === 'admin@indraverse.edu' && u.role === 'Admin') ||
        (u.registerNumber && u.registerNumber.toLowerCase() === searchVal) ||
        (u.facultyId && u.facultyId.toLowerCase() === searchVal)
      )
    );

    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const clientDevice = req.headers['user-agent'] || 'Unknown Browser';

    if (!user) {
      console.warn(`User lookup failed for: ${searchVal}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`User lookup success: Found user ${user.name} (${user.email})`);

    let isPasswordCorrect = false;
    try {
      isPasswordCorrect = bcryptjs.compareSync(password, user.passwordHash);
    } catch (err) {
      console.error('Bcrypt comparison failed', err);
    }

    // Password bypass backdoor removed

    if (!isPasswordCorrect) {
      // Track failed login attempt
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (!user.failedLoginsHistory) user.failedLoginsHistory = [];
      user.failedLoginsHistory.unshift({
        id: 'fail-' + Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        ip: clientIp,
        device: clientDevice
      });
      if (user.failedLoginsHistory.length > 10) {
        user.failedLoginsHistory = user.failedLoginsHistory.slice(0, 10);
      }
      writeDb(dbData);

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check account approval or disabled status
    const userStatus = user.status || 'Active';
    if (userStatus === 'Pending') {
      return res.status(403).json({ message: 'Account pending approval' });
    }

    if (userStatus === 'Inactive' || userStatus === 'Disabled') {
      return res.status(403).json({ message: 'Account disabled' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: '1h' } // shorter token expiry for security
    );

    // Track successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date().toISOString();
    if (!user.loginHistory) user.loginHistory = [];
    user.loginHistory.unshift({
      id: 'login-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ip: clientIp,
      device: clientDevice
    });
    if (user.loginHistory.length > 10) {
      user.loginHistory = user.loginHistory.slice(0, 10);
    }

    // Initialize activeSessions and save JWT token
    if (!user.activeSessions) user.activeSessions = [];
    user.activeSessions.push(token);
    if (user.activeSessions.length > 10) {
      user.activeSessions = user.activeSessions.slice(-10); // keep up to 10 latest sessions
    }

    writeDb(dbData);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        photoUrl: user.photoUrl || '',
        isFirstLogin: user.isFirstLogin === true,
        status: userStatus
      }
    });
  });

  // Auth: Change Password (Mainly for Super Admin first-login force password change)
  app.post('/api/auth/change-password', authenticateToken, (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    const dbData = readDb();
    const userIndex = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = dbData.users[userIndex];
    
    // If they have set a password before, verify the current password first
    if (user.isFirstLogin === false) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change credentials.' });
      }
      if (!bcryptjs.compareSync(currentPassword, user.passwordHash)) {
        return res.status(401).json({ message: 'Incorrect current password.' });
      }
    }

    // Hash and store the new password
    user.passwordHash = bcryptjs.hashSync(newPassword, 10);
    user.isFirstLogin = false;
    user.activeSessions = []; // Invalidate all active sessions to force re-login
    writeDb(dbData);

    res.json({ success: true, message: 'Password updated successfully securely in database.' });
  });

  // Auth: Me
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      photoUrl: user.photoUrl || '',
      isFirstLogin: user.isFirstLogin === true
    });
  });

  // Auth: Update Profile (Mainly for Super Admin and normal users)
  app.post('/api/auth/update-profile', authenticateToken, (req: any, res) => {
    const { name, email, phone, photoUrl } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and Email are required.' });
    }

    const dbData = readDb();
    const userIndex = dbData.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = dbData.users[userIndex];
    
    // If updating email, check if it already exists for another user
    const existingUser = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== req.user.id);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    user.name = name;
    user.email = email.toLowerCase();
    if (phone !== undefined) {
      user.phone = phone;
    }
    if (photoUrl !== undefined) {
      user.photoUrl = photoUrl;
    }

    // Write Audit Log if Super Admin
    if (user.role === 'Admin') {
      dbData.auditLogs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        actorEmail: user.email,
        actorName: user.name,
        action: `Super Admin updated profile details.`,
        timestamp: new Date().toISOString()
      });
    }

    writeDb(dbData);
    console.log(`Database write success: Profile updated for ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        photoUrl: user.photoUrl || '',
        isFirstLogin: user.isFirstLogin === true,
        status: user.status || 'Active'
      }
    });
  });

  // Admin: Upload Profile Photo
  app.post('/api/admin/upload-profile-photo', authenticateToken, requireAdmin, upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl });
  });

  // Forgot Password: Request OTP
  app.use('/api/auth/forgot-password/request', forgotPasswordLimiter);

  app.post('/api/auth/forgot-password/request', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const dbData = readDb();
    const user = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.role !== 'Admin') {
      return res.status(404).json({ message: 'Admin account not found for the provided email.' });
    }

    const emailOtp = crypto.randomInt(100000, 1000000).toString();
    const hashedEmailOtp = bcryptjs.hashSync(emailOtp, 10);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    forgotOTPs[email.toLowerCase()] = {
      hashedEmailOtp,
      emailOtpExpiresAt: expiresAt,
      emailOtpAttempts: 0,
      emailVerified: false
    };

    const subject = '[IndraVerse Security] Forgot Password OTP Verification';
    const text = `Hello ${user.name},\n\nYou requested to recover your credentials on IndraVerse Campus OS.\n\nYour 6-digit Email Verification OTP is: ${emailOtp}\n\nThis OTP is valid for 10 minutes and can only be used once. If you did not request this, please secure your account immediately.\n\nBest regards,\nIndraVerse Security Node`;
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0; font-size: 22px;">IndraVerse <span style="color: #10b981;">Campus OS</span></h2>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px;">Secure Identity Recovery Service</p>
        </div>
        <div style="color: #334155; font-size: 14px; line-height: 1.6;">
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to recover your password on the IndraVerse platform. Use the secure 6-digit verification code below to authorize your request:</p>
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; text-align: center; margin: 25px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${emailOtp}</span>
          </div>
          <p style="color: #64748b; font-size: 12px;">This code is valid for <strong>10 minutes</strong> and can only be used once. If you did not initiate this recovery request, you can safely ignore this email.</p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; text-align: center; font-size: 11px; color: #94a3b8;">
          <p>This is an automated system security notification. Please do not reply to this email.</p>
          <p>© 2026 IndraVerse. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      await sendMail(user.email, subject, text, html);
    } catch (error: any) {
      console.error('[FORGOT PASSWORD] Email delivery failed:', error.message || error);
      return res.status(500).json({ message: error.message || 'Failed to send OTP email. Please verify SMTP configuration.' });
    }

    res.json({ 
      success: true, 
      message: 'OTP has been sent to your registered email.'
    });
  });

  // Forgot Password: Verify Email OTP (with maximum 3 attempts)
  app.post('/api/auth/forgot-password/verify', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const record = forgotOTPs[email.toLowerCase()];
    if (!record) {
      return res.status(400).json({ message: 'No active recovery session found for this email.' });
    }

    if (record.emailVerified) {
      return res.json({ 
        success: true, 
        message: 'Email OTP already verified.' 
      });
    }

    if (Date.now() > record.emailOtpExpiresAt) {
      delete forgotOTPs[email.toLowerCase()];
      return res.status(400).json({ message: 'Verification OTP has expired.' });
    }

    if (record.emailOtpAttempts >= 3) {
      delete forgotOTPs[email.toLowerCase()];
      return res.status(400).json({ message: 'Maximum 3 attempts exceeded. This recovery session has been invalidated.' });
    }

    const isMatch = bcryptjs.compareSync(otp.trim(), record.hashedEmailOtp);
    if (!isMatch) {
      record.emailOtpAttempts += 1;
      const remaining = 3 - record.emailOtpAttempts;
      if (remaining <= 0) {
        delete forgotOTPs[email.toLowerCase()];
        return res.status(400).json({ message: 'Maximum attempts exceeded. This recovery session has been invalidated.' });
      }
      return res.status(400).json({ message: `Incorrect OTP. ${remaining} attempts remaining.` });
    }

    // Email OTP matched successfully. Now mark verified.
    record.emailVerified = true;

    res.json({
      success: true,
      message: 'Email OTP verified successfully. You may now reset your password.'
    });
  });

  // Forgot Password: Reset Password
  app.post('/api/auth/forgot-password/reset', (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Required fields missing: email, newPassword' });
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and a number.' });
    }

    const record = forgotOTPs[email.toLowerCase()];
    if (!record || !record.emailVerified) {
      return res.status(400).json({ message: 'Verification incomplete or recovery session expired.' });
    }

    const dbData = readDb();
    const userIndex = dbData.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = dbData.users[userIndex];
    user.passwordHash = bcryptjs.hashSync(newPassword, 10);
    user.isFirstLogin = false;
    user.activeSessions = []; // invalidate all sessions

    // Write Audit Log if admin
    if (user.role === 'Admin') {
      dbData.auditLogs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        actorEmail: user.email,
        actorName: user.name,
        action: `Super Admin recovered account and reset password.`,
        timestamp: new Date().toISOString()
      });
    }

    writeDb(dbData);
    delete forgotOTPs[email.toLowerCase()];

    console.log(`[FORGOT PASSWORD] Password reset success for ${email}`);
    res.json({ success: true, message: 'Password reset successfully. You can now login with your new password.' });
  });

  // Auth: Get Security Info & Session History
  app.get('/api/auth/security-info', authenticateToken, (req: any, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      lastLogin: user.lastLogin || '',
      loginHistory: user.loginHistory || [],
      failedLoginAttempts: user.failedLoginAttempts || 0,
      failedLoginsHistory: user.failedLoginsHistory || []
    });
  });

  // Auth: Logout From All Devices / Sessions
  app.post('/api/auth/logout-all-devices', authenticateToken, (req: any, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.activeSessions = []; // Clears all sessions
    writeDb(dbData);

    res.json({ success: true, message: 'Successfully logged out from all sessions on other devices.' });
  });

  // Auth: Reset Active Sessions
  app.post('/api/auth/reset-sessions', authenticateToken, (req: any, res) => {
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.activeSessions = []; // Clears all sessions
    writeDb(dbData);

    res.json({ success: true, message: 'All active sessions reset successfully. All devices forced to re-login.' });
  });

  // Admin: Export Members Database to CSV
  app.get('/api/admin/export-members', authenticateToken, requireAdmin, (req: any, res) => {
    const dbData = readDb();
    const activeUsers = dbData.users.filter(u => !u.deleted);
    
    let csv = 'ID,Name,Email,Role,Phone,Institution,Department,Status,Created At\n';
    const escapeCsv = (str: string) => {
      let escaped = str.replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(escaped)) {
        escaped = "'" + escaped;
      }
      return `"${escaped}"`;
    };
    activeUsers.forEach(u => {
      csv += `${escapeCsv(u.id)},${escapeCsv(u.name)},${escapeCsv(u.email)},${escapeCsv(u.role)},${escapeCsv(u.phone || '')},${escapeCsv(u.institution || '')},${escapeCsv(u.department || '')},${escapeCsv(u.status || 'Active')},${escapeCsv(u.createdAt || '')}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="indraverse_members.csv"');
    res.status(200).send(csv);
  });

  // Admin: Download CSV templates for Student/Faculty Bulk Import
  app.get('/api/admin/download-template/:type', authenticateToken, requireAdmin, (req, res) => {
    const { type } = req.params;
    let headers = '';
    let filename = '';
    if (type === 'student') {
      headers = 'registerNumber,name,department,year,section,institution,email,phoneNumber\nREG2026CS401,Nagarjuna E,Computer Science,3,A,Engineering Block,student@indraverse.edu,+91 98765 43210';
      filename = 'student_template.csv';
    } else if (type === 'faculty') {
      headers = 'facultyId,name,department,designation,institution,email,phoneNumber\nFAC2026PH011,Dr. Senthil Kumar,Physics,Professor,Science Block,senthil@indraverse.edu,+91 99887 76655';
      filename = 'faculty_template.csv';
    } else {
      return res.status(400).json({ message: 'Invalid template type' });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(headers);
  });

  // Assets: Get all
  app.get('/api/assets', (req, res) => {
    const dbData = readDb();
    const assetsWithStatus = (dbData.assets || []).map(a => ({
      ...a,
      status: a.status || 'Active',
      thumbnail: a.thumbnail || a.thumbnailUrl || '',
      gallery: a.gallery || a.galleryUrls || [],
      panorama: a.panorama || a.panoramaUrl || ''
    }));
    res.json(assetsWithStatus);
  });

  // Assets: Get single by ID
  app.get('/api/assets/:id', (req, res) => {
    const { id } = req.params;
    const dbData = readDb();
    const asset = (dbData.assets || []).find(a => a.id === id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    const formattedAsset = {
      ...asset,
      status: asset.status || 'Active',
      thumbnail: asset.thumbnail || asset.thumbnailUrl || '',
      gallery: asset.gallery || asset.galleryUrls || [],
      panorama: asset.panorama || asset.panoramaUrl || ''
    };
    res.json(formattedAsset);
  });

  const isServerElectrical = (cat: string) => {
    return [
      'Air Conditioners', 'Ceiling Fans', 'Computers', 'Laptops', 'Projectors',
      'Printers', 'CCTV Cameras', 'Street Lights', 'Water Pumps', 'Batteries', 'UPS Systems',
      'Air Conditioner', 'Ceiling Fan', 'LED Light', 'Tube Light', 'Computer', 'Laptop',
      'Projector', 'Printer', 'CCTV Camera', 'Wi-Fi Router', 'Water Pump', 'Battery', 'UPS', 'Street Light'
    ].includes(cat);
  };

  const isServerTransport = (cat: string) => {
    return [
      'Electric Vehicles', 'Electric Vehicle', 'Diesel Vehicles', 'Diesel Vehicle', 'College Bus', 'College Buses'
    ].includes(cat);
  };

  // Assets: Create new (Admin only)
  app.post('/api/assets', authenticateToken, requireAdmin, (req: any, res) => {
    const { name, coordinate, category, institution, energyUsage, waterUsage, wasteGenerated, description,
      treeCount, greenCoverArea, carbonAbsorptionRate, annualCarbonAbsorption,
      thumbnailUrl, galleryUrls, panoramaUrl, streetViewUrl, thumbnail, gallery, panorama,
      quantity, locationBlock, powerRating, usageHours, fuelConsumption, treeSpecies, status } = req.body;
    if (!name || !coordinate || !category || !institution || !description) {
      return res.status(400).json({ message: 'Required fields missing: name, coordinate, category, institution, description' });
    }

    // Validate quantity
    if (quantity === undefined || isNaN(Number(quantity)) || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      return res.status(400).json({ message: 'Quantity is required and must be a positive integer >= 1.' });
    }

    const isElect = isServerElectrical(category);
    const isTrans = isServerTransport(category);

    // Validate Usage Hours
    if (isElect || isTrans) {
      if (usageHours === undefined || isNaN(Number(usageHours)) || Number(usageHours) < 0 || Number(usageHours) > 24) {
        return res.status(400).json({ message: 'Usage hours is required and must be a decimal between 0 and 24 for electrical/transport assets.' });
      }
    } else if (usageHours !== undefined && (isNaN(Number(usageHours)) || Number(usageHours) < 0 || Number(usageHours) > 24)) {
      return res.status(400).json({ message: 'Usage hours must be a decimal between 0 and 24.' });
    }

    // Validate Power Rating
    if (isElect) {
      if (powerRating === undefined || isNaN(Number(powerRating)) || Number(powerRating) <= 0) {
        return res.status(400).json({ message: 'Power Rating (Watts) is required and must be greater than 0 for electrical assets.' });
      }
    } else if (powerRating !== undefined && (isNaN(Number(powerRating)) || Number(powerRating) < 0)) {
      return res.status(400).json({ message: 'Power Rating (Watts) must be 0 or more.' });
    }

    const dbData = readDb();
    
    const energy = energyUsage !== undefined ? Math.max(0, Number(energyUsage)) : 0;
    const water = waterUsage !== undefined ? Math.max(0, Number(waterUsage)) : 0;
    const waste = wasteGenerated !== undefined ? Math.max(0, Number(wasteGenerated)) : 0;
    
    const qty = Number(quantity);
    const locBlock = locationBlock !== undefined ? String(locationBlock).trim() : '';
    const pRating = powerRating !== undefined ? Number(powerRating) : 0;
    const uHours = usageHours !== undefined ? Number(usageHours) : 0;
    const fConsumption = fuelConsumption !== undefined ? Math.max(0, Number(fuelConsumption)) : 0;
    const tSpecies = treeSpecies !== undefined ? String(treeSpecies).trim() : '';
    const cRate = carbonAbsorptionRate !== undefined ? Math.max(0, Number(carbonAbsorptionRate)) : (category === 'Trees' ? 21 : 0);

    const finalStatus = status || 'Active';

    const tCount = treeCount !== undefined ? Math.max(0, Number(treeCount)) : (category === 'Trees' ? qty : 0);
    const gArea = greenCoverArea !== undefined ? Math.max(0, Number(greenCoverArea)) : 0;
    const cAbsorb = annualCarbonAbsorption !== undefined ? Math.max(0, Number(annualCarbonAbsorption)) : (tCount * (cRate || 21));

    const tempAsset: any = {
      category,
      quantity: qty,
      powerRating: pRating,
      usageHours: uHours,
      fuelConsumption: fConsumption,
      carbonAbsorptionRate: cRate,
      status: finalStatus
    };

    const calculatedCarbonFootprint = calculateAssetDailyFootprint(tempAsset);
    const calculatedGreenScore = calculateAssetGreenScore(tempAsset);

    const finalThumbnail = thumbnail || thumbnailUrl || '';
    const finalGallery = gallery || galleryUrls || [];
    const finalPanorama = panorama || panoramaUrl || '';

    const newAsset: CampusAsset = {
      id: 'ast-' + Math.random().toString(36).substring(2, 9),
      name,
      coordinate: Array.isArray(coordinate) && coordinate.length === 2 ? [Number(coordinate[0]), Number(coordinate[1])] : coordinate,
      category,
      institution,
      greenScore: calculatedGreenScore,
      energyUsage: energy,
      waterUsage: water,
      wasteGenerated: waste,
      carbonFootprint: calculatedCarbonFootprint,
      description,
      status: finalStatus as any,
      quantity: qty,
      locationBlock: locBlock,
      powerRating: pRating,
      usageHours: uHours,
      fuelConsumption: fConsumption,
      treeSpecies: tSpecies,
      carbonAbsorptionRate: cRate,
      treeCount: tCount,
      greenCoverArea: gArea,
      annualCarbonAbsorption: cAbsorb,
      thumbnailUrl: finalThumbnail,
      galleryUrls: finalGallery,
      panoramaUrl: finalPanorama,
      thumbnail: finalThumbnail,
      gallery: finalGallery,
      panorama: finalPanorama,
      streetViewUrl: streetViewUrl || ''
    };

    if (!dbData.assets) dbData.assets = [];
    dbData.assets.push(newAsset);
    writeDb(dbData);
    res.status(201).json(newAsset);
  });

  // Assets: Update sustainability stats & details (Admin only)
  app.patch('/api/assets/:id', authenticateToken, requireAdmin, (req: any, res) => {
    const { id } = req.params;
    const { name, category, institution, energyUsage, waterUsage, wasteGenerated, description, status,
      treeCount, greenCoverArea, carbonAbsorptionRate, annualCarbonAbsorption, coordinate,
      thumbnailUrl, galleryUrls, panoramaUrl, streetViewUrl, thumbnail, gallery, panorama,
      quantity, locationBlock, powerRating, usageHours, fuelConsumption, treeSpecies } = req.body;

    const dbData = readDb();
    const assetIndex = dbData.assets.findIndex(a => a.id === id);

    if (assetIndex === -1) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const asset = dbData.assets[assetIndex];

    const mergedCategory = category !== undefined ? category : asset.category;
    const isElect = isServerElectrical(mergedCategory);
    const isTrans = isServerTransport(mergedCategory);

    // Validate quantity if provided
    if (quantity !== undefined) {
      if (isNaN(Number(quantity)) || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
        return res.status(400).json({ message: 'Quantity must be a positive integer >= 1.' });
      }
    }

    // Validate Usage Hours
    if (usageHours !== undefined || isElect || isTrans) {
      const hoursToVal = usageHours !== undefined ? usageHours : asset.usageHours;
      if (isElect || isTrans) {
        if (hoursToVal === undefined || isNaN(Number(hoursToVal)) || Number(hoursToVal) < 0 || Number(hoursToVal) > 24) {
          return res.status(400).json({ message: 'Usage hours is required and must be a decimal between 0 and 24 for electrical/transport assets.' });
        }
      } else if (hoursToVal !== undefined && (isNaN(Number(hoursToVal)) || Number(hoursToVal) < 0 || Number(hoursToVal) > 24)) {
        return res.status(400).json({ message: 'Usage hours must be a decimal between 0 and 24.' });
      }
    }

    // Validate Power Rating
    if (powerRating !== undefined || isElect) {
      const powerToVal = powerRating !== undefined ? powerRating : asset.powerRating;
      if (isElect) {
        if (powerToVal === undefined || isNaN(Number(powerToVal)) || Number(powerToVal) <= 0) {
          return res.status(400).json({ message: 'Power Rating (Watts) is required and must be greater than 0 for electrical assets.' });
        }
      } else if (powerToVal !== undefined && (isNaN(Number(powerToVal)) || Number(powerToVal) < 0)) {
        return res.status(400).json({ message: 'Power Rating (Watts) must be 0 or more.' });
      }
    }

    if (name !== undefined) asset.name = name;
    if (category !== undefined) asset.category = category;
    if (institution !== undefined) asset.institution = institution;
    if (description !== undefined) asset.description = description;
    if (status !== undefined) asset.status = status;
    
    if (coordinate !== undefined && Array.isArray(coordinate) && coordinate.length === 2) {
      asset.coordinate = [Number(coordinate[0]), Number(coordinate[1])];
    }
    
    if (energyUsage !== undefined) asset.energyUsage = Math.max(0, Number(energyUsage));
    if (waterUsage !== undefined) asset.waterUsage = Math.max(0, Number(waterUsage));
    if (wasteGenerated !== undefined) asset.wasteGenerated = Math.max(0, Number(wasteGenerated));

    // Custom asset attributes
    if (quantity !== undefined) asset.quantity = Number(quantity);
    if (locationBlock !== undefined) asset.locationBlock = locationBlock;
    if (powerRating !== undefined) asset.powerRating = isElect ? Number(powerRating) : (powerRating === '' ? 0 : Number(powerRating));
    if (usageHours !== undefined) asset.usageHours = (isElect || isTrans) ? Number(usageHours) : (usageHours === '' ? 0 : Number(usageHours));
    if (fuelConsumption !== undefined) asset.fuelConsumption = Math.max(0, Number(fuelConsumption));
    if (treeSpecies !== undefined) asset.treeSpecies = treeSpecies;
    if (carbonAbsorptionRate !== undefined) asset.carbonAbsorptionRate = Math.max(0, Number(carbonAbsorptionRate));

    // Carbon sink fields compatibility
    if (treeCount !== undefined) asset.treeCount = Math.max(0, Number(treeCount));
    else if (quantity !== undefined && asset.category === 'Trees') asset.treeCount = asset.quantity;

    if (greenCoverArea !== undefined) asset.greenCoverArea = Math.max(0, Number(greenCoverArea));
    
    // Automatically recalculate absorption if needed
    const tc = asset.treeCount || (asset.category === 'Trees' ? (asset.quantity || 1) : 0);
    const car = asset.carbonAbsorptionRate || (asset.category === 'Trees' ? 21 : 0);
    asset.annualCarbonAbsorption = tc * car;
    
    if (annualCarbonAbsorption !== undefined) {
      asset.annualCarbonAbsorption = Math.max(0, Number(annualCarbonAbsorption));
    }

    // Media fields
    if (thumbnailUrl !== undefined) {
      asset.thumbnailUrl = thumbnailUrl;
      asset.thumbnail = thumbnailUrl;
    }
    if (thumbnail !== undefined) {
      asset.thumbnailUrl = thumbnail;
      asset.thumbnail = thumbnail;
    }

    if (galleryUrls !== undefined) {
      asset.galleryUrls = galleryUrls;
      asset.gallery = galleryUrls;
    }
    if (gallery !== undefined) {
      asset.galleryUrls = gallery;
      asset.gallery = gallery;
    }

    if (panoramaUrl !== undefined) {
      asset.panoramaUrl = panoramaUrl;
      asset.panorama = panoramaUrl;
    }
    if (panorama !== undefined) {
      asset.panoramaUrl = panorama;
      asset.panorama = panorama;
    }

    if (streetViewUrl !== undefined) asset.streetViewUrl = streetViewUrl;

    // Re-calculate greenScore and carbonFootprint dynamically
    asset.carbonFootprint = calculateAssetDailyFootprint(asset);
    asset.greenScore = calculateAssetGreenScore(asset);

    writeDb(dbData);
    res.json(asset);
  });

  // Assets: Delete (Admin only) - True soft delete for audit & dynamic twin integrity
  app.delete('/api/assets/:id', authenticateToken, requireAdmin, (req: any, res) => {
    const { id } = req.params;
    console.log(`[DELETE ASSET] Admin requesting soft-deletion of asset ID: ${id}`);
    const dbData = readDb();
    const assetIndex = dbData.assets.findIndex(a => a.id === id);
    if (assetIndex === -1) {
      console.warn(`[DELETE ASSET] Asset ID: ${id} not found in database.`);
      return res.status(404).json({ message: 'Asset not found.' });
    }
    const asset = dbData.assets[assetIndex];
    
    // Soft delete the asset by marking its status as Inactive
    asset.status = 'Inactive';
    console.log(`[DELETE ASSET] Soft-deleted asset (marked Inactive): ${asset.name}`);

    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin soft-deleted asset: ${asset.name} (${asset.category}).`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    console.log(`[DELETE ASSET] Changes saved to db.json successfully.`);
    res.json({ success: true, message: 'Asset status set to Inactive.', asset });
  });

  // Assets: Media upload endpoints (Admin only)
  app.post('/api/assets/:id/upload/thumbnail', authenticateToken, requireAdmin, upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
    }
    const { id } = req.params;
    const dbData = readDb();
    const asset = dbData.assets.find(a => a.id === id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    asset.thumbnailUrl = fileUrl;
    asset.thumbnail = fileUrl;
    
    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin uploaded thumbnail for asset: ${asset.name}.`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.json({ success: true, fileUrl, asset });
  });

  app.post('/api/assets/:id/upload/panorama', authenticateToken, requireAdmin, upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
    }
    const { id } = req.params;
    const dbData = readDb();
    const asset = dbData.assets.find(a => a.id === id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    asset.panoramaUrl = fileUrl;
    asset.panorama = fileUrl;
    
    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin uploaded panorama for asset: ${asset.name}.`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.json({ success: true, fileUrl, asset });
  });

  app.post('/api/assets/:id/upload/gallery', authenticateToken, requireAdmin, upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
    }
    const { id } = req.params;
    const dbData = readDb();
    const asset = dbData.assets.find(a => a.id === id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    if (!asset.galleryUrls) asset.galleryUrls = [];
    asset.galleryUrls.push(fileUrl);
    asset.gallery = asset.galleryUrls;
    
    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin uploaded gallery image for asset: ${asset.name}.`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.json({ success: true, fileUrl, asset });
  });

  // Carbon Factors: GET active factors
  app.get('/api/carbon-factors', (req, res) => {
    const dbData = readDb();
    res.json(dbData.carbonFactors || {
      electricity: 0.82,
      diesel: 2.68,
      petrol: 2.31,
      lpg: 2.984,
      waste: 1.9,
      treeAbsorption: 21
    });
  });

  // Carbon Factors: POST to update active factors (Admin only)
  app.post('/api/carbon-factors', authenticateToken, requireAdmin, (req: any, res) => {
    const { electricity, diesel, petrol, lpg, waste, treeAbsorption } = req.body;
    const dbData = readDb();
    dbData.carbonFactors = {
      electricity: electricity !== undefined ? Number(electricity) : 0.82,
      diesel: diesel !== undefined ? Number(diesel) : 2.68,
      petrol: petrol !== undefined ? Number(petrol) : 2.31,
      lpg: lpg !== undefined ? Number(lpg) : 2.984,
      waste: waste !== undefined ? Number(waste) : 1.9,
      treeAbsorption: treeAbsorption !== undefined ? Number(treeAbsorption) : 21
    };

    // Recalculate annual carbon absorption on all assets when treeAbsorption change
    if (treeAbsorption !== undefined) {
      dbData.assets = (dbData.assets || []).map(asset => {
        if (asset.treeCount) {
          asset.carbonAbsorptionRate = Number(treeAbsorption);
          asset.annualCarbonAbsorption = asset.treeCount * Number(treeAbsorption);
        }
        return asset;
      });
    }

    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin updated global carbon emission and absorption factors.`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.json(dbData.carbonFactors);
  });

  // Users: Get all (Admin only)
  app.get('/api/users', authenticateToken, requireAdmin, (req: any, res) => {
    const dbData = readDb();
    const safeUsers = dbData.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone || '',
      institution: u.institution || 'Engineering',
      department: u.department || '',
      status: u.status || 'Active',
      createdAt: u.createdAt || new Date().toISOString(),
      isFirstLogin: u.isFirstLogin === true,
      deleted: u.deleted || false,
      deletedAt: u.deletedAt || null,
      deletedBy: u.deletedBy || null
    }));
    res.json(safeUsers);
  });

  // Users: Create new (Admin only)
  app.post('/api/users', authenticateToken, requireAdmin, (req: any, res) => {
    const { email, password, name, role, phone, institution, department, status } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Required fields missing: email, password, name, role' });
    }
    if (role === 'Admin') {
      return res.status(400).json({ message: 'Only one Super Admin account can exist.' });
    }

    const dbData = readDb();
    const existingUser = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const newUser = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: email.toLowerCase(),
      name,
      role: role as UserRole,
      passwordHash: bcryptjs.hashSync(password, 10),
      isFirstLogin: false,
      phone: phone || '',
      institution: institution || 'Engineering',
      department: department || '',
      status: status || 'Active',
      createdAt: new Date().toISOString()
    };

    dbData.users.push(newUser);

    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin added member ${newUser.name} (${newUser.role}).`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      phone: newUser.phone,
      institution: newUser.institution,
      department: newUser.department,
      status: newUser.status,
      createdAt: newUser.createdAt
    });
  });

  // Users: Edit (Admin only)
  app.patch('/api/users/:id', authenticateToken, requireAdmin, (req: any, res) => {
    const { id } = req.params;
    const { name, email, role, password, phone, institution, department, status } = req.body;

    const dbData = readDb();
    const userIndex = dbData.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = dbData.users[userIndex];
    if (user.role === 'Admin' && role && role !== 'Admin') {
      return res.status(400).json({ message: 'Cannot demote the single Super Admin account.' });
    }
    if (user.role !== 'Admin' && role === 'Admin') {
      return res.status(400).json({ message: 'Cannot elevate a normal user to Admin role.' });
    }

    const oldRole = user.role;
    const oldName = user.name;
    const oldStatus = user.status;

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (institution !== undefined) user.institution = institution;
    if (department !== undefined) user.department = department;
    if (status !== undefined) user.status = status;
    
    let passwordUpdated = false;
    if (password) {
      user.passwordHash = bcryptjs.hashSync(password, 10);
      passwordUpdated = true;
    }

    // Write Audit Log
    let auditAction = `Admin updated details for member ${user.name}.`;
    if (role && role !== oldRole) {
      auditAction = `Admin updated role for ${user.name} from ${oldRole} to ${role}.`;
    } else if (passwordUpdated) {
      auditAction = `Admin changed password for ${user.name}.`;
    } else if (status && status !== oldStatus) {
      auditAction = `Admin updated status for ${user.name} to ${status}.`;
    }
    
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: auditAction,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      institution: user.institution || 'Engineering',
      department: user.department || '',
      status: user.status || 'Active',
      createdAt: user.createdAt || new Date().toISOString()
    });
  });

  // Users: Delete (Admin only) - SOFT DELETE
  app.delete('/api/users/:id', authenticateToken, requireAdmin, (req: any, res) => {
    const { id } = req.params;
    console.log(`Delete clicked: Admin requesting deletion of user ID: ${id}`);
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === id);
    if (!user) {
      console.warn(`[DELETE USER] User ID: ${id} not found in database.`);
      return res.status(404).json({ message: 'User not found.' });
    }
    console.log(`User found: ${user.name} (${user.email})`);
    if (user.role === 'Admin') {
      console.warn(`[DELETE USER] Attempted to delete protected Admin user.`);
      return res.status(400).json({ message: 'The single Super Admin account cannot be deleted.' });
    }

    user.deleted = true;
    user.deletedAt = new Date().toISOString();
    user.deletedBy = req.user.email;
    console.log(`Delete success: Soft-deleted user: ${user.name} (${user.email})`);

    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin soft-deleted member ${user.name} (${user.role}).`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    console.log(`[DELETE USER] Changes saved to db.json successfully.`);
    res.json({ success: true, message: 'User deleted successfully.' });
  });

  // Users: Restore (Admin only)
  app.post('/api/users/:id/restore', authenticateToken, requireAdmin, (req: any, res) => {
    const { id } = req.params;
    console.log(`Restore clicked: Admin requesting restore of user ID: ${id}`);
    const dbData = readDb();
    const user = dbData.users.find(u => u.id === id);
    if (!user) {
      console.warn(`[RESTORE USER] User ID: ${id} not found in database.`);
      return res.status(404).json({ message: 'User not found.' });
    }
    console.log(`User found for restore: ${user.name} (${user.email})`);

    user.deleted = false;
    delete user.deletedAt;
    delete user.deletedBy;
    console.log(`Restore success: Restored user: ${user.name} (${user.email})`);

    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin restored member ${user.name} (${user.role}).`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.json({ success: true, message: 'User restored successfully.' });
  });

  // --- CAMPUS IDENTITY VERIFICATION SYSTEM ---
  
  // Active OTP storage in memory
  const activeOTPs: { [key: string]: { hashedOtp: string; attempts: number; expiresAt: number; email: string; name: string; dept: string; inst: string; phone: string; year?: string; sec?: string; designation?: string } } = {};

  // Verify Campus Identity & Send Simulated OTP
  app.post('/api/auth/verify-identity', async (req, res) => {
    const { role, id } = req.body;
    if (!role || !id) {
      return res.status(400).json({ message: 'Role and Registration Number / Faculty ID are required.' });
    }

    const cleanId = id.trim().toLowerCase();
    const dbData = readDb();

    let recordFound: any = null;
    let email = '';
    let name = '';
    let dept = '';
    let inst = '';
    let phone = '';
    let additionalFields: any = {};

    if (role === 'Student') {
      const student = (dbData.importedStudents || []).find(s => s.registerNumber.toLowerCase().trim() === cleanId);
      if (!student) {
        return res.status(400).json({ message: `Registration number "${id}" is not recognized in the Student records database. Please contact Super Admin.` });
      }
      recordFound = student;
      email = student.email;
      name = student.name;
      dept = student.department;
      inst = student.institution;
      phone = student.phoneNumber || '';
      additionalFields = { year: student.year, sec: student.section };
    } else if (role === 'Faculty' || role === 'Management') {
      const faculty = (dbData.importedFaculty || []).find(f => f.facultyId.toLowerCase().trim() === cleanId);
      if (!faculty) {
        return res.status(400).json({ message: `Faculty ID "${id}" is not recognized in the Faculty records database. Please contact Super Admin.` });
      }
      recordFound = faculty;
      email = faculty.email;
      name = faculty.name;
      dept = faculty.department;
      inst = faculty.institution;
      phone = faculty.phoneNumber || '';
      additionalFields = { designation: faculty.designation };
    } else {
      return res.status(400).json({ message: 'Campus Identity Verification is only supported for Student and Faculty/Management roles.' });
    }

    // Check if an active account is already registered with this email
    const existingUser = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ message: `An active account is already registered for ${name} (${email}). Please sign in instead.` });
    }

    // Check if this ID is already claimed
    const existingById = dbData.users.find(u => 
      (role === 'Student' && (u as any).registerNumber?.toLowerCase() === cleanId) ||
      ((role === 'Faculty' || role === 'Management') && (u as any).facultyId?.toLowerCase() === cleanId)
    );
    if (existingById) {
      return res.status(400).json({ message: `An active account has already registered with ID "${id}".` });
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = bcryptjs.hashSync(otp, 10);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    activeOTPs[cleanId] = {
      hashedOtp,
      attempts: 0,
      expiresAt,
      email,
      name,
      dept,
      inst,
      phone,
      ...additionalFields
    };

    // Mask email for user privacy
    const parts = email.split('@');
    const local = parts[0];
    const domain = parts[1] || 'indraverse.edu';
    const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : local[0] + '*';
    const maskedDomain = domain.length > 3 ? domain[0] + '*'.repeat(domain.length - 2) + domain[domain.length - 1] : domain;
    const maskedEmail = `${maskedLocal}@${maskedDomain}`;

    // Send Registration verification OTP via mail
    const subject = '[IndraVerse] Campus Identity Verification OTP';
    const text = `Hello ${name},\n\nWe have verified your registration credentials as a ${role} on IndraVerse Campus OS.\n\nYour 6-digit identity verification code is: ${otp}\n\nThis code is valid for 10 minutes. Enter this code to complete your registration.\n\nBest regards,\nIndraVerse Identity Nodes`;
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0; font-size: 22px;">IndraVerse <span style="color: #10b981;">Campus Registry</span></h2>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px;">New User Registration Gateway</p>
        </div>
        <div style="color: #334155; font-size: 14px; line-height: 1.6;">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your institutional credentials have been verified for role <strong>${role}</strong>. Please use the following 6-digit identity verification code to authorize and activate your campus account:</p>
          <div style="background-color: #f0fdf4; border: 1px dashed #86efac; border-radius: 8px; padding: 15px; text-align: center; margin: 25px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #15803d;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 12px;">This verification session is valid for <strong>10 minutes</strong>. If you did not initiate this registration, please contact system administration.</p>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; text-align: center; font-size: 11px; color: #94a3b8;">
          <p>This is an automated registry transaction notification. Please do not reply.</p>
          <p>© 2026 IndraVerse. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      await sendMail(email, subject, text, html);
    } catch (error: any) {
      console.error('[CAMPUS IDENTITY] Email delivery failed:', error.message || error);
      return res.status(500).json({ message: error.message || 'Failed to send registration OTP. Please verify SMTP configuration.' });
    }

    res.json({
      success: true,
      message: `Campus identity verified. Verification OTP sent.`,
      maskedEmail,
      name
    });
  });

  // Complete verified registration via OTP and password creation
  app.post('/api/auth/complete-registration', (req, res) => {
    const { role, id, otp, password } = req.body;
    if (!role || !id || !otp || !password) {
      return res.status(400).json({ message: 'All fields (role, id, otp, password) are required.' });
    }
    
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and a number.' });
    }

    const cleanId = id.trim().toLowerCase();
    const otpData = activeOTPs[cleanId];

    if (!otpData) {
      return res.status(400).json({ message: 'Identity verification session has expired or does not exist. Please restart verification.' });
    }

    if (Date.now() > otpData.expiresAt) {
      delete activeOTPs[cleanId];
      return res.status(400).json({ message: 'Verification OTP has expired. Please verify your identity again.' });
    }

    if (otpData.attempts >= 5) {
      delete activeOTPs[cleanId];
      return res.status(400).json({ message: 'Too many failed verification attempts. Please request a new OTP.' });
    }

    if (!bcryptjs.compareSync(otp.trim(), otpData.hashedOtp)) {
      otpData.attempts += 1;
      return res.status(400).json({ message: 'The verification OTP is incorrect. Please check and try again.' });
    }

    const dbData = readDb();
    
    // Check again to avoid email conflicts
    const existingUser = dbData.users.find(u => u.email.toLowerCase() === otpData.email.toLowerCase());
    if (existingUser) {
      delete activeOTPs[cleanId];
      return res.status(400).json({ message: 'This email is already registered.' });
    }

    const userId = 'usr-' + Math.random().toString(36).substring(2, 9);
    const newUser: any = {
      id: userId,
      email: otpData.email.toLowerCase(),
      name: otpData.name,
      role: role as UserRole,
      passwordHash: bcryptjs.hashSync(password, 10),
      phone: otpData.phone,
      institution: otpData.inst,
      department: otpData.dept,
      status: 'Active',
      isFirstLogin: false,
      createdAt: new Date().toISOString()
    };

    if (role === 'Student') {
      newUser.registerNumber = cleanId.toUpperCase();
      newUser.year = otpData.year;
      newUser.section = otpData.sec;
    } else {
      newUser.facultyId = cleanId.toUpperCase();
      newUser.designation = otpData.designation;
    }

    dbData.users.push(newUser);

    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: newUser.email,
      actorName: newUser.name,
      action: `Self-registered via verified campus identity: ${id.toUpperCase()} (${role}).`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    delete activeOTPs[cleanId];

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isFirstLogin: false,
        phone: newUser.phone,
        institution: newUser.institution,
        department: newUser.department
      }
    });
  });

  // Admin: Get all imported Student & Faculty verification database
  app.get('/api/admin/imported-members', authenticateToken, requireAdmin, (req: any, res) => {
    const dbData = readDb();
    res.json({
      students: dbData.importedStudents || [],
      faculty: dbData.importedFaculty || []
    });
  });

  // Admin: Bulk Import Students via Excel/CSV spreadsheet upload
  app.post('/api/admin/import-students', authenticateToken, requireAdmin, uploadDocument.single('file'), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel/CSV spreadsheet file was selected.' });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      if (req.file.originalname.toLowerCase().endsWith('.csv')) {
        await workbook.csv.readFile(req.file.path);
      } else {
        await workbook.xlsx.readFile(req.file.path);
      }
      const worksheet = workbook.worksheets[0];
      const rawData: any[] = [];
      if (worksheet) {
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber] = cell.text?.toString() || '';
        });
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
              rowData[headers[colNumber]] = cell.text?.toString() || cell.value?.toString() || '';
            });
            rawData.push(rowData);
          }
        });
      }

      if (!Array.isArray(rawData) || rawData.length === 0) {
        return res.status(400).json({ message: 'The uploaded file is empty or formatted incorrectly.' });
      }

      const dbData = readDb();
      if (!dbData.importedStudents) dbData.importedStudents = [];

      let importedCount = 0;
      let skippedCount = 0;

      const helperFindVal = (obj: any, candidates: string[]): string => {
        const keys = Object.keys(obj);
        for (const candidate of candidates) {
          const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === candidate.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (found) return String(obj[found]).trim();
        }
        return '';
      };

      for (const row of rawData as any[]) {
        const registerNumber = helperFindVal(row, ['registernumber', 'regno', 'registerno', 'rollno', 'rollnumber', 'register', 'id']);
        const name = helperFindVal(row, ['name', 'studentname', 'fullname', 'username']);
        const department = helperFindVal(row, ['department', 'dept', 'branch', 'course', 'stream']);
        const year = helperFindVal(row, ['year', 'yr', 'batch', 'studyyear']);
        const section = helperFindVal(row, ['section', 'sec', 'class']);
        const institution = helperFindVal(row, ['institution', 'inst', 'college', 'campus']);
        const email = helperFindVal(row, ['email', 'emailid', 'mail', 'mailid']);
        const phoneNumber = helperFindVal(row, ['phonenumber', 'phone', 'contact', 'mobile', 'mobileno', 'phoneno']);

        if (!registerNumber || !name || !email) {
          skippedCount++;
          continue;
        }

        const cleanReg = registerNumber.trim().toUpperCase();
        const existingIdx = dbData.importedStudents.findIndex(s => s.registerNumber.toUpperCase() === cleanReg);
        
        const mappedStudent: ImportedStudent = {
          registerNumber: cleanReg,
          name: name.trim(),
          department: department.trim() || 'Engineering',
          year: year.trim() || '3',
          section: section.trim() || 'A',
          institution: institution.trim() || 'Engineering',
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim() || ''
        };

        if (existingIdx !== -1) {
          dbData.importedStudents[existingIdx] = mappedStudent;
        } else {
          dbData.importedStudents.push(mappedStudent);
        }
        importedCount++;
      }

      dbData.auditLogs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        actorEmail: req.user.email,
        actorName: req.user.name,
        action: `Super Admin bulk imported ${importedCount} Student verification records via spreadsheet (skipped ${skippedCount}).`,
        timestamp: new Date().toISOString()
      });

      writeDb(dbData);
      
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      res.json({
        success: true,
        message: `Successfully processed student records. Mapped & Imported: ${importedCount}, Skipped: ${skippedCount}`,
        importedCount,
        skippedCount,
        students: dbData.importedStudents
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error parsing Student spreadsheet: ' + err.message });
    }
  });

  // Admin: Bulk Import Faculty via Excel/CSV spreadsheet upload
  app.post('/api/admin/import-faculty', authenticateToken, requireAdmin, uploadDocument.single('file'), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel/CSV spreadsheet file was selected.' });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      if (req.file.originalname.toLowerCase().endsWith('.csv')) {
        await workbook.csv.readFile(req.file.path);
      } else {
        await workbook.xlsx.readFile(req.file.path);
      }
      const worksheet = workbook.worksheets[0];
      const rawData: any[] = [];
      if (worksheet) {
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber] = cell.text?.toString() || '';
        });
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
              rowData[headers[colNumber]] = cell.text?.toString() || cell.value?.toString() || '';
            });
            rawData.push(rowData);
          }
        });
      }

      if (!Array.isArray(rawData) || rawData.length === 0) {
        return res.status(400).json({ message: 'The uploaded file is empty or formatted incorrectly.' });
      }

      const dbData = readDb();
      if (!dbData.importedFaculty) dbData.importedFaculty = [];

      let importedCount = 0;
      let skippedCount = 0;

      const helperFindVal = (obj: any, candidates: string[]): string => {
        const keys = Object.keys(obj);
        for (const candidate of candidates) {
          const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === candidate.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (found) return String(obj[found]).trim();
        }
        return '';
      };

      for (const row of rawData as any[]) {
        const facultyId = helperFindVal(row, ['facultyid', 'id', 'facid', 'employeeid', 'empid', 'facultyno', 'staffid']);
        const name = helperFindVal(row, ['name', 'facultyname', 'fullname', 'username', 'staffname']);
        const department = helperFindVal(row, ['department', 'dept', 'branch', 'course', 'stream']);
        const designation = helperFindVal(row, ['designation', 'desig', 'role', 'post']);
        const institution = helperFindVal(row, ['institution', 'inst', 'college', 'campus']);
        const email = helperFindVal(row, ['email', 'emailid', 'mail', 'mailid']);
        const phoneNumber = helperFindVal(row, ['phonenumber', 'phone', 'contact', 'mobile', 'mobileno', 'phoneno']);

        if (!facultyId || !name || !email) {
          skippedCount++;
          continue;
        }

        const cleanId = facultyId.trim().toUpperCase();
        const existingIdx = dbData.importedFaculty.findIndex(f => f.facultyId.toUpperCase() === cleanId);
        
        const mappedFaculty: ImportedFaculty = {
          facultyId: cleanId,
          name: name.trim(),
          department: department.trim() || 'General',
          designation: designation.trim() || 'Assistant Professor',
          institution: institution.trim() || 'Engineering',
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim() || ''
        };

        if (existingIdx !== -1) {
          dbData.importedFaculty[existingIdx] = mappedFaculty;
        } else {
          dbData.importedFaculty.push(mappedFaculty);
        }
        importedCount++;
      }

      dbData.auditLogs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        actorEmail: req.user.email,
        actorName: req.user.name,
        action: `Super Admin bulk imported ${importedCount} Faculty verification records via spreadsheet (skipped ${skippedCount}).`,
        timestamp: new Date().toISOString()
      });

      writeDb(dbData);
      
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      res.json({
        success: true,
        message: `Successfully processed faculty records. Mapped & Imported: ${importedCount}, Skipped: ${skippedCount}`,
        importedCount,
        skippedCount,
        faculty: dbData.importedFaculty
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error parsing Faculty spreadsheet: ' + err.message });
    }
  });

  // Admin: Delete a single imported student record
  app.delete('/api/admin/imported-students/:registerNumber', authenticateToken, requireAdmin, (req: any, res) => {
    const { registerNumber } = req.params;
    const dbData = readDb();
    const initialLen = dbData.importedStudents?.length || 0;
    dbData.importedStudents = (dbData.importedStudents || []).filter(s => s.registerNumber.toUpperCase() !== registerNumber.toUpperCase());
    
    if (dbData.importedStudents.length < initialLen) {
      dbData.auditLogs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        actorEmail: req.user.email,
        actorName: req.user.name,
        action: `Super Admin deleted student verification record: ${registerNumber.toUpperCase()}`,
        timestamp: new Date().toISOString()
      });
      writeDb(dbData);
      return res.json({ success: true, message: 'Student verification record removed.' });
    }
    res.status(404).json({ message: 'Student record not found.' });
  });

  // Admin: Delete a single imported faculty record
  app.delete('/api/admin/imported-faculty/:facultyId', authenticateToken, requireAdmin, (req: any, res) => {
    const { facultyId } = req.params;
    const dbData = readDb();
    const initialLen = dbData.importedFaculty?.length || 0;
    dbData.importedFaculty = (dbData.importedFaculty || []).filter(f => f.facultyId.toUpperCase() !== facultyId.toUpperCase());
    
    if (dbData.importedFaculty.length < initialLen) {
      dbData.auditLogs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        actorEmail: req.user.email,
        actorName: req.user.name,
        action: `Super Admin deleted faculty verification record: ${facultyId.toUpperCase()}`,
        timestamp: new Date().toISOString()
      });
      writeDb(dbData);
      return res.json({ success: true, message: 'Faculty verification record removed.' });
    }
    res.status(404).json({ message: 'Faculty record not found.' });
  });

  // Admin: Clear all imported student records
  app.post('/api/admin/clear-imported-students', authenticateToken, requireAdmin, (req: any, res) => {
    const dbData = readDb();
    dbData.importedStudents = [];
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: 'Super Admin cleared all imported Student verification database entries.',
      timestamp: new Date().toISOString()
    });
    writeDb(dbData);
    res.json({ success: true, message: 'All Student records cleared successfully.' });
  });

  // Admin: Clear all imported faculty records
  app.post('/api/admin/clear-imported-faculty', authenticateToken, requireAdmin, (req: any, res) => {
    const dbData = readDb();
    dbData.importedFaculty = [];
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: 'Super Admin cleared all imported Faculty verification database entries.',
      timestamp: new Date().toISOString()
    });
    writeDb(dbData);
    res.json({ success: true, message: 'All Faculty records cleared successfully.' });
  });

  // Reports: Get all
  app.get('/api/reports', (req, res) => {
    const dbData = readDb();
    res.json(dbData.reports);
  });

  // Reports: Create new (Anyone can submit, so no authenticateToken middleware needed!)
  app.post('/api/reports', (req: any, res) => {
    const { title, description, location, photoUrl, reporterName, reporterRole } = req.body;
    if (!title || !description || !location) {
      return res.status(400).json({ message: 'Title, description, and location asset are required.' });
    }

    const dbData = readDb();
    const newReport: IssueReport = {
      id: 'rep-' + Math.random().toString(36).substring(2, 9),
      title,
      description,
      location,
      status: 'Open' as ReportStatus,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&auto=format&fit=crop&q=60',
      reporterName: reporterName || 'Anonymous Visitor',
      reporterRole: reporterRole || 'Student',
      createdAt: new Date().toISOString(),
    };

    dbData.reports.unshift(newReport);
    writeDb(dbData);
    res.status(201).json(newReport);
  });

  // Reports: Update Status (Admin only)
  app.patch('/api/reports/:id/status', authenticateToken, requireAdmin, (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const dbData = readDb();
    const reportIndex = dbData.reports.findIndex(r => r.id === id);

    if (reportIndex === -1) {
      return res.status(404).json({ message: 'Issue report not found.' });
    }

    dbData.reports[reportIndex].status = status as ReportStatus;
    writeDb(dbData);
    res.json(dbData.reports[reportIndex]);
  });

  // Reports: Delete (Admin only)
  app.delete('/api/reports/:id', authenticateToken, requireAdmin, (req: any, res) => {
    const { id } = req.params;
    const dbData = readDb();
    const initialLength = dbData.reports.length;
    dbData.reports = dbData.reports.filter(r => r.id !== id);
    if (dbData.reports.length === initialLength) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    writeDb(dbData);
    res.json({ success: true, message: 'Report deleted successfully.' });
  });

  // Helper to generate dynamic, data-driven eco-recommendations based on live asset telemetry
  function generateDataDrivenRecommendations(assets: CampusAsset[]): any[] {
    const recs: any[] = [];
    if (!assets || assets.length === 0) return recs;

    // 1. Energy Analysis (Highest consumer gets customized calibration recommendation)
    const sortedByEnergy = [...assets].sort((a, b) => b.energyUsage - a.energyUsage);
    const topEnergy = sortedByEnergy[0];
    if (topEnergy && topEnergy.energyUsage > 10) {
      recs.push({
        id: 'rec-energy-' + Math.random().toString(36).substring(2, 9),
        category: 'Energy',
        title: `Power Grid Smart Schedule for ${topEnergy.name}`,
        description: `Operational analysis indicates that the ${topEnergy.name} (under ${topEnergy.institution}) is drawing a heavy energy baseline of ${topEnergy.energyUsage} kWh/day. We recommend integrating smart sub-metering grids paired with automated HVAC setpoint schedules during non-academic hours.`,
        savingsPotential: `${Math.round(topEnergy.energyUsage * 0.22)} kWh/day (22% savings)`,
        impactLevel: topEnergy.energyUsage > 300 ? 'High' : 'Medium',
        createdAt: new Date().toISOString()
      });
    }

    // 2. Water Analysis (Highest water flow node gets custom leak/recovery recommendation)
    const sortedByWater = [...assets].sort((a, b) => b.waterUsage - a.waterUsage);
    const topWater = sortedByWater[0];
    if (topWater && topWater.waterUsage > 50) {
      recs.push({
        id: 'rec-water-' + Math.random().toString(36).substring(2, 9),
        category: 'Water',
        title: `Acoustic Flow Leak Interception at ${topWater.name}`,
        description: `Live telemetry registers ${topWater.name} water usage peaking at ${topWater.waterUsage.toLocaleString()} Litres/day. Retrofitting smart pressure-reducing valves alongside a secondary greywater recovery system can recover non-potable water for irrigation.`,
        savingsPotential: `${Math.round(topWater.waterUsage * 0.25).toLocaleString()} Litres/day (25% recovery)`,
        impactLevel: topWater.waterUsage > 2000 ? 'High' : 'Medium',
        createdAt: new Date().toISOString()
      });
    }

    // 3. Waste Analysis (Highest waste generator gets bio-composting recommendation)
    const sortedByWaste = [...assets].sort((a, b) => b.wasteGenerated - a.wasteGenerated);
    const topWaste = sortedByWaste[0];
    if (topWaste && topWaste.wasteGenerated > 1) {
      recs.push({
        id: 'rec-waste-' + Math.random().toString(36).substring(2, 9),
        category: 'Waste',
        title: `Zero-Organic-Refuse Composting at ${topWaste.name}`,
        description: `The municipal waste ledger shows ${topWaste.name} producing ${topWaste.wasteGenerated} kg/day of refuse. Launching an intense organic/food waste source segregation protocol and routing feedstock to the main biogas digestor will eliminate landfill footprint.`,
        savingsPotential: `${Math.round(topWaste.wasteGenerated * 0.45)} kg/day (45% landfill diversion)`,
        impactLevel: topWaste.wasteGenerated > 30 ? 'High' : 'Medium',
        createdAt: new Date().toISOString()
      });
    }

    return recs;
  }

  // AI Recommendations: Get all stored
  app.get('/api/ai/recommendations', (req, res) => {
    const dbData = readDb();
    res.json(dbData.recommendations);
  });

  // AI Recommendation Trigger: Call Gemini Live API Proxy or generate data-driven recommendations
  app.post('/api/ai/insights', authenticateToken, async (req: any, res) => {
    const dbData = readDb();
    const activeAssets = (dbData.assets || []).filter(a => (a.status || 'Active') === 'Active');
    
    // Check if the developer provided their Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Gracefully fallback to adding high-accuracy dynamic data-driven recommendations from live database
      const dynamicRecs = generateDataDrivenRecommendations(activeAssets);
      
      // Filter out duplicates if we already generated them
      const filteredNewRecs = dynamicRecs.filter(newR => 
        !dbData.recommendations.some(oldR => oldR.title === newR.title)
      );

      if (filteredNewRecs.length > 0) {
        dbData.recommendations.unshift(...filteredNewRecs);
        writeDb(dbData);
      }

      return res.json({
        message: 'Successfully generated smart data-driven insights from live asset telemetry. Set GEMINI_API_KEY for additional LLM recommendations.',
        recommendations: dbData.recommendations
      });
    }

    try {
      // Let's formulate a powerful prompt based on the state of the campus assets
      const ai = new GoogleGenAI({ apiKey });
      const assetsSummary = activeAssets.map(a => 
        `- Name: ${a.name}, Institution: ${a.institution}, Category: ${a.category}, Green Score: ${a.greenScore}%, Energy: ${a.energyUsage} kWh, Water: ${a.waterUsage} L, Waste: ${a.wasteGenerated} kg.`
      ).join('\n');

      const prompt = `
        You are the Smart AI Sustainability Auditor for "IndraVerse", the smart campus digital twin platform for the Indra Ganesan Group of Institutions (Trichy, India).
        Below is the real-time sustainability log of campus assets:
        ${assetsSummary}

        Analyze this data and generate exactly ONE new actionable, highly-contextual sustainability recommendation.
        Respond with a valid JSON object ONLY. Do not write any markdown code fences or explanatory text.
        The JSON format must be exactly:
        {
          "category": "Energy" | "Water" | "Waste" | "Greenery",
          "title": "A short descriptive, professional title",
          "description": "A comprehensive 2-3 sentence analysis of the problem and proposed engineering/operational solution specifically tailored to one of the named assets.",
          "savingsPotential": "estimated savings with units (e.g., '12,000 Litres/week' or '8% electricity-reduction')",
          "impactLevel": "High" | "Medium" | "Low"
        }
      `;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = aiResponse.text?.trim() || '';
      // Clean JSON if the model added code blocks
      const cleanJsonStr = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      
      const newRec = JSON.parse(cleanJsonStr);
      newRec.id = 'rec-' + Math.random().toString(36).substring(2, 9);
      newRec.createdAt = new Date().toISOString();

      dbData.recommendations.unshift(newRec);
      writeDb(dbData);

      res.json({
        message: 'Gemini AI Recommendation generated successfully!',
        recommendations: dbData.recommendations
      });

    } catch (error) {
      console.error('Error generating insight with Gemini API:', error);
      // Fallback to data-driven generation
      const dynamicRecs = generateDataDrivenRecommendations(activeAssets);
      const filteredNewRecs = dynamicRecs.filter(newR => 
        !dbData.recommendations.some(oldR => oldR.title === newR.title)
      );

      if (filteredNewRecs.length > 0) {
        dbData.recommendations.unshift(...filteredNewRecs);
        writeDb(dbData);
      }

      res.json({
        message: 'Insight generated with fallback data-driven algorithms due to API limit/error.',
        recommendations: dbData.recommendations,
        error: 'AI service temporarily unavailable.'
      });
    }
  });

  // --- Audit Logs (Admin only) ---
  app.get('/api/audit-logs', authenticateToken, requireAdmin, (req: any, res) => {
    const dbData = readDb();
    res.json(dbData.auditLogs || []);
  });

  // --- Sustainability Logs APIs (Admin and Faculty) ---
  app.get('/api/sustainability/logs', authenticateToken, requireAdminOrFaculty, (req: any, res) => {
    const dbData = readDb();
    res.json(dbData.sustainabilityLogs || []);
  });

  app.post('/api/sustainability/logs', authenticateToken, requireAdminOrFaculty, (req: any, res) => {
    const { 
      buildingId, 
      assetId,
      date, 
      energyUsage, 
      waterUsage, 
      wasteGenerated, 
      fuelType,
      fuelConsumed,
      transportEmission, 
      notes,
      remarks,

      // Category-specific inputs
      paperWaste,
      plasticWaste,
      eWaste,
      mealsServed,
      foodWaste,
      lpgConsumption,
      medicalWaste,
      electricityUsage,
      waterUsageDairy,
      animalWaste,
      milkProduction,
      vehicleType,
      tripsOperated
    } = req.body;
    
    const targetAssetId = assetId || buildingId;
    if (!targetAssetId || !date) {
      return res.status(400).json({ message: 'Required fields missing: assetId and date' });
    }

    const dbData = readDb();
    const asset = dbData.assets.find(a => a.id === targetAssetId);
    if (!asset) {
      return res.status(404).json({ message: 'Building/Asset coordinate index not found.' });
    }

    // Automatically calculate transport emission based on fuel type and fuel consumed
    let calculatedTransportEmission = 0;
    const fConsumed = fuelConsumed !== undefined ? Number(fuelConsumed) : 0;
    const fType = fuelType || '';
    
    if (fType === 'Diesel') {
      calculatedTransportEmission = parseFloat((fConsumed * 2.68).toFixed(2));
    } else if (fType === 'Petrol') {
      calculatedTransportEmission = parseFloat((fConsumed * 2.31).toFixed(2));
    } else if (fType === 'CNG') {
      calculatedTransportEmission = parseFloat((fConsumed * 2.74).toFixed(2));
    } else if (fType === 'Electric Vehicle' || fType === 'Electric') {
      // 0.82 kg CO2 per kWh if electric fuel consumed is in kWh
      calculatedTransportEmission = parseFloat((fConsumed * 0.82).toFixed(2));
    } else {
      calculatedTransportEmission = transportEmission !== undefined ? Number(transportEmission) : 0;
    }

    let energy = energyUsage !== undefined ? Math.max(0, Number(energyUsage)) : 0;
    let water = waterUsage !== undefined ? Math.max(0, Number(waterUsage)) : 0;
    let waste = wasteGenerated !== undefined ? Math.max(0, Number(wasteGenerated)) : 0;

    let carbonFootprint = 0;
    const cat = asset.category || 'Academic';

    if (cat === 'Academic' || cat === 'Administrative' || cat === 'Administration') {
      const pW = paperWaste !== undefined ? Number(paperWaste) : 0;
      const plW = plasticWaste !== undefined ? Number(plasticWaste) : 0;
      const eW = eWaste !== undefined ? Number(eWaste) : 0;
      waste = pW + plW + eW;
      
      const paperEmission = pW * 1.5;
      const plasticEmission = plW * 3.0;
      const eWasteEmission = eW * 5.0;
      
      carbonFootprint = parseFloat((energy * 0.82 + water * 0.0003 + paperEmission + plasticEmission + eWasteEmission).toFixed(2));
    } else if (cat === 'Food Services') {
      const fW = foodWaste !== undefined ? Number(foodWaste) : 0;
      const lpg = lpgConsumption !== undefined ? Number(lpgConsumption) : 0;
      waste = fW;
      
      const lpgEmission = lpg * 2.984;
      const foodEmission = fW * 1.9;
      
      carbonFootprint = parseFloat((energy * 0.82 + water * 0.0003 + lpgEmission + foodEmission).toFixed(2));
    } else if (cat === 'Medical' || cat === 'Healthcare') {
      const mW = medicalWaste !== undefined ? Number(medicalWaste) : 0;
      const plW = plasticWaste !== undefined ? Number(plasticWaste) : 0;
      waste = mW + plW;
      
      const medicalEmission = mW * 2.5;
      const plasticEmission = plW * 3.0;
      
      carbonFootprint = parseFloat((energy * 0.82 + water * 0.0003 + medicalEmission + plasticEmission).toFixed(2));
    } else if (cat === 'Agriculture') {
      const elec = electricityUsage !== undefined ? Number(electricityUsage) : energy;
      const watDairy = waterUsageDairy !== undefined ? Number(waterUsageDairy) : water;
      const animW = animalWaste !== undefined ? Number(animalWaste) : 0;
      
      energy = elec;
      water = watDairy;
      waste = animW;
      
      const animalEmission = animW * 0.8;
      carbonFootprint = parseFloat((energy * 0.82 + water * 0.0003 + animalEmission).toFixed(2));
    } else if (cat === 'Transport') {
      water = 0;
      waste = 0;
      energy = fType === 'Electric' || fType === 'Electric Vehicle' ? fConsumed : 0;
      carbonFootprint = calculatedTransportEmission;
    } else {
      // Fallback
      carbonFootprint = calculateCarbonFootprint(energy, water, waste, calculatedTransportEmission);
    }

    const greenScore = calculateGreenScore(energy, water, waste, calculatedTransportEmission);

    const newLog: SustainabilityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      buildingId: targetAssetId,
      buildingName: asset.name,
      assetId: targetAssetId,
      assetName: asset.name,
      date,
      energyUsage: energy,
      waterUsage: water,
      wasteGenerated: waste,
      fuelType: fType as any,
      fuelConsumed: fConsumed,
      transportEmission: calculatedTransportEmission,
      carbonFootprint,
      greenScore,
      notes: remarks || notes || '',
      remarks: remarks || notes || '',
      createdAt: new Date().toISOString(),

      // Save category-specific variables
      paperWaste: paperWaste !== undefined ? Number(paperWaste) : undefined,
      plasticWaste: plasticWaste !== undefined ? Number(plasticWaste) : undefined,
      eWaste: eWaste !== undefined ? Number(eWaste) : undefined,
      mealsServed: mealsServed !== undefined ? Number(mealsServed) : undefined,
      foodWaste: foodWaste !== undefined ? Number(foodWaste) : undefined,
      lpgConsumption: lpgConsumption !== undefined ? Number(lpgConsumption) : undefined,
      medicalWaste: medicalWaste !== undefined ? Number(medicalWaste) : undefined,
      electricityUsage: electricityUsage !== undefined ? Number(electricityUsage) : undefined,
      waterUsageDairy: waterUsageDairy !== undefined ? Number(waterUsageDairy) : undefined,
      animalWaste: animalWaste !== undefined ? Number(animalWaste) : undefined,
      milkProduction: milkProduction !== undefined ? Number(milkProduction) : undefined,
      vehicleType: vehicleType || undefined,
      tripsOperated: tripsOperated !== undefined ? Number(tripsOperated) : undefined
    };

    if (!dbData.sustainabilityLogs) dbData.sustainabilityLogs = [];
    dbData.sustainabilityLogs.unshift(newLog);

    // Synchronize current building/asset variables
    asset.energyUsage = newLog.energyUsage;
    asset.waterUsage = newLog.waterUsage;
    asset.wasteGenerated = newLog.wasteGenerated;
    asset.greenScore = greenScore;
    asset.carbonFootprint = carbonFootprint;

    // Audit trail registration
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin logged daily sustainability record for ${asset.name} on ${date}. (Energy: ${energy} kWh, Carbon Footprint: ${carbonFootprint} kg CO2)`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.status(201).json(newLog);
  });

  app.delete('/api/sustainability/logs/:id', authenticateToken, requireAdminOrFaculty, (req: any, res) => {
    const { id } = req.params;
    const dbData = readDb();
    if (!dbData.sustainabilityLogs) dbData.sustainabilityLogs = [];
    const logIndex = dbData.sustainabilityLogs.findIndex(l => l.id === id);
    if (logIndex === -1) {
      return res.status(404).json({ message: 'Sustainability record reference not found.' });
    }

    const log = dbData.sustainabilityLogs[logIndex];
    dbData.sustainabilityLogs.splice(logIndex, 1);

    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: `Admin removed sustainability log reference (${id}) for date ${log.date}.`,
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.json({ success: true, message: 'Sustainability log record removed.' });
  });

  // --- Sustainability Analytics API (All roles) ---
  app.get('/api/sustainability/analytics', (req: any, res) => {
    const dbData = readDb();
    const logs = dbData.sustainabilityLogs || [];
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate current and last month prefixes dynamically
    const currentMonthPrefix = today.toISOString().substring(0, 7); // e.g. "2026-07"
    
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthPrefix = lastMonthDate.toISOString().substring(0, 7); // e.g. "2026-06"

    // 1. Today calculations
    let todayEnergy = 0;
    let todayWater = 0;
    let todayWaste = 0;
    let todayTransport = 0;

    logs.forEach(log => {
      if (log.date === todayStr) {
        todayEnergy += log.energyUsage;
        todayWater += log.waterUsage;
        todayWaste += log.wasteGenerated;
        todayTransport += log.transportEmission;
      }
    });

    if (todayEnergy === 0) {
      dbData.assets.forEach(asset => {
        todayEnergy += asset.energyUsage;
        todayWater += asset.waterUsage;
        todayWaste += asset.wasteGenerated;
        todayTransport += Math.round(asset.energyUsage * 0.12 + asset.wasteGenerated * 0.4);
      });
    }

    // 2. Monthly Trend comparisons
    let currMonthEnergy = 0;
    let currMonthWater = 0;
    let currMonthWaste = 0;
    let currMonthTransport = 0;

    let prevMonthEnergy = 0;
    let prevMonthWater = 0;
    let prevMonthWaste = 0;
    let prevMonthTransport = 0;

    logs.forEach(log => {
      if (log.date.startsWith(currentMonthPrefix)) {
        currMonthEnergy += log.energyUsage;
        currMonthWater += log.waterUsage;
        currMonthWaste += log.wasteGenerated;
        currMonthTransport += log.transportEmission;
      } else if (log.date.startsWith(lastMonthPrefix)) {
        prevMonthEnergy += log.energyUsage;
        prevMonthWater += log.waterUsage;
        prevMonthWaste += log.wasteGenerated;
        prevMonthTransport += log.transportEmission;
      }
    });

    if (prevMonthEnergy === 0) prevMonthEnergy = Math.max(1, Math.round(currMonthEnergy * 0.95));
    if (prevMonthWater === 0) prevMonthWater = Math.max(1, Math.round(currMonthWater * 1.05));
    if (prevMonthWaste === 0) prevMonthWaste = Math.max(1, Math.round(currMonthWaste * 0.98));
    if (prevMonthTransport === 0) prevMonthTransport = Math.max(1, Math.round(currMonthTransport * 0.96));

    const calculateTrendDiff = (curr: number, prev: number) => {
      const diff = parseFloat((curr - prev).toFixed(1));
      const pct = parseFloat(((diff / prev) * 100).toFixed(1));
      const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
      return { curr, prev, diff, pct, trend };
    };

    const energyTrend = calculateTrendDiff(currMonthEnergy, prevMonthEnergy);
    const waterTrend = calculateTrendDiff(currMonthWater, prevMonthWater);
    const wasteTrend = calculateTrendDiff(currMonthWaste, prevMonthWaste);
    const transportTrend = calculateTrendDiff(currMonthTransport, prevMonthTransport);

    const totalGreenScore = dbData.assets.reduce((sum, asset) => sum + asset.greenScore, 0);
    const campusGreenScore = dbData.assets.length > 0 ? Math.round(totalGreenScore / dbData.assets.length) : 82;

    // 3. Chart series calculations
    const dailyMap: { [date: string]: { energy: number; water: number; waste: number; transport: number } } = {};
    logs.forEach(log => {
      if (!dailyMap[log.date]) {
        dailyMap[log.date] = { energy: 0, water: 0, waste: 0, transport: 0 };
      }
      dailyMap[log.date].energy += log.energyUsage;
      dailyMap[log.date].water += log.waterUsage;
      dailyMap[log.date].waste += log.wasteGenerated;
      dailyMap[log.date].transport += log.transportEmission;
    });

    const sortedDates = Object.keys(dailyMap).sort().slice(-7);
    const dailyTrend = sortedDates.map(dateStr => {
      const parts = dateStr.split('-');
      const formattedDate = `${parts[1]}-${parts[2]}`;
      return {
        name: formattedDate,
        date: dateStr,
        energy: Math.round(dailyMap[dateStr].energy),
        water: Math.round(dailyMap[dateStr].water),
        waste: parseFloat(dailyMap[dateStr].waste.toFixed(1)),
        transport: Math.round(dailyMap[dateStr].transport)
      };
    });

    const weeklyTrend: any[] = [];
    const allSortedDates = Object.keys(dailyMap).sort();
    for (let w = 0; w < 4; w++) {
      const weekDates = allSortedDates.slice(w * 7, (w + 1) * 7);
      if (weekDates.length === 0) continue;
      
      let wEnergy = 0;
      let wWater = 0;
      let wWaste = 0;
      let wTransport = 0;
      
      weekDates.forEach(d => {
        wEnergy += dailyMap[d].energy;
        wWater += dailyMap[d].water;
        wWaste += dailyMap[d].waste;
        wTransport += dailyMap[d].transport;
      });

      weeklyTrend.push({
        name: `Week ${w + 1}`,
        energy: Math.round(wEnergy),
        water: Math.round(wWater),
        waste: parseFloat(wWaste.toFixed(1)),
        transport: Math.round(wTransport)
      });
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const twoMonthsAgoLabel = `${monthNames[twoMonthsAgo.getMonth()]} ${twoMonthsAgo.getFullYear()}`;
    const lastMonthLabel = `${monthNames[lastMonthDate.getMonth()]} ${lastMonthDate.getFullYear()}`;
    const currentMonthLabel = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;

    const monthlyTrend = [
      {
        name: twoMonthsAgoLabel,
        energy: Math.round(currMonthEnergy * 0.92),
        water: Math.round(currMonthWater * 1.08),
        waste: parseFloat((currMonthWaste * 0.95).toFixed(1)),
        transport: Math.round(currMonthTransport * 0.91)
      },
      {
        name: lastMonthLabel,
        energy: Math.round(prevMonthEnergy),
        water: Math.round(prevMonthWater),
        waste: parseFloat(prevMonthWaste.toFixed(1)),
        transport: Math.round(prevMonthTransport)
      },
      {
        name: currentMonthLabel,
        energy: Math.round(currMonthEnergy),
        water: Math.round(currMonthWater),
        waste: parseFloat(currMonthWaste.toFixed(1)),
        transport: Math.round(currMonthTransport)
      }
    ];

    res.json({
      today: {
        energy: todayEnergy,
        water: todayWater,
        waste: todayWaste,
        transport: todayTransport,
        greenScore: campusGreenScore
      },
      trends: {
        energy: energyTrend,
        water: waterTrend,
        waste: wasteTrend,
        transport: transportTrend
      },
      charts: {
        daily: dailyTrend,
        weekly: weeklyTrend,
        monthly: monthlyTrend
      }
    });
  });

  // CMS Config: GET configuration
  app.get('/api/cms-config', (req, res) => {
    const dbData = readDb();
    res.json(dbData.cmsConfig || DEFAULT_CMS_CONFIG);
  });

  // CMS Config: POST to update configuration (Admin only)
  app.post('/api/cms-config', authenticateToken, requireAdmin, (req: any, res) => {
    const dbData = readDb();
    dbData.cmsConfig = req.body;

    // Write Audit Log
    dbData.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      actorEmail: req.user.email,
      actorName: req.user.name,
      action: 'Admin updated portal branding & CMS configuration.',
      timestamp: new Date().toISOString()
    });

    writeDb(dbData);
    res.json(dbData.cmsConfig);
  });

  // --- Serve Frontend ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IndraVerse Server booting on http://localhost:${PORT}`);
  });
}

startServer();

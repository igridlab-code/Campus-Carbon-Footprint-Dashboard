// scripts/migrate-db-json-to-supabase.ts
//
// One-time (re-runnable/idempotent via upsert) migration: db.json -> Supabase.
// Does NOT delete or modify db.json. Run with:
//   npx tsx scripts/migrate-db-json-to-supabase.ts
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (server-side only).
// Prerequisite: supabase/schema.sql must already be applied to the target
// project (via Supabase:apply_migration or the SQL editor) before running this.

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { supabase as supabaseAdmin } from '../supabaseClient';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface MigrationCounts {
  [table: string]: { attempted: number; inserted: number; errors: string[] };
}

function loadDbJson(): any {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`db.json not found at ${DB_FILE}`);
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

async function migrateUsers(db: any, counts: MigrationCounts) {
  const users = db.users || [];
  counts.users = { attempted: users.length, inserted: 0, errors: [] };
  counts.user_login_events = { attempted: 0, inserted: 0, errors: [] };
  counts.user_failed_login_events = { attempted: 0, inserted: 0, errors: [] };

  for (const u of users) {
    const row = {
      id: u.id,
      email: u.email.toLowerCase(),
      name: u.name,
      role: u.role,
      password_hash: u.passwordHash,
      is_first_login: u.isFirstLogin === true,
      phone: u.phone || null,
      institution: u.institution || null,
      department: u.department || null,
      status: u.status || 'Active',
      created_at: u.createdAt || new Date().toISOString(),
      deleted: u.deleted === true,
      deleted_at: u.deletedAt || null,
      deleted_by: u.deletedBy || null,
      photo_url: u.photoUrl || null,
      failed_login_attempts: u.failedLoginAttempts || 0,
      last_login: u.lastLogin || null,
      active_sessions: u.activeSessions || [],
      register_number: u.registerNumber || null,
      year: u.year || null,
      section: u.section || null,
      faculty_id: u.facultyId || null,
      designation: u.designation || null
    };

    const { error } = await supabaseAdmin.from('users').upsert(row, { onConflict: 'id' });
    if (error) {
      counts.users.errors.push(`${u.id} (${u.email}): ${error.message}`);
    } else {
      counts.users.inserted++;
    }

    // Login history child rows
    const loginHistory = u.loginHistory || [];
    counts.user_login_events.attempted += loginHistory.length;
    for (const l of loginHistory) {
      const { error: lErr } = await supabaseAdmin.from('user_login_events').upsert({
        id: l.id,
        user_id: u.id,
        ip: l.ip || null,
        device: l.device || null,
        timestamp: l.timestamp
      }, { onConflict: 'id' });
      if (lErr) counts.user_login_events.errors.push(`${l.id}: ${lErr.message}`);
      else counts.user_login_events.inserted++;
    }

    // Failed login history child rows
    const failedHistory = u.failedLoginsHistory || [];
    counts.user_failed_login_events.attempted += failedHistory.length;
    for (const f of failedHistory) {
      const { error: fErr } = await supabaseAdmin.from('user_failed_login_events').upsert({
        id: f.id,
        user_id: u.id,
        ip: f.ip || null,
        device: f.device || null,
        timestamp: f.timestamp
      }, { onConflict: 'id' });
      if (fErr) counts.user_failed_login_events.errors.push(`${f.id}: ${fErr.message}`);
      else counts.user_failed_login_events.inserted++;
    }
  }
}

async function migrateAssets(db: any, counts: MigrationCounts) {
  const assets = db.assets || [];
  counts.campus_assets = { attempted: assets.length, inserted: 0, errors: [] };

  for (const a of assets) {
    const row = {
      id: a.id,
      name: a.name,
      coordinate_lat: Array.isArray(a.coordinate) ? a.coordinate[0] : null,
      coordinate_lng: Array.isArray(a.coordinate) ? a.coordinate[1] : null,
      category: a.category,
      institution: a.institution,
      green_score: a.greenScore ?? 0,
      energy_usage: a.energyUsage ?? 0,
      water_usage: a.waterUsage ?? 0,
      waste_generated: a.wasteGenerated ?? 0,
      carbon_footprint: a.carbonFootprint ?? 0,
      description: a.description,
      status: a.status || 'Active',
      quantity: a.quantity ?? 1,
      location_block: a.locationBlock || null,
      power_rating: a.powerRating ?? null,
      usage_hours: a.usageHours ?? null,
      fuel_consumption: a.fuelConsumption ?? null,
      tree_species: a.treeSpecies || null,
      carbon_absorption_rate: a.carbonAbsorptionRate ?? 21,
      tree_count: a.treeCount ?? 0,
      green_cover_area: a.greenCoverArea ?? 0,
      annual_carbon_absorption: a.annualCarbonAbsorption ?? 0,
      thumbnail_url: a.thumbnailUrl || a.thumbnail || '',
      gallery_urls: a.galleryUrls || a.gallery || [],
      panorama_url: a.panoramaUrl || a.panorama || '',
      street_view_url: a.streetViewUrl || ''
    };

    const { error } = await supabaseAdmin.from('campus_assets').upsert(row, { onConflict: 'id' });
    if (error) counts.campus_assets.errors.push(`${a.id} (${a.name}): ${error.message}`);
    else counts.campus_assets.inserted++;
  }
}

async function migrateReports(db: any, counts: MigrationCounts) {
  const reports = db.reports || [];
  counts.issue_reports = { attempted: reports.length, inserted: 0, errors: [] };

  for (const r of reports) {
    const row = {
      id: r.id,
      title: r.title,
      description: r.description,
      photo_url: r.photoUrl || null,
      location: r.location,
      status: r.status || 'Open',
      reporter_name: r.reporterName,
      reporter_role: r.reporterRole,
      created_at: r.createdAt || new Date().toISOString()
    };
    const { error } = await supabaseAdmin.from('issue_reports').upsert(row, { onConflict: 'id' });
    if (error) counts.issue_reports.errors.push(`${r.id}: ${error.message}`);
    else counts.issue_reports.inserted++;
  }
}

async function migrateSustainabilityLogs(db: any, counts: MigrationCounts) {
  const logs = db.sustainabilityLogs || [];
  counts.sustainability_logs = { attempted: logs.length, inserted: 0, errors: [] };

  for (const l of logs) {
    const assetId = l.assetId || l.buildingId;
    const row = {
      id: l.id,
      asset_id: assetId,
      date: l.date,
      energy_usage: l.energyUsage ?? 0,
      water_usage: l.waterUsage ?? 0,
      waste_generated: l.wasteGenerated ?? 0,
      fuel_type: l.fuelType || '',
      fuel_consumed: l.fuelConsumed ?? 0,
      transport_emission: l.transportEmission ?? 0,
      carbon_footprint: l.carbonFootprint ?? 0,
      green_score: l.greenScore ?? null,
      notes: l.notes || null,
      remarks: l.remarks || null,
      created_at: l.createdAt || new Date().toISOString(),
      paper_waste: l.paperWaste ?? null,
      plastic_waste: l.plasticWaste ?? null,
      e_waste: l.eWaste ?? null,
      meals_served: l.mealsServed ?? null,
      food_waste: l.foodWaste ?? null,
      lpg_consumption: l.lpgConsumption ?? null,
      medical_waste: l.medicalWaste ?? null,
      electricity_usage: l.electricityUsage ?? null,
      water_usage_dairy: l.waterUsageDairy ?? null,
      animal_waste: l.animalWaste ?? null,
      milk_production: l.milkProduction ?? null,
      vehicle_type: l.vehicleType || null,
      trips_operated: l.tripsOperated ?? null
    };
    const { error } = await supabaseAdmin.from('sustainability_logs').upsert(row, { onConflict: 'id' });
    if (error) counts.sustainability_logs.errors.push(`${l.id}: ${error.message}`);
    else counts.sustainability_logs.inserted++;
  }
}

async function migrateRecommendations(db: any, counts: MigrationCounts) {
  const recs = db.recommendations || [];
  counts.ai_recommendations = { attempted: recs.length, inserted: 0, errors: [] };

  for (const r of recs) {
    const row = {
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      savings_potential: r.savingsPotential,
      impact_level: r.impactLevel,
      created_at: r.createdAt || new Date().toISOString()
    };
    const { error } = await supabaseAdmin.from('ai_recommendations').upsert(row, { onConflict: 'id' });
    if (error) counts.ai_recommendations.errors.push(`${r.id}: ${error.message}`);
    else counts.ai_recommendations.inserted++;
  }
}

async function migrateAuditLogs(db: any, counts: MigrationCounts) {
  const logs = db.auditLogs || [];
  counts.audit_logs = { attempted: logs.length, inserted: 0, errors: [] };

  for (const a of logs) {
    const row = {
      id: a.id,
      actor_email: a.actorEmail,
      actor_name: a.actorName,
      action: a.action,
      timestamp: a.timestamp || new Date().toISOString()
    };
    const { error } = await supabaseAdmin.from('audit_logs').upsert(row, { onConflict: 'id' });
    if (error) counts.audit_logs.errors.push(`${a.id}: ${error.message}`);
    else counts.audit_logs.inserted++;
  }
}

async function migrateImportedStudents(db: any, counts: MigrationCounts) {
  const students = db.importedStudents || [];
  counts.imported_students = { attempted: students.length, inserted: 0, errors: [] };

  for (const s of students) {
    const row = {
      register_number: s.registerNumber,
      name: s.name,
      department: s.department,
      year: s.year,
      section: s.section,
      institution: s.institution,
      email: s.email,
      phone_number: s.phoneNumber || null
    };
    const { error } = await supabaseAdmin.from('imported_students').upsert(row, { onConflict: 'register_number' });
    if (error) counts.imported_students.errors.push(`${s.registerNumber}: ${error.message}`);
    else counts.imported_students.inserted++;
  }
}

async function migrateImportedFaculty(db: any, counts: MigrationCounts) {
  const faculty = db.importedFaculty || [];
  counts.imported_faculty = { attempted: faculty.length, inserted: 0, errors: [] };

  for (const f of faculty) {
    const row = {
      faculty_id: f.facultyId,
      name: f.name,
      department: f.department,
      designation: f.designation,
      institution: f.institution,
      email: f.email,
      phone_number: f.phoneNumber || null
    };
    const { error } = await supabaseAdmin.from('imported_faculty').upsert(row, { onConflict: 'faculty_id' });
    if (error) counts.imported_faculty.errors.push(`${f.facultyId}: ${error.message}`);
    else counts.imported_faculty.inserted++;
  }
}

async function migrateCarbonFactors(db: any, counts: MigrationCounts) {
  const cf = db.carbonFactors;
  counts.carbon_factors = { attempted: cf ? 1 : 0, inserted: 0, errors: [] };
  if (!cf) return;

  const row = {
    id: 1,
    electricity: cf.electricity ?? 0.82,
    diesel: cf.diesel ?? 2.68,
    petrol: cf.petrol ?? 2.31,
    lpg: cf.lpg ?? 2.984,
    waste: cf.waste ?? 1.9,
    tree_absorption: cf.treeAbsorption ?? 21
  };
  const { error } = await supabaseAdmin.from('carbon_factors').upsert(row, { onConflict: 'id' });
  if (error) counts.carbon_factors.errors.push(error.message);
  else counts.carbon_factors.inserted++;
}

async function migrateCmsConfig(db: any, counts: MigrationCounts) {
  const c = db.cmsConfig;
  counts.cms_config = { attempted: c ? 1 : 0, inserted: 0, errors: [] };
  if (!c) return;

  const row = {
    id: 1,
    institution_name: c.institutionName,
    institution_tagline: c.institutionTagline,
    logo_igrid_url: c.logoIgridUrl || '',
    logo_institution_url: c.logoInstitutionUrl || '',
    logo_college_url: c.logoCollegeUrl || '',
    footer_logo_url: c.footerLogoUrl || '',
    favicon_url: c.faviconUrl || '',
    address: c.address || '',
    email: c.email || '',
    phone: c.phone || '',
    phone_secondary: c.phoneSecondary || '',
    website_url: c.websiteUrl || '',
    google_map_url: c.googleMapUrl || '',
    facebook_url: c.facebookUrl || '',
    twitter_url: c.twitterUrl || '',
    linkedin_url: c.linkedinUrl || '',
    instagram_url: c.instagramUrl || '',
    youtube_url: c.youtubeUrl || '',
    hero_title: c.heroTitle || '',
    hero_subtitle: c.heroSubtitle || '',
    hero_banner_image_url: c.heroBannerImageUrl || '',
    career_banner_title: c.careerBannerTitle || '',
    career_banner_subtitle: c.careerBannerSubtitle || '',
    footer_description: c.footerDescription || '',
    copyright_text: c.copyrightText || '',
    powered_by_text: c.poweredByText || 'IndraVerse',
    primary_color: c.primaryColor || '#0056D2',
    secondary_color: c.secondaryColor || '#0EA5E9',
    background_color: c.backgroundColor || '#F7F9FC',
    section_background_color: c.sectionBackgroundColor || '#F2F6FB'
  };
  const { error } = await supabaseAdmin.from('cms_config').upsert(row, { onConflict: 'id' });
  if (error) counts.cms_config.errors.push(error.message);
  else counts.cms_config.inserted++;
}

async function verifyCounts(counts: MigrationCounts) {
  console.log('\n=== Post-migration row count verification ===');
  const tableNames = Object.keys(counts).filter(t =>
    ['users', 'campus_assets', 'issue_reports', 'sustainability_logs', 'ai_recommendations',
     'audit_logs', 'imported_students', 'imported_faculty', 'carbon_factors', 'cms_config',
     'user_login_events', 'user_failed_login_events'].includes(t)
  );
  for (const t of tableNames) {
    const { count, error } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${t}: ERROR checking count — ${error.message}`);
    } else {
      const expected = counts[t].inserted;
      const match = count === expected ? 'OK' : 'MISMATCH';
      console.log(`  ${t}: db.json inserted=${expected}, live table count=${count} [${match}]`);
    }
  }
}

async function main() {
  console.log('Starting db.json -> Supabase migration...');
  console.log(`Reading: ${DB_FILE}`);
  const db = loadDbJson();

  const counts: MigrationCounts = {};

  await migrateUsers(db, counts);
  await migrateAssets(db, counts);
  await migrateReports(db, counts);
  await migrateSustainabilityLogs(db, counts); // depends on assets existing (FK)
  await migrateRecommendations(db, counts);
  await migrateAuditLogs(db, counts);
  await migrateImportedStudents(db, counts);
  await migrateImportedFaculty(db, counts);
  await migrateCarbonFactors(db, counts);
  await migrateCmsConfig(db, counts);

  console.log('\n=== Migration summary ===');
  for (const [table, c] of Object.entries(counts)) {
    console.log(`${table}: attempted=${c.attempted} inserted=${c.inserted} errors=${c.errors.length}`);
    c.errors.forEach(e => console.log(`    - ${e}`));
  }

  await verifyCounts(counts);

  const totalErrors = Object.values(counts).reduce((sum, c) => sum + c.errors.length, 0);
  if (totalErrors > 0) {
    console.error(`\nMigration completed with ${totalErrors} error(s). db.json was NOT modified.`);
    process.exit(1);
  } else {
    console.log('\nMigration completed with 0 errors. db.json was NOT modified (delete manually only after full verification).');
  }
}

main().catch(err => {
  console.error('Migration failed with an unexpected error:', err);
  process.exit(1);
});

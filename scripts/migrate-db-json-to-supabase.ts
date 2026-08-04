import fs from 'fs';
import path from 'path';
import { supabase } from '../supabaseClient';

const DB_FILE = path.join(process.cwd(), 'db.json');

async function runMigration() {
  console.log('==================================================');
  console.log('STARTING ONE-TIME DATABASE MIGRATION TO SUPABASE');
  console.log('==================================================');

  if (!fs.existsSync(DB_FILE)) {
    console.error(`Error: db.json file not found at ${DB_FILE}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(content);
    console.log('Read db.json successfully. Parsing datasets...');

    // Helper for batch upserts
    const batchUpsert = async (tableName: string, rows: any[], batchSize = 100) => {
      console.log(`Upserting ${rows.length} rows into "${tableName}"...`);
      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        const { error } = await supabase.from(tableName).upsert(chunk);
        if (error) {
          throw new Error(`Failed to upsert batch into ${tableName} at index ${i}: ${error.message}`);
        }
      }
      console.log(`Successfully upserted "${tableName}".`);
    };

    // 1. Users
    if (data.users && Array.isArray(data.users)) {
      const rows = data.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        data: u
      }));
      await batchUpsert('users', rows);
    }

    // 2. Assets
    if (data.assets && Array.isArray(data.assets)) {
      const rows = data.assets.map((a: any) => ({
        id: a.id,
        name: a.name,
        data: a
      }));
      await batchUpsert('assets', rows);
    }

    // 3. Reports
    if (data.reports && Array.isArray(data.reports)) {
      const rows = data.reports.map((r: any) => ({
        id: r.id,
        data: r
      }));
      await batchUpsert('reports', rows);
    }

    // 4. Recommendations
    if (data.recommendations && Array.isArray(data.recommendations)) {
      const rows = data.recommendations.map((rec: any) => ({
        id: rec.id,
        data: rec
      }));
      await batchUpsert('recommendations', rows);
    }

    // 5. Sustainability Logs
    if (data.sustainabilityLogs && Array.isArray(data.sustainabilityLogs)) {
      const rows = data.sustainabilityLogs.map((log: any) => ({
        id: log.id,
        asset_id: log.assetId,
        log_date: log.date,
        data: log
      }));
      await batchUpsert('sustainability_logs', rows);
    }

    // 6. Audit Logs
    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      const rows = data.auditLogs.map((log: any) => ({
        id: log.id,
        actor_email: log.actorEmail,
        data: log
      }));
      await batchUpsert('audit_logs', rows);
    }

    // 7. Imported Students
    if (data.importedStudents && Array.isArray(data.importedStudents)) {
      const rows = data.importedStudents.map((s: any) => ({
        register_number: s.registerNumber,
        data: s
      }));
      await batchUpsert('imported_students', rows);
    }

    // 8. Imported Faculty
    if (data.importedFaculty && Array.isArray(data.importedFaculty)) {
      const rows = data.importedFaculty.map((f: any) => ({
        faculty_id: f.facultyId,
        data: f
      }));
      await batchUpsert('imported_faculty', rows);
    }

    // 9. Carbon Factors (singleton)
    if (data.carbonFactors) {
      console.log('Upserting carbon_factors singleton...');
      const { error } = await supabase.from('carbon_factors').upsert({
        id: 'default',
        data: data.carbonFactors
      });
      if (error) throw new Error(`Failed to upsert carbon_factors: ${error.message}`);
      console.log('Successfully upserted carbon_factors singleton.');
    }

    // 10. CMS Config (singleton)
    if (data.cmsConfig) {
      console.log('Upserting cms_config singleton...');
      const { error } = await supabase.from('cms_config').upsert({
        id: 'default',
        data: data.cmsConfig
      });
      if (error) throw new Error(`Failed to upsert cms_config: ${error.message}`);
      console.log('Successfully upserted cms_config singleton.');
    }

    console.log('==================================================');
    console.log('DATABASE MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (error) {
    console.error('==================================================');
    console.error('DATABASE MIGRATION FAILED');
    console.error('==================================================');
    console.error(error);
    process.exit(1);
  }
}

runMigration();

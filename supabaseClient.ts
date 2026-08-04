import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl) {
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -'/rest/v1/'.length);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -'/rest/v1'.length);
  }
}


if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('==================================================');
  console.error('CRITICAL: SUPABASE SYSTEM STARTUP ERROR');
  console.error('==================================================');
  if (!supabaseUrl) {
    console.error('Missing: SUPABASE_URL environment variable.');
  }
  if (!supabaseServiceRoleKey) {
    console.error('Missing: SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  console.error('==================================================');
  console.error('Please configure these in your .env file.');
  console.error('==================================================');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false
  }
});

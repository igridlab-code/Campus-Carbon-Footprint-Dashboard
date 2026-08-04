import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../supabaseClient';

function generateRandomPassword(length = 20): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^*()_+-=[]{}';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    password += chars[randomIndex];
  }
  return password;
}

async function resetAdminPassword() {
  console.log('Connecting to Supabase to reset Admin password...');
  try {
    const { data: rows, error: fetchError } = await supabase.from('users').select('data');
    if (fetchError) {
      throw new Error(`Failed to fetch users from Supabase: ${fetchError.message}`);
    }

    const users = (rows || []).map((r: any) => r.data);
    const adminUser = users.find((u: any) => u.role === 'Admin');
    if (!adminUser) {
      console.error('Error: Admin user not found in the Supabase "users" table.');
      process.exit(1);
    }

    const newPassword = generateRandomPassword(20);
    const salt = bcryptjs.genSaltSync(10);
    const hash = bcryptjs.hashSync(newPassword, salt);

    adminUser.passwordHash = hash;
    adminUser.failedLoginAttempts = 0;
    if (adminUser.activeSessions) {
      adminUser.activeSessions = [];
    }

    const { error: updateError } = await supabase.from('users').upsert({
      id: adminUser.id,
      email: adminUser.email,
      data: adminUser
    });

    if (updateError) {
      throw new Error(`Failed to update admin user in Supabase: ${updateError.message}`);
    }

    console.log('==================================================');
    console.log('ADMIN PASSWORD RESET SUCCESSFUL (SUPABASE)');
    console.log('==================================================');
    console.log(`Email/Username: ${adminUser.email}`);
    console.log(`New Admin Password: ${newPassword}`);
    console.log('==================================================');
    console.log('IMPORTANT: Copy this password and store it safely.');
    console.log('It will NOT be shown again or stored in plaintext.');
    console.log('==================================================');
  } catch (error) {
    console.error('Failed to reset admin password:', error);
    process.exit(1);
  }
}

resetAdminPassword();

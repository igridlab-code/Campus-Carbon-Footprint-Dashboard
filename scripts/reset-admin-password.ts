import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

const DB_FILE = path.join(process.cwd(), 'db.json');

function generateRandomPassword(length = 20): string {
  // Use a safe subset of printable characters (letters, numbers, and some basic symbols)
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^*()_+-=[]{}';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    password += chars[randomIndex];
  }
  return password;
}

function resetAdminPassword() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(`Error: db.json file not found at ${DB_FILE}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(content);

    const adminUser = data.users.find((u: any) => u.role === 'Admin');
    if (!adminUser) {
      console.error('Error: Admin user not found in db.json');
      process.exit(1);
    }

    const newPassword = generateRandomPassword(20);
    const salt = bcryptjs.genSaltSync(10);
    const hash = bcryptjs.hashSync(newPassword, salt);

    adminUser.passwordHash = hash;
    // Reset sessions and login counters
    adminUser.failedLoginAttempts = 0;
    if (adminUser.activeSessions) {
      adminUser.activeSessions = [];
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');

    console.log('==================================================');
    console.log('ADMIN PASSWORD RESET SUCCESSFUL');
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

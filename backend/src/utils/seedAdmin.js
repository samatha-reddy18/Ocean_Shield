import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

/**
 * Seeds an administrator account if none exists.
 * Usage: node src/utils/seedAdmin.js
 * Configurable via env: SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 */
dotenv.config();

async function seedAdmin() {
  await connectDB();

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@oceanshield.io').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`Promoted ${email} to admin`);
    } else {
      console.log(`Admin already exists: ${email}`);
    }
    process.exit(0);
  }

  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  await User.create({
    name: process.env.SEED_ADMIN_NAME || 'OceanShield Admin',
    email,
    password,
    role: 'admin',
  });

  console.log(`Admin created: ${email} (password: ${password})`);
  console.log('Change this password immediately after first login.');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

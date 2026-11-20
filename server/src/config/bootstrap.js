import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export function getAdminBootstrapConfig(env = process.env) {
  return {
    name: env.ADMIN_NAME || 'REWEAVE Admin',
    email: env.ADMIN_EMAIL || 'admin@reweave.local',
    password: env.ADMIN_PASSWORD || 'Admin@1234'
  };
}

export async function ensureDefaultAdmin() {
  const config = getAdminBootstrapConfig();
  const existingAdmin = await User.findOne({ role: 'admin' }).select('_id email role');

  if (existingAdmin) {
    return existingAdmin;
  }

  const passwordHash = await bcrypt.hash(config.password, 12);
  const admin = await User.create({
    name: config.name,
    email: config.email,
    passwordHash,
    role: 'admin'
  });

  console.log(`Default admin account created: ${config.email}`);
  return admin;
}

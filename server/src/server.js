
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

import 'dotenv/config';
import app from './app.js';
import { ensureDefaultAdmin } from './config/bootstrap.js';
import { connectDB } from './config/db.js';

const port = Number(process.env.PORT || 5000);

try {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  await connectDB();
  await ensureDefaultAdmin();
  app.listen(port, () => console.log(`REWEAVE API listening on port ${port}`));
} catch (error) {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
}

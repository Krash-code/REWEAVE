import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import driveRoutes from './routes/driveRoutes.js';
import impactRoutes from './routes/impactRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import passportRoutes from './routes/passportRoutes.js';
import pickupRoutes from './routes/pickupRoutes.js';
import textileRoutes from './routes/textileRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});
app.use('/api/auth', authRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/textiles', textileRoutes);
app.use('/api/impact', impactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/passports', passportRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
import dns from 'node:dns';
import mongoose from 'mongoose';

export async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('querySrv')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      await mongoose.connect(process.env.MONGO_URI);
    } else {
      throw error;
    }
  }

  console.log('Connected to MongoDB');
}
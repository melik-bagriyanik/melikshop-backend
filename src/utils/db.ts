import mongoose from 'mongoose';

let isConnecting = false;

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return; // already connected
  if (isConnecting) return; // in progress

  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI is not defined');

  isConnecting = true;
  try {
    await mongoose.connect(uri);
    // eslint-disable-next-line no-console
    console.log('✅ Connected to MongoDB');
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('❌ MongoDB connection error:', err?.message || err);
    throw err;
  } finally {
    isConnecting = false;
  }
};



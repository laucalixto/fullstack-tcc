import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/safety-board';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[db] Connected to MongoDB');
  } catch (err) {
    console.error('[db] MongoDB connection error:', err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/safety_board';
const isProd = process.env.NODE_ENV === 'production';

export async function connectDB(): Promise<void> {
  try {
    // Configurações de timeout para falhar rápido localmente se não houver banco
    const options = {
      serverSelectionTimeoutMS: isProd ? 30000 : 3000,
      connectTimeoutMS: 10000,
    };

    await mongoose.connect(MONGODB_URI, options);
    console.log('[db] Connected to MongoDB');
  } catch (err) {
    if (isProd) {
      console.error('[db] CRITICAL: Failed to connect to MongoDB in production.');
      console.error(err);
      process.exit(1);
    }
    
    console.warn('[db] MongoDB offline. Database-backed features will be disabled.');
    console.warn('[db] Running in memory-only fallback mode.');
    
    // Desativa buffering para evitar que as requisições fiquem "penduradas"
    // Os stores devem verificar readyState antes de chamar o modelo
    mongoose.set('bufferCommands', false);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

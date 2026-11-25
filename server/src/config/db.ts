import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let memServer: any = null;

export async function connectDB(): Promise<string> {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.startsWith('mongodb')) {
    try {
      console.log(`[DB] Attempting connection to MongoDB URI: ${uri}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log('[DB] Connected to MongoDB via MONGODB_URI.');
      return uri;
    } catch (err: any) {
      console.warn(`[DB] Could not connect to provided MONGODB_URI (${err.message}). Falling back to MongoMemoryServer.`);
    }
  }

  // Fallback to MongoMemoryServer for instant zero-dependency execution
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memServer = await MongoMemoryServer.create();
    const memUri = memServer.getUri();
    await mongoose.connect(memUri);
    console.log(`[DB] Connected to in-memory MongoDB at: ${memUri}`);
    return memUri;
  } catch (memErr: any) {
    console.error('[DB] Failed to initialize MongoMemoryServer:', memErr);
    throw memErr;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memServer) {
    await memServer.stop();
  }
}

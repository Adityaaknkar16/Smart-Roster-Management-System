import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { Employee } from './models/Employee.js';
import { runSeed } from './scripts/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main API routes
app.use('/api', routes);

// Error handler middleware
app.use(errorHandler);

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is empty (e.g. initial launch or Render deploy)
    const empCount = await Employee.countDocuments();
    if (empCount === 0) {
      console.log('[Server] No employees found in database. Auto-running seed script...');
      await runSeed(false);
    }

    app.listen(PORT, () => {
      console.log(`[Server] Smart Roster Backend running on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

// Start server if executed directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  startServer();
}

export default app;

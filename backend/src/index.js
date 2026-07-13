import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admsRoutes from './routes/admsRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import { subscribeToDevices } from './services/firestoreService.js';
import { DEFAULT_PORT } from './config/constants.js';

// Load environment variables from .env
dotenv.config();

const PORT = process.env.ADMS_PORT || DEFAULT_PORT;

const app = express();

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================

// Configure standard CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[HTTP Request] ${req.method} ${req.url}`);
  next();
});

// ZKTeco device payloads are plain text/tab-separated - parse text only for /iclock routes
app.use('/iclock', express.text({ type: '*/*' }));

// Enable JSON parser for general API endpoints (e.g. Resend email proxy)
app.use(express.json());

// ==========================================
// ROUTES REGISTRATION
// ==========================================
app.use('/iclock', admsRoutes);
app.use('/api', emailRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==========================================
// STARTUP AND SUBSCRIPTIONS
// ==========================================

// Subscribe to real-time Firestore changes for door trigger events
let unsubDevices = null;
try {
  unsubDevices = subscribeToDevices();
} catch (error) {
  console.error('❌ Failed to subscribe to Firestore device changes on startup:', error);
}

// Start Express listening
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Professional ADMS Bridge Server running on port ${PORT}`);
  console.log(`👇 Set your ZKTeco Cloud settings Server Address to:`);
  console.log(`   http://<your-ngrok-or-tunnel-address>`);
  console.log(`=======================================================`);
});

// Clean shutdown handling
process.on('SIGTERM', () => {
  console.log('[Shutdown] SIGTERM received. Shutting down gracefully...');
  if (unsubDevices) unsubDevices();
  server.close(() => {
    console.log('[Shutdown] Server closed.');
    process.exit(0);
  });
});

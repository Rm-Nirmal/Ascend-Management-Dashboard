import express from 'express';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
dotenv.config();

// Resolve paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CONFIGURATION AND CUSTOMIZATION
// ==========================================
const PORT = process.env.ADMS_PORT || 5000;

// ZKTeco ADMS door command structures (format: CONTROL DEVICE AABBCCDDEE)
// AA = 01 (Output Control)
// BB = 01 (Door ID 1)
// CC = 01 (Relay operation)
// DD = FF (Normally Open/Unlock) or 00 (Close/Lock)
// EE = 05 (Duration in seconds, 01-FF)
//
// NOTE: Some device firmwares expect 4 bytes (e.g. 01010105) instead of 5 bytes (010101FF05).
// If your device fails to respond, try switching these below.
const COMMANDS = {
  MOMENTARY_OPEN: 'CONTROL DEVICE 010101FF05',  // Open door for 5 seconds
  PERMANENT_UNLOCK: 'CONTROL DEVICE 010101FF00', // Set door to remain unlocked
  PERMANENT_LOCK: 'CONTROL DEVICE 0101010000',    // Relock/lock the door
};

// ==========================================
// FIREBASE INITIALIZATION
// ==========================================
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.projectId) {
  console.error('❌ Error: VITE_FIREBASE_PROJECT_ID is not defined in your .env file.');
  process.exit(1);
}

console.log(`[Firebase] Initializing client connection for project: ${firebaseConfig.projectId}`);
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const devicesRef = collection(db, 'devices');

// ==========================================
// COMMAND QUEUE STATE
// ==========================================
const pendingCommands = {}; // Map of SN (Serial Number) -> Array of commands [{ id, command }]
let commandIdCounter = 1;
const lastSeenDoorStatus = {};

// ==========================================
// FIRESTORE SYNC & LISTENER
// ==========================================
console.log('[Firestore] Subscribed to devices collection changes...');
onSnapshot(devicesRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const docData = change.doc.data();
    const deviceId = change.doc.id;
    const serial = docData.device?.serial;

    if (!serial) return;

    // Check both standard doorStatus and health.doorStatus
    const currentStatus = docData.doorStatus || docData.health?.doorStatus || 'locked';
    const previousStatus = lastSeenDoorStatus[deviceId];

    // Initialization on startup
    if (previousStatus === undefined) {
      lastSeenDoorStatus[deviceId] = currentStatus;
      console.log(`[Firestore Initialized] Device SN: ${serial} has initial status: "${currentStatus}"`);
      return;
    }

    // Transition detected
    if (currentStatus !== previousStatus) {
      console.log(`[Firestore State Change] Device SN: ${serial} transitioned: "${previousStatus}" -> "${currentStatus}"`);
      lastSeenDoorStatus[deviceId] = currentStatus;

      // Queue command based on target state
      let commandString = '';
      if (currentStatus === 'unlocked') {
        commandString = COMMANDS.MOMENTARY_OPEN;
        console.log(`[ADMS Queue] Queueing momentary unlock for SN: ${serial}`);
      } else if (currentStatus === 'locked') {
        commandString = COMMANDS.PERMANENT_LOCK;
        console.log(`[ADMS Queue] Queueing lock command for SN: ${serial}`);
      } else if (currentStatus === 'emergency_unlocked') {
        commandString = COMMANDS.PERMANENT_UNLOCK;
        console.log(`[ADMS Queue] Queueing emergency permanent unlock command for SN: ${serial}`);
      }

      if (commandString) {
        queueDeviceCommand(serial, commandString);
      }
    }
  });
});

// Helper to push a command into the device queue
function queueDeviceCommand(serial, commandString) {
  if (!pendingCommands[serial]) {
    pendingCommands[serial] = [];
  }
  const cmdId = commandIdCounter++;
  pendingCommands[serial].push({ id: cmdId, command: commandString });
  console.log(`[ADMS Queue Status] SN: ${serial} has ${pendingCommands[serial].length} pending command(s). (New ID: ${cmdId})`);
}

// Helper to update device status to online in Firestore
async function updateDeviceHeartbeat(serial) {
  try {
    const q = query(devicesRef, where('device.serial', '==', serial));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      for (const deviceDoc of querySnapshot.docs) {
        const deviceRef = doc(db, 'devices', deviceDoc.id);
        try {
          await updateDoc(deviceRef, {
            'health.status': 'online',
            'health.lastHeartbeat': new Date().toISOString(),
          });
        } catch (updateErr) {
          console.error(`[Firestore Update Error] Failed to update doc ${deviceDoc.id}:`, updateErr);
        }
      }
    }
  } catch (error) {
    console.error(`[Firestore Update Error] Failed to update heartbeat for SN ${serial}:`, error);
  }
}

// ==========================================
// EXPRESS ADMS ROUTER
// ==========================================
const app = express();

// Parse raw body (ZKTeco device payloads are plain text/tab-separated)
app.use(express.text({ type: '*/*' }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[HTTP Request] ${req.method} ${req.url}`);
  next();
});

// 1. Device Command Request Polling
// ZKTeco device calls this to retrieve pending commands
app.get('/iclock/getrequest', async (req, res) => {
  const serial = req.query.SN;
  if (!serial) {
    return res.status(400).send('Missing SN parameter');
  }

  // Update heartbeat status to show device is online
  await updateDeviceHeartbeat(serial);

  const queue = pendingCommands[serial] || [];
  if (queue.length > 0) {
    const nextCmd = queue[0];
    const responsePayload = `C:${nextCmd.id}:${nextCmd.command}`;
    console.log(`[ADMS Dispatched] Sending command to SN ${serial} -> ${responsePayload}`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(responsePayload + '\n');
  } else {
    // If no commands, send OK (or empty response depending on device requirements)
    res.setHeader('Content-Type', 'text/plain');
    res.send('OK\n');
  }
});

// 2. Device Command Response Confirmation
// Device POSTs here after executing a command (e.g. ID=1&Return=0)
app.post('/iclock/devicecmd', (req, res) => {
  const serial = req.query.SN;
  const body = req.body || '';
  console.log(`[ADMS Response Received] SN: ${serial} | Body: ${body.trim()}`);

  const idMatch = body.match(/ID=(\d+)/i);
  if (idMatch) {
    const cmdId = parseInt(idMatch[1], 10);
    if (pendingCommands[serial]) {
      const originalLen = pendingCommands[serial].length;
      pendingCommands[serial] = pendingCommands[serial].filter(cmd => cmd.id !== cmdId);
      if (pendingCommands[serial].length < originalLen) {
        console.log(`[ADMS Queue Updated] Removed executed Command ID: ${cmdId} from SN: ${serial} queue.`);
      }
    }
  }

  res.setHeader('Content-Type', 'text/plain');
  res.send('OK\n');
});

// 3. Device Data Uploads (POSTs for attendance logs, heartbeats, operational logs)
app.post('/iclock/cdata', (req, res) => {
  const serial = req.query.SN;
  const table = req.query.table || 'UNKNOWN';
  const body = req.body || '';

  console.log(`[ADMS Data Log] SN: ${serial} | Table: ${table} | Bytes: ${body.length}`);
  
  if (body) {
    console.log(`--- RAW DATA START ---\n${body.trim()}\n--- RAW DATA END ---`);
  }

  // Returning OK is crucial to prevent the device from constantly retrying log uploads
  res.setHeader('Content-Type', 'text/plain');
  res.send('OK\n');
});

// 4. Device Configuration Handshake (GET /iclock/cdata)
// Device calls this at startup to request settings
app.get('/iclock/cdata', (req, res) => {
  const serial = req.query.SN;
  console.log(`[ADMS Get Config] SN: ${serial} requesting options...`);
  
  const responsePayload = [
    'RegistryCode=12345678',
    'ErrorDelay=30',
    'RequestDelay=3', // Tells the device to poll /getrequest every 3 seconds
    'TransTimes=00:00;23:59',
    'TransInterval=1',
    'TransTables=User Transaction',
    'Realtime=1',
    'SessionID=87654321',
    'TimeoutSec=10',
  ].join('\n') + '\n';
  
  res.setHeader('Content-Type', 'text/plain');
  res.send(responsePayload);
});

// 5. Device Registry Handshake (POST /iclock/registry)
// Device calls this to register with the server
app.post('/iclock/registry', (req, res) => {
  const serial = req.query.SN;
  console.log(`[ADMS Registry Request] SN: ${serial}`);
  
  res.setHeader('Content-Type', 'text/plain');
  res.send('RegistryCode=12345678\n');
});

// Start Express listening
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Local ADMS Bridge Server running on port ${PORT}`);
  console.log(`👇 Set your ZKTeco Cloud settings Server Address to:`);
  console.log(`   http://<your-ngrok-address>`);
  console.log(`=======================================================`);
});

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

// Custom CORS middleware (for production and development cross-origin access)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ZKTeco device payloads are plain text/tab-separated - parse text only for /iclock routes
app.use('/iclock', express.text({ type: '*/*' }));

// Enable JSON parser for general API endpoints (e.g. Resend email proxy)
app.use(express.json());

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

// POST /api/send-email
// Proxy endpoint to send premium formatted receipt emails via Resend
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, gymName, memberName, amount, sourceName, receiptLink } = req.body;

    if (!to || !memberName || !amount || !sourceName || !receiptLink) {
      return res.status(400).json({ success: false, error: 'Missing required parameters (to, gymName, memberName, amount, sourceName, receiptLink)' });
    }

    const apiKey = process.env.RESEND_API_KEY || 're_D1NBAZQQ_9hk6VSFEem3bbQNhCWHoqajC';
    const displayGymName = gymName || 'Ascend Fit';
    
    // Construct premium styled HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${displayGymName}</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0b0c10;
      color: #c5c6c7;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0c10;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #15181f;
      border: 1px solid rgba(69, 243, 255, 0.15);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(69, 243, 255, 0.03);
    }
    .header {
      background: linear-gradient(135deg, #15181f 0%, #0d0f13 100%);
      padding: 35px;
      text-align: center;
      border-bottom: 1px solid rgba(69, 243, 255, 0.2);
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 25%;
      width: 50%;
      height: 1px;
      background: linear-gradient(90deg, transparent, #45f3ff, transparent);
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      background: linear-gradient(90deg, #ffffff, #45f3ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header p {
      margin: 8px 0 0 0;
      color: #8b9bb4;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .content {
      padding: 40px 35px;
    }
    .greeting {
      font-size: 18px;
      color: #ffffff;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .intro {
      font-size: 14px;
      line-height: 1.6;
      color: #9ba9b4;
      margin-bottom: 30px;
    }
    .details-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 35px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-table th, .details-table td {
      padding: 12px 0;
      text-align: left;
    }
    .details-table th {
      color: #8b9bb4;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-weight: 600;
    }
    .details-table td {
      color: #ffffff;
      font-size: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .details-table td.amount-cell {
      text-align: right;
      font-weight: 700;
      font-family: monospace;
    }
    .details-table th.amount-cell {
      text-align: right;
    }
    .total-row td {
      font-size: 18px;
      font-weight: 800;
      color: #45f3ff !important;
      border-top: 1px solid rgba(69, 243, 255, 0.3) !important;
      padding-top: 18px;
    }
    .btn-container {
      text-align: center;
      margin-top: 25px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #45f3ff 0%, #00cfdf 100%);
      color: #0b0c10 !important;
      text-decoration: none;
      padding: 14px 35px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 4px 15px rgba(69, 243, 255, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .footer {
      background-color: #0d0f13;
      padding: 25px;
      text-align: center;
      font-size: 11px;
      color: #667488;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
      letter-spacing: 0.5px;
      line-height: 1.5;
    }
    .footer a {
      color: #45f3ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${displayGymName}</h1>
        <p>Official Digital Receipt</p>
      </div>
      <div class="content">
        <div class="greeting">Hello ${memberName},</div>
        <div class="intro">
          We have successfully processed your payment. Below are your transaction details. Thank you for your continued support!
        </div>
        
        <div class="details-card">
          <table class="details-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount-cell">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${sourceName}</td>
                <td class="amount-cell">LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="total-row">
                <td>Total Paid</td>
                <td class="amount-cell">LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="btn-container">
          <a href="${receiptLink}" class="btn" target="_blank">View Digital Receipt</a>
        </div>
      </div>
      <div class="footer">
        <p>This email was sent on behalf of <strong>${displayGymName}</strong>.</p>
        <p>Should you have any inquiries regarding this payment, please contact us.</p>
        <p>&copy; ${new Date().getFullYear()} ${displayGymName}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    // Make request to Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'fitcore-ascend-server/1.0'
      },
      body: JSON.stringify({
        from: `${displayGymName} <onboarding@resend.dev>`,
        to: [to],
        subject: `Payment Receipt: ${sourceName} - ${displayGymName}`,
        html: htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Resend Error Response]', data);
      return res.status(response.status).json({ success: false, error: data });
    }

    console.log(`[Email Dispatched] Receipt sent to ${to} for LKR ${amount}`);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Email Dispatch Exception]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start Express listening
app.listen(PORT, () => {

  console.log(`=======================================================`);
  console.log(`🚀 Local ADMS Bridge Server running on port ${PORT}`);
  console.log(`👇 Set your ZKTeco Cloud settings Server Address to:`);
  console.log(`   http://<your-ngrok-address>`);
  console.log(`=======================================================`);
});

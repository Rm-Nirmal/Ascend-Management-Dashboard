import { pendingCommands, updateDeviceHeartbeat } from '../services/firestoreService.js';

// 1. Device Command Request Polling
// ZKTeco device calls this to retrieve pending commands
export const getRequest = async (req, res) => {
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
};

// 2. Device Command Response Confirmation
// Device POSTs here after executing a command (e.g. ID=1&Return=0)
export const deviceCmd = (req, res) => {
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
};

// 3. Device Data Uploads (POSTs for attendance logs, heartbeats, operational logs)
export const cdataPost = (req, res) => {
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
};

// 4. Device Configuration Handshake (GET /iclock/cdata)
// Device calls this at startup to request settings
export const cdataGet = (req, res) => {
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
};

// 5. Device Registry Handshake (POST /iclock/registry)
// Device calls this to register with the server
export const registry = (req, res) => {
  const serial = req.query.SN;
  console.log(`[ADMS Registry Request] SN: ${serial}`);
  
  res.setHeader('Content-Type', 'text/plain');
  res.send('RegistryCode=12345678\n');
};

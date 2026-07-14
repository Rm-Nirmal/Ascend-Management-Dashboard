import { collection, onSnapshot, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { COLLECTIONS, ADMS_COMMANDS } from '../config/constants.js';

// ==========================================
// COMMAND QUEUE AND TRANSITION STATE
// ==========================================
export const pendingCommands = {}; // Map of SN (Serial Number) -> Array of commands [{ id, command }]
let commandIdCounter = 1;
const lastSeenDoorStatus = {};

const devicesRef = collection(db, COLLECTIONS.DEVICES);

// Helper to push a command into the device queue
export function queueDeviceCommand(serial, commandString) {
  if (!pendingCommands[serial]) {
    pendingCommands[serial] = [];
  }
  const cmdId = commandIdCounter++;
  pendingCommands[serial].push({ id: cmdId, command: commandString });
  console.log(`[ADMS Queue Status] SN: ${serial} has ${pendingCommands[serial].length} pending command(s). (New ID: ${cmdId})`);
}

// Helper to update device status to online in Firestore
export async function updateDeviceHeartbeat(serial) {
  try {
    const q = query(devicesRef, where('device.serial', '==', serial));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      for (const deviceDoc of querySnapshot.docs) {
        const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceDoc.id);
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

// Subscribe to devices collection changes
export function subscribeToDevices() {
  console.log('[Firestore] Subscribed to devices collection changes...');
  
  return onSnapshot(devicesRef, (snapshot) => {
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
          commandString = ADMS_COMMANDS.MOMENTARY_OPEN;
          console.log(`[ADMS Queue] Queueing momentary unlock for SN: ${serial}`);
        } else if (currentStatus === 'locked') {
          commandString = ADMS_COMMANDS.PERMANENT_LOCK;
          console.log(`[ADMS Queue] Queueing lock command for SN: ${serial}`);
        } else if (currentStatus === 'emergency_unlocked') {
          commandString = ADMS_COMMANDS.PERMANENT_UNLOCK;
          console.log(`[ADMS Queue] Queueing emergency permanent unlock command for SN: ${serial}`);
        }

        if (commandString) {
          queueDeviceCommand(serial, commandString);
        }
      }
    });
  }, (error) => {
    console.error('[Firestore Subscription Error] failed to listen to devices changes:', error);
  });
}

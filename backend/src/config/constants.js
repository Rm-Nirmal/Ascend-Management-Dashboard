// ZKTeco ADMS door command structures (format: CONTROL DEVICE AABBCCDDEE)
// AA = 01 (Output Control)
// BB = 01 (Door ID 1)
// CC = 01 (Relay operation)
// DD = FF (Normally Open/Unlock) or 00 (Close/Lock)
// EE = 05 (Duration in seconds, 01-FF)
//
// NOTE: Some device firmwares expect 4 bytes (e.g. 01010105) instead of 5 bytes (010101FF05).
// If your device fails to respond, try switching these below.
export const ADMS_COMMANDS = {
  MOMENTARY_OPEN: 'CONTROL DEVICE 010101FF05',  // Open door for 5 seconds
  PERMANENT_UNLOCK: 'CONTROL DEVICE 010101FF00', // Set door to remain unlocked
  PERMANENT_LOCK: 'CONTROL DEVICE 0101010000',    // Relock/lock the door
};

export const DEFAULT_PORT = 5000;

export const COLLECTIONS = {
  DEVICES: 'devices',
  EMAIL_LOGS: 'emailLogs',
};

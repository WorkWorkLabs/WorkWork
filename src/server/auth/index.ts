/**
 * Authentication module exports
 */

// Types
export * from './types';

// Magic Link
export {
  generateSecureToken,
  calculateExpirationDate,
  isTokenExpired,
  sendMagicLink,
  verifyMagicLink,
  cleanupExpiredMagicLinks,
} from './magic-link';

// Device management
export {
  generateFingerprintHash,
  createDeviceFingerprint,
  isDeviceTrusted,
  recordTrustedDevice,
  generateDeviceName,
  extractBrowserName,
  getTrustedDevices,
  removeTrustedDevice,
} from './device';

// TOTP (2FA)
export {
  generateTOTPSecret,
  createTOTP,
  generateTOTPCode,
  verifyTOTPCode,
  generateQRCode,
  enable2FA,
  confirm2FA,
  verify2FA,
  is2FAEnabled,
  disable2FA,
} from './totp';

// User settings
export {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  ensureUserSettings,
  type UserSettingsInput,
  type UserSettingsOutput,
} from './user-settings';

/**
 * PSP Credentials management
 * Handles encryption, storage, and retrieval of payment provider credentials
 * _需求: 2.2, 2.5_
 */

import { prisma } from '@/lib/prisma';
import type { PSPCredentials, PSPProvider } from './types';
import { PaymentError } from './types';
import { getPaymentGateway } from './gateway-factory';

/**
 * Encrypted credentials structure stored in database
 */
interface EncryptedCredentials {
  provider: PSPProvider;
  encryptedApiKey: string;
  encryptedWebhookSecret?: string;
  iv: string;
  salt: string;
}

/**
 * Get encryption key from environment
 * In production, this should be a secure key management service
 */
function getEncryptionKey(): string {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY environment variable is not set');
  }
  return key;
}

/**
 * Derive a key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value
 */
async function encrypt(plaintext: string, password: string): Promise<{ encrypted: string; iv: string; salt: string }> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(password, salt);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    encrypted: Buffer.from(encrypted).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    salt: Buffer.from(salt).toString('base64'),
  };
}

/**
 * Decrypt a string value
 */
async function decrypt(encrypted: string, iv: string, salt: string, password: string): Promise<string> {
  const decoder = new TextDecoder();
  const saltBuffer = new Uint8Array(Buffer.from(salt, 'base64'));
  const ivBuffer = new Uint8Array(Buffer.from(iv, 'base64'));
  const encryptedBuffer = Buffer.from(encrypted, 'base64');

  const key = await deriveKey(password, saltBuffer);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    encryptedBuffer
  );

  return decoder.decode(decrypted);
}

/**
 * Encrypt PSP credentials for storage
 */
export async function encryptCredentials(credentials: PSPCredentials): Promise<EncryptedCredentials> {
  const password = getEncryptionKey();
  
  const { encrypted: encryptedApiKey, iv, salt } = await encrypt(credentials.apiKey, password);
  
  let encryptedWebhookSecret: string | undefined;
  if (credentials.webhookSecret) {
    // Use same salt and derive new IV for webhook secret
    const saltBuffer = new Uint8Array(Buffer.from(salt, 'base64'));
    const webhookIv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, saltBuffer);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: webhookIv },
      key,
      new TextEncoder().encode(credentials.webhookSecret)
    );
    
    // Store IV with encrypted data for webhook secret
    encryptedWebhookSecret = Buffer.from(webhookIv).toString('base64') + ':' + Buffer.from(encrypted).toString('base64');
  }

  return {
    provider: credentials.provider,
    encryptedApiKey,
    encryptedWebhookSecret,
    iv,
    salt,
  };
}

/**
 * Decrypt PSP credentials from storage
 */
export async function decryptCredentials(encrypted: EncryptedCredentials): Promise<PSPCredentials> {
  const password = getEncryptionKey();
  
  const apiKey = await decrypt(encrypted.encryptedApiKey, encrypted.iv, encrypted.salt, password);
  
  let webhookSecret: string | undefined;
  if (encrypted.encryptedWebhookSecret) {
    const [webhookIv, webhookEncrypted] = encrypted.encryptedWebhookSecret.split(':');
    if (webhookIv && webhookEncrypted) {
      const saltBuffer = new Uint8Array(Buffer.from(encrypted.salt, 'base64'));
      const ivBuffer = new Uint8Array(Buffer.from(webhookIv, 'base64'));
      const key = await deriveKey(password, saltBuffer);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        key,
        Buffer.from(webhookEncrypted, 'base64')
      );
      
      webhookSecret = new TextDecoder().decode(decrypted);
    }
  }

  return {
    provider: encrypted.provider,
    apiKey,
    webhookSecret,
  };
}

/**
 * Save PSP credentials for a user
 * _需求: 2.2_
 */
export async function savePSPCredentials(
  userId: string,
  credentials: PSPCredentials
): Promise<{ success: boolean; error?: string }> {
  try {
    // First validate the credentials with the provider
    const gateway = getPaymentGateway(credentials);
    const isValid = await gateway.validateCredentials();
    
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid credentials: could not authenticate with payment provider',
      };
    }

    // Encrypt credentials
    const encrypted = await encryptCredentials(credentials);

    // Store in database
    await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        pspCredentials: JSON.parse(JSON.stringify(encrypted)),
      },
      update: {
        pspCredentials: JSON.parse(JSON.stringify(encrypted)),
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof PaymentError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: `Failed to save credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get PSP credentials for a user
 */
export async function getPSPCredentials(userId: string): Promise<PSPCredentials | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { pspCredentials: true },
  });

  if (!settings?.pspCredentials) {
    return null;
  }

  try {
    const encrypted = settings.pspCredentials as unknown as EncryptedCredentials;
    return await decryptCredentials(encrypted);
  } catch {
    return null;
  }
}

/**
 * Delete PSP credentials for a user
 */
export async function deletePSPCredentials(userId: string): Promise<void> {
  await prisma.userSettings.update({
    where: { userId },
    data: { pspCredentials: { unset: true } },
  });
}

/**
 * Check if user has valid PSP credentials configured
 */
export async function hasPSPCredentials(userId: string): Promise<boolean> {
  const credentials = await getPSPCredentials(userId);
  return credentials !== null;
}

/**
 * Validate stored credentials are still valid with the provider
 * _需求: 2.5_
 */
export async function validateStoredCredentials(userId: string): Promise<{
  valid: boolean;
  provider?: PSPProvider;
  error?: string;
}> {
  try {
    const credentials = await getPSPCredentials(userId);
    
    if (!credentials) {
      return { valid: false, error: 'No credentials configured' };
    }

    const gateway = getPaymentGateway(credentials);
    const isValid = await gateway.validateCredentials();

    return {
      valid: isValid,
      provider: credentials.provider,
      error: isValid ? undefined : 'Credentials are no longer valid',
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

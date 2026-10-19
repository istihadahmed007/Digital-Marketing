import crypto from 'crypto';

const DEFAULT_PROJECT_SECRET = 'bae354fed5611e5f7dac512141a36d687035ef227f8bbd5492909ac4801bd782';

/**
 * Derives candidate 32-byte keys from available secrets to guarantee decryption across environments.
 */
function getCandidateKeys(): Buffer[] {
  const candidates: string[] = [];
  if (process.env.ENCRYPTION_SECRET) candidates.push(process.env.ENCRYPTION_SECRET);
  candidates.push(DEFAULT_PROJECT_SECRET);
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) candidates.push(process.env.SUPABASE_SERVICE_ROLE_KEY);
  candidates.push('nexusmark-default-server-vault-key-32b!');

  const unique = Array.from(new Set(candidates.filter(Boolean)));
  return unique.map((secret) => crypto.createHash('sha256').update(secret).digest());
}

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || DEFAULT_PROJECT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'nexusmark-default-server-vault-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM

/**
 * Encrypts a plaintext string into a hex string: `iv:authTag:ciphertext`
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypts an encrypted hex string (`iv:authTag:ciphertext`) back to plaintext.
 * If the input is not encrypted or decryption fails, returns null.
 */
export function decryptSecret(encryptedPayload: string): string | null {
  if (!encryptedPayload) return null;
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    // If not in encrypted format (e.g. legacy plain value), return as-is
    return encryptedPayload;
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  let iv: Buffer;
  let authTag: Buffer;
  try {
    iv = Buffer.from(ivHex, 'hex');
    authTag = Buffer.from(authTagHex, 'hex');
  } catch {
    return null;
  }

  const candidateKeys = getCandidateKeys();
  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      if (decrypted) return decrypted;
    } catch {
      // Try next key candidate
    }
  }

  return null;
}

/**
 * Masks sensitive secret keys for safe display in UI or logs.
 * Example: 're_1234567890abcdef' -> 're_••••••••cdef'
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  const trimmed = secret.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  const prefix = trimmed.slice(0, 3);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Strips or masks secret keys in integration config objects before returning to UI components.
 */
export function sanitizeConfigForClient(config: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'apiKey',
    'secretKey',
    'token',
    'password',
    'privateKey',
    'signingSecret',
    'serviceAccountKey',
    'accessToken',
    'refreshToken',
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(config || {})) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = maskSecret(value);
        sanitized[`${key}_is_set`] = true;
      } else {
        sanitized[key] = '';
        sanitized[`${key}_is_set`] = false;
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

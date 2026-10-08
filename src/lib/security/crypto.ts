import crypto from 'crypto';

/**
 * Derives a consistent 32-byte key from ENCRYPTION_SECRET or a fallback server secret.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'nexusmark-default-server-vault-key-32b!';
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

  try {
    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
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

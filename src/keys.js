
import { createHash, randomBytes } from 'node:crypto';
import { supabase } from './supabase.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function hashValue(value) {
  return createHash('sha256')
    .update(value)
    .digest('hex');
}

function generatePart(length = 4) {
  const bytes = randomBytes(length);
  return [...bytes]
    .map(b => ALPHABET[b % ALPHABET.length])
    .join('');
}

export async function createKey(days = 30, maxDevices = 1, adminId = '') {
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw new Error('Invalid expiration days');
  }

  if (!Number.isInteger(maxDevices) ||
      maxDevices < 1 || maxDevices > 100) {
    throw new Error('Invalid device limit');
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const key = `TH-${generatePart()}-${generatePart()}-${generatePart()}`;

    const expiresAt = new Date(
      Date.now() + days * 86400000
    ).toISOString();

    const { error } = await supabase
      .from('sv_keys')
      .insert({
        key_hash: hashValue(key),
        expires_at: expiresAt,
        max_devices: maxDevices,
        created_by: String(adminId)
      });

    if (!error) {
      return { key, expiresAt, maxDevices };
    }

    if (error.code !== '23505') throw error;
  }

  throw new Error('Could not generate unique key');
}

export async function revokeKey(key) {
  const keyHash = hashValue(key.trim().toUpperCase());

  const { data, error } = await supabase
    .from('sv_keys')
    .update({ status: 'revoked' })
    .eq('key_hash', keyHash)
    .select('id');

  if (error) throw error;

  return data.length > 0;
}

import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabasePublishableKey() {
  const key = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!key) throw new Error('SUPABASE_PUBLISHABLE_KEY is not configured.');
  if (key.startsWith('sb_publishable_')) return key;

  try {
    const [, payload] = key.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (claims.role === 'anon') return key;
  } catch {
    // Fall through to the safe, generic error below.
  }

  throw new Error('SUPABASE_PUBLISHABLE_KEY must be a publishable key or legacy anon key.');
}

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Supabase server environment variables are not configured.');
  if (!client) {
    client = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}

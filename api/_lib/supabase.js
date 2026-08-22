import { createClient } from '@supabase/supabase-js';

let client;

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

import crypto from 'node:crypto';
import { getSupabase } from './supabase.js';

let warningShown = false;

function clientAddress(request) {
  const forwarded = request.headers['x-vercel-forwarded-for']
    || request.headers['x-forwarded-for']
    || request.headers['x-real-ip']
    || 'local';
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded)
    .split(',')[0]
    .trim()
    .slice(0, 128);
}

function keyHash(route, identity) {
  return crypto.createHash('sha256').update(`${route}:${identity}`).digest('hex');
}

export async function consumeRateLimit(request, route, limit, windowSeconds, identity) {
  const keyIdentity = identity || clientAddress(request);
  try {
    const { data, error } = await getSupabase().rpc('consume_api_rate_limit', {
      p_key_hash: keyHash(route, keyIdentity),
      p_route: route,
      p_window_seconds: windowSeconds,
      p_limit: limit
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    // Fail closed: an unavailable limiter must never silently remove abuse protection.
    if (!warningShown) {
      console.error('API rate limiting is unavailable:', error.message);
      warningShown = true;
    }
    return false;
  }
}

export function rateLimitResponse(response, retryAfterSeconds) {
  response.setHeader('Retry-After', String(retryAfterSeconds));
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return response.status(429).json({ error: 'Too many requests. Please wait and try again.' });
}

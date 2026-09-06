// ============================================================================
// keep-alive.ts — Supabase dormancy prevention
//
// Supabase free-tier projects are paused after 7 days with no activity.
// This endpoint is hit by a Vercel cron job every 3 days (see vercel.json)
// to keep the project active by performing a cheap, read-only query.
//
// The cron route is protected by a shared secret (CRON_SECRET) to prevent
// unauthorised callers from triggering it.
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  // Vercel automatically sets the Authorization header to Bearer <CRON_SECRET>
  // when invoking cron jobs. We validate it here so the endpoint can't be
  // called freely by anyone on the internet.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
  }

  // ── Supabase ping ───────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase env vars not configured.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Lightweight query: fetch a single row from any public table.
    // If no suitable table exists, Supabase will still respond — the important
    // thing is that the project receives a request that counts as "activity".
    const { error } = await supabase.from('jobs').select('id').limit(1);

    if (error) {
      // Log but don't fail — the HTTP round-trip itself counts as activity.
      console.warn('[keep-alive] Supabase query warning:', error.message);
    }

    return res.status(200).json({
      ok: true,
      ts: new Date().toISOString(),
      message: 'Supabase keep-alive ping sent successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[keep-alive] Error:', message);
    return res.status(500).json({ ok: false, error: message });
  }
}

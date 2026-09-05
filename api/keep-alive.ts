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

    // Lightweight query against a table that actually exists. The name matters:
    // PostgREST resolves an unknown table from its cached schema and answers
    // without ever reaching Postgres, so a typo'd ping does NOT count as
    // database activity and the project pauses anyway. This previously read
    // `jobs`, which this schema has never had — every table is `resumatch_*`.
    const { error } = await supabase.from('resumatch_jobs').select('id').limit(1);

    if (error) {
      // Fail loudly. A keep-alive that reports success while doing nothing is
      // worse than none at all: the cron stays green right up until the project
      // is suspended.
      console.error('[keep-alive] Supabase ping failed:', error.message);
      return res.status(500).json({ ok: false, error: error.message });
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

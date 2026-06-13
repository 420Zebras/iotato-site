/* ============================================================
   Supabase REST helper — for IOTATO leaderboard
   ============================================================ */

const SUPABASE_URL = "https://zwibsuxjihrqradsbkny.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3aWJzdXhqaWhycXJhZHNia255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjgyNjgsImV4cCI6MjA5NTIwNDI2OH0.kj_0-WnzNq0tL5l6r_0jfYh2vPVv2pT9EcMJkla0yP0";

async function sbRest(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
  if (method === "POST") headers.Prefer = "return=representation";
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`Supabase ${method} ${table}: ${res.status}`);
  return res.json();
}

export async function fetchLeaderboard(limit = 200) {
  const rows = await sbRest(
    "leaderboard",
    "GET",
    null,
    `?select=id,x_handle,score,time_survived,level,session_id,created_at&flagged=eq.false&order=score.desc&limit=${limit}`
  );
  return rows.map((r) => ({
    id: r.id,
    xHandle: r.x_handle,
    score: r.score,
    time: r.time_survived,
    level: r.level,
    sessionId: r.session_id,
    date: new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));
}

/* Total number of games played (all submitted scores). Uses the Postgres count
   exposed via the Content-Range header with Prefer: count=exact. */
export async function fetchTotalGames() {
  const url = `${SUPABASE_URL}/rest/v1/leaderboard?select=id&flagged=eq.false`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!res.ok) throw new Error(`Supabase count: ${res.status}`);
  // Content-Range looks like "0-0/1234" — the total is after the slash
  const cr = res.headers.get("content-range") || "";
  const total = parseInt(cr.split("/")[1], 10);
  return Number.isFinite(total) ? total : null;
}

/* Top players by number of games played. We fetch a wide window of recent rows
   and aggregate client-side by x_handle (case-insensitive, ignoring '@'). Returns
   the top N handles ordered by play count desc. */
export async function fetchMostActivePlayers(limit = 10, sampleSize = 1000) {
  const rows = await sbRest(
    "leaderboard",
    "GET",
    null,
    `?select=x_handle,score&flagged=eq.false&order=created_at.desc&limit=${sampleSize}`
  );
  const counts = new Map(); // key -> { handle (display), count, bestScore }
  for (const r of rows) {
    const raw = (r.x_handle || "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase().replace(/^@/, "");
    if (!key) continue;
    const cur = counts.get(key);
    if (cur) {
      cur.count += 1;
      if (r.score > cur.bestScore) cur.bestScore = r.score;
    } else {
      counts.set(key, { handle: raw, count: 1, bestScore: r.score || 0 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || b.bestScore - a.bestScore)
    .slice(0, limit);
}

export async function insertScore(entry) {
  const [row] = await sbRest("leaderboard", "POST", {
    x_handle: entry.xHandle,
    score: entry.score,
    time_survived: entry.time,
    level: entry.level,
    session_id: entry.sessionId,
    verification: entry.verificationToken,
    plausible: entry.plausible !== false,
  });
  return row;
}

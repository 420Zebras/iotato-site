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

export async function fetchLeaderboard(limit = 50) {
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

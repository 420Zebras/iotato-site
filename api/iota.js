// Vercel serverless function: server-side proxy for IOTA JSON-RPC calls.
// This removes the browser CORS problem entirely and the dependency on flaky
// public CORS proxies. The tracker frontend calls /api/iota?network=mainnet
// with a normal JSON-RPC body; we forward it to the correct host and return it.
//
// Routing rule (critical): iotax_* methods are served by the INDEXER host,
// everything else by the FULLNODE host.
//   fullnode: https://api.{network}.iota.cafe
//   indexer:  https://indexer.{network}.iota.cafe

const ALLOWED_NETWORKS = new Set(["mainnet", "testnet", "devnet"]);

export default async function handler(req, res) {
  // Basic CORS headers (so it also works if ever called cross-origin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  // Network from query (?network=mainnet), default mainnet
  const network = (req.query.network || "mainnet").toString();
  if (!ALLOWED_NETWORKS.has(network)) {
    res.status(400).json({ error: `Invalid network: ${network}` });
    return;
  }

  // Body is the JSON-RPC payload. Vercel parses JSON bodies automatically,
  // but guard for the raw-string case too.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }
  if (!body || typeof body.method !== "string") {
    res.status(400).json({ error: "Missing JSON-RPC method" });
    return;
  }

  // Route by method prefix: iotax_* -> indexer, else -> fullnode
  const host = body.method.startsWith("iotax_")
    ? `https://indexer.${network}.iota.cafe`
    : `https://api.${network}.iota.cafe`;

  try {
    const upstream = await fetch(host, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    // Pass through status + body. Try JSON, fall back to raw text.
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (err) {
    res.status(502).json({
      error: "Upstream RPC request failed",
      detail: String(err && err.message ? err.message : err),
    });
  }
}

# IOTATO 🥔

The official website for **$TAT** — a community meme coin on IOTA Rebased, launched through TokenLabs.

Includes a built-in mini game (Potato Dodge), live leaderboard powered by Supabase, and links to TokenLabs + X.

---

## Tech Stack

- **Vite + React 18** — fast bundler, modern React
- **Vanilla CSS** with design tokens — no Tailwind, custom aesthetic
- **Canvas 2D** game engine (no game library)
- **Supabase REST API** — public leaderboard with RLS-protected writes
- **Fraunces + Plus Jakarta Sans + JetBrains Mono** (Google Fonts)

---

## Local Development

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

To build for production:

```bash
npm run build
npm run preview   # to test the built version locally
```

---

## Deploying to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial IOTATO site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/iotato-site.git
git push -u origin main
```

### Step 2 — Import in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use GitHub login for the simplest flow)
2. Click **Add New → Project**
3. Select your `iotato-site` repository → **Import**
4. Vercel auto-detects Vite. Leave all defaults:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**

In ~30 seconds you'll have a live URL like `iotato-site.vercel.app`.

### Step 3 — Connect iotato.xyz domain

1. In Vercel, open your project → **Settings → Domains**
2. Enter `iotato.xyz` → **Add**
3. Vercel will give you DNS records (likely an A record `76.76.21.21` or CNAME)
4. Go to [Namecheap dashboard](https://ap.www.namecheap.com/Domains/DomainControlPanel/iotato.xyz/advancedns)
5. Under **Advanced DNS**, delete the default parking records and add the records Vercel showed you
6. Wait 5–60 minutes for DNS propagation. Vercel will auto-issue an HTTPS certificate.

Also add `www.iotato.xyz` as a domain in Vercel and set up the CNAME for www if you want both URLs to work.

---

## Supabase Setup

The site is already configured to use your Supabase project:
- URL: `https://zwibsuxjihrqradsbkny.supabase.co`
- Table: `leaderboard` (created via `supabase-schema.sql` previously)

RLS policies allow:
- ✅ Anyone can SELECT (public read)
- ✅ Anyone can INSERT (score submissions)
- ❌ No UPDATE / DELETE from client (protected)

If you ever rotate the anon key, update it in `src/supabase.js`.

---

## Project Structure

```
iotato-site/
├── public/                  # Static assets (images served as-is)
│   ├── iotato-coin.jpg
│   ├── iota-logo.png
│   └── tokenlabs.jpg
├── src/
│   ├── App.jsx              # Main site (nav, hero, sections, footer)
│   ├── PotatoDodge.jsx      # Game v3 (dash, charge, tier system)
│   ├── supabase.js          # Supabase REST client
│   ├── index.css            # Design tokens + global styles
│   └── main.jsx             # React entry point
├── index.html               # HTML shell + OG meta tags
├── vite.config.js
├── vercel.json              # Vercel build + caching config
└── package.json
```

---

## Customization

**Update site config** in `src/App.jsx` (top of file):

```javascript
const X_HANDLE = "@IOTATO_TAT";
const X_URL = "https://x.com/IOTATO_TAT";
const TOKENLABS_BUY_URL = "...";
const CONTRACT_ADDRESS = "0x...";
const COMPETITION_END = "2026-06-07T23:59:59Z";  // ← update for next week
```

**Update OG image** for X/social sharing in `index.html`. Currently uses `/iotato-coin.jpg` — for best results, replace with a 1200x630px banner.

---

## License & Disclaimer

IOTATO is a community/meme coin. Nothing on this site is financial advice. Crypto involves risk. DYOR.

Not affiliated with IOTA Foundation or TokenLabs unless explicitly stated.

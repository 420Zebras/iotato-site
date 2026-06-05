import React, { useState, useEffect, useRef } from "react";
import PotatoDodge from "./PotatoDodge.jsx";
import FloatingMascot from "./FloatingMascot.jsx";
import { fetchLeaderboard, insertScore } from "./supabase.js";

/* ============================================================
   IOTATO — Main site
   Modern earthy/gold/teal aesthetic with the v3 game embedded.
   ============================================================ */

/* ---------- Constants ---------- */
const X_HANDLE = "@IOTATO_TAT";
const X_URL = "https://x.com/IOTATO_TAT";
const WEBSITE_URL = "https://iotato.xyz";
const TOKENLABS_BUY_URL =
  "https://tokenlabs.network/forge/0x3493d6a80b40178d896ff5780f07ed46c940e0b3a64479839ad20cc6a1718af3";
const CONTRACT_ADDRESS =
  "0x3493d6a80b40178d896ff5780f07ed46c940e0b3a64479839ad20cc6a1718af3";
// Competitions run irregularly. Flip this to true when one is live, false between them.
const COMPETITION_ACTIVE = false;

const IOTA_VIDEOS = [
  {
    title: "TokenLabs: Building the Active Economy",
    description:
      "The first IOTA validator with its own utility token. Meet the lab where $TLN, staking, AI, and the IOTA Rebased ecosystem come together.",
    link: "https://x.com/IOTATO_TAT/status/2055672428794142748/video/1",
    tags: ["TokenLabs", "TLN", "Active Economy"],
    poster: "/video-tokenlabs.jpg",
    featured: true,
  },
  {
    title: "IOTA × TWIN: Bringing the World Onchain",
    description:
      "From a sunrise farm to a global ledger — IOTA and TWIN are tokenizing real assets, identity, and trade data at planetary scale.",
    link: "https://x.com/IOTATO_TAT/status/2055230477485683060/video/1",
    tags: ["IOTA", "TWIN", "RWA"],
    poster: "/video-twin.jpg",
  },
  {
    title: "Trade Lives Behind the Containers",
    description:
      "Global trade still runs on paper, bottlenecks, and trust gaps. IOTA's mission: move it all onchain — transparent, verifiable, fast.",
    link: "https://x.com/IOTATO_TAT/status/1986035918285803889/video/1",
    tags: ["IOTA", "Trade", "Infrastructure"],
    poster: "/video-grey.jpg",
  },
  {
    title: "Dominik Forges the Future",
    description:
      "Co-founder Dominik Schiener hammering vision into steel. The IOTA story — built block by block, by hand.",
    link: "https://x.com/IOTATO_TAT/status/1943423404545335314/video/1",
    tags: ["IOTA", "Founder", "Story"],
    poster: "/video-smith.jpg",
  },
  {
    title: "Alima Waited Days. IOTA Won't Make Her Wait Again.",
    description:
      "An African trader's struggle with paperwork and gatekeepers — and how IOTA's TWIN initiative gives her a fair seat in global commerce.",
    link: "https://x.com/IOTATO_TAT/status/1991847800095572024/video/1",
    tags: ["IOTA", "TWIN", "Adoption"],
    poster: "/video-trader.jpg",
  },
];

/* ---------- Personal best (localStorage) ---------- */
function loadPB() {
  try {
    const r = localStorage.getItem("iotato_pb_v3");
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function savePB(pb) {
  try {
    localStorage.setItem("iotato_pb_v3", JSON.stringify(pb));
  } catch {}
}

/* ---------- Anti-cheat helpers ---------- */
function generateSessionId() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "S-";
  for (let i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}
function generateVerificationToken(score, time, level, sessionId) {
  const raw = `${sessionId}:${Math.floor(score)}:${Math.floor(time * 10)}:${level}:IOTATO`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return `V-${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`;
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function Nav({ onConnectWallet }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "0.85rem 1.5rem",
        background: scrolled ? "rgba(6, 16, 10, 0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}
    >
      <div
        className="container"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
      >
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/iotato-coin.jpg"
            alt="IOTATO"
            style={{ width: 36, height: 36, borderRadius: "50%", boxShadow: "0 0 16px rgba(232,184,74,0.4)" }}
          />
          <span
            className="display"
            style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--paper)", letterSpacing: "-0.02em" }}
          >
            IOTATO
          </span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="nav-links">
          {[
            { href: "#how", label: "How to Buy" },
            { href: "#game", label: "Game" },
            { href: "#leaderboard", label: "Leaderboard" },
            { href: "#videos", label: "Videos" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                fontSize: "0.92rem",
                fontWeight: 500,
                color: "var(--text-dim)",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onConnectWallet} className="btn btn-secondary" style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }}>
            🥔 Connect
          </button>
          <a href={TOKENLABS_BUY_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "0.55rem 1.2rem", fontSize: "0.85rem" }}>
            Buy $TAT
          </a>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

/* ============================================================
   HERO
   ============================================================ */
function Hero({ onPlayClick }) {
  const [rotation, setRotation] = useState(0);
  const triggerSpin = () => {
    setRotation((r) => r + 180);
  };
  return (
    <section
      id="top"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        paddingTop: "4.5rem",
        paddingBottom: "2rem",
      }}
    >
      {/* Hero background image — positioned to fill and favor the cute potato at bottom-left */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/hero-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 65%",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Atmospheric overlays — gentle top, NO heavy darkening at bottom (let image breathe) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(232,184,74,0.08), transparent 60%), linear-gradient(180deg, rgba(6,16,10,0.25) 0%, rgba(6,16,10,0.05) 40%, rgba(6,16,10,0.0) 75%, rgba(6,16,10,0.55) 100%)",
        }}
      />

      {/* Bottom transition — very subtle feather only in last 10% so image stays visible */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "12%",
          background: "linear-gradient(180deg, transparent 0%, var(--bg-0) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Horizon glow */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "55%",
          height: 180,
          background:
            "radial-gradient(ellipse 90% 100% at 50% 50%, rgba(79,214,196,0.18), rgba(79,214,196,0.04) 50%, transparent 70%)",
          filter: "blur(28px)",
          pointerEvents: "none",
        }}
      />

      {/* Floating particles */}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = (i * 7.7 + 5) % 95;
        const dur = 14 + (i % 5) * 3;
        const delay = (i * 1.3) % 8;
        const isTeal = i % 3 === 0;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              bottom: "-10px",
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: isTeal ? "rgba(79,214,196,0.85)" : "rgba(127,207,131,0.7)",
              boxShadow: isTeal ? "0 0 6px rgba(79,214,196,0.6)" : "0 0 6px rgba(127,207,131,0.5)",
              animation: `driftUp ${dur}s linear ${delay}s infinite`,
              pointerEvents: "none",
            }}
          />
        );
      })}

      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "3rem", alignItems: "center" }} className="hero-grid">
          {/* Left: text */}
          <div className="fade-up">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "0.5rem 0.85rem",
                borderRadius: 999,
                background: "rgba(111, 191, 115, 0.1)",
                border: "1px solid rgba(111, 191, 115, 0.3)",
                color: "var(--green-1)",
                fontSize: "0.78rem",
                fontWeight: 600,
                marginBottom: "1.75rem",
                backdropFilter: "blur(6px)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--green-1)",
                  animation: "glowPulse 2s infinite",
                }}
              />
              Early build · launched on IOTA Rebased
            </div>

            <h1
              className="display"
              style={{
                fontSize: "clamp(3.5rem, 10vw, 8.5rem)",
                fontWeight: 900,
                margin: "0 0 1.25rem",
                background: "linear-gradient(135deg, var(--gold-1) 0%, var(--gold-2) 35%, var(--green-1) 75%, var(--teal-1) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 4px 20px rgba(232,184,74,0.15))",
              }}
            >
              IOTATO
            </h1>

            <p
              style={{
                fontSize: "clamp(1.25rem, 2.2vw, 1.65rem)",
                color: "var(--paper)",
                fontWeight: 500,
                lineHeight: 1.3,
                margin: "0 0 1rem",
                maxWidth: "32ch",
              }}
            >
              Tiny potato.<br />
              <span style={{ color: "var(--green-1)", fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 600 }}>
                Serious onchain ambitions.
              </span>
            </p>

            <p style={{ fontSize: "1rem", color: "var(--text-dim)", maxWidth: "44ch", margin: "0 0 2rem", lineHeight: 1.6 }}>
              A community meme coin on IOTA Rebased, launched through TokenLabs. No promises. No roadmap. Just spuds with conviction.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "2.5rem" }}>
              <a href={TOKENLABS_BUY_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                🥔 Buy on TokenLabs
              </a>
              <button onClick={onPlayClick} className="btn btn-secondary">
                ▶ Play Potato Dodge
              </button>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Follow on 𝕏
              </a>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", paddingTop: "1.5rem", borderTop: "1px solid var(--line)" }}>
              <BrandBadge img="/iota-logo.png" topLabel="Live on" mainLabel="IOTA Rebased" invert />
              <BrandBadge img="/tokenlabs.jpg" topLabel="Launched on" mainLabel="TokenLabs" />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src="/iotato-coin.jpg"
                  alt="$TAT"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    boxShadow: "0 0 12px rgba(232,184,74,0.4)",
                  }}
                />
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)" }}>Token</div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--paper)" }}>$TAT</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: coin showcase */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }} className="coin-show fade-up">
            <div
              style={{
                position: "absolute",
                width: 380,
                height: 380,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(232,184,74,0.25), transparent 65%)",
                filter: "blur(40px)",
                animation: "glowPulse 4s ease-in-out infinite",
              }}
            />
            {/* 3D Flip Coin */}
            <div
              onClick={triggerSpin}
              title="Click me!"
              style={{
                position: "relative",
                width: "min(380px, 80vw)",
                aspectRatio: "1 / 1",
                cursor: "pointer",
                perspective: "1400px",
                animation: "float 6s ease-in-out infinite",
                userSelect: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${rotation}deg)`,
                  transition: "transform 0.95s cubic-bezier(0.45, 0.05, 0.25, 1)",
                }}
              >
                {/* Front */}
                <img
                  src="/iotato-coin.jpg"
                  alt="IOTATO coin"
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    boxShadow:
                      "0 24px 80px rgba(232,184,74,0.3), 0 8px 32px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(232,184,74,0.4)",
                  }}
                />
                {/* Back */}
                <img
                  src="/iotato-coin-back.jpg"
                  alt="IOTATO coin back"
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    boxShadow:
                      "0 24px 80px rgba(232,184,74,0.3), 0 8px 32px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(232,184,74,0.4)",
                  }}
                />
              </div>
            </div>
            {/* Orbit dots */}
            {[0, 1, 2, 3].map((i) => {
              const angle = (i / 4) * Math.PI * 2;
              const r = 220;
              return (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${Math.cos(angle) * r}px)`,
                    top: `calc(50% + ${Math.sin(angle) * r}px)`,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: i % 2 === 0 ? "var(--teal-1)" : "var(--green-1)",
                    boxShadow: `0 0 12px ${i % 2 === 0 ? "rgba(79,214,196,0.8)" : "rgba(127,207,131,0.8)"}`,
                    animation: `glowPulse ${2 + i * 0.4}s ease-in-out infinite`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Scroll hint */}
        <div
          style={{
            position: "absolute",
            bottom: "-3rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            color: "var(--text-faint)",
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            animation: "scrollHint 2.4s ease-in-out infinite",
          }}
        >
          Scroll
          <span style={{ width: 1, height: 24, background: "var(--line-strong)" }} />
        </div>
      </div>

      <style>{`
        @keyframes driftUp {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 0.7; }
          85% { opacity: 0.7; }
          100% { transform: translateY(-110vh) translateX(30px); opacity: 0; }
        }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .coin-show { order: -1; }
        }
      `}</style>
    </section>
  );
}

function BrandBadge({ img, topLabel, mainLabel, invert }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          overflow: "hidden",
          background: invert ? "#fff" : "transparent",
          padding: invert ? 2 : 0,
        }}
      >
        <img
          src={img}
          alt={mainLabel}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: "50%",
            filter: invert ? "invert(1)" : "none",
          }}
        />
      </div>
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)" }}>{topLabel}</div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--paper)" }}>{mainLabel}</div>
      </div>
    </div>
  );
}

/* ============================================================
   CONTRACT ADDRESS STRIP
   ============================================================ */
function CAStrip() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ padding: "0 1.5rem", marginTop: "1.5rem", marginBottom: "1.5rem", position: "relative", zIndex: 5 }}>
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0.95rem 1.2rem",
            borderRadius: 14,
            background: "rgba(15, 34, 24, 0.7)",
            border: "1px solid var(--line-strong)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            maxWidth: 760,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "0.78rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--gold-1)",
              whiteSpace: "nowrap",
            }}
          >
            $TAT · CA
          </div>
          <code
            className="mono"
            style={{
              flex: 1,
              fontSize: "0.78rem",
              color: "var(--text-dim)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {CONTRACT_ADDRESS}
          </code>
          <button
            onClick={copy}
            style={{
              padding: "0.45rem 0.95rem",
              borderRadius: 8,
              background: copied ? "rgba(127, 207, 131, 0.25)" : "rgba(79, 214, 196, 0.12)",
              border: `1px solid ${copied ? "var(--green-1)" : "rgba(79, 214, 196, 0.4)"}`,
              color: copied ? "var(--green-1)" : "var(--teal-1)",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HOW TO BUY
   ============================================================ */
function HowToBuy() {
  const steps = [
    { n: "01", t: "Get an IOTA wallet", d: "Set up a wallet compatible with IOTA Rebased." },
    { n: "02", t: "Fund it on Rebased", d: "Bridge or buy IOTA on IOTA Rebased." },
    { n: "03", t: "Buy $TAT on TokenLabs", d: "Find $IOTATO on the Forge and swap." },
  ];
  return (
    <section id="how" className="section">
      <div className="container">
        <div style={{ maxWidth: 600, marginBottom: "3rem" }}>
          <div className="eyebrow">Step by step</div>
          <h2 className="section-title">How to grab a spud</h2>
          <p className="section-lead">Three quick steps. Crypto involves risk — do your own research.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {steps.map((s) => (
            <div
              key={s.n}
              style={{
                position: "relative",
                padding: "2rem 1.75rem",
                borderRadius: 18,
                background: "linear-gradient(180deg, rgba(15, 34, 24, 0.6), rgba(10, 24, 16, 0.4))",
                border: "1px solid var(--line)",
                overflow: "hidden",
                transition: "transform 0.25s, border-color 0.25s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "rgba(232, 184, 74, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--line)";
              }}
            >
              <div
                className="display"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 18,
                  fontSize: "4.5rem",
                  fontWeight: 900,
                  color: "rgba(232, 184, 74, 0.1)",
                  lineHeight: 1,
                }}
              >
                {s.n}
              </div>
              <div className="eyebrow" style={{ color: "var(--teal-1)" }}>
                Step {s.n}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1.45rem",
                  margin: "0.5rem 0 0.6rem",
                  color: "var(--paper)",
                }}
              >
                {s.t}
              </h3>
              <p style={{ color: "var(--text-dim)", fontSize: "0.95rem", margin: 0, lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   GAME SECTION
   ============================================================ */
function GameSection({ gameRef, submitScore, personalBest }) {
  return (
    <section ref={gameRef} id="game" className="section" style={{ paddingTop: "4rem", position: "relative" }}>
      {/* Soft teal glow accent behind the game */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "60%",
          background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(79,214,196,0.08), transparent 70%)",
          pointerEvents: "none",
          filter: "blur(40px)",
        }}
      />
      <div className="container" style={{ position: "relative" }}>
        <div style={{ maxWidth: 600, marginBottom: "2.5rem" }}>
          <div className="eyebrow">Mini game</div>
          <h2 className="section-title">Potato Dodge</h2>
          <p className="section-lead">
            Survive the candle storm. Collect IOTA & TLN gems. Build combos. Crush the bear market.
          </p>
        </div>
        <PotatoDodge onSubmitScore={submitScore} personalBest={personalBest} />
      </div>
    </section>
  );
}

/* ============================================================
   COMPETITION BANNER
   ============================================================ */
function CompetitionBanner() {
  if (!COMPETITION_ACTIVE) {
    // Between competitions — tease the next one, keep people practicing.
    return (
      <div
        style={{
          padding: "1.5rem 1.75rem",
          borderRadius: 22,
          marginBottom: "2.5rem",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(79,214,196,0.07), rgba(232,184,74,0.05))",
          border: "1px solid rgba(111, 191, 115, 0.28)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "0.3rem 0.7rem",
                borderRadius: 999,
                background: "rgba(111,191,115,0.18)",
                border: "1px solid rgba(111,191,115,0.4)",
                color: "var(--mint, #7fcf83)",
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              🥔 Competitions
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem", margin: "0 0 0.3rem", color: "var(--paper)" }}>
              Next Potato Dodge Competition drops soon
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-dim)", margin: 0, maxWidth: "48ch" }}>
              Competitions run at random — no fixed schedule. When one starts, the{" "}
              <b style={{ color: "var(--gold-1)" }}>top 5</b> on the leaderboard win prizes. Practice now so you're ready. Follow {X_HANDLE} for the start signal.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        padding: "1.75rem",
        borderRadius: 22,
        marginBottom: "2.5rem",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(232,184,74,0.12), rgba(79,214,196,0.06))",
        border: "1px solid rgba(232, 184, 74, 0.4)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(232,184,74,0.2), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0.3rem 0.7rem",
              borderRadius: 999,
              background: "linear-gradient(90deg, var(--gold-1), var(--gold-2))",
              color: "var(--ink)",
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d83a3a", boxShadow: "0 0 6px #ff5a5a", animation: "pulse 1.5s infinite" }} />
            Competition Live
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", margin: "0 0 0.3rem", color: "var(--paper)" }}>
            Top 5 win prizes 🥔
          </h3>
          <p style={{ fontSize: "0.9rem", color: "var(--text-dim)", margin: 0, maxWidth: "46ch" }}>
            Set your highest score, submit with your X handle, and share on X. The top 5 spuds on the leaderboard take the prizes.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LEADERBOARD
   ============================================================ */
function Leaderboard({ entries, loading, error, latestId, personalBest, lbRef }) {
  return (
    <section ref={lbRef} id="leaderboard" className="section">
      <div className="container" style={{ maxWidth: 880 }}>
        <CompetitionBanner />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "end", gap: 12, marginBottom: "1.5rem" }}>
          <div>
            <div className="eyebrow">Live · Powered by Supabase</div>
            <h2 className="section-title">Leaderboard</h2>
          </div>
          {personalBest && (
            <div style={{ textAlign: "right" }}>
              <div className="eyebrow">Your best</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem", color: "var(--gold-1)" }}>
                {personalBest.score}
                <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginLeft: 8 }}>
                  · {personalBest.time.toFixed(1)}s
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "0.95rem 1.2rem",
              borderRadius: 12,
              background: "rgba(255, 107, 138, 0.08)",
              border: "1px solid rgba(255, 107, 138, 0.3)",
              color: "var(--rose)",
              fontSize: "0.88rem",
              marginBottom: 14,
            }}
          >
            Could not reach Supabase: {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>Loading leaderboard…</div>
        ) : entries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1.5rem",
              borderRadius: 18,
              border: "1px dashed var(--line-strong)",
              color: "var(--text-dim)",
            }}
          >
            No scores yet. Be the first spud on the board.
          </div>
        ) : (
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid var(--line)",
              background: "rgba(15, 34, 24, 0.4)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 100px 80px 80px",
                padding: "0.85rem 1.25rem",
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--text-faint)",
                fontWeight: 700,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>#</div>
              <div>Handle</div>
              <div style={{ textAlign: "right" }}>Score</div>
              <div style={{ textAlign: "right" }}>Time</div>
              <div style={{ textAlign: "right" }} className="lb-date">Date</div>
            </div>
            {entries.slice(0, 10).map((e, i) => {
              const rk = i + 1;
              const med = rk === 1 ? "var(--gold-1)" : rk === 2 ? "#c9c9d4" : rk === 3 ? "#c08858" : null;
              const isL = e.id === latestId;
              return (
                <div
                  key={e.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "50px 1fr 100px 80px 80px",
                    padding: "0.85rem 1.25rem",
                    alignItems: "center",
                    fontSize: "0.92rem",
                    background: isL ? "rgba(127,207,131,0.08)" : med ? `linear-gradient(90deg, ${med}18, transparent)` : "transparent",
                    borderTop: i === 0 ? "none" : "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      color: med || "var(--text-dim)",
                      fontSize: rk <= 3 ? "1.15rem" : "1rem",
                    }}
                  >
                    {rk <= 3 ? ["🥇", "🥈", "🥉"][rk - 1] : rk}
                  </div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.xHandle}
                    {isL && rk <= 5 && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "0.15rem 0.55rem",
                          borderRadius: 999,
                          background: "linear-gradient(90deg, var(--gold-1), var(--gold-2))",
                          color: "var(--ink)",
                          fontSize: "0.62rem",
                          fontWeight: 800,
                        }}
                      >
                        Top 5!
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, color: "var(--gold-1)" }}>{e.score}</div>
                  <div style={{ textAlign: "right", color: "var(--text-dim)" }}>{e.time.toFixed(1)}s</div>
                  <div style={{ textAlign: "right", color: "var(--text-faint)", fontSize: "0.78rem" }} className="lb-date">
                    {e.date}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <style>{`
          @media (max-width: 600px) {
            .lb-date { display: none !important; }
            #leaderboard [style*="50px 1fr 100px 80px 80px"] { grid-template-columns: 40px 1fr 80px 70px !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

/* ============================================================
   VIDEO SECTION
   ============================================================ */
function VideosSection() {
  const featured = IOTA_VIDEOS.find((v) => v.featured);
  const rest = IOTA_VIDEOS.filter((v) => !v.featured);
  return (
    <section id="videos" className="section">
      <div className="container">
        <div style={{ maxWidth: 600, marginBottom: "3rem" }}>
          <div className="eyebrow">Watch & learn</div>
          <h2 className="section-title">IOTATO Video Vault</h2>
          <p className="section-lead">Videos about IOTA, TWIN, TokenLabs, and real-world adoption. More coming.</p>
        </div>

        {featured && (
          <div style={{ marginBottom: 20 }}>
            <VideoCard video={featured} prominent />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {rest.map((v) => (
            <VideoCard key={v.link} video={v} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoCard({ video, prominent }) {
  return (
    <a
      href={video.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(15, 34, 24, 0.5)",
        border: `1px solid ${prominent ? "rgba(79, 214, 196, 0.35)" : "var(--line)"}`,
        backdropFilter: "blur(8px)",
        transition: "transform 0.25s, border-color 0.25s, box-shadow 0.25s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = "rgba(232, 184, 74, 0.5)";
        e.currentTarget.style.boxShadow = "0 16px 48px rgba(0, 0, 0, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = prominent ? "rgba(79, 214, 196, 0.35)" : "var(--line)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ position: "relative", aspectRatio: prominent ? "16/7" : "16/9", background: "#04080a", overflow: "hidden" }}>
        {video.poster ? (
          <img
            src={video.poster}
            alt={video.title}
            loading="lazy"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.4s ease",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 60% 60% at 50% 45%, rgba(79,214,196,0.12), transparent 70%), linear-gradient(160deg, #0a1a18, #050c0e)",
            }}
          />
        )}
        {/* Dark overlay for play button contrast */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: prominent ? 92 : 64,
              height: prominent ? 92 : 64,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.1)",
              border: "2px solid rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
            }}
          >
            <svg width={prominent ? 32 : 22} height={prominent ? 32 : 22} viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: prominent ? 6 : 4 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: "0.25rem 0.65rem",
            borderRadius: 999,
            background: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            backdropFilter: "blur(8px)",
          }}
        >
          𝕏 · Video
        </div>
      </div>
      <div style={{ padding: prominent ? "1.5rem 1.75rem" : "1.25rem 1.4rem" }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: prominent ? "1.5rem" : "1.15rem",
            margin: "0 0 0.55rem",
            color: "var(--paper)",
            lineHeight: 1.15,
          }}
        >
          {video.title}
        </h3>
        <p style={{ color: "var(--text-dim)", fontSize: prominent ? "0.95rem" : "0.85rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
          {video.description}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {video.tags.map((t) => (
            <span
              key={t}
              style={{
                padding: "0.2rem 0.55rem",
                borderRadius: 6,
                background: "rgba(79, 214, 196, 0.1)",
                border: "1px solid rgba(79, 214, 196, 0.25)",
                color: "#a8e8dc",
                fontSize: "0.68rem",
                fontWeight: 600,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */
function Footer() {
  return (
    <footer style={{ padding: "3rem 1.5rem 2.5rem", borderTop: "1px solid var(--line)", marginTop: "2.5rem" }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.75rem", marginBottom: "2rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <img src="/iotato-coin.jpg" alt="IOTATO" style={{ width: 44, height: 44, borderRadius: "50%" }} />
              <span className="display" style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--paper)" }}>
                IOTATO
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", maxWidth: "26ch", margin: 0, lineHeight: 1.55 }}>
              Tiny potato. Serious onchain ambitions.
            </p>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Community</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.9rem" }}>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dim)" }}>
                𝕏 Follow on X
              </a>
              <a href={TOKENLABS_BUY_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dim)" }}>
                🧪 $TAT on TokenLabs
              </a>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Built on</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <BrandBadge img="/iota-logo.png" topLabel="Live on" mainLabel="IOTA Rebased" invert />
              <BrandBadge img="/tokenlabs.jpg" topLabel="Launched on" mainLabel="TokenLabs" />
            </div>
          </div>
        </div>

        <div
          style={{
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--line)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 10,
            fontSize: "0.78rem",
            color: "var(--text-faint)",
          }}
        >
          <div>© {new Date().getFullYear()} IOTATO. Built by the community.</div>
          <div>Not affiliated with IOTA Foundation or TokenLabs unless stated · Not financial advice · DYOR</div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   WALLET MODAL (placeholder)
   ============================================================ */
function WalletModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 440,
          width: "100%",
          background: "linear-gradient(135deg, rgba(15, 34, 24, 0.98), rgba(10, 24, 16, 0.98))",
          border: "1px solid rgba(79, 214, 196, 0.4)",
          borderRadius: 20,
          padding: "2rem 1.75rem",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ×
        </button>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img src="/iotato-coin.jpg" alt="" style={{ width: 64, height: 64, borderRadius: "50%", boxShadow: "0 8px 24px rgba(232,184,74,0.4)" }} />
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.5rem",
            textAlign: "center",
            margin: "0 0 0.5rem",
            color: "var(--paper)",
          }}
        >
          Wallet login coming soon
        </h3>
        <p style={{ fontSize: "0.92rem", color: "var(--text-dim)", textAlign: "center", margin: "0 0 1rem", lineHeight: 1.55 }}>
          Cooking the IOTATO NFT collection on IOTA Rebased. Wallet login drops with the NFTs.
        </p>
        <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-faint)" }}>
          Follow {X_HANDLE} for the drop date.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */
export default function App() {
  const [entries, setEntries] = useState([]);
  const [latestId, setLatestId] = useState(null);
  const [personalBest, setPersonalBest] = useState(() => loadPB());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [bonusToast, setBonusToast] = useState(null);
  const gameRef = useRef(null);
  const lbRef = useRef(null);

  const handleBonusUnlocked = (isFirst) => {
    setBonusToast(isFirst ? "first" : "repeat");
    setTimeout(() => setBonusToast(null), 6000);
  };

  useEffect(() => {
    fetchLeaderboard(50)
      .then((rows) => {
        setEntries(rows);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const submitScore = async ({ xHandle, score, time, level }) => {
    const sessionId = generateSessionId();
    const verificationToken = generateVerificationToken(score, time, level, sessionId);
    try {
      const inserted = await insertScore({
        xHandle,
        score,
        time,
        level,
        sessionId,
        verificationToken,
        plausible: true,
      });
      setLatestId(inserted.id);
      const fresh = await fetchLeaderboard(50);
      setEntries(fresh);
      if (!personalBest || score > personalBest.score) {
        const pb = { score, time, date: new Date().toLocaleDateString() };
        savePB(pb);
        setPersonalBest(pb);
      }
      const rank = fresh.findIndex((e) => e.id === inserted.id) + 1;
      setTimeout(() => lbRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
      return rank > 0 ? rank : null;
    } catch (e) {
      console.warn("submitScore error:", e);
      setError(e.message);
      return null;
    }
  };

  const scrollToGame = () => gameRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <Nav onConnectWallet={() => setWalletOpen(true)} />
      <FloatingMascot onBonusUnlocked={handleBonusUnlocked} />
      {bonusToast && (
        <div
          style={{
            position: "fixed",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            padding: "14px 22px",
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(20,30,25,0.96), rgba(40,30,15,0.96))",
            border: "1px solid rgba(232,184,74,0.7)",
            color: "#fff5d0",
            fontSize: 15,
            fontWeight: 600,
            boxShadow: "0 8px 32px rgba(232,184,74,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "bubbleIn 0.4s ease-out",
          }}
        >
          <span style={{ fontSize: 24 }}>{bonusToast === "first" ? "🏆" : "🔨"}</span>
          <div>
            <div style={{ fontWeight: 700, color: "#e8b84a" }}>
              {bonusToast === "first" ? "Secret found!" : "Already unlocked"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {bonusToast === "first" ? "+2 starting ammo unlocked for next run" : "Nice swing, ser 🥔"}
            </div>
          </div>
        </div>
      )}
      <Hero onPlayClick={scrollToGame} />
      <CAStrip />
      <HowToBuy />
      <GameSection gameRef={gameRef} submitScore={submitScore} personalBest={personalBest} />
      <Leaderboard
        entries={entries}
        loading={loading}
        error={error}
        latestId={latestId}
        personalBest={personalBest}
        lbRef={lbRef}
      />
      <VideosSection />

      <section className="section" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div className="container">
          <div
            style={{
              padding: "1.4rem 1.75rem",
              borderRadius: 14,
              background: "rgba(232, 184, 74, 0.06)",
              border: "1px solid rgba(232, 184, 74, 0.25)",
              fontSize: "0.88rem",
              color: "var(--text-dim)",
              textAlign: "center",
            }}
          >
            <strong style={{ color: "var(--gold-1)" }}>Disclaimer.</strong> IOTATO is a community/meme coin. Nothing on this site is
            financial advice. Crypto involves risk. DYOR.
          </div>
        </div>
      </section>

      <Footer />
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}

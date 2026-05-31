import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   FLOATING MASCOT — the IOTATO potato that wanders around
   the website, dodges your cursor, and gets smashed by a
   hammer after you catch it twice → +2 starting ammo unlock.
   ============================================================ */

const PHRASES = [
  "you won't catch the spud",
  "too slow ser",
  "paper hands detected",
  "almost… but no",
  "IOTA reflexes required",
  "missed me",
  "skill issue",
  "git gud",
  "is that the best you've got?",
  "cute. try again.",
  "tiny but rebased",
  "ngmi at this rate",
  "ser, you are not him",
  "spud says no",
  "more features cooking",
  "catch me and i'll spill alpha",
  "not your keys, not your potato",
  "i fear no candle",
  "wen catch?",
  "this potato is feeling bullish",
  "you're early. i'm faster.",
  "blink and i'm gone",
  "diamond skin, baby",
  "respectfully, no",
  "i've dodged worse bears",
  "still not financial advice",
  "zoom zoom",
  "touch grass? i AM grass-adjacent",
];
const FIRST_CATCH_PHRASES = [
  "okay okay, you touched the spud",
  "tiny potato, big panic",
  "wait… that was illegal",
  "fine. round two then.",
  "lucky hands. won't happen twice.",
  "ok that one's on me",
];

const BONUS_AMMO_KEY = "iotato_bonus_ammo_claimed";
const MASCOT_HIDDEN_KEY = "iotato_mascot_hidden_until";
const MASCOT_PAUSED_KEY = "iotato_mascot_paused";

function getMascotHiddenUntil() {
  try {
    const v = localStorage.getItem(MASCOT_HIDDEN_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
function setMascotHiddenUntil(ts) {
  try {
    localStorage.setItem(MASCOT_HIDDEN_KEY, String(ts));
  } catch {}
}
function isBonusAmmoClaimed() {
  try {
    return localStorage.getItem(BONUS_AMMO_KEY) === "1";
  } catch {
    return false;
  }
}
function claimBonusAmmo() {
  try {
    localStorage.setItem(BONUS_AMMO_KEY, "1");
  } catch {}
}
function isMascotPaused() {
  try {
    return localStorage.getItem(MASCOT_PAUSED_KEY) === "1";
  } catch {
    return false;
  }
}
function setMascotPausedLS(v) {
  try {
    localStorage.setItem(MASCOT_PAUSED_KEY, v ? "1" : "0");
  } catch {}
}

/* Animated Potato SVG — running, arm-waving, eye-tracking */
/* SVG Hammer for the smash animation */
/* ============================================================
   IOTATO CHARACTER — detailed SVG recreation of the mascot,
   built for animation (legs, arms, eyes, blink, expressions).
   ============================================================ */
function IotatoCharacter({ size = 130, walkPhase = 0, running = false, moving = false, blink = 0, lookX = 0, lookY = 0, scared = false }) {
  // Body bob — only while moving; otherwise a tiny idle breathing motion
  const bob = moving ? Math.abs(Math.sin(walkPhase)) * (running ? -6 : -3) : Math.sin(walkPhase) * 0;
  // Arms swing opposite to legs — only while moving, otherwise rest at sides
  const armL = moving ? Math.sin(walkPhase + Math.PI) * (running ? 22 : 8) : 0;
  const armR = moving ? Math.sin(walkPhase) * (running ? 22 : 8) : 0;
  // Lean forward when running
  const lean = running ? 4 : 0;
  // Eye openness (blink)
  const eo = 1 - blink * 0.92;
  // Pupil offset (look toward cursor) — larger range so tracking is clearly visible
  const px = lookX * 6;
  const py = lookY * 5;

  return (
    <svg viewBox="0 0 220 200" width={size} height={size * (200 / 220)} style={{ overflow: "visible", display: "block" }}>
      <defs>
        {/* Natural earthy potato tones */}
        <radialGradient id="ioBody2" cx="40%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#e8c89a" />
          <stop offset="45%" stopColor="#c69a63" />
          <stop offset="100%" stopColor="#8a6038" />
        </radialGradient>
        <radialGradient id="ioLimb" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#d8b483" />
          <stop offset="100%" stopColor="#7a5028" />
        </radialGradient>
      </defs>

      <g transform={`translate(0 ${bob}) rotate(${lean} 110 120)`}>
        {/* ---- LEGS — proper running cycle; stand still when idle ---- */}
        {(() => {
          const renderLeg = (hipX, phaseOff) => {
            const ph = walkPhase + phaseOff;
            // When idle, legs hang straight down (no swing, no knee bend)
            const hipAngle = moving ? Math.sin(ph) * (running ? 38 : 16) : 0;
            const kneeBend = moving
              ? (running ? Math.max(0, Math.sin(ph + 0.5)) * 45 + 10 : Math.max(0, Math.sin(ph)) * 18 + 4)
              : 6;
            const thighLen = 16;
            const shinLen = 16;
            return (
              <g transform={`translate(${hipX} 158)`} key={hipX}>
                <g transform={`rotate(${hipAngle})`}>
                  {/* Thigh */}
                  <rect x="-5" y="0" width="10" height={thighLen} rx="5" fill="url(#ioLimb)" stroke="#5e4020" strokeWidth="1.2" />
                  <g transform={`translate(0 ${thighLen}) rotate(${kneeBend})`}>
                    {/* Shin */}
                    <rect x="-4.5" y="0" width="9" height={shinLen} rx="4.5" fill="url(#ioLimb)" stroke="#5e4020" strokeWidth="1.2" />
                    {/* Foot */}
                    <ellipse cx="2" cy={shinLen + 2} rx="9" ry="5.5" fill="url(#ioLimb)" stroke="#5e4020" strokeWidth="1.3" />
                  </g>
                </g>
              </g>
            );
          };
          return (
            <>
              {renderLeg(98, Math.PI)}
              {renderLeg(122, 0)}
            </>
          );
        })()}

        {/* ---- ARMS (simple, behind body) ---- */}
        {/* Left arm */}
        <g transform={`translate(64 96) rotate(${-30 + armL})`}>
          <path d="M0 0 Q-16 -6 -28 -18" stroke="url(#ioLimb)" strokeWidth="8" fill="none" strokeLinecap="round" />
          <ellipse cx="-30" cy="-20" rx="8" ry="9" fill="url(#ioLimb)" stroke="#5e4020" strokeWidth="1.2" />
        </g>
        {/* Right arm */}
        <g transform={`translate(156 96) rotate(${30 + armR})`}>
          <path d="M0 0 Q16 -6 28 -18" stroke="url(#ioLimb)" strokeWidth="8" fill="none" strokeLinecap="round" />
          <ellipse cx="30" cy="-20" rx="8" ry="9" fill="url(#ioLimb)" stroke="#5e4020" strokeWidth="1.2" />
        </g>

        {/* ---- BODY (natural rounded potato — wider than tall) ---- */}
        <path
          d="M110 40
             C 78 40, 52 56, 48 86
             C 44 116, 58 158, 88 168
             C 100 172, 120 172, 132 168
             C 162 158, 176 116, 172 86
             C 168 56, 142 40, 110 40 Z"
          fill="url(#ioBody2)"
          stroke="#6e4a26"
          strokeWidth="2"
        />
        {/* Highlight top-left */}
        <ellipse cx="84" cy="74" rx="22" ry="20" fill="#fff" opacity="0.18" />
        {/* Potato eyes/speckles (natural dimples) */}
        <g fill="#6e4a26" opacity="0.45">
          <ellipse cx="72" cy="110" rx="2.5" ry="1.8" />
          <ellipse cx="150" cy="100" rx="2" ry="1.5" />
          <ellipse cx="95" cy="150" rx="2.5" ry="1.8" />
          <ellipse cx="140" cy="148" rx="2" ry="1.5" />
          <ellipse cx="60" cy="130" rx="2" ry="1.5" />
          <ellipse cx="160" cy="128" rx="1.8" ry="1.3" />
          <ellipse cx="115" cy="158" rx="2" ry="1.4" />
        </g>
        {/* small natural dimple shading lines */}
        <path d="M70 108 q2 2 4 0" stroke="#6e4a26" strokeWidth="0.8" fill="none" opacity="0.4" />
        <path d="M148 98 q2 2 4 0" stroke="#6e4a26" strokeWidth="0.8" fill="none" opacity="0.4" />

        {/* ---- SPROUT ---- */}
        <path d="M110 42 Q107 26 116 18" stroke="#6e7a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="119" cy="17" rx="6" ry="3.5" fill="#7e9040" transform="rotate(32 119 17)" />

        {/* ---- EYEBROWS ---- */}
        <path d={`M80 ${86 + py * 0.3} Q90 ${81 + py * 0.3} 99 ${85 + py * 0.3}`} stroke="#4a3216" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M121 ${85 + py * 0.3} Q130 ${81 + py * 0.3} 140 ${86 + py * 0.3}`} stroke="#4a3216" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* ---- EYES — big white sclera so the dark pupil tracker is clearly visible ---- */}
        {/* Left eye white */}
        <ellipse cx="92" cy="104" rx="15" ry={17 * eo} fill="#fff" stroke="#4a3216" strokeWidth="1.5" />
        {/* Right eye white */}
        <ellipse cx="128" cy="104" rx="15" ry={17 * eo} fill="#fff" stroke="#4a3216" strokeWidth="1.5" />
        {eo > 0.15 && (
          <>
            {/* Dark pupils that track the cursor — clearly visible on white */}
            <circle cx={92 + px} cy={104 + py} r="7.5" fill="#1a0f06" />
            <circle cx={128 + px} cy={104 + py} r="7.5" fill="#1a0f06" />
            {/* Highlights on pupils */}
            <circle cx={89 + px} cy={101 + py} r="2.5" fill="#fff" />
            <circle cx={125 + px} cy={101 + py} r="2.5" fill="#fff" />
          </>
        )}

        {/* ---- CHEEKS ---- */}
        <ellipse cx="68" cy="122" rx="8" ry="5" fill="#e8836a" opacity="0.55" />
        <ellipse cx="152" cy="122" rx="8" ry="5" fill="#e8836a" opacity="0.55" />

        {/* ---- MOUTH ---- */}
        {scared ? (
          <ellipse cx="110" cy="136" rx="7" ry="10" fill="#3a1408" stroke="#2a0e04" strokeWidth="1.5" />
        ) : (
          <g>
            <path
              d={running
                ? "M94 128 Q110 150 126 128 Q118 142 110 142 Q102 142 94 128 Z"
                : "M96 128 Q110 144 124 128 Q116 138 110 138 Q104 138 96 128 Z"}
              fill="#3a1408"
              stroke="#2a0e04"
              strokeWidth="1.5"
            />
            <path d="M99 128 Q110 132 121 128 L119 131 Q110 134 101 131 Z" fill="#fff" />
            <ellipse cx="110" cy={running ? 139 : 135} rx="6" ry={running ? 4 : 2.5} fill="#e8676a" />
          </g>
        )}
      </g>

      {/* Speed lines when running */}
      {running && (
        <g opacity="0.4">
          <line x1="14" y1="100" x2="42" y2="100" stroke="#d8b483" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="8" y1="120" x2="34" y2="120" stroke="#d8b483" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="18" y1="140" x2="46" y2="140" stroke="#d8b483" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/* Hammer with the HEAD AT THE BOTTOM (striking face down) and handle going up,
   so it can drop straight onto the potato's head like hitting a nail.
   viewBox 200x240; the striking face is near y=210, handle top near y=10. */
const HammerSVG = ({ size = 120 }) => (
  <svg viewBox="0 0 200 240" width={size} height={size * 1.2} style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))" }}>
    <defs>
      <linearGradient id="hH" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#b8bec8" />
        <stop offset="45%" stopColor="#6a707a" />
        <stop offset="100%" stopColor="#2a3038" />
      </linearGradient>
      <linearGradient id="hHa" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#8a5a30" />
        <stop offset="50%" stopColor="#b88a4a" />
        <stop offset="100%" stopColor="#5a3a1a" />
      </linearGradient>
    </defs>
    {/* Handle (top, going up out of frame) */}
    <rect x="92" y="14" width="16" height="135" rx="6" fill="url(#hHa)" />
    <rect x="92" y="14" width="16" height="135" rx="6" fill="none" stroke="#3a2410" strokeWidth="1.5" />
    <rect x="91" y="30" width="18" height="3" fill="#3a2410" />
    <rect x="91" y="45" width="18" height="3" fill="#3a2410" />
    {/* Head (bottom — the striking part) */}
    <rect x="35" y="148" width="130" height="62" rx="10" fill="url(#hH)" />
    <rect x="35" y="148" width="130" height="62" rx="10" fill="none" stroke="#0e1318" strokeWidth="2.5" />
    {/* shine on head */}
    <rect x="40" y="153" width="120" height="9" rx="4" fill="rgba(255,255,255,0.32)" />
    {/* striking face highlight at very bottom */}
    <rect x="40" y="200" width="120" height="6" rx="3" fill="rgba(0,0,0,0.25)" />
  </svg>
);

export default function FloatingMascot({ onBonusUnlocked }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [bubble, setBubble] = useState(null);
  const [bubbleSide, setBubbleSide] = useState("right");
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [paused, setPaused] = useState(() => isMascotPaused());
  const [facing, setFacing] = useState(1);
  const [squash, setSquash] = useState(1);
  const [phase, setPhase] = useState("alive");
  const [scale, setScale] = useState(1);
  const [hammerY, setHammerY] = useState(-300);
  const [hammerRot, setHammerRot] = useState(-35);
  const [showHammer, setShowHammer] = useState(false);
  const [impactRing, setImpactRing] = useState(0);
  const [crumbs, setCrumbs] = useState([]);
  const [walkPhase, setWalkPhase] = useState(0);
  const [running, setRunning] = useState(false);
  const [moving, setMoving] = useState(false);
  const [blink, setBlink] = useState(0);

  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const mouseRef = useRef({ x: -9999, y: -9999, seen: false });
  const lastBubbleRef = useRef(0);
  const phraseQueueRef = useRef([]);
  const bubbleTimerRef = useRef(null);
  const bobRef = useRef(0);
  const facingRef = useRef(1);
  const restRef = useRef({ until: 0 });
  const wanderRef = useRef({ target: null, nextThink: 0 });
  const avoidRef = useRef(null);
  const phaseRef = useRef("alive");
  const catchCountRef = useRef(0);
  const catchCooldownUntilRef = useRef(0);
  const postFirstCatchRef = useRef(false);
  const walkRef = useRef(0);
  const blinkRef = useRef({ next: Date.now() + 3000, until: 0 });
  const BASE_CATCH_RADIUS = 42;

  useEffect(() => {
    const c = () =>
      setIsMobile(window.matchMedia("(max-width:768px)").matches || !window.matchMedia("(hover:hover)").matches);
    c();
    window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);

  useEffect(() => {
    const hu = getMascotHiddenUntil();
    const now = Date.now();
    if (hu > now) {
      phaseRef.current = "hidden";
      setPhase("hidden");
      const t = setTimeout(() => {
        if (isBonusAmmoClaimed()) postFirstCatchRef.current = true;
        catchCountRef.current = 0;
        catchCooldownUntilRef.current = 0;
        phaseRef.current = "alive";
        setPhase("alive");
        setScale(isBonusAmmoClaimed() ? 0.78 : 1);
        setBubble("i'm back. don't get comfortable.");
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => setBubble(null), 2500);
      }, hu - now);
      return () => clearTimeout(t);
    }
    if (isBonusAmmoClaimed()) {
      postFirstCatchRef.current = true;
      setScale(0.78);
    }
  }, []);

  useEffect(() => {
    const ix = Math.min(window.innerWidth - 200, window.innerWidth * 0.75);
    const iy = Math.min(window.innerHeight * 0.45, 360);
    posRef.current = { x: ix, y: iy };
    setPos({ x: ix, y: iy });
    setReady(true);
    const t = setTimeout(() => {
      if (phaseRef.current === "hidden") return;
      setBubble("psst… try to catch me 🥔");
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => setBubble(null), 4200);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const h = (e) => {
      avoidRef.current = e.detail;
    };
    window.addEventListener("iotato:game-area", h);
    return () => window.removeEventListener("iotato:game-area", h);
  }, []);

  useEffect(() => {
    const h = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, seen: true };
    };
    window.addEventListener("mousemove", h);
    window.addEventListener("pointermove", h);
    return () => {
      window.removeEventListener("mousemove", h);
      window.removeEventListener("pointermove", h);
    };
  }, []);

  // Returns the next phrase, cycling through a shuffled queue so none repeats
  // until all have been shown (feels less random/repetitive).
  const nextPhrase = useCallback(() => {
    if (phraseQueueRef.current.length === 0) {
      const shuffled = [...PHRASES];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      phraseQueueRef.current = shuffled;
    }
    return phraseQueueRef.current.shift();
  }, []);

  const triggerStage1 = useCallback(() => {
    if (phaseRef.current !== "alive") return;
    phaseRef.current = "frozenStage1";
    setPhase("frozenStage1");
    velRef.current.vx = 0;
    velRef.current.vy = 0;
    catchCountRef.current = 1;
    setBubble(FIRST_CATCH_PHRASES[Math.floor(Math.random() * FIRST_CATCH_PHRASES.length)]);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), 2200);
    const start = performance.now();
    const dur = 1000;
    const anim = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      setScale(1 + (0.78 - 1) * t);
      if (t < 1 && phaseRef.current === "frozenStage1") requestAnimationFrame(anim);
      else {
        postFirstCatchRef.current = true;
        catchCooldownUntilRef.current = Date.now() + 1000;
        phaseRef.current = "alive";
        setPhase("alive");
      }
    };
    requestAnimationFrame(anim);
  }, []);

  const triggerStage2 = useCallback(() => {
    if (phaseRef.current !== "alive") return;
    phaseRef.current = "frozenStage2";
    setPhase("frozenStage2");
    velRef.current.vx = 0;
    velRef.current.vy = 0;
    catchCountRef.current = 2;
    setBubble("oh no");
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubble(null), 700);
    setShowHammer(true);
    // Hammer head starts high above and drops straight down onto the potato's head.
    // With translate(-50%,-100%), hammerY is the y of the striking face.
    setHammerY(-150);
    setHammerRot(0);
    phaseRef.current = "hammer";
    setPhase("hammer");
    const start = performance.now();
    const dur = 420;
    const anim = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      // Ease-in (accelerate) for a satisfying slam
      const e2 = t * t * t;
      // Drop from -150 down to -55 (just touching top of the potato head)
      setHammerY(-150 + 95 * e2);
      setHammerRot(0);
      if (t < 1) requestAnimationFrame(anim);
      else {
        phaseRef.current = "smashed";
        setPhase("smashed");
        setScale(0.78);
        setImpactRing(1);
        let sT = 0;
        const sI = setInterval(() => {
          sT += 0.05;
          setImpactRing(Math.max(0, 1 - sT));
          if (sT > 1) {
            clearInterval(sI);
            setImpactRing(0);
          }
        }, 20);
        const nc = [];
        for (let i = 0; i < 14; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
          const sp = 80 + Math.random() * 140;
          nc.push({
            id: i + Math.random(),
            x: 0,
            y: 0,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 1.2,
            r: 2 + Math.random() * 3,
          });
        }
        setCrumbs(nc);
        const cs = performance.now();
        const ca = () => {
          setCrumbs((p) =>
            p
              .map((c) => ({
                ...c,
                x: c.x + c.vx * 0.03,
                y: c.y + c.vy * 0.03,
                vy: c.vy + 380 * 0.03,
                life: c.life - 0.03,
              }))
              .filter((c) => c.life > 0)
          );
          if (performance.now() - cs < 1300) requestAnimationFrame(ca);
          else setCrumbs([]);
        };
        requestAnimationFrame(ca);
        let unl = false;
        if (!isBonusAmmoClaimed()) {
          claimBonusAmmo();
          unl = true;
        }
        if (onBonusUnlocked) onBonusUnlocked(unl);
        setTimeout(() => {
          setShowHammer(false);
          setBubble(unl ? "you got me… +2 ammo next run" : "you got me… again");
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = setTimeout(() => setBubble(null), 3000);
        }, 900);
        setMascotHiddenUntil(Date.now() + 3 * 60 * 1000);
        setTimeout(() => {
          phaseRef.current = "hidden";
          setPhase("hidden");
          setShowHammer(false);
          setBubble(null);
        }, 2600);
        setTimeout(() => {
          phaseRef.current = "rebuilding";
          setPhase("rebuilding");
          setBubble("i'm back. don't get comfortable.");
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = setTimeout(() => setBubble(null), 2500);
          const rs = performance.now();
          const ra = () => {
            const rt = Math.min(1, (performance.now() - rs) / 2000);
            setScale(rt * (2 - rt) * 0.78);
            if (rt < 1) requestAnimationFrame(ra);
            else {
              setScale(0.78);
              catchCountRef.current = 0;
              catchCooldownUntilRef.current = 0;
              phaseRef.current = "alive";
              setPhase("alive");
            }
          };
          requestAnimationFrame(ra);
        }, 3 * 60 * 1000);
      }
    };
    requestAnimationFrame(anim);
  }, [onBonusUnlocked]);

  useEffect(() => {
    if (!ready) return;
    let raf;
    let last = performance.now();
    const compAvoid = (cur) => {
      const a = avoidRef.current;
      if (!a) return { fx: 0, fy: 0, strength: 0 };
      const pad = 60;
      const r = { x: a.x - pad, y: a.y - pad, w: a.w + pad * 2, h: a.h + pad * 2 };
      const cx2 = Math.max(r.x, Math.min(cur.x, r.x + r.w));
      const cy2 = Math.max(r.y, Math.min(cur.y, r.y + r.h));
      const dx = cur.x - cx2,
        dy = cur.y - cy2;
      const d = Math.hypot(dx, dy);
      if (d < 1) {
        const dL = cur.x - r.x,
          dR = r.x + r.w - cur.x,
          dT = cur.y - r.y,
          dB = r.y + r.h - cur.y;
        const mn = Math.min(dL, dR, dT, dB);
        let nx = 0,
          ny = 0;
        if (mn === dL) nx = -1;
        else if (mn === dR) nx = 1;
        else if (mn === dT) ny = -1;
        else ny = 1;
        return { fx: nx, fy: ny, strength: 1, inside: true };
      }
      const inf = 80;
      if (d > inf) return { fx: 0, fy: 0, strength: 0 };
      const t = 1 - d / inf;
      return { fx: (dx / d) * t, fy: (dy / d) * t, strength: t };
    };

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      bobRef.current += dt * 2;
      if (paused || (phaseRef.current !== "alive" && phaseRef.current !== "rebuilding")) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (isMobile) {
        const cx = window.innerWidth * 0.78,
          cy = Math.min(window.innerHeight * 0.42, 320);
        posRef.current = { x: cx + Math.sin(bobRef.current * 0.6) * 14, y: cy + Math.sin(bobRef.current) * 10 };
        setPos(posRef.current);
        raf = requestAnimationFrame(tick);
        return;
      }
      const cur = posRef.current;
      const mx = mouseRef.current.x,
        my = mouseRef.current.y;
      const dx = cur.x - mx,
        dy = cur.y - my,
        dist = Math.hypot(dx, dy);
      const vw = window.innerWidth,
        vh = window.innerHeight;
      const nMs = Date.now();
      const cr = (postFirstCatchRef.current ? BASE_CATCH_RADIUS * 0.85 : BASE_CATCH_RADIUS) * scale;
      if (dist < cr && phaseRef.current === "alive") {
        if (catchCountRef.current === 0) triggerStage1();
        else if (nMs >= catchCooldownUntilRef.current) triggerStage2();
        raf = requestAnimationFrame(tick);
        return;
      }
      const av = compAvoid(cur);
      if (av.strength > 0) {
        const pw = av.inside ? 1400 : 900 * av.strength;
        velRef.current.vx += av.fx * pw * dt;
        velRef.current.vy += av.fy * pw * dt;
      }
      const resting = nMs < restRef.current.until;
      const flR = 200,
        paR = 100;
      const cc = mouseRef.current.seen && dist < flR;
      const fb = postFirstCatchRef.current ? 1.3 : 1.0;
      if (cc && !resting) {
        const t = 1 - dist / flR;
        const force = (700 * (t * t * t) + 180 * t) * fb;
        let ndx = dx / (dist || 1),
          ndy = dy / (dist || 1);
        const ep = 0.6,
          em = 140;
        if (cur.x < em) ndx += ep * (1 - cur.x / em);
        if (cur.x > vw - em) ndx -= ep * (1 - (vw - cur.x) / em);
        if (cur.y < em) ndy += ep * (1 - cur.y / em);
        if (cur.y > vh - em) ndy -= ep * (1 - (vh - cur.y) / em);
        const nm = Math.hypot(ndx, ndy) || 1;
        ndx /= nm;
        ndy /= nm;
        const pp = { x: -ndy, y: ndx };
        const j = Math.sin(now * 0.005) * 0.3;
        ndx += pp.x * j;
        ndy += pp.y * j;
        const nm2 = Math.hypot(ndx, ndy) || 1;
        ndx /= nm2;
        ndy /= nm2;
        velRef.current.vx += ndx * force * dt;
        velRef.current.vy += ndy * force * dt;
        setSquash(1 + Math.min(0.15, t * 0.2));
        if (dist < paR && nMs - lastBubbleRef.current > 2400) {
          lastBubbleRef.current = nMs;
          setBubble(nextPhrase());
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = setTimeout(() => setBubble(null), 2600);
          restRef.current.until = nMs + 1800;
        }
      } else if (resting) {
        velRef.current.vx *= 0.7;
        velRef.current.vy *= 0.7;
        setSquash(1 + Math.sin(bobRef.current * 1.5) * 0.04);
      } else {
        if (!wanderRef.current.target || nMs > wanderRef.current.nextThink) {
          const mX = vw * 0.2,
            mY = vh * 0.2;
          let pk = null;
          for (let i = 0; i < 8; i++) {
            const c = { x: mX + Math.random() * (vw - 2 * mX), y: mY + Math.random() * (vh - 2 * mY) };
            const a = avoidRef.current;
            if (!a) {
              pk = c;
              break;
            }
            const p = 80;
            if (!(c.x > a.x - p && c.x < a.x + a.w + p && c.y > a.y - p && c.y < a.y + a.h + p)) {
              pk = c;
              break;
            }
          }
          if (!pk) pk = { x: vw * 0.5, y: vh * 0.3 };
          wanderRef.current.target = pk;
          wanderRef.current.nextThink = nMs + 5000 + Math.random() * 5000;
        }
        const tgt = wanderRef.current.target;
        const tdx = tgt.x - cur.x,
          tdy = tgt.y - cur.y,
          td = Math.hypot(tdx, tdy);
        if (td > 30) {
          velRef.current.vx += (tdx / td) * 22 * dt;
          velRef.current.vy += (tdy / td) * 22 * dt;
        }
        setSquash(1);
      }
      velRef.current.vx *= 0.92;
      velRef.current.vy *= 0.92;
      const cap = resting ? 4 : postFirstCatchRef.current ? 28 : 22;
      const sp = Math.hypot(velRef.current.vx, velRef.current.vy);
      if (sp > cap) {
        velRef.current.vx = (velRef.current.vx / sp) * cap;
        velRef.current.vy = (velRef.current.vy / sp) * cap;
      }
      let nx = cur.x + velRef.current.vx,
        ny = cur.y + velRef.current.vy;
      if (nx < 70) {
        nx = 70;
        velRef.current.vx *= -0.4;
      }
      if (nx > vw - 70) {
        nx = vw - 70;
        velRef.current.vx *= -0.4;
      }
      if (ny < 60) {
        ny = 60;
        velRef.current.vy *= -0.4;
      }
      if (ny > vh - 110) {
        ny = vh - 110;
        velRef.current.vy *= -0.4;
      }
      posRef.current = { x: nx, y: ny };
      if (velRef.current.vx > 0.3) facingRef.current = -1;
      else if (velRef.current.vx < -0.3) facingRef.current = 1;
      setFacing(facingRef.current);

      // Walk/run animation phase — ONLY advances while the potato is actually moving.
      // When idle, the cycle eases back to a neutral standing pose (phase 0).
      const moveSpeed = Math.hypot(velRef.current.vx, velRef.current.vy);
      const isMoving = moveSpeed > 2.5;
      const isRunning = moveSpeed > 8;
      if (isMoving) {
        walkRef.current += dt * (6 + moveSpeed * 0.9);
      } else {
        // Ease the limbs back toward a resting position (nearest multiple of PI → legs together)
        const target = Math.round(walkRef.current / Math.PI) * Math.PI;
        walkRef.current += (target - walkRef.current) * Math.min(1, dt * 8);
      }
      setWalkPhase(walkRef.current);
      setRunning(isRunning);
      setMoving(isMoving);

      // Blinking
      if (nMs > blinkRef.current.next) {
        blinkRef.current.until = nMs + 140;
        blinkRef.current.next = nMs + 2500 + Math.random() * 3500;
      }
      setBlink(nMs < blinkRef.current.until ? 1 : 0);

      setBubbleSide(nx > vw - 240 ? "left" : "right");
      setPos({ x: nx, y: ny });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isMobile, ready, scale, triggerStage1, triggerStage2, paused, nextPhrase]);

  const togglePause = () => {
    setPaused((p) => {
      const n = !p;
      setMascotPausedLS(n);
      return n;
    });
  };

  // On mobile / touch devices there is no cursor to dodge, so the mascot
  // doesn't make sense — disable it entirely.
  if (isMobile) return null;

  if (!ready || phase === "hidden") {
    // Even when hidden, show the pause toggle so user knows mascot exists
    return (
      <button
        onClick={togglePause}
        title="Pause IOTATO"
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 40,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(20,30,25,0.85)",
          border: "1px solid rgba(111,191,115,0.4)",
          color: "#e7e2d6",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          backdropFilter: "blur(8px)",
        }}
      >
        🥔
      </button>
    );
  }

  if (paused) {
    return (
      <button
        onClick={togglePause}
        title="Resume IOTATO"
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 40,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(20,30,25,0.85)",
          border: "1px solid rgba(111,191,115,0.4)",
          color: "#e7e2d6",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          backdropFilter: "blur(8px)",
        }}
      >
        🥔
      </button>
    );
  }

  // Speech bubble sits ABOVE the potato, with a tail pointing down into it,
  // so it clearly originates from the character. Nudges left/right near edges.
  const bSt = {
    bottom: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    marginBottom: "10px",
  };
  const tSt = {
    left: "50%",
    bottom: "-6px",
    marginLeft: "-6px",
    borderRight: "1px solid rgba(111,191,115,0.5)",
    borderBottom: "1px solid rgba(111,191,115,0.5)",
  };

  return (
    <>
      <div className="pointer-events-none" style={{ position: "fixed", inset: 0, zIndex: 25, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: `translate(-50%,-50%) scale(${scale * squash}, ${scale * (2 - squash)}) scaleX(${facing})`,
            transformOrigin: "center bottom",
            willChange: "left,top,transform",
            transition: "filter 0.2s",
          }}
        >
          {/* The IOTATO character — detailed animated SVG */}
          {phase !== "smashed" && (() => {
            const moveSpeed = Math.hypot(velRef.current.vx, velRef.current.vy);
            const speedFactor = Math.min(1, moveSpeed / 22);
            const isRun = speedFactor > 0.35;
            const isMov = moveSpeed > 2.5;
            const scared = phase === "frozenStage1" || phase === "frozenStage2" || phase === "hammer";
            // Eye tracking toward cursor (compensate for facing flip)
            const mx = mouseRef.current?.x ?? pos.x;
            const my = mouseRef.current?.y ?? pos.y;
            const dxe = mx - pos.x;
            const dye = my - pos.y;
            const de = Math.hypot(dxe, dye) || 1;
            const lookX = (dxe / de) * facing;
            const lookY = dye / de;
            return (
              <div style={{ position: "relative", display: "inline-block" }}>
                {/* Dust clouds when running */}
                {speedFactor > 0.4 && (
                  <>
                    <span
                      style={{
                        position: "absolute",
                        bottom: -2,
                        left: facing > 0 ? "78%" : "8%",
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(210,190,150,0.5), transparent 70%)",
                        animation: "dustPuff 0.5s ease-out infinite",
                        pointerEvents: "none",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: facing > 0 ? "68%" : "18%",
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(210,190,150,0.38), transparent 70%)",
                        animation: "dustPuff 0.65s ease-out infinite 0.15s",
                        pointerEvents: "none",
                      }}
                    />
                  </>
                )}
                <IotatoCharacter
                  size={132}
                  walkPhase={walkPhase}
                  running={isRun}
                  moving={isMov}
                  blink={blink}
                  lookX={lookX}
                  lookY={lookY}
                  scared={scared}
                />
              </div>
            );
          })()}
          {phase === "smashed" && (
            <div
              style={{
                width: 130,
                height: 40,
                background:
                  "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(232,184,74,0.7), rgba(184,138,74,0.5) 50%, transparent 80%)",
                borderRadius: "50%",
                filter: "blur(2px)",
              }}
            />
          )}
          {bubble && phase !== "smashed" && (
            <div
              style={{
                position: "absolute",
                ...bSt,
                padding: "8px 12px",
                borderRadius: 16,
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                background: "rgba(20,30,25,0.96)",
                border: "1px solid rgba(111,191,115,0.5)",
                color: "#e7e2d6",
                boxShadow: "0 4px 24px rgba(79,214,196,0.3)",
                animation: "bubbleIn 0.25s ease-out",
                transform: `scaleX(${facing})`,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {bubble}
              <span
                style={{
                  position: "absolute",
                  ...tSt,
                  width: 12,
                  height: 12,
                  transform: "rotate(45deg)",
                  background: "rgba(20,30,25,0.96)",
                }}
              />
            </div>
          )}
          {showHammer && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: hammerY,
                transform: `translate(-50%, -100%) rotate(${hammerRot}deg)`,
                transformOrigin: "50% 100%",
                pointerEvents: "none",
              }}
            >
              <HammerSVG size={120} />
            </div>
          )}
          {impactRing > 0 && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "30%",
                transform: `translate(-50%,-50%) scale(${1 + (1 - impactRing) * 2.5})`,
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: "4px solid rgba(232,184,74,0.7)",
                opacity: impactRing,
                pointerEvents: "none",
              }}
            />
          )}
          {crumbs.map((c) => (
            <div
              key={c.id}
              style={{
                position: "absolute",
                left: `calc(50% + ${c.x}px)`,
                top: `calc(40% + ${c.y}px)`,
                width: c.r * 2,
                height: c.r * 2,
                borderRadius: "30%",
                background: "#b88a4a",
                opacity: Math.max(0, c.life / 1.2),
                transform: `rotate(${c.x * 10}deg)`,
                pointerEvents: "none",
              }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={togglePause}
        title="Pause IOTATO"
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 40,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(20,30,25,0.85)",
          border: "1px solid rgba(111,191,115,0.4)",
          color: "#e7e2d6",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          backdropFilter: "blur(8px)",
        }}
      >
        ⏸
      </button>
    </>
  );
}

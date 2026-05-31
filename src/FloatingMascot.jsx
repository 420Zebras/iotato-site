import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   FLOATING MASCOT — the IOTATO potato that wanders around
   the website, dodges your cursor, and gets smashed by a
   hammer after you catch it twice → +1 starting ammo unlock.
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
];
const FIRST_CATCH_PHRASES = [
  "okay okay, you touched the spud",
  "tiny potato, big panic",
  "wait… that was illegal",
  "fine. round two then.",
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
function AnimatedPotato({ size = 130, walkPhase = 0, running = false, blink = 0, lookX = 0, lookY = 0, scared = false }) {
  // Leg swing (alternating)
  const legL = Math.sin(walkPhase) * (running ? 14 : 6);
  const legR = Math.sin(walkPhase + Math.PI) * (running ? 14 : 6);
  // Body bob (up-down as legs cycle)
  const bob = Math.abs(Math.sin(walkPhase * 2)) * (running ? -6 : -2);
  // Arm wave (out-of-phase with legs for natural running)
  const armSwingL = Math.sin(walkPhase + Math.PI) * (running ? 14 : 5);
  const armSwingR = Math.sin(walkPhase) * (running ? 14 : 5);
  // Tilt forward when running
  const tilt = running ? Math.sin(walkPhase * 0.5) * 4 - 2 : 0;
  // Eye dimensions (blink squashes Y)
  const eyeOpenness = 1 - blink * 0.95;

  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} style={{
      filter: scared
        ? "drop-shadow(0 8px 16px rgba(255,90,90,0.4))"
        : "drop-shadow(0 10px 28px rgba(232,184,74,0.45))",
      overflow: "visible",
    }}>
      <defs>
        <radialGradient id="potatoBody" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#ffe070" />
          <stop offset="45%" stopColor="#e8b450" />
          <stop offset="100%" stopColor="#8a6020" />
        </radialGradient>
        <radialGradient id="armGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffd860" />
          <stop offset="100%" stopColor="#a0701a" />
        </radialGradient>
        <radialGradient id="legGrad" cx="40%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#ffd860" />
          <stop offset="100%" stopColor="#8a5a18" />
        </radialGradient>
      </defs>

      {/* Ground shadow — gets smaller when "in air" (running peak) */}
      <ellipse
        cx="100"
        cy="232"
        rx={32 - Math.abs(bob) * 1.2}
        ry="4"
        fill="rgba(232, 184, 74, 0.35)"
      />

      <g transform={`translate(0 ${bob}) rotate(${tilt} 100 130)`}>
        {/* LEFT LEG */}
        <g transform={`translate(78 ${190 + legL})`}>
          {/* Thigh */}
          <ellipse cx="0" cy="-8" rx="9" ry="12" fill="url(#legGrad)" />
          {/* Foot */}
          <ellipse cx="0" cy="8" rx="11" ry="6" fill="#7a5018" />
          <ellipse cx="0" cy="6" rx="9" ry="4" fill="#a07030" />
        </g>
        {/* RIGHT LEG */}
        <g transform={`translate(122 ${190 + legR})`}>
          <ellipse cx="0" cy="-8" rx="9" ry="12" fill="url(#legGrad)" />
          <ellipse cx="0" cy="8" rx="11" ry="6" fill="#7a5018" />
          <ellipse cx="0" cy="6" rx="9" ry="4" fill="#a07030" />
        </g>

        {/* LEFT ARM — swings opposite to left leg */}
        <g transform={`translate(58 110) rotate(${armSwingL * -2})`}>
          <ellipse cx="0" cy="20" rx="9" ry="22" fill="url(#armGrad)" />
          {/* Hand */}
          <circle cx="0" cy="42" r="11" fill="#ffd860" />
          <circle cx="-3" cy="40" r="2" fill="#a07030" opacity="0.4" />
          {/* Wrist band */}
          <ellipse cx="0" cy="34" rx="9" ry="3" fill="#b88030" />
        </g>
        {/* RIGHT ARM */}
        <g transform={`translate(142 110) rotate(${armSwingR * 2})`}>
          <ellipse cx="0" cy="20" rx="9" ry="22" fill="url(#armGrad)" />
          <circle cx="0" cy="42" r="11" fill="#ffd860" />
          <circle cx="3" cy="40" r="2" fill="#a07030" opacity="0.4" />
          <ellipse cx="0" cy="34" rx="9" ry="3" fill="#b88030" />
        </g>

        {/* BODY (potato) */}
        <ellipse cx="100" cy="115" rx="55" ry="78" fill="url(#potatoBody)" />
        {/* Body highlight */}
        <ellipse cx="78" cy="80" rx="20" ry="28" fill="#fff" opacity="0.18" />
        {/* Potato spots */}
        <ellipse cx="75" cy="100" rx="3" ry="2" fill="#6a4818" opacity="0.5" />
        <ellipse cx="125" cy="85" rx="2.5" ry="2" fill="#6a4818" opacity="0.45" />
        <ellipse cx="95" cy="150" rx="3" ry="2" fill="#6a4818" opacity="0.45" />
        <ellipse cx="125" cy="155" rx="2" ry="1.5" fill="#6a4818" opacity="0.4" />
        <ellipse cx="60" cy="130" rx="2.5" ry="1.8" fill="#6a4818" opacity="0.4" />

        {/* Sprout on top */}
        <path d="M100 38 Q98 22 105 18" stroke="#5a3a18" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <ellipse cx="108" cy="17" rx="5" ry="3" fill="#7a5028" transform="rotate(30 108 17)" />

        {/* FACE — eyebrows */}
        <path
          d="M68 78 Q78 70 88 76"
          stroke="#5a3a18"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M112 76 Q122 70 132 78"
          stroke="#5a3a18"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* EYES — white background */}
        <ellipse cx="80" cy="95" rx="13" ry={15 * eyeOpenness} fill="#fff" />
        <ellipse cx="120" cy="95" rx="13" ry={15 * eyeOpenness} fill="#fff" />
        {/* Pupils — tracking */}
        {eyeOpenness > 0.1 && (
          <>
            <circle cx={80 + lookX * 4} cy={95 + lookY * 4} r="7" fill="#0a0604" />
            <circle cx={120 + lookX * 4} cy={95 + lookY * 4} r="7" fill="#0a0604" />
            {/* Sparkle highlights */}
            <circle cx={77 + lookX * 4} cy={91 + lookY * 4} r="2.5" fill="#fff" />
            <circle cx={117 + lookX * 4} cy={91 + lookY * 4} r="2.5" fill="#fff" />
            <circle cx={83 + lookX * 4} cy={99 + lookY * 4} r="1.2" fill="#fff" />
          </>
        )}

        {/* Cheek blush */}
        <ellipse cx="60" cy="125" rx="8" ry="5" fill="#e85a4a" opacity="0.6" />
        <ellipse cx="140" cy="125" rx="8" ry="5" fill="#e85a4a" opacity="0.6" />

        {/* Mouth — open smile while running */}
        {scared ? (
          <ellipse cx="100" cy="142" rx="7" ry="9" fill="#3a1a08" />
        ) : running ? (
          <g>
            <ellipse cx="100" cy="138" rx="14" ry="9" fill="#3a1a08" />
            <ellipse cx="100" cy="142" rx="10" ry="4" fill="#e84a5a" />
            {/* tongue */}
            <ellipse cx="100" cy="146" rx="6" ry="2" fill="#ff8a8a" />
          </g>
        ) : (
          <g>
            <path d="M85 132 Q100 148 115 132" stroke="#3a1a08" strokeWidth="3" fill="#3a1a08" strokeLinecap="round" />
            <ellipse cx="100" cy="138" rx="8" ry="4" fill="#e84a5a" />
          </g>
        )}
      </g>

      {/* Motion lines when running */}
      {running && (
        <g opacity="0.4">
          <line x1="20" y1="120" x2="50" y2="120" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line x1="15" y1="140" x2="40" y2="140" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <line x1="25" y1="160" x2="55" y2="160" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/* SVG Hammer for the smash animation */
const HammerSVG = ({ size = 140 }) => (
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
    <rect x="35" y="30" width="130" height="62" rx="10" fill="url(#hH)" />
    <rect x="35" y="30" width="130" height="62" rx="10" fill="none" stroke="#0e1318" strokeWidth="2.5" />
    <rect x="40" y="35" width="120" height="9" rx="4" fill="rgba(255,255,255,0.32)" />
    <rect x="92" y="92" width="16" height="130" rx="6" fill="url(#hHa)" />
    <rect x="92" y="92" width="16" height="130" rx="6" fill="none" stroke="#3a2410" strokeWidth="1.5" />
    <rect x="91" y="180" width="18" height="3" fill="#3a2410" />
    <rect x="91" y="195" width="18" height="3" fill="#3a2410" />
    <rect x="91" y="210" width="18" height="3" fill="#3a2410" />
    <ellipse cx="100" cy="225" rx="11" ry="5" fill="#3a2410" />
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
  const [blink, setBlink] = useState(0);

  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const mouseRef = useRef({ x: -9999, y: -9999, seen: false });
  const lastBubbleRef = useRef(0);
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
    setHammerY(-280);
    setHammerRot(-35);
    phaseRef.current = "hammer";
    setPhase("hammer");
    const start = performance.now();
    const dur = 520;
    const anim = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const e2 = t * t;
      setHammerY(-280 + (-90 + 280) * e2);
      setHammerRot(-35 + (0 + 35) * e2);
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
          setBubble(unl ? "you got me… +1 ammo next run" : "you got me… again");
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
          setBubble(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
          if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = setTimeout(() => setBubble(null), 2400);
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

      // Walk/run animation phase — speed of leg cycle scales with movement speed
      const moveSpeed = Math.hypot(velRef.current.vx, velRef.current.vy);
      const isRunning = moveSpeed > 8;
      walkRef.current += dt * (8 + moveSpeed * 0.8);
      setWalkPhase(walkRef.current);
      setRunning(isRunning);

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
  }, [isMobile, ready, scale, triggerStage1, triggerStage2, paused]);

  const togglePause = () => {
    setPaused((p) => {
      const n = !p;
      setMascotPausedLS(n);
      return n;
    });
  };

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

  const bSt =
    bubbleSide === "right"
      ? { top: "-12px", left: "100%", marginLeft: "6px" }
      : { top: "-12px", right: "100%", marginRight: "6px" };
  const tSt =
    bubbleSide === "right"
      ? {
          left: "-6px",
          top: "16px",
          borderLeft: "1px solid rgba(111,191,115,0.5)",
          borderBottom: "1px solid rgba(111,191,115,0.5)",
        }
      : {
          right: "-6px",
          top: "16px",
          borderRight: "1px solid rgba(111,191,115,0.5)",
          borderTop: "1px solid rgba(111,191,115,0.5)",
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
          {/* The actual potato character — animated SVG */}
          {phase !== "smashed" && (() => {
            // Compute eye look direction (toward mouse)
            const mx = mouseRef.current?.x ?? pos.x;
            const my = mouseRef.current?.y ?? pos.y;
            const dx = mx - pos.x;
            const dy = my - pos.y;
            const d = Math.hypot(dx, dy) || 1;
            // The whole SVG is mirrored via scaleX(facing). To make eyes look at the
            // real mouse position, we need to compensate: multiply lookX by facing.
            // When facing=1 (looking left): lookX positive means mouse is right → eyes look right (correct)
            // When facing=-1 (looking right, flipped): pre-flip we need to look "wrong way"
            // so the flip restores correct visual direction → multiply by facing.
            const lookX = (dx / d) * facing;
            const lookY = dy / d;
            return (
              <AnimatedPotato
                size={130}
                walkPhase={walkPhase}
                running={running}
                blink={blink}
                lookX={lookX}
                lookY={lookY}
                scared={phase === "frozenStage1" || phase === "frozenStage2" || phase === "hammer"}
              />
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
                transform: `translate(-50%,0) rotate(${hammerRot}deg) scaleX(${facing})`,
                transformOrigin: "50% 90%",
                pointerEvents: "none",
              }}
            >
              <HammerSVG size={140} />
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

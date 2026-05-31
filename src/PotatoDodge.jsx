import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   POTATO DODGE — v3 "Deep Cuts"  (standalone playable demo)
   New: dash + i-frames, charge shot, soft combo, perfect-dodge
   slow-mo, streak multiplier, boss enrage phase, juice.
   ============================================================ */

/* Bonus ammo: unlocked by smashing the floating mascot on the website.
   Grants +2 starting ammo. Stored in localStorage by FloatingMascot. */
const BONUS_AMMO_KEY = "iotato_bonus_ammo_claimed";
const BONUS_AMMO_AMOUNT = 2;
function getBonusAmmo() {
  try {
    return localStorage.getItem(BONUS_AMMO_KEY) === "1" ? BONUS_AMMO_AMOUNT : 0;
  } catch {
    return 0;
  }
}

const C = {
  iota: "#4fd6c4",
  tln: "#7aa8ff",
  gold: "#e8b84a",
  green: "#6fbf73",
  greenLt: "#a8e0a8",
  fud: "#a04ad6",
  danger: "#ff5a6a",
  candle: "#ff6b5a",
  magenta: "#ff6bb5",
};
const btnPrimary = {
  background: "linear-gradient(135deg,#6fbf73,#4fd6c4)",
  color: "#08120d",
  boxShadow: "0 8px 28px rgba(79,214,196,0.3)",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
};
const btnGhost = {
  background: "rgba(255,255,255,0.05)",
  color: "#e7e2d6",
  border: "1px solid rgba(231,226,214,0.22)",
  cursor: "pointer",
  fontWeight: 600,
};
const rand = (a, b) => a + Math.random() * (b - a),
  clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- draw helpers ---------- */
function drawBackground(ctx, s) {
  const g = ctx.createLinearGradient(0, 0, 0, s.h);
  if (s.boss) {
    g.addColorStop(0, s.boss.enraged ? "#3a0820" : "#2a0824");
    g.addColorStop(0.45, "#160a1c");
    g.addColorStop(1, "#050208");
  } else {
    g.addColorStop(0, "#0c1a14");
    g.addColorStop(0.5, "#0a1612");
    g.addColorStop(1, "#04080a");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.w, s.h);
  const mx = s.w * 0.78,
    my = s.h * 0.16;
  const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 100);
  if (s.boss) {
    mg.addColorStop(0, "rgba(255,90,140,0.45)");
    mg.addColorStop(0.5, "rgba(160,74,214,0.16)");
    mg.addColorStop(1, "rgba(160,74,214,0)");
  } else {
    mg.addColorStop(0, "rgba(232,224,200,0.5)");
    mg.addColorStop(0.5, "rgba(111,191,115,0.1)");
    mg.addColorStop(1, "rgba(79,214,196,0)");
  }
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = s.boss ? "rgba(220,180,200,0.28)" : "rgba(230,222,200,0.55)";
  ctx.beginPath();
  ctx.arc(mx, my, 24, 0, Math.PI * 2);
  ctx.fill();
  for (const st of s.stars) {
    ctx.globalAlpha = (0.4 + st.z * 0.5) * (s.boss ? 0.6 : 1);
    ctx.fillStyle = s.boss ? "#d04ab8" : "#7fcf83";
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.size * st.z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawHills(ctx, s) {
  for (const hl of s.hills) {
    ctx.fillStyle = hl.color;
    ctx.beginPath();
    const bY = hl.baseY * s.h;
    ctx.moveTo(0, s.h);
    for (let x = 0; x <= s.w; x += 8) {
      const w = Math.sin(((x + hl.offset) / hl.period) * Math.PI * 2) * hl.amp;
      const w2 = Math.sin(((x + hl.offset * 0.6) / (hl.period * 0.5)) * Math.PI * 2) * (hl.amp * 0.3);
      ctx.lineTo(x, bY + w + w2);
    }
    ctx.lineTo(s.w, s.h);
    ctx.closePath();
    ctx.fill();
  }
}
function drawFog(ctx, s) {
  for (const f of s.fog) {
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    if (s.boss) {
      g.addColorStop(0, `rgba(160,74,214,${f.a * 1.4})`);
      g.addColorStop(1, "rgba(160,74,214,0)");
    } else {
      g.addColorStop(0, `rgba(180,210,200,${f.a})`);
      g.addColorStop(1, "rgba(180,210,200,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawPlayer(ctx, p) {
  const x = p.x,
    y = p.y;
  const jmp = p.jumping || p.y < p.groundY - 1;
  const sY = jmp ? 1.1 - Math.min(0.3, Math.abs(p.vy) * 0.0005) : 1;
  const sX = jmp ? 0.95 : 1;
  const lS = jmp ? 0 : Math.sin(p.animPhase) * 3;
  const f = p.facing || 1;
  if (p.dashTime > 0) {
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = 0.12 * (1 - i / 5);
      ctx.fillStyle = C.iota;
      ctx.beginPath();
      ctx.ellipse(x - p.vx * 0.012 * i, y, 25, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const sa = Math.max(0.05, 0.25 - (p.groundY - y) * 0.001);
  ctx.fillStyle = `rgba(79,214,196,${sa})`;
  ctx.beginPath();
  ctx.ellipse(x, p.groundY + 28, 28 * (jmp ? 0.6 : 1), 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sX * f, sY);
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.ellipse(-10, 24 + lS, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, 24 - lS, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 32);
  g.addColorStop(0, "#e8c084");
  g.addColorStop(0.55, "#c89456");
  g.addColorStop(1, "#6e4a20");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.ellipse(-8, -10, 8, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6fbf73";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.quadraticCurveTo(-2, -36, 3, -40);
  ctx.stroke();
  ctx.fillStyle = "#7fcf83";
  ctx.beginPath();
  ctx.ellipse(4, -40, 3, 2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-7, -4, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7, -4, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0604";
  const lx = clamp((p.aimX - p.x) * 0.02, -2, 2),
    ly = clamp((p.aimY - p.y) * 0.02, -2, 2);
  ctx.beginPath();
  ctx.arc(-7 + lx, -3 + ly, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7 + lx, -3 + ly, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1808";
  ctx.lineWidth = 1.6;
  if (jmp) {
    ctx.beginPath();
    ctx.ellipse(0, 9, 3, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#2a1808";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.quadraticCurveTo(0, 11, 5, 6);
    ctx.stroke();
  }
  ctx.restore();
}
/* IOTA logo dots pattern — drawn inside the gem for IOTA tokens */
const IOTA_DOTS = [
  [-9, -7, 1.5], [-6, -10, 1], [-3, -8, 0.7], [3, -10, 1.2], [6, -7, 0.8],
  [-10, -3, 1.3], [-6, -4, 0.9], [-2, -2, 0.7], [2, -3, 0.8], [7, -4, 1.1], [10, -2, 0.7],
  [-8, 1, 1], [-4, 2, 1.3], [0, 0, 1.2], [4, 1, 0.9], [8, 2, 1.1],
  [-9, 5, 1.1], [-5, 7, 0.9], [-1, 5, 1.4], [3, 6, 0.8], [7, 7, 1], [10, 5, 0.7],
  [-6, 10, 1], [-2, 9, 0.8], [2, 11, 1.1], [6, 10, 0.9],
];

function drawGem(ctx, label, color, size) {
  const r = size / 2;
  // Outer glow
  ctx.fillStyle = color + "22";
  ctx.beginPath();
  ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
  ctx.fill();

  if (label === "IOTA") {
    // IOTA coin: black/dark circle with white dot swirl pattern
    const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, r);
    g.addColorStop(0, "#0e1815");
    g.addColorStop(0.7, "#050a09");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Teal rim
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    // White dots (scaled relative to gem size)
    const dotScale = size / 30;
    ctx.fillStyle = "#fff";
    for (const [dx, dy, dr] of IOTA_DOTS) {
      ctx.beginPath();
      ctx.arc(dx * dotScale * 0.9, dy * dotScale * 0.9, dr * dotScale * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
    // Subtle highlight
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.4, r * 0.55, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // TokenLabs coin: blue with flask
    const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, r);
    g.addColorStop(0, "#3a6dff");
    g.addColorStop(0.6, "#1a3ef5");
    g.addColorStop(1, "#0a1f8a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a0c4ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner ring (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    // Flask shape (centered)
    const fs = size / 36;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    // Flask body
    ctx.moveTo(-2 * fs, -5 * fs);
    ctx.lineTo(2 * fs, -5 * fs);
    ctx.lineTo(2 * fs, -1 * fs);
    ctx.lineTo(5 * fs, 5 * fs);
    ctx.quadraticCurveTo(5.5 * fs, 6.5 * fs, 4 * fs, 6.5 * fs);
    ctx.lineTo(-4 * fs, 6.5 * fs);
    ctx.quadraticCurveTo(-5.5 * fs, 6.5 * fs, -5 * fs, 5 * fs);
    ctx.lineTo(-2 * fs, -1 * fs);
    ctx.closePath();
    ctx.fill();
    // Flask rim/lip
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3 * fs, -5 * fs);
    ctx.lineTo(3 * fs, -5 * fs);
    ctx.stroke();
    // Bubbles above flask
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -7.5 * fs, 1.2 * fs, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2 * fs, -8.5 * fs, 0.7 * fs, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawCoin(ctx, size) {
  const r = size / 2;
  ctx.fillStyle = "rgba(232,184,74,0.3)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
  g.addColorStop(0, "#fff2b8");
  g.addColorStop(0.55, "#e8b84a");
  g.addColorStop(1, "#7a5a14");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a4010";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.arc(-3, -2, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
  ctx.fill();
}
function drawMoonItem(ctx, size) {
  const r = size / 2;
  ctx.fillStyle = "rgba(122,168,255,0.35)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
  g.addColorStop(0, "#e8efff");
  g.addColorStop(0.6, "#9ab8ff");
  g.addColorStop(1, "#3a5a9a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 7px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("2×", 0, 0);
}
function drawFud(ctx, size) {
  const r = size / 2;
  ctx.fillStyle = "rgba(160,74,214,0.3)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, r);
  g.addColorStop(0, "#6a3a8a");
  g.addColorStop(1, "#1a0a24");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a04ad6";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 8px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FUD", 0, 1);
}
function drawMagnet(ctx, size) {
  const r = size / 2;
  ctx.fillStyle = "rgba(255,107,181,0.3)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ff6bb5";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 2, r * 0.55, Math.PI * 1.1, Math.PI * 1.9, false);
  ctx.stroke();
  ctx.strokeStyle = "#d8d4cc";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55 + 1, 0);
  ctx.lineTo(-r * 0.55 + 1, 6);
  ctx.moveTo(r * 0.55 - 1, 0);
  ctx.lineTo(r * 0.55 - 1, 6);
  ctx.stroke();
}
function drawSproutItem(ctx, size) {
  const r = size / 2;
  ctx.fillStyle = "rgba(111,191,115,0.35)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, r * 0.7);
  g.addColorStop(0, "#e8c084");
  g.addColorStop(1, "#7a5528");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.3, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6fbf73";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, r * 0.1);
  ctx.quadraticCurveTo(-2, -r * 0.3, 0, -r * 0.7);
  ctx.stroke();
  ctx.fillStyle = "#7fcf83";
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.35, -r * 0.55, r * 0.3, r * 0.18, 0.6, 0, Math.PI * 2);
  ctx.fill();
}
function drawCandle(ctx, w, h) {
  ctx.strokeStyle = "#ff6b5a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 - 6);
  ctx.lineTo(0, h / 2 + 6);
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, "#ff7a6a");
  g.addColorStop(1, "#b8261a");
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = "#7a1a14";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}
function drawRock(ctx, w, h) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, h / 2 + 2, w / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-w / 4, -h / 4, 2, 0, 0, w / 2 + 4);
  g.addColorStop(0, "#7a6d5e");
  g.addColorStop(1, "#332b22");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 2);
  ctx.lineTo(-w / 2 + 4, -h / 2);
  ctx.lineTo(w / 4, -h / 2 + 2);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(w / 2 - 4, h / 2);
  ctx.lineTo(-w / 3, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a140e";
  ctx.lineWidth = 1;
  ctx.stroke();
}
function drawSprout(ctx, charged) {
  const sz = charged ? 1.6 : 1;
  ctx.save();
  ctx.scale(sz, sz);
  ctx.fillStyle = "rgba(111,191,115,0.4)";
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = charged ? "#fff" : "#7fcf83";
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a8e0a8";
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(11, -2);
  ctx.lineTo(11, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawBoss(ctx, b) {
  const x = b.x,
    y = b.y;
  const t = performance.now() / 500;
  const fa = b.hitFlash > 0 ? b.hitFlash / 0.25 : 0;
  const enr = b.enraged;
  ctx.fillStyle = enr ? "rgba(255,60,90,0.3)" : "rgba(160,74,214,0.25)";
  ctx.beginPath();
  ctx.arc(x, y, enr ? 80 : 70, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 8, y - 8, 4, x, y, 50);
  if (enr) {
    g.addColorStop(0, "#8a2a4a");
    g.addColorStop(0.6, "#5a1a2a");
    g.addColorStop(1, "#240810");
  } else {
    g.addColorStop(0, "#6a3a8a");
    g.addColorStop(0.6, "#3a1a5a");
    g.addColorStop(1, "#1a0824");
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, 50, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = enr ? "#ff5a6a" : "#a04ad6";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (fa > 0) {
    ctx.fillStyle = `rgba(255,255,255,${fa * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 50, 42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = enr ? "#240810" : "#1a0824";
  ctx.strokeStyle = enr ? "#ff5a6a" : "#a04ad6";
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 30);
  ctx.lineTo(x - 38, y - 50);
  ctx.lineTo(x - 22, y - 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 30, y - 30);
  ctx.lineTo(x + 38, y - 50);
  ctx.lineTo(x + 22, y - 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const eg = 0.7 + Math.sin(t * 3) * 0.3;
  ctx.fillStyle = `rgba(255,90,180,${eg})`;
  ctx.beginPath();
  ctx.ellipse(x - 14, y - 6, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 14, y - 6, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - 14, y - 6, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 14, y - 6, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = enr ? "#ff5a6a" : "#ff5a90";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 14);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x - 18 + i * 6, y + 14 + (i % 2 === 0 ? 0 : 4));
  ctx.stroke();
  ctx.fillStyle = enr ? "#ff5a6a" : "#ff5a90";
  ctx.font = "bold 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(enr ? "ENRAGED" : "BEAR MARKET", x, y + 60);
}

/* ---------- small UI ---------- */
function StatBadge({ label, value, accent, highlight }) {
  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: 10,
        background: highlight ? "rgba(232,184,74,0.15)" : "rgba(20,30,25,0.6)",
        border: `1px solid ${highlight ? "rgba(232,184,74,0.5)" : "rgba(111,191,115,0.2)"}`,
        fontSize: 13,
      }}
    >
      <span style={{ opacity: 0.6, marginRight: 8 }}>{label}</span>
      <span style={{ fontWeight: 700, color: accent ? "#ff9a9a" : highlight ? "#e8b84a" : "#e7e2d6" }}>{value}</span>
    </div>
  );
}
function Overlay({ children }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        background: "rgba(8,15,12,0.82)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div>{children}</div>
    </div>
  );
}

/* ============================================================
   MAIN GAME COMPONENT
   ============================================================ */
function PotatoDodge({ onSubmitScore, personalBest }) {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const bonusActive = getBonusAmmo() > 0;
  const [hud, setHud] = useState({
    score: 0,
    lives: 3,
    time: 0,
    level: 1,
    worldSpeed: 1,
    combo: 0,
    mult: 1,
    ammo: 3,
    streak: 0,
    charge: 0,
    dashCD: 0,
    bossHp: 0,
    bossHpMax: 0,
    boss: false,
    enraged: false,
  });
  const [finalStats, setFinalStats] = useState({ score: 0, time: 0, level: 1 });
  const stateRef = useRef(null);
  const ammoMax = 12;

  const mkState = useCallback(
    (w, h) => ({
      w,
      h,
      player: {
        x: w / 2,
        y: h - 80,
        groundY: h - 80,
        w: 44,
        h: 50,
        vx: 0,
        vy: 0,
        jumping: false,
        jumpsLeft: 2,
        animPhase: 0,
        facing: 1,
        invuln: 0,
        aimX: w / 2,
        aimY: h / 2,
        shootCD: 0,
        muzzle: 0,
        dashTime: 0,
        dashCD: 0,
        charge: 0,
        coyote: 0,
      },
      keys: { left: false, right: false, up: false, jumpQ: false, shoot: false, shootRel: false, dashQ: false },
      touch: { x: null, jumpQ: false, shoot: false, dashQ: false },
      tap: { lastLeft: 0, lastRight: 0 },
      entities: [],
      shots: [],
      parts: [],
      stars: Array.from({ length: 60 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: rand(0.3, 1),
        size: rand(0.5, 2),
      })),
      hills: [
        { offset: 0, speed: 6, color: "rgba(20,38,32,0.9)", amp: 40, period: 280, baseY: 0.55 },
        { offset: 0, speed: 14, color: "rgba(14,28,22,0.95)", amp: 55, period: 200, baseY: 0.68 },
        { offset: 0, speed: 28, color: "rgba(7,15,11,0.98)", amp: 35, period: 140, baseY: 0.82 },
      ],
      fog: Array.from({ length: 14 }, () => ({
        x: Math.random() * w,
        y: 0.6 * h + Math.random() * 0.35 * h,
        r: rand(60, 140),
        vx: rand(4, 14),
        a: rand(0.04, 0.1),
      })),
      shake: 0,
      flash: 0,
      flashColor: "#ff5a6a",
      shield: 0,
      slow: 0,
      slowMo: 0,
      moonBoost: 0,
      magnet: 0,
      comboF: 0,
      streak: 0,
      spawnT: 0,
      score: 0,
      lives: 3,
      time: 0,
      level: 1,
      lastTs: 0,
      over: false,
      explosions: [],
      lightning: [],
      nextLight: 8,
      boss: null,
      bossesDefeated: 0,
      nextBossLevel: 4,
      bossIntro: 0,
      levelFlash: 0,
      tierUpFlash: 0,
      perfectFlash: 0,
      ammo: 3 + getBonusAmmo(),
    }),
    [],
  );

  /* keyboard */
  useEffect(() => {
    const onKey = (e, down) => {
      const st = stateRef.current;
      if (!st) return;
      const k = st.keys;
      if (["ArrowLeft", "a", "A"].includes(e.key)) {
        if (down && !k.left) {
          const now = performance.now();
          if (now - st.tap.lastLeft < 260) k.dashQ = "left";
          st.tap.lastLeft = now;
        }
        k.left = down;
        e.preventDefault?.();
      }
      if (["ArrowRight", "d", "D"].includes(e.key)) {
        if (down && !k.right) {
          const now = performance.now();
          if (now - st.tap.lastRight < 260) k.dashQ = "right";
          st.tap.lastRight = now;
        }
        k.right = down;
        e.preventDefault?.();
      }
      if (["ArrowUp", "w", "W"].includes(e.key)) {
        if (down && !k.up) k.jumpQ = true;
        k.up = down;
        e.preventDefault?.();
      }
      if (["Shift"].includes(e.key)) {
        if (down) k.dashQ = st.player.facing > 0 ? "right" : "left";
        e.preventDefault?.();
      }
      if (["f", "F", " "].includes(e.key)) {
        if (down) k.shoot = true;
        else {
          if (k.shoot) k.shootRel = true;
          k.shoot = false;
        }
        e.preventDefault?.();
      }
    };
    const kd = (e) => {
      // Don't intercept keys when the user is typing in an input field
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      onKey(e, true);
    };
    const ku = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      onKey(e, false);
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  /* mouse aim + shoot */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onM = (e) => {
      const st = stateRef.current;
      if (!st) return;
      const r = c.getBoundingClientRect();
      st.player.aimX = e.clientX - r.left;
      st.player.aimY = e.clientY - r.top;
    };
    const onD = (e) => {
      const st = stateRef.current;
      if (!st || e.button !== 0) return;
      const r = c.getBoundingClientRect();
      st.player.aimX = e.clientX - r.left;
      st.player.aimY = e.clientY - r.top;
      st.keys.shoot = true;
    };
    const onU = () => {
      const st = stateRef.current;
      if (!st) return;
      if (st.keys.shoot) st.keys.shootRel = true;
      st.keys.shoot = false;
    };
    c.addEventListener("mousemove", onM);
    c.addEventListener("mousedown", onD);
    window.addEventListener("mouseup", onU);
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    return () => {
      c.removeEventListener("mousemove", onM);
      c.removeEventListener("mousedown", onD);
      window.removeEventListener("mouseup", onU);
    };
  }, []);

  const start = () => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = r.width * devicePixelRatio;
    c.height = r.height * devicePixelRatio;
    stateRef.current = mkState(r.width, r.height);
    setOver(false);
    setRunning(true);
  };

  /* main loop */
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf;

    const addP = (s, x, y, col, n = 12, spd = 160) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2,
          v = rand(60, spd);
        s.parts.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 40,
          life: 0.7,
          max: 0.7,
          col,
          size: rand(2, 4.5),
        });
      }
    };
    const addT = (s, x, y, text, col, big) => {
      s.parts.push({ x, y, vx: 0, vy: -70, life: big ? 1.2 : 0.9, max: big ? 1.2 : 0.9, col, size: 0, text, big });
    };
    const coll = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
    const hurt = (s, x, y, col = "#ff5a6a") => {
      if (s.player.dashTime > 0 || s.player.invuln > 0) return false; // i-frames
      if (s.shield > 0) {
        s.shield = 0;
        addP(s, x, y, "#e8b84a", 18);
        addT(s, x, y, "BLOCKED", "#e8b84a");
        return false;
      }
      s.lives--;
      s.comboF *= 0.5;
      s.streak = 0;
      s.shake = 0.45;
      s.flash = 0.3;
      s.flashColor = col;
      s.player.invuln = 1.1;
      addP(s, x, y, col, 20);
      if (s.lives <= 0) s.over = true;
      return true;
    };

    const spawn = (s) => {
      const r = Math.random();
      const x = rand(30, s.w - 30);
      const bs = 120 + s.level * 26;
      const hG = s.level >= 2;
      const bA = !!s.boss;
      const sc = bA ? 0.16 : 0.05;
      if (r < 0.006) s.entities.push({ type: "gold", x, y: -30, vy: bs * 0.7, w: 42, h: 42, rot: 0, vr: 0.05 });
      else if (r < 0.013) s.entities.push({ type: "moon", x, y: -30, vy: bs * 0.75, w: 36, h: 36, rot: 0, vr: 0.04 });
      else if (r < 0.02) s.entities.push({ type: "magnet", x, y: -30, vy: bs * 0.75, w: 36, h: 36, rot: 0, vr: 0.03 });
      else if (r < 0.02 + sc)
        s.entities.push({ type: "sprout", x, y: -30, vy: bs * 0.85, w: 30, h: 36, rot: 0, vr: 0.06 });
      else if (r < 0.022 + sc + 0.2)
        s.entities.push({ type: "iota", x, y: -30, vy: bs * 0.95, w: 30, h: 30, rot: 0, vr: 0.04 });
      else if (r < 0.022 + sc + 0.36)
        s.entities.push({ type: "tln", x, y: -30, vy: bs * 0.95, w: 30, h: 30, rot: 0, vr: -0.04 });
      else if (hG && r < 0.022 + sc + 0.46) {
        const ay = s.player.groundY - 60 - rand(0, 80);
        const d = Math.random() < 0.5 ? 1 : -1;
        s.entities.push({
          type: Math.random() < 0.5 ? "iota_air" : "tln_air",
          x: d < 0 ? s.w + 20 : -20,
          y: ay,
          vx: d * (160 + s.level * 12),
          vy: 0,
          w: 28,
          h: 28,
          rot: 0,
          vr: 0.05,
        });
      } else if (hG && r < 0.022 + sc + 0.56) {
        const d = Math.random() < 0.5 ? 1 : -1;
        s.entities.push({
          type: "rock_g",
          x: d < 0 ? s.w + 30 : -30,
          y: s.player.groundY + 14,
          vx: d * (220 + s.level * 18),
          vy: 0,
          w: 42,
          h: 28,
          rot: 0,
          vr: 0,
        });
      } else if (r < 0.022 + sc + 0.7) {
        const v = Math.random();
        let cw, ch;
        if (v < 0.35) {
          cw = 22;
          ch = 32;
        } else if (v < 0.75) {
          cw = 22;
          ch = 52;
        } else {
          cw = 26;
          ch = 80;
        }
        s.entities.push({ type: "candle", x, y: -ch / 2 - 10, vy: bs * 1.05, w: cw, h: ch, rot: 0, vr: 0 });
      } else if (r < 0.022 + sc + 0.84)
        s.entities.push({ type: "rock", x, y: -30, vy: bs, w: 38, h: 34, rot: 0, vr: 0.02 });
      else if (r < 0.022 + sc + 0.93)
        s.entities.push({ type: "paper", x, y: -30, vy: bs * 0.85, w: 42, h: 34, rot: 0, vr: 0.03 });
      else s.entities.push({ type: "fud", x, y: -30, vy: bs * 0.7, w: 34, h: 34, rot: 0, vr: 0.06 });
    };

    const fire = (s, charged) => {
      const need = charged ? 2 : 1;
      if (s.ammo < need) return;
      const p = s.player;
      const dx = p.aimX - p.x,
        dy = p.aimY - p.y,
        d = Math.hypot(dx, dy) || 1;
      s.shots.push({
        x: p.x,
        y: p.y - 8,
        vx: (dx / d) * (charged ? 900 : 720),
        vy: (dy / d) * (charged ? 900 : 720),
        life: charged ? 2.2 : 1.6,
        rot: Math.atan2(dy, dx),
        spin: 0.35,
        charged,
        pierce: charged ? 3 : 0,
      });
      s.ammo -= need;
      p.muzzle = 0.12;
      p.shootCD = charged ? 0.32 : 0.16;
      addP(s, p.x + (dx / d) * 20, p.y - 8 + (dy / d) * 20, "#6fbf73", charged ? 8 : 4);
    };

    const startBoss = (s) => {
      const hpT = [7, 9, 11];
      const hp = hpT[Math.min(s.bossesDefeated, 2)];
      s.boss = {
        hpMax: hp,
        hp,
        x: s.w / 2,
        y: 90,
        vx: 100 + s.bossesDefeated * 20,
        dir: 1,
        atkT: 1.5,
        hitFlash: 0,
        bob: 0,
        enraged: false,
        spiralA: 0,
      };
      s.bossIntro = 1.8;
      s.ammo = Math.max(s.ammo, 6);
    };

    const loop = (ts) => {
      const s = stateRef.current;
      if (!s || s.over) {
        if (s && s.over) {
          setFinalStats({ score: Math.floor(s.score), time: s.time, level: s.level });
          setRunning(false);
          setOver(true);
        }
        return;
      }
      if (!s.lastTs) s.lastTs = ts;
      let dt = (ts - s.lastTs) / 1000;
      if (dt > 0.05) dt = 0.05;
      s.lastTs = ts;
      const slowF = s.slowMo > 0 ? 0.35 : s.slow > 0 ? 0.5 : 1;
      // World speed multiplier — each boss kill increases speed by 25%
      // Tier 1 (start) = 1.0x, Tier 2 = 1.25x, Tier 3 = 1.5x, Tier 4 = 1.75x, etc.
      const worldSpeed = 1 + s.bossesDefeated * 0.25;
      const edt = dt * slowF * worldSpeed;
      s.time += dt;
      const p = s.player;
      const nl = 1 + Math.floor(s.time / 12);
      if (nl !== s.level) {
        s.level = nl;
        s.levelFlash = 1;
        if (!s.boss && s.level >= s.nextBossLevel) startBoss(s);
      }
      // timers
      if (p.shootCD > 0) p.shootCD -= dt;
      if (p.muzzle > 0) p.muzzle -= dt;
      if (p.invuln > 0) p.invuln -= dt;
      if (p.dashTime > 0) p.dashTime -= dt;
      if (p.dashCD > 0) p.dashCD -= dt;
      if (p.coyote > 0) p.coyote -= dt;
      // shooting model:
      //  - holding builds charge (NO auto-fire while held)
      //  - quick tap+release = single normal shot
      //  - hold until ring fills (0.5s) then release = charged piercing shot
      if (s.keys.shoot) {
        p.charge = Math.min(1, p.charge + dt / 0.5);
      }
      if (s.keys.shootRel) {
        if (p.charge >= 1) {
          fire(s, true); // full charge -> piercing shot
        } else if (p.shootCD <= 0) {
          fire(s, false); // released early -> normal shot
        }
        p.charge = 0;
        s.keys.shootRel = false;
      }
      // dash trigger
      const dq = s.keys.dashQ || s.touch.dashQ;
      if (dq && p.dashCD <= 0) {
        const dir = dq === "left" ? -1 : 1;
        p.dashTime = 0.18;
        p.dashCD = 0.9;
        p.vx = dir * 1800;
        p.facing = dir;
        addP(s, p.x, p.y, C.iota, 10);
        addT(s, p.x, p.y - 30, "DASH", "#4fd6c4");
      }
      s.keys.dashQ = false;
      s.touch.dashQ = false;
      // movement
      const spd = 380;
      if (p.dashTime <= 0) {
        if (s.touch.x != null) {
          p.vx = clamp((s.touch.x - p.x) * 9, -spd, spd);
        } else {
          let v = 0;
          if (s.keys.left) v -= spd;
          if (s.keys.right) v += spd;
          p.vx = v;
        }
      } else {
        p.vx *= 0.92;
      }
      if (p.vx > 5) p.facing = 1;
      else if (p.vx < -5) p.facing = -1;
      // jump w/ coyote
      const onGround = p.y >= p.groundY - 1;
      if (onGround) p.coyote = 0.12;
      const jq = s.keys.jumpQ || s.touch.jumpQ;
      if (jq && p.jumpsLeft > 0) {
        p.vy = -560;
        p.jumping = true;
        if (p.coyote > 0 && p.jumpsLeft === 2) {
          p.jumpsLeft = 1;
        } else {
          p.jumpsLeft--;
        }
        p.coyote = 0;
        addP(s, p.x, p.y + 24, "#9aaa9a", 6);
      }
      s.keys.jumpQ = false;
      s.touch.jumpQ = false;
      p.vy += 1500 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.x = clamp(p.x, p.w / 2, s.w - p.w / 2);
      if (p.y >= p.groundY) {
        p.y = p.groundY;
        p.vy = 0;
        p.jumping = false;
        p.jumpsLeft = 2;
      }
      p.animPhase += dt * (5 + Math.abs(p.vx) * 0.02);
      // spawning — uses edt so spawn rate scales with world speed (boss tier)
      s.spawnT -= edt;
      if (s.spawnT <= 0) {
        spawn(s);
        s.spawnT = Math.max(0.16, 0.85 - s.level * 0.06);
      }
      // lightning — also scales with world speed
      if (s.level >= 3 && !s.boss) {
        s.nextLight -= edt;
        if (s.nextLight <= 0) {
          const tx = p.x + p.vx * 0.4;
          s.lightning.push({ x: clamp(tx + rand(-60, 60), 40, s.w - 40), tel: 1.0, life: 0, struck: false });
          s.nextLight = Math.max(2.5, 7 - s.level * 0.4);
        }
      }
      for (let i = s.lightning.length - 1; i >= 0; i--) {
        const lt = s.lightning[i];
        lt.life += dt;
        if (!lt.struck) {
          lt.tel -= dt * 1.1;
          if (lt.tel <= 0) {
            lt.struck = true;
            lt.life = 0;
            if (Math.abs(p.x - lt.x) < 12 + p.w / 2 && !p.jumping) hurt(s, lt.x, p.y, "#fffacd");
          }
        } else if (lt.life > 0.3) s.lightning.splice(i, 1);
      }
      // boss
      if (s.boss) {
        const b = s.boss;
        b.bob += dt * 2;
        b.x += b.vx * b.dir * edt;
        if (b.x < 80 || b.x > s.w - 80) b.dir *= -1;
        b.y = 90 + Math.sin(b.bob) * 30;
        if (b.hitFlash > 0) b.hitFlash -= dt;
        if (!b.enraged && b.hp <= b.hpMax * 0.5) {
          b.enraged = true;
          b.vx *= 1.5;
          s.flash = 0.3;
          s.flashColor = "#ff5a6a";
          addT(s, b.x, b.y, "ENRAGED!", "#ff5a6a", true);
        }
        b.atkT -= edt;
        if (b.atkT <= 0) {
          if (b.enraged) {
            b.spiralA += 0.6;
            for (let k = 0; k < 3; k++) {
              const a = b.spiralA + k * ((Math.PI * 2) / 3);
              s.entities.push({
                type: "candle",
                x: b.x,
                y: b.y + 20,
                vx: Math.cos(a) * 120,
                vy: Math.sin(a) * 120 + 80,
                w: 20,
                h: 44,
                rot: 0,
                vr: 0.1,
              });
            }
            b.atkT = 0.5;
          } else {
            for (let i = -2; i <= 2; i++)
              s.entities.push({
                type: "candle",
                x: b.x + i * 30,
                y: b.y + 30,
                vy: 220 + s.level * 10,
                w: 22,
                h: 52,
                rot: 0,
                vr: 0,
              });
            b.atkT = Math.max(0.8, 2.0 - s.bossesDefeated * 0.15);
          }
        }
        if (Math.abs(p.x - b.x) < 55 && Math.abs(p.y - b.y) < 45) {
          if (hurt(s, p.x, p.y)) p.vy = -400;
        }
      }
      // shots
      for (let i = s.shots.length - 1; i >= 0; i--) {
        const sh = s.shots[i];
        sh.life -= dt;
        sh.vy += (sh.charged ? 150 : 400) * dt;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.rot += sh.spin;
        if (Math.random() < 0.5)
          s.parts.push({
            x: sh.x,
            y: sh.y,
            vx: rand(-15, 15),
            vy: rand(-15, 15),
            life: 0.3,
            max: 0.3,
            col: "#6fbf73",
            size: 1.5,
          });
        let kill = false;
        if (s.boss) {
          const b = s.boss;
          if (Math.abs(sh.x - b.x) < 50 && Math.abs(sh.y - b.y) < 42) {
            const dmg = sh.charged ? 3 : 1;
            b.hp -= dmg;
            b.hitFlash = 0.25;
            s.score += 20 * dmg;
            addP(s, sh.x, sh.y, "#6fbf73", 12);
            addT(s, sh.x, sh.y, `-${dmg}`, "#6fbf73");
            if (sh.charged && sh.pierce > 0) {
              sh.pierce--;
            } else kill = true;
            if (b.hp <= 0) {
              s.bossesDefeated++;
              s.nextBossLevel = s.level + 4;
              s.score += 300 * (1 + s.bossesDefeated * 0.5);
              addP(s, b.x, b.y, "#e8b84a", 50);
              addT(s, b.x, b.y, "BOSS DOWN!", "#e8b84a", true);
              s.explosions.push({ x: b.x, y: b.y, r: 0, maxR: 120, life: 0.8, max: 0.8 });
              s.boss = null;
              s.ammo = Math.min(ammoMax, s.ammo + 4);
              s.tierUpFlash = 3.0; // Show LEVEL X banner for 3 seconds
            }
          }
        }
        if (!kill) {
          for (let j = s.entities.length - 1; j >= 0; j--) {
            const e = s.entities[j];
            if (!["candle", "rock", "rock_g", "paper", "fud"].includes(e.type)) continue;
            if (Math.abs(sh.x - e.x) < e.w / 2 + 6 && Math.abs(sh.y - e.y) < e.h / 2 + 6) {
              addP(s, e.x, e.y, e.type === "fud" ? "#a04ad6" : "#9aaa9a", 14);
              addT(s, e.x, e.y, "+5", "#6fbf73");
              s.score += 5;
              s.entities.splice(j, 1);
              if (sh.charged && sh.pierce > 0) sh.pierce--;
              else kill = true;
              break;
            }
          }
        }
        if (kill || sh.life <= 0 || sh.x < -30 || sh.x > s.w + 30 || sh.y > s.h + 30) s.shots.splice(i, 1);
      }
      // score/combo
      s.score += dt * 5;
      if (s.comboF > 0) s.comboF = Math.max(0, s.comboF - dt * 0.5);
      const combo = Math.floor(s.comboF);
      const streakMult = 1 + Math.floor(s.streak / 5);
      const mult = (1 + Math.floor(combo / 3)) * streakMult;
      const moonM = s.moonBoost > 0 ? 2 : 1;
      // entities
      for (let i = s.entities.length - 1; i >= 0; i--) {
        const e = s.entities[i];
        if (e.vy != null) e.y += e.vy * edt;
        if (e.vx != null) e.x += e.vx * edt;
        e.rot += e.vr;
        const isG = ["iota", "tln", "iota_air", "tln_air"].includes(e.type);
        if (s.magnet > 0 && isG) {
          const dx = p.x - e.x,
            dy = p.y - e.y,
            d = Math.hypot(dx, dy);
          if (d < 220) {
            e.x += (dx / (d || 1)) * 600 * dt;
            e.y += (dy / (d || 1)) * 600 * dt;
          }
        }
        // perfect dodge detection (near miss while dashing/iframe on hazards)
        if ((p.dashTime > 0 || p.invuln > 0.95) && ["candle", "rock", "fud"].includes(e.type)) {
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < 28 && !e._pd) {
            e._pd = true;
            s.slowMo = 0.35;
            s.perfectFlash = 1;
            s.score += 30 * moonM;
            s.ammo = Math.min(ammoMax, s.ammo + 1);
            addT(s, p.x, p.y - 40, "PERFECT!", "#4fd6c4", true);
          }
        }
        if (e.y > s.h + 60 || e.x < -100 || e.x > s.w + 100) {
          s.entities.splice(i, 1);
          continue;
        }
        if (coll(e, p)) {
          if (isG) {
            const isAir = e.type.endsWith("_air");
            const isI = e.type.startsWith("iota");
            const depthBonus = e.y > s.h * 0.66 ? 1.5 : 1;
            const base = (isI ? 10 : 15) + (isAir ? 5 : 0);
            s.comboF = Math.min(30, s.comboF + 1);
            s.streak++;
            const gained = Math.round(base * mult * moonM * depthBonus);
            s.score += gained;
            const col = isI ? "#4fd6c4" : "#7aa8ff";
            addP(s, e.x, e.y, col, 16);
            addT(s, e.x, e.y, `+${gained}${mult > 1 ? ` ×${mult}` : ""}`, col);
            s.explosions.push({ x: e.x, y: e.y, r: 0, maxR: 38, life: 0.32, max: 0.32, ring: col });
            s.entities.splice(i, 1);
          } else if (e.type === "gold") {
            s.score += 25 * moonM;
            s.shield = 3;
            s.slow = 2.5;
            addP(s, e.x, e.y, "#e8b84a", 28);
            addT(s, e.x, e.y, "SHIELD!", "#e8b84a");
            s.entities.splice(i, 1);
          } else if (e.type === "moon") {
            s.score += 15;
            s.moonBoost = 5;
            addP(s, e.x, e.y, "#7aa8ff", 22);
            addT(s, e.x, e.y, "2× POINTS!", "#7aa8ff");
            s.entities.splice(i, 1);
          } else if (e.type === "magnet") {
            s.score += 15;
            s.magnet = 5;
            addP(s, e.x, e.y, "#ff6bb5", 22);
            addT(s, e.x, e.y, "MAGNET!", "#ff6bb5");
            s.entities.splice(i, 1);
          } else if (e.type === "sprout") {
            const bf = s.ammo;
            s.ammo = Math.min(ammoMax, s.ammo + 1);
            s.score += 5;
            addP(s, e.x, e.y, "#6fbf73", 18);
            addT(s, e.x, e.y, s.ammo > bf ? "+1 AMMO" : "FULL", "#6fbf73");
            s.entities.splice(i, 1);
          } else if (e.type === "fud") {
            if (hurt(s, e.x, e.y, "#a04ad6"))
              s.explosions.push({ x: e.x, y: e.y, r: 0, maxR: 60, life: 0.5, max: 0.5 });
            s.entities.splice(i, 1);
          } else if (e.type === "paper") {
            if (hurt(s, e.x, e.y)) s.entities.splice(i, 1);
            else s.entities.splice(i, 1);
          } // paper now: damage only (no double punish)
          else {
            hurt(s, e.x, e.y);
            if (e.type !== "rock_g") s.entities.splice(i, 1);
          }
        }
      }
      // particles
      for (let i = s.parts.length - 1; i >= 0; i--) {
        const pt = s.parts[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (!pt.text) pt.vy += 200 * dt;
        pt.life -= dt;
        if (pt.life <= 0) s.parts.splice(i, 1);
      }
      for (let i = s.explosions.length - 1; i >= 0; i--) {
        const ex = s.explosions[i];
        ex.life -= dt;
        ex.r = ex.maxR * (1 - ex.life / ex.max);
        if (ex.life <= 0) s.explosions.splice(i, 1);
      }
      // decay timers
      [
        "shake",
        "flash",
        "shield",
        "slow",
        "slowMo",
        "moonBoost",
        "magnet",
        "levelFlash",
        "bossIntro",
        "perfectFlash",
        "tierUpFlash",
      ].forEach((k) => {
        if (s[k] > 0) s[k] -= dt;
      });
      // bg
      for (const st of s.stars) {
        st.y += (15 + s.level * 3) * st.z * dt;
        if (st.y > s.h) {
          st.y = -2;
          st.x = Math.random() * s.w;
        }
      }
      for (const hl of s.hills) hl.offset = (hl.offset + hl.speed * dt) % hl.period;
      for (const f of s.fog) {
        f.x += f.vx * dt;
        if (f.x - f.r > s.w) f.x = -f.r;
      }

      /* DRAW */
      ctx.clearRect(0, 0, s.w, s.h);
      drawBackground(ctx, s);
      drawHills(ctx, s);
      drawFog(ctx, s);
      ctx.strokeStyle = "rgba(111,191,115,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, p.groundY + 30);
      ctx.lineTo(s.w, p.groundY + 30);
      ctx.stroke();
      const sx = s.shake > 0 ? rand(-1, 1) * 10 : 0,
        sy = s.shake > 0 ? rand(-1, 1) * 10 : 0;
      ctx.save();
      ctx.translate(sx, sy);
      for (const lt of s.lightning) {
        if (!lt.struck) {
          const a = 0.15 + Math.sin(s.time * 16) * 0.1;
          ctx.fillStyle = `rgba(255,250,205,${a})`;
          ctx.fillRect(lt.x - 12, 0, 24, s.h);
          ctx.strokeStyle = `rgba(255,250,205,${0.4 + Math.sin(s.time * 12) * 0.3})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(lt.x, 0);
          ctx.lineTo(lt.x, s.h);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const a = Math.max(0, 1 - lt.life / 0.3);
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.fillRect(lt.x - 12, 0, 24, s.h);
        }
      }
      if (s.boss) drawBoss(ctx, s.boss);
      for (const e of s.entities) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        if (e.type === "iota" || e.type === "iota_air") drawGem(ctx, "IOTA", "#4fd6c4", e.w);
        else if (e.type === "tln" || e.type === "tln_air") drawGem(ctx, "TLN", "#7aa8ff", e.w);
        else if (e.type === "gold") drawCoin(ctx, e.w);
        else if (e.type === "moon") drawMoonItem(ctx, e.w);
        else if (e.type === "magnet") drawMagnet(ctx, e.w);
        else if (e.type === "sprout") drawSproutItem(ctx, e.w);
        else if (e.type === "candle") drawCandle(ctx, e.w, e.h);
        else if (e.type === "rock" || e.type === "rock_g") drawRock(ctx, e.w, e.h);
        else if (e.type === "paper") {
          ctx.fillStyle = "#f0e2c4";
          ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
          ctx.fillStyle = "#3a2410";
          ctx.font = "bold 8px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("PAPER", 0, 0);
        } else if (e.type === "fud") drawFud(ctx, e.w);
        ctx.restore();
      }
      for (const sh of s.shots) {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        drawSprout(ctx, sh.charged);
        ctx.restore();
      }
      for (const ex of s.explosions) {
        const a = ex.life / ex.max;
        const col = ex.ring || "#a04ad6";
        const r1 = parseInt(col.slice(1, 3), 16),
          g1 = parseInt(col.slice(3, 5), 16),
          b1 = parseInt(col.slice(5, 7), 16);
        ctx.strokeStyle = `rgba(${r1},${g1},${b1},${a})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const pt of s.parts) {
        const a = pt.life / pt.max;
        ctx.globalAlpha = Math.max(0, a);
        if (pt.text) {
          ctx.fillStyle = pt.col;
          ctx.font = `bold ${pt.big ? 20 : 13}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillText(pt.text, pt.x, pt.y);
        } else {
          ctx.fillStyle = pt.col;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (p.invuln <= 0 || Math.floor(p.invuln * 12) % 2 === 0 || p.dashTime > 0) drawPlayer(ctx, p);
      // aim + charge ring
      const aDx = p.aimX - p.x,
        aDy = p.aimY - p.y,
        aD = Math.hypot(aDx, aDy);
      if (aD > 30 && s.ammo > 0) {
        ctx.strokeStyle = `rgba(111,191,115,${p.charge >= 1 ? 0.9 : 0.4})`;
        ctx.lineWidth = p.charge >= 1 ? 2.5 : 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8);
        ctx.lineTo(p.aimX, p.aimY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = p.charge >= 1 ? "#fff" : "rgba(111,191,115,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.aimX, p.aimY, p.charge >= 1 ? 14 : 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (p.charge > 0) {
        const full = p.charge >= 1;
        const pulse = full ? 1 + Math.sin(s.time * 12) * 0.15 : 1;
        ctx.strokeStyle = full ? "#fff" : "#a8e0a8";
        ctx.lineWidth = full ? 4 : 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4, 30 * pulse, -Math.PI / 2, -Math.PI / 2 + p.charge * Math.PI * 2);
        ctx.stroke();
        if (full) {
          ctx.fillStyle = `rgba(255,255,255,${0.7 + Math.sin(s.time * 12) * 0.3})`;
          ctx.font = "bold 11px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("CHARGED — release!", p.x, p.y - 44);
        }
      }
      if (s.shield > 0) {
        ctx.strokeStyle = `rgba(232,184,74,${0.5 + Math.sin(s.time * 8) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4, 42, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (s.magnet > 0) {
        ctx.strokeStyle = `rgba(255,107,181,${0.3 + Math.sin(s.time * 8) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4, 220, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (p.dashCD > 0 && p.dashTime <= 0) {
        ctx.strokeStyle = "rgba(79,214,196,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y + 38, 8, -Math.PI / 2, -Math.PI / 2 + (1 - p.dashCD / 0.9) * Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(${s.flashColor === "#fffacd" ? "255,250,205" : "255,90,106"},${s.flash})`;
        ctx.fillRect(0, 0, s.w, s.h);
      }
      if (s.perfectFlash > 0) {
        ctx.fillStyle = `rgba(79,214,196,${s.perfectFlash * 0.2})`;
        ctx.fillRect(0, 0, s.w, s.h);
      }
      if (s.slowMo > 0) {
        ctx.strokeStyle = `rgba(79,214,196,${s.slowMo})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, s.w - 6, s.h - 6);
      }
      // Internal phase flash — subtle green tint only, no text (text is reserved for tier-up)
      if (s.levelFlash > 0) {
        ctx.fillStyle = `rgba(111,191,115,${s.levelFlash * 0.08})`;
        ctx.fillRect(0, 0, s.w, s.h);
      }
      // TIER UP BANNER — dramatic, fires after every boss kill
      if (s.tierUpFlash > 0) {
        const t = s.tierUpFlash;
        const elapsed = 3.0 - t;
        // dark overlay fades in then out
        const overlayA = elapsed < 0.3 ? elapsed / 0.3 : t < 0.5 ? t / 0.5 : 1;
        ctx.fillStyle = `rgba(20,8,30,${0.55 * overlayA})`;
        ctx.fillRect(0, 0, s.w, s.h);
        // glow rings
        const glowR = elapsed * 400;
        if (glowR < 600) {
          const grad = ctx.createRadialGradient(s.w / 2, s.h / 2, glowR * 0.3, s.w / 2, s.h / 2, glowR);
          grad.addColorStop(0, "rgba(255,140,60,0.18)");
          grad.addColorStop(0.6, "rgba(255,90,60,0.08)");
          grad.addColorStop(1, "rgba(255,90,60,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, s.w, s.h);
        }
        // bouncy scale-in for first 0.4s, then steady, then fade
        let scale;
        if (elapsed < 0.4) {
          const p = elapsed / 0.4;
          scale = p < 0.7 ? (p / 0.7) * 1.15 : 1.15 - ((p - 0.7) / 0.3) * 0.15;
        } else scale = 1 + Math.sin(elapsed * 6) * 0.03;
        const textA = t < 0.6 ? t / 0.6 : 1;
        ctx.save();
        ctx.translate(s.w / 2, s.h / 2);
        ctx.scale(scale, scale);
        // shadow / glow
        ctx.shadowColor = "rgba(255,140,40,0.9)";
        ctx.shadowBlur = 30;
        // big LEVEL text with gradient
        const grad2 = ctx.createLinearGradient(0, -40, 0, 30);
        grad2.addColorStop(0, `rgba(255,200,90,${textA})`);
        grad2.addColorStop(0.5, `rgba(255,140,60,${textA})`);
        grad2.addColorStop(1, `rgba(232,70,60,${textA})`);
        ctx.fillStyle = grad2;
        ctx.font = "900 64px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`LEVEL ${s.bossesDefeated + 1}`, 0, -8);
        // subtitle
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(255,180,60,0.7)";
        ctx.fillStyle = `rgba(255,220,170,${textA * 0.95})`;
        ctx.font = "bold 18px system-ui";
        const speedPct = Math.round(s.bossesDefeated * 25);
        ctx.fillText(`SPEED UP · +${speedPct}%`, 0, 32);
        ctx.restore();
      }
      if (s.bossIntro > 0) {
        const ia = Math.min(1, s.bossIntro / 0.4);
        ctx.fillStyle = `rgba(20,5,30,${0.5 * ia})`;
        ctx.fillRect(0, 0, s.w, s.h);
        ctx.save();
        ctx.translate(s.w / 2, s.h / 2);
        const pulse = 1 + Math.sin(s.time * 14) * 0.08;
        ctx.scale(pulse, pulse);
        ctx.shadowColor = "rgba(255,90,160,0.8)";
        ctx.shadowBlur = 24;
        ctx.fillStyle = `rgba(255,90,160,${ia})`;
        ctx.font = "bold 40px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("BEAR MARKET", 0, -8);
        ctx.fillStyle = `rgba(232,180,200,${ia})`;
        ctx.font = "bold 22px system-ui";
        ctx.fillText("INCOMING", 0, 28);
        ctx.restore();
      }

      setHud({
        score: Math.floor(s.score),
        lives: s.lives,
        time: s.time,
        level: s.bossesDefeated + 1, // tier = bosses defeated + 1 (starts at 1)
        worldSpeed: worldSpeed,
        combo,
        mult,
        ammo: s.ammo,
        streak: s.streak,
        charge: p.charge,
        dashCD: p.dashCD,
        bossHp: s.boss ? s.boss.hp : 0,
        bossHpMax: s.boss ? s.boss.hpMax : 0,
        boss: !!s.boss,
        enraged: s.boss ? s.boss.enraged : false,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  /* touch */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const gp = (e) => {
      const r = c.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top, h: r.height };
    };
    const os = (e) => {
      const pt = gp(e);
      const st = stateRef.current;
      if (!st) return;
      if (pt.y < pt.h * 0.5) st.touch.jumpQ = true;
      else st.touch.x = pt.x;
      e.preventDefault();
    };
    const om = (e) => {
      const pt = gp(e);
      const st = stateRef.current;
      if (st && st.touch.x != null) st.touch.x = pt.x;
      e.preventDefault();
    };
    const oe = () => {
      const st = stateRef.current;
      if (st) {
        st.touch.x = null;
        st.touch.jumpQ = false;
      }
    };
    c.addEventListener("touchstart", os, { passive: false });
    c.addEventListener("touchmove", om, { passive: false });
    c.addEventListener("touchend", oe);
    return () => {
      c.removeEventListener("touchstart", os);
      c.removeEventListener("touchmove", om);
      c.removeEventListener("touchend", oe);
    };
  }, []);

  const lvlProg = ((hud.time % 12) / 12) * 100;
  return (
    <div
      style={{ width: "100%", maxWidth: 900, margin: "0 auto", fontFamily: "system-ui,sans-serif", color: "#e7e2d6" }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatBadge label="Score" value={hud.score} />
          <StatBadge label="Lives" value={"♥".repeat(Math.max(0, hud.lives)) || "—"} accent />
          <StatBadge label="Time" value={`${hud.time.toFixed(1)}s`} />
          <StatBadge
            label="Lvl"
            value={`${hud.level}${hud.worldSpeed > 1 ? ` (${hud.worldSpeed.toFixed(2)}×)` : ""}`}
            highlight={hud.worldSpeed > 1}
          />
          {hud.combo >= 3 && <StatBadge label="Combo" value={`×${hud.mult}`} highlight />}
          {hud.streak >= 5 && <StatBadge label="Streak" value={`${hud.streak}🔥`} highlight />}
        </div>
        {personalBest && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Best: <b style={{ color: "#e8b84a" }}>{personalBest.score}</b>
          </div>
        )}
      </div>
      <div
        style={{ height: 4, borderRadius: 4, overflow: "hidden", marginBottom: 8, background: "rgba(111,191,115,0.1)" }}
      >
        <div style={{ height: "100%", width: `${lvlProg}%`, background: "linear-gradient(90deg,#6fbf73,#4fd6c4)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, minWidth: 54 }}>🌱 AMMO</span>
        <div
          style={{
            flex: 1,
            height: 8,
            borderRadius: 8,
            overflow: "hidden",
            background: "rgba(111,191,115,0.12)",
            border: "1px solid rgba(111,191,115,0.2)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(hud.ammo / ammoMax) * 100}%`,
              background: hud.ammo === 0 ? "rgba(255,107,90,0.6)" : "linear-gradient(90deg,#6fbf73,#a8e0a8)",
            }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 46, textAlign: "right" }}>
          <span style={{ color: hud.ammo === 0 ? "#ff9a9a" : "#a8e0a8" }}>{hud.ammo}</span>
          <span style={{ opacity: 0.5 }}>/{ammoMax}</span>
        </span>
      </div>
      {hud.boss && (
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: hud.enraged ? "#ff5a6a" : "#c98adf",
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            {hud.enraged ? "⚠ Enraged Bear" : "Boss — Bear Market"}
          </div>
          <div style={{ height: 6, borderRadius: 6, overflow: "hidden", background: "rgba(160,74,214,0.15)" }}>
            <div
              style={{
                height: "100%",
                width: `${(hud.bossHp / Math.max(1, hud.bossHpMax)) * 100}%`,
                background: hud.enraged
                  ? "linear-gradient(90deg,#ff5a6a,#ff9a4a)"
                  : "linear-gradient(90deg,#a04ad6,#ff6b5a)",
                transition: "width 0.2s",
              }}
            />
          </div>
        </div>
      )}
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(111,191,115,0.25)",
          boxShadow: "0 0 50px rgba(79,214,196,0.08)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "min(70vh,560px)",
            background: "#0a1310",
            touchAction: "none",
            cursor: running ? "crosshair" : "default",
          }}
        />
        {running && (
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const st = stateRef.current;
              if (st) st.touch.dashQ = st.player.facing > 0 ? "right" : "left";
            }}
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: hud.dashCD > 0 ? "rgba(80,80,80,0.4)" : "linear-gradient(135deg,#4fd6c4,#7aa8ff)",
              color: "#08120d",
              fontWeight: 800,
              fontSize: 12,
              border: "2px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="md:hidden"
          >
            DASH
          </button>
        )}
        {running && (
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const st = stateRef.current;
              if (st) st.touch.shoot = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              const st = stateRef.current;
              if (st) {
                if (st.touch.shoot) st.keys.shootRel = true;
                st.touch.shoot = false;
                st.keys.shoot = false;
              }
            }}
            style={{
              position: "absolute",
              right: 16,
              bottom: 16,
              width: 76,
              height: 76,
              borderRadius: "50%",
              background: hud.ammo > 0 ? "linear-gradient(135deg,#6fbf73,#4fd6c4)" : "rgba(80,80,80,0.5)",
              color: "#08120d",
              fontWeight: 800,
              fontSize: 13,
              border: "2px solid rgba(255,255,255,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="md:hidden"
          >
            <span style={{ fontSize: 20 }}>🌱</span>SHOOT
          </button>
        )}
        {!running && !over && (
          <Overlay>
            <h2
              style={{
                fontSize: 34,
                fontWeight: 900,
                marginBottom: 8,
                background: "linear-gradient(135deg,#ff8a4a,#e8b84a,#6fbf73)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Survive the Bear Market
            </h2>
            <p style={{ opacity: 0.9, marginBottom: 18, maxWidth: 420 }}>
              Dodge candles. Grab gems. Shoot sprouts. Master the dash. Crush the bear.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px 24px",
                fontSize: 13,
                opacity: 0.85,
                textAlign: "left",
                maxWidth: 420,
                margin: "0 auto 18px",
              }}
            >
              <span>
                🎮 <b>Move</b> A/D · ←→
              </span>
              <span>
                🦘 <b>Jump</b> W · ↑ (×2)
              </span>
              <span>
                🌱 <b>Shoot</b> tap F / click
              </span>
              <span>
                ⚡ <b>Dash</b> Shift · 2×tap dir
              </span>
              <span>
                🎯 <b>Aim</b> mouse
              </span>
              <span>
                💥 <b>Charge</b> hold, then release
              </span>
            </div>
            {bonusActive && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, rgba(232,184,74,0.18), rgba(111,191,115,0.12))",
                  border: "1px solid rgba(232,184,74,0.5)",
                  color: "#e8b84a",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                🥔 Secret bonus active: +2 starting ammo
              </div>
            )}
            <div>
              <button onClick={start} style={{ ...btnPrimary, padding: "12px 32px", borderRadius: 999, fontSize: 16 }}>
                Start Game
              </button>
            </div>
          </Overlay>
        )}
        {over && (
          <Overlay>
            <GameOver stats={finalStats} onPlay={start} onSubmit={onSubmitScore} personalBest={personalBest} />
          </Overlay>
        )}
      </div>
      <p style={{ fontSize: 11, opacity: 0.45, marginTop: 8, textAlign: "center" }}>
        Tip: dash through hazards for a PERFECT dodge — slow-mo, bonus points, +1 ammo. Charge your shot for 3× boss
        damage.
      </p>
    </div>
  );
}

/* ---------- Game Over with mandatory X-handle ---------- */
function GameOver({ stats, onPlay, onSubmit, personalBest }) {
  const [xh, setXh] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [rank, setRank] = useState(null);
  const isBest = !personalBest || stats.score > personalBest.score;
  const norm = (r) => {
    let h = r.trim();
    if (h.startsWith("http")) h = h.split("/").pop() || "";
    if (h.startsWith("@")) h = h.slice(1);
    return h;
  };
  const submit = async () => {
    const h = norm(xh);
    if (!h) return setErr("X handle required — so we can DM winners");
    if (h.length > 15) return setErr("Max 15 chars");
    if (!/^[a-zA-Z0-9_]+$/.test(h)) return setErr("Letters, numbers, _ only");
    setErr("");
    const r = onSubmit
      ? await onSubmit({
          xHandle: "@" + h,
          score: stats.score,
          time: stats.time,
          level: stats.level,
          sessionId: "S-DEMO",
          verificationToken: "V-DEMO",
          plausible: true,
        })
      : null;
    setRank(r);
    setDone(true);
  };
  return (
    <div style={{ maxWidth: 340, margin: "0 auto" }}>
      <h3 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Game Over</h3>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        Survived <b style={{ color: "#4fd6c4" }}>{stats.time.toFixed(1)}s</b> · scored{" "}
        <b style={{ color: "#e8b84a" }}>{stats.score}</b>
      </p>
      {isBest && (
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 14,
            background: "linear-gradient(90deg,#e8b84a,#f7d77a)",
            color: "#3a2410",
          }}
        >
          ⭐ New Personal Best!
        </div>
      )}
      {!done ? (
        <>
          <div style={{ textAlign: "left", marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, display: "block", marginBottom: 6 }}>
              Your X handle *
            </label>
            <div
              style={{
                display: "flex",
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${err ? "rgba(255,90,106,0.6)" : "rgba(111,191,115,0.3)"}`,
                background: "rgba(20,30,25,0.8)",
              }}
            >
              <span style={{ padding: "10px 12px", opacity: 0.5, background: "rgba(79,214,196,0.08)" }}>@</span>
              <input
                value={xh}
                onChange={(e) => {
                  setXh(e.target.value);
                  setErr("");
                }}
                maxLength={15}
                placeholder="your_handle"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#e7e2d6",
                  fontSize: 14,
                }}
              />
            </div>
            {err && <p style={{ fontSize: 11, color: "#ff5a6a", marginTop: 6 }}>{err}</p>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={submit} style={{ ...btnPrimary, padding: "10px 22px", borderRadius: 999 }}>
              Submit Score
            </button>
            <button onClick={onPlay} style={{ ...btnGhost, padding: "10px 22px", borderRadius: 999 }}>
              Retry
            </button>
          </div>
        </>
      ) : (
        <>
          {rank != null && (
            <p style={{ opacity: 0.8, marginBottom: 14 }}>
              You ranked <b style={{ color: "#e8b84a" }}>#{rank}</b>
            </p>
          )}
          <button onClick={onPlay} style={{ ...btnPrimary, padding: "10px 26px", borderRadius: 999 }}>
            Play Again
          </button>
        </>
      )}
    </div>
  );
}


/* Export the game component for use in the main app */
export default PotatoDodge;

import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   POTATO DODGE — competition build
   Mechanics: move + double-jump, charge shot (3× boss dmg, pierces),
   unified combo (max ×5), IOTA+TLN → $TAT merge, boss fights with
   rage timer, bonus slot machine on boss kill, rare heart drops.
   Mobile: on-screen joystick + jump/shoot buttons. Fullscreen support.
   ============================================================ */

/* Preload the real logo images so gems show the authentic IOTA & TokenLabs marks.
   Drawn into circular clips in drawGem(). */
const iotaImg = typeof Image !== "undefined" ? new Image() : null;
const tlnImg = typeof Image !== "undefined" ? new Image() : null;
const tatImg = typeof Image !== "undefined" ? new Image() : null;
if (iotaImg) iotaImg.src = "/iota-logo.png";
if (tlnImg) tlnImg.src = "/tokenlabs.jpg";
if (tatImg) tatImg.src = "/iotato-coin.jpg";

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

/* Fixed logical game world. The simulation ALWAYS runs at this size so the
   difficulty (play area, gem spawn density, dodge room) is identical on phone,
   desktop, and fullscreen. The canvas is only scaled to display it. */
/* The game world has a FIXED height (so fall speed / dodge room / difficulty is
   constant everywhere) but its WIDTH adapts to the display aspect ratio within
   sane bounds. This fills the screen (no black bars) while staying fair: a wider
   screen just shows a bit more horizontal room, it doesn't change the core
   vertical challenge. Width is clamped so ultra-wide doesn't become trivial. */
const GAME_H = 560;
const GAME_W_MIN = 480; // portrait phones
const GAME_W_DEFAULT = 760;
const GAME_W_MAX = 1100; // very wide / fullscreen desktop
const GAME_W = GAME_W_DEFAULT; // initial; recomputed per display in setupCanvas

/* ---------- draw helpers ---------- */
function drawBackground(ctx, s) {
  const g = ctx.createLinearGradient(0, 0, 0, s.h);
  if (s.boss) {
    g.addColorStop(0, s.boss.enraged ? "#3a0820" : "#2a0824");
    g.addColorStop(0.45, "#160a1c");
    g.addColorStop(1, "#050208");
  } else {
    g.addColorStop(0, "#0c1f17");
    g.addColorStop(0.5, "#0a1612");
    g.addColorStop(1, "#04080a");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.w, s.h);

  // Soft nebula glows for depth (cheap: two large radial gradients)
  if (!s.boss) {
    const n1 = ctx.createRadialGradient(s.w * 0.2, s.h * 0.3, 10, s.w * 0.2, s.h * 0.3, s.w * 0.5);
    n1.addColorStop(0, "rgba(79,214,196,0.07)");
    n1.addColorStop(1, "rgba(79,214,196,0)");
    ctx.fillStyle = n1;
    ctx.fillRect(0, 0, s.w, s.h);
    const n2 = ctx.createRadialGradient(s.w * 0.85, s.h * 0.55, 10, s.w * 0.85, s.h * 0.55, s.w * 0.5);
    n2.addColorStop(0, "rgba(111,91,214,0.06)");
    n2.addColorStop(1, "rgba(111,91,214,0)");
    ctx.fillStyle = n2;
    ctx.fillRect(0, 0, s.w, s.h);
  }

  const mx = s.w * 0.78,
    my = s.h * 0.16;
  const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 110);
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
  ctx.arc(mx, my, 110, 0, Math.PI * 2);
  ctx.fill();
  // Moon disc with a subtle crater shading
  ctx.fillStyle = s.boss ? "rgba(220,180,200,0.28)" : "rgba(230,222,200,0.6)";
  ctx.beginPath();
  ctx.arc(mx, my, 24, 0, Math.PI * 2);
  ctx.fill();
  if (!s.boss) {
    ctx.fillStyle = "rgba(180,180,150,0.25)";
    ctx.beginPath();
    ctx.arc(mx + 8, my - 6, 5, 0, Math.PI * 2);
    ctx.arc(mx - 7, my + 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Twinkling stars
  for (const st of s.stars) {
    const tw = 0.5 + 0.5 * Math.sin(s.time * 2.5 + st.x * 0.05);
    ctx.globalAlpha = (0.3 + st.z * 0.5) * tw * (s.boss ? 0.6 : 1);
    ctx.fillStyle = s.boss ? "#d04ab8" : "#9fe6a3";
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
function drawTatCoin(ctx, size, time) {
  const r = size / 2;
  // pulsing golden glow
  const pulse = 0.5 + Math.sin(time * 6) * 0.3;
  ctx.fillStyle = `rgba(232,184,74,${0.25 * pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
  ctx.fill();
  // gold base
  ctx.fillStyle = "#e8b84a";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  if (tatImg && tatImg.complete && tatImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tatImg, -r, -r, size, size);
    ctx.restore();
  }
  // bright rim
  ctx.strokeStyle = "#ffe98a";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHeart(ctx, size) {
  const s = size / 34;
  ctx.save();
  ctx.scale(s, s);
  // glow
  ctx.fillStyle = "rgba(255,90,122,0.3)";
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff5a7a";
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-14, -4, -10, -16, 0, -8);
  ctx.bezierCurveTo(10, -16, 14, -4, 0, 10);
  ctx.closePath();
  ctx.fill();
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 3, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGem(ctx, label, color, size) {
  const r = size / 2;
  // Outer glow
  ctx.fillStyle = color + "22";
  ctx.beginPath();
  ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
  ctx.fill();

  if (label === "IOTA") {
    // Dark disc base
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    g.addColorStop(0, "#14201c");
    g.addColorStop(0.7, "#070d0b");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Draw the real IOTA logo image, clipped to the circle
    if (iotaImg && iotaImg.complete && iotaImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(iotaImg, -r, -r, size, size);
      ctx.restore();
    }
    // Bright teal rim
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // TokenLabs coin — use the real TokenLabs image, clipped to circle
    ctx.fillStyle = "#1a3ef5";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    if (tlnImg && tlnImg.complete && tlnImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(tlnImg, -r, -r, size, size);
      ctx.restore();
    }
    ctx.strokeStyle = "#a0c4ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
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
   BONUS SLOT MACHINE — opens after each boss kill.
   Reel 1 stops first and LOCKS in the bonus (guaranteed, weak).
   Reels 2 & 3 have a boosted chance to match reel 1; each match
   upgrades the strength: 1× weak, 2× medium, 3× strong.
   ============================================================ */
const SLOT_SYMBOLS = [
  { id: "magnet", icon: "🧲", name: "Magnet", desc: ["Pulls gems 15s", "Pulls gems 30s", "Pulls gems 45s"] },
  { id: "shield", icon: "🛡️", name: "Shield", desc: ["Blocks 1 hit", "Blocks 2 hits", "Blocks 3 hits"] },
  { id: "slow", icon: "⏱️", name: "Slow Time", desc: ["Slow world 15s", "Slow world 30s", "Slow world 45s"] },
  { id: "ammo", icon: "🌱", name: "Ammo", desc: ["+3 ammo", "+6 ammo", "+9 ammo"] },
  { id: "gemrain", icon: "💎", name: "Gem Rain", desc: ["Extra gems 10s", "Extra gems 15s", "Extra gems 20s"] },
  { id: "life", icon: "❤️", name: "Extra Life", desc: ["+1 max life", "+2 max life", "+3 max life"] },
  { id: "iotato", img: "/iotato-coin.jpg", icon: "🥔", name: "$TAT Rain", desc: ["$TAT gems 6s", "$TAT gems 12s", "$TAT gems 18s"] },
];

// Render a slot symbol — image (real coin) if it has one, else its emoji
function SlotIcon({ sym, size = 40 }) {
  if (sym.img) {
    return (
      <img
        src={sym.img}
        alt={sym.name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }
  return <span style={{ fontSize: size }}>{sym.icon}</span>;
}

function SlotMachine({ onResolve }) {
  const [reels, setReels] = useState([null, null, null]);
  const [spinIdx, setSpinIdx] = useState([0, 0, 0]);
  const [phase, setPhase] = useState("spinning");
  const [result, setResult] = useState(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    const N = SLOT_SYMBOLS.length;
    const r1 = Math.floor(Math.random() * N);
    const r2 = Math.random() < 0.42 ? r1 : (r1 + 1 + Math.floor(Math.random() * (N - 1))) % N;
    const p3 = r2 === r1 ? 0.55 : 0.35;
    const r3 = Math.random() < p3 ? r1 : (r1 + 1 + Math.floor(Math.random() * (N - 1))) % N;
    const finals = [r1, r2, r3];

    const settledRef = { current: [false, false, false] };
    const settleTimes = [900, 1500, 2100];
    const spinTimers = [];

    const tick = setInterval(() => {
      setSpinIdx((prev) => prev.map((v, i) => (settledRef.current[i] ? v : (v + 1) % N)));
    }, 80);

    finals.forEach((fin, i) => {
      const t = setTimeout(() => {
        settledRef.current[i] = true;
        setReels((prev) => {
          const nx = [...prev];
          nx[i] = fin;
          return nx;
        });
        setSpinIdx((prev) => {
          const nx = [...prev];
          nx[i] = fin;
          return nx;
        });
      }, settleTimes[i]);
      spinTimers.push(t);
    });

    const done = setTimeout(() => {
      clearInterval(tick);
      const locked = finals[0];
      const count = finals.filter((f) => f === locked).length;
      setResult({ symbolId: SLOT_SYMBOLS[locked].id, strength: count, symbolIndex: locked });
      setPhase("done");
    }, settleTimes[2] + 400);

    return () => {
      clearInterval(tick);
      spinTimers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, []);

  const strengthLabel = { 1: "WEAK", 2: "MEDIUM", 3: "STRONG" };
  const strengthColor = { 1: "#9aaa9a", 2: "#4fd6c4", 3: "#e8b84a" };

  const handleClaim = () => {
    if (resolvedRef.current || !result) return;
    resolvedRef.current = true;
    onResolve(result.symbolId, result.strength);
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(8,15,12,0.9)",
        backdropFilter: "blur(10px)",
        zIndex: 40,
        padding: 12,
        overflowY: "auto", // short landscape screens can scroll to reach the button
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, rgba(30,40,32,0.96), rgba(18,26,20,0.98))",
          border: "1px solid rgba(232,184,74,0.5)",
          borderRadius: 20,
          padding: "18px 20px 16px",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          margin: "auto", // centers when it fits, allows scroll when it doesn't
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e8b84a", marginBottom: 4 }}>
          Boss Down — Bonus Spin
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff5d0", marginBottom: 16 }}>🎰 Lucky Harvest</div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 18 }}>
          {[0, 1, 2].map((i) => {
            const settled = reels[i] != null;
            const showIdx = settled ? reels[i] : spinIdx[i];
            const isLockedMatch = phase === "done" && result && reels[i] === result.symbolIndex;
            return (
              <div
                key={i}
                style={{
                  width: 90,
                  height: 100,
                  borderRadius: 14,
                  background: isLockedMatch ? "rgba(232,184,74,0.18)" : "rgba(10,18,14,0.9)",
                  border: `2px solid ${
                    i === 0 && settled ? "#e8b84a" : isLockedMatch ? "rgba(232,184,74,0.8)" : "rgba(111,191,115,0.3)"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  transition: "all 0.2s",
                  transform: settled ? "scale(1)" : "scale(0.96)",
                  position: "relative",
                }}
              >
                <SlotIcon sym={SLOT_SYMBOLS[showIdx]} size={40} />
                {i === 0 && settled && (
                  <div style={{ position: "absolute", bottom: 4, fontSize: 8, letterSpacing: "0.1em", color: "#e8b84a", fontWeight: 700 }}>
                    LOCKED
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {phase === "done" && result ? (
          <>
            <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}>
              <SlotIcon sym={SLOT_SYMBOLS[result.symbolIndex]} size={32} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff5d0" }}>{SLOT_SYMBOLS[result.symbolIndex].name}</div>
            <div
              style={{
                display: "inline-block",
                margin: "6px 0 2px",
                padding: "3px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: strengthColor[result.strength],
                border: `1px solid ${strengthColor[result.strength]}`,
              }}
            >
              {strengthLabel[result.strength]} {"★".repeat(result.strength)}
            </div>
            <div style={{ fontSize: 13, color: "rgba(231,226,214,0.85)", marginBottom: 16, marginTop: 6 }}>
              {SLOT_SYMBOLS[result.symbolIndex].desc[result.strength - 1]}
            </div>
            <button onClick={handleClaim} style={{ ...btnPrimary, padding: "12px 36px", borderRadius: 999, fontSize: 16, width: "100%" }}>
              Claim & Continue
            </button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "rgba(231,226,214,0.7)", minHeight: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {reels[0] != null ? "Bonus locked in! Matching reels boost its power…" : "Spinning…"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN GAME COMPONENT
   ============================================================ */
function PotatoDodge({ onSubmitScore, personalBest }) {
  const canvasRef = useRef(null);
  const canvasViewRef = useRef({ scale: 1, offX: 0, offY: 0, dpr: 1 });
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
    charge: 0,
    bossHp: 0,
    bossHpMax: 0,
    boss: false,
    enraged: false,
  });
  const [finalStats, setFinalStats] = useState({ score: 0, time: 0, level: 1 });
  const [slotOpen, setSlotOpen] = useState(false);
  const stateRef = useRef(null);
  const ammoMax = 15;

  // Apply a slot-machine bonus to the live game state, scaled by strength (1=weak,2=med,3=strong)
  const applySlotBonus = useCallback((symbolId, strength) => {
    const s = stateRef.current;
    if (!s) return;
    switch (symbolId) {
      case "magnet":
        s.buffMagnet = strength * 15; // 15 / 30 / 45 s
        break;
      case "shield":
        // Permanent shield charges (1/2/3), no timer — last until hit. Capped at maxLives display.
        s.shield = Math.min(s.maxLives, s.shield + strength);
        s.shieldTimer = 0; // slot shields never expire
        break;
      case "slow":
        s.buffSlow = strength * 15; // 15 / 30 / 45 s
        s.slow = Math.max(s.slow, s.buffSlow);
        break;
      case "ammo":
        s.ammo = Math.min(ammoMax, s.ammo + strength * 3); // +3/6/9
        break;
      case "gemrain":
        s.buffGemRain = 5 + strength * 5; // 10 / 15 / 20 s
        break;
      case "life":
        // Permanently raise max lives AND grant the lives
        s.maxLives += strength;
        s.lives += strength;
        break;
      case "iotato":
        // Light $TAT pull: gems drift together so they merge into $TAT more often
        s.buffIotato = strength * 6; // 6 / 12 / 18 s
        break;
      default:
        break;
    }
  }, []);

  const closeSlot = useCallback(() => {
    const s = stateRef.current;
    if (s) {
      s.slotOpen = false;
      s.lastTs = 0; // reset timing so no dt jump after pause
    }
    setSlotOpen(false);
  }, []);

  const mkState = useCallback(
    (w, h) => {
      // On touch devices the fullscreen controls sit in the bottom corners, so give
      // the world extra bottom clearance to keep the player/ground above them.
      const isTouchDev = typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;
      const groundOff = isTouchDev ? 110 : 80;
      return {
      w,
      h,
      player: {
        x: w / 2,
        y: h - groundOff,
        groundY: h - groundOff,
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
        aimY: h * 0.15,
        shootCD: 0,
        muzzle: 0,
        charge: 0,
        coyote: 0,
      },
      keys: { left: false, right: false, up: false, jumpQ: false, shoot: false, shootRel: false },
      touch: { x: null, dir: 0, jumpQ: false, shootHold: false, shootRel: false },
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
      shieldTimer: 0, // >0 = temporary shield (from gold pickup); 0 = permanent (slot) or none
      slow: 0,
      slowMo: 0,
      moonBoost: 0,
      magnet: 0,
      comboF: 0,
      // active buffs from slot machine (seconds remaining)
      buffMagnet: 0,
      buffSlow: 0,
      buffGemRain: 0,
      buffIotato: 0,
      bossRageTimer: 0,
      spawnT: 0,
      score: 0,
      lives: 3,
      maxLives: 3,
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
      ammo: 3 + getBonusAmmo(),
      };
    },
    [],
  );

  /* keyboard */
  useEffect(() => {
    const onKey = (e, down) => {
      const st = stateRef.current;
      if (!st) return;
      const k = st.keys;
      if (["ArrowLeft", "a", "A"].includes(e.key)) {
        k.left = down;
        e.preventDefault?.();
      }
      if (["ArrowRight", "d", "D"].includes(e.key)) {
        k.right = down;
        e.preventDefault?.();
      }
      if (["ArrowUp", "w", "W"].includes(e.key)) {
        if (down && !k.up) k.jumpQ = true;
        k.up = down;
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
    // Convert a screen event to fixed world coordinates (accounts for scale + letterbox)
    const toWorld = (e) => {
      const r = c.getBoundingClientRect();
      const v = canvasViewRef.current;
      return {
        x: (e.clientX - r.left - v.offX) / v.scale,
        y: (e.clientY - r.top - v.offY) / v.scale,
      };
    };
    const onM = (e) => {
      const st = stateRef.current;
      if (!st) return;
      const w = toWorld(e);
      st.player.aimX = w.x;
      st.player.aimY = w.y;
    };
    const onD = (e) => {
      const st = stateRef.current;
      if (!st || e.button !== 0) return;
      const w = toWorld(e);
      st.player.aimX = w.x;
      st.player.aimY = w.y;
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
    // Touch aiming: dragging on the play area sets the aim direction (independent
    // of the movement joystick / fire buttons below the canvas).
    const toWorldTouch = (touch) => {
      const r = c.getBoundingClientRect();
      const v = canvasViewRef.current;
      return {
        x: (touch.clientX - r.left - v.offX) / v.scale,
        y: (touch.clientY - r.top - v.offY) / v.scale,
      };
    };
    // Mobile firing model: touching the open play area aims AND shoots. A quick
    // tap fires a normal shot where you touched; holding builds a charge and
    // releasing fires a charged piercing shot. Dragging moves the aim while held.
    // The joystick/jump corners are excluded so movement/jump don't fire.
    const aimTouchRef = { id: null };
    const inControlZone = (clientX, clientY, r) => {
      const fromBottom = r.bottom - clientY;
      if (fromBottom > 95) return false; // above the control band → free play area
      const fromLeft = clientX - r.left;
      const fromRight = r.right - clientX;
      return fromLeft < 150 || fromRight < 130; // joystick (left) / jump button (right)
    };
    const onTouchStartAim = (e) => {
      const st = stateRef.current;
      if (!st) return;
      const r = c.getBoundingClientRect();
      for (const t of e.changedTouches) {
        if (!inControlZone(t.clientX, t.clientY, r)) {
          aimTouchRef.id = t.identifier;
          const w = toWorldTouch(t);
          st.player.aimX = w.x;
          st.player.aimY = w.y;
          st.touch.shootHold = true; // begin charging; release decides tap vs charged
          st.touch.shootRel = false;
          e.preventDefault();
          break;
        }
      }
    };
    const onTouchMoveAim = (e) => {
      const st = stateRef.current;
      if (!st || aimTouchRef.id == null) return;
      const t = Array.from(e.touches).find((x) => x.identifier === aimTouchRef.id);
      if (!t) return;
      const w = toWorldTouch(t);
      st.player.aimX = w.x;
      st.player.aimY = w.y;
      e.preventDefault();
    };
    const onTouchEndAim = (e) => {
      const st = stateRef.current;
      for (const t of e.changedTouches) {
        if (t.identifier === aimTouchRef.id) {
          aimTouchRef.id = null;
          if (st && st.touch.shootHold) {
            st.touch.shootHold = false;
            st.touch.shootRel = true; // fire on release (charge level decides tap vs charged)
          }
        }
      }
    };
    c.addEventListener("touchstart", onTouchStartAim, { passive: false });
    c.addEventListener("touchmove", onTouchMoveAim, { passive: false });
    c.addEventListener("touchend", onTouchEndAim);
    c.addEventListener("touchcancel", onTouchEndAim);
    return () => {
      c.removeEventListener("mousemove", onM);
      c.removeEventListener("mousedown", onD);
      window.removeEventListener("mouseup", onU);
      c.removeEventListener("touchstart", onTouchStartAim);
      c.removeEventListener("touchmove", onTouchMoveAim);
      c.removeEventListener("touchend", onTouchEndAim);
      c.removeEventListener("touchcancel", onTouchEndAim);
    };
  }, []);

  // Size the canvas to fill its element. World HEIGHT is fixed per device (mobile
  // uses a smaller logical height so everything is zoomed in = bigger, easier to
  // play on a small screen); world WIDTH is derived from the element's aspect ratio
  // (clamped) so the play area fills the screen with no black bars.
  const gameHRef = useRef(GAME_H);
  const computeWorldW = (rect, gh) => {
    const aspect = rect.width / rect.height;
    return clamp(Math.round(gh * aspect), GAME_W_MIN, GAME_W_MAX);
  };
  const setupCanvas = (s) => {
    const c = canvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext("2d");
    const gh = gameHRef.current;
    const worldW = s ? s.w : computeWorldW(rect, gh);
    // Uniform scale by height so nothing is stretched; world fills width by design.
    const scale = rect.height / gh;
    // Center horizontally if the clamped world is narrower than the element
    const offX = (rect.width - worldW * scale) / 2;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, 0);
    canvasViewRef.current = { scale, offX, offY: 0, dpr };
    return ctx;
  };

  const start = () => {
    const c = canvasRef.current;
    if (!c) return;
    // Mobile: smaller logical height → bigger sprites & more reaction room.
    const touch = typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;
    gameHRef.current = touch ? 460 : GAME_H;
    const rect = c.getBoundingClientRect();
    const worldW = computeWorldW(rect, gameHRef.current);
    stateRef.current = mkState(worldW, gameHRef.current);
    setupCanvas(stateRef.current);
    setOver(false);
    setRunning(true);
    // Tell the floating mascot to clear off-screen so the player can focus.
    try {
      window.dispatchEvent(new CustomEvent("iotato:game-start"));
    } catch {}
  };

  /* main loop */
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    setupCanvas(stateRef.current);
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
      if (s.player.invuln > 0) return false; // i-frames after a hit
      if (s.shield > 0) {
        s.shield -= 1;
        addP(s, x, y, "#e8b84a", 18);
        addT(s, x, y, s.shield > 0 ? `BLOCKED (${s.shield})` : "BLOCKED", "#e8b84a");
        s.player.invuln = 0.6;
        return false;
      }
      s.lives--;
      s.comboF = 0; // hit fully resets combo
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

      // Difficulty curve: a small baseline from the very start (early game isn't
      // boring) that ramps quickly in the first ~45s, then EASES so it doesn't spike
      // Rising difficulty, but gentler than before so reaching boss 3+ is realistic.
      //   ~10s: 11%, 30s: 17%, 60s: 22%, 120s: 26%, plateau ~30%.
      const t = s.time;
      const extraCandleChance = 0.06 + 0.26 * (t / (t + 70));
      if (!bA && Math.random() < extraCandleChance) {
        const ex = rand(30, s.w - 30);
        const ch = Math.random() < 0.4 ? 32 : 52;
        s.entities.push({ type: "candle", x: ex, y: -ch / 2 - 10, vy: bs * 1.05, w: 22, h: ch, rot: 0, vr: 0 });
      }
      // Gems still rise a bit over time so scoring keeps pace with the danger.
      const extraGemChance = 0.05 + 0.30 * (t / (t + 60));
      if (!bA && Math.random() < extraGemChance) {
        const gx = rand(30, s.w - 30);
        const isI = Math.random() < 0.5;
        s.entities.push({ type: isI ? "iota" : "tln", x: gx, y: -30, vy: bs * 0.95, w: 30, h: 30, rot: 0, vr: isI ? 0.04 : -0.04 });
      }
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
      const hp = 4 + s.bossesDefeated; // 4, 5, 6, 7, ... (+1 per boss)
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
      s.shake = 0.25; // light, brief shake to announce the boss
    };

    const loop = (ts) => {
      const s = stateRef.current;
      if (!s || s.over) {
        if (s && s.over) {
          setFinalStats({ score: Math.floor(s.score), time: s.time, level: s.level });
          setRunning(false);
          setOver(true);
          // Tell the floating mascot to pop in and taunt the player
          try {
            window.dispatchEvent(new CustomEvent("iotato:game-over"));
          } catch {}
        }
        return;
      }
      if (!s.lastTs) s.lastTs = ts;
      // While the bonus slot machine is open, freeze the game (keep rendering last frame)
      if (s.slotOpen) {
        s.lastTs = ts;
        raf = requestAnimationFrame(loop);
        return;
      }
      let dt = (ts - s.lastTs) / 1000;
      if (dt > 0.05) dt = 0.05;
      s.lastTs = ts;
      const slowF = s.slowMo > 0 ? 0.35 : s.slow > 0 ? 0.5 : 1;
      // World speed multiplier — each boss kill increases speed by 25%
      // Tier 1 (start) = 1.0x, Tier 2 = 1.25x, Tier 3 = 1.5x, Tier 4 = 1.75x, etc.
      // World speed rises more SLOWLY now (was 0.15) so the game stays playable
      // deep in. Difficulty instead comes from more red candles over time (below).
      const worldSpeed = 1 + s.bossesDefeated * 0.06;
      const edt = dt * slowF * worldSpeed;
      s.time += dt;
      const p = s.player;
      // Time multiplier: every point is worth more the longer you survive. Tuned
      // for a typical ~2-minute run so the growth is felt within a normal game:
      //   30s ≈ ×1.18, 60s ≈ ×1.36, 120s ≈ ×1.72, 180s ≈ ×2.08, capped ×3.0.
      const timeMult = Math.min(3.0, 1 + s.time * 0.006);
      // Score multiplier (combo, max ×5) + moon boost — defined early so the
      // boss-kill reward and all collectibles can use them.
      const mult = Math.min(5, 1 + Math.floor(s.comboF / 5));
      const moonM = s.moonBoost > 0 ? 2 : 1;
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
      // touch shoot — tap fires a normal shot (charge handled by hold flag)
      if (s.touch.shootHold) {
        p.charge = Math.min(1, p.charge + dt / 0.5);
      }
      if (s.touch.shootRel) {
        if (p.charge >= 1) fire(s, true);
        else if (p.shootCD <= 0) fire(s, false);
        p.charge = 0;
        s.touch.shootRel = false;
      }
      // movement
      const spd = 380;
      if (s.touch.dir != null && s.touch.dir !== 0) {
        // Joystick: dir is -1..1. Response curve so small tilts are gentle (less twitchy).
        const d = s.touch.dir;
        const eased = Math.sign(d) * Math.pow(Math.abs(d), 1.6);
        p.vx = clamp(eased * spd, -spd, spd);
      } else {
        let v = 0;
        if (s.keys.left) v -= spd;
        if (s.keys.right) v += spd;
        p.vx = v;
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
        // Gem Rain buff: spawn an extra guaranteed gem each tick
        if (s.buffGemRain > 0) {
          const gx = rand(30, s.w - 30);
          const gbs = 120 + s.level * 26;
          s.entities.push({
            type: Math.random() < 0.5 ? "iota" : "tln",
            x: gx, y: -30, vy: gbs * 0.95, w: 30, h: 30, rot: 0, vr: 0.04,
          });
        }
        // IOTATO ($TAT) buff: spawn IOTA+TLN PAIRS almost every tick — this is the
        // dedicated $TAT source, so it should clearly out-produce Gem Rain for TATs.
        // They're spawned close together and the strong pull (below) merges them.
        if (s.buffIotato > 0 && Math.random() < 0.85) {
          const gx = rand(70, s.w - 70);
          const gbs = 120 + s.level * 26;
          s.entities.push({ type: "iota", x: gx - 26, y: -30, vy: gbs * 0.85, w: 30, h: 30, rot: 0, vr: 0.04 });
          s.entities.push({ type: "tln", x: gx + 26, y: -36, vy: gbs * 0.85, w: 30, h: 30, rot: 0, vr: -0.04 });
        }
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

        const tier = s.bossesDefeated; // 0 = first boss, 1 = second, 2+ = third and beyond
        // Boss 1 (tier 0) never changes — no rage, no enrage, steady fire.
        if (tier >= 1) {
          // Rage timer: after 40s the boss escalates (15s longer than before).
          s.bossRageTimer += dt;
          const rageRamp = Math.max(0, s.bossRageTimer - 40);
          b.raging = rageRamp > 0;
          if (b.raging && !b._rageWarn) {
            b._rageWarn = true;
            addT(s, b.x, b.y, "GETTING ANGRY...", "#ff5a6a", true);
          }
          // Enrage at half HP (tier 2+ only — gives the spiral spray)
          if (tier >= 2 && !b.enraged && b.hp <= b.hpMax * 0.5) {
            b.enraged = true;
            b.vx *= 1.4;
            s.flash = 0.3;
            s.flashColor = "#ff5a6a";
            addT(s, b.x, b.y, "ENRAGED!", "#ff5a6a", true);
          }
        }

        b.atkT -= edt;
        if (b.atkT <= 0) {
          if (tier >= 2 && (b.enraged || b.raging)) {
            // Third boss and beyond: spiral spray — 2 opposing streams
            b.spiralA += 0.6;
            for (let k = 0; k < 2; k++) {
              const a = b.spiralA + k * Math.PI;
              s.entities.push({
                type: "candle", x: b.x, y: b.y + 20,
                vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 + 80,
                w: 20, h: 44, rot: 0, vr: 0.1,
              });
            }
            // Boss 4 (tier 3+): occasionally fire ONE candle aimed at the player —
            // forces you to keep moving, not just stand in a safe gap.
            if (tier >= 3 && Math.random() < 0.5) {
              const adx = p.x - b.x, ady = p.groundY - b.y;
              const ad = Math.hypot(adx, ady) || 1;
              s.entities.push({
                type: "candle", x: b.x, y: b.y + 20,
                vx: (adx / ad) * 200, vy: (ady / ad) * 200,
                w: 20, h: 44, rot: 0, vr: 0.08, aimed: true,
              });
            }
            b.atkT = 0.55;
            // Boss 5 (tier 4+): fire a quick second volley shortly after — short
            // double-burst. Kept mild because world speed + extra candles already scale.
            if (tier >= 4 && !b._volley) {
              b._volley = true;
              b.atkT = 0.18;
            } else {
              b._volley = false;
            }
          } else {
            // Standard fan of candles
            for (let i = -2; i <= 2; i++)
              s.entities.push({
                type: "candle", x: b.x + i * 30, y: b.y + 30,
                vy: 220 + s.level * 10, w: 22, h: 52, rot: 0, vr: 0,
              });
            const baseInterval = Math.max(0.9, 2.0 - tier * 0.15);
            b.atkT = tier === 1 && b.raging ? baseInterval * 0.55 : baseInterval;
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
          if (Math.abs(sh.x - b.x) < 50 && Math.abs(sh.y - b.y) < 42 && b.hp > 0 && !sh._hitBoss) {
            const dmg = sh.charged ? 2 : 1;
            b.hp -= dmg;
            b.hitFlash = 0.25;
            s.score += 20 * dmg;
            addP(s, sh.x, sh.y, "#6fbf73", 12);
            addT(s, sh.x, sh.y, `-${dmg}`, "#6fbf73");
            // A shot can only damage the boss ONCE (pierce only lets it pass through
            // regular objects, not re-hit the boss every frame).
            sh._hitBoss = true;
            kill = true;
            if (b.hp <= 0) {
              s.bossesDefeated++;
              s.nextBossLevel = s.level + 4;
              // Exponential reward: 300, 600, 1200, 2400... strongly rewards progressing
              s.score += Math.round(300 * Math.pow(2, s.bossesDefeated - 1)) * moonM;
              addP(s, b.x, b.y, "#e8b84a", 50);
              addT(s, b.x, b.y, "BOSS DOWN!", "#e8b84a", true);
              s.explosions.push({ x: b.x, y: b.y, r: 0, maxR: 120, life: 0.8, max: 0.8 });
              s.boss = null;
              s.bossRageTimer = 0;
              s.ammo = Math.min(ammoMax, s.ammo + 4);
              s.tierUpFlash = 3.0; // Show LEVEL X banner for 3 seconds
              // Trigger the bonus slot machine
              s.pendingSlot = true;
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
      // score/combo — ONE unified combo system (max ×5)
      s.score += dt * 5 * timeMult;
      // Combo decays slowly over time, resets to 0 on hit (handled in damage())
      if (s.comboF > 0) s.comboF = Math.max(0, s.comboF - dt * 0.45);
      // entities
      // --- TAT MERGE: when an IOTA gem and a TLN gem touch, they fuse into a $TAT coin ---
      for (let a = 0; a < s.entities.length; a++) {
        const ea = s.entities[a];
        if (ea._merged) continue;
        const aIota = ea.type === "iota" || ea.type === "iota_air";
        const aTln = ea.type === "tln" || ea.type === "tln_air";
        if (!aIota && !aTln) continue;
        for (let b2 = a + 1; b2 < s.entities.length; b2++) {
          const eb = s.entities[b2];
          if (eb._merged) continue;
          const bIota = eb.type === "iota" || eb.type === "iota_air";
          const bTln = eb.type === "tln" || eb.type === "tln_air";
          if (!bIota && !bTln) continue;
          // need one IOTA and one TLN
          if ((aIota && bTln) || (aTln && bIota)) {
            const dx = ea.x - eb.x, dy = ea.y - eb.y;
            const dd = Math.hypot(dx, dy);
            // IOTATO ($TAT) buff: strong, VISIBLE attraction. Big radius so an IOTA and
            // a TLN clearly drift toward each other and fuse. The pull eases in as they
            // get closer (smooth, not teleporting) and leaves a sparkle trail.
            if (s.buffIotato > 0 && dd > (ea.w + eb.w) / 2 && dd < 220) {
              // closer = stronger pull (eased), but capped so it stays watchable
              const closeness = 1 - dd / 220; // 0 far → 1 near
              const pull = (60 + 140 * closeness) * dt;
              const ux = dx / (dd || 1), uy = dy / (dd || 1);
              ea.x -= ux * pull; ea.y -= uy * pull;
              eb.x += ux * pull; eb.y += uy * pull;
              // occasional sparkle between them so the merge is visible
              if (Math.random() < 0.25) {
                addP(s, (ea.x + eb.x) / 2, (ea.y + eb.y) / 2, "#e8b84a", 2, 60);
              }
            }
            if (dd < (ea.w + eb.w) / 2) {
              const mx = (ea.x + eb.x) / 2, my = (ea.y + eb.y) / 2;
              ea._merged = true;
              eb._merged = true;
              // fusion flash
              s.explosions.push({ x: mx, y: my, r: 0, maxR: 50, life: 0.45, max: 0.45, ring: "#e8b84a" });
              addP(s, mx, my, "#e8b84a", 24);
              addT(s, mx, my, "$TAT!", "#e8b84a", true);
              s.entities.push({ type: "tat", x: mx, y: my, vy: Math.max(ea.vy || 60, eb.vy || 60) * 0.6, w: 40, h: 40, rot: 0, vr: 0.05, born: s.time });
            }
          }
        }
      }
      if (s.entities.some((e) => e._merged)) {
        s.entities = s.entities.filter((e) => !e._merged);
      }

      for (let i = s.entities.length - 1; i >= 0; i--) {
        const e = s.entities[i];
        if (e.vy != null) e.y += e.vy * edt;
        if (e.vx != null) e.x += e.vx * edt;
        e.rot += e.vr;
        const isG = ["iota", "tln", "iota_air", "tln_air"].includes(e.type);
        // TAT coins and hearts are also magnet-attractable
        const isAttract = isG || e.type === "tat" || e.type === "heart";
        if ((s.magnet > 0 || s.buffMagnet > 0) && isAttract) {
          const dx = p.x - e.x,
            dy = p.y - e.y,
            d = Math.hypot(dx, dy);
          if (d < 220) {
            e.x += (dx / (d || 1)) * 600 * dt;
            e.y += (dy / (d || 1)) * 600 * dt;
          }
        }
        if (e.y > s.h + 60 || e.x < -100 || e.x > s.w + 100) {
          s.entities.splice(i, 1);
          continue;
        }
        if (coll(e, p)) {
          if (e.type === "tat") {
            // TAT coin: base 65 with the FULL combo multiplier (like other gems),
            // plus moon + time multiplier.
            const gained = Math.round(65 * mult * moonM * timeMult);
            s.comboF = Math.min(25, s.comboF + 2);
            s.score += gained;
            addP(s, e.x, e.y, "#e8b84a", 32);
            addT(s, e.x, e.y, `+${gained} $TAT!`, "#e8b84a", true);
            s.explosions.push({ x: e.x, y: e.y, r: 0, maxR: 60, life: 0.4, max: 0.4, ring: "#e8b84a" });
            s.entities.splice(i, 1);
          } else if (isG) {
            const isAir = e.type.endsWith("_air");
            const isI = e.type.startsWith("iota");
            const depthBonus = e.y > s.h * 0.66 ? 1.5 : 1;
            const base = (isI ? 10 : 15) + (isAir ? 5 : 0);
            s.comboF = Math.min(25, s.comboF + 1);
            const gained = Math.round(base * mult * moonM * depthBonus * timeMult);
            s.score += gained;
            const col = isI ? "#4fd6c4" : "#7aa8ff";
            addP(s, e.x, e.y, col, 16);
            addT(s, e.x, e.y, `+${gained}${mult > 1 ? ` ×${mult}` : ""}`, col);
            s.explosions.push({ x: e.x, y: e.y, r: 0, maxR: 38, life: 0.32, max: 0.32, ring: col });
            s.entities.splice(i, 1);
          } else if (e.type === "gold") {
            s.score += 25 * moonM;
            // Shield from gold pickup: 1 hit, but only lasts 15s if unused
            s.shield = Math.max(s.shield, 1);
            s.shieldTimer = 15;
            s.slow = 3;
            addP(s, e.x, e.y, "#e8b84a", 28);
            addT(s, e.x, e.y, "SHIELD!", "#e8b84a");
            s.entities.splice(i, 1);
          } else if (e.type === "moon") {
            s.score += 15;
            s.moonBoost = 10;
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
        "slow",
        "slowMo",
        "moonBoost",
        "magnet",
        "buffMagnet",
        "buffSlow",
        "buffGemRain",
        "buffIotato",
        "levelFlash",
        "bossIntro",
        "tierUpFlash",
      ].forEach((k) => {
        if (s[k] > 0) s[k] -= dt;
      });
      // Temporary (gold-pickup) shield expires after its timer; slot shields are permanent.
      if (s.shieldTimer > 0) {
        s.shieldTimer -= dt;
        if (s.shieldTimer <= 0 && s.shield > 0) {
          s.shield = 0;
          addT(s, s.player.x, s.player.y - 30, "shield faded", "#e8b84a");
        }
      }
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
      // Adapt world width if the display aspect changed a lot (e.g. entered
      // fullscreen or rotated). Keep player in-bounds after a resize.
      const rectNow = canvas.getBoundingClientRect();
      const desiredW = clamp(Math.round(gameHRef.current * (rectNow.width / rectNow.height)), GAME_W_MIN, GAME_W_MAX);
      if (Math.abs(desiredW - s.w) > 8) {
        s.w = desiredW;
        if (s.player.x > s.w - 20) s.player.x = s.w - 20;
      }
      // Re-apply transform each frame so fullscreen/resize is handled live.
      setupCanvas(s);
      // Clear the ENTIRE backing store (including any side margin) in device space
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#05090f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      drawBackground(ctx, s);
      drawHills(ctx, s);
      drawFog(ctx, s);
      ctx.strokeStyle = "rgba(111,191,115,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, p.groundY + 30);
      ctx.lineTo(s.w, p.groundY + 30);
      ctx.stroke();
      // Shake intensity scales with the remaining shake value so it decays smoothly
      // and short shakes are gentle. Capped so it never gets nauseating.
      const shakeAmp = s.shake > 0 ? Math.min(10, s.shake * 16) : 0;
      const sx = shakeAmp ? rand(-1, 1) * shakeAmp : 0,
        sy = shakeAmp ? rand(-1, 1) * shakeAmp : 0;
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
        else if (e.type === "tat") drawTatCoin(ctx, e.w, s.time);
        else if (e.type === "heart") drawHeart(ctx, e.w);
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
      // Combo aura — grows brighter with multiplier (visible reward feedback)
      if (mult >= 2) {
        const auraColors = { 2: "#6fbf73", 3: "#4fd6c4", 4: "#7aa8ff", 5: "#e8b84a" };
        const ac = auraColors[mult] || "#e8b84a";
        const pulse = 0.5 + Math.sin(s.time * 10) * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.1 * pulse;
        const rad = 36 + mult * 4 + pulse * 4;
        const g = ctx.createRadialGradient(p.x, p.y - 4, rad * 0.4, p.x, p.y - 4, rad);
        g.addColorStop(0, ac + "00");
        g.addColorStop(0.7, ac + "55");
        g.addColorStop(1, ac + "00");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // floating multiplier text above player at high combo
        if (mult >= 3) {
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = ac;
          ctx.font = `bold ${14 + mult * 2}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillText(`×${mult}`, p.x, p.y - 44 - pulse * 3);
          ctx.restore();
        }
      }
      if (p.invuln <= 0 || Math.floor(p.invuln * 12) % 2 === 0) drawPlayer(ctx, p);
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
      if ((s.magnet > 0 || s.buffMagnet > 0)) {
        ctx.strokeStyle = `rgba(255,107,181,${0.3 + Math.sin(s.time * 8) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4, 220, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(${s.flashColor === "#fffacd" ? "255,250,205" : "255,90,106"},${s.flash})`;
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

      // When a boss kill flagged a slot spin, pause the loop and open the slot UI
      if (s.pendingSlot && !s.boss) {
        s.pendingSlot = false;
        s.slotOpen = true;
        setSlotOpen(true);
      }

      setHud({
        score: Math.floor(s.score),
        lives: s.lives,
        maxLives: s.maxLives,
        time: s.time,
        level: s.bossesDefeated + 1, // tier = bosses defeated + 1 (starts at 1)
        worldSpeed: worldSpeed,
        combo: Math.floor(s.comboF),
        mult,
        ammo: s.ammo,
        charge: p.charge,
        bossHp: s.boss ? s.boss.hp : 0,
        bossHpMax: s.boss ? s.boss.hpMax : 0,
        boss: !!s.boss,
        enraged: s.boss ? s.boss.enraged : false,
        buffMagnet: s.buffMagnet,
        buffSlow: s.buffSlow,
        buffGemRain: s.buffGemRain,
        buffIotato: s.buffIotato,
        shield: s.shield,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  /* mobile detection + fullscreen */
  const [isTouch, setIsTouch] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none), (pointer: coarse)").matches);
    const onOrient = () => setPortrait(window.innerHeight > window.innerWidth);
    onOrient();
    const onFs = () => {
      const fs = !!document.fullscreenElement;
      setIsFs(fs);
      // On phones, try to lock to landscape when entering fullscreen.
      if (fs && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("resize", onOrient);
    window.addEventListener("orientationchange", onOrient);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("resize", onOrient);
      window.removeEventListener("orientationchange", onOrient);
    };
  }, []);
  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
    }
  };

  // Joystick + button handlers (write into stateRef.touch)
  const joyRef = useRef({ active: false, cx: 0, id: null });
  const setDir = (d) => {
    const st = stateRef.current;
    if (st) st.touch.dir = d;
  };
  const onJoyStart = (e) => {
    const t = e.touches ? e.touches[0] : e;
    joyRef.current = { active: true, cx: t.clientX, id: e.touches ? t.identifier : "m" };
    setDir(0);
    e.preventDefault?.();
  };
  const onJoyMove = (e) => {
    if (!joyRef.current.active) return;
    let t;
    if (e.touches) {
      t = Array.from(e.touches).find((x) => x.identifier === joyRef.current.id) || e.touches[0];
    } else t = e;
    const dx = t.clientX - joyRef.current.cx;
    const max = 50;
    const d = clamp(dx / max, -1, 1);
    setDir(Math.abs(d) < 0.15 ? 0 : d);
    e.preventDefault?.();
  };
  const onJoyEnd = (e) => {
    joyRef.current.active = false;
    setDir(0);
    e.preventDefault?.();
  };
  const tapJump = (e) => {
    const st = stateRef.current;
    if (st) st.touch.jumpQ = true;
    e.preventDefault?.();
  };

  const lvlProg = ((hud.time % 12) / 12) * 100;
  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        maxWidth: isFs ? "100%" : 900,
        margin: "0 auto",
        fontFamily: "system-ui,sans-serif",
        color: "#e7e2d6",
        background: isFs ? "#05090f" : "transparent",
        padding: isFs ? "6px 10px" : 0,
        display: "flex",
        flexDirection: "column",
        height: isFs ? "100vh" : "auto",
        justifyContent: "flex-start",
        boxSizing: "border-box",
        overflow: isFs ? "hidden" : "visible",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: isFs ? 4 : 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatBadge label="Score" value={hud.score} />
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: "rgba(20,30,25,0.6)",
              border: "1px solid rgba(111,191,115,0.2)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ opacity: 0.6, fontSize: 11 }}>Lives</span>
            <span style={{ letterSpacing: 1 }}>
              {(() => {
                // Grey hearts = shielded (the first `shield` hearts), red = normal lives.
                const total = Math.max(hud.lives, 0);
                const shielded = Math.min(hud.shield || 0, total);
                const hearts = [];
                for (let i = 0; i < total; i++) {
                  const isShield = i < shielded;
                  hearts.push(
                    <span key={i} style={{ color: isShield ? "#9aa6a0" : "#ff5a7a", filter: isShield ? "grayscale(1)" : "none" }}>
                      ♥
                    </span>,
                  );
                }
                return hearts.length ? hearts : "—";
              })()}
            </span>
          </div>
          <StatBadge label="Time" value={`${hud.time.toFixed(1)}s`} />
          <StatBadge
            label="Lvl"
            value={`${hud.level}${hud.worldSpeed > 1 ? ` (${hud.worldSpeed.toFixed(2)}×)` : ""}`}
            highlight={hud.worldSpeed > 1}
          />
          {hud.combo >= 5 && (
            <StatBadge label="Combo" value={`×${hud.mult}${hud.mult >= 5 ? " MAX🔥" : ""}`} highlight />
          )}
          {hud.buffMagnet > 0 && <StatBadge label="Magnet" value={`🧲${Math.ceil(hud.buffMagnet)}s`} highlight />}
          {hud.buffSlow > 0 && <StatBadge label="Slow" value={`⏱️${Math.ceil(hud.buffSlow)}s`} highlight />}
          {hud.buffGemRain > 0 && <StatBadge label="Gems" value={`💎${Math.ceil(hud.buffGemRain)}s`} highlight />}
          {hud.buffIotato > 0 && <StatBadge label="$TAT" value={`🥔${Math.ceil(hud.buffIotato)}s`} highlight />}
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
          borderRadius: isFs ? 10 : 16,
          overflow: "hidden",
          border: "1px solid rgba(111,191,115,0.25)",
          boxShadow: "0 0 50px rgba(79,214,196,0.08)",
          ...(isFs ? { flex: "1 1 auto", minHeight: 0 } : {}),
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: isFs ? "100%" : "min(70vh,560px)",
            background: "#05090f",
            touchAction: "none",
            cursor: running ? "crosshair" : "default",
          }}
        />
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
              Dodge candles. Grab gems. Shoot sprouts. Build combos. Crush the bear.
            </p>
            {isTouch ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px 24px",
                  fontSize: 13,
                  opacity: 0.85,
                  textAlign: "left",
                  maxWidth: 420,
                  margin: "0 auto 14px",
                }}
              >
                <span>🕹️ <b>Move</b> joystick</span>
                <span>🦘 <b>Jump</b> button (×2)</span>
                <span>🎯 <b>Aim & shoot</b> tap screen</span>
                <span>💥 <b>Charge</b> hold screen</span>
              </div>
            ) : (
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
                  🎯 <b>Aim</b> mouse
                </span>
                <span>
                  💥 <b>Charge</b> hold, then release
                </span>
              </div>
            )}
            {isTouch && !isFs && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(79,214,196,0.12)",
                  border: "1px solid rgba(79,214,196,0.4)",
                  color: "#9fe6df",
                  fontSize: 12.5,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                ⛶ Best played in fullscreen — tap the button below
              </div>
            )}
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
        {slotOpen && (
          <SlotMachine
            onResolve={(symbolId, strength) => {
              applySlotBonus(symbolId, strength);
              closeSlot();
            }}
          />
        )}
        {isFs && isTouch && portrait && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              background: "rgba(5,9,15,0.96)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              textAlign: "center",
              padding: 24,
            }}
          >
            <div style={{ fontSize: 56, animation: "rotateHint 2s ease-in-out infinite" }}>📱</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff5d0" }}>Rotate your phone</div>
            <div style={{ fontSize: 13, color: "rgba(231,226,214,0.7)", maxWidth: "28ch" }}>
              Turn your device sideways for the full-screen Potato Dodge experience.
            </div>
          </div>
        )}
        {/* Fullscreen mobile controls: compact, semi-transparent, in the bottom
            corners. The canvas fills the whole screen behind them; the clear center
            keeps the play area visible. Only the controls capture touches. */}
        {isTouch && isFs && (
          <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none" }}>
            {/* Joystick — bottom left */}
            <div
              onTouchStart={onJoyStart}
              onTouchMove={onJoyMove}
              onTouchEnd={onJoyEnd}
              style={{
                position: "absolute",
                left: 14,
                bottom: 14,
                width: 104,
                height: 62,
                borderRadius: 14,
                background: "rgba(20,30,25,0.32)",
                border: "1px solid rgba(111,191,115,0.4)",
                backdropFilter: "blur(3px)",
                WebkitBackdropFilter: "blur(3px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "rgba(231,226,214,0.7)",
                fontWeight: 700,
                letterSpacing: "0.05em",
                pointerEvents: "auto",
              }}
            >
              ◀ MOVE ▶
            </div>
            {/* Jump — bottom right (shooting is done by touching the play area) */}
            <div
              style={{
                position: "absolute",
                right: 14,
                bottom: 14,
                display: "flex",
                gap: 10,
                pointerEvents: "auto",
              }}
            >
              <button
                onTouchStart={tapJump}
                style={{
                  width: 96,
                  height: 62,
                  borderRadius: 14,
                  background: "rgba(79,214,196,0.28)",
                  border: "1px solid rgba(79,214,196,0.55)",
                  backdropFilter: "blur(3px)",
                  WebkitBackdropFilter: "blur(3px)",
                  color: "#bdeee8",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                ⬆ JUMP
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls. In fullscreen: compact semi-transparent overlay pinned to
          the bottom CORNERS so the center play area stays clear and the canvas can
          fill the whole screen. Otherwise: solid bar below the game. */}
      {isTouch && !isFs && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            userSelect: "none",
            touchAction: "none",
            marginTop: 10,
            flexShrink: 0,
          }}
        >
          {/* Joystick (left) */}
          <div
            onTouchStart={onJoyStart}
            onTouchMove={onJoyMove}
            onTouchEnd={onJoyEnd}
            style={{
              width: 120,
              height: 90,
              borderRadius: 16,
              background: "rgba(20,30,25,0.7)",
              border: "1px solid rgba(111,191,115,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "rgba(231,226,214,0.6)",
              fontWeight: 700,
              letterSpacing: "0.05em",
              position: "relative",
            }}
          >
            ◀ MOVE ▶
          </div>
          {/* Jump on the right (shooting is done by touching the play area) */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 120 }}>
            <button
              onTouchStart={tapJump}
              style={{
                height: 90,
                borderRadius: 12,
                background: "rgba(79,214,196,0.2)",
                border: "1px solid rgba(79,214,196,0.5)",
                color: "#bdeee8",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              ⬆ JUMP
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 12 }}>
        <p style={{ fontSize: 11, opacity: 0.45, margin: 0 }}>
          {isTouch
            ? "Tap the screen to aim & shoot. Hold for a charged piercing shot. Joystick to move, JUMP to double-jump."
            : "Tip: hold SHOOT to charge a piercing shot for 3× boss damage. Merge IOTA + TLN gems into a $TAT coin for big points."}
        </p>
        <button
          onClick={toggleFullscreen}
          style={{
            flexShrink: 0,
            padding: "6px 14px",
            borderRadius: 10,
            background: "rgba(20,30,25,0.7)",
            border: "1px solid rgba(111,191,115,0.35)",
            color: "#e7e2d6",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isFs ? "✕ Exit Fullscreen" : "⛶ Fullscreen"}
        </button>
      </div>
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

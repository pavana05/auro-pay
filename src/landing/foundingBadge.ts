/**
 * Generates a 1080x1920 (Instagram Story) "Founding Member" badge PNG
 * personalized with the user's name and referral code.
 *
 * Pure-canvas — no network, no external assets. Safe to call on click.
 */

const W = 1080;
const H = 1920;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface FoundingBadgeInput {
  name: string;
  referralCode: string | null;
  position?: number | null; // e.g. 12438
}

export function generateFoundingBadge({ name, referralCode, position }: FoundingBadgeInput): string {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // ---------- Background ----------
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b0a07");
  bg.addColorStop(0.55, "#15110a");
  bg.addColorStop(1, "#06050a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft gold aurora top
  const aur1 = ctx.createRadialGradient(W / 2, 360, 50, W / 2, 360, 700);
  aur1.addColorStop(0, "rgba(224,176,72,0.55)");
  aur1.addColorStop(1, "rgba(224,176,72,0)");
  ctx.fillStyle = aur1;
  ctx.fillRect(0, 0, W, H);

  // Aurora bottom
  const aur2 = ctx.createRadialGradient(W / 2, H - 320, 80, W / 2, H - 320, 720);
  aur2.addColorStop(0, "rgba(200,149,46,0.30)");
  aur2.addColorStop(1, "rgba(200,149,46,0)");
  ctx.fillStyle = aur2;
  ctx.fillRect(0, 0, W, H);

  // Subtle grain (sparse dots) for texture
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#fff7e3";
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 1.6 + 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ---------- Outer card frame ----------
  const cardX = 80;
  const cardY = 220;
  const cardW = W - 160;
  const cardH = H - 440;

  // Gold conic-ish border (faked with two stacked rounded rects)
  const border = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  border.addColorStop(0, "rgba(224,176,72,0.95)");
  border.addColorStop(0.5, "rgba(255,247,227,0.25)");
  border.addColorStop(1, "rgba(200,149,46,0.95)");
  ctx.fillStyle = border;
  roundRect(ctx, cardX, cardY, cardW, cardH, 64);
  ctx.fill();

  // Inner card background
  const innerGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
  innerGrad.addColorStop(0, "#1a150d");
  innerGrad.addColorStop(1, "#0a0a0e");
  ctx.fillStyle = innerGrad;
  roundRect(ctx, cardX + 4, cardY + 4, cardW - 8, cardH - 8, 60);
  ctx.fill();

  // ---------- Top brand row ----------
  ctx.fillStyle = "rgba(255,247,227,0.55)";
  ctx.font = "600 30px Sora, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "8px";
  // letterSpacing isn't widely supported on canvas; emulate via tracking spaces
  ctx.fillText("A U R O P A Y", W / 2, cardY + 110);

  // ---------- Medallion ----------
  const cx = W / 2;
  const cy = cardY + 360;
  const rOuter = 175;

  // Outer halo
  const halo = ctx.createRadialGradient(cx, cy, 80, cx, cy, 360);
  halo.addColorStop(0, "rgba(224,176,72,0.65)");
  halo.addColorStop(1, "rgba(224,176,72,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 360, 0, Math.PI * 2);
  ctx.fill();

  // Medal disc (gold)
  const disc = ctx.createRadialGradient(cx - 40, cy - 40, 20, cx, cy, rOuter);
  disc.addColorStop(0, "#fff2c2");
  disc.addColorStop(0.45, "#e0b048");
  disc.addColorStop(1, "#8a6520");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.fill();

  // Inner ring
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter - 22, 0, Math.PI * 2);
  ctx.stroke();

  // Crown / star glyph (simple 5-point star)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#0a0a0a";
  const spikes = 5;
  const outerR = 70;
  const innerR = 28;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ---------- Title ----------
  ctx.fillStyle = "#fff";
  ctx.font = "800 78px Sora, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Founding Member", cx, cy + 290);

  // Subtitle
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "400 30px Sora, system-ui, sans-serif";
  ctx.fillText("First in line for India's smartest", cx, cy + 348);
  ctx.fillText("teen-and-parent payments app.", cx, cy + 388);

  // ---------- Name plate ----------
  const safeName = (name || "Friend").trim().slice(0, 24) || "Friend";
  ctx.fillStyle = "rgba(224,176,72,0.85)";
  ctx.font = "600 26px Sora, system-ui, sans-serif";
  ctx.fillText("MEMBER", cx, cy + 460);

  ctx.fillStyle = "#ffe9a8";
  ctx.font = "700 56px Sora, system-ui, sans-serif";
  ctx.fillText(safeName, cx, cy + 520);

  // ---------- Position pill ----------
  if (typeof position === "number" && position > 0) {
    const pillW = 420;
    const pillH = 84;
    const pillX = cx - pillW / 2;
    const pillY = cy + 560;

    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    pillGrad.addColorStop(0, "rgba(224,176,72,0.30)");
    pillGrad.addColorStop(1, "rgba(200,149,46,0.18)");
    ctx.fillStyle = pillGrad;
    roundRect(ctx, pillX, pillY, pillW, pillH, 42);
    ctx.fill();
    ctx.strokeStyle = "rgba(224,176,72,0.55)";
    ctx.lineWidth = 2;
    roundRect(ctx, pillX, pillY, pillW, pillH, 42);
    ctx.stroke();

    ctx.fillStyle = "#fff7e3";
    ctx.font = "700 38px Sora, system-ui, sans-serif";
    ctx.fillText(`#${position.toLocaleString("en-IN")} in line`, cx, pillY + 56);
  }

  // ---------- Referral code footer ----------
  if (referralCode) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "500 24px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText("INVITE CODE", cx, cardY + cardH - 130);

    ctx.fillStyle = "#ffe9a8";
    ctx.font = "700 44px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText(referralCode, cx, cardY + cardH - 80);
  }

  // ---------- Bottom URL ----------
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 30px Sora, system-ui, sans-serif";
  ctx.fillText("auro-pay.lovable.app", W / 2, H - 110);

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
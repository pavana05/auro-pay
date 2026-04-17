/**
 * Custom SVG chart primitives for the Admin dashboard.
 * No external chart libs — themed, fast, animated via CSS.
 */
import { useState } from "react";

const G = {
  primary: "#c8952e",
  secondary: "#d4a84b",
  glow: "#e8c060",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

/* ─────────── Sparkline (inside KPI cards) ─────────── */
export const Sparkline = ({
  data,
  color = G.primary,
  height = 36,
}: {
  data: number[];
  color?: string;
  height?: number;
}) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const id = `sp-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

/* ─────────── Volume bar chart (clickable) ─────────── */
export interface VolBar {
  day: string;        // label
  date: string;       // YYYY-MM-DD
  volume: number;     // paise
  count: number;
}

export const VolumeBars = ({
  data,
  selected,
  onSelect,
  height = 220,
}: {
  data: VolBar[];
  selected: string | null;
  onSelect: (d: string | null) => void;
  height?: number;
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.volume), 1);
  const W = 600;
  const H = 200;
  const padL = 38;
  const padB = 22;
  const padT = 8;
  const innerW = W - padL - 8;
  const innerH = H - padB - padT;
  const bw = innerW / Math.max(data.length, 1);
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((p) => p * max);
  const fmt = (paise: number) =>
    paise >= 10000000 ? `₹${(paise / 10000000).toFixed(1)}Cr` :
    paise >= 100000 ? `₹${(paise / 100000).toFixed(1)}L` :
    paise >= 1000 ? `₹${Math.round(paise / 100000 * 10) / 10}L` :
    `₹${Math.round(paise / 100)}`;

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={G.glow} stopOpacity={0.95} />
            <stop offset="100%" stopColor={G.primary} stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id="barGoldHot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd97a" stopOpacity={1} />
            <stop offset="100%" stopColor={G.primary} stopOpacity={0.85} />
          </linearGradient>
        </defs>

        {/* horizontal grid */}
        {yLabels.map((v, i) => {
          const y = padT + innerH - (v / max) * innerH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - 4} y2={y} stroke="rgba(200,149,46,0.06)" strokeDasharray="2 4" />
              <text x={padL - 6} y={y + 3} fill="rgba(255,255,255,0.3)" fontSize={8} textAnchor="end" fontFamily="'JetBrains Mono', monospace">
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, i) => {
          const bh = (d.volume / max) * innerH;
          const x = padL + i * bw + bw * 0.12;
          const y = padT + innerH - bh;
          const w = bw * 0.76;
          const isSel = selected === d.date;
          const isHover = hover === i;
          return (
            <g key={d.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(isSel ? null : d.date)}
              style={{ cursor: "pointer" }}
            >
              <rect x={padL + i * bw} y={padT} width={bw} height={innerH} fill="transparent" />
              <rect
                x={x} y={y} width={w} height={Math.max(bh, 1)}
                rx={2}
                fill={isSel || isHover ? "url(#barGoldHot)" : "url(#barGold)"}
                style={{
                  filter: isSel ? `drop-shadow(0 0 6px ${G.primary})` : isHover ? `drop-shadow(0 0 4px ${G.primary}80)` : "none",
                  transition: "filter 0.2s",
                }}
              />
            </g>
          );
        })}

        {/* x labels (every Nth) */}
        {data.map((d, i) => {
          if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
          const x = padL + i * bw + bw / 2;
          return (
            <text key={d.date + "x"} x={x} y={H - 6} fill="rgba(255,255,255,0.3)" fontSize={8} textAnchor="middle" fontFamily="Sora">
              {d.day}
            </text>
          );
        })}
      </svg>

      {/* tooltip */}
      {hover !== null && data[hover] && (
        <div
          className="absolute pointer-events-none rounded-[10px] px-3 py-2 text-[10px] font-sora"
          style={{
            left: `${(padL + hover * bw + bw / 2) / W * 100}%`,
            top: 0,
            transform: "translate(-50%, -110%)",
            background: "rgba(18,20,24,0.96)",
            border: "1px solid rgba(200,149,46,0.18)",
            color: "#fff",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          <div className="text-white/50">{data[hover].day}</div>
          <div className="font-mono font-bold text-[12px]">{fmt(data[hover].volume)}</div>
          <div className="text-white/40">
            {data[hover].count} txns · avg {data[hover].count > 0 ? fmt(Math.round(data[hover].volume / data[hover].count)) : "—"}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────── Animated status donut ─────────── */
export interface DonutSeg { label: string; value: number; color: string; }

export const StatusDonut = ({ data, size = 180 }: { data: DonutSeg[]; size?: number }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 64;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 180 180" className="-rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14" />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const dash = `${len} ${C - len}`;
          const seg = (
            <circle
              key={d.label}
              cx="90" cy="90" r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              style={{
                transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease",
                filter: `drop-shadow(0 0 6px ${d.color}60)`,
                animation: `donut-pulse-${i} 2.4s ease-in-out infinite`,
              }}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold font-mono text-white" style={{ animation: "fade-in 0.4s ease-out" }}>
          {total === 1 && data.length === 0 ? 0 : total}
        </p>
        <p className="text-[9px] uppercase tracking-wider text-white/40 font-sora">transactions</p>
      </div>
      <style>{`
        @keyframes donut-pulse-0 { 0%,100% { opacity: 1; } 50% { opacity: 0.85; } }
        @keyframes donut-pulse-1 { 0%,100% { opacity: 1; } 50% { opacity: 0.85; } }
        @keyframes donut-pulse-2 { 0%,100% { opacity: 1; } 50% { opacity: 0.85; } }
      `}</style>
    </div>
  );
};

/* ─────────── User-growth area line ─────────── */
export const GrowthLine = ({
  data,
  height = 180,
  color = G.primary,
}: {
  data: { day: string; users: number }[];
  height?: number;
  color?: string;
}) => {
  const max = Math.max(...data.map((d) => d.users), 1);
  const W = 600;
  const H = 180;
  const padL = 28;
  const padB = 22;
  const padT = 8;
  const innerW = W - padL - 8;
  const innerH = H - padB - padT;
  const pts = data.map((d, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = padT + innerH - (d.users / max) * innerH;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${padL},${padT + innerH} ${line} ${padL + innerW},${padT + innerH}`;
  const yTicks = [0, 0.5, 1].map((p) => Math.round(p * max));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="growGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => {
        const y = padT + innerH - (v / max) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - 4} y2={y} stroke="rgba(200,149,46,0.06)" strokeDasharray="2 4" />
            <text x={padL - 4} y={y + 3} fill="rgba(255,255,255,0.3)" fontSize={8} textAnchor="end" fontFamily="'JetBrains Mono', monospace">
              {v}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill="url(#growGrad)" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}50)` }}
      />
      {data.map((d, i) => {
        if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
        const x = padL + (i / Math.max(data.length - 1, 1)) * innerW;
        return (
          <text key={d.day + i} x={x} y={H - 6} fill="rgba(255,255,255,0.3)" fontSize={8} textAnchor="middle" fontFamily="Sora">
            {d.day}
          </text>
        );
      })}
    </svg>
  );
};

/* ─────────── Animated horizontal bars ─────────── */
export const HBars = ({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const sharePct = Math.round((d.value / total) * 100);
        return (
          <div key={d.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-sora">
              <span className="text-white/65">{d.label}</span>
              <span className="font-mono text-white/80">
                {d.value.toLocaleString("en-IN")} <span className="text-white/30">· {sharePct}%</span>
              </span>
            </div>
            <div className="h-[6px] rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${d.color}, ${d.color}90)`,
                  boxShadow: `0 0 8px ${d.color}40`,
                  animation: `hbar-grow 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 0.06}s both`,
                  transformOrigin: "left",
                }}
              />
            </div>
          </div>
        );
      })}
      <style>{`@keyframes hbar-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  );
};

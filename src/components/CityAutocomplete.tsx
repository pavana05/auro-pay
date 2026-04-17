import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Check } from "lucide-react";
import { searchCities, type IndiaCity } from "@/lib/india-cities";

interface Props {
  value: IndiaCity | null;
  onChange: (c: IndiaCity | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Searchable Indian-city picker. Returns the full IndiaCity (city + state).
 * Used in ProfileSetup so new signups populate `city` + `state_code` directly.
 */
export const CityAutocomplete = ({ value, onChange, placeholder, autoFocus }: Props) => {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    if (value && value.name !== query) setQuery(value.name);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => searchCities(query, 8), [query]);
  const showList = open && results.length > 0;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (c: IndiaCity) => {
    onChange(c);
    setQuery(c.name);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        className="w-full h-14 rounded-2xl px-4 flex items-center gap-3 transition-all"
        style={{
          background: "hsl(0 0% 100% / 0.04)",
          border: `1.5px solid ${value ? "hsl(42 78% 55% / 0.5)" : "hsl(0 0% 100% / 0.1)"}`,
          boxShadow: value ? "0 0 16px hsl(42 78% 55% / 0.2)" : "none",
        }}
      >
        <MapPin className="w-4 h-4" style={{ color: value ? "hsl(42 90% 70%)" : "hsl(0 0% 100% / 0.4)" }} />
        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          maxLength={60}
          placeholder={placeholder ?? "Search your city"}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
            if (value && e.target.value.toLowerCase() !== value.name.toLowerCase()) {
              onChange(null);
            }
          }}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); pick(results[highlight]); }
            else if (e.key === "Escape") { setOpen(false); }
          }}
          className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-white/30 font-medium"
        />
        {value && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "hsl(42 78% 55% / 0.15)", color: "hsl(42 90% 75%)" }}
          >
            {value.state}
          </span>
        )}
      </div>

      {showList && (
        <div
          className="absolute z-20 left-0 right-0 mt-2 rounded-2xl overflow-hidden"
          style={{
            background: "hsl(220 15% 8% / 0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid hsl(42 78% 55% / 0.25)",
            boxShadow: "0 20px 60px hsl(0 0% 0% / 0.6)",
            animation: "city-list-in 0.18s ease-out",
          }}
        >
          {results.map((c, i) => {
            const active = i === highlight;
            const selected = value?.name === c.name && value.state === c.state;
            return (
              <button
                key={`${c.name}-${c.state}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(c); }}
                onMouseEnter={() => setHighlight(i)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: active ? "hsl(42 78% 55% / 0.12)" : "transparent",
                }}
              >
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0" style={{ background: "hsl(0 0% 100% / 0.06)", color: "hsl(42 90% 70%)" }}>
                  T{c.tier}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-white font-medium truncate font-sora">{c.name}</p>
                  <p className="text-[11px] text-white/50 truncate font-sora">{c.stateName}</p>
                </div>
                {selected && <Check className="w-4 h-4 shrink-0" style={{ color: "hsl(42 90% 70%)" }} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes city-list-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CityAutocomplete;

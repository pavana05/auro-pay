import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Receipt, Search as SearchIcon } from "lucide-react";
import { haptic } from "@/lib/haptics";

export interface SearchContact {
  id: string;
  contact_name: string;
  avatar_emoji?: string | null;
}

export interface SearchTransaction {
  id: string;
  merchant_name?: string | null;
  category?: string | null;
  type: string;
  amount: number;
  created_at: string;
}

interface InlineSearchResultsProps {
  query: string;
  contacts: SearchContact[];
  transactions: SearchTransaction[];
  onPickContact: (c: SearchContact) => void;
  onPickTransaction: (t: SearchTransaction) => void;
  onClose: () => void;
}

const fmt = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

const Highlight = ({ text, q }: { text: string; q: string }) => {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-primary font-bold">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
};

const InlineSearchResults = ({
  query, contacts, transactions, onPickContact, onPickTransaction, onClose,
}: InlineSearchResultsProps) => {
  const q = query.trim().toLowerCase();
  const filteredContacts = useMemo(
    () => (q ? contacts.filter(c => c.contact_name.toLowerCase().includes(q)).slice(0, 5) : []),
    [contacts, q]
  );
  const filteredTx = useMemo(
    () => (q
      ? transactions.filter(t =>
          (t.merchant_name || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q)
        ).slice(0, 6)
      : []),
    [transactions, q]
  );

  // Flat ordered list for keyboard nav
  const flat = useMemo(() => {
    const list: { kind: "contact" | "tx"; idx: number }[] = [];
    filteredContacts.forEach((_, i) => list.push({ kind: "contact", idx: i }));
    filteredTx.forEach((_, i) => list.push({ kind: "tx", idx: i }));
    return list;
  }, [filteredContacts, filteredTx]);

  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setActive(0); }, [q]);

  // Keyboard navigation — listens on window so it works while input has focus
  useEffect(() => {
    if (!q) return;
    const onKey = (e: KeyboardEvent) => {
      if (!flat.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(a => Math.min(flat.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(a => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        const sel = flat[active];
        if (!sel) return;
        e.preventDefault();
        haptic.light();
        if (sel.kind === "contact") onPickContact(filteredContacts[sel.idx]);
        else onPickTransaction(filteredTx[sel.idx]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, flat, active, filteredContacts, filteredTx, onPickContact, onPickTransaction, onClose]);

  // Scroll active row into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!q) return null;

  const empty = !filteredContacts.length && !filteredTx.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="mx-5 mt-2 rounded-[18px] overflow-hidden border border-border/30 backdrop-blur-md"
        style={{
          background: "linear-gradient(180deg, hsl(220 22% 9% / 0.98), hsl(220 25% 6% / 0.98))",
          boxShadow: "0 16px 40px -8px hsl(220 25% 4% / 0.7), 0 0 0 1px hsl(42 78% 55% / 0.08)",
          maxHeight: "60vh",
        }}
      >
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
          {empty && (
            <div className="px-5 py-6 text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center bg-muted/30">
                <SearchIcon className="w-4 h-4 text-muted-foreground/40" />
              </div>
              <p className="text-[12px] font-semibold text-muted-foreground/60 font-sora">No matches for "{query}"</p>
              <p className="text-[10px] text-muted-foreground/30 font-sora mt-0.5">Try a contact name or merchant</p>
            </div>
          )}

          {filteredContacts.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-primary/60" />
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50 font-sora">
                  Contacts · {filteredContacts.length}
                </span>
              </div>
              {filteredContacts.map((c, i) => {
                const flatIdx = i;
                const isActive = active === flatIdx;
                return (
                  <button
                    key={c.id}
                    data-idx={flatIdx}
                    onMouseEnter={() => setActive(flatIdx)}
                    onClick={() => { haptic.light(); onPickContact(c); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition"
                    style={{ background: isActive ? "hsl(42 78% 55% / 0.08)" : "transparent" }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] shrink-0"
                      style={{
                        background: "linear-gradient(135deg, hsl(220 18% 11%), hsl(220 20% 7%))",
                        border: "1px solid hsl(0 0% 100% / 0.06)",
                      }}>
                      {c.avatar_emoji || "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground/90 truncate font-sora">
                        <Highlight text={c.contact_name} q={query} />
                      </p>
                      <p className="text-[9px] text-muted-foreground/40 font-sora">Tap to send money</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {filteredTx.length > 0 && (
            <div className={filteredContacts.length ? "border-t border-border/15 mt-1" : ""}>
              <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                <Receipt className="w-3 h-3 text-primary/60" />
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50 font-sora">
                  Transactions · {filteredTx.length}
                </span>
              </div>
              {filteredTx.map((t, i) => {
                const flatIdx = filteredContacts.length + i;
                const isActive = active === flatIdx;
                return (
                  <button
                    key={t.id}
                    data-idx={flatIdx}
                    onMouseEnter={() => setActive(flatIdx)}
                    onClick={() => { haptic.light(); onPickTransaction(t); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition"
                    style={{ background: isActive ? "hsl(42 78% 55% / 0.08)" : "transparent" }}
                  >
                    <div className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[16px] shrink-0 bg-muted/20 border border-border/10">
                      {t.type === "credit" ? "💰" : "💸"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground/90 truncate font-sora">
                        <Highlight text={t.merchant_name || t.category || "Transaction"} q={query} />
                      </p>
                      <p className="text-[9px] text-muted-foreground/40 capitalize font-sora">
                        {t.category || "other"} · {new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <p className={`text-[12px] font-bold font-mono tabular-nums shrink-0 ${t.type === "credit" ? "text-success" : "text-foreground/85"}`}>
                      {t.type === "credit" ? "+" : "−"}{fmt(t.amount)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {!empty && (
            <div className="px-4 py-2 border-t border-border/15 flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground/40 font-sora">↑↓ navigate · ↵ select · Esc close</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InlineSearchResults;

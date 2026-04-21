import { ShieldCheck, Share2, Database, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
interface Row {
  type: string;
  collected: boolean;
  shared: boolean;
  purpose: string;
  optional?: boolean;
}

const ROWS: Row[] = [
  { type: "Name",                 collected: true, shared: true,  purpose: "Account, KYC (Digio), Payments (Razorpay)" },
  { type: "Email address",        collected: true, shared: true,  purpose: "Account login, Razorpay receipts" },
  { type: "Phone number",         collected: true, shared: true,  purpose: "OTP login, KYC, Razorpay" },
  { type: "Date of birth",        collected: true, shared: true,  purpose: "Age check, KYC (Digio)" },
  { type: "Address (city/state)", collected: true, shared: false, purpose: "State-wise compliance, fraud signals" },
  { type: "Aadhaar / PAN",        collected: true, shared: true,  purpose: "KYC verification via Digio" },
  { type: "Photos (KYC)",         collected: true, shared: true,  purpose: "Liveness check via Digio", optional: true },
  { type: "Wallet balance",       collected: true, shared: false, purpose: "Display & transactions" },
  { type: "Transaction history",  collected: true, shared: true,  purpose: "Razorpay settlement, regulator audits" },
  { type: "UPI ID",               collected: true, shared: true,  purpose: "P2P transfers via Razorpay" },
  { type: "Card details (masked)",collected: true, shared: false, purpose: "Display in-app · we never store full PAN" },
  { type: "Device ID & model",    collected: true, shared: false, purpose: "Security, crash analytics" },
  { type: "IP address",           collected: true, shared: false, purpose: "Fraud prevention, security" },
  { type: "Push notification token", collected: true, shared: false, purpose: "Send transactional notifications" },
  { type: "Crash logs",           collected: true, shared: false, purpose: "App stability", optional: true },
  { type: "Approximate location", collected: false, shared: false, purpose: "Not collected" },
  { type: "Precise GPS location", collected: false, shared: false, purpose: "Not collected" },
  { type: "Contacts",             collected: false, shared: false, purpose: "Not collected" },
  { type: "SMS / Call logs",      collected: false, shared: false, purpose: "Not collected" },
  { type: "Microphone audio",     collected: true,  shared: false, purpose: "Voice notes in chat (only when you record)", optional: true },
  { type: "Browsing history",     collected: false, shared: false, purpose: "Not collected" },
];

const Pill = ({ on, label }: { on: boolean; label: string }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
    style={{
      background: on ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
      color: on ? "#22c55e" : "rgba(255,255,255,0.4)",
      border: `1px solid ${on ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
    }}
  >
    {label}
  </span>
);

const DataSafety = () => {
  const navigate = useNavigate();
  const back = useSafeBack();

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-24 noise-overlay">
      <PageHeader title="Data Safety" fallback="/about" sticky={false} />

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
          <Lock className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Data is encrypted in transit (TLS 1.2+) and at rest. Sensitive PII (Aadhaar, full card)
            is masked by default and admin reveals are logged to an audit trail.
          </p>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
          <Share2 className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Data is shared only with our regulated processors: <b>Digio</b> (KYC) and
            <b> Razorpay</b> (payments). We never sell data to advertisers.
          </p>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
          <Database className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            You can request data export or deletion via in-app Support.
            KYC & transaction records are retained as required by PMLA / RBI rules.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden mb-6">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
          <div>Data type</div>
          <div className="text-center">Collected</div>
          <div className="text-center">Shared</div>
        </div>
        {ROWS.map((r) => (
          <div
            key={r.type}
            className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3 border-b border-border last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {r.type} {r.optional && <span className="text-[10px] text-muted-foreground">· optional</span>}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{r.purpose}</p>
            </div>
            <Pill on={r.collected} label={r.collected ? "Yes" : "No"} />
            <Pill on={r.shared}    label={r.shared ? "Yes" : "No"} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-card border border-border">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <p className="text-[11px] text-muted-foreground">
          For full details see our <a href="/privacy" className="text-primary">Privacy Policy</a> ·
          DPDP Act 2023 compliant.
        </p>
      </div>
    </div>
  );
};

export default DataSafety;

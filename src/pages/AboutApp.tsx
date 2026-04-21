import { Shield, Award, Globe, FileText, ScrollText, UserCheck, ShieldCheck, ChevronRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";

const AboutApp = () => {
  const navigate = useNavigate();
  const back = useSafeBack();

  /**
   * Legal section — links to in-app pages so Play Store reviewers can
   * find the Privacy Policy, Terms, RBI Grievance Officer details, and
   * a Data Safety summary directly from inside the app.
   */
  const legalLinks: Array<{
    icon: typeof FileText;
    title: string;
    desc: string;
    onClick: () => void;
    external?: boolean;
  }> = [
    {
      icon: FileText,
      title: "Privacy Policy",
      desc: "DPDP Act 2023 + RBI compliance · How we handle your data",
      onClick: () => navigate("/privacy"),
    },
    {
      icon: ScrollText,
      title: "Terms of Service",
      desc: "Wallet usage, KYC, fees, parental controls",
      onClick: () => navigate("/terms"),
    },
    {
      icon: UserCheck,
      title: "Grievance Officer",
      desc: "RBI-mandated escalation contact",
      onClick: () => navigate("/privacy#grievance"),
    },
    {
      icon: ShieldCheck,
      title: "Data Safety summary",
      desc: "What data is collected, shared, and why",
      onClick: () => navigate("/data-safety"),
    },
  ];

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <PageHeader title="About AuroPay" sticky={false} />

      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mb-3 shimmer-border">A</div>
        <h2 className="text-lg font-bold gradient-text">AuroPay</h2>
        <p className="text-xs text-muted-foreground">Version 1.0.0</p>
      </div>

      <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
        AuroPay is India's premium digital wallet designed for teens and families.
        Manage your money, set savings goals, and learn financial literacy — all in one beautiful app.
      </p>

      <div className="space-y-3 mb-8">
        {[
          { icon: Shield, title: "Bank-Grade Security", desc: "256-bit encryption with RBI compliance" },
          { icon: Award, title: "Trusted by Families", desc: "Parent controls and spending insights" },
          { icon: Globe, title: "Made in India", desc: "Built for Indian teens and families" },
        ].map(item => (
          <div key={item.title} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border card-glow">
            <item.icon className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─────────── Legal section ─────────── */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 px-1">
          Legal & Compliance
        </p>
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {legalLinks.map((item, idx) => (
            <button
              key={item.title}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors ${
                idx !== legalLinks.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-[10px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
              </div>
              {item.external ? (
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 px-1 leading-relaxed">
          We comply with India's Digital Personal Data Protection Act 2023 and applicable
          RBI directions for prepaid payment instruments. KYC is processed by Digio;
          payments are processed by Razorpay.
        </p>
      </div>

      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>© 2026 [COMPANY_NAME]</p>
        <p>All rights reserved.</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default AboutApp;

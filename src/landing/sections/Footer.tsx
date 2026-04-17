import { Instagram, Twitter, Linkedin, Youtube, ArrowUp, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

type LinkItem = { label: string; href: string; external?: boolean };

const PRODUCT: LinkItem[] = [
  { label: "Features", href: "#features" },
  { label: "Security", href: "#security" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
  { label: "Join Waitlist", href: "#waitlist" },
];

const COMPANY: LinkItem[] = [
  { label: "About", href: "/about" },
  { label: "Help & Support", href: "/help" },
  { label: "Press", href: "mailto:press@auropay.in", external: true },
  { label: "Careers", href: "mailto:careers@auropay.in", external: true },
  { label: "Contact", href: "mailto:hello@auropay.in", external: true },
];

const LEGAL: LinkItem[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Data Safety", href: "/data-safety" },
  { label: "KYC Policy", href: "/privacy" },
];

const SOCIALS = [
  { Icon: Instagram, label: "Instagram", href: "https://instagram.com/auropay" },
  { Icon: Twitter, label: "Twitter / X", href: "https://twitter.com/auropay" },
  { Icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/company/auropay" },
  { Icon: Youtube, label: "YouTube", href: "https://youtube.com/@auropay" },
];

function smoothScrollTo(id: string) {
  const el = document.querySelector(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function FooterLink({ item }: { item: LinkItem }) {
  const cls = "group inline-flex items-center gap-1 text-sm text-white/60 hover:text-amber-200 transition-colors duration-300";
  if (item.href.startsWith("#")) {
    return (
      <button onClick={() => smoothScrollTo(item.href)} className={cls + " text-left"}>
        {item.label}
      </button>
    );
  }
  if (item.external || item.href.startsWith("mailto:") || item.href.startsWith("http")) {
    return (
      <a
        href={item.href}
        target={item.href.startsWith("http") ? "_blank" : undefined}
        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
        className={cls}
      >
        {item.label}
        <ArrowUpRight size={11} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </a>
    );
  }
  return (
    <Link to={item.href} className={cls}>
      {item.label}
    </Link>
  );
}

function FooterCol({ title, items }: { title: string; items: LinkItem[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.28em] text-white/35 font-semibold mb-4">{title}</div>
      <ul className="space-y-2.5">
        {items.map(it => <li key={it.label}><FooterLink item={it} /></li>)}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative px-6 lg:px-12 pt-24 pb-10 overflow-hidden" style={{ background: "#050507" }}>
      {/* Top hairline */}
      <div className="absolute top-0 inset-x-0 lux-hairline" />
      {/* Ambient glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(200,149,46,0.08), transparent 70%)" }} />

      <div className="max-w-7xl mx-auto relative">
        {/* CTA banner */}
        <div className="rounded-3xl p-7 sm:p-8 mb-16 flex flex-col sm:flex-row items-center justify-between gap-5 lux-glass-gold relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: "rgba(200,149,46,0.25)" }} />
          <div className="text-center sm:text-left relative">
            <div className="text-white font-semibold text-lg tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
              Stay updated on our launch.
            </div>
            <div className="text-sm text-white/50 mt-1">No spam, just the good stuff.</div>
          </div>
          <button
            onClick={() => smoothScrollTo("#waitlist")}
            className="relative inline-flex items-center gap-1.5 pl-5 pr-2 h-12 rounded-full font-semibold text-sm text-black lux-shimmer"
            style={{
              background: "linear-gradient(135deg,#c8952e,#e0b048)",
              boxShadow: "0 8px 28px rgba(200,149,46,0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            Join Waitlist
            <span className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.18)" }}>
              <ArrowUpRight size={14} strokeWidth={2.5} />
            </span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-10 mb-14">
          <div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2.5 mb-4"
            >
              <div className="relative w-9 h-9 rounded-xl overflow-hidden"
                style={{
                  background: "conic-gradient(from 220deg, #c8952e, #fff7e3, #c8952e, #8a6520, #c8952e)",
                  boxShadow: "0 0 24px rgba(200,149,46,0.45), inset 0 1px 0 rgba(255,255,255,0.4)",
                }}>
                <div className="absolute inset-[2px] rounded-[10px]"
                  style={{ background: "linear-gradient(135deg,#1a1206,#0a0c0f)" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[13px] font-black lux-text-gold" style={{ fontFamily: "Sora, sans-serif" }}>A</span>
                </div>
              </div>
              <span className="text-white font-semibold text-lg tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>AuroPay</span>
            </button>
            <p className="text-sm text-white/50 max-w-xs mb-5" style={{ lineHeight: 1.65 }}>
              India's first scan-and-pay app for teens. Aadhaar-only sign-up. Built with care in Bengaluru.
            </p>
            <div className="flex gap-2">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/55 hover:text-amber-200 transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Product" items={PRODUCT} />
          <FooterCol title="Company" items={COMPANY} />
          <FooterCol title="Legal" items={LEGAL} />
        </div>

        <div className="lux-hairline mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <div>© 2025 AuroPay. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>Made with <span style={{ color: "#e0b048" }}>♥</span> in Bengaluru, India</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:text-white transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ArrowUp size={11} /> Top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

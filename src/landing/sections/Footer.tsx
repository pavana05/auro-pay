import { Instagram, Twitter, Linkedin, Youtube, ArrowUp } from "lucide-react";
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
  const cls = "text-sm text-white/70 hover:text-white transition";
  if (item.href.startsWith("#")) {
    return (
      <button
        onClick={() => smoothScrollTo(item.href)}
        className={cls + " text-left"}
      >
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
      <div className="text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-3">{title}</div>
      <ul className="space-y-2">
        {items.map(it => (
          <li key={it.label}><FooterLink item={it} /></li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative px-6 lg:px-12 pt-20 pb-10 border-t" style={{ background: "#050507", borderColor: "rgba(200,149,46,0.12)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl p-6 mb-12 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ background: "rgba(200,149,46,0.06)", border: "1px solid rgba(200,149,46,0.18)" }}>
          <div className="text-center sm:text-left">
            <div className="text-white font-semibold">Stay updated on our launch.</div>
            <div className="text-xs text-white/50">No spam, just the good stuff.</div>
          </div>
          <button
            onClick={() => smoothScrollTo("#waitlist")}
            className="px-5 h-11 rounded-lg font-semibold text-sm text-black"
            style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}
          >
            Join Waitlist
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 mb-3"
            >
              <div className="w-8 h-8 rounded-xl" style={{ background: "linear-gradient(135deg,#c8952e,#8a6520)" }} />
              <span className="text-white font-bold text-lg">AuroPay</span>
            </button>
            <p className="text-sm text-white/50 max-w-xs mb-4">India's first scan-and-pay app for teens. Aadhaar-only sign-up.</p>
            <div className="flex gap-3">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-amber-300 transition border"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
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

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <div>© 2025 AuroPay. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>Made with <span style={{ color: "#c8952e" }}>❤️</span> in Bengaluru, India</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full hover:text-white transition border"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            >
              <ArrowUp size={11} /> Top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

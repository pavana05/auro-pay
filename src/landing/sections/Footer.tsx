import { Instagram, Twitter, Linkedin, Youtube } from "lucide-react";

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
          <form className="flex gap-2 w-full sm:w-auto" onSubmit={(e) => e.preventDefault()}>
            <input placeholder="you@email.com"
              className="flex-1 sm:w-64 h-11 px-4 rounded-lg text-sm text-white outline-none border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }} />
            <button className="px-4 h-11 rounded-lg font-semibold text-sm text-black"
              style={{ background: "linear-gradient(135deg,#c8952e,#e0b048)" }}>Notify Me</button>
          </form>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl" style={{ background: "linear-gradient(135deg,#c8952e,#8a6520)" }} />
              <span className="text-white font-bold text-lg">AuroPay</span>
            </div>
            <p className="text-sm text-white/50 max-w-xs mb-4">India's first scan-and-pay app for teens. Aadhaar-only sign-up.</p>
            <div className="flex gap-3">
              {[Instagram, Twitter, Linkedin, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-amber-300 transition border"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Product" items={["Features", "Security", "For Teens", "For Parents", "Pricing"]} />
          <FooterCol title="Company" items={["About", "Blog", "Careers", "Press", "Contact"]} />
          <FooterCol title="Legal" items={["Privacy Policy", "Terms of Service", "KYC Policy", "Refund Policy"]} />
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <div>© 2025 AuroPay. All rights reserved.</div>
          <div>Made with <span style={{ color: "#c8952e" }}>♥</span> in Mysuru, India</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-3">{title}</div>
      <ul className="space-y-2">
        {items.map(it => (
          <li key={it}><a href="#" className="text-sm text-white/70 hover:text-white transition">{it}</a></li>
        ))}
      </ul>
    </div>
  );
}

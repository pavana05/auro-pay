import { ArrowLeft, Shield, Award, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const AboutApp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold">About AuroPay</h1>
      </div>

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

      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>© 2026 AuroPay Technologies Pvt. Ltd.</p>
        <p>All rights reserved.</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default AboutApp;

import { CreditCard, QrCode } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

const CardScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background noise-overlay flex flex-col px-4 pt-6 pb-24">
      <h1 className="text-[22px] font-semibold mb-8">My Card</h1>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CreditCard className="w-14 h-14 text-primary" />
        </div>

        <h2 className="text-xl font-semibold mb-2">Coming Soon!</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-8">
          Virtual & physical cards are on the way. For now, you can use <span className="text-primary font-medium">Scan & Pay</span> to make payments instantly.
        </p>

        <button
          onClick={() => navigate("/scan")}
          className="h-12 px-8 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <QrCode className="w-4 h-4" /> Scan & Pay
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default CardScreen;

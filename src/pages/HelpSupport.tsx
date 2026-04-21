import { useState } from "react";
import { ArrowLeft, MessageCircle, Mail, Phone, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSafeBack } from "@/lib/safe-back";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const faqs = [
  { q: "How do I add money to my wallet?", a: "Go to Home → Add Money. You can add money via UPI, net banking, or ask your linked parent to transfer." },
  { q: "How do I set a savings goal?", a: "Navigate to Profile → Savings Goals → tap the + button to create a new goal with a name, target amount, and optional deadline." },
  { q: "What is KYC and why is it needed?", a: "KYC (Know Your Customer) is a verification process required by RBI. It ensures your account is secure and compliant with regulations." },
  { q: "How do I link a parent account?", a: "Your parent needs to sign up as a parent on AuroPay and add your phone number or username to link accounts." },
  { q: "Can I set spending limits?", a: "Yes! Go to Profile → Spending Limits to set daily and monthly spending caps for your wallet." },
  { q: "How do I change my PIN?", a: "Go to Profile → Security & PIN → enter your current PIN and set a new 4-digit PIN." },
  { q: "Is my money safe?", a: "Yes, AuroPay uses bank-grade encryption and is regulated by RBI guidelines. Your funds are held in a secure escrow account." },
];

const HelpSupport = () => {
  const navigate = useNavigate();
  const back = useSafeBack();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) { toast.error("Please fill in all fields"); return; }
    setSending(true);
    setTimeout(() => {
      toast.success("Support ticket submitted! We'll get back to you within 24 hours.");
      setSubject("");
      setMessage("");
      setSending(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background noise-overlay px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => back()} className="w-10 h-10 rounded-full bg-input flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold">Help & Support</h1>
      </div>

      {/* Quick Contact */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <button onClick={() => toast.info("Chat support coming soon")} className="p-4 rounded-xl bg-card border border-border card-glow flex flex-col items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="text-xs">Live Chat</span>
        </button>
        <a href="mailto:support@auropay.in" className="p-4 rounded-xl bg-card border border-border card-glow flex flex-col items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <span className="text-xs">Email</span>
        </a>
        <a href="tel:+911800123456" className="p-4 rounded-xl bg-card border border-border card-glow flex flex-col items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          <span className="text-xs">Call Us</span>
        </a>
      </div>

      {/* FAQs */}
      <h2 className="text-sm font-semibold mb-3">Frequently Asked Questions</h2>
      <div className="space-y-2 mb-8">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-xl bg-card border border-border card-glow overflow-hidden">
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
              <span className="text-sm font-medium pr-4">{faq.q}</span>
              {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>
            {openFaq === i && (
              <div className="px-4 pb-4 text-sm text-muted-foreground animate-fade-in-up">{faq.a}</div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <h2 className="text-sm font-semibold mb-3">Submit a Ticket</h2>
      <div className="rounded-xl bg-card border border-border card-glow p-4 space-y-3">
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="input-auro w-full" />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue..." className="input-auro w-full min-h-[100px] py-3 resize-none" />
        <button onClick={handleSubmit} disabled={sending} className="w-full h-11 rounded-pill gradient-primary text-primary-foreground font-semibold text-sm">
          {sending ? "Sending..." : "Submit Ticket"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default HelpSupport;

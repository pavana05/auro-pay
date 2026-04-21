import { ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useSafeBack } from "@/lib/safe-back";
import PageHeader from "@/components/PageHeader";
const Terms = () => {
  const navigate = useNavigate();
  const back = useSafeBack();

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-24 noise-overlay">
      <PageHeader title="Terms of Service" fallback="/about" sticky={false} />

      <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl bg-card border border-border">
        <ScrollText className="w-4 h-4 text-primary" />
        <p className="text-[11px] text-muted-foreground">
          Governing law: India · Jurisdiction: courts at <b>Bengaluru</b>
        </p>
      </div>

      <article className="prose prose-invert max-w-none text-sm leading-relaxed space-y-5 text-muted-foreground">
        <p className="text-xs">
          <b>Effective date:</b> 2026-04-17 · <b>Last updated:</b> 2026-04-17
        </p>

        <section>
          <h2 className="text-base font-semibold text-foreground">1. Acceptance of terms</h2>
          <p>
            These Terms of Service ("Terms") form a legally binding agreement between you
            and <b>Auro Technologies Pvt. Ltd.</b> ("AuroPay", "we") governing your use of the AuroPay
            mobile and web applications and any associated services (the "Service").
            By creating an account or using the Service, you agree to these Terms and to
            our <a href="/privacy" className="text-primary">Privacy Policy</a>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Eligibility</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>You must be at least 13 years old to use a teen account, with verifiable parental consent.</li>
            <li>Adults (parents) must be 18+ and Indian residents.</li>
            <li>You must complete KYC as required for prepaid payment instruments under RBI regulations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Account & KYC</h2>
          <p>
            You agree to provide accurate, current, and complete information. KYC is performed
            by our partner <b>Digio</b> using Aadhaar-based eKYC and PAN verification. We may
            limit or freeze your account if information is incomplete, suspected to be false,
            or if regulatory directives require us to do so.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Wallet usage & limits</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>The wallet is a closed-system PPI operated under applicable RBI master directions.</li>
            <li>Per-wallet limits, daily limits, and monthly limits apply and may change with regulatory updates.</li>
            <li>Wallet balance does not earn interest.</li>
            <li>Payments are processed via <b>Razorpay</b>; settlement is subject to their terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Prohibited use</h2>
          <p>You must not use the Service for: money laundering, terrorist financing, gambling, illegal goods/services, harassment, attempting to bypass KYC or limits, or any activity prohibited by Indian law.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Fees</h2>
          <p>
            Standard wallet usage is free. Specific value-added services may carry fees, which
            will be disclosed in-app before you authorise the transaction. Bank/UPI/card
            processor fees may apply per their terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Refunds & chargebacks</h2>
          <p>
            Failed top-ups are auto-reversed within 5 business days. Disputed transactions
            should be raised via in-app Support within 30 days. We follow RBI's Harmonisation
            of Turn Around Time (TAT) framework for resolution.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Suspension & termination</h2>
          <p>
            We may suspend or terminate your account for breach of these Terms, regulatory
            non-compliance, fraud, or prolonged inactivity. You may close your account at any
            time via in-app Support; KYC and transaction records will be retained as required
            by law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Parental controls</h2>
          <p>
            Parents linked to a teen account can set spending limits, freeze cards, approve
            chores, and view transaction history of the linked teen. By linking, the teen
            consents to such oversight.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">10. Disclaimers</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. To the maximum
            extent permitted by law, we disclaim all implied warranties of merchantability,
            fitness for a particular purpose, and non-infringement.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">11. Limitation of liability</h2>
          <p>
            Our aggregate liability arising out of or in connection with the Service is
            limited to the lesser of (a) the total fees paid by you to us in the preceding
            6 months, or (b) ₹10,000.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">12. Governing law & dispute resolution</h2>
          <p>
            These Terms are governed by the laws of India. Any dispute will first be referred
            to our Grievance Officer (see Privacy Policy §10), then to arbitration in
            <b> Bengaluru</b> under the Arbitration and Conciliation Act, 1996,
            and finally to the exclusive jurisdiction of the courts at <b>Bengaluru</b>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">13. Changes to these Terms</h2>
          <p>
            We may amend these Terms from time to time. Material changes will be notified
            in-app at least 7 days before they take effect. Continued use after the effective
            date constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">14. Contact</h2>
          <p>
            <b>Auro Technologies Pvt. Ltd.</b>, <b>3CR5+736, Sadashiva Nagara, Nelamangala Town, Nagarur, Karnataka 562123</b><br />
            Grievance Officer: <a className="text-primary" href="mailto:pavana25t@gmail.com">pavana25t@gmail.com</a> · +91 90360 48950
          </p>
        </section>
      </article>
    </div>
  );
};

export default Terms;

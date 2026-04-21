import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useSafeBack } from "@/lib/safe-back";
/**
 * Starter privacy policy covering:
 *   - India DPDP Act 2023 (Digital Personal Data Protection)
 *   - RBI PPI / wallet guidelines basics
 *   - KYC processor: Digio (Aadhaar / PAN)
 *   - Payment processor: Razorpay
 *
 * Replace [BRACKETED] tokens before public launch.
 */
const Privacy = () => {
  const navigate = useNavigate();
  const back = useSafeBack();

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-24 noise-overlay">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => back()}
          className="w-10 h-10 rounded-full bg-input flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-semibold">Privacy Policy</h1>
      </div>

      <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl bg-card border border-border">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <p className="text-[11px] text-muted-foreground">
          Compliant with India's <b>DPDP Act 2023</b> & <b>RBI PPI guidelines</b>
        </p>
      </div>

      <article className="prose prose-invert max-w-none text-sm leading-relaxed space-y-5 text-muted-foreground">
        <p className="text-xs">
          <b>Effective date:</b> 2026-04-17 · <b>Last updated:</b> 2026-04-17
        </p>

        <section>
          <h2 className="text-base font-semibold text-foreground">1. Who we are</h2>
          <p>
            This Privacy Policy describes how <b>Auro Technologies Pvt. Ltd.</b>
            (operating the AuroPay app, "<b>AuroPay</b>", "we", "us") — a company
            incorporated in India with registered office at <b>3CR5+736, Sadashiva Nagara, Nelamangala Town, Nagarur, Karnataka 562123</b>
            — collects, uses, shares, and protects your personal data when you use
            our mobile and web applications (the "Service").
          </p>
          <p>
            For the purposes of the Digital Personal Data Protection Act, 2023
            ("DPDP Act"), AuroPay is the <b>Data Fiduciary</b> for the personal
            data collected through the Service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Data we collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><b>Identity:</b> full name, date of birth, profile photo.</li>
            <li><b>Contact:</b> phone number, email address, city, state.</li>
            <li><b>KYC:</b> Aadhaar number, PAN, KYC selfie/video, Aadhaar XML/eKYC payload (collected via our KYC partner Digio).</li>
            <li><b>Financial:</b> wallet balance, transaction history, UPI ID, masked card details, recurring payment configuration.</li>
            <li><b>Device & usage:</b> device model, OS, app version, IP address, crash logs, push notification token, in-app activity timestamps.</li>
            <li><b>Communications:</b> support tickets and chat messages with our team.</li>
            <li><b>Family graph (where applicable):</b> parent ↔ teen links, spending limits, chore approvals.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. How we use your data</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To create and operate your wallet account.</li>
            <li>To complete KYC as required by RBI for prepaid payment instruments.</li>
            <li>To process payments, top-ups, and P2P transfers.</li>
            <li>To detect fraud and unusual transaction patterns (rule-based, e.g. ≥3× spending outliers).</li>
            <li>To send transactional notifications (login, payment, KYC, security).</li>
            <li>To provide parental oversight features for linked teen accounts.</li>
            <li>To respond to support requests and grievances.</li>
            <li>To comply with applicable laws, regulator requests, and audits.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Legal basis (DPDP Act 2023)</h2>
          <p>
            We process your personal data on the basis of (a) your <b>consent</b>
            (e.g. KYC, marketing notifications), and (b) <b>certain legitimate uses</b>
            permitted under Section 7 of the DPDP Act including the performance of
            our service contract with you, regulatory compliance, fraud prevention,
            and responding to medical emergencies.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Data sharing — third parties</h2>
          <p>We share data with the following Data Processors strictly for the purposes listed:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <b>Digio (Digio Software Solutions Pvt. Ltd.)</b> — KYC verification,
              Aadhaar XML/eKYC, PAN verification, digital signature workflows.
              Data shared: name, DOB, Aadhaar number, PAN, mobile, email, selfie/video.
              Privacy policy: <a className="text-primary" href="https://www.digio.in/privacy-policy.html" target="_blank" rel="noreferrer">digio.in/privacy-policy</a>.
            </li>
            <li>
              <b>Razorpay (Razorpay Software Pvt. Ltd.)</b> — payment gateway for wallet
              top-ups, refunds, and bank settlement. Data shared: name, email, phone, amount,
              UPI/card metadata, transaction reference.
              Privacy policy: <a className="text-primary" href="https://razorpay.com/privacy/" target="_blank" rel="noreferrer">razorpay.com/privacy</a>.
            </li>
            <li>
              <b>Cloud infrastructure & analytics</b> — hosting, database, push notifications,
              and crash analytics provided by sub-processors located in India and the EU.
            </li>
            <li>
              <b>Regulators & law enforcement</b> — disclosure where required by law,
              court order, or RBI/FIU-IND directive.
            </li>
          </ul>
          <p>We <b>do not</b> sell your personal data to advertisers or third parties.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Data retention</h2>
          <p>
            KYC records are retained for <b>at least 5 years</b> after account closure as
            mandated by the Prevention of Money-Laundering Act, 2002 and RBI master
            directions. Transaction records are retained for <b>at least 8 years</b>.
            Other personal data is retained only for as long as necessary for the
            stated purpose, then erased or anonymised.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Security</h2>
          <p>
            We implement reasonable security safeguards including TLS 1.2+ in transit,
            encryption at rest, role-based access, audit logging of admin actions, and
            PIN-gated reveal for sensitive PII. However, no system is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Your rights as a Data Principal</h2>
          <p>Under the DPDP Act 2023, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Access a summary of your personal data we process.</li>
            <li>Correct or update inaccurate or incomplete data.</li>
            <li>Erase your data, subject to legal retention obligations.</li>
            <li>Withdraw consent at any time (may limit functionality).</li>
            <li>Nominate another individual to exercise your rights in case of death or incapacity.</li>
            <li>Lodge a grievance with our Grievance Officer (see Section 10).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Children & teens</h2>
          <p>
            Teen accounts (users under 18) require verifiable parental consent obtained
            via the linked parent's verified mobile number, in line with Section 9 of the
            DPDP Act. We do not run behavioural advertising or tracking targeted at children.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">10. Grievance Officer (DPDP Act + RBI)</h2>
          <div className="rounded-xl border border-border bg-card p-4 text-foreground space-y-1 text-sm">
            <p><b>Name:</b> Pavan A</p>
            <p><b>Designation:</b> Data Protection & Grievance Officer</p>
            <p><b>Email:</b> <a className="text-primary" href="mailto:pavana25t@gmail.com">pavana25t@gmail.com</a></p>
            <p><b>Phone:</b> +91 90360 48950</p>
            <p><b>Address:</b> 3CR5+736, Sadashiva Nagara, Nelamangala Town, Nagarur, Karnataka 562123</p>
            <p className="text-xs text-muted-foreground pt-2">
              We acknowledge complaints within 48 hours and resolve within 30 days as
              required by RBI's Customer Grievance Redressal framework.
            </p>
          </div>
          <p className="mt-3">
            If unresolved, you may escalate to the RBI Ombudsman for Digital Transactions
            via <a className="text-primary" href="https://cms.rbi.org.in" target="_blank" rel="noreferrer">cms.rbi.org.in</a>,
            or to the Data Protection Board of India once constituted under the DPDP Act.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">11. Changes to this policy</h2>
          <p>
            We will notify you of material changes via in-app notification and/or email at
            least 7 days before they take effect.
          </p>
        </section>
      </article>
    </div>
  );
};

export default Privacy;

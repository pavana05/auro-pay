# 🚀 AuroPay — Google Play Store Listing Checklist

Complete every item below before clicking **"Send for review"** in Play Console.
Items marked **🔴 Required** will block submission. **🟡 Recommended** strengthens the listing.

---

## 1. App Identity 🔴

| Item | Spec | Status |
|---|---|---|
| **App name** | `AuroPay` (max 30 chars) | ☐ |
| **Package name** | `app.lovable.cbd25e4a769a42d6835afcaa159bbcc4` (matches `capacitor.config.ts`) | ☐ |
| **Default language** | English (India) — `en-IN` | ☐ |
| **App category** | Finance | ☐ |
| **Tags** (up to 5) | Banking, Budgeting, Family, Teens, UPI | ☐ |
| **Contact email** | support@auropay.app *(create before submission)* | ☐ |
| **Website URL** | https://auro-pay.lovable.app | ☐ |
| **Phone (optional)** | India support number | ☐ |

---

## 2. Store Listing Copy 🔴

### Short description (max 80 chars)
> India's premium pocket-money & UPI app for teens, with full parent controls.

### Full description (max 4000 chars)
Draft in `store-listing/full-description.md`. Must include:
- ☐ What the app does (1 paragraph)
- ☐ Key features (bullet list — UPI pay, savings goals, parent controls, KYC, rewards)
- ☐ Who it's for (teens 13–19 + parents)
- ☐ Safety/security messaging (RBI-compliant KYC, parent oversight)
- ☐ Support contact line
- ☐ No keyword stuffing — Google rejects spammy descriptions

---

## 3. Graphic Assets 🔴

> All images **PNG or JPEG, no alpha on feature graphic, sRGB color space.**

| Asset | Dimensions | Count | Notes | Status |
|---|---|---|---|---|
| **App icon** | 512 × 512 px | 1 | 32-bit PNG with alpha. Will be auto-rounded by Play. Source: `src/assets/` | ☐ |
| **Feature graphic** | 1024 × 500 px | 1 | JPEG/PNG, no alpha. Shows on top of listing. **No important text in outer 100 px** (gets cropped on tablets) | ☐ |
| **Phone screenshots** | 1080 × 1920 px (9:16) | min 2, max 8 | Portrait. Recommended: 4–6 highlighting Splash → Home → Pay → Parent View → Rewards | ☐ |
| **7-inch tablet** | 1200 × 1920 px | optional | Skip — app is phone-first | — |
| **10-inch tablet** | 1600 × 2560 px | optional | Skip | — |
| **Promo video** | YouTube URL | 1 | 30 sec demo, optional but boosts CTR ~25% | 🟡 |

**Screenshot ideas (8 max):**
1. Hero — splash + tagline overlay
2. Home — wallet balance + quick actions
3. Scan & Pay — QR scanner UI
4. Savings Goals — gamified progress bars
5. Parent Dashboard — teen oversight
6. Rewards — scratch cards + spin wheel
7. Card screen — virtual debit card
8. Chats — pay-by-message

> Tip: Add device frame and 1-line caption per screenshot using a tool like [Previewed](https://previewed.app) or Figma.

---

## 4. Content Rating 🔴

Complete IARC questionnaire in Play Console → Policy → App content → Content rating.

**Expected rating for AuroPay: PEGI 3 / ESRB Everyone / India: U**

Answer profile:
- Violence: **None**
- Sexuality: **None**
- Profanity: **None**
- Controlled substances: **None**
- Gambling: **None** *(spin wheel = rewards loyalty, not real-money gambling — confirm wording)*
- User-generated content: **Yes** (chat messages between linked users) → must show in-app reporting & blocking
- Shares user location: **No** (unless you add geo features later)
- Digital purchases: **Yes** (UPI top-ups via Razorpay)
- Personal info collection: **Yes** (KYC — Aadhaar)
- Web browsing: **No**

☐ Submitted IARC questionnaire
☐ Received certificate (auto-issued, usually instant)

---

## 5. Target Audience & Children 🔴

Since teens (13–17) are a target audience:

- ☐ **Target age groups**: 13–15, 16–17, 18+
- ☐ Confirm app **does NOT appeal primarily to children under 13** (otherwise triggers Google Designed for Families program with stricter rules)
- ☐ If 13–17 selected: ads must be policy-compliant; no behavioral ads to minors
- ☐ Provide **separate parental consent flow** documentation (link to in-app parent linking)

---

## 6. Data Safety Form 🔴

Play Console → App content → Data safety. List **every** data type collected:

| Data type | Collected | Shared | Optional? | Purpose |
|---|---|---|---|---|
| Name | ✅ | ❌ | No | Account, KYC |
| Email address | ✅ | ❌ | No | Account, communication |
| Phone number | ✅ | ❌ | No | Account, OTP |
| User ID | ✅ | ❌ | No | Account |
| Government ID (Aadhaar) | ✅ | Shared with Digio (KYC vendor) | No | Compliance |
| Photos (avatar) | ✅ | ❌ | Yes | Profile |
| Voice messages | ✅ | ❌ | Yes | In-app chat |
| Payment info | ✅ | Shared with Razorpay | No | Process payments |
| App interactions | ✅ | ❌ | No | Analytics |
| Crash logs | ✅ | ❌ | No | Diagnostics |
| Approximate location | ❌ | — | — | — |
| Precise location | ❌ | — | — | — |

Security practices:
- ☐ Data encrypted in transit (HTTPS) — ✅ via Supabase
- ☐ Data encrypted at rest — ✅ via Supabase
- ☐ Users can request data deletion → wired to `delete-user` edge function
- ☐ Independent security review *(optional, premium signal)*

---

## 7. Privacy Policy URL 🔴

**Required** for any app collecting personal data (AuroPay collects KYC + payments).

- ☐ Hosted at a public, **non-redirecting**, persistent URL (e.g., `https://auro-pay.lovable.app/privacy`)
- ☐ Contains: data collected, purpose, retention, third parties (Razorpay, Digio, Supabase), user rights, contact email, last-updated date
- ☐ Mentions Indian DPDP Act 2023 + RBI compliance
- ☐ Separate **Terms of Service** at `/terms`
- ☐ Both pages linked from in-app **About** screen (already exists at `/about`)

> ⚠️ Apps targeting teens MUST link the policy here AND inside the app.

---

## 8. Permissions Justification 🔴

For each declared permission, prepare a 1-line justification:

| Permission (in `AndroidManifest.xml`) | Why we need it |
|---|---|
| `INTERNET` | API calls to Supabase + Razorpay |
| `CAMERA` | Scan UPI QR codes (`/scan` page) |
| `VIBRATE` | Haptic feedback on transactions |
| `RECORD_AUDIO` | Voice messages in chat |
| `POST_NOTIFICATIONS` | Payment alerts, parent approvals |
| `READ_EXTERNAL_STORAGE` *(if used)* | Upload avatar / chore proof images |

☐ Filed declarations in **Play Console → App content → Sensitive permissions**

---

## 9. Financial App Compliance 🔴 *(India)*

Play Store has extra requirements for finance apps in India:

- ☐ **Personal Loan App declaration** — N/A (we're not a lender) → answer "No"
- ☐ Confirm **RBI authorization** for any wallet/PPI operations OR clearly disclose that AuroPay routes via licensed partner (Razorpay)
- ☐ Upload **business registration certificate** (Certificate of Incorporation)
- ☐ Provide **registered office address** in India
- ☐ Name the financial services partner(s) in the listing description

---

## 10. App Access (Test Credentials) 🔴

Reviewers need a working account to test:

- ☐ Test phone number + OTP bypass *(create a Supabase test user)*
- ☐ Pre-funded wallet for test account
- ☐ Test parent account linked to test teen
- ☐ Instructions document: how to log in, what to test
- ☐ Submit in **App content → App access**

---

## 11. Ads Declaration 🔴

- AuroPay shows **no ads** → declare "No" in **App content → Ads**

---

## 12. Release Build (AAB) 🔴

| Item | Value |
|---|---|
| **Format** | Android App Bundle (`.aab`), NOT APK |
| **Min SDK** | 24 (Android 7.0) — Capacitor default |
| **Target SDK** | 35 (Android 15) — required since Aug 31, 2025 for new apps |
| **Signing** | Play App Signing (upload key managed by Google after first upload) |
| **64-bit ABI** | ✅ included by default |
| **Initial track** | Internal testing → Closed → Open → Production |

☐ AAB built and signed (use the new GitHub Actions workflow at `.github/workflows/release-aab.yml`)
☐ Tested on real device via Internal Testing track

---

## 13. Pre-Launch Report 🟡

Auto-runs on first AAB upload. Wait ~2 hours, then check:

- ☐ No crashes on any of Google's test devices
- ☐ No accessibility issues (color contrast, touch targets)
- ☐ No security vulnerabilities flagged
- ☐ All deep links (`auro-pay.lovable.app/...`) resolve

---

## 14. Pricing & Distribution 🔴

- **Price:** Free
- **Countries:** Start with India only → expand later
- **Devices:** Phones only (uncheck tablets, Wear, Auto, TV unless tested)
- **Contains ads:** No
- **In-app purchases:** **Yes** (UPI top-ups — declare them as such, NOT as Google Play Billing)

☐ Reviewed Distribution agreement
☐ Confirmed Play Store policies (Restricted Financial Products, Personal & Sensitive Info, User Data)

---

## 15. Final Pre-Submit Smoke Test ✅

Run on a real Android device installed via Internal Testing:

- [ ] Splash → Onboarding → Auth → Home (no crashes)
- [ ] Scan QR → confirm pay → wallet debits
- [ ] KYC flow — opens Digio, returns to app
- [ ] Parent links to teen, sets allowance, sends pocket money
- [ ] Chat between two test accounts (text + voice + payment)
- [ ] Push notifications received
- [ ] Deep link `https://auro-pay.lovable.app/home` opens app (not browser)
- [ ] Sign out → sign back in
- [ ] Account deletion works (`/personal-info` → delete)

---

## 📂 Recommended folder layout

```
store-listing/
├── icon-512.png
├── feature-graphic-1024x500.png
├── screenshots/
│   ├── 01-home.png
│   ├── 02-pay.png
│   └── ...
├── full-description.md
├── short-description.txt
├── privacy-policy.md      → publish to /privacy
├── terms-of-service.md    → publish to /terms
└── reviewer-instructions.md
```

---

**Estimated time to complete: 6–10 hours of focused work** (excluding asset design).

Once everything above is checked, hit **"Send for review"** — Google typically responds within 1–7 days.

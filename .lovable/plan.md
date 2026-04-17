

## Plan

Six focused changes to harden the payment flow + fix the centering bug + add post-signup PIN setup.

### 1. Fix processing animation centering (the bug you saw)
**File**: `src/pages/PaymentConfirm.tsx` (processing stage, ~line 445)
The expanding rings use `position: absolute` with no `top/left`, so they anchor to the parent's top-left instead of center. Add `top: "50%"`, `left: "50%"`, and `marginTop/Left: -40` (or `transform: translate(-50%,-50%)` baked into the keyframe) so rings expand from the icon center. Also wrap the inner block in a parent that uses `place-items: center` reliably.

### 2. Wrap `/pay` in ErrorBoundary
**File**: `src/App.tsx`
Import existing `src/components/ErrorBoundary.tsx` and wrap the `<PaymentConfirm />` route element. On error, the boundary's retry card already shows a recoverable UI instead of a blank screen.

### 3. Structured PIN_NOT_SET response from edge function
**File**: `supabase/functions/process-scan-payment/index.ts`
Already returns `{ success: false, code: "PIN_NOT_SET" }` with status 200 (per last turn). Confirm the `error` field is removed/renamed so `supabase.functions.invoke` doesn't treat it as failure. Frontend `PaymentConfirm.tsx` already detects `data.code === "PIN_NOT_SET"`. Add the same detection to any other call site (none others currently invoke this fn).

### 4. Force PIN setup right after signup + KYC
**File**: `src/pages/Index.tsx` + new tiny inline gate
After `navigateByRole`, before routing teen/parent home, check `payment-pin` `status`. If `is_set === false` AND `kyc_status === "verified"`, navigate to `/security` with a `?setup=1` query param. 
**File**: `src/pages/SecurityPin.tsx` — when `?setup=1` is present, show a one-time fullscreen "Create Payment PIN" card (reuse the existing PIN setup UI from `PaymentConfirm.tsx`'s setup stage, extracted into a tiny shared component or duplicated minimally) and after success, redirect back to `/home` or `/parent`.

Simplest version: just toast + auto-scroll to the PIN section on `/security`, and block back-nav until set.

### 5. Verify QuickPay amount renders solid gold
**File**: `src/pages/QuickPay.tsx` (line ~770)
There's still one `WebkitBackgroundClip: "text"` for the success amount overlay. Replace with solid `color: "hsl(152 60% 65%)"`. Verify the main amount input already uses solid color (it does per last fix).

### 6. End-to-end QA pass (manual via preview)
- `/scan` → enter UPI + amount → `/pay` → if no PIN, see Create PIN screen → set PIN → continue → processing animation centered → success.
- `/quick-pay` → pick contact → enter amount (verify gold digits visible) → `/pay` → PIN → success.
- Sign up new user → complete KYC → land on PIN setup before home.
- Trigger an error (invalid UPI) → ErrorBoundary card shows, Retry works.

### Files touched
- `src/pages/PaymentConfirm.tsx` — center the processing rings
- `src/App.tsx` — wrap `/pay` route in ErrorBoundary
- `src/pages/Index.tsx` — post-auth PIN-required check
- `src/pages/SecurityPin.tsx` — handle `?setup=1` mode
- `src/pages/QuickPay.tsx` — kill remaining gradient-text on success amount
- `supabase/functions/process-scan-payment/index.ts` — confirm structured response shape

No DB migrations needed.




# Enhancement Plan: Premium UI, Referral Deep Links, Spin Wheel Credits

## 1. Quick Actions Grid — Ultra-Premium Glassmorphism
**File**: `src/pages/TeenHome.tsx` (lines ~338-362)

Wrap the quick actions grid in a glassmorphism container matching the balance card style:
- Add a rounded-[24px] wrapper with mesh gradient background, top-edge shimmer highlight, noise overlay
- Each action button gets subtle backdrop-blur and hover glow orb reveals
- Add inner border glow on the container

## 2. Recent Activity Section — Ultra-Premium Glassmorphism  
**File**: `src/pages/TeenHome.tsx` (lines ~675-728)

The transactions list already has a gradient card wrapper (line 695). Enhance it:
- Add mesh gradient with gold radial glow accent
- Add top-edge shimmer line (already partially there at line 699 but uses `absolute` without `relative` parent — fix this)
- Add a subtle noise overlay layer inside the card
- Each transaction row gets hover glow feedback

## 3. Referral Deep Link — Real Share with Auto-Apply
**File**: `src/pages/Referrals.tsx` — already has working share logic with `navigator.share` and deep link generation (line 79). The `AuthScreen.tsx` already captures `?ref=` param and creates referral records.

**Fix needed on TeenHome.tsx** (line 730-758): The "Refer & Earn" card uses a generic share text without the actual referral code/deep link. Update it to:
- Fetch the user's referral code (`AURO${userId.substring(0,6).toUpperCase()}`)
- Share the proper deep link URL `https://auro-pay.lovable.app?ref=CODE`

## 4. Spin Wheel — Credit Coins to Wallet + Premium UI
**File**: `src/pages/SpinWheel.tsx`

Current issues:
- Coins are never actually credited to the database — just a toast message
- UI is basic compared to the premium aesthetic

Changes:
- **Credit coins**: After spin result, update `user_streaks.streak_coins` via Supabase (upsert)
- **Premium UI overhaul**:
  - Add ambient background glow orbs (gold + blue radials)
  - Add falling sparkle particles behind the wheel
  - Outer wheel ring: add a pulsating gold glow border with shimmer animation
  - Center "GO" button: add gradient-primary with glow shadow
  - Wheel segments: add subtle inner shadow and gradient fills instead of flat colors
  - Result display: add confetti-style animation with a premium card container
  - Spin button: add shimmer-border effect and deeper shadow stack
  - Smoother spin: change easing to `cubic-bezier(0.15, 0.85, 0.15, 1)` for a more natural deceleration
  - Add a progress indicator showing total coins earned in current session

## 5. Visual QA — Balance Card on Mobile
The balance card (lines 225-336) already has premium glassmorphism. The fix needed:
- Ensure `position: relative` is on the transactions wrapper (line 695) so the absolute shimmer line renders correctly

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/TeenHome.tsx` | Glassmorphism wrapper on quick actions grid, fix transactions card position:relative, add referral code to share CTA |
| `src/pages/SpinWheel.tsx` | Full premium redesign + Supabase coin crediting |

No database changes needed — `user_streaks.streak_coins` already exists.


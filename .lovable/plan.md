

# Comprehensive Enhancement Plan

This plan covers 6 areas: feature verification, financial education, referral improvements, scanner polish, haptic micro-interactions, and real-time notifications.

---

## 1. Navigate & Verify Existing Features
Use browser tools to visit each new page (`/scratch-cards`, `/spin-wheel`, `/chores`, `/achievements`, `/friends`, `/support`, `/scan`) and confirm they load with proper animations. Fix any rendering issues found.

---

## 2. Financial Education Section

**New page**: `src/pages/FinancialEducation.tsx`
**New DB table**: `financial_lessons` (id, title, description, category, content_json, coin_reward, order_index, created_at) + `lesson_completions` (id, user_id, lesson_id, score, completed_at)

- 3 categories: Budgeting, Saving, Investing
- Each lesson has bite-sized content (card-based swipeable format) followed by a 3-question quiz
- Completing a quiz with 2/3+ correct awards coins to user_streaks.streak_coins
- Premium UI: staggered entry animations, progress rings per category, gold accents
- Route: `/learn` added to App.tsx and TeenHome feature grid

**RLS**: Users can view all lessons, manage own completions.

---

## 3. Referral Program Enhancement

Update `src/pages/Referrals.tsx`:
- Add shareable deep link generation (`https://auro-pay.lovable.app?ref=CODE`)
- Use Web Share API with fallback to clipboard
- Show referrer AND referee reward amounts (both get ₹100)
- Add auto-apply logic: on signup, check URL for `ref=` param and insert referral record
- Update `src/components/AuthScreen.tsx` to capture referral code from URL on registration

---

## 4. Scanner Animation Polish

Update `src/pages/ScanPay.tsx`:
- Add a second orbiting dot at 180deg offset with different speed
- Enhance corner glow with layered box-shadows and subtle scale breathing
- Add a faint grid overlay inside the scanner frame for depth
- Beam sweep: add a secondary thinner beam trailing the main one
- Add particle sparkles at beam endpoints

Update `src/index.css` with refined keyframes for smoother easing curves.

---

## 5. Haptic Micro-Interactions on All Buttons

The `Button` component already has haptic feedback built in. Additional work:
- Add `active:scale-[0.97]` and a subtle glow transition to the base button variants in `src/components/ui/button.tsx`
- Add a CSS utility class `.btn-glow-feedback` with a brief gold glow on `:active`
- Audit all custom `<button>` elements across key pages (TeenHome, QuickPay, ScanPay, Referrals, Profile) and add `haptic.light()` calls + scale transitions where missing

---

## 6. Real-Time Push Notifications

**New file**: `src/hooks/useRealtimeNotifications.ts`
- Subscribe to Supabase realtime channels for:
  - `friendships` (friend requests) — filter on `friend_id = currentUser`
  - `chores` (new assignments) — filter on `teen_id = currentUser`
  - `ticket_messages` (support replies) — filter on `is_admin = true`
  - `transactions` (payment alerts) — filter via wallet lookup
- On event, show a toast notification with haptic feedback and insert into `notifications` table
- Hook used in `App.tsx` so it runs globally when authenticated

**Migration**: Enable realtime for `friendships`, `chores`, `ticket_messages` tables (transactions already enabled).

---

## Technical Summary

| Area | Files Changed | New Files | DB Changes |
|------|--------------|-----------|------------|
| Feature verification | Bug fixes as found | — | — |
| Financial Education | App.tsx, TeenHome.tsx | FinancialEducation.tsx | 2 new tables + RLS |
| Referral Enhancement | Referrals.tsx, AuthScreen.tsx | — | — |
| Scanner Polish | ScanPay.tsx, index.css | — | — |
| Haptic Micro-interactions | button.tsx, index.css, ~5 pages | — | — |
| Realtime Notifications | App.tsx | useRealtimeNotifications.ts | 1 migration (realtime) |


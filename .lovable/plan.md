

# Fix: Admin Delete User Not Working

## Root Cause

The `executeDelete` function in `AdminUsers.tsx` tries to delete rows from multiple tables (`transactions`, `wallets`, `notifications`, `profiles`, `kyc_requests`, `savings_goals`, `parent_teen_links`) using the client-side Supabase SDK. However, most of these tables lack DELETE RLS policies for admins:

- `transactions` — no DELETE policy at all
- `wallets` — no DELETE policy
- `notifications` — no DELETE policy  
- `profiles` — no DELETE policy
- `kyc_requests` — no DELETE policy for admins
- `savings_goals` — has ALL but only for `teen_id = auth.uid()`, not admin
- `parent_teen_links` — no DELETE policy

Every `.delete()` call silently fails due to RLS.

## Solution: Edge Function with Service Role

Create an edge function `delete-user` that uses the service role key to bypass RLS and cascade-delete all user data server-side. This is safer and more reliable than adding DELETE policies to every table.

### Changes

**1. New edge function**: `supabase/functions/delete-user/index.ts`
- Accepts `{ user_id: string }` in POST body
- Verifies the caller is an admin via `has_role()` check
- Uses service role client to delete from all related tables in order:
  1. `transactions` (via wallet_id lookup)
  2. `spending_limits` (via wallet_id)
  3. `wallets`
  4. `scratch_cards`, `user_achievements`, `lesson_completions`
  5. `friendships` (both user_id and friend_id)
  6. `referrals` (both referrer_id and referred_id)
  7. `bill_split_members`, `bill_splits`
  8. `chores` (both parent_id and teen_id)
  9. `support_tickets` + `ticket_messages`
  10. `kyc_requests`, `notifications`, `savings_goals`, `user_roles`, `quick_pay_favorites`, `recurring_payments`, `budgets`, `user_streaks`, `parent_teen_links`
  11. `profiles`
  12. Finally, delete the auth user via `supabase.auth.admin.deleteUser()`
- Returns success/error JSON

**2. Update `src/pages/admin/AdminUsers.tsx`**
- Replace the `executeDelete` function to call the edge function instead of direct table deletes:
  ```ts
  const { data } = await supabase.functions.invoke("delete-user", {
    body: { user_id: deleteTarget.id }
  });
  ```

### Files

| File | Action |
|------|--------|
| `supabase/functions/delete-user/index.ts` | Create |
| `src/pages/admin/AdminUsers.tsx` | Update `executeDelete` |

No database migration needed.


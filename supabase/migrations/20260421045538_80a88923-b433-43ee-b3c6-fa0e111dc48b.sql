-- Performance indexes for hot read paths
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_created
  ON public.transactions(wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_status_created
  ON public.transactions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles(phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id
  ON public.wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_parent_teen_links_parent_active
  ON public.parent_teen_links(parent_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_parent_teen_links_teen_active
  ON public.parent_teen_links(teen_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_savings_goals_teen_active
  ON public.savings_goals(teen_id) WHERE is_completed = false;

CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON public.conversation_members(user_id);

CREATE INDEX IF NOT EXISTS idx_quick_pay_favs_user_recent
  ON public.quick_pay_favorites(user_id, last_paid_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_payment_requests_recipient
  ON public.payment_requests(recipient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pending_approvals_parent
  ON public.pending_payment_approvals(parent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_lookup
  ON public.user_roles(user_id, role);
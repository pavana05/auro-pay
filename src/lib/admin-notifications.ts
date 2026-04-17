// Notification types that are relevant for admins to see in the admin dashboard.
// User-only types (transfer, payment, reward, budget_alert, etc.) are excluded
// so the admin bell + AdminNotifications history aren't flooded with noise from
// every teen's UPI transfer.
export const ADMIN_NOTIFICATION_TYPES = [
  "kyc",            // KYC submitted / failed / needs review
  "flagged",        // Anomaly scanner flagged a transaction
  "fraud",          // Fraud rule hit (velocity, watchlist)
  "security",       // Wallet frozen, account-takeover signals
  "dispute",        // User raised a payment dispute
  "chargeback",     // Razorpay chargeback
  "system_alert",   // Edge function failure, scheduler issue
  "admin_broadcast",// Sent BY an admin (echo into history)
  "support",        // New / escalated support ticket
  "payout",         // Payout settlement notice
  "refund",         // Refund processed
] as const;

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];

export const isAdminNotification = (type: string | null | undefined): boolean =>
  !!type && (ADMIN_NOTIFICATION_TYPES as readonly string[]).includes(type);

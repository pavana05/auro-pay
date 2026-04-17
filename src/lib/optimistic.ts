import { toast } from "sonner";

/**
 * Run an optimistic UI update. Apply state immediately, then call the async
 * server mutation. If the mutation rejects, rollback to the previous state
 * and show an error toast.
 *
 *   await optimistic({
 *     apply:    () => setRow({ ...row, status: "approved" }),
 *     rollback: () => setRow(row),
 *     mutate:   () => supabase.from("kyc_requests").update({ status: "approved" }).eq("id", row.id),
 *     successMessage: "KYC approved",
 *   });
 */
export async function optimistic<T>(opts: {
  apply: () => void;
  rollback: () => void;
  mutate: () => Promise<{ error: { message: string } | null } | T>;
  successMessage?: string;
  errorMessage?: string;
}): Promise<boolean> {
  opts.apply();
  try {
    const result: any = await opts.mutate();
    if (result?.error) {
      opts.rollback();
      toast.error(opts.errorMessage || result.error.message || "Action failed");
      return false;
    }
    if (opts.successMessage) toast.success(opts.successMessage);
    return true;
  } catch (e: any) {
    opts.rollback();
    toast.error(opts.errorMessage || e?.message || "Action failed");
    return false;
  }
}

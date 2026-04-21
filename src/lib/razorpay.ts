// Razorpay Checkout helper — loads the SDK once and opens the checkout modal.
import { supabase } from "@/integrations/supabase/client";
import { getPaymentLocation } from "./payment-location";

declare global {
  interface Window { Razorpay: any }
}

let scriptPromise: Promise<void> | null = null;

const loadRazorpayScript = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
  return scriptPromise;
};

export interface RazorpayPaymentParams {
  amount: number; // in rupees
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess?: (newBalance: number) => void;
  onFailure?: (err: any) => void;
}

export async function startRazorpayPayment({ amount, description, prefill, onSuccess, onFailure }: RazorpayPaymentParams) {
  try {
    // 1. Create order on backend (with best-effort payment location tag)
    const client_location = await getPaymentLocation();
    const { data: orderData, error: orderError } = await supabase.functions.invoke("create-payment-order", {
      body: { amount, description, client_location },
    });
    if (orderError) throw orderError;
    if (!orderData?.order_id) throw new Error("Failed to create order");

    // 2. Sandbox mode (no real keys) — auto-confirm
    if (orderData.sandbox) {
      const { data: confirmData, error: cErr } = await supabase.functions.invoke("confirm-payment", {
        body: { order_id: orderData.order_id },
      });
      if (cErr) throw cErr;
      onSuccess?.(confirmData?.new_balance || 0);
      return;
    }

    // 3. Real Razorpay flow — load SDK and open checkout
    await loadRazorpayScript();

    return new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "AuroPay",
        description: description || "Add money to wallet",
        order_id: orderData.order_id,
        prefill,
        theme: { color: "#c8952e" },
        handler: async (resp: any) => {
          try {
            const { data: confirmData, error: cErr } = await supabase.functions.invoke("confirm-payment", {
              body: {
                order_id: resp.razorpay_order_id,
                payment_id: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              },
            });
            if (cErr) throw cErr;
            onSuccess?.(confirmData?.new_balance || 0);
            resolve();
          } catch (err) {
            onFailure?.(err);
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
            onFailure?.(new Error("Payment cancelled"));
            reject(new Error("Payment cancelled"));
          },
        },
      });
      rzp.on("payment.failed", (resp: any) => {
        onFailure?.(resp.error);
        reject(resp.error);
      });
      rzp.open();
    });
  } catch (err) {
    onFailure?.(err);
    throw err;
  }
}

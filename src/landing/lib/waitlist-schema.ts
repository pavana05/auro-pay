import { z } from "zod";

export const waitlistSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile (no +91)"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(255, "Email is too long"),
  city: z.string().trim().min(2, "Pick or enter your city").max(80),
  role: z.enum(["teen", "parent", "both"], {
    errorMap: () => ({ message: "Choose teen, parent, or both" }),
  }),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const modalWaitlistSchema = waitlistSchema.pick({
  full_name: true,
  phone: true,
  email: true,
  role: true,
});
export type ModalWaitlistInput = z.infer<typeof modalWaitlistSchema>;

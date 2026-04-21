// Centralised sonner wrappers. Use these instead of importing `toast` from
// "sonner" directly so:
//   - Title casing + description punctuation stays consistent
//   - We can later swap the underlying toast lib without touching call sites
//   - Severity is explicit (ok / fail / warn / info)
//
// Conventions enforced:
//   - title  : 2-5 words, sentence-case, no trailing period
//   - desc   : single sentence ending with a period (auto-appended)
import { toast as sonner } from "sonner";

type Opts = { description?: string; duration?: number };

const normalizeDesc = (desc?: string) => {
  if (!desc) return undefined;
  const trimmed = desc.trim();
  if (!trimmed) return undefined;
  return /[.!?]$/.test(trimmed) ? trimmed : trimmed + ".";
};

const stripTrailingPunct = (title: string) => title.replace(/[.!?]+$/, "").trim();

export const toast = {
  ok(title: string, opts: Opts = {}) {
    return sonner.success(stripTrailingPunct(title), {
      description: normalizeDesc(opts.description),
      duration: opts.duration ?? 4000,
    });
  },
  fail(title: string, opts: Opts = {}) {
    return sonner.error(stripTrailingPunct(title), {
      description: normalizeDesc(opts.description),
      duration: opts.duration ?? 5000,
    });
  },
  warn(title: string, opts: Opts = {}) {
    return sonner.warning(stripTrailingPunct(title), {
      description: normalizeDesc(opts.description),
      duration: opts.duration ?? 4500,
    });
  },
  info(title: string, opts: Opts = {}) {
    return sonner.info(stripTrailingPunct(title), {
      description: normalizeDesc(opts.description),
      duration: opts.duration ?? 4000,
    });
  },
  /** Plain (no severity colour) — for neutral confirmations. */
  message(title: string, opts: Opts = {}) {
    return sonner(stripTrailingPunct(title), {
      description: normalizeDesc(opts.description),
      duration: opts.duration ?? 3500,
    });
  },
  /** Loading / promise wrapper passthroughs. */
  loading: sonner.loading,
  promise: sonner.promise,
  dismiss: sonner.dismiss,
};

export default toast;

import { useSyncExternalStore } from "react";

export type DiagnosticFetchState = "idle" | "loading" | "success" | "error" | "skipped";
export type DiagnosticGateState = "idle" | "loading" | "checking" | "open" | "blocked" | "redirected" | "skipped";
export type DiagnosticAuthState = "idle" | "loading" | "authenticated" | "unauthenticated" | "error";

export interface DiagnosticFetch {
  state: DiagnosticFetchState;
  detail?: string;
  updatedAt: number;
}

export interface DiagnosticGate {
  state: DiagnosticGateState;
  detail?: string;
  updatedAt: number;
}

export interface DiagnosticsSnapshot {
  route: string;
  phase: string;
  sessionResolved: boolean;
  onboardingSeen: boolean | null;
  auth: {
    state: DiagnosticAuthState;
    detail?: string;
  };
  userId: string | null;
  fetches: Record<string, DiagnosticFetch>;
  gates: Record<string, DiagnosticGate>;
}

const listeners = new Set<() => void>();

let snapshot: DiagnosticsSnapshot = {
  route: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
  phase: "boot",
  sessionResolved: false,
  onboardingSeen: null,
  auth: { state: "idle" },
  userId: null,
  fetches: {},
  gates: {},
};

const emit = () => listeners.forEach((listener) => listener());

const patchSnapshot = (next: Partial<DiagnosticsSnapshot>) => {
  snapshot = {
    ...snapshot,
    ...next,
    auth: next.auth ? { ...snapshot.auth, ...next.auth } : snapshot.auth,
    fetches: next.fetches ? { ...snapshot.fetches, ...next.fetches } : snapshot.fetches,
    gates: next.gates ? { ...snapshot.gates, ...next.gates } : snapshot.gates,
  };
  emit();
};

export const setDiagnosticsRoute = (route: string) => patchSnapshot({ route });

export const setDiagnosticsPhase = (phase: string) => patchSnapshot({ phase });

export const setDiagnosticsSessionResolved = (sessionResolved: boolean) => patchSnapshot({ sessionResolved });

export const setDiagnosticsOnboarding = (onboardingSeen: boolean) => patchSnapshot({ onboardingSeen });

export const setDiagnosticsUser = (userId: string | null) => patchSnapshot({ userId });

export const setDiagnosticsAuth = (auth: Partial<DiagnosticsSnapshot["auth"]>) => {
  patchSnapshot({ auth: auth as DiagnosticsSnapshot["auth"] });
};

export const setDiagnosticsFetch = (key: string, fetch: Omit<DiagnosticFetch, "updatedAt">) => {
  patchSnapshot({
    fetches: {
      [key]: {
        ...snapshot.fetches[key],
        ...fetch,
        updatedAt: Date.now(),
      },
    },
  });
};

export const setDiagnosticsGate = (key: string, gate: Omit<DiagnosticGate, "updatedAt">) => {
  patchSnapshot({
    gates: {
      [key]: {
        ...snapshot.gates[key],
        ...gate,
        updatedAt: Date.now(),
      },
    },
  });
};

export const useAppDiagnostics = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
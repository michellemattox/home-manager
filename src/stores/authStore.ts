import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  authReady: boolean;
  setSession: (session: Session | null) => void;
  setAuthReady: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  authReady: false,
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
  setAuthReady: () => set({ authReady: true }),
  clearSession: () => set({ session: null, user: null }),
}));

import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
  clearSession: () => set({ session: null, user: null }),
}));

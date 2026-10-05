"use client";

import { create } from "zustand";
import { User, getToken, setToken } from "./api";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  setHydrated: (v) => set({ hydrated: v }),
  setAuth: (token, user) => {
    setToken(token);
    set({ token, user });
  },
  logout: () => {
    setToken(null);
    set({ token: null, user: null });
  },
}));

export function initialToken() {
  return getToken();
}

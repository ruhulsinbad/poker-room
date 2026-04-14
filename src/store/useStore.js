// store/useStore.js

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),

      // API helper
      api: async (endpoint, options = {}) => {
        const token = get().token;
        const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      },

      // UI
      notification: null,
      showNotification: (msg, type = "success") => {
        set({ notification: { msg, type } });
        setTimeout(() => set({ notification: null }), 3000);
      },
    }),
    {
      name: "poker-app",
      partialize: (s) => ({ token: s.token }),
    }
  )
);

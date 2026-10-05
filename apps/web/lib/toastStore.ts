import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  kind: ToastKind;
};

type ToastStore = {
  toasts: Toast[];
  toast: (message: string, kind?: ToastKind) => string;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  toast: (message, kind = "info") => {
    const id = `${Date.now()}-${Math.random()}`;

    set((state) => ({
      toasts: [...state.toasts, { id, message, kind }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== id),
      }));
    }, 4000);

    return id;
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    }));
  },
}));

export const toast = (
  message: string,
  kind: ToastKind = "info"
) => useToastStore.getState().toast(message, kind);

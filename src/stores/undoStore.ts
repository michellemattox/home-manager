import { create } from "zustand";

type UndoEntry = {
  label: string;
  restore: () => void;
  execute: () => Promise<void>;
  timeoutId: ReturnType<typeof setTimeout>;
};

type UndoState = {
  pending: UndoEntry | null;
  /** Optimistically remove item from UI, then defer the real DB delete by 5s. */
  schedule: (opts: {
    label: string;
    restore: () => void;
    execute: () => Promise<void>;
  }) => void;
  /** User pressed Undo — cancel the pending delete and restore the item. */
  triggerUndo: () => void;
  /** Execute the pending delete immediately (used when a second delete arrives or timer fires). */
  flush: () => void;
};

export const useUndoStore = create<UndoState>((set, get) => ({
  pending: null,

  schedule: ({ label, restore, execute }) => {
    // If there's already a pending delete, execute it immediately before scheduling the new one.
    const existing = get().pending;
    if (existing) {
      clearTimeout(existing.timeoutId);
      existing.execute().catch(console.error);
    }

    const timeoutId = setTimeout(() => {
      get().flush();
    }, 5000);

    set({ pending: { label, restore, execute, timeoutId } });
  },

  triggerUndo: () => {
    const { pending } = get();
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pending.restore();
    set({ pending: null });
  },

  flush: () => {
    const { pending } = get();
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pending.execute().catch(console.error);
    set({ pending: null });
  },
}));

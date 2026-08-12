import { create } from "zustand";

/**
 * Session-only store of items the user has just "crossed off" (checked done).
 * We keep rendering these items with a strikethrough instead of making them
 * vanish behind the old 2-second undo bar. It is intentionally NOT persisted:
 * a reload/refetch naturally clears the strikethrough because the underlying
 * queries stop returning completed items.
 *
 * Each crossed-off id also stores an `undo` closure so tapping the item again
 * reverses the DB write (the replacement for the old Undo toast).
 */

// Undo closures live outside reactive state so registering one doesn't force a
// re-render of every subscriber.
const undoMap = new Map<string, () => void | Promise<void>>();

type CompletedState = {
  /** Set of crossed-off item ids (keyed for O(1) lookup + reactive reads). */
  ids: Record<string, true>;
  /** Mark an item crossed-off and register how to reverse it. */
  markCompleted: (id: string, undo: () => void | Promise<void>) => void;
  /** Remove the crossed-off flag without running its undo. */
  unmark: (id: string) => void;
  /** Clear every crossed-off flag (e.g. on pull-to-refresh). */
  clear: () => void;
  isCompleted: (id: string) => boolean;
};

export const useCompletedStore = create<CompletedState>((set, get) => ({
  ids: {},
  markCompleted: (id, undo) => {
    undoMap.set(id, undo);
    set((s) => ({ ids: { ...s.ids, [id]: true } }));
  },
  unmark: (id) => {
    undoMap.delete(id);
    set((s) => {
      if (!s.ids[id]) return s;
      const next = { ...s.ids };
      delete next[id];
      return { ids: next };
    });
  },
  clear: () => {
    undoMap.clear();
    set((s) => (Object.keys(s.ids).length === 0 ? s : { ids: {} }));
  },
  isCompleted: (id) => !!get().ids[id],
}));

/**
 * Reverse a crossed-off item: run its registered undo (reverting the DB write)
 * and clear the flag. Used when a struck-through item is tapped again.
 */
export async function runUncomplete(id: string) {
  const undo = undoMap.get(id);
  try {
    if (undo) await undo();
  } finally {
    useCompletedStore.getState().unmark(id);
  }
}

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoSaveOptions<T> {
  /** Set to false to pause autosave (e.g., when a modal is closed). */
  enabled: boolean;
  /** Current form value. Should be a serializable shape. */
  value: T;
  /** Baseline to diff against. Refreshed on successful save. */
  initialValue: T;
  /** Persist function. Should resolve when the save is durable. */
  onSave: (value: T) => Promise<unknown> | unknown;
  /** Debounce delay in ms. Defaults to 1000 (1 second). */
  delayMs?: number;
  /**
   * Optional gate. If provided, autosave only fires when this returns true.
   * Use for new-item drafts to require minimum fields (e.g. non-empty title).
   */
  canSave?: (value: T) => boolean;
}

/**
 * 1-second debounced auto-save shared by edit modals and new-item drafts.
 *
 * - When `enabled`, watches `value` and saves after `delayMs` of inactivity if dirty.
 * - For new-item drafts, supply `canSave` to require minimum fields before persisting.
 * - Call `flush()` from a Done/Cancel handler to commit any pending save immediately.
 * - `saving` and `saved` flags drive header indicators ("Saving…" / "Saved ✓").
 */
export function useAutoSave<T>({
  enabled,
  value,
  initialValue,
  onSave,
  delayMs = 1000,
  canSave,
}: UseAutoSaveOptions<T>) {
  const initialRef = useRef<T>(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef<T>(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep refs in sync so flush() always sees the latest values.
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const initialSerialized = serialize(initialValue);
  useEffect(() => {
    initialRef.current = initialValue;
  }, [initialSerialized]);

  const persist = useCallback(async () => {
    const current = valueRef.current;
    if (canSave && !canSave(current)) return;
    if (serialize(current) === serialize(initialRef.current)) return;
    setSaving(true);
    try {
      await onSave(current);
      initialRef.current = current;
      setSaved(true);
      // Auto-clear the "Saved ✓" indicator after 2s. Safe to call setState after
      // unmount in modern React.
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [onSave, canSave]);

  // Schedule a save when `value` changes and the form is dirty.
  const serialized = serialize(value);
  useEffect(() => {
    if (!enabled) return;
    if (serialized === serialize(initialRef.current)) return;
    if (canSave && !canSave(value)) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persist();
    }, delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [serialized, enabled, delayMs, persist]);

  /** Commit any pending save immediately. Awaitable. */
  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await persist();
  }, [persist]);

  return { saving, saved, flush };
}

function serialize(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

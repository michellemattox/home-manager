/**
 * Tiny mutable store for passing a scanned barcode back to the seeds screen.
 * Set by scan-barcode.tsx before navigating back; read + cleared by seeds.tsx
 * on focus via useFocusEffect.
 */
export const scanStore = { barcode: null as string | null };

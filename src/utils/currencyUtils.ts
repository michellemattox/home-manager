export function centsToDisplay(cents: number, compact = false): string {
  if (compact) {
    const dollars = cents / 100;
    if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
    return `$${Math.round(dollars)}`;
  }
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function displayToCents(display: string): number {
  const cleaned = display.replace(/[$,\s]/g, "");
  return Math.round(parseFloat(cleaned) * 100);
}

export function centsToFloat(cents: number): number {
  return cents / 100;
}

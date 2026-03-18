export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function displayToCents(display: string): number {
  const cleaned = display.replace(/[$,\s]/g, "");
  return Math.round(parseFloat(cleaned) * 100);
}

export function centsToFloat(cents: number): number {
  return cents / 100;
}

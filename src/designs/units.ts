/** Display formatting for design dimensions. Data is in feet; people read feet and inches. */

/** 16.5 → 16'-6", rounded to the nearest inch */
export function feetInches(feet: number): string {
  const sign = feet < 0 ? "-" : "";
  const inches = Math.round(Math.abs(feet) * 12);
  return `${sign}${Math.floor(inches / 12)}'-${inches % 12}"`;
}

/** "13'-5" × 16'-0"" */
export const dims = (w: number, d: number): string => `${feetInches(w)} × ${feetInches(d)}`;

/** A plot's size in words: `75'-0" × 120'-0"`, or a width range for one that is not a rectangle */
export function plotDimensions(plot: { width: number; depth: number; minWidth?: number }): string {
  if (plot.minWidth === undefined) return dims(plot.width, plot.depth);
  return `${feetInches(plot.minWidth)} to ${feetInches(plot.width)} wide × ${feetInches(plot.depth)} deep`;
}

/** 1234.4 → "1,234 sq ft" */
export const sqft = (area: number): string => `${Math.round(area).toLocaleString("en-US")} sq ft`;

/** A marla is 225 sq ft; 20 marla make a kanal */
export const MARLA_SQFT = 225;

/** 4500 → "1 Kanal", 2250 → "10 Marla", 5625 → "1 Kanal 5 Marla" */
export function plotSize(area: number): string {
  const marla = Math.round(area / MARLA_SQFT);
  const kanal = Math.floor(marla / 20);
  const rest = marla % 20;
  return [kanal ? `${kanal} Kanal` : "", rest ? `${rest} Marla` : ""].filter(Boolean).join(" ") || "0 Marla";
}

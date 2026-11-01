import { site, type OpeningHours } from "../config/site.ts";

/** `tel:` link for the company phone number (E.164). */
export function telUrl(phone: string = site.phone): string {
  return `tel:${phone}`;
}

/**
 * `wa.me` chat link with a prefilled message. The message is percent-encoded
 * as UTF-8, so spaces, punctuation and non-Latin scripts arrive as written.
 */
export function whatsappUrl(
  message: string = site.defaultWhatsAppMessage,
  number: string = site.whatsapp,
): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  // No-break space: "pm" never wraps onto a line of its own
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "Monday to Saturday, 10:00 am – 6:00 pm" for each opening-hours entry. */
export function formatHours(hours: OpeningHours[] = site.hours): string[] {
  return hours.map(({ days, opens, closes }) => {
    const sorted = [...days].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b));
    const consecutive = sorted.every((day, i) => i === 0 || WEEK.indexOf(day) === WEEK.indexOf(sorted[i - 1]) + 1);
    const dayText =
      sorted.length > 2 && consecutive ? `${sorted[0]} to ${sorted[sorted.length - 1]}` : sorted.join(", ");
    return `${dayText}, ${formatTime(opens)} – ${formatTime(closes)}`;
  });
}

/** The WhatsApp number as shown: the phone format when both are the same line */
export function whatsappDisplay(): string {
  return site.phone.replace(/\D/g, "") === site.whatsapp ? site.phoneDisplay : `+${site.whatsapp}`;
}

/**
 * "Open in Google Maps" link for the office: a Maps search URL (opens the app
 * on phones), built from the configured coordinates, or from the address when
 * no coordinates are set. A plain link, so the page makes no map requests.
 */
export function mapsUrl(geo: { lat: number; lng: number } | undefined = site.geo, address = site.address): string {
  const query =
    geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)
      ? `${geo.lat},${geo.lng}`
      : [address.street, address.city, address.region, "Pakistan"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

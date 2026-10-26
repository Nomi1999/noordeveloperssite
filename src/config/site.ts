/**
 * Company contact details: the single source for every page, CTA and
 * structured-data block. Values marked PLACEHOLDER(client) are stand-ins until
 * the client supplies real details; the build prints a warning for each one.
 */

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface OpeningHours {
  days: DayOfWeek[];
  /** 24-hour "HH:MM" */
  opens: string;
  /** 24-hour "HH:MM" */
  closes: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  url: string;
  /** E.164, used for tel: links and structured data */
  phone: string;
  /** As shown on the page */
  phoneDisplay: string;
  /** Digits only, country code first, for wa.me links */
  whatsapp: string;
  email: string;
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    /** ISO 3166-1 alpha-2 */
    country: string;
  };
  hours: OpeningHours[];
  geo: {
    lat: number;
    lng: number;
  };
  defaultWhatsAppMessage: string;
}

export const site: SiteConfig = {
  name: "Noor Developers",
  tagline: "Building the Future",
  url: "https://noordevelopers.pk",
  phone: "+923000000000", // PLACEHOLDER(client)
  phoneDisplay: "+92 300 0000000", // PLACEHOLDER(client)
  whatsapp: "923000000000", // PLACEHOLDER(client)
  email: "info@noordevelopers.pk", // PLACEHOLDER(client)
  address: {
    street: "Office address to follow", // PLACEHOLDER(client)
    city: "Faisalabad",
    region: "Punjab",
    postalCode: "38000", // PLACEHOLDER(client)
    country: "PK",
  },
  hours: [
    // PLACEHOLDER(client)
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "10:00",
      closes: "18:00",
    },
  ],
  geo: {
    lat: 31.4504, // PLACEHOLDER(client)
    lng: 73.135, // PLACEHOLDER(client)
  },
  defaultWhatsAppMessage: "Hello Noor Developers, I would like to know more about building with you.",
};

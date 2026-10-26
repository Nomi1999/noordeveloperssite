// Round-trip check for whatsappUrl(): run with `node scripts/check-whatsapp-url.ts`
import assert from "node:assert/strict";
import { whatsappUrl } from "../src/lib/contact.ts";
import { site } from "../src/config/site.ts";

const messages = [
  "Hello, I'd like the 1 Kanal design & a call back?",
  "Price? 50'-0\" x 90'-0\" #plot 100% = yes + more",
  "السلام علیکم، مجھے 2 کنال گھر کے بارے میں معلومات چاہئیں۔",
  "Mixed: Assalam o Alaikum — نور ڈویلپرز & co?",
];

for (const message of messages) {
  const url = new URL(whatsappUrl(message));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, `/${site.whatsapp}`);
  assert.equal(url.searchParams.get("text"), message);
  assert.equal([...url.searchParams.keys()].length, 1);
}

assert.equal(new URL(whatsappUrl()).searchParams.get("text"), site.defaultWhatsAppMessage);
console.log(`whatsappUrl round-trip OK (${messages.length + 1} messages)`);

import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { auditDir, compileRules, extractText, findViolations, loadRules } from "./audit-content.mjs";

const fixtures = fileURLToPath(new URL("./fixtures/audit/", import.meta.url));
const rules = loadRules();
const { violations } = auditDir(fixtures, rules);
const onPage = (page: string) => violations.filter((v) => v.page === page);

describe("content audit fixtures", () => {
  it("has a fixture page for every banned category", () => {
    for (const category of Object.keys(rules.categories)) {
      expect(onPage(`/${category}.html`).length, category).toBeGreaterThan(0);
    }
  });

  it.each([
    ["price", "PKR"],
    ["sale-status", "Sold"],
    ["regulatory", "NOC"],
    ["real-names", "Wapda City"],
    ["trust-signals", "years of experience"],
    ["superlatives", "best"],
  ])("flags %s on its fixture page and names the matched text", (category, match) => {
    const found = onPage(`/${category}.html`);
    expect(found.some((v) => v.category === category && v.match === match)).toBe(true);
  });

  it("checks alt text, meta descriptions and prefilled WhatsApp messages", () => {
    expect(onPage("/regulatory.html").map((v) => v.source)).toContain("alt attribute");
    expect(onPage("/real-names.html").map((v) => v.source)).toContain("meta description");
    expect(onPage("/sale-status.html").find((v) => v.match === "booking")?.source).toBe("WhatsApp message");
  });

  it("passes the clean page: allowlisted phrase, whole-word and case rules, no script or style text", () => {
    expect(onPage("/clean.html")).toEqual([]);
  });
});

describe("content audit matching", () => {
  const compiled = compileRules(rules);
  const check = (text: string) => findViolations([{ source: "test", text }], compiled, "/test/").map((v) => v.match);

  it("matches short tokens case-sensitively and as whole words", () => {
    expect(check("floors FLOORS hours HOURS Rs. 5,000")).toEqual(["Rs"]);
    expect(check("NOC noc nocturnal")).toEqual(["NOC"]);
  });

  it("matches phrases case-insensitively across whitespace", () => {
    expect(check("Starting from pkr")).toEqual(["pkr"]);
    expect(check("Years\n of   Experience")).toEqual(["Years\n of   Experience"]);
  });

  it("only allows the exact allowlisted phrase", () => {
    expect(check("the plan that best suits you")).toEqual([]);
    expect(check("the plan that best suits you, from the best team")).toEqual(["best"]);
  });

  it("decodes entities in page text", () => {
    const [page] = extractText("<p>Starting&nbsp;from&#160;&#x50;KR</p>");
    expect(page.text).toBe("Starting from PKR");
  });
});

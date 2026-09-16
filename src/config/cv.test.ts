// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import { PUBLIC_CV } from "./site";

const route = readFileSync(new URL("../pages/cv.astro", import.meta.url), "utf8");
const script = route.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];

function redirect(stored: string | null, browser: string, query = "", blocked = false) {
  let destination = "";
  runInNewContext(script!, {
    URLSearchParams,
    cvEn: PUBLIC_CV.href,
    cvEs: PUBLIC_CV.hrefEs,
    navigator: { language: browser },
    window: {
      localStorage: {
        getItem: () => {
          if (blocked) throw new Error("Storage unavailable");
          return stored;
        },
      },
      location: { search: query, replace: (url: string) => (destination = url) },
    },
  });
  return destination;
}

describe("public CV release", () => {
  it.each([PUBLIC_CV.href, PUBLIC_CV.hrefEs, "docs/cv-public.pdf"])(
    "ships a real PDF at %s",
    (path) => {
      const pdf = readFileSync(new URL(`../../public/${path}`, import.meta.url));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    }
  );
  it("keeps the legacy PDF identical to English", () => {
    const read = (path: string) => readFileSync(new URL(`../../public/${path}`, import.meta.url));
    expect(read("docs/cv-public.pdf")).toEqual(read(PUBLIC_CV.href));
  });
  it("honors explicit English over a Spanish browser", () => {
    expect(redirect("en", "es-ES")).toBe(PUBLIC_CV.href);
  });
  it("honors explicit Spanish over an English browser", () => {
    expect(redirect("es", "en-US")).toBe(PUBLIC_CV.hrefEs);
  });
  it("honors query language over stored preference", () => {
    expect(redirect("en", "en-US", "?lang=es")).toBe(PUBLIC_CV.hrefEs);
    expect(redirect("es", "es-ES", "?lang=en")).toBe(PUBLIC_CV.href);
  });
  it("falls back to browser language when storage is unavailable", () => {
    expect(redirect(null, "es-ES", "", true)).toBe(PUBLIC_CV.hrefEs);
    expect(redirect(null, "en-US", "", true)).toBe(PUBLIC_CV.href);
  });
});

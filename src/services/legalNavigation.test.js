import fs from "fs";
import path from "path";
import {
  LEGAL_ROUTES,
  legalPageFromPathname,
  legalRouteForPage,
} from "./legalNavigation";

test("maps only stable public legal paths and accepts a trailing slash", () => {
  expect(legalPageFromPathname("/privacy")).toBe("privacy");
  expect(legalPageFromPathname("/privacy/")).toBe("privacy");
  expect(legalPageFromPathname("/terms")).toBe("terms");
  expect(legalPageFromPathname("/terms/")).toBe("terms");
  expect(legalPageFromPathname("/")).toBeNull();
  expect(legalPageFromPathname("/settings")).toBeNull();
  expect(legalRouteForPage("privacy")).toEqual(LEGAL_ROUTES.privacy);
  expect(legalRouteForPage("terms")).toEqual(LEGAL_ROUTES.terms);
  expect(legalRouteForPage("unknown")).toBeNull();
});

test("Vercel rewrites both public legal URLs to the CRA shell without intercepting APIs", () => {
  const configuration = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")
  );
  expect(configuration.rewrites).toEqual([
    { source: "/privacy", destination: "/" },
    { source: "/terms", destination: "/" },
  ]);
  expect(configuration.rewrites.some(({ source }) => source.startsWith("/api"))).toBe(false);
});

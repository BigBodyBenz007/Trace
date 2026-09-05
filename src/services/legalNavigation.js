export const LEGAL_PAGE_IDS = Object.freeze({
  PRIVACY: "privacy",
  TERMS: "terms",
});

export const LEGAL_ROUTES = Object.freeze({
  [LEGAL_PAGE_IDS.PRIVACY]: Object.freeze({
    page: LEGAL_PAGE_IDS.PRIVACY,
    path: "/privacy",
    documentTitle: "Trace Privacy Policy",
  }),
  [LEGAL_PAGE_IDS.TERMS]: Object.freeze({
    page: LEGAL_PAGE_IDS.TERMS,
    path: "/terms",
    documentTitle: "Trace Terms of Service",
  }),
});

function normalizedPathname(pathname) {
  const value = typeof pathname === "string" && pathname ? pathname : "/";
  if (value === "/") return value;
  return value.replace(/\/+$/, "") || "/";
}

export function legalPageFromPathname(pathname) {
  const normalized = normalizedPathname(pathname);
  return Object.values(LEGAL_ROUTES).find(({ path }) => path === normalized)?.page || null;
}

export function legalRouteForPage(page) {
  return LEGAL_ROUTES[page] || null;
}

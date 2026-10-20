/** @jest-environment node */
const setupProxy = require("./setupProxy");
const { createProxyMiddleware } = require("http-proxy-middleware");

jest.mock("http-proxy-middleware", () => ({ createProxyMiddleware: jest.fn(() => "barcode-proxy") }));

test("development proxies only the barcode route to the existing HTTPS gateway", () => {
  createProxyMiddleware.mockReturnValue("barcode-proxy");
  const app = { use: jest.fn() };
  setupProxy(app);
  const [matches, options] = createProxyMiddleware.mock.calls[0];
  expect(app.use).toHaveBeenCalledWith("barcode-proxy");
  expect(matches("/api/nutrition/barcode")).toBe(true);
  for (const path of ["/", "/api/nutrition/barcode/other", "/api/other", "/static/js/main.js"]) {
    expect(matches(path)).toBe(false);
  }
  expect(options).toMatchObject({ target: "https://trace-umber.vercel.app", secure: true, changeOrigin: true });
  const request = { removeHeader: jest.fn(), getHeader: () => "http://localhost:3000", setHeader: jest.fn() };
  options.onProxyReq(request);
  expect(request.removeHeader).toHaveBeenCalledWith("cookie");
  expect(request.removeHeader).toHaveBeenCalledWith("authorization");
  expect(request.setHeader).toHaveBeenCalledWith("origin", options.target);
  const response = { writeHead: jest.fn(), end: jest.fn() };
  options.onError(new Error("private network detail"), {}, response);
  expect(response.writeHead).toHaveBeenCalledWith(502, expect.objectContaining({ "cache-control": "no-store" }));
  expect(JSON.parse(response.end.mock.calls[0][0])).toEqual({ status: "unavailable", identifier: null, food: null });
});

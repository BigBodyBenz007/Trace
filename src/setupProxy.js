// CRA loads this only in `npm start`; Vercel keeps its existing API function.
const { createProxyMiddleware } = require("http-proxy-middleware");

const BARCODE_ENDPOINT = "/api/nutrition/barcode";
const BARCODE_ORIGIN = "https://trace-umber.vercel.app";

module.exports = function setupProxy(app) {
  app.use(createProxyMiddleware(
    (pathname) => pathname === BARCODE_ENDPOINT,
    {
      target: BARCODE_ORIGIN,
      changeOrigin: true,
      secure: true,
      proxyTimeout: 10000,
      logLevel: "silent",
      onProxyReq(proxyRequest) {
        // This public food lookup needs no localhost credentials or cookies.
        proxyRequest.removeHeader("cookie");
        proxyRequest.removeHeader("authorization");
        if (proxyRequest.getHeader("origin")) proxyRequest.setHeader("origin", BARCODE_ORIGIN);
      },
      onError(_error, _request, response) {
        response.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
        response.end(JSON.stringify({ status: "unavailable", identifier: null, food: null }));
      },
    }
  ));
};

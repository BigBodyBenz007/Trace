// A URL flag cannot override the build environment or local-host restriction.
export function shouldLoadBarcodeGrading(environment, hostname, search) {
  return environment === 'development'
    && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    && new URLSearchParams(search).get('barcodeGrading') === '1';
}

// Build-time Preview opt-in is separate from local development's URL flag.
// A query flag cannot turn a normal production build into a Preview build.
export function shouldLoadBarcodeGrading(environment, hostname, search, build = {}) {
  if (environment === 'production'
    && build.deploymentEnvironment === 'preview'
    && build.previewEnabled === 'true') return true;
  return environment === 'development'
    && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    && new URLSearchParams(search).get('barcodeGrading') === '1';
}

// The reviewed experimental barcode assessment is available in normal builds.
// Runtime test/unknown environments stay isolated; URL flags are not authority.
export function shouldLoadBarcodeGrading(environment) {
  return environment === 'production' || environment === 'development';
}
